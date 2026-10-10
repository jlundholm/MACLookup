import type { ParseResult } from './types';

const STRIP = /[\t\n\v\f\r :.-]/g;
const HEX12 = /^[0-9A-Fa-f]{12}$/;

export function parseMac(raw: string): ParseResult {
  const stripped = raw.replace(STRIP, '');
  if (!HEX12.test(stripped)) return { ok: false, reason: 'invalid' };
  return { ok: true, canonical: stripped.toUpperCase() };
}
