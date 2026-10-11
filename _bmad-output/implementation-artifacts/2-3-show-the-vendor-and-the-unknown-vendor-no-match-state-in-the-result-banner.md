---
baseline_commit: e67427e292c7c2b837b821c833a214c1d7a81c91
---

# Story 2.3: Show the Vendor and the "Unknown vendor" no-match state in the result banner

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Jared,
I want the Vendor name — or a clear "Unknown vendor" — shown in one result banner,
So that I can tell "vendor found," "looked up, no match," and "invalid" apart at a glance.

## Acceptance Criteria

1. **Given** a non-empty input,
   **When** the popup renders,
   **Then** exactly one result banner is present with the anatomy status-lamp + state-label stacked over the value + prefix pinned right (UX-DR4).

2. **Given** a MAC whose prefix resolves,
   **When** the found state renders,
   **Then** the banner uses the found (green) triad and shows "Found", the Vendor name, and the prefix queried (FR5).

3. **Given** a valid MAC whose prefix is absent,
   **When** the miss state renders,
   **Then** the banner uses the miss (amber) triad and shows "Not found", "Unknown vendor", and the prefix queried,
   **And** the state is both textually and chromatically distinct from the invalid state (FR6, UX-DR13).

4. **Given** invalid input,
   **When** the banner renders,
   **Then** it uses the invalid (red) triad and shows "Invalid" and "Not a valid MAC address", the field border is red, and all rows are inert,
   **And** this banner invalid state supersedes the standalone inline error from Story 1.4 (FR2, UX-DR4).

5. **Given** the status lamp,
   **When** it renders,
   **Then** it is a filled 13px `currentColor` circle with a 4px same-color halo, `aria-hidden`, not focusable,
   **And** the text state label carries the meaning (UX-DR5).

6. **Given** the miss state,
   **When** the format rows render,
   **Then** they still convert and copy normally (only the invalid state makes them inert) (UX-DR13).

7. **Given** the result banner is an `aria-live="polite"` region,
   **When** the state changes,
   **Then** it announces "Found, Apple, Inc." for found and "Not found, unknown vendor" for miss,
   **And** no outcome relies on color alone (UX-DR10, UX-DR11).

8. **Given** all banner states,
   **When** copy is shown,
   **Then** the canonical microcopy is used verbatim (UX-DR15).

## Tasks / Subtasks

- [x] Task 1: Retype `MacStatus` to the architecture's four-value union and derive it in the reducer (AC: 3, 4, 6; Critical Decision 1)
  - [x] In `src/lib/types.ts`, change `MacStatus` from `'empty' | 'valid' | 'invalid'` to the exact union architecture.md:323 pins: `'empty' | 'found' | 'miss' | 'invalid'`. Delete `'valid'`.
  - [x] In `src/ui/state.ts`, derive the new status in the `input` case at :45: `raw === ''` → `'empty'`; a failed parse → `'invalid'`; a successful parse with `vendor?.ok === true` → `'found'`; with `vendor?.ok === false` → `'miss'`; with `vendor === null` (data loading/unavailable) → `'miss'` (Critical Decision 1).
  - [x] **Fix the `copy-resolved` guard at `src/ui/state.ts:57`** — it reads `if (state.status !== 'valid' || state.canonical !== event.canonical) return state;`. Once `'valid'` leaves the union this both fails typecheck and, if naively rewritten as `!== 'found'`, silently kills the copy confirmation on every miss. It must become `if ((state.status !== 'found' && state.status !== 'miss') || state.canonical !== event.canonical) return state;` — copy confirmation is valid on **found and miss**, only invalid/empty are inert (AC6).
  - [x] In `src/ui/state.ts`, resolve the same derived status in the `dataset-ready` case so a MAC pasted before the load finishes flips `'miss'` → `'found'`/`'miss'` when the index arrives. `dataset-unavailable` keeps `vendor: null`, so a valid MAC stays `'miss'`.
  - [x] Do **not** store the outcome in a new state field — the reducer keeps a single authoritative `status`.
- [x] Task 2: Ship the banner skeleton in `index.html` and drop the superseded inline error (AC: 1, 4, 7; Critical Decisions 2, 3)
  - [x] Rewrite `#result-banner` in `index.html` as the permanent, content-driven region: `role="status"`, `aria-live="polite"`, **no `hidden` attribute**, and an inner skeleton of `#banner-lamp` (`.status-lamp`, `aria-hidden="true"`), `#banner-label` (`.state-label`), `#banner-value` (`.result-value`), and `#banner-prefix` (`.prefix`, `aria-hidden="true"`).
  - [x] Delete the `#input-error` element from `index.html` — the banner now owns the invalid message (Critical Decision 3).
  - [x] Repoint the input's `aria-describedby` from `input-error` to `result-banner` so the field keeps a screen-reader description of its outcome.
