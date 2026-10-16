/**
 * Build-time packaging surface (Story 3.1).
 *
 * Validates the production `dist/` build and zips it into
 * `release/oui-scout-<version>.zip` for Chrome Web Store upload:
 * `manifest.json` sits at the archive root (zipping from inside `dist/`),
 * a dev-mode `dist/` (CRXJS augments the manifest with a service worker)
 * is refused, and the CWS "Review your manifest" checklist is linted.
 *
 * This file lives outside `src/` on purpose: it is build-time Node tooling
 * and is excluded from the runtime privacy guard (which scans `src/` only).
 * It shells out to the system `zip` binary — a prerequisite, like `unzip`;
 * no npm packaging dependency is added.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** NFR5 / SM-C1 / PRD §8: total package ≤ ~3 MB — a hard failure, not a warning. */
export const MAX_PACKAGE_BYTES = 3 * 1024 * 1024;

const DESCRIPTION_MAX_LENGTH = 132;
const VERSION_SEGMENT_MAX = 65535;

export interface PackageInputs {
  rootManifestRaw: string;
  distManifestRaw: string;
  datasetRaw: string;
  publicDatasetRaw: string;
  distFiles: string[];
}

type ManifestLike = Record<string, unknown>;

function parseJson(raw: string, label: string, violations: string[]): ManifestLike | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      violations.push(`${label} must be a JSON object (got ${JSON.stringify(parsed)})`);
      return null;
    }
    return parsed as ManifestLike;
  } catch {
    violations.push(`${label} is not valid JSON (CWS rejects manifests with comments or syntax errors)`);
    return null;
  }
}

/** Absent or an empty array both satisfy the zero-permission posture. */
function hasNoGrant(value: unknown): boolean {
  return value === undefined || (Array.isArray(value) && value.length === 0);
}

/** MV3: 1–4 dot-separated integers, each 0–65535, no leading zeros. */
function isWellFormedVersion(version: string): boolean {
  const segments = version.split('.');
  if (segments.length < 1 || segments.length > 4) return false;
  return segments.every((seg) => {
    if (!/^\d+$/.test(seg)) return false;
    if (seg.length > 1 && seg.startsWith('0')) return false;
    return Number(seg) <= VERSION_SEGMENT_MAX;
  });
}

function manifestReferencedFiles(manifest: ManifestLike): string[] {
  const files = new Set<string>();
  const popup = (manifest.action as Record<string, unknown> | undefined)?.default_popup;
  if (typeof popup === 'string') files.add(popup);
  for (const iconsField of [manifest.icons, (manifest.action as ManifestLike | undefined)?.default_icon]) {
    if (iconsField && typeof iconsField === 'object') {
      for (const path of Object.values(iconsField as Record<string, unknown>)) {
        if (typeof path === 'string') files.add(path);
      }
    }
  }
  return [...files];
}

/**
 * Pure validation of a packaged build. Takes raw strings (no I/O) so the
 * suite runs on a clean clone with no `dist/`. Returns every violation;
 * an empty array means the package is store-ready.
 */
