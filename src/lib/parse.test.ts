import { describe, expect, it } from 'vitest';
import { parseMac } from './parse';

const CANONICAL = 'AABBCCDDEEFF';
const CANONICAL_SHAPE = /^[0-9A-F]{12}$/;

describe('parseMac — accepted forms reduce to canonical', () => {
  const valid: Array<[label: string, input: string]> = [
    ['colon lowercase', 'aa:bb:cc:dd:ee:ff'],
    ['colon uppercase', 'AA:BB:CC:DD:EE:FF'],
    ['dash', 'AA-BB-CC-DD-EE-FF'],
    ['cisco dot', 'aabb.ccdd.eeff'],
    ['space-separated', 'AA BB CC DD EE FF'],
    ['plain', 'AABBCCDDEEFF'],
    ['mixed case', 'aAbBcCdDeEfF'],
    ['trailing mixed case', 'AA:BB:CC:DD:EE:ff'],
    ['leading/trailing spaces', '  AA:BB:CC:DD:EE:FF  '],
    ['surrounding newlines', '\nAABBCCDDEEFF\n'],
    ['surrounding tabs', '\tAA BB CC DD EE FF\t'],
    ['mixed separators', 'AA:BB-CC.DD EE:FF'],
    ['separators anywhere', '::AABBCCDDEEFF'],
  ];

  it.each(valid)('%s: %j', (_label, input) => {
    const result = parseMac(input);
    expect(result).toEqual({ ok: true, canonical: CANONICAL });
    if (result.ok) expect(result.canonical).toMatch(CANONICAL_SHAPE);
  });
});

describe('parseMac — invalid input returns the discriminated failure', () => {
  const invalid: Array<[label: string, input: string]> = [
    ['empty string', ''],
    ['whitespace only', '   '],
    ['11 hex digits', 'AABBCCDDEEF'],
    ['13 hex digits', 'AABBCCDDEEFFF'],
    ['non-hex letter in group', 'AA:BB:CC:DD:EE:FG'],
    ['all non-hex letters', 'GGGGGGGGGGGG'],
    ['two MACs from a table export', 'AA:BB:CC:DD:EE:FF 11:22:33:44:55:66'],
    ['trailing comma', 'AA:BB:CC:DD:EE:FF,'],
    ['trailing vendor text', 'AA:BB:CC:DD:EE:FF Apple'],
    ['NBSP-separated (non-ASCII whitespace)', 'AA\u00A0BB\u00A0CC\u00A0DD\u00A0EE\u00A0FF'],
    ['line separator U+2028', 'AA\u2028BB\u2028CC\u2028DD\u2028EE\u2028FF'],
    ['fullwidth colon U+FF1A', 'AA\uFF1ABB\uFF1ACC\uFF1ADD\uFF1AEE\uFF1AFF'],
    ['en dash U+2013', 'AA\u2013BB\u2013CC\u2013DD\u2013EE\u2013FF'],
    ['em dash U+2014', 'AA\u2014BB\u2014CC\u2014DD\u2014EE\u2014FF'],
    ['hyphen U+2010', 'AA\u2010BB\u2010CC\u2010DD\u2010EE\u2010FF'],
    ['non-breaking hyphen U+2011', 'AA\u2011BB\u2011CC\u2011DD\u2011EE\u2011FF'],
    ['fullwidth ASCII letters U+FF21', '\uFF21\uFF21\uFF22\uFF22\uFF23\uFF23\uFF24\uFF24\uFF25\uFF25\uFF26\uFF26'],
    ['ligature homoglyphs U+FB00', '\uFB00\uFB00\uFB00\uFB00\uFB00\uFB00'],
    ['slash separators', 'AA/BB/CC/DD/EE/FF'],
  ];

  it.each(invalid)('%s: %j', (_label, input) => {
    expect(parseMac(input)).toEqual({ ok: false, reason: 'invalid' });
  });
});

describe('parseMac — purity and contract', () => {
  it('never throws for expected bad input', () => {
    const samples = ['', '   ', 'not-a-mac', 'AA\u00A0BB', '\uFB00\uFB00', 'AA:BB:CC:DD:EE:FF Apple'];
    for (const sample of samples) {
      expect(() => parseMac(sample)).not.toThrow();
    }
  });

  it('does not mutate or retain the input', () => {
    const input = 'aa:bb:cc:dd:ee:ff';
    parseMac(input);
    expect(input).toBe('aa:bb:cc:dd:ee:ff');
  });
});
