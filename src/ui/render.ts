import type { Formats, PopupState } from '../lib/types';
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

  root.dataset.status = state.status;
}
