/**
 * Build-time OUI database generator.
 *
 * Downloads the IEEE MA-L / MA-M / MA-S CSV registries and emits a
 * name-only index at `public/oui-data.json` (Vite copies `public/` verbatim
 * into `dist/`; the file is loaded at runtime via
 * `fetch(chrome.runtime.getURL('oui-data.json'))`, never imported/bundled).
 *
 * This file lives outside `src/` on purpose: it is the build-time network
 * surface (Story 2.1) and is excluded from the runtime privacy guard.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

export interface OuiDataset {
  schemaVersion: number;
  generatedAt: string;
  sources: Record<string, string>;
  counts: { l24: number; m28: number; s36: number };
  entries: Record<string, string>;
}

interface RegistrySource {
  key: 'ma-l' | 'ma-m' | 'ma-s';
  filename: string;
  url: string;
}

const SOURCES: readonly RegistrySource[] = [
  { key: 'ma-l', filename: 'oui.csv', url: 'https://standards-oui.ieee.org/oui/oui.csv' },
  { key: 'ma-m', filename: 'mam.csv', url: 'https://standards-oui.ieee.org/oui28/mam.csv' },
  { key: 'ma-s', filename: 'oui36.csv', url: 'https://standards-oui.ieee.org/oui36/oui36.csv' },
] as const;

/**
 * RFC4180-flavored CSV parse: handles quoted fields containing commas,
 * doubled-quote escapes (`""` → `"`), CRLF/LF, and a leading UTF-8 BOM.
 * Fields in the IEEE registries are single-line, so per-line splitting is
 * safe. A quote only opens a quoted field at the start of a field; a quote
 * inside an unquoted field is taken literally. A line that ends mid-quote is
 * malformed and is dropped.
 */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, '');
  const lines = clean.split(/\r\n|\n|\r/);
  const rows: string[][] = [];
  for (const line of lines) {
    if (line.trim() === '') continue; // skip empty and whitespace-only lines
    const fields: string[] = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            field += '"';
            i++; // consume the escaped quote
          } else {
            inQuotes = false;
          }
        } else {
          field += ch;
        }
      } else if (ch === ',') {
        fields.push(field);
        field = '';
      } else if (ch === '"' && field === '') {
        inQuotes = true; // a quote only opens a field at its start
      } else {
        field += ch; // includes a stray quote mid-field, taken literally
      }
    }
    // A line that ends mid-quote is malformed — drop the whole line.
    if (inQuotes) continue;
    fields.push(field);
    rows.push(fields);
  }
  return rows;
}

/** Trim → uppercase → validate hex of a valid registry length. Null if invalid. */
export function normalizePrefix(assignment: string): string | null {
  const key = assignment.trim().toUpperCase();
  if (key.length !== 6 && key.length !== 7 && key.length !== 9) return null;
  if (!/^[0-9A-F]+$/.test(key)) return null;
  return key;
}

/**
 * Build the pinned dataset shape from the three registry CSVs.
 *
 * Key length is authoritative for registry routing (AC3): 6 → MA-L (`l24`),
 * 7 → MA-M (`m28`), 9 → MA-S (`s36`); a `Registry` label that disagrees with
 * the key length is counted and logged, but the length still wins. Vendor
 * names are kept verbatim (only the key is uppercased).
 *
 * Output is deterministic: keys are inserted in ascending order, so
 * `JSON.stringify` is stable and independent of CSV row order. This does NOT
 * produce a pure ascending sort — JS engines enumerate integer-index keys
 * (all-decimal-digit prefixes) ahead of the others regardless of insertion
 * order, so the serialized order is numeric-first then lexicographic. It is
 * still deterministic for a fixed key set, and Story 2.2 loads entries into
 * `Map`s, so enumeration order is not load-bearing.
 *
 * Malformed input fails loudly: an empty registry or a missing required header
 * column throws rather than yielding a silent empty/partial dataset.
 */
