---
baseline_commit: d2a6cb2f03a008ad57d65248a9d93fdeed7781f1
---

# Story 1.5: Display the three working formats

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Jared,
I want to see Colon, Plain, and Cisco-dot at the same time,
So that I can grab whichever shape each system wants.

## Acceptance Criteria

1. **Three formats on a valid parse.** Given the Canonical value `AABBCCDDEEFF`, when a valid MAC is parsed, then the popup shows `AA:BB:CC:DD:EE:FF`, `AABBCCDDEEFF`, and `AABB.CCDD.EEFF`, all uppercase. *(FR3)*
2. **Immediate, no trigger.** Given a valid parse, when the results render, then all three formats appear immediately with no submit button or manual trigger. *(FR3)*
3. **Exactly three fixed rows.** Given the format rows, when they render, then there are exactly three fixed rows in the order Colon, Plain, Cisco-dot — always all three — and each value is selectable text. *(UX-DR6)*
4. **Row visual spec.** Given the design system, when a format row renders, then it uses field background, a 1px border, `rounded.md`, a 4px left status rail, and a field-label stacked over the readout value, with empty values in text-muted. *(UX-DR6, DESIGN.md components.format-row)*
5. **Pure formatter + co-located test.** Given the formatter, when I inspect `src/lib/format.ts`, then `formats(canonical)` is a pure function returning `{ colon, plain, cisco }`, and a co-located `format.test.ts` covers the three outputs. *(architecture: Format Patterns, Enforcement)*

## Tasks / Subtasks

- [x] **Task 1: Add `Formats` type + pure formatter** (AC: 5)
  - [x] In `src/lib/types.ts`, append (do not modify existing types):
    ```ts
    export type Formats = { colon: string; plain: string; cisco: string };
    ```
  - [x] Create `src/lib/format.ts` exporting `formats(canonical: string): Formats`. It slices a 12-hex canonical into three shapes (reference impl in Dev Notes). Pure — no DOM, no `chrome.*`, no `throw`.
  - [x] Create `src/lib/format.test.ts` (node env, no pragma): three outputs for `AABBCCDDEEFF`; a lowercase/separator input is the caller's job — `formats` takes an already-canonical value.
- [x] **Task 2: Fill the rows in `render`** (AC: 1, 2, 3)
  - [x] In `src/ui/render.ts`, when `state.canonical` is non-null, write the three values into the matching `[data-format]` row's readout; when null/empty/invalid, write `—` (or clear) so no stale value remains.
  - [x] `render` stays the sole DOM writer and idempotent. Keep the existing `#input-error` / `#format-rows` `hidden` toggles and the `root.dataset.status` write.
  - [x] Extend `src/ui/render.test.ts` (happy-dom pragma already present): valid state fills all three rows in order; invalid clears them; idempotent.
- [x] **Task 3: Row markup + labels** (AC: 3, 4)
  - [x] In `index.html`, give each `.format-row[data-format]` a `field-label` (`Colon` / `Plain` / `Cisco-dot`) and a `readout` value span, so `render` can target `.readout`.
  - [x] Row order is fixed in markup: Colon, Plain, Cisco-dot.
- [x] **Task 4: Row CSS** (AC: 4)
  - [x] In `src/styles/app.css`, add `.format-row` per DESIGN.md: `--color-field` bg, 1px `--color-border`, `--radius-md`, 4px left status rail; `.field-label` over `.readout`; empty `.readout` in `--color-text-muted`.
  - [x] **Critical — the rail cannot key on `'found'`.** The interim status union is `'empty'|'valid'|'invalid'`, so `data-status` is never `'found'` in this story; a `[data-status='found']` rule would silently never apply and the rail would stay neutral (a reviewer-catching bug). Drive the rail from the **canonical-bearing** status instead: `.popup[data-status='valid'] .format-row` → found rail; `.popup[data-status='invalid'] .format-row` → invalid rail. Story 2.3 re-points the same two rules at the real `'found'`/`'miss'`/`'invalid'` union. (See Critical decision 4.)
  - [x] Value is selectable (`user-select: text`) — the user can highlight a format without the copy button (UX-DR6).
- [x] **Task 5: Version bump** (standing guardrail)
  - [x] `manifest.json` `version`: `0.2.0` → `0.3.0` (minor bump per story). Do **not** bump `package.json`.
