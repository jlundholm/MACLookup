import type { OuiIndex } from '../lib/lookup';

type PayloadLike = {
  schemaVersion?: unknown;
  entries?: unknown;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseEntries(text: string): Record<string, string> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('OUI Scout: oui-data.json is not valid JSON');
  }

  if (!isPlainObject(raw)) throw new Error('OUI Scout: oui-data.json is not a JSON object');

  const payload = raw as PayloadLike;
  const { schemaVersion } = payload;
  if (typeof schemaVersion !== 'number' || schemaVersion !== 1) {
    throw new Error('OUI Scout: unsupported oui-data.json schemaVersion');
  }
  if (!isPlainObject(payload.entries)) {
    throw new Error('OUI Scout: oui-data.json has no entries object');
  }
  if (Object.keys(payload.entries).length === 0) {
    throw new Error('OUI Scout: oui-data.json has an empty entries object');
  }

  return payload.entries as Record<string, string>;
}

const ENTRY_KEY = /^(?:[0-9A-F]{6}|[0-9A-F]{7}|[0-9A-F]{9})$/;

function buildIndex(entries: Record<string, string>): OuiIndex {
  const index: OuiIndex = { l24: new Map(), m28: new Map(), s36: new Map() };
  let skipped = 0;

  for (const [key, vendor] of Object.entries(entries)) {
    if (typeof vendor !== 'string' || !ENTRY_KEY.test(key)) {
      skipped += 1;
      continue;
    }
    if (key.length === 6) index.l24.set(key, vendor);
    else if (key.length === 7) index.m28.set(key, vendor);
    else index.s36.set(key, vendor);
  }

  if (skipped > 0) {
    console.warn(`OUI Scout: skipped ${skipped} invalid dataset entries`);
  }

  return index;
}

export async function loadOuiIndex(): Promise<OuiIndex> {
  const response = await fetch(chrome.runtime.getURL('oui-data.json'));
  if (!response.ok) {
    throw new Error(`OUI Scout: oui-data.json request failed with status ${response.status}`);
  }
  return buildIndex(parseEntries(await response.text()));
}
