import { describe, expect, it } from 'vitest';
import { IDLE_COPY, initialState, nextState } from './state';
import { lookupVendor, type OuiIndex } from '../lib/lookup';
import type { PopupState } from '../lib/types';

function inputFrom(state: PopupState, raw: string, index: OuiIndex | null = null): PopupState {
  return nextState(state, { type: 'input', raw }, index);
}

const FIXTURE: OuiIndex = {
  l24: new Map([['AABBCC', 'Apple, Inc.']]),
  m28: new Map(),
  s36: new Map(),
};

describe('initialState', () => {
  it('is the empty resting state', () => {
    expect(initialState).toEqual({
      raw: '',
      status: 'empty',
      canonical: null,
      copy: IDLE_COPY,
      vendor: null,
      dataStatus: 'loading',
    });
  });
});

describe('nextState', () => {
  it('keeps the empty resting state for an empty string', () => {
    expect(inputFrom(initialState, '')).toEqual({
      raw: '',
      status: 'empty',
      canonical: null,
      copy: IDLE_COPY,
      vendor: null,
      dataStatus: 'loading',
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
  ])('maps valid form %j to a parsed canonical', (raw) => {
    expect(inputFrom(initialState, raw)).toEqual({
      raw,
      status: 'miss',
      canonical: 'AABBCCDDEEFF',
      copy: IDLE_COPY,
      vendor: null,
      dataStatus: 'loading',
    });
  });

  it.each([
    '   ',
    'AABBCCDDEEF',
    'AABBCCDDEEFFF',
    'AA:BB:CC:DD:EE:FG',
    'AA:BB:CC:DD:EE:FF 11:22:33:44:55:66',
    'AA:BB:CC:DD:EE:FF,',
    'AA BB CC DD EE FF',
    ['AA', 'BB', 'CC', 'DD', 'EE', 'FF'].join('：'),
    'ﬀﬀﬀﬀﬀﬀ',
    'AA/BB/CC/DD/EE/FF',
  ])('maps invalid input %j to invalid + null canonical', (raw) => {
    expect(inputFrom(initialState, raw)).toEqual({
      raw,
      status: 'invalid',
      canonical: null,
      copy: IDLE_COPY,
      vendor: null,
      dataStatus: 'loading',
    });
  });

  it('clears a stale canonical when the field becomes invalid', () => {
    const valid = inputFrom(initialState, 'AABBCCDDEEFF');
    expect(valid.canonical).toBe('AABBCCDDEEFF');
    const invalid = inputFrom(valid, 'not-a-mac');
    expect(invalid).toEqual({
      raw: 'not-a-mac',
      status: 'invalid',
      canonical: null,
      copy: IDLE_COPY,
      vendor: null,
      dataStatus: 'loading',
    });
  });

  it('clears a stale canonical when the field is emptied', () => {
    const valid = inputFrom(initialState, 'AABBCCDDEEFF');
    expect(inputFrom(valid, '')).toEqual({
      raw: '',
      status: 'empty',
      canonical: null,
      copy: IDLE_COPY,
      vendor: null,
      dataStatus: 'loading',
    });
  });

  it('restores a parsed canonical after invalid', () => {
    const invalid = inputFrom(initialState, 'junk');
    expect(inputFrom(invalid, 'AABBCCDDEEFF')).toEqual({
      raw: 'AABBCCDDEEFF',
      status: 'miss',
      canonical: 'AABBCCDDEEFF',
      copy: IDLE_COPY,
      vendor: null,
      dataStatus: 'loading',
    });
  });

  it('returns a new object and never mutates the previous state', () => {
    const before: PopupState = {
      raw: 'seed',
      status: 'invalid',
      canonical: null,
      copy: IDLE_COPY,
      vendor: null,
      dataStatus: 'unavailable',
    };
    const snapshot: PopupState = { ...before };
    const after = inputFrom(before, 'AABBCCDDEEFF');
    expect(after).not.toBe(before);
    expect(before).toEqual(snapshot);
    expect(after.dataStatus).toBe('unavailable');
  });

  describe('vendor resolution', () => {
    it('resolves the pinned vendor when an index is supplied', () => {
      const state = inputFrom(initialState, 'AABBCCDDEEFF', FIXTURE);
      expect(state.vendor).toEqual({
        ok: true,
        vendor: 'Apple, Inc.',
        prefix: 'AABBCC',
      });
    });

    it('leaves vendor null when no index is supplied', () => {
      expect(inputFrom(initialState, 'AABBCCDDEEFF').vendor).toBeNull();
    });

    it('leaves vendor null for invalid input even with an index', () => {
      expect(inputFrom(initialState, 'junk', FIXTURE).vendor).toBeNull();
    });

    it('records a miss as a discriminated result, not null', () => {
      const state = inputFrom(initialState, '998877665544', FIXTURE);
      expect(state.vendor).toEqual({ ok: false, prefix: '998877' });
    });

    it('clears vendor when the field is emptied', () => {
      const filled = inputFrom(initialState, 'AABBCCDDEEFF', FIXTURE);
      expect(inputFrom(filled, '').vendor).toBeNull();
    });
  });

  describe('status union derivation (Story 2.3)', () => {
    it('derives found when the prefix resolves', () => {
      expect(inputFrom(initialState, 'AABBCCDDEEFF', FIXTURE).status).toBe('found');
    });

    it('derives miss when the prefix is absent', () => {
      expect(inputFrom(initialState, '998877665544', FIXTURE).status).toBe('miss');
    });

    it('derives miss (not found, not empty) for a valid MAC with no index yet', () => {
      expect(inputFrom(initialState, 'AABBCCDDEEFF').status).toBe('miss');
    });

    it('derives miss for a valid MAC while the data is unavailable', () => {
      const unavailable = nextState(initialState, { type: 'dataset-unavailable' }, FIXTURE);
      expect(inputFrom(unavailable, 'AABBCCDDEEFF').status).toBe('miss');
    });

    it('derives invalid for a failed parse even with an index', () => {
      expect(inputFrom(initialState, 'junk', FIXTURE).status).toBe('invalid');
    });

    it('derives empty for an empty field', () => {
      expect(inputFrom(initialState, '').status).toBe('empty');
    });

    it('flips a pre-load pasted MAC from miss to found when the dataset arrives', () => {
      const typed = inputFrom(initialState, 'AABBCCDDEEFF');
      expect(typed.status).toBe('miss');
      const ready = nextState(typed, { type: 'dataset-ready' }, FIXTURE);
      expect(ready.status).toBe('found');
    });

    it('keeps a pre-load pasted miss as miss when the dataset arrives', () => {
      const typed = inputFrom(initialState, '998877665544');
      expect(typed.status).toBe('miss');
      const ready = nextState(typed, { type: 'dataset-ready' }, FIXTURE);
      expect(ready.status).toBe('miss');
    });

    it('does not store the outcome in a second field', () => {
      const state = inputFrom(initialState, 'AABBCCDDEEFF', FIXTURE);
      expect(Object.hasOwn(state, 'outcome')).toBe(false);
      expect(Object.hasOwn(state, 'result')).toBe(false);
    });
  });

  describe('dataset events', () => {
    it('dataset-ready marks the data ready', () => {
      const ready = nextState(initialState, { type: 'dataset-ready' }, FIXTURE);
      expect(ready.dataStatus).toBe('ready');
    });

    it('dataset-ready resolves a MAC typed before the load finished', () => {
      const typed = inputFrom(initialState, 'AABBCCDDEEFF');
      expect(typed.vendor).toBeNull();
      const ready = nextState(typed, { type: 'dataset-ready' }, FIXTURE);
      expect(ready.vendor).toEqual({ ok: true, vendor: 'Apple, Inc.', prefix: 'AABBCC' });
      expect(ready.canonical).toBe('AABBCCDDEEFF');
    });

    it('dataset-ready with empty input does not throw and keeps vendor null', () => {
      expect(() => nextState(initialState, { type: 'dataset-ready' }, FIXTURE)).not.toThrow();
      expect(nextState(initialState, { type: 'dataset-ready' }, FIXTURE).vendor).toBeNull();
    });

    it('dataset-unavailable marks the data unavailable and clears vendor', () => {
      const filled = inputFrom(initialState, 'AABBCCDDEEFF', FIXTURE);
      expect(filled.vendor).not.toBeNull();
      const unavailable = nextState(filled, { type: 'dataset-unavailable' }, FIXTURE);
      expect(unavailable.dataStatus).toBe('unavailable');
      expect(unavailable.vendor).toBeNull();
    });

    it('stays non-blocking after dataset-unavailable: parse still derives status and canonical', () => {
      const unavailable = nextState(initialState, { type: 'dataset-unavailable' }, FIXTURE);
      expect(unavailable.dataStatus).toBe('unavailable');
      const typed = inputFrom(unavailable, 'AABBCCDDEEFF');
      expect(typed.status).toBe('miss');
      expect(typed.canonical).toBe('AABBCCDDEEFF');
      expect(typed.vendor).toBeNull();
    });

    it('preserves the copy flags through a dataset event', () => {
      const valid = inputFrom(initialState, 'AABBCCDDEEFF', FIXTURE);
      const copied = nextState(valid, {
        type: 'copy-resolved',
        format: 'colon',
        canonical: 'AABBCCDDEEFF',
        outcome: 'copied',
      });
      const ready = nextState(copied, { type: 'dataset-ready' }, FIXTURE);
      expect(ready.copy).toEqual({ colon: 'copied', plain: 'idle', cisco: 'idle', hyphen: 'idle' });
    });
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
      expect(resolved.copy).toEqual({ colon: 'idle', plain: 'idle', cisco: 'copied', hyphen: 'idle' });
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
      expect(resolved.copy).toEqual({ colon: 'idle', plain: 'failed', cisco: 'idle', hyphen: 'idle' });
    });

    it('copy-resolved tracks the hyphen flag independently', () => {
      const valid = inputFrom(initialState, CANON);
      const resolved = nextState(valid, {
        type: 'copy-resolved',
        format: 'hyphen',
        canonical: CANON,
        outcome: 'copied',
      });
      expect(resolved.copy).toEqual({ plain: 'idle', colon: 'idle', cisco: 'idle', hyphen: 'copied' });
      const failed = nextState(valid, {
        type: 'copy-resolved',
        format: 'hyphen',
        canonical: CANON,
        outcome: 'failed',
      });
      expect(failed.copy).toEqual({ plain: 'idle', colon: 'idle', cisco: 'idle', hyphen: 'failed' });
      const timedOut = nextState(failed, { type: 'copy-timeout', format: 'hyphen' });
      expect(timedOut.copy).toEqual(IDLE_COPY);
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

    it.each([
      ['found', 'AABBCCDDEEFF'],
      ['miss', '998877665544'],
    ] as const)('copy-resolved is accepted when status is %j', (status, raw) => {
      const state = inputFrom(initialState, raw, FIXTURE);
      expect(state.status).toBe(status);
      const resolved = nextState(state, {
        type: 'copy-resolved',
        format: 'colon',
        canonical: raw,
        outcome: 'copied',
      });
      expect(resolved.copy).toEqual({ colon: 'copied', plain: 'idle', cisco: 'idle', hyphen: 'idle' });
      expect(resolved).not.toBe(state);
    });

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
      expect(timedOut.copy).toEqual({ colon: 'idle', plain: 'failed', cisco: 'idle', hyphen: 'idle' });
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

  describe('index contract', () => {
    it('lookupVendor agrees with what nextState records', () => {
      const state = inputFrom(initialState, 'AABBCCDDEEFF', FIXTURE);
      expect(state.vendor).toEqual(lookupVendor('AABBCCDDEEFF', FIXTURE));
    });

    it('does not store the index on the state object', () => {
      const state = inputFrom(initialState, 'AABBCCDDEEFF', FIXTURE);
      expect(Object.hasOwn(state, 'index')).toBe(false);
    });
  });
});
