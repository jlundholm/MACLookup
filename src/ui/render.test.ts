// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { render } from './render';
import { IDLE_COPY } from './state';
import type { PopupState } from '../lib/types';

function fixture(): HTMLElement {
  document.body.innerHTML = `
    <main class="popup" id="popup">
      <p class="wordmark">OUI Scout</p>
      <input class="mac-input" id="mac-input" type="text" placeholder="Paste a MAC address" />
      <p class="input-error" id="input-error" hidden>Not a valid MAC address</p>
      <div class="result-banner" id="result-banner" role="status" aria-live="polite" hidden></div>
      <div class="format-rows" id="format-rows" hidden>
        <div class="format-row" data-format="colon">
          <span class="field-label">Colon</span>
          <span class="readout"></span>
          <button class="copy-button" type="button" data-format="colon">Copy</button>
        </div>
        <div class="format-row" data-format="plain">
          <span class="field-label">Plain</span>
          <span class="readout"></span>
          <button class="copy-button" type="button" data-format="plain">Copy</button>
        </div>
        <div class="format-row" data-format="cisco">
          <span class="field-label">Cisco-dot</span>
          <span class="readout"></span>
          <button class="copy-button" type="button" data-format="cisco">Copy</button>
        </div>
      </div>
    </main>
  `;
  return document.getElementById('popup') as HTMLElement;
}

function el<T extends HTMLElement>(root: HTMLElement, selector: string): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`fixture missing ${selector}`);
  return found;
}

const EMPTY: PopupState = { raw: '', status: 'empty', canonical: null, copy: IDLE_COPY };
const INVALID: PopupState = { raw: 'junk', status: 'invalid', canonical: null, copy: IDLE_COPY };
const VALID: PopupState = { raw: 'AABBCCDDEEFF', status: 'valid', canonical: 'AABBCCDDEEFF', copy: IDLE_COPY };

