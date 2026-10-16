import { describe, expect, it } from 'vitest';
import { packageViolations, readVersions } from '../scripts/package-extension';

// Inline fixtures — never committed "bad" files (Story 1.8 lesson).
const VALID_DIST_FILES = [
  'manifest.json',
  'index.html',
  'oui-data.json',
  'icons/icon-16.png',
  'icons/icon-32.png',
  'icons/icon-48.png',
  'icons/icon-128.png',
  'assets/index.css',
  'assets/index.js',
];

function manifest(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    manifest_version: 3,
    name: 'OUI Scout',
    version: '0.0.10',
    description: 'Offline MAC-address converter and OUI vendor lookup.',
    icons: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
    action: {
      default_popup: 'index.html',
      default_icon: {
        16: 'icons/icon-16.png',
        32: 'icons/icon-32.png',
        48: 'icons/icon-48.png',
        128: 'icons/icon-128.png',
      },
    },
    ...overrides,
  });
}

function dataset(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    schemaVersion: 1,
    generatedAt: '2026-10-11T00:00:00.000Z',
    sources: { 'ma-l': 'oui.csv', 'ma-m': 'mam.csv', 'ma-s': 'oui36.csv' },
    counts: { l24: 40319, m28: 6628, s36: 7226 },
    entries: { F01898: 'Apple, Inc.' },
    ...overrides,
  });
}

function inputs(overrides: Partial<Parameters<typeof packageViolations>[0]> = {}) {
  const data = dataset();
  return {
    rootManifestRaw: manifest(),
    distManifestRaw: manifest(),
    datasetRaw: data,
    publicDatasetRaw: data,
    distFiles: [...VALID_DIST_FILES],
    ...overrides,
  };
}

