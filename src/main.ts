import './styles/app.css';
import { COPY_CONFIRM_MS, initialState, nextState } from './ui/state';
import { render } from './ui/render';
import { formats } from './lib/format';
import type { FormatKey } from './lib/types';

function required<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`OUI Scout: missing required element #${id}`);
  return el as T;
}

const root = required<HTMLElement>('popup');
const input = required<HTMLInputElement>('mac-input');

let state = initialState;
render(root, state);

input.addEventListener('input', () => {
  state = nextState(state, { type: 'input', raw: input.value });
  render(root, state);
});

const copyTimers: Partial<Record<FormatKey, ReturnType<typeof setTimeout>>> = {};

root.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement | null)?.closest<HTMLButtonElement>('button[data-format]');
  if (!btn || btn.disabled) return;
  const which = btn.dataset.format as FormatKey | undefined;
  if (!which || !Object.hasOwn(state.copy, which) || !state.canonical) return;
  const canonical = state.canonical;
  const value = formats(canonical)[which];
  const settle = (outcome: 'copied' | 'failed') => {
    state = nextState(state, { type: 'copy-resolved', format: which, canonical, outcome });
    render(root, state);
    const prev = copyTimers[which];
    if (prev) clearTimeout(prev);
    copyTimers[which] = setTimeout(() => {
      state = nextState(state, { type: 'copy-timeout', format: which });
      render(root, state);
    }, COPY_CONFIRM_MS);
  };
  try {
    void navigator.clipboard.writeText(value).then(() => settle('copied'), () => settle('failed'));
  } catch {
    settle('failed');
  }
});
