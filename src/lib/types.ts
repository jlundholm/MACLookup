export type ParseResult =
  | { ok: true; canonical: string }
  | { ok: false; reason: 'invalid' };
