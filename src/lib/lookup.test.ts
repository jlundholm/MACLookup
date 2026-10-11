import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lookupVendor, type OuiIndex } from './lookup';

function emptyIndex(): OuiIndex {
  return { l24: new Map(), m28: new Map(), s36: new Map() };
}

function indexFromEntries(entries: Record<string, string>): OuiIndex {
  const index = emptyIndex();
  for (const [key, vendor] of Object.entries(entries)) {
    if (key.length === 6) index.l24.set(key, vendor);
    else if (key.length === 7) index.m28.set(key, vendor);
    else if (key.length === 9) index.s36.set(key, vendor);
  }
  return index;
}

describe('lookupVendor: unit', () => {
  const UNIT: OuiIndex = indexFromEntries({
    AAAAAA: 'L24 Vendor',
    AAAAAAB: 'M28 Vendor',
    AAAAAAB0C: 'S36 Vendor',
  });

  it('resolves an MA-S (/36) prefix', () => {
    expect(lookupVendor('AAAAAAB0C123', UNIT)).toEqual({
      ok: true,
      vendor: 'S36 Vendor',
      prefix: 'AAAAAAB0C',
    });
  });

  it('resolves an MA-M (/28) prefix when no /36 matches', () => {
    expect(lookupVendor('AAAAAAB12345', UNIT)).toEqual({
      ok: true,
      vendor: 'M28 Vendor',
      prefix: 'AAAAAAB',
    });
  });

  it('resolves an MA-L (/24) prefix when no longer prefix matches', () => {
    expect(lookupVendor('AAAAAA999999', UNIT)).toEqual({
      ok: true,
      vendor: 'L24 Vendor',
      prefix: 'AAAAAA',
    });
  });

  it('returns the longest prefix when all three levels overlap', () => {
    const result = lookupVendor('AAAAAAB0C123', UNIT);
    expect(result.ok).toBe(true);
    expect(result.prefix).toBe('AAAAAAB0C');
  });

  it('reports the /24 OUI on a miss at every level', () => {
    expect(lookupVendor('FFFFFF000001', UNIT)).toEqual({
      ok: false,
      prefix: 'FFFFFF',
    });
  });

  it.each(['junk', 'AABBCC', 'aabbccddeeff', 'AABBCCDDEEF', 'AABBCCDDEEFFAA', '', 'AABBCCDDEEFG'])(
    'returns the empty-prefix miss branch for malformed canonical %j',
    (canonical) => {
      expect(lookupVendor(canonical, UNIT)).toEqual({ ok: false, prefix: '' });
    },
  );

  it('never throws for any input, malformed or not', () => {
    const wildcards = ['', ' ', '0', 'x'.repeat(12), 'A'.repeat(13), 'AAAAAAAAAAAA!', '-AAAAAAAAAAAA'];
    for (const canonical of wildcards) {
      expect(() => lookupVendor(canonical, UNIT)).not.toThrow();
    }
  });

  it('always returns a prefix that is a substring of the canonical', () => {
    const index = indexFromEntries({
      AABBCC: 'Base',
      AABBCCD: 'Mid',
      AABBCCDE1: 'Top',
      '112233': 'Other',
    });
    const canonicals = ['AABBCCDE1234', 'AABBCCD55555', 'AABBCC999999', '998877665544', 'ZZZZZZZZZZZZ'];
    for (const canonical of canonicals) {
      const result = lookupVendor(canonical, index);
      if (result.prefix === '') continue;
      expect(canonical).toContain(result.prefix);
    }
  });

  it('uses exact hex-string keys, never numeric coercion', () => {
    const index = emptyIndex();
    index.l24.set('00000A', 'Leading-zero vendor');
    expect(lookupVendor('00000A999999', index)).toEqual({
      ok: true,
      vendor: 'Leading-zero vendor',
      prefix: '00000A',
    });
  });

  it('keeps vendor strings verbatim', () => {
    const index = indexFromEntries({ AABBCC: 'Apple, Inc.' });
    const result = lookupVendor('AABBCCDDEEFF', index);
    expect(result.ok && result.vendor).toBe('Apple, Inc.');
  });
});

describe('lookupVendor: committed artifact', () => {
  const artifact = JSON.parse(
    readFileSync(resolve(process.cwd(), 'public/oui-data.json'), 'utf8'),
  ) as {
    counts: { l24: number; m28: number; s36: number };
    entries: Record<string, string>;
  };

  const index = indexFromEntries(artifact.entries);

  it('routes every committed entry into the bucket its key length implies', () => {
    expect(index.l24.size).toBe(artifact.counts.l24);
    expect(index.m28.size).toBe(artifact.counts.m28);
    expect(index.s36.size).toBe(artifact.counts.s36);
    expect(index.l24.size + index.m28.size + index.s36.size).toBe(
      Object.keys(artifact.entries).length,
    );
  });

  it('resolves the pinned MA-L fixture (AC4)', () => {
    expect(lookupVendor('F01898000000', index)).toEqual({
      ok: true,
      vendor: 'Apple, Inc.',
      prefix: 'F01898',
    });
  });

  it('resolves the pinned MA-M fixture and beats its /24 (AC2, AC3)', () => {
    expect(index.l24.get('100648')).toBe('IEEE Registration Authority');
    expect(lookupVendor('1006483ABCDE', index)).toEqual({
      ok: true,
      vendor: 'illuminous LLC',
      prefix: '1006483',
    });
  });

  it('resolves the pinned MA-S fixture and beats its /24 without a /28 present (AC2, AC3)', () => {
    expect(index.l24.get('001BC5')).toBe('IEEE Registration Authority');
    expect(index.m28.has('001BC50')).toBe(false);
    expect(lookupVendor('001BC5000123', index)).toEqual({
      ok: true,
      vendor: 'Converging Systems Inc.',
      prefix: '001BC5000',
    });
  });

  it('reports the /24 OUI for a MAC absent from every registry', () => {
    expect(lookupVendor('FFFFFF000001', index)).toEqual({ ok: false, prefix: 'FFFFFF' });
  });
});
