import type { CopyState, FormatKey, MacStatus, PopupState } from '../lib/types';
import { parseMac } from '../lib/parse';

export const COPY_CONFIRM_MS = 1500;

export const IDLE_COPY: CopyState = { colon: 'idle', plain: 'idle', cisco: 'idle' };

export const initialState: PopupState = { raw: '', status: 'empty', canonical: null, copy: IDLE_COPY };

export type PopupEvent =
  | { type: 'input'; raw: string }
  | { type: 'copy-resolved'; format: FormatKey; canonical: string; outcome: 'copied' | 'failed' }
  | { type: 'copy-timeout'; format: FormatKey };

export function nextState(state: PopupState, event: PopupEvent): PopupState {
  switch (event.type) {
    case 'input': {
      const { raw } = event;
      if (raw === '') {
        return { ...state, raw, status: 'empty', canonical: null, copy: IDLE_COPY };
      }
      const parsed = parseMac(raw);
      const status: MacStatus = parsed.ok ? 'valid' : 'invalid';
      return { ...state, raw, status, canonical: parsed.ok ? parsed.canonical : null, copy: IDLE_COPY };
    }
    case 'copy-resolved': {
      if (state.status !== 'valid' || state.canonical !== event.canonical) return state;
      return { ...state, copy: { ...state.copy, [event.format]: event.outcome } };
    }
    case 'copy-timeout':
      return { ...state, copy: { ...state.copy, [event.format]: 'idle' } };
  }
}
