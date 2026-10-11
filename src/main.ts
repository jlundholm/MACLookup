import './styles/app.css';
import { COPY_CONFIRM_MS, initialState, nextState, type PopupEvent } from './ui/state';
import { render } from './ui/render';
import { formats } from './lib/format';
import { loadOuiIndex } from './data/load-oui-data';
import type { OuiIndex } from './lib/lookup';
import type { FormatKey } from './lib/types';

function required<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`OUI Scout: missing required element #${id}`);
  return el as T;
}

const root = required<HTMLElement>('popup');
const input = required<HTMLInputElement>('mac-input');

let state = initialState;
let index: OuiIndex | null = null;

function dispatch(event: PopupEvent): void {
  state = nextState(state, event, index);
  render(root, state);
}

render(root, state);

input.addEventListener('input', () => {
  dispatch({ type: 'input', raw: input.value });
});

async function loadDataset(): Promise<void> {
  try {
    index = await loadOuiIndex();
    dispatch({ type: 'dataset-ready' });
  } catch {
    dispatch({ type: 'dataset-unavailable' });
  }
}

void loadDataset();

const copyTimers: Partial<Record<FormatKey, ReturnType<typeof setTimeout>>> = {};

root.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement | null)?.closest<HTMLButtonElement>('button[data-format]');
  if (!btn || btn.disabled) return;
  const which = btn.dataset.format as FormatKey | undefined;
  if (!which || !Object.hasOwn(state.copy, which) || !state.canonical) return;
  const canonical = state.canonical;
  const value = formats(canonical)[which];
  const settle = (outcome: 'copied' | 'failed') => {
    dispatch({ type: 'copy-resolved', format: which, canonical, outcome });
    const prev = copyTimers[which];
    if (prev) clearTimeout(prev);
    copyTimers[which] = setTimeout(() => {
      dispatch({ type: 'copy-timeout', format: which });
    }, COPY_CONFIRM_MS);
  };
  try {
    void navigator.clipboard.writeText(value).then(() => settle('copied'), () => settle('failed'));
  } catch {
    settle('failed');
  }
});
