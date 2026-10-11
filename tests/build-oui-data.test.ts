import { describe, expect, it, vi } from 'vitest';
import { parseCsv, normalizePrefix, buildDataset } from '../scripts/build-oui-data';

// Inline CSV fixtures — never committed "bad" files (1-8 lesson).
// Shape mirrors IEEE: header Registry,Assignment,Organization Name,Organization Address
const HEADER = 'Registry,Assignment,Organization Name,Organization Address';

describe('parseCsv', () => {
  it('splits a simple unquoted row', () => {
    const rows = parseCsv(`${HEADER}\nMA-L,286FB9,Katun Corporation,7760 France Ave S\n`);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual(['Registry', 'Assignment', 'Organization Name', 'Organization Address']);
    expect(rows[1]).toEqual(['MA-L', '286FB9', 'Katun Corporation', '7760 France Ave S']);
  });

  it('keeps a comma inside a quoted field', () => {
    const rows = parseCsv(`${HEADER}\nMA-L,286FB9,"Nokia Shanghai Bell Co., Ltd.","No.388 Ning Qiao Road, Shanghai"\n`);
    expect(rows[1]).toEqual([
      'MA-L',
      '286FB9',
      'Nokia Shanghai Bell Co., Ltd.',
      'No.388 Ning Qiao Road, Shanghai',
    ]);
  });

  it('unescapes a doubled quote inside a quoted field', () => {
    const rows = parseCsv(`${HEADER}\nMA-L,286FB9,"ACME ""Widgets"" Inc",Somewhere\n`);
    expect(rows[1][2]).toBe('ACME "Widgets" Inc');
  });

  it('handles CRLF line endings', () => {
    const rows = parseCsv(`${HEADER}\r\nMA-L,286FB9,Katun Corporation,Addr\r\n`);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toEqual(['MA-L', '286FB9', 'Katun Corporation', 'Addr']);
  });

  it('strips a leading UTF-8 BOM', () => {
    const rows = parseCsv(`﻿${HEADER}\nMA-L,286FB9,Katun,Addr\n`);
    expect(rows[0][0]).toBe('Registry');
  });

  it('skips a line with unbalanced quotes', () => {
    const rows = parseCsv(`${HEADER}\nMA-L,286FB9,"Unclosed vendor,Addr\nMA-L,AAKATun,Ok,Addr\n`);
    // The malformed line is dropped; the well-formed one survives.
    expect(rows.some((r) => r[1] === 'AAKATun')).toBe(true);
    expect(rows.some((r) => r[1] === '286FB9')).toBe(false);
  });

  it('returns only the header for empty input after it', () => {
    expect(parseCsv(`${HEADER}\n`)).toHaveLength(1);
  });

  it('skips whitespace-only lines', () => {
    const rows = parseCsv(`${HEADER}\n   \nMA-L,286FB9,Katun,Addr\n`);
    expect(rows).toHaveLength(2);
    expect(rows[1][1]).toBe('286FB9');
  });

  it('takes a quote inside an unquoted field literally instead of dropping the line', () => {
    const rows = parseCsv(`${HEADER}\nMA-L,F01898,AC"ME Corp,Addr\n`);
    expect(rows).toHaveLength(2);
    expect(rows[1][2]).toBe('AC"ME Corp');
  });
});

describe('normalizePrefix', () => {
  it('uppercases and accepts a 6-hex MA-L prefix', () => {
    expect(normalizePrefix('  f01898 ')).toBe('F01898');
  });

  it('accepts a 7-hex MA-M prefix', () => {
    expect(normalizePrefix('AABBCCD')).toBe('AABBCCD');
  });

  it('accepts a 9-hex MA-S prefix', () => {
    expect(normalizePrefix('8c1f64afA')).toBe('8C1F64AFA');
  });

  it('rejects a 5-hex prefix (too short)', () => {
    expect(normalizePrefix('ABCDE')).toBeNull();
  });

  it('rejects an 8-hex prefix (not a valid registry length)', () => {
    expect(normalizePrefix('AABBCCDD')).toBeNull();
  });

  it('rejects non-hex characters', () => {
    expect(normalizePrefix('GHIJKL')).toBeNull();
  });

  it('rejects empty input', () => {
    expect(normalizePrefix('')).toBeNull();
    expect(normalizePrefix('   ')).toBeNull();
  });
});

