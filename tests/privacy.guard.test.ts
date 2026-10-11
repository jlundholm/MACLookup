import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type ManifestLike = Record<string, unknown>;

function manifestViolations(raw: string): string[] {
  let manifest: ManifestLike;
  try {
    manifest = JSON.parse(raw) as ManifestLike;
  } catch {
    return ['manifest is not valid JSON'];
  }

  const violations: string[] = [];

  if (manifest.manifest_version !== 3) {
    violations.push(`manifest_version must be 3 (got ${JSON.stringify(manifest.manifest_version)})`);
  }

  for (const key of ['permissions', 'host_permissions'] as const) {
    const value = manifest[key];
    if (value === undefined) continue;
    if (!Array.isArray(value) || value.length > 0) {
      violations.push(`${key} must be absent or [] (got ${JSON.stringify(value)})`);
    }
  }

  for (const key of ['background', 'content_scripts'] as const) {
    const value = manifest[key];
    if (value !== undefined) {
      violations.push(`${key} must be absent (got ${JSON.stringify(value)})`);
    }
  }

  return violations;
}

type Stripped = { stripped: string; strings: string[] };

const STRING_SLOT = String.fromCharCode(0);

function stripComments(source: string): Stripped {
  let stripped = '';
  const strings: string[] = [];
  let current = '';
  let i = 0;
  const n = source.length;
  let state: 'code' | 'line' | 'block' | 'sq' | 'dq' | 'tick' = 'code';

  while (i < n) {
    const ch = source[i]!;
    const next = i + 1 < n ? source[i + 1]! : '';

    if (state === 'code') {
      if (ch === '/' && next === '/') {
        state = 'line';
        i += 2;
        continue;
      }
      if (ch === '/' && next === '*') {
        state = 'block';
        i += 2;
        continue;
      }
      if (ch === "'" || ch === '"' || ch === '`') {
        current = '';
        state = ch === "'" ? 'sq' : ch === '"' ? 'dq' : 'tick';
        i += 1;
        continue;
      }
      stripped += ch;
      i += 1;
      continue;
    }

    if (state === 'line') {
      if (ch === '\n') {
        state = 'code';
        stripped += ch;
      }
      i += 1;
      continue;
    }

    if (state === 'block') {
      if (ch === '*' && next === '/') {
        state = 'code';
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }

    // inside a string literal
    if (ch === '\\') {
      current += source.slice(i, i + 2);
      i += 2;
      continue;
    }
    if (
      (state === 'sq' && ch === "'") ||
      (state === 'dq' && ch === '"') ||
      (state === 'tick' && ch === '`')
    ) {
      strings.push(current);
      stripped += `${STRING_SLOT}${strings.length - 1}${STRING_SLOT}`;
      state = 'code';
      i += 1;
      continue;
    }
    current += ch;
    i += 1;
  }

  return { stripped, strings };
}

function expandStringSlots(text: string, strings: string[]): string {
  return text.replace(
    new RegExp(`${STRING_SLOT}(\\d+)${STRING_SLOT}`, 'g'),
    (_m, idx: string) => strings[Number(idx)] ?? '',
  );
}

function scanSourceFile(fileName: string, source: string): string[] {
  const violations: string[] = [];
  const { stripped, strings } = stripComments(source);

  const forbidden = stripped.match(/\b(XMLHttpRequest|WebSocket|EventSource)\b/g);
  if (forbidden) {
    for (const api of new Set(forbidden)) {
      violations.push(`${fileName}: forbidden network API "${api}"`);
    }
  }

  for (const literal of strings) {
    const normalized = literal.replace(/\\\//g, '/');
    if (/https?:\/\//i.test(normalized)) {
      violations.push(`${fileName}: remote URL literal ${JSON.stringify(literal)}`);
    }
  }

  const fetchRe = /\bfetch\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = fetchRe.exec(stripped)) !== null) {
    let depth = 1;
    let j = match.index + match[0].length;
    const start = j;
    while (j < stripped.length && depth > 0) {
      const c = stripped[j]!;
      if (c === '(') depth += 1;
      else if (c === ')') depth -= 1;
      j += 1;
    }
    const rawArgs = depth === 0 ? stripped.slice(start, j - 1) : stripped.slice(start);
    const args = expandStringSlots(rawArgs, strings);
    if (!args.includes('getURL') && !args.includes('chrome-extension:')) {
      violations.push(
        `${fileName}: fetch() target is not chrome-extension/getURL (args: ${JSON.stringify(args.trim())})`,
      );
    }
  }

  return violations;
}

function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      files.push(...collectSourceFiles(full));
    } else if (
      entry.isFile() &&
      entry.name.endsWith('.ts') &&
      !entry.name.endsWith('.test.ts')
    ) {
      files.push(full);
    }
  }
  return files.sort();
}

const root = process.cwd();
const manifestPath = resolve(root, 'manifest.json');
const srcDir = resolve(root, 'src');

