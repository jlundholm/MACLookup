import { describe, expect, it } from 'vitest';
import { formats } from './format';
import type { Formats } from './types';

describe('formats', () => {
  it.each<[string, Formats]>([
    ['AABBCCDDEEFF', { plain: 'AABBCCDDEEFF', colon: 'AA:BB:CC:DD:EE:FF', cisco: 'AABB.CCDD.EEFF', hyphen: 'AA-BB-CC-DD-EE-FF' }],
    ['112233445566', { plain: '112233445566', colon: '11:22:33:44:55:66', cisco: '1122.3344.5566', hyphen: '11-22-33-44-55-66' }],
    ['000000000000', { plain: '000000000000', colon: '00:00:00:00:00:00', cisco: '0000.0000.0000', hyphen: '00-00-00-00-00-00' }],
    ['FFFFFFFFFFFF', { plain: 'FFFFFFFFFFFF', colon: 'FF:FF:FF:FF:FF:FF', cisco: 'FFFF.FFFF.FFFF', hyphen: 'FF-FF-FF-FF-FF-FF' }],
  ])('splits %s into plain, colon, cisco, and hyphen', (canonical, expected) => {
    expect(formats(canonical)).toEqual(expected);
  });

  it('is the identity on plain', () => {
    expect(formats('AABBCCDDEEFF').plain).toBe('AABBCCDDEEFF');
  });
});
