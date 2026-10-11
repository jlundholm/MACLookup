---
baseline_commit: 53bf7a53d21c588be66e0326f553f2581f472c72
---

# Story 1.4: Reject invalid input clearly

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Jared,
I want a clear inline error and no results when my paste isn't a MAC,
so that I'm told, not misled.

## Acceptance Criteria

1. **Empty resting state.** Given the field is empty, when the popup renders, then `data-status="empty"` is set on the popup root, the placeholder "Paste a MAC address" is shown, and there is **no result banner, no format rows, and no error message** — a neutral resting state. *(FR2, UX-DR13)*
2. **Inline invalid message.** Given a non-empty field, when the input does not reduce to exactly 12 hex digits after ASCII separator/whitespace stripping (`parseMac` returns `{ ok: false, reason: 'invalid' }`), then the short inline message **"Not a valid MAC address"** is shown directly under the field. A field containing only whitespace is non-empty and therefore invalid, not resting. *(FR2, UX-DR15)*
3. **Invalid styling, no stale results.** Given invalid input, when the state renders, then `data-status="invalid"` is set on the popup root, the field **border and text** use the invalid red triad (`--color-invalid-fg`), and no stale or partial result remains — format rows carry no values. The result banner stays hidden (Story 2.3 owns the banner). *(FR2, DESIGN.md colors + components.mac-input)*
4. **Immediate correction, no reload.** Given invalid input, when the field is corrected to a valid MAC (or cleared to empty), then the state re-evaluates on every `input` event and the error clears/restores immediately with no reload and no second action. *(FR2, UX-DR13/DR14)*
5. **State + pure render + co-located tests.** Given the implementation, when inspected, then `src/lib/types.ts` exports `MacStatus` and `PopupState`; `src/ui/state.ts` exports a pure `nextState(state, event)` that returns a **new** object (never mutates); `src/ui/render.ts` is the sole DOM writer (idempotent; sets `root.dataset.status`); `src/main.ts` wires a single `input` listener (no submit, no other trigger); and co-located `*.test.ts` files cover both the transitions and the DOM writes. *(architecture: State Management / Frontend / Enforcement)*

## Tasks / Subtasks

- [ ] **Task 1: Extend the shared types** (AC: 5)
  - [ ] In `src/lib/types.ts`, append (do not modify `ParseResult`):
    ```ts
    export type MacStatus = 'empty' | 'valid' | 'invalid';

    export type PopupState = {
      raw: string;
      status: MacStatus;
      canonical: string | null;
    };
    ```
  - [ ] `types.ts` still imports nothing. No `copied` / `vendor` / `prefix` / `ready` fields yet — those arrive with Stories 1.6 / 2.2 / 2.3 (see Dev Notes → status-union decision).
- [ ] **Task 2: Pure state transitions + tests** (AC: 4, 5)
  - [ ] Create `src/ui/state.ts` exporting `initialState`, `PopupEvent = { type: 'input'; raw: string }`, and `nextState(state, event)` per the reference implementation in Dev Notes.
  - [ ] Derivation is total: `raw === ''` → `'empty'`; otherwise `parseMac(raw)` decides `'valid'` (store `canonical`) or `'invalid'` (store `canonical: null` — this is what wipes stale results).
  - [ ] Import `{ parseMac }` from `'../lib/parse'` and types from `'../lib/types'`. Pure: no DOM, no `chrome.*`, no timers, no `throw`.
  - [ ] Create `src/ui/state.test.ts` (node env — no pragma needed): initial state; empty; every valid form → `'valid'` + uppercase canonical; invalid matrix samples (11/13 hex, non-hex, two-MAC paste, NBSP, whitespace-only) → `'invalid'` + `canonical: null`; valid→invalid transition clears `canonical`; return value is a **new object** and the input state is not mutated.
- [ ] **Task 3: Add the inline error element** (AC: 1, 2)
  - [ ] In `index.html`, insert between the `<input id="mac-input">` and `#result-banner`:
    ```html
    <p class="input-error" id="input-error" hidden>Not a valid MAC address</p>
    ```
  - [ ] Add the `hidden` attribute to `<div class="format-rows" id="format-rows">` (mirrors the Story 1.1 banner convention: HTML initial state matches the initial render).
  - [ ] Do **not** add `autofocus` (Story 1.7), do **not** add ARIA/live-region attributes (Story 1.7), do **not** touch `#result-banner` (Story 2.3).
