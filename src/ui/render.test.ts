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
      <div class="result-banner" id="result-banner" role="status" aria-live="polite">
        <span class="status-lamp" id="banner-lamp" aria-hidden="true"></span>
        <div class="result-body">
          <span class="state-label" id="banner-label"></span>
          <span class="result-value" id="banner-value"></span>
        </div>
        <span class="prefix" id="banner-prefix" aria-hidden="true"></span>
      </div>
      <div class="format-rows" id="format-rows" hidden>
        <div class="format-row" data-format="plain">
          <span class="field-label">Plain</span>
          <span class="readout"></span>
          <button class="copy-button" type="button" data-format="plain">Copy</button>
        </div>
        <div class="format-row" data-format="colon">
          <span class="field-label">Colon</span>
          <span class="readout"></span>
          <button class="copy-button" type="button" data-format="colon">Copy</button>
        </div>
        <div class="format-row" data-format="cisco">
          <span class="field-label">Cisco-dot</span>
          <span class="readout"></span>
          <button class="copy-button" type="button" data-format="cisco">Copy</button>
        </div>
        <div class="format-row" data-format="hyphen">
          <span class="field-label">Hyphen</span>
          <span class="readout"></span>
          <button class="copy-button" type="button" data-format="hyphen">Copy</button>
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

const EMPTY: PopupState = {
  raw: '',
  status: 'empty',
  canonical: null,
  copy: IDLE_COPY,
  vendor: null,
  dataStatus: 'ready',
};
const INVALID: PopupState = {
  raw: 'junk',
  status: 'invalid',
  canonical: null,
  copy: IDLE_COPY,
  vendor: null,
  dataStatus: 'ready',
};
const FOUND: PopupState = {
  raw: 'AABBCCDDEEFF',
  status: 'found',
  canonical: 'AABBCCDDEEFF',
  copy: IDLE_COPY,
  vendor: { ok: true, vendor: 'Apple, Inc.', prefix: 'AABBCC' },
  dataStatus: 'ready',
};
const MISS: PopupState = {
  raw: '998877665544',
  status: 'miss',
  canonical: '998877665544',
  copy: IDLE_COPY,
  vendor: { ok: false, prefix: '998877' },
  dataStatus: 'ready',
};
/* A parsed canonical whose lookup is not yet conclusive. */
const PENDING: PopupState = {
  raw: 'AABBCCDDEEFF',
  status: 'miss',
  canonical: 'AABBCCDDEEFF',
  copy: IDLE_COPY,
  vendor: null,
  dataStatus: 'loading',
};

