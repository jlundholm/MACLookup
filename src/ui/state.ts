import type { CopyState, FormatKey, MacStatus, PopupState } from '../lib/types';
import { parseMac } from '../lib/parse';
import { lookupVendor, type OuiIndex } from '../lib/lookup';

export const COPY_CONFIRM_MS = 1500;

export const IDLE_COPY: CopyState = { colon: 'idle', plain: 'idle', cisco: 'idle' };

export const initialState: PopupState = {
  raw: '',
  status: 'empty',
  canonical: null,
  copy: IDLE_COPY,
  vendor: null,
  dataStatus: 'loading',
};

export type PopupEvent =
  | { type: 'input'; raw: string }
  | { type: 'copy-resolved'; format: FormatKey; canonical: string; outcome: 'copied' | 'failed' }
  | { type: 'copy-timeout'; format: FormatKey }
  | { type: 'dataset-ready' }
  | { type: 'dataset-unavailable' };

function resolveVendor(
  canonical: string | null,
  index: OuiIndex | null,
): PopupState['vendor'] {
  if (canonical === null || index === null) return null;
  return lookupVendor(canonical, index);
}

export function nextState(
  state: PopupState,
  event: PopupEvent,
  index: OuiIndex | null = null,
): PopupState {
  switch (event.type) {
    case 'input': {
      const { raw } = event;
      if (raw === '') {
        return { ...state, raw, status: 'empty', canonical: null, vendor: null, copy: IDLE_COPY };
      }
      const parsed = parseMac(raw);
      const status: MacStatus = parsed.ok ? 'valid' : 'invalid';
      const canonical = parsed.ok ? parsed.canonical : null;
      return {
        ...state,
        raw,
        status,
        canonical,
        vendor: resolveVendor(canonical, index),
        copy: IDLE_COPY,
      };
    }
    case 'copy-resolved': {
      if (state.status !== 'valid' || state.canonical !== event.canonical) return state;
      return { ...state, copy: { ...state.copy, [event.format]: event.outcome } };
    }
    case 'copy-timeout':
      return { ...state, copy: { ...state.copy, [event.format]: 'idle' } };
    case 'dataset-ready':
      return {
        ...state,
        dataStatus: 'ready',
        vendor: resolveVendor(state.canonical, index),
      };
    case 'dataset-unavailable':
      return { ...state, dataStatus: 'unavailable', vendor: null };
  }
}