- [x] **Task 6: Verify** (AC: 1–5)
  - [x] `npm test` → all suites green (38 parse + 26 state + 7 render + new format tests).
  - [x] `npm run typecheck` → 0 errors.
  - [x] `npm run build` → succeeds; `dist/manifest.json` version `0.3.0`.
  - [x] Guardrail greps: `src/lib/format.ts` imports nothing; no `chrome.`/`fetch`/`matchMedia` in `src/`; `parse.ts` untouched.
  - [x] Manual: `npm run build`, reload unpacked `dist`; paste `aa:bb:cc:dd:ee:ff` → three rows show `AA:BB:CC:DD:EE:FF` / `AABBCCDDEEFF` / `AABB.CCDD.EEFF` in order, immediately. (Manual GUI check delegated to user, per 1.1–1.4 convention.)

## Dev Notes

### Scope boundary (do not overreach)

This story delivers **the three format rows + the pure formatter**. It does **not** deliver vendor lookup or copy.

- **In scope:** `src/lib/types.ts` (+`Formats`), `src/lib/format.ts` + `format.test.ts` (new), `src/ui/render.ts` (fill rows), `src/ui/render.test.ts` (extend), `index.html` (row markup), `src/styles/app.css` (row CSS), `manifest.json` (version).
- **Out of scope (do not touch):** `src/lib/parse.ts`/`parse.test.ts` (done, 1.3); `src/ui/state.ts` (status union unchanged this story — `canonical` already carries the value); copy buttons / clipboard / `copied` (1.6); autofocus, ARIA/live regions, `forced-colors`, reduced-motion (1.7); the privacy guard suite (1.8); the result banner contents, vendor lookup, `ready`, and the final `'empty'|'found'|'miss'|'invalid'` status union (Epic 2). No new runtime deps, no network, no persistence, no permissions.

### Critical decisions (recorded so the dev agent doesn't guess)

1. **`formats()` takes an already-canonical value.** `parseMac` owns normalization (strip + uppercase). `formats(canonical)` is a pure slicer — it does **not** re-validate, re-strip, or throw. Callers pass `state.canonical` (guaranteed 12 uppercase hex when non-null). This keeps both functions single-concern and matches architecture.md's Good Example separation.
2. **State already has everything; do not add fields.** `state.canonical` (Story 1.4) holds the 12-hex value. `formats()` is computed inside `render` (or a tiny helper), not stored in state — storing derived values invites drift and reviewers punish dead fields. If you later want memoization, that is a 2.3 concern.
3. **Empty/inert rows show `—`, not nothing.** On `'empty'`/`'invalid'`, each row's readout is set to an em dash `—` and styled muted (DESIGN.md: "Empty values show `{colors.text-muted}`"; EXPERIENCE invalid state: "rows go inert (— values)"). This is the mechanism that guarantees "no stale result" (AC of 1.4's AC3). The `#format-rows` container `hidden` toggle from 1.4 stays as-is: hidden only when status is `'empty'` (cold open), visible-but-inert on `'invalid'`.
4. **Row rail color is driven by the canonical-bearing status, not `'found'`.** DESIGN.md's format-row rail takes the *active status color*. The final union is `'empty'|'found'|'miss'|'invalid'`, but this story's interim status is `'empty'|'valid'|'invalid'` — there is no vendor outcome yet, and `data-status` is **never** `'found'` here. Decision: a filled row (status `'valid'`, canonical present) uses the **found** triad rail; an inert row (status `'invalid'`) uses the **invalid** triad rail; `'empty'` hides the container anyway. CSS: `.popup[data-status='valid'] .format-row` → found rail; `.popup[data-status='invalid'] .format-row` → invalid rail. Do **not** write `[data-status='found']` rules (they would never match — silent dead CSS), do **not** invent a `'valid'` triad, and do **not** emit `'found'`/`'miss'` status members (dead code). Story 2.3 re-points these same rules at the real status union when `found`/`miss` land.
5. **`render` remains the sole DOM writer and idempotent.** Extend the existing function; do not add a second writer or a `formatRows()` side-channel. `render(root, state)` called twice with the same state must produce identical DOM (the existing idempotency test already enforces this — keep it green).
6. **Selectable text without copy.** Values use `user-select: text` so a user can highlight a format manually (UX-DR6: "Value is selectable text"). The copy button (1.6) is additive and not present yet — do not stub it.
7. **Version bump only in `manifest.json`** (`0.2.0` → `0.3.0`), per project-context.md. `package.json` is a private npm version and is never bumped.
8. **No ARIA this story.** The rows ship as plain markup; `role`/`aria-live`/announcement wiring is Story 1.7's floor.