describe('render', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = fixture();
  });

  it('renders the empty resting state: no rows, cleared banner, no data-state', () => {
    render(root, EMPTY);
    expect(root.dataset.status).toBe('empty');
    expect(el<HTMLElement>(root, '#format-rows').hidden).toBe(true);
    const banner = el<HTMLElement>(root, '#result-banner');
    expect(banner.hasAttribute('data-state')).toBe(false);
    expect(el<HTMLElement>(root, '#banner-value').textContent).toBe('');
    expect(el<HTMLElement>(root, '#banner-label').textContent).toBe('');
    expect(el<HTMLElement>(root, '#banner-lamp').hidden).toBe(true);
  });

  it('renders invalid: the banner owns the message that used to sit under the input', () => {
    render(root, INVALID);
    expect(root.dataset.status).toBe('invalid');
    expect(el<HTMLElement>(root, '#format-rows').hidden).toBe(false);
    expect(el<HTMLElement>(root, '#banner-value').textContent).toBe('Not a valid MAC address');
    expect(el<HTMLElement>(root, '#banner-label').textContent).toBe('Invalid');
    expect(el<HTMLElement>(root, '#result-banner').dataset.state).toBe('invalid');
  });

  it('renders found: rows revealed and the banner names the vendor', () => {
    render(root, FOUND);
    expect(root.dataset.status).toBe('found');
    expect(el<HTMLElement>(root, '#format-rows').hidden).toBe(false);
    expect(el<HTMLElement>(root, '#result-banner').dataset.state).toBe('found');
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
    render(root, FOUND);
    expect(input.value).toBe('typed-by-user');
  });

  it('restores cleanly when transitioning invalid → empty', () => {
    render(root, INVALID);
    render(root, EMPTY);
    expect(root.dataset.status).toBe('empty');
    expect(el<HTMLElement>(root, '#format-rows').hidden).toBe(true);
    expect(el<HTMLElement>(root, '#result-banner').hasAttribute('data-state')).toBe(false);
    expect(el<HTMLElement>(root, '#banner-value').textContent).toBe('');
  });

  it('fills all four rows in order on found', () => {
    render(root, FOUND);
    const readouts = Array.from(root.querySelectorAll<HTMLElement>('.format-row .readout'));
    expect(readouts.map((r) => r.textContent)).toEqual([
      'AABBCCDDEEFF',
      'AA:BB:CC:DD:EE:FF',
      'AABB.CCDD.EEFF',
      'AA-BB-CC-DD-EE-FF',
    ]);
  });

  it('clears rows to an em dash on invalid (no stale value)', () => {
    render(root, FOUND);
    render(root, INVALID);
    const readouts = Array.from(root.querySelectorAll<HTMLElement>('.format-row .readout'));
    for (const r of readouts) expect(r.textContent).toBe('—');
  });

  it('clears rows to an em dash on empty (no stale value)', () => {
    render(root, FOUND);
    render(root, EMPTY);
    const readouts = Array.from(root.querySelectorAll<HTMLElement>('.format-row .readout'));
    for (const r of readouts) expect(r.textContent).toBe('—');
  });

  it('found + idle flags: four enabled "Copy" buttons with no data-copy', () => {
    render(root, FOUND);
    const btns = Array.from(root.querySelectorAll<HTMLButtonElement>('button.copy-button'));
    expect(btns).toHaveLength(4);
    for (const btn of btns) {
      expect(btn.textContent).toBe('Copy');
      expect(btn.disabled).toBe(false);
      expect(btn.hasAttribute('data-copy')).toBe(false);
    }
  });

  it('found + copied flag: only that row shows "Copied" with data-copy', () => {
    const state: PopupState = { ...FOUND, copy: { plain: 'idle', colon: 'copied', cisco: 'idle', hyphen: 'idle' } };
    render(root, state);
    const colon = el<HTMLButtonElement>(root, 'button[data-format="colon"]');
    const plain = el<HTMLButtonElement>(root, 'button[data-format="plain"]');
    const cisco = el<HTMLButtonElement>(root, 'button[data-format="cisco"]');
    const hyphen = el<HTMLButtonElement>(root, 'button[data-format="hyphen"]');
    expect(colon.textContent).toBe('Copied');
    expect(colon.dataset.copy).toBe('copied');
    for (const other of [plain, cisco, hyphen]) {
      expect(other.textContent).toBe('Copy');
      expect(other.hasAttribute('data-copy')).toBe(false);
    }
    for (const btn of [colon, plain, cisco, hyphen]) expect(btn.disabled).toBe(false);
  });

  it('found + hyphen copied flag: only the hyphen row shows "Copied"', () => {
    const state: PopupState = { ...FOUND, copy: { plain: 'idle', colon: 'idle', cisco: 'idle', hyphen: 'copied' } };
    render(root, state);
    const hyphen = el<HTMLButtonElement>(root, 'button[data-format="hyphen"]');
    expect(hyphen.textContent).toBe('Copied');
    expect(hyphen.dataset.copy).toBe('copied');
    expect(hyphen.disabled).toBe(false);
    for (const format of ['plain', 'colon', 'cisco']) {
      const btn = el<HTMLButtonElement>(root, `button[data-format="${format}"]`);
      expect(btn.textContent).toBe('Copy');
      expect(btn.hasAttribute('data-copy')).toBe(false);
    }
  });

  it('found + hyphen failed flag: label stays "Copy" and data-copy="failed"', () => {
    const state: PopupState = { ...FOUND, copy: { plain: 'idle', colon: 'idle', cisco: 'idle', hyphen: 'failed' } };
    render(root, state);
    const hyphen = el<HTMLButtonElement>(root, 'button[data-format="hyphen"]');
    expect(hyphen.textContent).toBe('Copy');
    expect(hyphen.dataset.copy).toBe('failed');
    expect(hyphen.disabled).toBe(false);
    for (const format of ['plain', 'colon', 'cisco']) {
      expect(el<HTMLButtonElement>(root, `button[data-format="${format}"]`).hasAttribute('data-copy')).toBe(false);
    }
  });

  it('found + failed flag: label stays "Copy" and data-copy="failed"', () => {
    const state: PopupState = { ...FOUND, copy: { plain: 'failed', colon: 'idle', cisco: 'idle', hyphen: 'idle' } };
    render(root, state);
    const plain = el<HTMLButtonElement>(root, 'button[data-format="plain"]');
    expect(plain.textContent).toBe('Copy');
    expect(plain.dataset.copy).toBe('failed');
    expect(plain.disabled).toBe(false);
  });

  it('invalid: all copy buttons are disabled with "Copy"', () => {
    render(root, INVALID);
    const btns = Array.from(root.querySelectorAll<HTMLButtonElement>('button.copy-button'));
    expect(btns).toHaveLength(4);
    for (const btn of btns) {
      expect(btn.textContent).toBe('Copy');
      expect(btn.disabled).toBe(true);
      expect(btn.hasAttribute('data-copy')).toBe(false);
    }
  });

  it('a copied confirmation does not survive an edit (label returns to "Copy")', () => {
    const copied: PopupState = { ...FOUND, copy: { plain: 'copied', colon: 'copied', cisco: 'copied', hyphen: 'copied' } };
    render(root, copied);
    render(root, INVALID);
    for (const btn of Array.from(root.querySelectorAll<HTMLButtonElement>('button.copy-button'))) {
      expect(btn.textContent).toBe('Copy');
    }
  });

  it('re-rendering an unchanged copied state keeps "Copied" (idempotent)', () => {
    const copied: PopupState = { ...FOUND, copy: { plain: 'idle', colon: 'copied', cisco: 'idle', hyphen: 'idle' } };
    render(root, copied);
    render(root, copied);
    expect(el<HTMLButtonElement>(root, 'button[data-format="colon"]').textContent).toBe('Copied');
    expect(el<HTMLButtonElement>(root, 'button[data-format="colon"]').dataset.copy).toBe('copied');
    expect(el<HTMLButtonElement>(root, 'button[data-format="plain"]').textContent).toBe('Copy');
    expect(el<HTMLButtonElement>(root, 'button[data-format="hyphen"]').textContent).toBe('Copy');
    expect(el<HTMLButtonElement>(root, 'button[data-format="hyphen"]').hasAttribute('data-copy')).toBe(false);
  });

  it('writes a dash for a row whose data-format is not a Formats key', () => {
    document.body.innerHTML = `
      <main id="popup">
        <div class="format-rows" id="format-rows">
          <div class="format-row" data-format="eui64"><span class="readout"></span></div>
        </div>
      </main>
    `;
    const rootEl = document.getElementById('popup') as HTMLElement;
    render(rootEl, FOUND);
    expect(rootEl.querySelector<HTMLElement>('#format-rows .readout')?.textContent).toBe('—');
  });

  it('index.html contains every id the renderer wires', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    for (const id of [
      'popup',
      'mac-input',
      'format-rows',
      'result-banner',
      'banner-lamp',
      'banner-label',
      'banner-value',
      'banner-prefix',
    ]) {
      expect(html).toContain(`id="${id}"`);
    }
  });

  it('index.html format rows match what render fills', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    const host = document.createElement('div');
    host.innerHTML = html;
    const rows = Array.from(host.querySelectorAll<HTMLElement>('.format-row'));
    expect(rows).toHaveLength(4);
    for (const row of rows) {
      expect(['plain', 'colon', 'cisco', 'hyphen']).toContain(row.dataset.format);
      expect(row.querySelector('.field-label')).not.toBeNull();
      expect(row.querySelector('.readout')).not.toBeNull();
      const btn = row.querySelector<HTMLButtonElement>('button.copy-button[data-format]');
      expect(btn).not.toBeNull();
      expect(btn?.dataset.format).toBe(row.dataset.format);
      expect(btn?.textContent).toBe('Copy');
    }
  });

  it('index.html carries the accessibility contracts (Story 1.7 + Story 2.3)', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    const host = document.createElement('div');
    host.innerHTML = html;
    const input = host.querySelector<HTMLInputElement>('#mac-input');
    expect(input).not.toBeNull();
    expect(input?.hasAttribute('autofocus')).toBe(true);
    expect(input?.getAttribute('aria-label')).toBe('MAC address');
    expect(input?.getAttribute('aria-describedby')).toBe('result-banner');
    expect(host.querySelector('#input-error')).toBeNull();

    const banner = host.querySelector<HTMLElement>('#result-banner');
    expect(banner).not.toBeNull();
    expect(banner?.getAttribute('role')).toBe('status');
    expect(banner?.getAttribute('aria-live')).toBe('polite');
    expect(banner?.hasAttribute('hidden')).toBe(false);

    const lamp = host.querySelector<HTMLElement>('#banner-lamp');
    expect(lamp?.getAttribute('aria-hidden')).toBe('true');
    expect(host.querySelector('#banner-label')).not.toBeNull();
    expect(host.querySelector('#banner-value')).not.toBeNull();
    const prefix = host.querySelector<HTMLElement>('#banner-prefix');
    expect(prefix?.getAttribute('aria-hidden')).toBe('true');

    expect(host.querySelector('[tabindex]')).toBeNull();
    const btns = Array.from(host.querySelectorAll<HTMLButtonElement>('button.copy-button[data-format]'));
    expect(btns.map((b) => b.dataset.format)).toEqual(['plain', 'colon', 'cisco', 'hyphen']);
    for (const btn of btns) {
      expect(btn.hasAttribute('aria-label')).toBe(false);
      expect(btn.hasAttribute('aria-labelledby')).toBe(false);
    }
  });

  it('app.css carries the Story 1.7 accessibility rules with real declarations', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles/app.css'), 'utf8');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('transition: none;');
    expect(css).toContain('animation: none;');
    expect(css).toContain('@media (forced-colors: active)');
    expect(css).toContain('outline: 2px solid CanvasText;');
    expect(css).toContain('.copy-button:focus-visible');
    expect(css).toContain('outline: none;');
    expect(css).toContain('box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-focus-ring) 22%, transparent);');
  });

  describe('result banner outcomes (Story 2.3)', () => {
    it('announces found as the exact label + vendor', () => {
      render(root, FOUND);
      expect(el<HTMLElement>(root, '#banner-label').textContent).toBe('Found');
      expect(el<HTMLElement>(root, '#banner-value').textContent).toBe('Apple, Inc.');
    });

    it('announces miss as the exact label + "Unknown vendor"', () => {
      render(root, MISS);
      expect(el<HTMLElement>(root, '#banner-label').textContent).toBe('Not found');
      expect(el<HTMLElement>(root, '#banner-value').textContent).toBe('Unknown vendor');
    });

    it('announces invalid as the exact label + message', () => {
      render(root, INVALID);
      expect(el<HTMLElement>(root, '#banner-label').textContent).toBe('Invalid');
      expect(el<HTMLElement>(root, '#banner-value').textContent).toBe('Not a valid MAC address');
    });

    it('renders the vendor prefix in found and the OUI in miss', () => {
      render(root, FOUND);
      expect(el<HTMLElement>(root, '#banner-prefix').textContent).toBe('AABBCC');
      render(root, MISS);
      expect(el<HTMLElement>(root, '#banner-prefix').textContent).toBe('998877');
    });

    it('announces exactly the label then the value, since the prefix is aria-hidden', () => {
      render(root, FOUND);
      const foundBanner = el<HTMLElement>(root, '#result-banner');
      expect(
        `${el(foundBanner, '#banner-label').textContent}, ${el(foundBanner, '#banner-value').textContent}`,
      ).toBe('Found, Apple, Inc.');
      render(root, MISS);
      const missBanner = el<HTMLElement>(root, '#result-banner');
      expect(
        `${el(missBanner, '#banner-label').textContent}, ${el(missBanner, '#banner-value').textContent}`,
      ).toBe('Not found, Unknown vendor');
    });

    it('leaves all four copy buttons enabled with working readouts on miss', () => {
      render(root, MISS);
      const btns = Array.from(root.querySelectorAll<HTMLButtonElement>('button.copy-button'));
      expect(btns).toHaveLength(4);
      for (const btn of btns) {
        expect(btn.disabled).toBe(false);
        expect(btn.textContent).toBe('Copy');
      }
      const readouts = Array.from(root.querySelectorAll<HTMLElement>('.format-row .readout'));
      expect(readouts.map((r) => r.textContent)).toEqual([
        '998877665544',
        '99:88:77:66:55:44',
        '9988.7766.5544',
        '99-88-77-66-55-44',
      ]);
    });

    it('shows the Copied confirmation on a miss, not only on a found', () => {
      const state: PopupState = { ...MISS, copy: { plain: 'idle', colon: 'copied', cisco: 'idle', hyphen: 'idle' } };
      render(root, state);
      const colon = el<HTMLButtonElement>(root, 'button[data-format="colon"]');
      const plain = el<HTMLButtonElement>(root, 'button[data-format="plain"]');
      expect(colon.textContent).toBe('Copied');
      expect(colon.dataset.copy).toBe('copied');
      expect(colon.disabled).toBe(false);
      expect(plain.textContent).toBe('Copy');
    });

    it('keys the banner triad on data-state for each of the three outcomes', () => {
      for (const [state, key] of [
        [FOUND, 'found'],
        [MISS, 'miss'],
        [INVALID, 'invalid'],
      ] as const) {
        render(root, state);
        expect(el<HTMLElement>(root, '#result-banner').dataset.state).toBe(key);
        expect(root.dataset.status).toBe(key);
      }
    });

    it('shows the lamp for each of the three outcomes only', () => {
      for (const state of [FOUND, MISS, INVALID]) {
        render(root, state);
        expect(el<HTMLElement>(root, '#banner-lamp').hidden).toBe(false);
      }
      render(root, EMPTY);
      expect(el<HTMLElement>(root, '#banner-lamp').hidden).toBe(true);
    });

    it('never hides the banner element itself, so the live region can always announce', () => {
      for (const state of [EMPTY, PENDING, FOUND, MISS, INVALID]) {
        render(root, state);
        expect(el<HTMLElement>(root, '#result-banner').hasAttribute('hidden')).toBe(false);
      }
    });

    it('clears the banner for a canonical whose lookup is not yet conclusive', () => {
      render(root, PENDING);
      const banner = el<HTMLElement>(root, '#result-banner');
      expect(banner.hasAttribute('data-state')).toBe(false);
      expect(el<HTMLElement>(root, '#banner-value').textContent).toBe('');
      expect(el<HTMLElement>(root, '#banner-label').textContent).toBe('');
      expect(el<HTMLElement>(root, '#banner-lamp').hidden).toBe(true);
    });

    it('clears the banner when the data becomes ready and the prefix is unknown', () => {
      render(root, PENDING);
      render(root, MISS);
      expect(el<HTMLElement>(root, '#result-banner').dataset.state).toBe('miss');
      expect(el<HTMLElement>(root, '#banner-value').textContent).toBe('Unknown vendor');
    });

    it('releases a pre-load pending MAC to found once the dataset arrives', () => {
      render(root, PENDING);
      render(root, FOUND);
      expect(el<HTMLElement>(root, '#banner-value').textContent).toBe('Apple, Inc.');
      expect(el<HTMLElement>(root, '#result-banner').dataset.state).toBe('found');
    });

    it('renders found idempotently', () => {
      render(root, FOUND);
      const first = document.body.innerHTML;
      render(root, FOUND);
      expect(document.body.innerHTML).toBe(first);
    });

    it('renders miss idempotently', () => {
      render(root, MISS);
      const first = document.body.innerHTML;
      render(root, MISS);
      expect(document.body.innerHTML).toBe(first);
    });

    it('keeps the banner cleared from found → empty with no stale vendor', () => {
      render(root, FOUND);
      render(root, EMPTY);
      expect(el<HTMLElement>(root, '#banner-value').textContent).toBe('');
      expect(el<HTMLElement>(root, '#banner-label').textContent).toBe('');
      expect(el<HTMLElement>(root, '#result-banner').hasAttribute('data-state')).toBe(false);
    });

    it('never invents a vendor when the state is internally inconsistent', () => {
      render(root, { ...FOUND, status: 'found', vendor: null });
      expect(el<HTMLElement>(root, '#banner-value').textContent).toBe('');
      expect(el<HTMLElement>(root, '#result-banner').hasAttribute('data-state')).toBe(false);
    });

    it('writes the semantic nodes even when a decorative node is missing', () => {
      document.body.innerHTML = `
        <main class="popup" id="popup">
          <div class="result-banner" id="result-banner" role="status" aria-live="polite">
            <span class="state-label" id="banner-label"></span>
            <span class="result-value" id="banner-value"></span>
          </div>
        </main>
      `;
      const rootEl = document.getElementById('popup') as HTMLElement;
      render(rootEl, FOUND);
      expect(document.getElementById('banner-label')?.textContent).toBe('Found');
      expect(document.getElementById('banner-value')?.textContent).toBe('Apple, Inc.');
      expect(document.getElementById('result-banner')?.getAttribute('data-state')).toBe('found');
    });
  });

  describe('database unavailable', () => {
    const UNAVAILABLE: PopupState = { ...MISS, vendor: null, dataStatus: 'unavailable' };

    it('shows the exact message with no triad and no lamp', () => {
      render(root, UNAVAILABLE);
      const banner = el<HTMLElement>(root, '#result-banner');
      expect(banner.dataset.state).toBe('unavailable');
      expect(el<HTMLElement>(root, '#banner-value').textContent).toBe('Database unavailable');
      expect(el<HTMLElement>(root, '#banner-label').textContent).toBe('');
      expect(el<HTMLElement>(root, '#banner-lamp').hidden).toBe(true);
    });

    it('stays quiet while the data is loading', () => {
      render(root, { ...MISS, vendor: null, dataStatus: 'loading' });
      const banner = el<HTMLElement>(root, '#result-banner');
      expect(banner.hasAttribute('data-state')).toBe(false);
      expect(el<HTMLElement>(root, '#banner-value').textContent).toBe('');
    });

    it('invalid outranks the unavailable dataset', () => {
      render(root, { ...INVALID, dataStatus: 'unavailable' });
      expect(el<HTMLElement>(root, '#result-banner').dataset.state).toBe('invalid');
      expect(el<HTMLElement>(root, '#banner-value').textContent).toBe('Not a valid MAC address');
      expect(el<HTMLElement>(root, '#format-rows').hidden).toBe(false);
    });

    it('still never writes the uncontrolled input value', () => {
      const inputEl = el<HTMLInputElement>(root, '#mac-input');
      inputEl.value = 'typed-by-user';
      render(root, UNAVAILABLE);
      expect(inputEl.value).toBe('typed-by-user');
    });

    it('clears the unavailable message once the data is ready again', () => {
      render(root, UNAVAILABLE);
      render(root, MISS);
      expect(el<HTMLElement>(root, '#banner-value').textContent).toBe('Unknown vendor');
      expect(el<HTMLElement>(root, '#result-banner').dataset.state).toBe('miss');
    });

    it('renders the unavailable state idempotently', () => {
      render(root, UNAVAILABLE);
      const first = document.body.innerHTML;
      render(root, UNAVAILABLE);
      expect(document.body.innerHTML).toBe(first);
    });
  });
});
