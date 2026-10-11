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
 * safe; a line with unbalanced quotes is dropped by the caller's validator.
 */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, '');
  const lines = clean.split(/\r\n|\n|\r/);
  const rows: string[][] = [];
  for (const line of lines) {
    if (line === '') continue;
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
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(field);
        field = '';
      } else {
        field += ch;
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
 * 7 → MA-M (`m28`), 9 → MA-S (`s36`). The CSV `Registry` column is a
 * cross-check only. Vendor names are kept verbatim (only the key is
 * uppercased). Entry keys are inserted in ascending sorted order so the
 * serialized artifact is canonical and independent of CSV row order — this
 * also neutralizes JS engines hoisting integer-like keys ahead of
 * letter-bearing ones.
 */
export function buildDataset(
  maLMauCsv: string,
  maMCsv: string,
  maSCsv: string,
  now: () => string = () => new Date().toISOString(),
): OuiDataset {
  const entries: Record<string, string> = {};
  const counts = { l24: 0, m28: 0, s36: 0 };

  const ingest = (csv: string): void => {
    const rows = parseCsv(csv);
    if (rows.length === 0) return;
    const header = rows[0];
    const assignmentIdx = header.indexOf('Assignment');
    const nameIdx = header.indexOf('Organization Name');
    if (assignmentIdx === -1 || nameIdx === -1) return; // unexpected shape — skip file

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const key = normalizePrefix(row[assignmentIdx] ?? '');
      if (key === null) continue; // empty / wrong-length / non-hex assignment
      const vendor = (row[nameIdx] ?? '').trim();
      if (vendor === '') continue; // empty vendor name
      if (entries[key] === undefined) {
        if (key.length === 6) counts.l24++;
        else if (key.length === 7) counts.m28++;
        else counts.s36++;
      }
      entries[key] = vendor;
    }
  };

  ingest(maLMauCsv);
  ingest(maMCsv);
  ingest(maSCsv);

  // Canonical key order: rebuild with sorted keys so JSON.stringify is stable.
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
  const json = JSON.stringify(dataset);
  const outPath = resolve(process.cwd(), 'public', 'oui-data.json');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, json + '\n', 'utf8');

  const { raw, gzip } = measureSizes(json);
  const total = dataset.counts.l24 + dataset.counts.m28 + dataset.counts.s36;
  console.log(`oui-data.json written: ${outPath}`);
  console.log(
    `entries=${total} (l24=${dataset.counts.l24} m28=${dataset.counts.m28} s36=${dataset.counts.s36})`,
  );
  console.log(`size raw=${(raw / 1024 / 1024).toFixed(2)} MB gzip=${(gzip / 1024 / 1024).toFixed(2)} MB`);
  // NFR5 budget: DB ≤ ~2 MB compressed. Warn loudly if we ever approach it.
  if (gzip > 2 * 1024 * 1024) {
    console.warn('WARNING: gzipped dataset exceeds the ~2 MB NFR5 budget');
  }
}

// Entrypoint guard: importing this module (for tests) never triggers a download.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  });
}