### Reference implementations (use these shapes)

```ts
// src/lib/format.ts
import type { Formats } from './types';

export function formats(canonical: string): Formats {
  return {
    colon: [canonical.slice(0, 2), canonical.slice(2, 4), canonical.slice(4, 6),
            canonical.slice(6, 8), canonical.slice(8, 10), canonical.slice(10, 12)].join(':'),
    plain: canonical,
    cisco: [canonical.slice(0, 4), canonical.slice(4, 8), canonical.slice(8, 12)].join('.'),
  };
}
```

(`formats` is total and pure; `plain` is the canonical itself. No `throw`, no validation — the caller passes an already-valid canonical.)

```ts
// src/lib/types.ts — append, do not modify existing
export type Formats = { colon: string; plain: string; cisco: string };
```

```ts
// src/ui/render.ts — extend (illustrative; keep the 1.4 error/rows/status logic)
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
    const which = row.dataset.format; // 'colon' | 'plain' | 'cisco'
    if (!out || !which) continue;
    out.textContent = f ? f[which] : DASH;
  }

  root.dataset.status = state.status;
}
```

(`f[which]` types cleanly because `Formats` keys are exactly `colon|plain|cisco`; if `noUnusedLocals` complains about the `Array.from` spread, iterate `rows.children` directly. The `—` + muted styling is the "no stale result" mechanism.)

```css
/* src/styles/app.css — append (row shell + rail; note the rail keys on 'valid', NOT 'found') */
.format-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  box-sizing: border-box;
  padding: var(--space-2) var(--space-3);
  background: var(--color-field);
  border: 1px solid var(--color-border);
  border-left-width: 4px;
  border-radius: var(--radius-md);
  user-select: text; /* UX-DR6: value is selectable text */
}

.popup[data-status='valid'] .format-row {
  border-left-color: var(--color-found-fg);
}

.popup[data-status='invalid'] .format-row {
  border-left-color: var(--color-invalid-fg);
}

.format-row .readout {
  color: var(--color-text);
}

.format-row .readout:empty {
  color: var(--color-text-muted); /* empty values read as muted (DESIGN.md) */
}
```

(The rail is the 4px left border; the found/invalid triads key on the **interim** `'valid'`/`'invalid'` status, because `data-status` is never `'found'` this story. `user-select: text` makes values highlightable without a copy button.)

### Behavior table (drive `render.test.ts` from this)

| status | canonical | colon | plain | cisco | rows container |
|---|---|---|---|---|---|
| `empty` | `null` | `—` | `—` | `—` | hidden |
| `invalid` | `null` | `—` | `—` | `—` | visible (inert) |
| `valid` | `AABBCCDDEEFF` | `AA:BB:CC:DD:EE:FF` | `AABBCCDDEEFF` | `AABB.CCDD.EEFF` | visible |

`#result-banner` stays `hidden` in every row (Epic 2 owns it). `#input-error` visible only on `invalid`.

### Testing requirements

- `src/lib/format.test.ts` — node env (default). Table-driven (`it.each`) over several canonicals; assert exact strings (`toEqual`). At minimum: `AABBCCDDEEFF` → the three expected outputs; one more canonical to prove it is not hardcoded.
- `src/ui/render.test.ts` — **first line** already `// @vitest-environment happy-dom` (keep it). Add cases: valid fills all three rows in order; invalid clears to `—`; empty clears to `—` and hides container; idempotent (existing test must stay green). Assert text content and `hidden`, not computed styles (no CSS assertions in Vitest).
- Existing `parse.test.ts` (38), `state.test.ts` (26), and the 7 `render.test.ts` cases must stay green and unchanged. The `#format-rows` id-contract drift test must stay green if you touch row markup.
- `tsconfig.json` `lib` is `["ES2023","DOM"]` — **no `DOM.Iterable`**. Avoid `for...of` over `querySelectorAll` results (a `DOM.Iterable` latent gap, already noted in deferred-work.md); use `Array.from(...)` or an indexed loop instead.
- Gates for every change: `npm run typecheck` + `npm test` + `npm run build`.

### Previous story intelligence