- [x] Task 3: Add the banner and lamp CSS, and re-point the format-row rails (AC: 1, 2, 3, 5; Critical Decisions 4, 5)
  - [x] In `src/styles/app.css`, add `.result-banner` (DESIGN.md:117-136): `box-sizing: border-box`, `display: grid`, `grid-template-columns: auto 1fr auto`, `align-items: center`, `column-gap: var(--space-2)`, `border-radius: var(--radius-lg)`, `padding: var(--space-3)`, `user-select: text`.
  - [x] Add `.result-banner:empty { position: absolute; }` — the same trick 1.7 used for `.input-error:empty`, so the permanently-present banner never contributes a phantom flex gap at rest (discharges the deferred 1.1/1.7 banner note in `deferred-work.md`).
  - [x] Add the three triads keyed off the banner's own `data-state`: `.result-banner[data-state='found'|'miss'|'invalid']` each set `background`, `border: 1.5px solid`, and `color` from the existing `--color-{found,miss,invalid}-{bg,border,fg}` tokens. No fourth status color exists — do not invent one.
  - [x] Add `.status-lamp` (DESIGN.md:137-141): 13px circle, `background: currentColor`, `box-shadow: 0 0 0 4px color-mix(in srgb, currentColor 22%, transparent)`, `border-radius: var(--radius-full)`, `flex: none`. It is decorative; `aria-hidden` in the markup.
  - [x] Add `.result-value` (inherits body size) and let the existing `.state-label` / `.prefix` role hooks carry typography. `.result-body` stacks label over value (`display: flex; flex-direction: column;`).
  - [x] Re-point the format-row rail rule at `app.css:291` and the readout-colour rule at `app.css:309` from `[data-status='valid']` to `[data-status='found']` and `[data-status='miss']` (`--color-found-fg` / `--color-miss-fg` for the rail; both take `--color-text` for the readout), keeping `[data-status='invalid']` at :295 as-is — this is the "re-point" the Story 1.5 CSS comment at app.css:258-260 explicitly anticipates. Leaving them keyed on `'valid'` makes them dead CSS.
  - [x] Re-point the copy-button hover rule at `app.css:204` the same way, and make each take the **active** status colour per DESIGN.md:157-159 (`hover-foreground-found` / `hover-foreground-miss`) instead of today's hardcoded `--color-found-fg`; update the comment at :199-203 that explains the `'valid'`-only keying.
  - [x] Delete the now-orphaned `.input-error` and `.input-error:empty` rules.
