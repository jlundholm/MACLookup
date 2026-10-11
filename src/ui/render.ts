import type { PopupState } from '../lib/types';

export function render(root: HTMLElement, state: PopupState): void {
  const error = root.querySelector<HTMLElement>('#input-error');
  const rows = root.querySelector<HTMLElement>('#format-rows');

  if (error) error.hidden = state.status !== 'invalid';
  if (rows) rows.hidden = state.status === 'empty';

  root.dataset.status = state.status;
}
