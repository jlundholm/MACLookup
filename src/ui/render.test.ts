// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { render } from './render';
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
        </div>
        <div class="format-row" data-format="plain">
          <span class="field-label">Plain</span>
          <span class="readout"></span>
        </div>
        <div class="format-row" data-format="cisco">
          <span class="field-label">Cisco-dot</span>
          <span class="readout"></span>
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

const EMPTY: PopupState = { raw: '', status: 'empty', canonical: null };
const INVALID: PopupState = { raw: 'junk', status: 'invalid', canonical: null };
const VALID: PopupState = { raw: 'AABBCCDDEEFF', status: 'valid', canonical: 'AABBCCDDEEFF' };

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

  it('index.html contains every id the renderer wires', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    for (const id of ['popup', 'mac-input', 'input-error', 'format-rows', 'result-banner']) {
      expect(html).toContain(`id="${id}"`);
    }
  });
});