export function packageViolations(inputs: PackageInputs): string[] {
  const violations: string[] = [];

  const rootManifest = parseJson(inputs.rootManifestRaw, 'manifest.json (root)', violations);
  const distManifest = parseJson(inputs.distManifestRaw, 'dist/manifest.json', violations);

  if (distManifest) {
    if (distManifest.manifest_version !== 3) {
      violations.push(
        `dist/manifest.json manifest_version must be 3 (got ${JSON.stringify(distManifest.manifest_version)})`,
      );
    }

    if (rootManifest && distManifest.version !== rootManifest.version) {
      violations.push(
        `dist/manifest.json version ${JSON.stringify(distManifest.version)} does not match root manifest.json version ${JSON.stringify(rootManifest.version)} — dist/ is stale, run 'npm run build'`,
      );
    }

    if (typeof distManifest.version !== 'string' || !isWellFormedVersion(distManifest.version)) {
      violations.push(
        `dist/manifest.json version ${JSON.stringify(distManifest.version)} is not a well-formed MV3 version (1–4 dot-separated integers, each 0–${VERSION_SEGMENT_MAX}, no leading zeros)`,
      );
    }

    if (typeof distManifest.name !== 'string' || distManifest.name.trim() === '') {
      violations.push('dist/manifest.json name is missing or empty');
    }

    const description = distManifest.description;
    if (typeof description !== 'string' || description.trim().length === 0) {
      violations.push('dist/manifest.json description is missing');
    } else if (description.length > DESCRIPTION_MAX_LENGTH) {
      violations.push(
        `dist/manifest.json description is ${description.length} characters (CWS limit is ${DESCRIPTION_MAX_LENGTH})`,
      );
    }

    // Zero-permission invariants (mirrors tests/privacy.guard.test.ts — Critical Decision 5).
    for (const key of ['permissions', 'host_permissions'] as const) {
      if (!hasNoGrant(distManifest[key])) {
        violations.push(`dist/manifest.json ${key} must be absent or [] (got ${JSON.stringify(distManifest[key])})`);
      }
    }
    for (const key of ['background', 'content_scripts'] as const) {
      if (distManifest[key] !== undefined) {
        violations.push(
          `dist/manifest.json ${key} must be absent (got ${JSON.stringify(distManifest[key])}) — a dev-mode dist/ is not packageable, run 'npm run build'`,
        );
      }
    }

    const fileSet = new Set(inputs.distFiles);
    for (const file of manifestReferencedFiles(distManifest)) {
      if (!fileSet.has(file)) {
        violations.push(`dist/manifest.json references ${file}, which is not present in dist/`);
      }
    }
  }

  const dataset: ManifestLike | null = parseJson(inputs.datasetRaw, 'dist/oui-data.json', violations);
  parseJson(inputs.publicDatasetRaw, 'public/oui-data.json', violations);

  if (dataset) {
    if (
      typeof dataset.schemaVersion !== 'number' ||
      !Number.isInteger(dataset.schemaVersion) ||
      dataset.schemaVersion < 0
    ) {
      violations.push(`dist/oui-data.json schemaVersion must be a non-negative integer (got ${JSON.stringify(dataset.schemaVersion)})`);
    }
    if (
      typeof dataset.generatedAt !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(dataset.generatedAt) ||
      Number.isNaN(Date.parse(dataset.generatedAt))
    ) {
      violations.push(`dist/oui-data.json generatedAt must be an ISO-8601 timestamp (got ${JSON.stringify(dataset.generatedAt)})`);
    }
    if (!dataset.counts || typeof dataset.counts !== 'object' || Array.isArray(dataset.counts)) {
      violations.push('dist/oui-data.json counts is missing');
    }
    if (
      !dataset.entries ||
      typeof dataset.entries !== 'object' ||
      Array.isArray(dataset.entries) ||
      Object.keys(dataset.entries as object).length === 0
    ) {
      violations.push('dist/oui-data.json entries is missing or empty');
    }
  }

  if (inputs.datasetRaw !== inputs.publicDatasetRaw) {
    violations.push(
      'dist/oui-data.json is not byte-identical to public/oui-data.json — a stale or hand-edited dataset, run \'npm run build\'',
    );
  }

  return violations;
}

export interface DatasetVersionRecord {
  schemaVersion: number;
  generatedAt: string;
  counts: Record<string, number>;
}

/** The two version records AC2 inspects: extension version + dataset version. */
export function readVersions(
  distManifestRaw: string,
  datasetRaw: string,
): { extension: string; dataset: DatasetVersionRecord } {
  const manifest = JSON.parse(distManifestRaw) as ManifestLike;
  const dataset = JSON.parse(datasetRaw) as ManifestLike;
  return {
    extension: String(manifest.version),
    dataset: {
      schemaVersion: dataset.schemaVersion as number,
      generatedAt: dataset.generatedAt as string,
      counts: dataset.counts as Record<string, number>,
    },
  };
}

/** Relative file paths under `dir`, using `/` separators (manifest paths). */
function collectFiles(dir: string, base = dir): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(full, base));
    } else {
      files.push(relative(base, full).split('\\').join('/'));
    }
  }
  return files;
}

