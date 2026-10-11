---
baseline_commit: fe656580e2495f11805c0e6a2314c91a82448e06
---

# Story 1.6: Copy any format in one click, with confirmation and failure states

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Jared,
I want a one-click copy on each row with honest feedback,
So that I can paste directly into a config.

## Acceptance Criteria

1. **Exact string on the clipboard.** Given a valid MAC with rendered format rows, when I activate a row's copy control, then exactly that format string is placed on the clipboard. *(FR4)*
2. **Honest confirmation, per row.** Given a successful copy, when the write completes, then the button briefly shows "Copied" for ~1.5 s and then reverts, and the confirmation is independent per row. *(FR4, UX-DR13)*
3. **Failure never claims success.** Given the browser rejects the clipboard write, when I activate copy, then the row shows the failure state instead of the confirmation, and the UI never displays "Copied" when the write did not occur. *(FR4)*
4. **User gesture, no permission.** Given the copy control, when it is activated, then the copy occurs under a user gesture with no declared permission required. *(FR4, NFR2)*
5. **Copy-button visual states.** Given the copy button visual states, when it renders in each state, then it uses the outlined `rounded.sm` default, takes the active status color on hover, fills with the found triad on success, and applies the muted disabled style when input is invalid. *(UX-DR7, DESIGN.md components.copy-button)*

## Tasks / Subtasks

- [ ] Task 1: Copy state in types + state machine (AC: 2, 3)
  - [ ] In `src/lib/types.ts`, append (do not modify existing types):
    ```ts
    export type FormatKey = 'colon' | 'plain' | 'cisco';
    export type CopyFlag = 'idle' | 'copied' | 'failed';
    export type CopyState = { colon: CopyFlag; plain: CopyFlag; cisco: CopyFlag };
    ```
    and extend `PopupState` with the required field `copy: CopyState`.
  - [ ] In `src/ui/state.ts`: export `const COPY_CONFIRM_MS = 1500;` and `export const IDLE_COPY: CopyState = { colon: 'idle', plain: 'idle', cisco: 'idle' };`. Extend `PopupEvent` with two events (reference impl in Dev Notes): `copy-resolved` (`{ format, canonical, outcome: 'copied' | 'failed' }`) and `copy-timeout` (`{ format }`).
  - [ ] `nextState` branches: `input` clears all copy flags to `'idle'` (both valid and empty paths) in addition to existing parse logic; `copy-resolved` applies the outcome only when `state.status === 'valid'` AND `state.canonical === event.canonical` (stale-guard), otherwise returns `state` unchanged; `copy-timeout` sets that format's flag to `'idle'`.
  - [ ] Update existing `state.test.ts` literals/`toEqual` expectations to include `copy: IDLE_COPY` (mechanical — `PopupState` gains a required field). Add tests: input clears a set flag; `copy-resolved` sets only the named format; `copy-resolved` is ignored on canonical mismatch (stale write); `copy-resolved` is ignored when status is not `valid`; `copy-timeout` clears only the named format.
- [ ] Task 2: Copy-button markup + drift guard (AC: 1, 5)
  - [ ] In `index.html`, add to each `.format-row` a third child after `.readout`: `<button class="copy-button" type="button" data-format="colon">Copy</button>` (and `plain`, `cisco`), matching the row's `data-format`. Static label is "Copy" (canonical microcopy); `render` owns every label change thereafter.
  - [ ] Extend the `index.html` row drift test in `src/ui/render.test.ts`: each `.format-row` contains a `button.copy-button[data-format]` whose `data-format` equals the row's, and whose static text is exactly "Copy".
