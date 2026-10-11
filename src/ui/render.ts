import type { PopupState } from '../lib/types';

export function render(root: HTMLElement, state: PopupState): void {
  root.dataset.status = state.status;

  const error = root.querySelector<HTMLElement>('#input-error');
  const rows = root.querySelector<HTMLElement>('#format-rows');
  if (!error || !rows) return;

  error.hidden = state.status !== 'invalid';
  rows.hidden = state.status === 'empty';
}