describe('render', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = fixture();
  });

  it('renders the empty resting state: no error, no rows, no banner', () => {
    render(root, EMPTY);
    expect(root.dataset.status).toBe('empty');
    expect(el<HTMLElement>(root, '#input-error').hidden).toBe(true);
    expect(el<HTMLElement>(root, '#format-rows').hidden).toBe(true);
    expect(el<HTMLElement>(root, '#result-banner').hidden).toBe(true);
  });

  it('renders invalid: shows the exact inline error, keeps the banner hidden', () => {
    render(root, INVALID);
    expect(root.dataset.status).toBe('invalid');
    const error = el<HTMLElement>(root, '#input-error');
    expect(error.hidden).toBe(false);
    expect(error.textContent).toBe('Not a valid MAC address');
    expect(el<HTMLElement>(root, '#format-rows').hidden).toBe(false);
    expect(el<HTMLElement>(root, '#result-banner').hidden).toBe(true);
  });

  it('renders valid: hides the error, reveals the rows container, no banner', () => {
    render(root, VALID);
    expect(root.dataset.status).toBe('valid');
    expect(el<HTMLElement>(root, '#input-error').hidden).toBe(true);
    expect(el<HTMLElement>(root, '#format-rows').hidden).toBe(false);
    expect(el<HTMLElement>(root, '#result-banner').hidden).toBe(true);
  });

  it('is idempotent: rendering the same state twice yields identical DOM', () => {
    render(root, INVALID);
    const first = document.body.innerHTML;
    render(root, INVALID);
    expect(document.body.innerHTML).toBe(first);
  });

  it('never writes the uncontrolled input value', () => {
    const input = el<HTMLInputElement>(root, '#mac-input');
    input.value = 'typed-by-user';
    render(root, VALID);
    expect(input.value).toBe('typed-by-user');
  });

  it('restores cleanly when transitioning invalid → empty', () => {
    render(root, INVALID);
    render(root, EMPTY);
    expect(root.dataset.status).toBe('empty');
    expect(el<HTMLElement>(root, '#input-error').hidden).toBe(true);
    expect(el<HTMLElement>(root, '#format-rows').hidden).toBe(true);
  });

  it('fills all three rows in order on valid', () => {
    render(root, VALID);
    const readouts = Array.from(root.querySelectorAll<HTMLElement>('.format-row .readout'));
    expect(readouts.map((r) => r.textContent)).toEqual([
      'AA:BB:CC:DD:EE:FF',
      'AABBCCDDEEFF',
      'AABB.CCDD.EEFF',
    ]);
  });

  it('clears rows to an em dash on invalid (no stale value)', () => {
    render(root, VALID);
    render(root, INVALID);
    const readouts = Array.from(root.querySelectorAll<HTMLElement>('.format-row .readout'));
    for (const r of readouts) expect(r.textContent).toBe('—');
  });

  it('clears rows to an em dash on empty (no stale value)', () => {
    render(root, VALID);
    render(root, EMPTY);
    const readouts = Array.from(root.querySelectorAll<HTMLElement>('.format-row .readout'));
    for (const r of readouts) expect(r.textContent).toBe('—');
  });

  it('valid + idle flags: three enabled "Copy" buttons with no data-copy', () => {
    render(root, VALID);
    const btns = Array.from(root.querySelectorAll<HTMLButtonElement>('button.copy-button'));
    expect(btns).toHaveLength(3);
    for (const btn of btns) {
      expect(btn.textContent).toBe('Copy');
      expect(btn.disabled).toBe(false);
      expect(btn.hasAttribute('data-copy')).toBe(false);
    }
  });

  it('valid + copied flag: only that row shows "Copied" with data-copy', () => {
    const state: PopupState = { ...VALID, copy: { colon: 'copied', plain: 'idle', cisco: 'idle' } };
    render(root, state);
    const colon = el<HTMLButtonElement>(root, 'button[data-format="colon"]');
    const plain = el<HTMLButtonElement>(root, 'button[data-format="plain"]');
    const cisco = el<HTMLButtonElement>(root, 'button[data-format="cisco"]');
    expect(colon.textContent).toBe('Copied');
    expect(colon.dataset.copy).toBe('copied');
    expect(plain.textContent).toBe('Copy');
    expect(plain.hasAttribute('data-copy')).toBe(false);
    expect(cisco.textContent).toBe('Copy');
    expect(cisco.hasAttribute('data-copy')).toBe(false);
    for (const btn of [colon, plain, cisco]) expect(btn.disabled).toBe(false);
  });

  it('valid + failed flag: label stays "Copy" and data-copy="failed"', () => {
    const state: PopupState = { ...VALID, copy: { colon: 'idle', plain: 'failed', cisco: 'idle' } };
    render(root, state);
    const plain = el<HTMLButtonElement>(root, 'button[data-format="plain"]');
    expect(plain.textContent).toBe('Copy');
    expect(plain.dataset.copy).toBe('failed');
    expect(plain.disabled).toBe(false);
  });

  it('invalid: all copy buttons are disabled with "Copy"', () => {
    render(root, INVALID);
    const btns = Array.from(root.querySelectorAll<HTMLButtonElement>('button.copy-button'));
    expect(btns).toHaveLength(3);
    for (const btn of btns) {
      expect(btn.textContent).toBe('Copy');
      expect(btn.disabled).toBe(true);
      expect(btn.hasAttribute('data-copy')).toBe(false);
    }
  });

  it('a copied confirmation does not survive an edit (label returns to "Copy")', () => {
    const copied: PopupState = { ...VALID, copy: { colon: 'copied', plain: 'copied', cisco: 'copied' } };
    render(root, copied);
    render(root, INVALID);
    for (const btn of Array.from(root.querySelectorAll<HTMLButtonElement>('button.copy-button'))) {
      expect(btn.textContent).toBe('Copy');
    }
  });

  it('re-rendering an unchanged copied state keeps "Copied" (idempotent)', () => {
    const copied: PopupState = { ...VALID, copy: { colon: 'copied', plain: 'idle', cisco: 'idle' } };
    render(root, copied);
    render(root, copied);
    expect(el<HTMLButtonElement>(root, 'button[data-format="colon"]').textContent).toBe('Copied');
    expect(el<HTMLButtonElement>(root, 'button[data-format="colon"]').dataset.copy).toBe('copied');
    expect(el<HTMLButtonElement>(root, 'button[data-format="plain"]').textContent).toBe('Copy');
  });

  it('writes a dash for a row whose data-format is not a Formats key', () => {
    document.body.innerHTML = `
      <main id="popup">
        <div class="format-rows" id="format-rows">
          <div class="format-row" data-format="hyphen"><span class="readout"></span></div>
        </div>
      </main>
    `;
    const rootEl = document.getElementById('popup') as HTMLElement;
    render(rootEl, VALID);
    expect(rootEl.querySelector<HTMLElement>('#format-rows .readout')?.textContent).toBe('—');
  });

  it('index.html contains every id the renderer wires', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    for (const id of ['popup', 'mac-input', 'input-error', 'format-rows', 'result-banner']) {
      expect(html).toContain(`id="${id}"`);
    }
  });

  it('index.html format rows match what render fills', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    const host = document.createElement('div');
    host.innerHTML = html;
    const rows = Array.from(host.querySelectorAll<HTMLElement>('.format-row'));
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(['colon', 'plain', 'cisco']).toContain(row.dataset.format);
      expect(row.querySelector('.field-label')).not.toBeNull();
      expect(row.querySelector('.readout')).not.toBeNull();
      const btn = row.querySelector<HTMLButtonElement>('button.copy-button[data-format]');
      expect(btn).not.toBeNull();
      expect(btn?.dataset.format).toBe(row.dataset.format);
      expect(btn?.textContent).toBe('Copy');
    }
  });

  it('index.html carries the accessibility contracts (Story 1.7)', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    const host = document.createElement('div');
    host.innerHTML = html;
    const input = host.querySelector<HTMLInputElement>('#mac-input');
    expect(input).not.toBeNull();
    expect(input?.hasAttribute('autofocus')).toBe(true);
    expect(input?.getAttribute('aria-label')).toBe('MAC address');
    expect(input?.getAttribute('aria-describedby')).toBe('input-error');
    const error = host.querySelector<HTMLElement>('#input-error');
    expect(error).not.toBeNull();
    expect(error?.getAttribute('role')).toBe('status');
    expect(error?.getAttribute('aria-live')).toBe('polite');
    const banner = host.querySelector<HTMLElement>('#result-banner');
    expect(banner).not.toBeNull();
    expect(banner?.getAttribute('role')).toBe('status');
    expect(banner?.getAttribute('aria-live')).toBe('polite');
    expect(banner?.hasAttribute('hidden')).toBe(true);
    expect(host.querySelector('[tabindex]')).toBeNull();
    const btns = Array.from(host.querySelectorAll<HTMLButtonElement>('button.copy-button[data-format]'));
    expect(btns.map((b) => b.dataset.format)).toEqual(['colon', 'plain', 'cisco']);
    for (const btn of btns) {
      expect(btn.hasAttribute('aria-label')).toBe(false);
      expect(btn.hasAttribute('aria-labelledby')).toBe(false);
    }
  });

  it('app.css carries the Story 1.7 accessibility rules', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles/app.css'), 'utf8');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('@media (forced-colors: active)');
    expect(css).toContain('.copy-button:focus-visible');
  });
});