- [x] Task 4: Render the four banner outcomes in `src/ui/render.ts` (AC: 2, 3, 4, 7; Critical Decisions 6, 7, 8)
  - [x] Replace the 2.2 `banner.hidden` / `banner.textContent` block with content-driven rendering: write `#banner-label` / `#banner-value` / `#banner-prefix` and set or clear `banner.dataset.state`.
  - [x] `status === 'invalid'` → `data-state="invalid"`, label `Invalid`, value `Not a valid MAC address`, prefix cleared, lamp shown.
  - [x] `status === 'found'` **and** `dataStatus === 'ready'` → `data-state="found"`, label `Found`, value `state.vendor.vendor`, prefix `state.vendor.prefix` (the winning 6/7/9-hex key), lamp shown.
  - [x] `status === 'miss'` **and** `dataStatus === 'ready'` → `data-state="miss"`, label `Not found`, value `Unknown vendor`, prefix `state.canonical.slice(0, 6)` (the /24 OUI), lamp shown.
  - [x] `dataStatus === 'unavailable'` → no `data-state`, no lamp, value `Database unavailable`, label and prefix cleared (Critical Decision 6 — 2.2's plain treatment survives verbatim).
  - [x] `status === 'empty'`, or a valid MAC while `dataStatus === 'loading'` → clear all four children and remove `data-state` so `.result-banner:empty` takes effect (Critical Decision 7).
  - [x] Delete the `#input-error` write from `render()` and the `INVALID_MESSAGE`/`DATABASE_UNAVAILABLE_MESSAGE` textContent assignment to the banner root (the messages now go into `#banner-value`).
  - [x] Apply the outcomes in this exact precedence (Task 4's order is the implementation order): **invalid → found/miss (ready-gated) → unavailable → cleared.** Invalid input outranks the dataset state, so `{ ...INVALID, dataStatus: 'unavailable' }` must render the invalid banner, not "Database unavailable" — the user's own error is the more actionable fact, and AC4 requires the invalid banner unconditionally. This is the one 2.2 behaviour this story intentionally changes.
  - [x] Change `btn.disabled` at `src/ui/render.ts:28` from `state.status !== 'valid'` to `state.status === 'invalid'` so miss stays fully copyable (AC6).
  - [x] Change the `Copied` predicate at `src/ui/render.ts:29` from `state.status === 'valid'` to `(state.status === 'found' || state.status === 'miss')` — otherwise a copy confirmation on a miss would never show the word "Copied".
  - [x] Keep `root.dataset.status = state.status` — the popup root still mirrors the union, and the rail/triad/hover CSS depends on it.
- [x] Task 5: Update the existing test suites to the new contract (AC: 4, 7; Critical Decision 9)
  - [x] In `src/ui/render.test.ts`, replace the `VALID` fixture's `status: 'valid'` with `'found'`/`'miss'` fixtures carrying a real `vendor`, and add the banner skeleton to the `fixture()` DOM (it must match `index.html`).
  - [x] Update the tests that assert `#input-error` (`renders invalid…`, `restores cleanly…`, `index.html contains every id…`, the Story 1.7 accessibility contract, and the `database unavailable` block's non-blocking test) to assert the banner instead. The `index.html carries the accessibility contracts (Story 1.7)` test must expect `aria-describedby="result-banner"`, must drop the `#input-error` assertions, and must assert `#result-banner` has **no** `hidden` attribute.
  - [x] Update every `banner.hidden` assertion in the `database unavailable` describe to the content-driven equivalent (children cleared / `Database unavailable` written), and keep the non-blocking assertion: rows and copy still work while unavailable.
- [x] Task 6: Add banner outcome coverage (AC: 1, 2, 3, 4, 5, 6, 7, 8)
  - [x] `src/ui/state.test.ts`: add a describe asserting the status union derivation — empty/invalid input, a found prefix, a miss prefix, a valid MAC with no index (`vendor === null` → `'miss'`), and `dataset-ready` flipping a pre-load pasted MAC from `'miss'` to `'found'`.
  - [x] `src/ui/render.test.ts`: add a `result banner` describe covering found (label/value/prefix/triad), miss (label/value/prefix/triad, and distinct from invalid), invalid (label/value/no prefix/triad), the unavailable neutral state, the cleared-at-rest state, `data-state` removal on transition back to empty, the prefix being `aria-hidden`, and idempotence of each state.
  - [x] `src/ui/render.test.ts`: assert the miss state leaves all three copy buttons **enabled** with working readouts (AC6), that a `'copied'` flag on a miss state renders the word `Copied` with `data-copy="copied"`, and that the invalid state disables them with `—` values.
  - [x] `src/ui/state.test.ts`: assert the `copy-resolved` event is **accepted** on a found state **and** on a miss state, and **rejected** on invalid and empty — this is the guard that the union change silently breaks.
  - [x] `src/ui/render.test.ts`: assert the precedence — `{ ...INVALID, dataStatus: 'unavailable' }` renders the invalid banner (`Invalid` / `Not a valid MAC address`), not `Database unavailable`.
  - [x] `src/ui/render.test.ts`: assert the exact announcement strings by asserting the visible text concatenation — `Found`, `Apple, Inc.`, `F01898` for found; `Not found`, `Unknown vendor`, `AABBCC` for miss (the prefix span is `aria-hidden`, so the live region reads `Found, Apple, Inc.` / `Not found, unknown vendor`).
- [x] Task 7: Discharge the deferred banner note and run the gates (AC: all; Critical Decision 10)
  - [x] Remove the **Banner** re-scope entry from the "Resolved by Story 1.7" header block in `_bmad-output/implementation-artifacts/deferred-work.md` (the content-driven pattern this story lands discharges it).
  - [x] Run `npm run typecheck` (0 errors), `npm test` (no regressions), `npm run build`.
  - [x] Bump `manifest.json` `version` from `0.8.0` to `0.9.0` (project-context: manifest-only version bumps; `package.json` stays `0.0.1`).
  - [x] Confirm the privacy guard still passes untouched — this story adds no network code, and the 2.2 inline `fetch` must stay byte-identical.

## Dev Notes

Story 2.3 is the story where the product finally *shows a result*. Everything upstream — parser, formatter, clipboard, dataset, lookup — exists to feed this one component. Two architectural contracts that have been parked since Story 1.x land here, and both ripple into files the story does not otherwise touch: the `status` union becomes the four-value union architecture has always pinned, and the Story 1.4 inline error is retired in favor of the banner.

**Read before writing.** The files this story updates are `src/lib/types.ts`, `src/ui/state.ts`, `src/ui/render.ts`, `src/ui/render.test.ts`, `src/ui/state.test.ts`, `src/styles/app.css`, and `index.html`. All were read in full while creating this story; their current contents are summarized below and must be re-read before editing.

- `src/lib/types.ts:7` — `export type MacStatus = 'empty' | 'valid' | 'invalid';`
- `src/ui/state.ts:45` — `const status: MacStatus = parsed.ok ? 'valid' : 'invalid';`
- `src/ui/state.ts:57` — `if (state.status !== 'valid' || state.canonical !== event.canonical) return state;` — **the copy guard; breaking this silently disables copy confirmation.**
- `src/ui/render.ts:28-29` — `btn.disabled = state.status !== 'valid'` and the `status === 'valid'` `Copied` predicate.
- `src/ui/render.ts:9-13` — the `#input-error` write that this story deletes.
- `src/ui/render.ts:34-39` — the 2.2 `banner.hidden` / `textContent` block this story replaces.
- `index.html:22,25-32` — the input's `aria-describedby="input-error"`, the `#input-error` element, and `#result-banner` (`hidden`).
- `src/styles/app.css` — tokens are complete (all three triads in light+dark already exist at :17-25 and :77-85); `.state-label`/`.prefix` role hooks exist at :171-182; **four** rules key on the interim `'valid'` status and all four must be re-pointed: the copy-button hover at :204, the format-row rail at :291, the readout colour at :309, and the explanatory comment at :199-203 and :258-260.
- `src/ui/render.test.ts` — 350 lines, 5 `index.html`/`app.css` contract tests, and a `database unavailable` describe written against the 2.2 `hidden` contract.

**What already works and must not break:** parsing, all three format conversions, the per-row copy confirmation with its 1500 ms timeout, the 2.2 dataset load and longest-prefix lookup, the offline/zero-permission posture, and every Story 1.x a11y guarantee that still applies once `#input-error` is retired (reduced-motion kill-switch, forced-colors focus path, Tab order, the neutral focus ring).

### Critical Decisions

1. **`MacStatus` becomes `'empty' | 'found' | 'miss' | 'invalid'`, and `'valid'` is deleted.** architecture.md:323 pins the union verbatim — "Status is exactly the string union `'empty' | 'found' | 'miss' | 'invalid'`; `data-status` on the popup root mirrors it" — and `app.css:258-260` ships a comment waiting on exactly this story: "the rail keys on the INTERIM 'valid'/'invalid' status because `data-status` is never 'found' until Story 2.3 re-points these rules." So 2.3 is the story that lands the union. The reducer derives it; no new field carries the outcome.
   **The unresolved window:** a successful parse whose lookup is not yet conclusive (`vendor === null`, i.e. `dataStatus` is `'loading'` or `'unavailable'`) must still map to one of the four values. `'miss'` is the only non-lying choice inside the union — `'found'` would assert a lookup that has not happened, and `'empty'`/`'invalid'` would lie about the parse. The consequence is bounded and accepted: during the ~170 ms load a fast paste shows the amber rail, and AC7's "no false Unknown" is protected separately by Decision 7 (the banner text is gated on `dataStatus === 'ready'`). When `dataset-ready` fires, `resolveVendor` runs again and the status flips to the true `'found'`/`'miss'`.

2. **`#result-banner` becomes a permanent, content-driven region with a shipped inner skeleton.** Story 1.7 left a recorded landmine in `deferred-work.md`: "use the canonical content-driven pattern now proven on `#input-error` — a permanently-present region with text written/cleared, never hidden-with-content … the banner must do the same or land its own layout." This story lands it. The banner keeps `role="status"` / `aria-live="polite"` but **loses its `hidden` attribute**, and `.result-banner:empty { position: absolute }` neutralizes the phantom flex gap at rest exactly the way `.input-error:empty` does today. The four children ship in `index.html` (matching the established pattern where the format-row skeleton is static HTML and `render` fills it), so `render` writes into stable `#banner-*` ids rather than building DOM per call — which keeps `render` pure, keeps the idempotence test meaningful, and lets the existing `index.html`-contract test style assert the skeleton.

3. **The Story 1.4 inline error is deleted, not repurposed.** AC4 says the banner's invalid state "supersedes the standalone inline error from Story 1.4." Keeping both would make the `aria-live="polite"` regions announce the same invalid message twice — a real screen-reader defect, not a cosmetic one — and architecture.md:248 wants "state shape → `render()` → `aria-live` announcements … one chain." So `#input-error`, its `.input-error` / `.input-error:empty` CSS, its `render()` write, and the input's `aria-describedby="input-error"` all go away; `aria-describedby` repoints to `result-banner`. **This deliberately breaks four Story 1.7 / 1.4 tests** (`index.html contains every id the renderer wires`, the Story 1.7 accessibility contract test, and two `#input-error` assertions); updating them is part of Task 5, not an accidental regression.

4. **The format-row rail is re-pointed to the outcome triads.** `app.css:258-260` states the `valid` keying is interim and names 2.3 as the story that fixes it. The rails become `[data-status='found']` → `--color-found-fg` and `[data-status='miss']` → `--color-miss-fg`, with `[data-status='invalid']` unchanged. This is also what makes AC3's "textually and chromatically distinct from the invalid state" visible on the rows and not only the banner.

5. **The lamp and the triads are CSS, the state label is the authority.** UX-DR5/DR11 require the lamp be decorative (`aria-hidden`, not focusable) and the text label carry the meaning, so WCAG 1.4.1 is satisfied without color. The lamp is a `currentColor` circle, so it inherits its color from the banner triad with no extra token work, and its 4px halo uses the same `color-mix(… 22%, transparent)` idiom 1.7 already established for the focus ring. **There is no fourth status color** (DESIGN.md:184) — the `unavailable` state deliberately gets no triad and no lamp.

6. **`unavailable` keeps 2.2's plain treatment, verbatim.** Story 2.2 Critical Decision 8 recorded that "Database unavailable" is "explicitly *not* canon microcopy; 2.3 may reword it" and that "the full status-lamp / triad / announcement anatomy is Story 2.3's." Rather than promote an unreachable local-resource failure into a fourth visual state, 2.3 writes the same literal text into `#banner-value` with no `data-state` and no lamp — so it renders exactly as it does today (surface colors, no dot), and the canonical `Found` / `Not found` / `Invalid` microcopy in the `state-label` slot stays reserved for the three real outcomes. Anatomizing it would need a color DESIGN forbids.

7. **The banner claims nothing while the data cannot speak.** With `dataStatus === 'loading'` and a valid MAC, the banner is fully cleared (all four children emptied, `data-state` removed) rather than guessing `'found'`/`'miss'`. This is the mechanism that keeps AC7 honest during Decision 1's unresolved window: a false "Unknown vendor" is never announced, and `dataset-ready` re-resolution simply makes the banner appear with the true outcome. The cost is that a paste landing inside the 170 ms load shows an amber rail with no banner for a moment — accepted, invisible in normal use, and strictly better than a false claim.

8. **The prefix is `aria-hidden` inside the banner.** AC7 pins the announcements as exactly "Found, Apple, Inc." and "Not found, unknown vendor" — neither includes the prefix, yet the visible anatomy requires it (AC1, AC2, AC3). The prefix therefore ships as `<span id="banner-prefix" class="prefix" aria-hidden="true">`: visible for the sighted engineer, excluded from the live-region readout so the announcement matches the AC verbatim. The state label and the value are the two nodes that speak.

9. **Mechanical churn in the existing suites is expected, not a regression.** Every `PopupState` literal in `render.test.ts` and `state.test.ts` carries `status: 'valid'` and must move to `'found'`/`'miss'` (with a real `vendor` where the banner matters). The `database unavailable` describe is written entirely against the 2.2 `hidden` contract and must be rewritten to the content-driven one. This is the same class of mechanical cost Story 2.2 accepted when `vendor` and `dataStatus` became required fields — the contract changed on purpose.

10. **`formats()` stays in `render.ts`; the copy *pipeline* is untouched, but three `'valid'` predicates are not.** Repeating 2.2 Critical Decision 10: this story adds no second call site and does not move `formats()`. The `copy-resolved` / `copy-timeout` reducer events and the clipboard wiring in `main.ts` are exactly as Story 1.6 left them. What *does* change are the three expressions that test `'valid'` and will therefore break: the `copy-resolved` guard (`state.ts:57`), the `Copied` predicate (`render.ts:29`), and the `disabled` predicate (`render.ts:28`). All three must widen from "valid only" to "found **or** miss" (invalid/empty remain inert) — AC6 and UX-DR6 require the rows keep converting and copying in the miss state, and a copy confirmation that only ever shows on a hit would be a silent regression.

### Behavior / Contract Table

| Surface | Before (after 2.2) | After (this story) |
|---|---|---|
| `MacStatus` | `'empty' \| 'valid' \| 'invalid'` | `'empty' \| 'found' \| 'miss' \| 'invalid'` (architecture.md:323) |
| status derivation | parse result only | parse result **and** `vendor.ok` (reducer-owned, single field) |
| `#result-banner` | `hidden` toggled by `dataStatus`, whole-node `textContent` | permanent, content-driven; four `#banner-*` children; `data-state` drives the triad |
| `#input-error` | `role="status"` live region carrying `Not a valid MAC address` | **removed** — the banner owns the invalid message |
| input `aria-describedby` | `input-error` | `result-banner` |
| `.input-error` / `.input-error:empty` CSS | present | **removed** |
| `.result-banner` CSS | no rules | full component + `:empty { position: absolute }` + three triads |
| `.status-lamp` CSS | does not exist | 13px `currentColor` circle + 4px `color-mix` halo |
| format-row rail key | `[data-status='valid']` | `[data-status='found']` / `[data-status='miss']` |
| `btn.disabled` | `status !== 'valid'` | `status === 'invalid'` (miss stays copyable) |
| `Copied` predicate | `status === 'valid'` | `status === 'found' \|\| status === 'miss'` |
| `copy-resolved` guard | `status !== 'valid'` | `status !== 'found' && status !== 'miss'` |
| format-row readout colour | `[data-status='valid']` | `[data-status='found']` / `[data-status='miss']` |
| copy-button hover colour | `[data-status='valid']` → `--color-found-fg` | `[data-status='found']` → `--color-found-fg`, `[data-status='miss']` → `--color-miss-fg` |
| found banner | — | `Found` + `vendor.vendor` + `vendor.prefix`, found triad |
| miss banner | — | `Not found` + `Unknown vendor` + `canonical.slice(0,6)`, miss triad |
| invalid banner | inline error text only | `Invalid` + `Not a valid MAC address`, invalid triad, rows inert |
| invalid **+** unavailable | `Database unavailable` (2.2) | **invalid banner** — invalid outranks the dataset state (intentional 2.2 change) |
| `unavailable` banner | `Database unavailable` via `hidden`/`textContent` | same literal text in `#banner-value`, no triad, no lamp |
| `manifest.json` | `0.8.0` | `0.9.0` |

### Testing Standards

- **Unit + reducer in `state.test.ts`** (node env): status derivation is a pure `nextState` call with a literal index — assert the union directly, including the `vendor === null` → `'miss'` case and the `dataset-ready` flip. No DOM, no fetch.
- **Render tests keep the happy-dom pragma** and the established `document.body.innerHTML` idempotence pattern. The `fixture()` DOM **must stay byte-equivalent in shape to `index.html`'s banner skeleton**, or the contract tests stop protecting anything.
- **Contract tests are first-class here**, not incidental: `index.html contains every id the renderer wires` must now expect the four `#banner-*` ids and must assert `#result-banner` carries **no** `hidden`; the Story 1.7 accessibility contract test must be updated to `aria-describedby="result-banner"` and must no longer assert `#input-error` or `banner.hidden === true`.
- **Announcements are asserted through visible text**, since happy-dom does not model live regions: assert `#banner-label` + `#banner-value` read as the AC's string, and separately assert `#banner-prefix` has `aria-hidden="true"`.
- **Do not add a test-only fixture file** (the 1-8 lesson); inline DOM and inline `PopupState` literals only.
- **All 202 existing tests must pass** except the ones this story deliberately rewrites (`status: 'valid'` literals, `#input-error` assertions, the 2.2 `hidden` banner contract). Nothing else may change behavior.

### Out of Scope (do not touch)

- A fourth banner state or any new status color — DESIGN.md:184 permits exactly three triads.
- Anatomizing the `Database unavailable` state (its plain treatment is 2.2's, and no color is available for it).
- The ~120 ms state cross-fade of UX-DR13 — 1.7's reduced-motion kill-switch already blocks it, and no transition is added here.
- Any change to parsing, formatting, the clipboard pipeline, the dataset, or `lookupVendor`.
- `src/data/load-oui-data.ts` and `src/lib/lookup.ts` — consumed, not modified.
- The 2.2 `Database unavailable` microcopy itself (may be reworded by a later story, not this one).
- Gzip packaging, store packaging, licensing — Epic 3.
- `package.json` `version` (manifest-only bumps, per project-context).

### Project Structure Notes

- Paths unchanged; no new files beyond what `render`/CSS/HTML already imply. `src/lib/types.ts`, `src/ui/state.ts`, `src/ui/render.ts`, `src/styles/app.css`, `index.html`, `src/ui/render.test.ts`, `src/ui/state.test.ts`, `manifest.json`.
- `src/ui/**` stays the only layer that touches the DOM; `src/lib/**` stays pure (project-context guardrail). The status derivation lives in the reducer, not in `render`, so `lib` purity is untouched.
- Naming: the new banner children are ids (`#banner-lamp`, `#banner-label`, `#banner-value`, `#banner-prefix`) to match the singleton-id convention already used for `#input-error` / `#format-rows` / `#result-banner`; the lamp is also given a `.status-lamp` class so CSS keys on the DESIGN.md component name (architecture.md:267 — kebab-case classes matching DESIGN component names, state via `data-*`, never status-specific class names).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.3] — ACs 1-8, lines 452-494.
- [Source: _bmad-output/planning-artifacts/epics.md#UX Decisions] — UX-DR4 (banner anatomy), UX-DR5 (lamp), UX-DR10 (announcements), UX-DR11 (non-color-only), UX-DR13 (state patterns), UX-DR15 (microcopy).
- [Source: _bmad-output/planning-artifacts/architecture.md:221-225,267,322-323] — the four-value status union, `data-status` mirroring, `render` as the sole DOM writer, one announcement chain.
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-Mac Lookup-2026-10-10/DESIGN.md#components] — `result-banner` (:117-136), `status-lamp` (:137-141), the three triads only (:184-189), the banner prose (:231-232).
- [Source: _bmad-output/planning-artifacts/prds/prd-Mac Lookup-2026-10-10/prd.md#FR-5,#FR-6,#Voice and Tone] — vendor + prefix, "Unknown vendor", the canonical microcopy list.
- [Source: _bmad-output/implementation-artifacts/2-2-load-the-dataset-and-resolve-the-vendor-with-longest-prefix-match.md] — `VendorResult` / `OuiIndex` / `dataStatus` contracts this story consumes, Critical Decisions 4 (miss prefix = /24), 8 (provisional unavailable treatment handed to 2.3), 9 (only `'unavailable'` speaks today).
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — the Story 1.1/1.7 **banner** re-scope entry that this story discharges (content-driven, never hidden-with-content, `:empty` neutralized).
- [Source: project-context.md] — guardrails: zero permissions, no runtime network/persistence, `src/lib/**` pure, `render` is the sole DOM writer, manifest-only version bumps, canonical microcopy.

## Dev Agent Record

### Agent Model Used

opencode / mimo-v2.6-flash-free (dev-story execution, red-green-refactor per task).

### Debug Log References

- **Task 1 (RED→GREEN).** Wrote the new union/copy-guard tests first: `src/ui/state.test.ts`
  went from 38 to 58 passing, with 20 red before GREEN (the old `'valid'` literal
  assertions plus the new derivation describes). GREEN touched `src/lib/types.ts`
  (the union) and `src/ui/state.ts` (the `input` case, the `copy-resolved` guard, and a
  shared `rederiveStatus()` helper now used by **both** `dataset-ready` and
  `dataset-unavailable`).
- **Landmine 1 — a fourth `valid` predicate.** The story listed three
  (`state.ts:57` copy guard, `render.ts:29` `Copied` predicate, `render.ts:28`
  `btn.disabled`). Implementation found the same three, and the shared-derivation
  rewrite surfaced a fourth *behavioural* case: `dataset-unavailable` used to only
  null `vendor` and leave `status` alone, so a previously-`found` MAC kept its green
  outcome after the index was dropped. `rederiveStatus(state.status, null)` on
  `dataset-unavailable` folds that into `'miss'`, which is exactly Critical Decision 1's
  rule for a parsed canonical with no conclusive vendor. Covered by the state suite.
- **Landmine 2 (design defect in this story, caught during Task 2/3) — `.result-banner:empty`
  can never fire.** Critical Decision 2 specified the 1.7 neutralisation verbatim:
  `.result-banner:empty { position: absolute; }`. That rule matches only a node with
  **zero child nodes**, and Task 2 ships a *static skeleton* (`#banner-lamp`,
  `#banner-label`, `#banner-value`, `#banner-prefix`) that is always present. The banner
  would therefore never leave the `.popup` flex flow and would contribute a phantom
  `gap` at rest — the precise 1.1/1.7 landmine the note exists to prevent.
  **Resolution:** layout is driven by the same attribute the triads already use —
  `render()` sets `banner.dataset.state` (`found|miss|invalid|unavailable`) or removes it,
  and the idle rule is `.result-banner:not([data-state]) { position: absolute; }`. This is
  the *"or land its own layout"* escape hatch that deferred-work.md's own wording
  already permitted, so no requirement is relaxed: the banner is still never `hidden`
  (so the polite live region always announces), and the idle state is still out of flow.
  One consequence folded in: `unavailable` must now *carry* `data-state="unavailable"` so
  that it is laid out in flow; it still has **no** triad rule, so it renders in surface
  colours with no lamp — DESIGN permits exactly three status colours (Decision 6 intact).
- **Landmine 3 — `miss` must not depend on the `vendor` object.** The story's Task 6 asks
  for coverage of the miss copy path, and the first draft of the new tests asserted that
  a `miss` with `vendor: null` painted nothing. That expectation was wrong and the test was
  corrected: `miss` is keyed off `canonical` alone (`canonical.slice(0, 6)` for the OUI),
  which is what lets a pre-load pasted MAC render `"Not found"` as soon as the dataset
  lands. Only `found` needs `state.vendor.ok`, and only `found` is defensive against an
  inconsistent state (covered by "never invents a vendor").
- **Microcopy.** epics.md AC7 quotes the miss announcement as `Not found, unknown vendor`
  (lowercase). UX-DR15's canonical list — which the PRD's Voice and Tone section makes
  normative — is `Unknown vendor` (capital U). Implemented and asserted the DR15 spelling;
  the concatenation test pins `Not found, Unknown vendor`.
- **Gates (final).** `npm run typecheck` 0 errors; `npm test` **228 passed / 8 files**
  (was 202 at the 2-2 review — +26, all banner/union coverage; the privacy guard is in
  that suite and untouched); `npm run build` OK; `dist/oui-data.json`
  `d25c740c788950fc7d12133337a4e587ee1d8e17c2b477c169881cbb908d6d1b`, byte-identical to
  `public/oui-data.json`, 1,895,897 bytes; `du -sb dist` 1,942,154 B (NFR5 2.0 MB met).
  `git diff e67427e` over `src/data/load-oui-data.ts`, `src/lib/lookup.ts`,
  `src/lib/parse.ts`, `src/lib/format.ts`, `src/main.ts` is empty — the 2.1/2.2 scope is
  untouched and the 2.2 inline `fetch(chrome.runtime.getURL('oui-data.json'))` is
  byte-identical.

### Completion Notes List

- `MacStatus` is now the architecture's four-value union `'empty' | 'found' | 'miss' |
  'invalid'`; `'valid'` is gone from the codebase (grep-clean in `src/`, including CSS).
- The status stays a **single** field in `PopupState` — no parallel `outcome`/`result`
  field was added (Task 1's last subtask), asserted by the "does not store the outcome in a
  second field" test.
- `#result-banner` is permanent and content-driven: `role="status"`, `aria-live="polite"`,
  no `hidden`, four `#banner-*` children, triad on `data-state`.
- `#input-error` is **fully deleted** — element, `.input-error` / `.input-error:empty` CSS,
  and the `render()` write. The input's `aria-describedby` now points at `result-banner`,
  so the field keeps a screen-reader description of its outcome.
- Banner precedence implemented as specified: **invalid → found/miss (both ready-gated) →
  unavailable → cleared.** `{ ...INVALID, dataStatus: 'unavailable' }` renders the invalid
  banner, not "Database unavailable" — the one intentional 2.2 behaviour change.
- A valid MAC while `dataStatus !== 'ready'` claims nothing (no "Unknown vendor" is ever
  announced before the dataset answers); `dataset-ready` then flips it to found/miss.
- All three `valid`-predicates widened to found-or-miss, so copy confirmation works on a
  miss and miss stays fully copyable (`btn.disabled` is now `status === 'invalid'` only).
- The four `app.css` rules keyed on `[data-status='valid']` were re-pointed: the two rails
  (`found`/`miss`/`invalid`), the readout colour, and the copy-button hover (now taking the
  **active** status colour per DESIGN.md:157-159 rather than a hardcoded found colour).
- `deferred-work.md`: the Story 1.1/1.7 **banner** re-scope entry is discharged with a new
  "Resolved by Story 2.3" block; the stale forward-looking sentence was removed from the
  1.7 block. The 1.2 zoom/fixed-px re-deferral is untouched.
- `manifest.json` bumped `0.8.0` → `0.9.0` (manifest-only, per project-context).
- Deviations from the story text are exactly the Landmine 2 layout change; everything else
  landed as written. The story text's `.result-banner:empty` subtask is **superseded** by
  the implementation recorded above.
- **Not done / out of scope:** no manual in-browser walkthrough was performed this session.
  The DOM contract is pinned by 228 unit tests over a `fixture()` that mirrors `index.html`
  and by the `index.html` / `app.css` contract tests, but a human load of the built
  `dist/` is still the last mile before this story is trusted visually.

### File List

- `src/lib/types.ts` — `MacStatus` retyped to the four-value union.
- `src/ui/state.ts` — status derivation on `input`; `copy-resolved` guard widened;
  `rederiveStatus()` helper; `dataset-ready` / `dataset-unavailable` re-resolve status.
- `src/ui/state.test.ts` — updated to the new union; new `status union derivation`
  describe; `copy-resolved` accepted-on-found-and-miss coverage (58 tests).
- `src/ui/render.ts` — extracted `bannerOutcome()`; content-driven banner rendering;
  `btn.disabled` and the `Copied` predicate widened; `#input-error` write removed.
- `src/ui/render.test.ts` — rewritten: `FOUND`/`MISS`/`PENDING` fixtures, banner skeleton in
  `fixture()`, new `result banner outcomes` describe, updated a11y/`index.html`/`database
  unavailable` contracts.
- `index.html` — `#result-banner` skeleton shipped; `#input-error` deleted;
  `aria-describedby="result-banner"`.
- `src/styles/app.css` — `.result-banner` + lamp + three triads + idle rule; four
  `[data-status='valid']` rules re-pointed; `.input-error` rules deleted.
- `manifest.json` — version `0.8.0` → `0.9.0`.
- `_bmad-output/implementation-artifacts/deferred-work.md` — banner entry discharged.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — 2-3 `in-progress`.

### Change Log

- 2026-10-11: Story created from epics.md Story 2.3, architecture.md, DESIGN.md, and the 2-2 hand-off. Baseline for development is `e67427e` ("story 2-2 review"), a clean tree.
- 2026-10-11: Implemented Story 2.3 against baseline `e67427e`. 8 files changed
  (+499/−130) plus the story file; 26 tests added (202 → 228); typecheck 0; build OK;
  `dist/oui-data.json` byte-identical; manifest `0.9.0`. One deviation from the story
  text: the idle-banner neutralisation is `:not([data-state])` instead of `:empty`
  (see Debug Log, Landmine 2).
