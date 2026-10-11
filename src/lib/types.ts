import type { VendorResult } from './lookup';

export type ParseResult =
  | { ok: true; canonical: string }
  | { ok: false; reason: 'invalid' };

export type MacStatus = 'empty' | 'valid' | 'invalid';

export type DataStatus = 'loading' | 'ready' | 'unavailable';

export type PopupState = {
  raw: string;
  status: MacStatus;
  canonical: string | null;
  copy: CopyState;
  vendor: VendorResult | null;
  dataStatus: DataStatus;
};

export type Formats = { colon: string; plain: string; cisco: string };

export type FormatKey = 'colon' | 'plain' | 'cisco';
export type CopyFlag = 'idle' | 'copied' | 'failed';
export type CopyState = { colon: CopyFlag; plain: CopyFlag; cisco: CopyFlag };