function main(): void {
  const root = process.cwd();
  const distDir = resolve(root, 'dist');
  const releaseDir = resolve(root, 'release');
  const rootManifestPath = resolve(root, 'manifest.json');

  let rootManifestRaw: string;
  let distManifestRaw: string;
  let datasetRaw: string;
  let publicDatasetRaw: string;
  let distFiles: string[];
  try {
    rootManifestRaw = readFileSync(rootManifestPath, 'utf8');
  } catch {
    console.error('manifest.json is missing at the project root — restore it from git.');
    process.exit(1);
  }
  try {
    distManifestRaw = readFileSync(join(distDir, 'manifest.json'), 'utf8');
  } catch {
    console.error('dist/manifest.json is missing — run \'npm run build\' first.');
    process.exit(1);
  }
  try {
    datasetRaw = readFileSync(join(distDir, 'oui-data.json'), 'utf8');
  } catch {
    console.error('dist/oui-data.json is missing — run \'npm run build\' first.');
    process.exit(1);
  }
  try {
    publicDatasetRaw = readFileSync(resolve(root, 'public', 'oui-data.json'), 'utf8');
  } catch {
    console.error('public/oui-data.json is missing — run \'npm run build:data\' first.');
    process.exit(1);
  }
  try {
    distFiles = collectFiles(distDir);
  } catch {
    console.error('dist/ is missing build output — run \'npm run build\' first.');
    process.exit(1);
  }

  const violations = packageViolations({
    rootManifestRaw,
    distManifestRaw,
    datasetRaw,
    publicDatasetRaw,
    distFiles,
  });
  if (violations.length > 0) {
    for (const violation of violations) console.error(`✗ ${violation}`);
    console.error('\nPackaging refused. Run \'npm run build\' first — dist/ is missing or stale.');
    process.exit(1);
  }

  const versions = readVersions(distManifestRaw, datasetRaw);
  const outPath = join(releaseDir, `oui-scout-${versions.extension}.zip`);

  mkdirSync(releaseDir, { recursive: true });

  // cwd = dist/ so manifest.json lands at the ARCHIVE ROOT (CWS requirement).
  const zip = spawnSync('zip', ['-r', '-X', outPath, '.', '-x', '*.DS_Store'], {
    cwd: distDir,
    encoding: 'utf8',
  });
  if (zip.error && (zip.error as NodeJS.ErrnoException).code === 'ENOENT') {
    console.error(
      'The system \'zip\' binary was not found — it is a prerequisite for npm run zip (install the zip package).',
    );
    process.exit(1);
  }
  if (zip.status !== 0) {
    console.error(zip.stderr || 'zip failed');
    process.exit(zip.status ?? 1);
  }

  // Sweep stale artifacts only after a successful zip, and never the new one
  // (a failed run must not destroy the last known-good artifact).
  for (const stale of readdirSync(releaseDir)) {
    if (!stale.startsWith('oui-scout-') || !stale.endsWith('.zip')) continue;
    const stalePath = join(releaseDir, stale);
    if (stalePath === outPath) continue;
    if (!statSync(stalePath).isFile()) continue;
    rmSync(stalePath, { force: true });
  }

  const archiveBytes = statSync(outPath).size;
  const distBytes = distFiles.reduce((sum, file) => sum + statSync(join(distDir, file)).size, 0);
  if (archiveBytes > MAX_PACKAGE_BYTES) {
    console.error(
      `✗ archive is ${archiveBytes} bytes — exceeds the ${MAX_PACKAGE_BYTES}-byte (3 MiB) NFR5 package budget; deleted ${outPath}`,
    );
    rmSync(outPath, { force: true });
    process.exit(1);
  }

  console.log('Packaged for Chrome Web Store upload:');
  console.log(`  extension version : ${versions.extension} (manifest.json inside the archive)`);
  console.log(
    `  dataset version   : schemaVersion=${versions.dataset.schemaVersion} generatedAt=${versions.dataset.generatedAt} counts=${JSON.stringify(versions.dataset.counts)}`,
  );
  console.log(`  archive           : ${outPath}`);
  console.log(`  archive size      : ${archiveBytes} bytes (budget ${MAX_PACKAGE_BYTES})`);
  console.log(`  dist/ size        : ${distBytes} bytes uncompressed`);
}

// Entrypoint guard: importing this module (for tests) never packages anything.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