describe('packageViolations', () => {
  it('accepts a valid production package', () => {
    expect(packageViolations(inputs())).toEqual([]);
  });

  it('flags a root/dist version mismatch', () => {
    const v = packageViolations(
      inputs({ distManifestRaw: manifest({ version: '0.0.9' }) }),
    );
    expect(v.some((x) => x.includes('version'))).toBe(true);
  });

  it('flags a dev-augmented dist manifest carrying a background service worker', () => {
    const v = packageViolations(
      inputs({ distManifestRaw: manifest({ background: { service_worker: 'sw.js' } }) }),
    );
    expect(v.some((x) => x.includes('background'))).toBe(true);
  });

  it('flags content_scripts in the dist manifest', () => {
    const v = packageViolations(
      inputs({
        distManifestRaw: manifest({
          content_scripts: [{ matches: ['<all_urls>'], js: ['cs.js'] }],
        }),
      }),
    );
    expect(v.some((x) => x.includes('content_scripts'))).toBe(true);
  });

  it('flags non-empty permissions', () => {
    const v = packageViolations(inputs({ distManifestRaw: manifest({ permissions: ['tabs'] }) }));
    expect(v.some((x) => x.includes('permissions'))).toBe(true);
  });

  it('flags host_permissions', () => {
    const v = packageViolations(
      inputs({ distManifestRaw: manifest({ host_permissions: ['https://example.com/*'] }) }),
    );
    expect(v.some((x) => x.includes('host_permissions'))).toBe(true);
  });

  it('flags a manifest that references a missing icon', () => {
    const v = packageViolations(
      inputs({ distFiles: VALID_DIST_FILES.filter((f) => f !== 'icons/icon-48.png') }),
    );
    expect(v.some((x) => x.includes('icons/icon-48.png'))).toBe(true);
  });

  it('flags a manifest that references a missing default_popup', () => {
    const v = packageViolations(
      inputs({ distFiles: VALID_DIST_FILES.filter((f) => f !== 'index.html') }),
    );
    expect(v.some((x) => x.includes('index.html'))).toBe(true);
  });

  it('flags a non-MV3 dist manifest', () => {
    const v = packageViolations(inputs({ distManifestRaw: manifest({ manifest_version: 2 }) }));
    expect(v.some((x) => x.includes('manifest_version'))).toBe(true);
  });

  it('flags a 133-character description', () => {
    const v = packageViolations(
      inputs({ distManifestRaw: manifest({ description: 'x'.repeat(133) }) }),
    );
    expect(v.some((x) => x.includes('132'))).toBe(true);
  });

  it('accepts a 132-character description', () => {
    const v = packageViolations(
      inputs({ distManifestRaw: manifest({ description: 'x'.repeat(132) }) }),
    );
    expect(v).toEqual([]);
  });

  it('flags an empty name', () => {
    const v = packageViolations(inputs({ distManifestRaw: manifest({ name: '' }) }));
    expect(v.some((x) => x.includes('name'))).toBe(true);
  });

  it('flags a leading-zero version segment', () => {
    const v = packageViolations(inputs({ distManifestRaw: manifest({ version: '01.0' }) }));
    expect(v.some((x) => x.includes('version'))).toBe(true);
  });

  it('flags a version segment over 65535', () => {
    const v = packageViolations(inputs({ distManifestRaw: manifest({ version: '0.0.65536' }) }));
    expect(v.some((x) => x.includes('version'))).toBe(true);
  });

  it('flags malformed dist manifest JSON', () => {
    const v = packageViolations(inputs({ distManifestRaw: '{ nope' }));
    expect(v.some((x) => x.includes('dist/manifest.json'))).toBe(true);
  });

  it('flags a dataset missing schemaVersion', () => {
    const data = dataset();
    const broken = JSON.stringify({ ...JSON.parse(data), schemaVersion: undefined });
    const v = packageViolations(inputs({ datasetRaw: broken, publicDatasetRaw: broken }));
    expect(v.some((x) => x.includes('schemaVersion'))).toBe(true);
  });

  it('flags a dataset with non-integer schemaVersion', () => {
    const broken = dataset({ schemaVersion: '1' });
    const v = packageViolations(inputs({ datasetRaw: broken, publicDatasetRaw: broken }));
    expect(v.some((x) => x.includes('schemaVersion'))).toBe(true);
  });

  it('flags a dataset with empty entries', () => {
    const broken = dataset({ entries: {} });
    const v = packageViolations(inputs({ datasetRaw: broken, publicDatasetRaw: broken }));
    expect(v.some((x) => x.includes('entries'))).toBe(true);
  });

  it('flags a dataset missing generatedAt or counts', () => {
    const noDate = dataset();
    const a = JSON.stringify({ ...JSON.parse(noDate), generatedAt: undefined });
    const vA = packageViolations(inputs({ datasetRaw: a, publicDatasetRaw: a }));
    expect(vA.some((x) => x.includes('generatedAt'))).toBe(true);

    const noCounts = dataset();
    const b = JSON.stringify({ ...JSON.parse(noCounts), counts: undefined });
    const vB = packageViolations(inputs({ datasetRaw: b, publicDatasetRaw: b }));
    expect(vB.some((x) => x.includes('counts'))).toBe(true);
  });

  it('flags malformed dataset JSON', () => {
    const v = packageViolations(inputs({ datasetRaw: '{ nope', publicDatasetRaw: '{ nope' }));
    expect(v.some((x) => x.includes('oui-data.json'))).toBe(true);
  });

  it('flags a dist dataset that differs from public/', () => {
    const v = packageViolations(inputs({ publicDatasetRaw: dataset({ schemaVersion: 2 }) }));
    expect(v.some((x) => x.includes('byte-identical'))).toBe(true);
  });

  it('reports every violation at once', () => {
    const v = packageViolations(
      inputs({
        distManifestRaw: manifest({ version: '0.0.9', permissions: ['tabs'] }),
      }),
    );
    expect(v.length).toBeGreaterThanOrEqual(2);
  });

  it('flags a malformed root manifest', () => {
    const v = packageViolations(inputs({ rootManifestRaw: '{ nope' }));
    expect(v.some((x) => x.includes('manifest.json (root)'))).toBe(true);
  });

  it('flags a malformed public dataset', () => {
    const v = packageViolations(inputs({ publicDatasetRaw: '{ nope' }));
    expect(v.some((x) => x.includes('public/oui-data.json'))).toBe(true);
  });

  it('flags a falsy-but-valid dist manifest instead of skipping validation', () => {
    for (const raw of ['null', '""', 'false', '0', '[]']) {
      const v = packageViolations(inputs({ distManifestRaw: raw }));
      expect(v.some((x) => x.includes('dist/manifest.json'))).toBe(true);
    }
  });

  it('flags a falsy-but-valid dist dataset instead of skipping validation', () => {
    for (const raw of ['null', '""', 'false', '0', '[]']) {
      const v = packageViolations(inputs({ datasetRaw: raw, publicDatasetRaw: raw }));
      expect(v.some((x) => x.includes('dist/oui-data.json'))).toBe(true);
    }
  });

  it('flags a 5-segment version', () => {
    const v = packageViolations(inputs({ distManifestRaw: manifest({ version: '1.2.3.4.5' }) }));
    expect(v.some((x) => x.includes('version'))).toBe(true);
  });

  it('flags an empty version segment', () => {
    const v = packageViolations(inputs({ distManifestRaw: manifest({ version: '1..2' }) }));
    expect(v.some((x) => x.includes('version'))).toBe(true);
  });

  it('flags an empty-string version', () => {
    const v = packageViolations(inputs({ distManifestRaw: manifest({ version: '' }) }));
    expect(v.some((x) => x.includes('version'))).toBe(true);
  });

  it('accepts a version segment of exactly 65535', () => {
    const v = packageViolations(
      inputs({
        rootManifestRaw: manifest({ version: '0.0.65535' }),
        distManifestRaw: manifest({ version: '0.0.65535' }),
      }),
    );
    expect(v).toEqual([]);
  });

  it('flags a null permissions value', () => {
    const v = packageViolations(inputs({ distManifestRaw: manifest({ permissions: null }) }));
    expect(v.some((x) => x.includes('permissions'))).toBe(true);
  });

  it('flags a whitespace-only name and description', () => {
    const v = packageViolations(
      inputs({ distManifestRaw: manifest({ name: '   ', description: '   ' }) }),
    );
    expect(v.some((x) => x.includes('name'))).toBe(true);
    expect(v.some((x) => x.includes('description'))).toBe(true);
  });

  it('flags array counts and array entries', () => {
    const broken = dataset({ counts: [], entries: ['Apple'] });
    const v = packageViolations(inputs({ datasetRaw: broken, publicDatasetRaw: broken }));
    expect(v.some((x) => x.includes('counts'))).toBe(true);
    expect(v.some((x) => x.includes('entries'))).toBe(true);
  });

  it('flags a non-ISO-8601 generatedAt', () => {
    const broken = dataset({ generatedAt: 'October 11, 2026' });
    const v = packageViolations(inputs({ datasetRaw: broken, publicDatasetRaw: broken }));
    expect(v.some((x) => x.includes('generatedAt'))).toBe(true);
  });

  it('flags a negative schemaVersion', () => {
    const broken = dataset({ schemaVersion: -1 });
    const v = packageViolations(inputs({ datasetRaw: broken, publicDatasetRaw: broken }));
    expect(v.some((x) => x.includes('schemaVersion'))).toBe(true);
  });
});

describe('readVersions', () => {
  it('returns the extension version and the dataset version record verbatim', () => {
    const versions = readVersions(manifest({ version: '0.0.10' }), dataset());
    expect(versions).toEqual({
      extension: '0.0.10',
      dataset: {
        schemaVersion: 1,
        generatedAt: '2026-10-11T00:00:00.000Z',
        counts: { l24: 40319, m28: 6628, s36: 7226 },
      },
    });
  });
});