- [ ] **Task 4: Pure render + happy-dom tests** (AC: 1–4)
  - [ ] Create `src/ui/render.ts` exporting `render(root: HTMLElement, state: PopupState): void` per the reference implementation: set `root.dataset.status`; unhide `#input-error` iff `status === 'invalid'`; unhide `#format-rows` iff `status !== 'empty'`; touch nothing else (banner stays hidden; the input value is never written).
  - [ ] `npm install -D happy-dom` (adds a devDependency only; project `.npmrc` already pins `legacy-peer-deps`).
  - [ ] Create `src/ui/render.test.ts` starting with the pragma line `// @vitest-environment happy-dom`, then a minimal DOM fixture mirroring `index.html` (popup root, input, error `<p hidden>`, banner `<div hidden>`, format-rows `<div hidden>` with three empty `.format-row` children).
  - [ ] Cover: empty → `data-status="empty"`, error hidden, rows hidden, banner still hidden; invalid → `data-status="invalid"`, error visible with the exact string "Not a valid MAC address", rows visible, banner hidden; valid → `data-status="valid"`, error hidden, rows visible; idempotency (render twice → identical DOM); render never writes `input.value` (set a value, render a differing state, assert the value is unchanged — the input is uncontrolled).
- [ ] **Task 5: Wire the popup** (AC: 4, 5)
  - [ ] Rewrite `src/main.ts` per the reference implementation: keep `import './styles/app.css';`, add the state/render imports, grab `#popup` and `#mac-input`, render the initial state once, and attach a single `input` listener that does `state = nextState(state, { type: 'input', raw: input.value }); render(root, state);`.
  - [ ] No other listeners (no `change`, no `keydown`, no `matchMedia`, no clipboard).
- [ ] **Task 6: Invalid-state CSS** (AC: 1, 2, 3)
  - [ ] In `src/styles/app.css`, append the two rules from Dev Notes: `.popup[data-status='invalid'] .mac-input { border-color: var(--color-invalid-fg); color: var(--color-invalid-fg); }` and `.input-error { margin: 0; color: var(--color-invalid-fg); }` (body typography inherited — DESIGN.md defines no inline-error role; do not invent one).
  - [ ] State colors are driven **only** by the `data-status` attribute — no status-specific class names (architecture Naming Patterns).
- [ ] **Task 7: Version bump** (standing guardrail)
  - [ ] `manifest.json` `version`: `0.1.0` → `0.2.0` (minor bump per story, project-context rule). Do **not** bump `package.json`.
- [ ] **Task 8: Verify** (AC: 1–5)
  - [ ] `npm test` → all suites green (existing 38 `parse.test.ts` cases + new state/render suites).
  - [ ] `npm run typecheck` → 0 errors (new `src/ui/**` files are under `tsconfig.include: ["src", …]`).
  - [ ] `npm run build` → succeeds; `dist/` still emits the MV3 manifest with version `0.2.0`.
  - [ ] Guardrail greps: no `matchMedia`, no `chrome.`, no `fetch`, no new user-facing strings beyond the one HTML error line; `src/lib/parse.ts` untouched.
  - [ ] Manually: `npm run build`, reload the unpacked `dist` in Chrome; cold open shows placeholder only; paste `hello` → red field border + "Not a valid MAC address", no banner/rows content; paste `aa:bb:cc:dd:ee:ff` → error disappears instantly; clear the field → back to resting. (Manual GUI check is a user-performed confirmation, per the Story 1.1–1.3 convention.)

## Dev Notes

### Scope boundary (do not overreach)

This story delivers **invalid-input handling + the first state/render/wiring layer**. It does **not** deliver results.

