import { describe, expect, it } from 'vitest';
import { formats } from './format';
import type { Formats } from './types';

describe('formats', () => {
  it.each<[string, Formats]>([
    ['AABBCCDDEEFF', { colon: 'AA:BB:CC:DD:EE:FF', plain: 'AABBCCDDEEFF', cisco: 'AABB.CCDD.EEFF' }],
    ['112233445566', { colon: '11:22:33:44:55:66', plain: '112233445566', cisco: '1122.3344.5566' }],
    ['000000000000', { colon: '00:00:00:00:00:00', plain: '000000000000', cisco: '0000.0000.0000' }],
    ['FFFFFFFFFFFF', { colon: 'FF:FF:FF:FF:FF:FF', plain: 'FFFFFFFFFFFF', cisco: 'FFFF.FFFF.FFFF' }],
  ])('splits %s into colon, plain, and cisco', (canonical, expected) => {
    expect(formats(canonical)).toEqual(expected);
  });

  it('is the identity on plain', () => {
    expect(formats('AABBCCDDEEFF').plain).toBe('AABBCCDDEEFF');
  });
});
