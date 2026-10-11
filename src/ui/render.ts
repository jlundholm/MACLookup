import type { FormatKey, Formats, PopupState } from '../lib/types';
import { formats } from '../lib/format';

const DASH = '—';

export function render(root: HTMLElement, state: PopupState): void {
  const error = root.querySelector<HTMLElement>('#input-error');
  const rows = root.querySelector<HTMLElement>('#format-rows');

  if (error) error.hidden = state.status !== 'invalid';
  if (rows) rows.hidden = state.status === 'empty';

  const f = state.canonical ? formats(state.canonical) : null;
  const rowEls = rows ? Array.from(rows.querySelectorAll<HTMLElement>('.format-row')) : [];
  for (const row of rowEls) {
    const out = row.querySelector<HTMLElement>('.readout');
    const which = row.dataset.format as keyof Formats | undefined;
    if (!out) continue;
    out.textContent = f && which ? f[which] ?? DASH : DASH;
  }

  const btns = rows ? Array.from(rows.querySelectorAll<HTMLButtonElement>('button[data-format]')) : [];
  for (const btn of btns) {
    const which = btn.dataset.format as FormatKey | undefined;
    const flag = (which && state.copy[which]) || 'idle';
    btn.disabled = state.status !== 'valid';
    btn.textContent = state.status === 'valid' && flag === 'copied' ? 'Copied' : 'Copy';
    if (flag === 'idle') btn.removeAttribute('data-copy');
    else btn.dataset.copy = flag;
  }

  root.dataset.status = state.status;
}