- **In scope:** `src/lib/types.ts` (+`MacStatus`, `PopupState`), `src/ui/state.ts` + `state.test.ts` (new), `src/ui/render.ts` + `render.test.ts` (new), `index.html` (+error element, `hidden` on format-rows), `src/styles/app.css` (+invalid rules, `.input-error`), `src/main.ts` (wiring), `package.json`/`package-lock.json` (happy-dom devDep), `manifest.json` (version).
- **Out of scope (do not touch):** `src/lib/parse.ts`/`parse.test.ts` (done in 1.3); the three format values and `src/lib/format.ts` (Story 1.5); copy buttons/clipboard/`copied` state (1.6); autofocus, ARIA/live regions, `forced-colors`, reduced-motion (1.7); the privacy guard suite (1.8); the result banner contents, vendor lookup, found/miss, `ready` (Epic 2). No new runtime dependencies, no network, no persistence, no telemetry, no permissions.

### Critical decisions (recorded so the dev agent doesn't guess)

1. **Interim status union `'empty' | 'valid' | 'invalid'`.** Architecture pins the final union as `'empty' | 'found' | 'miss' | 'invalid'`, but `found`/`miss` are vendor outcomes that cannot exist before Epic 2's lookup. `'valid'` is the honest Epic-1 stand-in for "parsed OK, vendor not implemented"; Story 2.3 replaces it with `found`/`miss` (same story that folds the inline error into the banner). Do **not** emit `'found'` for a valid parse, and do **not** declare unused `'found'`/`'miss'` members now (dead code — reviewers punish that).
2. **Whitespace-only input is invalid, not resting.** Only the exactly-empty string `''` is the neutral resting state (FR2's literal "empty field"). `"   "` is non-empty and fails `parseMac` → error shows. This matches the pinned parser tests (`parse.test.ts` already asserts `'   '` → invalid) and avoids inventing a third "spaces but no error" state.
3. **The input is uncontrolled.** `render` never assigns `input.value` — assigning on every keystroke moves the caret to the end and breaks mid-string edits. `main.ts` reads `input.value`; `state.raw` merely mirrors it. `index.html` already uppercases visually via CSS (`text-transform`), so the value never needs rewriting.
4. **Invalid beats focus on border color.** `.popup[data-status='invalid'] .mac-input` (specificity 0,3,0) must outrank the existing `.mac-input:focus-visible` (0,2,0) so the red border survives while you type — which is exactly when invalid is true. The neutral focus halo (`box-shadow` from the 1.3 rule) still renders, so focus stays visible and never borrows a status color.
5. **`data-status` on the popup root is the single source of visual truth.** `render` sets it on every call; CSS derives colors/visibility from it; no `is-invalid` class names. `#input-error` and `#format-rows` visibility are toggled via the `hidden` **attribute** in `render` (matching how Story 1.1 shipped the banner) — do not also add a CSS `display` rule on `.input-error`, or it will beat the UA's `[hidden] { display: none }` and the "hidden" error will show.
6. **Rows hidden iff status is `'empty'`.** Cold open must show "no rows" (AC1). On `'invalid'` the container is present but empty — no stale values — which also matches the final EXPERIENCE design (invalid rows stay visible with `—` values once Story 1.5 builds them).
7. **The banner stays `hidden` and untouched by `render`.** AC1 forbids a banner at rest; Story 2.3 builds all three banner states and supersedes the standalone inline error (readiness report §UX: "banner invalid state supersedes the standalone inline error from Story 1.4"). Story 2.3 will then remove `#input-error` + its CSS.
8. **No ARIA this story.** `role`/`aria-live`/announcement wiring is Story 1.7's floor (it also owns the `hidden`-on-`aria-live` defer from Story 1.1's review). The error element ships as a plain `<p>`.
9. **DOM tests use a per-file pragma, not a config change.** `vitest.config.ts` stays `environment: 'node'`; `render.test.ts` starts with `// @vitest-environment happy-dom`. This resolves the Story 1.3 review defer without touching the config other suites rely on. `vitest.config.ts` needs **no edit** (its `include` already covers `src/**` and `tests/**`).
10. **Version bump only in `manifest.json`** (`0.1.0` → `0.2.0`), per project-context.md. `package.json` is a private npm version and is never bumped.

### Reference implementations (use these shapes)

```ts
// src/ui/state.ts
import type { MacStatus, PopupState } from '../lib/types';
import { parseMac } from '../lib/parse';

export const initialState: PopupState = { raw: '', status: 'empty', canonical: null };

export type PopupEvent = { type: 'input'; raw: string };

export function nextState(state: PopupState, event: PopupEvent): PopupState {
  const { raw } = event;
  if (raw === '') {
    return { ...state, raw, status: 'empty', canonical: null };
  }
  const parsed = parseMac(raw);
  const status: MacStatus = parsed.ok ? 'valid' : 'invalid';
  return { ...state, raw, status, canonical: parsed.ok ? parsed.canonical : null };
}
```

