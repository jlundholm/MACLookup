import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadOuiIndex } from './load-oui-data';

type Counts = { l24: number; m28: number; s36: number };

function payloadOf(counts: Counts, entries: Record<string, string>, schemaVersion = 1): string {
  return JSON.stringify({
    schemaVersion,
    generatedAt: '2026-10-11T00:00:00.000Z',
    sources: { 'ma-l': 'oui.csv', 'ma-m': 'mam.csv', 'ma-s': 'oui36.csv' },
    counts,
    entries,
  });
}

function stubFetchWith(body: string, init?: ResponseInit): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(body, init)),
  );
}

beforeEach(() => {
  vi.stubGlobal('chrome', {
    runtime: { getURL: (path: string) => `chrome-extension://test/${path}` },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('loadOuiIndex', () => {
  it('requests the packaged resource through chrome.runtime.getURL', async () => {
    const fetchMock = vi.fn(async (_url: string) =>
      new Response(payloadOf({ l24: 1, m28: 0, s36: 0 }, { AABBCC: 'Base' })),
    );
    vi.stubGlobal('fetch', fetchMock);

    await loadOuiIndex();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('chrome-extension://test/oui-data.json');
  });

  it('builds three Maps sized by the payload counts with verbatim vendors', async () => {
    stubFetchWith(
      payloadOf(
        { l24: 1, m28: 1, s36: 1 },
        { AABBCC: 'Apple, Inc.', AABBCCD: 'Mid Vendor', AABBCCDE1: 'Top Vendor' },
      ),
    );

    const index = await loadOuiIndex();

    expect(index.l24.size).toBe(1);
    expect(index.m28.size).toBe(1);
    expect(index.s36.size).toBe(1);
    expect(index.l24.get('AABBCC')).toBe('Apple, Inc.');
    expect(index.m28.get('AABBCCD')).toBe('Mid Vendor');
    expect(index.s36.get('AABBCCDE1')).toBe('Top Vendor');
  });

  it('routes by key length alone, whatever the payload claims', async () => {
    stubFetchWith(payloadOf({ l24: 0, m28: 0, s36: 0 }, { '00000A': 'Zero Vendor' }));

    const index = await loadOuiIndex();

    expect(index.l24.get('00000A')).toBe('Zero Vendor');
    expect(index.m28.size).toBe(0);
    expect(index.s36.size).toBe(0);
  });

  it('returns fresh Maps on every call (no module-scope cache)', async () => {
    stubFetchWith(payloadOf({ l24: 1, m28: 0, s36: 0 }, { AABBCC: 'Base' }));

    const first = await loadOuiIndex();
    const second = await loadOuiIndex();

    expect(first).not.toBe(second);
    expect(first.l24).not.toBe(second.l24);
  });

  it('skips (and warns about) keys of unexpected length', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    stubFetchWith(
      payloadOf({ l24: 1, m28: 0, s36: 0 }, { AABBCC: 'Base', AABBCCDDEE: 'Wrong Length' }),
    );

    const index = await loadOuiIndex();

    expect(index.l24.size).toBe(1);
    expect(index.m28.size).toBe(0);
    expect(index.s36.size).toBe(0);
    for (const map of [index.l24, index.m28, index.s36]) {
      expect(Array.from(map.values())).not.toContain('Wrong Length');
    }
    expect(warn).toHaveBeenCalled();
  });

  it('skips (and warns about) keys that are not uppercase hex', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    stubFetchWith(
      payloadOf({ l24: 1, m28: 0, s36: 0 }, { AABBCC: 'Upper', aabbcc: 'Lower' }),
    );

    const index = await loadOuiIndex();

    expect(index.l24.size).toBe(1);
    expect(index.l24.get('AABBCC')).toBe('Upper');
    expect(warn).toHaveBeenCalled();
  });

  it('skips (and warns about) entries whose value is not a string', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    stubFetchWith(
      JSON.stringify({
        schemaVersion: 1,
        generatedAt: '2026-10-11T00:00:00.000Z',
        sources: { 'ma-l': 'oui.csv', 'ma-m': 'mam.csv', 'ma-s': 'oui36.csv' },
        counts: { l24: 0, m28: 0, s36: 0 },
        entries: { AABBCC: 42, DDEEFF: 'Real Vendor' },
      }),
    );

    const index = await loadOuiIndex();

    expect(index.l24.get('AABBCC')).toBeUndefined();
    expect(index.l24.get('DDEEFF')).toBe('Real Vendor');
    expect(index.l24.size).toBe(1);
    expect(warn).toHaveBeenCalled();
  });

  it('rejects on a non-ok response', async () => {
    stubFetchWith('not found', { status: 404, statusText: 'Not Found' });

    await expect(loadOuiIndex()).rejects.toThrow();
  });

  it('rejects when the response body is not valid JSON', async () => {
    stubFetchWith('<!doctype html><title>nope</title>');

    await expect(loadOuiIndex()).rejects.toThrow();
  });

  it('rejects on an unsupported schemaVersion', async () => {
    stubFetchWith(payloadOf({ l24: 0, m28: 0, s36: 0 }, {}, 2));

    await expect(loadOuiIndex()).rejects.toThrow();
  });

  it('rejects when the payload is not an object', async () => {
    stubFetchWith('[]');

    await expect(loadOuiIndex()).rejects.toThrow();
  });

  it('rejects when entries is missing', async () => {
    stubFetchWith(JSON.stringify({ schemaVersion: 1 }));

    await expect(loadOuiIndex()).rejects.toThrow();
  });

  it('rejects when entries is an empty object', async () => {
    stubFetchWith(payloadOf({ l24: 0, m28: 0, s36: 0 }, {}));

    await expect(loadOuiIndex()).rejects.toThrow();
  });

  it('propagates a fetch rejection', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new Error('network down'))),
    );

    await expect(loadOuiIndex()).rejects.toThrow('network down');
  });

  it('loads the real committed artifact into all three Maps within budget (AC1, AC5)', async () => {
    const body = readFileSync(resolve(process.cwd(), 'public/oui-data.json'), 'utf8');
    const artifact = JSON.parse(body) as {
      counts: { l24: number; m28: number; s36: number };
    };
    stubFetchWith(body);

    const started = performance.now();
    const index = await loadOuiIndex();
    const elapsedMs = performance.now() - started;

    expect(index.l24.size).toBe(artifact.counts.l24);
    expect(index.m28.size).toBe(artifact.counts.m28);
    expect(index.s36.size).toBe(artifact.counts.s36);
    expect(elapsedMs).toBeLessThan(2000);
  });
});
