import type { VendorResult } from './lookup';

export type ParseResult =
  | { ok: true; canonical: string }
  | { ok: false; reason: 'invalid' };

export type MacStatus = 'empty' | 'found' | 'miss' | 'invalid';

export type DataStatus = 'loading' | 'ready' | 'unavailable';

export type PopupState = {
  raw: string;
  status: MacStatus;
  canonical: string | null;
  copy: CopyState;
  vendor: VendorResult | null;
  dataStatus: DataStatus;
};

export type Formats = { plain: string; colon: string; cisco: string; hyphen: string };

export type FormatKey = 'plain' | 'colon' | 'cisco' | 'hyphen';
export type CopyFlag = 'idle' | 'copied' | 'failed';
export type CopyState = { plain: CopyFlag; colon: CopyFlag; cisco: CopyFlag; hyphen: CopyFlag };