(`{ ...state, … }` is required, not stylistic: `tsconfig` has `noUnusedParameters`, and the spread is how `state` is genuinely used today and how later fields (`copied`, `vendor`, …) survive transitions.)

```ts
// src/ui/render.ts
import type { PopupState } from '../lib/types';

export function render(root: HTMLElement, state: PopupState): void {
  root.dataset.status = state.status;

  const error = root.querySelector<HTMLElement>('#input-error');
  const rows = root.querySelector<HTMLElement>('#format-rows');
  if (!error || !rows) return;

  error.hidden = state.status !== 'invalid';
  rows.hidden = state.status === 'empty';
}
```

```ts
// src/main.ts
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
```

```css
/* src/styles/app.css — append */
.popup[data-status='invalid'] .mac-input {
  border-color: var(--color-invalid-fg);
  color: var(--color-invalid-fg);
}

.input-error {
  margin: 0;
  color: var(--color-invalid-fg);
}
```

### Behavior table (drive `state.test.ts` from this)

| `raw` | `status` | `canonical` | error | rows hidden |
|---|---|---|---|---|
| `''` | `empty` | `null` | hidden | yes |
| `'   '` (spaces only) | `invalid` | `null` | visible | no |
| `'aa:bb:cc:dd:ee:ff'` / `'AA-BB-CC-DD-EE-FF'` / `'aabb.ccdd.eeff'` / `'AA BB CC DD EE FF'` / `'AABBCCDDEEFF'` | `valid` | `AABBCCDDEEFF` | hidden | no |
| `'AABBCCDDEEF'` (11 hex) / `'GGGGGGGGGGGG'` / two MACs / NBSP-separated / trailing comma | `invalid` | `null` | visible | no |

In every non-`valid` row `canonical` is `null` — that nulling is the mechanism that guarantees "no stale result" (AC3) once Story 1.5 starts writing values into the rows. `#result-banner` is `hidden` in every row.

### Testing requirements

- `src/ui/state.test.ts` — node env (default). Table-driven (`it.each`) over the behavior table plus transition/purity cases. Assert exact shapes (`toEqual`), not partials.
- `src/ui/render.test.ts` — **first line** `// @vitest-environment happy-dom`. Build the fixture with `document.body.innerHTML` inside a `beforeEach`; query `#popup` as the root. Assert attributes (`hidden`, `dataset.status`), not computed styles. No CSS assertions (CSS is verified manually — Vitest does not compute author stylesheets).
- Existing `src/lib/parse.test.ts` (38 cases) must stay green and unchanged.
- Gates for every change: `npm run typecheck` + `npm test` + `npm run build`.

### Previous story intelligence

