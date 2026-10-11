import { describe, expect, it } from 'vitest';
import { formats } from './format';

describe('formats', () => {
  it.each([
    'AABBCCDDEEFF',
    '112233445566',
    '000000000000',
    'FFFFFFFFFFFF',
  ])('splits %s into colon, plain, and cisco', (canonical) => {
    const [a, b, c, d, e, f] = canonical.match(/.{2}/g) as string[];
    expect(formats(canonical)).toEqual({
      colon: `${a}:${b}:${c}:${d}:${e}:${f}`,
      plain: canonical,
      cisco: `${a}${b}.${c}${d}.${e}${f}`,
    });
  });

  it('is the identity on plain', () => {
    expect(formats('AABBCCDDEEFF').plain).toBe('AABBCCDDEEFF');
  });
});
