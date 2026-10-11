import { describe, expect, it } from 'vitest';
import { initialState, nextState } from './state';
import type { PopupState } from '../lib/types';

function inputFrom(state: PopupState, raw: string): PopupState {
  return nextState(state, { type: 'input', raw });
}

describe('initialState', () => {
  it('is the empty resting state', () => {
    expect(initialState).toEqual({ raw: '', status: 'empty', canonical: null });
  });
});

describe('nextState', () => {
  it('keeps the empty resting state for an empty string', () => {
    expect(inputFrom(initialState, '')).toEqual({
      raw: '',
      status: 'empty',
      canonical: null,
    });
  });

  it.each([
    'aa:bb:cc:dd:ee:ff',
    'AA:BB:CC:DD:EE:FF',
    'AA-BB-CC-DD-EE-FF',
    'aabb.ccdd.eeff',
    'AA BB CC DD EE FF',
    'AABBCCDDEEFF',
    'aAbBcCdDeEfF',
    '  AA:BB:CC:DD:EE:FF  ',
    '\nAABBCCDDEEFF\n',
    'AA:BB-CC.DD EE:FF',
  ])('maps valid form %j to valid + canonical', (raw) => {
    expect(inputFrom(initialState, raw)).toEqual({
      raw,
      status: 'valid',
      canonical: 'AABBCCDDEEFF',
    });
  });

  it.each([
    '   ',
    'AABBCCDDEEF',
    'AABBCCDDEEFFF',
    'AA:BB:CC:DD:EE:FG',
    'AA:BB:CC:DD:EE:FF 11:22:33:44:55:66',
    'AA:BB:CC:DD:EE:FF,',
    'AA\u00A0BB\u00A0CC\u00A0DD\u00A0EE\u00A0FF',
    ['AA', 'BB', 'CC', 'DD', 'EE', 'FF'].join('\uFF1A'),
    '\uFB00\uFB00\uFB00\uFB00\uFB00\uFB00',
    'AA/BB/CC/DD/EE/FF',
  ])('maps invalid input %j to invalid + null canonical', (raw) => {
    expect(inputFrom(initialState, raw)).toEqual({
      raw,
      status: 'invalid',
      canonical: null,
    });
  });

  it('clears a stale canonical when the field becomes invalid', () => {
    const valid = inputFrom(initialState, 'AABBCCDDEEFF');
    expect(valid.canonical).toBe('AABBCCDDEEFF');
    const invalid = inputFrom(valid, 'not-a-mac');
    expect(invalid).toEqual({ raw: 'not-a-mac', status: 'invalid', canonical: null });
  });

  it('clears a stale canonical when the field is emptied', () => {
    const valid = inputFrom(initialState, 'AABBCCDDEEFF');
    expect(inputFrom(valid, '')).toEqual({ raw: '', status: 'empty', canonical: null });
  });

  it('restores valid after invalid without reload semantics', () => {
    const invalid = inputFrom(initialState, 'junk');
    expect(inputFrom(invalid, 'AABBCCDDEEFF')).toEqual({
      raw: 'AABBCCDDEEFF',
      status: 'valid',
      canonical: 'AABBCCDDEEFF',
    });
  });

  it('returns a new object and never mutates the previous state', () => {
    const before: PopupState = { raw: 'seed', status: 'invalid', canonical: null };
    const snapshot: PopupState = { ...before };
    const after = inputFrom(before, 'AABBCCDDEEFF');
    expect(after).not.toBe(before);
    expect(before).toEqual(snapshot);
  });
});