describe('buildDataset', () => {
  it('routes key length to the right bucket and keeps vendors verbatim', () => {
    const maL = [HEADER, 'MA-L,F01898,"Apple, Inc.",1 Infinite Loop'].join('\n');
    const maM = [HEADER, 'MA-M,AABBCCD,Samsung Electronics,Seoul'].join('\n');
    const maS = [HEADER, 'MA-S,8C1F64AFA,"DATA ELECTRONIC DEVICES, INC",Salem NH'].join('\n');
    const ds = buildDataset(maL, maM, maS, () => '2026-10-11T00:00:00.000Z');

    expect(ds.schemaVersion).toBe(1);
    expect(ds.generatedAt).toBe('2026-10-11T00:00:00.000Z');
    expect(ds.sources).toEqual({ 'ma-l': 'oui.csv', 'ma-m': 'mam.csv', 'ma-s': 'oui36.csv' });
    expect(ds.counts).toEqual({ l24: 1, m28: 1, s36: 1 });
    // Verbatim vendor: casing and punctuation preserved, only the key is uppercased.
    expect(ds.entries['F01898']).toBe('Apple, Inc.');
    expect(ds.entries['AABBCCD']).toBe('Samsung Electronics');
    expect(ds.entries['8C1F64AFA']).toBe('DATA ELECTRONIC DEVICES, INC');
    expect(Object.keys(ds.entries)).toHaveLength(3);
  });

  it('ingests each registry argument independently', () => {
    // Three *distinct* CSVs: a bug that dropped or swapped the ma-m/ma-s args
    // would fail this because their unique keys would be missing.
    const maL = [HEADER, 'MA-L,F01898,Apple,Addr'].join('\n');
    const maM = [HEADER, 'MA-M,AABBCCD,Samsung,Addr'].join('\n');
    const maS = [HEADER, 'MA-S,8C1F64AFA,Quercus,Addr'].join('\n');
    const ds = buildDataset(maL, maM, maS, () => '2026-10-11T00:00:00.000Z');
    expect(ds.counts).toEqual({ l24: 1, m28: 1, s36: 1 });
    expect(ds.entries).toEqual({ F01898: 'Apple', AABBCCD: 'Samsung', '8C1F64AFA': 'Quercus' });
  });

  it('sum of counts equals entries size', () => {
    const csv = [HEADER, 'MA-L,F01898,Apple,Addr', 'MA-L,E80AB9,"Cisco Systems, Inc",Addr'].join('\n');
    const ds = buildDataset(csv, HEADER, HEADER, () => '2026-10-11T00:00:00.000Z');
    const sum = ds.counts.l24 + ds.counts.m28 + ds.counts.s36;
    expect(sum).toBe(Object.keys(ds.entries).length);
    expect(ds.counts).toEqual({ l24: 2, m28: 0, s36: 0 });
  });

  it('skips rows with empty assignment or empty vendor', () => {
    const csv = [
      HEADER,
      'MA-L,,Empty Assignment,Addr',
      'MA-L,F01898,,Addr',
      'MA-L,E80AB9,Cisco,Addr',
    ].join('\n');
    const ds = buildDataset(csv, HEADER, HEADER, () => '2026-10-11T00:00:00.000Z');
    expect(Object.keys(ds.entries)).toEqual(['E80AB9']);
  });

  it('routes by key length even when the Registry column disagrees, and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Registry says MA-M but the assignment is 6 hex — length is authoritative (AC3).
    const csv = [HEADER, 'MA-M,F01898,Apple,Addr'].join('\n');
    const ds = buildDataset(csv, HEADER, HEADER, () => '2026-10-11T00:00:00.000Z');
    expect(ds.counts).toEqual({ l24: 1, m28: 0, s36: 0 });
    expect(ds.entries['F01898']).toBe('Apple');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('warns when a duplicate prefix overwrites an entry (last value wins)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const csv = [HEADER, 'MA-L,080030,First,Addr', 'MA-L,080030,Second,Addr'].join('\n');
    const ds = buildDataset(csv, HEADER, HEADER, () => '2026-10-11T00:00:00.000Z');
    expect(ds.counts.l24).toBe(1);
    expect(ds.entries['080030']).toBe('Second');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('produces deterministic, engine-defined key order regardless of CSV row order', () => {
    // '100000' is integer-like in JS (all decimal digits); '00000A' is not.
    // JS enumerates integer-like keys first, so emitted order is numeric-first
    // then lexicographic — not a pure sort — but stable across input order.
    const csvA = [HEADER, 'MA-L,00000A,Zed,Addr', 'MA-L,100000,Abe,Addr'].join('\n');
    const csvB = [HEADER, 'MA-L,100000,Abe,Addr', 'MA-L,00000A,Zed,Addr'].join('\n');
    const dsA = buildDataset(csvA, HEADER, HEADER, () => '2026-10-11T00:00:00.000Z');
    const dsB = buildDataset(csvB, HEADER, HEADER, () => '2026-10-11T00:00:00.000Z');
    expect(Object.keys(dsA.entries)).toEqual(['100000', '00000A']);
    expect(Object.keys(dsA.entries)).toEqual(Object.keys(dsB.entries));
    expect(JSON.stringify(dsA.entries)).toBe(JSON.stringify(dsB.entries));
  });

  it('is deterministic: same CSVs produce identical entries and counts', () => {
    const csv = [
      HEADER,
      'MA-L,F01898,"Apple, Inc.",Addr',
      'MA-M,AABBCCD,Samsung,Addr',
      'MA-S,8C1F64AFA,"QUERCUS TECHNOLOGIES, S.L.",Addr',
    ].join('\n');
    const t1 = () => '2026-10-11T00:00:00.000Z';
    const t2 = () => '2026-10-12T12:34:56.000Z'; // different timestamp only
    const ds1 = buildDataset(csv, HEADER, HEADER, t1);
    const ds2 = buildDataset(csv, HEADER, HEADER, t2);
    expect(ds1.entries).toEqual(ds2.entries);
    expect(ds1.counts).toEqual(ds2.counts);
    expect(ds1.generatedAt).not.toBe(ds2.generatedAt); // timestamp is expected to change
  });

  it('throws on an empty registry (no header)', () => {
    expect(() => buildDataset('', HEADER, HEADER)).toThrow();
  });

  it('throws when required header columns are missing', () => {
    expect(() => buildDataset('Foo,Bar\n1,2', HEADER, HEADER)).toThrow();
  });
});

describe('committed artifact (public/oui-data.json)', () => {
  it('has the pinned schema shape and internally consistent counts', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const raw = readFileSync(resolve(process.cwd(), 'public/oui-data.json'), 'utf8');
    const ds = JSON.parse(raw) as {
      schemaVersion: number;
      generatedAt: string;
      sources: Record<string, string>;
      counts: { l24: number; m28: number; s36: number };
      entries: Record<string, string>;
    };

    expect(ds.schemaVersion).toBe(1);
    // Valid ISO-8601 UTC string.
    expect(ds.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/);
    expect(Number.isNaN(Date.parse(ds.generatedAt))).toBe(false);

    expect(Object.keys(ds.sources).sort()).toEqual(['ma-l', 'ma-m', 'ma-s']);
    expect(ds.sources['ma-l']).toBe('oui.csv');
    expect(ds.sources['ma-m']).toBe('mam.csv');
    expect(ds.sources['ma-s']).toBe('oui36.csv');

    const keys = Object.keys(ds.entries);
    expect(keys.length).toBeGreaterThan(0);
    expect(ds.counts.l24 + ds.counts.m28 + ds.counts.s36).toBe(keys.length);

    // Validate all ~54k keys in a plain loop (expect() per-key would time out);
    // collect violations, then assert once.
    let l24 = 0;
    let m28 = 0;
    let s36 = 0;
    const badKeys: string[] = [];
    const badValues: string[] = [];
    for (const k of keys) {
      if (!/^[0-9A-F]{6}$|^[0-9A-F]{7}$|^[0-9A-F]{9}$/.test(k)) badKeys.push(k);
      if (k.length === 6) l24++;
      else if (k.length === 7) m28++;
      else if (k.length === 9) s36++;
      const v = ds.entries[k];
      if (typeof v !== 'string' || v.length === 0) badValues.push(k);
    }
    expect(badKeys).toEqual([]);
    expect(badValues).toEqual([]);
    expect(ds.counts).toEqual({ l24, m28, s36 });

    // Pinned structural spot-check (vendor-name-only index, no address/metadata).
    expect(ds.entries['F01898']).toBe('Apple, Inc.');
  });
});
