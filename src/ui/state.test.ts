import { describe, expect, it } from 'vitest';
import { IDLE_COPY, initialState, nextState } from './state';
import type { PopupState } from '../lib/types';

function inputFrom(state: PopupState, raw: string): PopupState {
  return nextState(state, { type: 'input', raw });
}

describe('initialState', () => {
  it('is the empty resting state', () => {
    expect(initialState).toEqual({ raw: '', status: 'empty', canonical: null, copy: IDLE_COPY });
  });
});

describe('nextState', () => {
  it('keeps the empty resting state for an empty string', () => {
    expect(inputFrom(initialState, '')).toEqual({
      raw: '',
      status: 'empty',
      canonical: null,
      copy: IDLE_COPY,
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
      copy: IDLE_COPY,
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
      copy: IDLE_COPY,
    });
  });

  it('clears a stale canonical when the field becomes invalid', () => {
    const valid = inputFrom(initialState, 'AABBCCDDEEFF');
    expect(valid.canonical).toBe('AABBCCDDEEFF');
    const invalid = inputFrom(valid, 'not-a-mac');
    expect(invalid).toEqual({ raw: 'not-a-mac', status: 'invalid', canonical: null, copy: IDLE_COPY });
  });

  it('clears a stale canonical when the field is emptied', () => {
    const valid = inputFrom(initialState, 'AABBCCDDEEFF');
    expect(inputFrom(valid, '')).toEqual({ raw: '', status: 'empty', canonical: null, copy: IDLE_COPY });
  });

  it('restores valid after invalid without reload semantics', () => {
    const invalid = inputFrom(initialState, 'junk');
    expect(inputFrom(invalid, 'AABBCCDDEEFF')).toEqual({
      raw: 'AABBCCDDEEFF',
      status: 'valid',
      canonical: 'AABBCCDDEEFF',
      copy: IDLE_COPY,
    });
  });

  it('returns a new object and never mutates the previous state', () => {
    const before: PopupState = { raw: 'seed', status: 'invalid', canonical: null, copy: IDLE_COPY };
    const snapshot: PopupState = { ...before };
    const after = inputFrom(before, 'AABBCCDDEEFF');
    expect(after).not.toBe(before);
    expect(before).toEqual(snapshot);
  });

  describe('copy events', () => {
    const CANON = 'AABBCCDDEEFF';

    it('copy-resolved sets the flag for the named format only', () => {
      const valid = inputFrom(initialState, CANON);
      const resolved = nextState(valid, {
        type: 'copy-resolved',
        format: 'cisco',
        canonical: CANON,
        outcome: 'copied',
      });
      expect(resolved.copy).toEqual({ colon: 'idle', plain: 'idle', cisco: 'copied' });
      expect(resolved).not.toBe(valid);
    });

    it('copy-resolved records the failure outcome', () => {
      const valid = inputFrom(initialState, CANON);
      const resolved = nextState(valid, {
        type: 'copy-resolved',
        format: 'plain',
        canonical: CANON,
        outcome: 'failed',
      });
      expect(resolved.copy).toEqual({ colon: 'idle', plain: 'failed', cisco: 'idle' });
    });

    it('copy-resolved is ignored when the canonical changed (stale write)', () => {
      const valid = inputFrom(initialState, CANON);
      const edited = inputFrom(valid, '112233445566');
      const stale = nextState(edited, {
        type: 'copy-resolved',
        format: 'colon',
        canonical: CANON,
        outcome: 'copied',
      });
      expect(stale).toBe(edited);
      expect(stale.copy).toEqual(IDLE_COPY);
    });

    it.each(['empty', 'invalid'] as const)(
      'copy-resolved is ignored when status is %j',
      (status) => {
        const state = status === 'empty' ? inputFrom(initialState, '') : inputFrom(initialState, 'junk');
        const resolved = nextState(state, {
          type: 'copy-resolved',
          format: 'colon',
          canonical: CANON,
          outcome: 'copied',
        });
        expect(resolved).toBe(state);
      },
    );

    it('copy-timeout clears only the named format', () => {
      const valid = inputFrom(initialState, CANON);
      const copied = nextState(valid, {
        type: 'copy-resolved',
        format: 'colon',
        canonical: CANON,
        outcome: 'copied',
      });
      const failed = nextState(copied, {
        type: 'copy-resolved',
        format: 'plain',
        canonical: CANON,
        outcome: 'failed',
      });
      const timedOut = nextState(failed, { type: 'copy-timeout', format: 'colon' });
      expect(timedOut.copy).toEqual({ colon: 'idle', plain: 'failed', cisco: 'idle' });
    });

    it('copy-timeout on an already-idle format is a no-op', () => {
      const valid = inputFrom(initialState, CANON);
      const timedOut = nextState(valid, { type: 'copy-timeout', format: 'colon' });
      expect(timedOut.copy).toEqual(IDLE_COPY);
      expect(timedOut).not.toBe(valid);
    });

    it('an input event clears every copy flag', () => {
      const valid = inputFrom(initialState, CANON);
      const copied = nextState(valid, {
        type: 'copy-resolved',
        format: 'cisco',
        canonical: CANON,
        outcome: 'copied',
      });
      expect(inputFrom(copied, 'AA:BB:CC:DD:EE:FF').copy).toEqual(IDLE_COPY);
      expect(inputFrom(copied, '').copy).toEqual(IDLE_COPY);
    });
  });
});
