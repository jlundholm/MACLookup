import type { MacStatus, PopupState } from '../lib/types';
import { parseMac } from '../lib/parse';

export const initialState: PopupState = { raw: '', status: 'empty', canonical: null };

export type PopupEvent = { type: 'input'; raw: string };

export function nextState(state: PopupState, event: PopupEvent): PopupState {
  const { raw } = event;
  if (raw === '') {
    return { ...state, raw, status: 'empty', canonical: null };
  }
  const parsed = parseMac(raw);
  const status: MacStatus = parsed.ok ? 'valid' : 'invalid';
  return { ...state, raw, status, canonical: parsed.ok ? parsed.canonical : null };
}
