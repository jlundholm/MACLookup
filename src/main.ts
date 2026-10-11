import './styles/app.css';
import { initialState, nextState } from './ui/state';
import { render } from './ui/render';

const root = document.getElementById('popup') as HTMLElement;
const input = document.getElementById('mac-input') as HTMLInputElement;

let state = initialState;
render(root, state);

input.addEventListener('input', () => {
  state = nextState(state, { type: 'input', raw: input.value });
  render(root, state);
});