- **Story 1.3 (parse + Vitest, done):** `parseMac` is ready and pinned — ASCII strip `[\t\n\v\f\r :.-]`, validate-before-uppercase, returns `ParseResult`. Never copy architecture.md's illustrative `\s` snippet. `src/lib/types.ts` currently holds only `ParseResult`; it is the one file later stories extend.
- **Review learnings from 1.3 that apply here:** reviewers punish unfalsifiable tests (e.g., testing string immutability) and dead code — every new test must be able to fail, and no speculative fields/types. The Vitest include was patched to cover `src/**` **and** `tests/**`; the global `environment: 'node'` was deliberately kept — this story's `render.test.ts` is the deferred DOM test that must use the per-file happy-dom pragma.
- **Toolchain (verified):** vite@8.3.4, @crxjs/vite-plugin@3.0.0, typescript@~6.0.2 (strict + `verbatimModuleSyntax` + `noUnusedLocals/Parameters` + `erasableSyntaxOnly`), vitest@4.1.11, Node v22.22.1, npm 9.2.0. `.npmrc` pins `legacy-peer-deps=true` — a plain `npm install -D happy-dom` works.
- **`src/styles/app.css` (1.2 + 1.3):** every invalid token already exists (`--color-invalid-bg/border/fg`, light + dark). `.mac-input` already has the neutral `:focus-visible` ring — do not restyle it, only add the higher-specificity invalid override.
- **`index.html` (1.1):** ids `#popup`, `#mac-input`, `#result-banner` (`role="status" aria-live="polite" hidden`), `#format-rows` with three `.format-row[data-format]` children. Do not rename anything.
- **`src/main.ts`:** currently one line (`import './styles/app.css';`) — this story is its first real wiring.
- **Build/verify caveat:** `npm run dev` rewrites `dist/index.html` into a dev bootstrap; verify with `npm run build` and reload the unpacked `dist` in `chrome://extensions`.
- **Defers other stories own (don't fix here):** forced-colors focus (1.7), live-region `hidden` suppression (1.7), typographic layout guards `.readout`/`.field-label`/… (1.5), long-text overflow (1.5/Epic 2).

### Git intelligence

- Recent commits: `53bf7a5` "Update manifest.json" (manual `0.0.1 → 0.1.0` bump), `e06035d` "Create project-context.md", `f2bc902` "Story 1-3 review", `a2ee222` "Story 1-3 dev", `6405c86` "Story 1-3 creation". Pattern: story creation → dev → review commits, with review patches landing in the story file and `deferred-work.md`.
- Nothing in the repo contradicts this story's plan; `src/ui/` does not exist yet and is created here exactly as architecture.md's tree specifies.

### Latest technical information

- **happy-dom@20.14.6** (current stable; `engines: node >=20`) is Vitest 4.1's supported DOM environment (`peerDependencies` list `happy-dom: '*'`). Install as a devDependency only; runtime bundle is unaffected (Vite never includes it).
- No other new libraries. No runtime dependency is added by this story.

### Project Structure Notes

- New `src/ui/` layer per architecture.md: pure transitions (`state.ts`) + sole DOM writer (`render.ts`), depending only on `src/lib/`. `src/lib/**` gains no behavior this story (types only) and stays pure. `main.ts` becomes the orchestrator — the only module allowed to depend on all layers.
- Naming: kebab-case files, camelCase functions/vars, PascalCase types; co-located `*.test.ts`; **no barrel/index files** (import exact paths `'../lib/types'`, `'./state'`).
- Approved variance: the interim `MacStatus` union (Dev Notes decision 1) and the standalone inline-error element (superseded in 2.3) — both are documented product-staging decisions, not drift.

### References

- [Source: epics.md#Story 1.4] — acceptance criteria; FR2; UX-DR13/DR14/DR15.
- [Source: epics.md#FR2] — reject invalid input clearly (testable consequences).
- [Source: architecture.md#Frontend Architecture] — `PopupState` shape, pure `render(state)`, `input` → parse → state → render.
- [Source: architecture.md#Communication Patterns] — `nextState` purity, `data-status` mirrors status, no status-specific class names, render idempotency.
- [Source: architecture.md#Structure Patterns] — `src/ui/state.ts` / `render.ts` tree; ui → lib one-way dependency.
- [Source: architecture.md#Process Patterns] — bad input ⇒ `status: 'invalid'`, never throw; typecheck+test+build gate.
- [Source: architecture.md#Enforcement Guidelines] — canonical microcopy only; co-located tests; discriminated unions.
- [Source: DESIGN.md#Colors] — invalid triad used only for non-MAC input: field border/text.
- [Source: DESIGN.md#components.mac-input] — invalid input uses `invalid-fg` on border and text.
- [Source: EXPERIENCE.md#State Patterns] — cold-open resting state (no banner/rows/error); invalid treatment; correcting-toward-valid re-evaluates per change.
- [Source: EXPERIENCE.md#Voice and Tone] — "Not a valid MAC address" verbatim.
- [Source: implementation-readiness-report-2026-10-10.md#UX Alignment] — Story 1.4's standalone inline error is superseded by Story 2.3's banner invalid state.
- [Source: project-context.md] — standing guardrails (zero permissions/purity/microcopy/gates/version bump).
- [Source: _bmad-output/implementation-artifacts/1-3-paste-and-normalize-any-common-mac-form.md] — parser contract, Vitest setup, review patches/defers.
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — the happy-dom pragma defer this story resolves; other owned defers.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