- **Story 1.4 (invalid handling + first state/render/wiring, done, reviewed):** `src/lib/types.ts` holds `ParseResult`, `MacStatus` (`'empty'|'valid'|'invalid'`), `PopupState` `{ raw, status, canonical }`. `src/ui/state.ts` exports `initialState` + `nextState` (pure, spread-based new object). `src/ui/render.ts` is the sole DOM writer; `src/main.ts` has a `required()` element guard and a single `input` listener. `index.html` has `#popup`, `#mac-input`, `#input-error` (inline `<p hidden>`), `#result-banner` (`role="status" aria-live="polite" hidden`), and `#format-rows` with three empty `.format-row[data-format]` children (`hidden`). Do not rename any id.
- **Review learnings from 1.4 that apply here:** (a) reviewers punish a fixture that duplicates production markup without a drift guard — the drift test asserting `index.html` contains every wired id is now in `render.test.ts` and must stay green; if you add a new wired id/class, extend that test. (b) Do not set `root.dataset.status` before the element guards in a way that leaves a half-rendered state; keep the 1.4 guard ordering. (c) Every new test must be able to fail — no vacuous assertions.
- **`src/styles/app.css` (1.2–1.4):** every token already exists (`--color-field`, `--color-border`, `--color-found-*`, `--color-invalid-*`, `--color-text-muted`, radii, spacing, the `.readout`/`.field-label` role hooks). The `.format-row` structural rule does **not** exist yet — this story adds it. The `.mac-input` invalid override and `.input-error` are already present; do not touch them.
- **`src/lib/parse.ts` (1.3):** `parseMac` strips `[\t\n\v\f\r :.-]`, validates-before-uppercase, returns `ParseResult`. It is finished and frozen; `format.ts` complements it and must not call it.
- **Toolchain (verified):** vite@8.3.4, @crxjs/vite-plugin@3.0.0, typescript@~6.0.2 (strict + `verbatimModuleSyntax` + `noUnusedLocals/Parameters` + `erasableSyntaxOnly`), vitest@4.1.11, happy-dom@20.14.6 (devDep), Node v22.22.1. `tsconfig` `include` covers `["src","tests","vite.config.ts"]`; `lib` is `["ES2023","DOM"]` (no `DOM.Iterable` — avoid `for...of` over `querySelectorAll` results, use `Array.from` or indexed loops).
- **`src/main.ts`:** uses `required<HTMLElement>('popup')` and `required<HTMLInputElement>('mac-input')`; the single `input` listener drives `nextState` → `render`. No change needed this story.
- **Build/verify caveat:** `npm run dev` rewrites `dist/index.html` into a dev bootstrap; verify with `npm run build` and reload the unpacked `dist` in `chrome://extensions`.

### Project Structure Notes

