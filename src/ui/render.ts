import type { FormatKey, Formats, PopupState } from '../lib/types';
import { formats } from '../lib/format';

const DASH = '—';
const FOUND_LABEL = 'Found';
const MISS_LABEL = 'Not found';
const INVALID_LABEL = 'Invalid';
const INVALID_MESSAGE = 'Not a valid MAC address';
const UNKNOWN_VENDOR_MESSAGE = 'Unknown vendor';
const DATABASE_UNAVAILABLE_MESSAGE = 'Database unavailable';

/* Story 2.3. Precedence is fixed: invalid outranks the dataset state, then the
   two ready-gated outcomes, then the 2.2 unavailable treatment, then rest.
   A parsed canonical whose lookup is not yet conclusive (dataStatus !== 'ready')
   claims nothing — the banner stays cleared so the live region never announces
   a false "Unknown vendor" before the dataset has answered. */
function bannerOutcome(state: PopupState): {
  state: 'found' | 'miss' | 'invalid' | 'unavailable';
  label: string;
  value: string;
  prefix: string;
  lamp: boolean;
} | null {
  if (state.status === 'invalid') {
    return { state: 'invalid', label: INVALID_LABEL, value: INVALID_MESSAGE, prefix: '', lamp: true };
  }
  if (state.dataStatus === 'ready' && state.status === 'found' && state.vendor?.ok) {
    return {
      state: 'found',
      label: FOUND_LABEL,
      value: state.vendor.vendor,
      prefix: state.vendor.prefix,
      lamp: true,
    };
  }
  if (state.dataStatus === 'ready' && state.status === 'miss' && state.canonical !== null) {
    return {
      state: 'miss',
      label: MISS_LABEL,
      value: UNKNOWN_VENDOR_MESSAGE,
      prefix: state.canonical.slice(0, 6),
      lamp: true,
    };
  }
  if (state.dataStatus === 'unavailable') {
    return { state: 'unavailable', label: '', value: DATABASE_UNAVAILABLE_MESSAGE, prefix: '', lamp: false };
  }
  return null;
}

export function render(root: HTMLElement, state: PopupState): void {
  const rows = root.querySelector<HTMLElement>('#format-rows');

  if (rows) rows.hidden = state.status === 'empty';

  const f = state.canonical ? formats(state.canonical) : null;
  const rowEls = rows ? Array.from(rows.querySelectorAll<HTMLElement>('.format-row')) : [];
  for (const row of rowEls) {
    const out = row.querySelector<HTMLElement>('.readout');
    const which = row.dataset.format as keyof Formats | undefined;
    if (!out) continue;
    out.textContent = f && which ? f[which] ?? DASH : DASH;
  }

  const copyable = state.status === 'found' || state.status === 'miss';
  const btns = rows ? Array.from(rows.querySelectorAll<HTMLButtonElement>('button[data-format]')) : [];
  for (const btn of btns) {
    const which = btn.dataset.format as FormatKey | undefined;
    const flag = (which && state.copy[which]) || 'idle';
    btn.disabled = state.status === 'invalid';
    btn.textContent = copyable && flag === 'copied' ? 'Copied' : 'Copy';
    if (flag === 'idle') btn.removeAttribute('data-copy');
    else btn.dataset.copy = flag;
  }

  const banner = root.querySelector<HTMLElement>('#result-banner');
  const outcome = bannerOutcome(state);
  if (banner) {
    if (outcome) banner.dataset.state = outcome.state;
    else banner.removeAttribute('data-state');
  }
  const lamp = root.querySelector<HTMLElement>('#banner-lamp');
  if (lamp) lamp.hidden = !outcome?.lamp;
  const label = root.querySelector<HTMLElement>('#banner-label');
  if (label) label.textContent = outcome?.label ?? '';
  const value = root.querySelector<HTMLElement>('#banner-value');
  if (value) value.textContent = outcome?.value ?? '';
  const prefix = root.querySelector<HTMLElement>('#banner-prefix');
  if (prefix) prefix.textContent = outcome?.prefix ?? '';

  root.dataset.status = state.status;
}
