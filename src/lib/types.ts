export type ParseResult =
  | { ok: true; canonical: string }
  | { ok: false; reason: 'invalid' };

export type MacStatus = 'empty' | 'valid' | 'invalid';

export type PopupState = {
  raw: string;
  status: MacStatus;
  canonical: string | null;
};