- Alignment with unified project structure: `src/lib/format.ts` + `format.test.ts` sit beside `parse.ts`/`parse.test.ts` (one exported concern per lib file, co-located test). `src/ui/render.ts` and `src/ui/render.test.ts` stay the single DOM writer + its test. No barrel/index re-export files (import exact paths).
- Naming: file `format.ts` (kebab-case, singular concern); function `formats` (camelCase); type `Formats` (PascalCase); CSS classes `.format-row` / `.readout` / `.field-label` (kebab-case, matching DESIGN.md component names); state exposed via `data-status` on the popup root, never via status-specific class names.
- Conflict/variance: none. The structure already reserves `src/lib/format.ts` in architecture.md's directory tree.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.5] — ACs, format specs, order, visual spec, `formats()` contract.
- [Source: _bmad-output/planning-artifacts/prds/prd-Mac Lookup-2026-10-10/prd.md#FR-3] — three formats shown together, uppercase, no trigger.
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-Mac Lookup-2026-10-10/DESIGN.md#components.format-row] — field bg, 1px border, `rounded.md`, 4px left status rail, field-label over readout, empty = text-muted.
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-Mac Lookup-2026-10-10/DESIGN.md#Colors] — found/miss/invalid triads; rail takes the active status color.
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-Mac Lookup-2026-10-10/EXPERIENCE.md#Component Patterns] — three fixed rows in order, always all three, value selectable, inert `—` when invalid.
- [Source: _bmad-output/planning-artifacts/architecture.md#Format Patterns] — `type Formats = { colon, plain, cisco }`.
- [Source: _bmad-output/planning-artifacts/architecture.md#Structure Patterns] — `src/lib/format.ts` placement, purity rule, co-located test.
- [Source: _bmad-output/implementation-artifacts/1-4-reject-invalid-input-clearly.md] — previous story intelligence, `PopupState`, `render` guard ordering, review learnings, toolchain.

## Dev Agent Record

### Agent Model Used

opencode / mimo-v2.6-flash-free

### Debug Log References

- RED→GREEN per task: `format.test.ts` first (failed on missing `./format`), then `format.ts` → 5 tests pass. `render.test.ts` row-fill tests failed first (3 failed / 7 passed), then `render.ts` extension → 10 tests pass.
- Final gates: `npm run typecheck` → 0 errors; `npm test` → **4 files, 79 tests passed** (38 parse + 26 state + 10 render + 5 format); `npm run build` → success, `dist/manifest.json` version `0.3.0`.
- Guardrails: `grep` over `src/` → no `chrome.`, `fetch(`, `matchMedia`; `src/lib/format.ts` imports only a type; `parse.ts`/`parse.test.ts` untouched; only version change is `manifest.json` (not `package.json`).

### Completion Notes List

- **AC1 (three formats on valid parse):** `formats('AABBCCDDEEFF')` → `{ colon: 'AA:BB:CC:DD:EE:FF', plain: 'AABBCCDDEEFF', cisco: 'AABB.CCDD.EEFF' }`, all uppercase (canonical is already uppercase). `render` writes them into the three rows in markup order Colon/Plain/Cisco-dot.
- **AC2 (immediate, no trigger):** single `input` listener → `nextState` → `render`; rows fill on the same event. No submit button added.
- **AC3 (exactly three fixed rows, selectable):** markup order fixed (Colon, Plain, Cisco-dot); `user-select: text` on `.format-row`. Values written to `.readout` spans.
- **AC4 (row visual spec):** `.format-row` = field bg + 1px border + `--radius-md` + 4px left rail; `.field-label` over `.readout`; empty readout in `--color-text-muted`. **Rail keys on the interim status, not `'found'`** — `.popup[data-status='valid'] .format-row` → found rail, `[data-status='invalid']` → invalid rail (data-status is never `'found'` until 2.3; a `[data-status='found']` rule would silently never match).
- **AC5 (pure formatter + test):** `formats(canonical)` is a pure slicer — takes an already-canonical value, returns `Formats`, no re-validation, no `throw`, imports only a type. `format.test.ts` (5 cases, node env, table-driven) covers the three outputs for four canonicals + the plain-identity.
- **No-stale mechanism:** when `canonical` is null (empty/invalid), each row's readout is set to `—` (muted), so no stale value remains — this is the AC3 guarantee from 1.4's review now made real. The `#format-rows` container `hidden` toggle from 1.4 is untouched (hidden iff `'empty'`).
- **Testing:** `format.test.ts` (5, node env), `render.test.ts` extended to 10 (valid fills all three in order; invalid clears to `—`; empty clears to `—`; existing 7 unchanged including idempotency + the `index.html` id-contract drift test). `parse.test.ts` (38) and `state.test.ts` (26) untouched and green.
- **Standing guardrails:** manifest `0.2.0 → 0.3.0` (only `manifest.json`); zero permissions/network/telemetry; no new runtime deps; microcopy verbatim (row labels Colon/Plain/Cisco-dot are DESIGN.md component names, not new user-facing status copy); no ARIA/autofocus (Story 1.7); banner untouched (Epic 2).
- Manual GUI verification (build + reload unpacked `dist`, paste a MAC, see three rows in order) is user-performed per the 1.1–1.4 convention.

### Change Log

- 2026-10-10: Implemented the pure `formats(canonical)` slicer (`src/lib/format.ts` + test) and filled the three format rows in `render`; added row markup (labels + readout spans) and row CSS (field bg, 1px border, rounded.md, 4px status rail keyed on interim valid/invalid, selectable text); manifest bumped to 0.3.0; status set to review.

### File List

- `_bmad-output/implementation-artifacts/1-5-display-the-three-working-formats.md` (modified) — this story record.
- `src/lib/types.ts` (modified) — added `Formats`.
- `src/lib/format.ts` (new) — pure `formats(canonical)`.
- `src/lib/format.test.ts` (new) — 5 formatter tests.
- `src/ui/render.ts` (modified) — fills/clears the three rows from `formats(canonical)`.
- `src/ui/render.test.ts` (modified) — fixture updated for row markup; +3 row-fill tests (10 total).
- `index.html` (modified) — row `field-label` + `readout` spans.
- `src/styles/app.css` (modified) — `.format-row` shell, status rail, readout styles.
- `manifest.json` (modified) — version `0.3.0`.