- [ ] Task 3: `render` drives the buttons (AC: 2, 3, 5)
  - [ ] In `src/ui/render.ts`, add a second loop (inside `#format-rows`, after the readout loop): for each `button[data-format]`, set `btn.disabled = state.status !== 'valid'`; set `btn.textContent` to `'Copied'` only when `status === 'valid' && flag === 'copied'`, else `'Copy'`; mirror the flag via `btn.dataset.copy` (`'copied'` / `'failed'`, remove the attribute when `'idle'`). Unknown/missing flag → treat as `'idle'` (same defensive pattern as the readout `?? DASH`). Missing button tolerated (null-guard), `render` stays idempotent and the sole DOM writer.
  - [ ] Extend `src/ui/render.test.ts` fixture with the three buttons + `copy: IDLE_COPY` on the state literals. Add tests: valid+idle → three labels "Copy", enabled, no `data-copy`; valid+`copied` flag on one row → that label "Copied" + `data-copy="copied"`, the other two stay "Copy"; valid+`failed` flag → label stays "Copy" + `data-copy="failed"`; invalid → all three disabled with "Copy"; existing idempotency test must stay green (it renders INVALID twice).
- [ ] Task 4: Delegated click handler + timers in `main.ts` (AC: 1, 3, 4)
  - [ ] In `src/main.ts` (reference impl in Dev Notes): one delegated `click` listener on `required('popup')`; `btn = (e.target as HTMLElement | null)?.closest('button[data-format]')`; bail if no button, `btn.disabled`, or `!state.canonical`. Snapshot `canonical` **before** the clipboard call; compute the value via `formats(canonical)[which]`.
  - [ ] `navigator.clipboard.writeText(value)` under the gesture: success → `copy-resolved` outcome `'copied'`; rejection (`.catch` or sync throw, e.g. clipboard missing) → outcome `'failed'`. After settling, schedule `setTimeout(..., COPY_CONFIRM_MS)` dispatching `copy-timeout` for that format. Hold per-format timer handles (`Partial<Record<FormatKey, ReturnType<typeof setTimeout>>>`) and `clearTimeout` a format's previous timer before scheduling a new one — otherwise a stale timer fires early on rapid re-clicks. State stays pure; timers live only in this wiring layer.
- [ ] Task 5: Copy-button CSS (AC: 5)
  - [ ] Extend the existing `.copy-button` typographic hook in `src/styles/app.css` (font family/size/weight/tracking already present — do not duplicate): `background: transparent`, `border: 1.5px solid var(--color-border)`, `border-radius: var(--radius-sm)`, `padding: 6px 11px`, `color: var(--color-text)`, `cursor: pointer`, `justify-self: end`, `align-self: center`.
  - [ ] State rules (all existing tokens, no new colors): `.popup[data-status='valid'] .copy-button:not(:disabled):hover` → found fg + border; `.copy-button[data-copy='copied']` → found-bg fill + found-border + found-fg; `.copy-button[data-copy='failed']` → invalid-fg border + text (the failure state, reusing the invalid triad — no new strings); `.copy-button:disabled` → text-muted at `opacity: 0.5`, `cursor: default`.
  - [ ] Change `.format-row` from `display: flex; flex-direction: column` to `display: grid; grid-template-columns: 1fr auto` (keep `row-gap: var(--space-1)`, add `column-gap: var(--space-2)`, `align-items: center`) so the label stacks over the readout in column 1 and the button sits right in column 2 — no markup nesting change, existing `.format-row .readout` queries unaffected.
- [ ] Task 6: Version bump + verify (AC: 1–5)
  - [ ] `manifest.json` `version`: `0.3.0` → `0.4.0` (minor bump per story). Do **not** bump `package.json`.
  - [ ] Gates: `npm run typecheck` (0 errors), `npm test` (all green — parse 38, state 26+N, render 12+N, format 5), `npm run build` (succeeds; `dist/manifest.json` version `0.4.0`).
  - [ ] Guardrail greps: no `chrome.`, `fetch(`, `matchMedia` in `src/` (`navigator.clipboard` is the sanctioned API); `src/lib/**` still imports nothing but types; `parse.ts`/`format.ts` untouched.
  - [ ] Manual (user): rebuild, reload unpacked `dist`; paste `aabb.ccdd.eeff`, click Copy on Cisco-dot → label "Copied" green ~1.5 s then reverts; paste in a text editor to verify `AABB.CCDD.EEFF`; click another row while Copied shows → confirmations are independent; with junk input all three buttons are disabled.