describe('privacy guard: manifest', () => {
  it('is MV3 and grants no permissions, background, or content scripts', () => {
    const raw = readFileSync(manifestPath, 'utf8');
    expect(manifestViolations(raw)).toEqual([]);
  });

  it('flags non-empty permissions', () => {
    const raw = JSON.stringify({ manifest_version: 3, permissions: ['tabs'] });
    expect(manifestViolations(raw).some((v) => v.includes('permissions'))).toBe(true);
  });

  it('flags non-empty host_permissions', () => {
    const raw = JSON.stringify({
      manifest_version: 3,
      host_permissions: ['https://example.com/*'],
    });
    expect(manifestViolations(raw).some((v) => v.includes('host_permissions'))).toBe(true);
  });

  it('flags a background key', () => {
    const raw = JSON.stringify({ manifest_version: 3, background: { service_worker: 'sw.js' } });
    expect(manifestViolations(raw).some((v) => v.includes('background'))).toBe(true);
  });

  it('flags a content_scripts key', () => {
    const raw = JSON.stringify({
      manifest_version: 3,
      content_scripts: [{ matches: ['<all_urls>'], js: ['cs.js'] }],
    });
    expect(manifestViolations(raw).some((v) => v.includes('content_scripts'))).toBe(true);
  });

  it('accepts absent grant keys and empty arrays', () => {
    const raw = JSON.stringify({ manifest_version: 3, permissions: [], host_permissions: [] });
    expect(manifestViolations(raw)).toEqual([]);
  });
});

describe('privacy guard: src scan', () => {
  it('finds no network APIs, remote URL literals, or non-extension fetch in src/', () => {
    const files = collectSourceFiles(srcDir);
    expect(files.length).toBeGreaterThan(0);
    const violations = files.flatMap((file) =>
      scanSourceFile(relative(root, file), readFileSync(file, 'utf8')),
    );
    expect(violations).toEqual([]);
  });

  it('flags XMLHttpRequest', () => {
    const v = scanSourceFile('bad.ts', 'const r = new XMLHttpRequest();');
    expect(v.some((x) => x.includes('XMLHttpRequest'))).toBe(true);
  });

  it('flags WebSocket', () => {
    const v = scanSourceFile('bad.ts', 'const s = new WebSocket("wss://x");');
    expect(v.some((x) => x.includes('WebSocket'))).toBe(true);
  });

  it('flags EventSource', () => {
    const v = scanSourceFile('bad.ts', 'const e = new EventSource("/events");');
    expect(v.some((x) => x.includes('EventSource'))).toBe(true);
  });

  it('flags an https URL string literal', () => {
    const v = scanSourceFile('bad.ts', "const u = 'https://example.com/oui';");
    expect(v.some((x) => x.includes('remote URL literal'))).toBe(true);
  });

  it('flags an http URL string literal', () => {
    const v = scanSourceFile('bad.ts', 'const u = "http://example.com/oui";');
    expect(v.some((x) => x.includes('remote URL literal'))).toBe(true);
  });

  it('flags an uppercase-scheme URL literal', () => {
    const v = scanSourceFile('bad.ts', "const u = 'HTTPS://example.com/oui';");
    expect(v.some((x) => x.includes('remote URL literal'))).toBe(true);
  });

  it('flags an escaped-slash URL literal', () => {
    const v = scanSourceFile('bad.ts', "const u = 'https:\\/\\/example.com/oui';");
    expect(v.some((x) => x.includes('remote URL literal'))).toBe(true);
  });

  it('flags fetch to a remote URL', () => {
    const v = scanSourceFile('bad.ts', "async function go() { return fetch('https://example.com'); }");
    expect(v.some((x) => x.includes('fetch()'))).toBe(true);
  });

  it('flags fetch with a non-extension argument', () => {
    const v = scanSourceFile('bad.ts', 'async function go(remote: string) { return fetch(remote); }');
    expect(v.some((x) => x.includes('fetch()'))).toBe(true);
  });

  it('permits inline fetch(chrome.runtime.getURL(...))', () => {
    const v = scanSourceFile(
      'ok.ts',
      "async function go() { return fetch(chrome.runtime.getURL('oui-data.json')); }",
    );
    expect(v).toEqual([]);
  });

  it('permits fetch with a chrome-extension: literal', () => {
    const v = scanSourceFile(
      'ok.ts',
      "async function go() { return fetch('chrome-extension://abc/oui-data.json'); }",
    );
    expect(v).toEqual([]);
  });

  it('flags bare-variable fetch even when getURL appears elsewhere (documented heuristic limit)', () => {
    const v = scanSourceFile(
      'ok.ts',
      "const url = chrome.runtime.getURL('oui-data.json');\nasync function go() { return fetch(url); }",
    );
    expect(v.some((x) => x.includes('fetch()'))).toBe(true);
  });

  it('ignores forbidden strings inside comments', () => {
    const v = scanSourceFile(
      'ok.ts',
      '// XMLHttpRequest https://example.com\n/* WebSocket */\nconst x = 1;',
    );
    expect(v).toEqual([]);
  });

  it('treats // inside a string as literal text, not a comment', () => {
    const v = scanSourceFile('ok.ts', "const path = 'oui//data';\nconst n = 1;");
    expect(v).toEqual([]);
    const bad = scanSourceFile('bad.ts', "const u = 'https://example.com//path';");
    expect(bad.some((x) => x.includes('remote URL literal'))).toBe(true);
  });
});
