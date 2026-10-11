import './styles/app.css';
import { initialState, nextState } from './ui/state';
import { render } from './ui/render';

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
