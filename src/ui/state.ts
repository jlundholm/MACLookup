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

/* Story 2.3 (architecture.md:323): status is the four-value union derived from the
   parse result AND the lookup outcome. 'empty'/'invalid' are parse-owned and never
   move; a parsed canonical with a conclusive hit is 'found', anything else that
   parsed is 'miss' (including a valid MAC whose lookup is not yet conclusive). */
function rederiveStatus(
  status: MacStatus,
  vendor: PopupState['vendor'],
): MacStatus {
  if (status === 'empty' || status === 'invalid') return status;
  return vendor !== null && vendor.ok ? 'found' : 'miss';
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
      const canonical = parsed.ok ? parsed.canonical : null;
      const vendor = resolveVendor(canonical, index);
      const status: MacStatus = !parsed.ok
        ? 'invalid'
        : vendor !== null && vendor.ok
          ? 'found'
          : 'miss';
      return {
        ...state,
        raw,
        status,
        canonical,
        vendor,
        copy: IDLE_COPY,
      };
    }
    case 'copy-resolved': {
      if (
        (state.status !== 'found' && state.status !== 'miss') ||
        state.canonical !== event.canonical
      ) {
        return state;
      }
      return { ...state, copy: { ...state.copy, [event.format]: event.outcome } };
    }
    case 'copy-timeout':
      return { ...state, copy: { ...state.copy, [event.format]: 'idle' } };
    case 'dataset-ready': {
      const vendor = resolveVendor(state.canonical, index);
      return { ...state, dataStatus: 'ready', vendor, status: rederiveStatus(state.status, vendor) };
    }
    case 'dataset-unavailable':
      return {
        ...state,
        dataStatus: 'unavailable',
        vendor: null,
        status: rederiveStatus(state.status, null),
      };
  }
}