export function buildDataset(
  maLCsv: string,
  maMCsv: string,
  maSCsv: string,
  now: () => string = () => new Date().toISOString(),
): OuiDataset {
  const entries: Record<string, string> = {};
  const counts = { l24: 0, m28: 0, s36: 0 };
  // Registry label → expected key length. Defensive cross-check only: key
  // length is authoritative (AC3), so a mismatch is logged, never used to route.
  const registryLengths: Record<string, number> = { 'MA-L': 6, 'MA-M': 7, 'MA-S': 9 };
  let registryMismatches = 0;
  let duplicateOverwrites = 0;
  const duplicateSamples: string[] = [];

  const ingest = (csv: string, label: string): void => {
    const rows = parseCsv(csv);
    if (rows.length === 0) {
      throw new Error(`${label}: CSV is empty (no header row)`);
    }
    const header = rows[0];
    const assignmentIdx = header.indexOf('Assignment');
    const nameIdx = header.indexOf('Organization Name');
    const registryIdx = header.indexOf('Registry');
    if (assignmentIdx === -1 || nameIdx === -1) {
      throw new Error(`${label}: missing required header column(s) (got: ${header.join(', ')})`);
    }

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const key = normalizePrefix(row[assignmentIdx] ?? '');
      if (key === null) continue; // empty / wrong-length / non-hex assignment
      const vendor = (row[nameIdx] ?? '').trim();
      if (vendor === '') continue; // empty vendor name

      if (registryIdx !== -1) {
        const expected = registryLengths[(row[registryIdx] ?? '').trim()];
        if (expected !== undefined && expected !== key.length) registryMismatches++;
      }

      if (entries[key] === undefined) {
        if (key.length === 6) counts.l24++;
        else if (key.length === 7) counts.m28++;
        else counts.s36++;
      } else {
        duplicateOverwrites++;
        if (duplicateSamples.length < 5) duplicateSamples.push(key);
      }
      entries[key] = vendor; // last value wins on a duplicate prefix
    }
  };

  ingest(maLCsv, 'ma-l (oui.csv)');
  ingest(maMCsv, 'ma-m (mam.csv)');
  ingest(maSCsv, 'ma-s (oui36.csv)');

  if (registryMismatches > 0) {
    console.warn(
      `WARNING: ${registryMismatches} row(s) had a Registry label inconsistent with the key length — length is authoritative`,
    );
  }
  if (duplicateOverwrites > 0) {
    console.warn(
      `WARNING: ${duplicateOverwrites} duplicate prefix(es) across registries — last value wins (e.g. ${duplicateSamples.join(', ')})`,
    );
  }

  // Deterministic key order: rebuild with sorted keys so JSON.stringify is stable.
  const sortedKeys = Object.keys(entries).sort();
  const ordered: Record<string, string> = {};
  for (const k of sortedKeys) ordered[k] = entries[k];

  return {
    schemaVersion: 1,
    generatedAt: now(),
    sources: { 'ma-l': 'oui.csv', 'ma-m': 'mam.csv', 'ma-s': 'oui36.csv' },
    counts,
    entries: ordered,
  };
}

/** Raw + gzipped byte sizes, for the NFR5 budget record. */
export function measureSizes(json: string): { raw: number; gzip: number } {
  const raw = Buffer.byteLength(json, 'utf8');
  // Gzip level 9 mirrors what a store/transport compressor would typically do.
  return { raw, gzip: gzipSync(Buffer.from(json, 'utf8'), { level: 9 }).length };
}

async function fetchCsv(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: HTTP ${res.status}`);
  return await res.text();
}

async function main(): Promise<void> {
  const [maL, maM, maS] = await Promise.all(SOURCES.map((s) => fetchCsv(s.url)));
  const dataset = buildDataset(maL, maM, maS);
  const { l24, m28, s36 } = dataset.counts;
  const total = l24 + m28 + s36;
  if (l24 === 0 || m28 === 0 || s36 === 0) {
    throw new Error(
      `one or more registries produced no entries (l24=${l24} m28=${m28} s36=${s36}) — refusing to write a partial dataset`,
    );
  }

  const json = JSON.stringify(dataset);
  const outPath = resolve(process.cwd(), 'public', 'oui-data.json');

  const { raw, gzip } = measureSizes(json);
  // NFR5 budget: DB ≤ ~2 MB compressed. Warn (before writing) if breached.
  if (gzip > 2 * 1024 * 1024) {
    console.warn('WARNING: gzipped dataset exceeds the ~2 MB NFR5 budget');
  }

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, json + '\n', 'utf8');

  console.log(`oui-data.json written: ${outPath}`);
  console.log(`entries=${total} (l24=${l24} m28=${m28} s36=${s36})`);
  console.log(
    `size raw=${(raw / 1024 / 1024).toFixed(2)} MB gzip=${(gzip / 1024 / 1024).toFixed(2)} MB`,
  );
}

// Entrypoint guard: importing this module (for tests) never triggers a download.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  });
}