## Dev Notes

### Scope boundary (do not overreach)

This story delivers **per-row copy + confirmation + failure state**. It does not deliver accessibility wiring or vendor lookup.

- **In scope:** `src/lib/types.ts` (+`FormatKey`/`CopyFlag`/`CopyState`, `PopupState.copy`), `src/ui/state.ts` (new events + branches + constants), `src/ui/state.test.ts` (updates + new cases), `src/ui/render.ts` (button drive), `src/ui/render.test.ts` (fixture + cases), `src/main.ts` (delegated click + timers), `index.html` (buttons), `src/styles/app.css` (button styles + row grid), `manifest.json` (version).
- **Out of scope (do not touch):** `src/lib/parse.ts`/`parse.test.ts`, `src/lib/format.ts`/`format.test.ts` (frozen); ARIA/`aria-live` announcements of "Copied", focus-ring styling, Tab-order enforcement, `forced-colors` (Story 1.7 owns — native `<button>` is already keyboard-activatable, that is inherent, not this story's work); the result banner, vendor lookup, `ready`, `miss`/`found` statuses (Epic 2); no new runtime deps, no permissions, no network, no persistence.

### Critical decisions (recorded so the dev agent doesn't guess)

1. **Copy state is tri-state, not boolean.** Architecture's illustrative state shape says `copied: { colon, plain, cisco }` as boolean flags, but AC3 requires a *visible failure state* that render must drive — a boolean cannot express "failed". Decision: field `copy: CopyState` (named `copy`, not `copied`, because it now carries failure) with `CopyFlag = 'idle' | 'copied' | 'failed'`. The deviation from the illustrative shape is deliberate and documented; render remains the sole DOM writer.
2. **The failure state reuses the invalid triad and the label "Copy".** Microcopy forbids new strings and DESIGN.md defines no failure tokens. On rejection the button keeps the label **"Copy"** (it never claims "Copied") and takes the **invalid-triad outline** (`data-copy="failed"` → `--color-invalid-fg` border/text) for the same ~1.5 s, then reverts. This satisfies "shows the failure state instead of the confirmation" using only existing tokens. The green found-triad fill is reserved for real success.
3. **Stale-write guard on `copy-resolved`.** The clipboard promise resolves asynchronously; the user may have edited the field meanwhile. `nextState` applies a resolved outcome **only** when `state.canonical === event.canonical` and status is still `valid`; otherwise the event is ignored (no "Copied" flash on a value the user no longer sees). Snapshot the canonical in `main.ts` **before** calling `writeText`.
4. **Rapid-re-click timer race is handled in the wiring layer, not in state.** Two clicks on the same row inside 1.5 s would leave the first timer to clear the second confirmation early. `main.ts` keeps a per-format timer handle and `clearTimeout`s it before scheduling the next. The state machine stays pure and timer-free (`copy-timeout` is just another event).
5. **Any input event clears all copy flags.** A keystroke changes (or invalidates) the value; a lingering "Copied" on another row would be a lie about a string that may no longer be on screen. `input` resets `copy` to `IDLE_COPY`.
6. **Hover styling keys on `'valid'` only; invalid hover is dead.** Buttons are `disabled` whenever status is not `valid`, so a `[data-status='invalid'] .copy-button:hover` rule could never visibly apply — the same class of silent-dead-CSS bug that the 1.5 review caught on the `'found'` rail. Only write the valid-hover rule; `:not(:disabled)` keeps hover off disabled buttons.
7. **`render` mirrors the flag via `data-copy`, and label/text ownership is absolute.** `render` sets `btn.textContent` on every pass ("Copied" only when `valid && copied`, otherwise "Copy") — no other code touches button labels, so idempotency holds and stale confirmations are structurally impossible. CSS keys state colors off `[data-copy]`, never off class names (standing theming rule).
8. **Grid, not nesting, for the row.** `.format-row` becomes `display: grid; grid-template-columns: 1fr auto` with label+readout in column 1 and the button in column 2. This preserves the 1.5 markup shape (button is a third child), so existing `.format-row .readout` queries, the readout loop, and the drift test structure all survive unchanged.
9. **`COPY_CONFIRM_MS = 1500` lives in `state.ts`** (exported constant, no behavior of its own there); `main.ts` imports it for the timer. PRD states ~1.5 s; the constant makes the value testable and single-sourced.
10. **Version bump only in `manifest.json`** (`0.3.0` → `0.4.0`), per project-context.md.

### Reference implementations (use these shapes)

```ts
// src/lib/types.ts — append; extend PopupState with `copy: CopyState`
export type FormatKey = 'colon' | 'plain' | 'cisco';
export type CopyFlag = 'idle' | 'copied' | 'failed';
export type CopyState = { colon: CopyFlag; plain: CopyFlag; cisco: CopyFlag };
```

```ts
// src/ui/state.ts — extend
export const COPY_CONFIRM_MS = 1500;
export const IDLE_COPY: CopyState = { colon: 'idle', plain: 'idle', cisco: 'idle' };

export type PopupEvent =
  | { type: 'input'; raw: string }
  | { type: 'copy-resolved'; format: FormatKey; canonical: string; outcome: 'copied' | 'failed' }
  | { type: 'copy-timeout'; format: FormatKey };

export function nextState(state: PopupState, event: PopupEvent): PopupState {
  switch (event.type) {
    case 'input': {
      const { raw } = event;
      if (raw === '') {
        return { ...state, raw, status: 'empty', canonical: null, copy: IDLE_COPY };
      }
      const parsed = parseMac(raw);
      const status: MacStatus = parsed.ok ? 'valid' : 'invalid';
      return { ...state, raw, status, canonical: parsed.ok ? parsed.canonical : null, copy: IDLE_COPY };
    }
    case 'copy-resolved': {
      if (state.status !== 'valid' || state.canonical !== event.canonical) return state;
      return { ...state, copy: { ...state.copy, [event.format]: event.outcome } };
    }
    case 'copy-timeout':
      return { ...state, copy: { ...state.copy, [event.format]: 'idle' } };
  }
}
```

```ts
// src/ui/render.ts — add after the readout loop (keep everything else)
const btns = rows ? Array.from(rows.querySelectorAll<HTMLButtonElement>('button[data-format]')) : [];
for (const btn of btns) {
  const which = btn.dataset.format as FormatKey | undefined;
  const flag = (which && state.copy[which]) || 'idle';
  btn.disabled = state.status !== 'valid';
  btn.textContent = state.status === 'valid' && flag === 'copied' ? 'Copied' : 'Copy';
  if (flag === 'idle') btn.removeAttribute('data-copy');
  else btn.dataset.copy = flag;
}
```

```ts
// src/main.ts — add (keep required(), input listener, initial render)
import { COPY_CONFIRM_MS, initialState, nextState } from './ui/state';
import { formats } from './lib/format';
import type { FormatKey } from './lib/types';

const copyTimers: Partial<Record<FormatKey, ReturnType<typeof setTimeout>>> = {};

root.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement | null)?.closest<HTMLButtonElement>('button[data-format]');
  if (!btn || btn.disabled) return;
  const which = btn.dataset.format as FormatKey | undefined;
  if (!which || !state.canonical) return;
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
```

(`navigator.clipboard.writeText` under the click gesture needs **no** manifest permission [architecture: Privacy-by-construction]. The `try/catch` covers a synchronous throw — e.g. clipboard API absent — and maps it to the same honest failure path as a rejected promise. Never claim "Copied" on either path.)

```css
/* src/styles/app.css — extend the existing .copy-button hook (font lines already present) */
.copy-button {
  /* existing: font-family/size/weight/tracking — keep */
  background: transparent;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 6px 11px;
  color: var(--color-text);
  cursor: pointer;
  justify-self: end;
  align-self: center;
}

.popup[data-status='valid'] .copy-button:not(:disabled):hover {
  color: var(--color-found-fg);
  border-color: var(--color-found-fg);
}

.copy-button[data-copy='copied'] {
  background: var(--color-found-bg);
  border-color: var(--color-found-border);
  color: var(--color-found-fg);
}

.copy-button[data-copy='failed'] {
  border-color: var(--color-invalid-fg);
  color: var(--color-invalid-fg);
}

.copy-button:disabled {
  color: var(--color-text-muted);
  opacity: 0.5;
  cursor: default;
}
```

### Behavior table (drive `render.test.ts` from this)

| status | copy flags | per-row label | `data-copy` | disabled | rows container |
|---|---|---|---|---|---|
| `empty` | all `idle` | `Copy` | absent | true | hidden |
| `invalid` | all `idle` | `Copy` | absent | true | visible (inert) |
| `valid` | all `idle` | `Copy` | absent | false | visible |
| `valid` | `colon: 'copied'` | `Copied` / `Copy` / `Copy` | `copied` / absent / absent | false | visible |
| `valid` | `plain: 'failed'` | `Copy` / `Copy` / `Copy` | absent / `failed` / absent | false | visible |

State transitions: `copy-resolved` on `colon` while `valid` → only `colon` flips; a subsequent `input` event clears all flags; `copy-timeout` flips only the named format back to `idle`; `copy-resolved` with a changed canonical → state returned unchanged.

### Testing requirements

- `state.test.ts` — update every `toEqual` literal to include `copy: IDLE_COPY` (import it) — mechanical, existing 26 cases must stay green. New cases as listed in Task 1. Node env (no pragma).
- `render.test.ts` — keep the happy-dom pragma; fixture gains the three buttons and the state literals gain `copy`. Assert `textContent`, `disabled`, and `data-copy` presence — never computed styles. New cases as listed in Task 3; the idempotency test (INVALID twice) must stay green with the new fixture.
- The clipboard promise/timer flow in `main.ts` is **not** unit-tested (matches the 1.3–1.5 convention: `main.ts` wiring is verified by the manual GUI pass; logic lives in the pure `nextState` and the `render` tests). Every new state/render test must be able to fail — no vacuous assertions.
- `tsconfig` has no `DOM.Iterable` — `Array.from(...)` over `querySelectorAll`, never `for...of` on the NodeList. `closest<T>()` is in `lib.dom`, fine.
- Gates for every change: `npm run typecheck` + `npm test` + `npm run build`.

### Previous story intelligence

- **Story 1.5 (formats + rows, done, reviewed):** `Formats` type + pure `formats(canonical)` in `src/lib/format.ts`. `render.ts` (post-review): imports `Formats`, `const f = state.canonical ? formats(state.canonical) : null`, readout loop scoped to the `rows` container via `Array.from(rows.querySelectorAll('.format-row'))`, `out.textContent = f && which ? f[which] ?? DASH : DASH`. `dataset.status` set **last**. Keep all of this; add the button loop beside it.
- **Review learnings from 1.5 that apply here:** (a) **dead CSS is a reviewer magnet** — the 1.5 review killed a `[data-status='found']` rail rule and a `.readout:empty` rule that could never match; here that means no invalid-hover rule (buttons are always disabled when invalid) and no `data-copy` values outside the tri-state. (b) The row loop was re-scoped from `root` to the `rows` container — do the same for the button loop. (c) Tests must assert literal values (`toEqual` with exact strings), never re-derive expectations from the implementation. (d) The index.html drift test now asserts per-row markup (`.field-label`, `.readout`, `data-format`); extend it for the buttons rather than adding a second drift test.
- **Story 1.4 (state machine):** `nextState` is pure, spread-based; `PopupState` literals appear in `state.test.ts` `toEqual` assertions and in `render.test.ts` fixtures (`EMPTY`/`INVALID`/`VALID` consts) — adding the required `copy` field touches both files mechanically. `main.ts` uses `required<T>()` guards; do not rename `#popup`/`#mac-input`.
- **`src/styles/app.css`:** the `.copy-button` hook already exists (1.2) with `font-family: var(--font-sans)` + `--type-button-size/weight/tracking` — **extend it, do not duplicate the font lines**. All tokens needed exist: `--radius-sm`, `--color-found-bg/border/fg`, `--color-invalid-fg`, `--color-text-muted`, `--space-1/2`. The `.format-row` rule (flex-column, 4px rail, status-rail keying) must keep its rail colors and border-left; only the layout axis changes (flex → grid).
- **Toolchain:** vite@8.3.4, @crxjs/vite-plugin@3.0.0, typescript@~6.0.2 (strict + `verbatimModuleSyntax` + `noUnusedLocals/Parameters` + `erasableSyntaxOnly`), vitest@4.1.11, happy-dom@20.14.6, Node v22.22.1. `verbatimModuleSyntax` → type-only imports must use `import type`.
- **Build/verify caveat:** `npm run dev` rewrites `dist`; verify with `npm run build` and reload the unpacked `dist` in `chrome://extensions`.

### Project Structure Notes

- `FormatKey`/`CopyFlag`/`CopyState` live in `src/lib/types.ts` (all shared shapes are there); the `COPY_CONFIRM_MS`/`IDLE_COPY` values live in `src/ui/state.ts` (behavior constants beside the machine). No new files except none — this story extends existing modules only.
- Naming: `copy` (state field), `CopyFlag`/`CopyState`/`FormatKey` (types), `copy-resolved`/`copy-timeout` (event tags, kebab-case like `input`), `.copy-button`/`data-copy` (CSS/DOM hooks, matching DESIGN.md component name `copy-button`). Label text "Copy"/"Copied" is microcopy, not identifiers.
- The delegated click handler lives in `src/main.ts` (the wiring layer), keyed by `data-format` per architecture's Communication Patterns — not a per-button listener, not in `render`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.6] — the five ACs (copy, confirmation, failure, gesture/no-permission, visual states).
- [Source: _bmad-output/planning-artifacts/prds/prd-Mac Lookup-2026-10-10/prd.md#FR-4] — one-click copy, ~1.5 s confirmation, failure never claims Copied, no permission under user gesture.
- [Source: _bmad-output/planning-artifacts/architecture.md#Privacy-by-construction] — `navigator.clipboard.writeText()` in a click handler, no permission.
- [Source: _bmad-output/planning-artifacts/architecture.md#Communication Patterns] — one delegated click handler keyed by `data-format`; pure `nextState`; `COPY_CONFIRM_MS` timers.
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns] — clipboard rejection caught → failure state; state example shape (`copied` flags — see Critical decision 1 for the tri-state extension).
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-Mac Lookup-2026-10-10/DESIGN.md#components.copy-button] — outlined `rounded.sm`, per-token borders/padding, hover per status, found-triad copied fill, muted disabled at 0.5.
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-Mac Lookup-2026-10-10/EXPERIENCE.md#State Patterns] — Copy confirmation ("Copied" ~1.5 s, independent per row); Clipboard rejected (failure state, never "Copied"); Invalid input (disabled copy).
- [Source: _bmad-output/implementation-artifacts/1-5-display-the-three-working-formats.md] — previous story intelligence, review learnings (dead CSS, scoped loops, literal test assertions, drift guards), toolchain.

## Dev Agent Record

### Agent Model Used

opencode / mimo-v2.6-flash-free

### Debug Log References

### Completion Notes List

### Change Log

### File List
