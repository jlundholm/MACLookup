import type { PopupState } from '../lib/types';
import { formats } from '../lib/format';

const DASH = '—';

export function render(root: HTMLElement, state: PopupState): void {
  const error = root.querySelector<HTMLElement>('#input-error');
  const rows = root.querySelector<HTMLElement>('#format-rows');

  if (error) error.hidden = state.status !== 'invalid';
  if (rows) rows.hidden = state.status === 'empty';

  const f = state.canonical ? formats(state.canonical) : null;
  for (const row of Array.from(root.querySelectorAll<HTMLElement>('.format-row'))) {
    const out = row.querySelector<HTMLElement>('.readout');
    const which = row.dataset.format as 'colon' | 'plain' | 'cisco' | undefined;
    if (!out || !which) continue;
    out.textContent = f ? f[which] : DASH;
  }

  root.dataset.status = state.status;
}
