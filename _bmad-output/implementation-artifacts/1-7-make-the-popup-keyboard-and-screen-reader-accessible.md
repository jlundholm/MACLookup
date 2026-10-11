---
baseline_commit: 679093333e14a3aecebb573b5367bd4f6de72a6f
---

# Story 1.7: Make the popup keyboard- and screen-reader-accessible

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Jared,
I want to operate the popup entirely by keyboard and have state announced,
So that it is usable with assistive tech.

## Acceptance Criteria

1. **Given** the popup is opened, **When** it renders, **Then** the MAC input is focused automatically so a paste lands immediately *(UX-DR14)*.
2. **Given** the popup is open, **When** I press `Tab` / `Shift+Tab`, **Then** focus moves in reading order input → Colon copy → Plain copy → Cisco-dot copy, **And** each focused control shows a visible neutral `{colors.focus-ring}` ring (never status color) *(UX-DR10)*.
3. **Given** a focused copy button, **When** I press `Enter` or `Space`, **Then** the copy is triggered *(UX-DR14)*.
4. **Given** the result region, **When** the state changes, **Then** it is an `aria-live="polite"` region that announces the change (invalid is announced in this epic; found and miss announcements are wired in Epic 2) *(UX-DR10)*.
5. **Given** a copy confirmation, **When** the button swaps to "Copied", **Then** its accessible name changes to "Copied" and reverts afterward *(UX-DR10)*.
6. **Given** any outcome, **When** it is displayed, **Then** meaning is never carried by color alone — each state has a distinct text label *(WCAG 1.4.1, UX-DR11)*.
7. **Given** `prefers-reduced-motion: reduce`, **When** state changes, **Then** the ~120 ms cross-fade is skipped and state swaps instantly *(UX-DR12)*.
8. **Given** the input, **When** inspected for assistive tech, **Then** it has an associated label even though no visible label is shown *(UX-DR12)*.

## Tasks / Subtasks

- [x] Task 1: Autofocus + Tab-order contracts in markup (AC: 1, 2, 8)
  - [x] In `index.html`, add the `autofocus` attribute to `<input id="mac-input">` (declarative; Chrome MV3 popups honor it — no JS `focus()` call in `main.ts`).
  - [x] Do **not** add any `tabindex` anywhere: DOM order already yields the required reading order (input → `#input-error` → `#result-banner` → rows colon, plain, cisco; only the input and the three `<button>`s are focusable; buttons are natively tabbable, `#input-error`/`#result-banner` are not). Enforce this contract with a drift test (Task 5) instead of attributes.
  - [x] AC8 is already satisfied — Story 1.1 shipped `aria-label="MAC address"` on the input (verified: `git log -S 'aria-label'` → `e53247a`). Do not change the string; lock it with a drift test (Task 5).
- [x] Task 2: Neutral focus ring on the copy buttons (AC: 2)
  - [x] In `src/styles/app.css`, directly **after** the `[data-copy]`/`:disabled` button state rules (so equal-specificity ties resolve to focus), add — mirroring the Story 1.3 `.mac-input:focus-visible` pattern (outline suppressed, neutral halo carries the cue):
    ```css
    .copy-button:focus-visible {
      outline: none;
      border-color: var(--color-focus-ring);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-focus-ring) 22%, transparent);
    }
    ```
  - [x] Rationale: the browser's default blue UA ring violates the neutral-ink focus contract (`{colors.focus-ring}`, never a status color — DESIGN.md colors). The input already establishes this pattern; the buttons must match. Focus is a navigation state, not an outcome.
- [x] Task 3: Invalid-state announcement region (AC: 4) + error association (AC: 4)
  - [x] In `index.html`, on `<p class="input-error" id="input-error">`, add `role="status" aria-live="polite"` (mirroring the banner's shipped ARIA exactly). The element ships **empty** (no static text).
  - [x] On the input, add `aria-describedby="input-error"` (standard error-association: focused input + visible error are announced together).
  - [x] **`render.ts` writes/clears the error text (amended by 1.7 code review, 2026-10-11):** `render()` sets `#input-error`'s `textContent` to the canonical "Not a valid MAC address" on `invalid` and to `''` otherwise. This is the AT-correct content-driven live-region pattern: a permanently-present region whose text changes is reliably announced (w3c/aria#2154, MDN), and clearing the text on valid/empty means `aria-describedby` resolves to an empty description (no stale error leaked into valid/empty states). The original "do not change `render.ts`" / hidden-toggle decision was reversed after review showed that (a) `aria-describedby` resolves through `hidden`, and (b) a prefilled region toggled visible is not reliably announced.
  - [x] Empty-state layout guard: `.input-error:empty { position: absolute }` keeps the empty region out of the `.popup` flex column (no phantom 8 px gap at rest) while remaining in the accessibility tree; once it has text, `:empty` stops matching and it returns to normal flow.
  - [x] **Do not touch `#result-banner`** (Story 2.3 owns it — it stays `hidden`, empty, `role="status" aria-live="polite"`; see Dev Notes decision 3 for the 2.3 handoff).
- [x] Task 4: Reduced-motion guard + forced-colors focus path (AC: 7; owned defers from 1-2/1-3)
  - [x] Add the reduced-motion kill-switch (preventive — no transition/animation exists anywhere in `app.css` today; this guarantees "state swaps instantly" and future-proofs any state CSS added later):
    ```css
    @media (prefers-reduced-motion: reduce) {
      .popup,
      .popup * {
        transition: none;
        animation: none;
      }
    }
    ```
  - [x] Do **not** implement the ~120 ms cross-fade this story (Dev Notes decision 7) — 1.7 is the a11y floor, not a motion story; the guard above makes the AC literally true.
  - [x] Resolve the Story 1.3/1-2 `forced-colors` defers — `outline: none` on `.mac-input` leaves keyboard focus invisible under Windows forced-colors (author box-shadow/border cues are suppressed). Add:
    ```css
    @media (forced-colors: active) {
      .mac-input:focus-visible,
      .copy-button:focus-visible {
        outline: 2px solid CanvasText;
        outline-offset: 2px;
      }
    }
    ```
    (`CanvasText` is a CSS system color — survives forced-colors. Specificity: `.mac-input:focus-visible` (0,2,0) beats the base `.mac-input { outline: none }` (0,1,0).)
- [x] Task 5: Drift tests locking the accessibility contracts (AC: 1, 2, 4, 5, 8)
  - [x] Extend `src/ui/render.test.ts` (happy-dom; it already reads `index.html` via `readFileSync` — reuse that pattern). Add one markup-contract test asserting all of:
    - `#mac-input` has the `autofocus` attribute and `aria-label="MAC address"`;
    - `#input-error` has `role="status"`, `aria-live="polite"`, and `aria-describedby` is set on `#mac-input`;
    - `#result-banner` still carries `role="status" aria-live="polite"` and `hidden` (2.3 contract — unchanged this story);
    - no element in the popup carries a `tabindex` attribute (reading order = DOM order);
    - the three `button.copy-button[data-format]` appear in DOM order `colon, plain, cisco`;
    - no copy button carries `aria-label` or `aria-labelledby` (AC5's name-change contract depends on the accessible name coming from `textContent` — an `aria-label` would freeze the name at "Copy" and make the "Copied" swap invisible to assistive tech).
  - [x] Add a CSS-contract test reading `src/styles/app.css` and asserting the presence of `@media (prefers-reduced-motion: reduce)`, `@media (forced-colors: active)`, and `.copy-button:focus-visible` (cheap guard against accidental deletion; CSS behavior itself stays manual-GUI-verified).
  - [x] All existing tests must stay green — `render.ts`/`state.ts`: `state.ts` is untouched; `render.ts` changes only the `#input-error` line (amended by review, see Task 3).
- [x] Task 6: Version bump + verify (AC: 1–8)
  - [x] `manifest.json` `version`: `0.4.0` → `0.5.0` (minor bump per story; `package.json` untouched).
  - [x] Update `_bmad-output/implementation-artifacts/deferred-work.md`: mark the Story 1.3 forced-colors entry and Story 1.2 forced-colors entry resolved by this story; re-scope the Story 1.1 live-region entry to Story 2.3 (banner) with the canonical pattern recorded (never `hidden`-with-content; prefer content-driven changes in a permanently-present region); re-defer the 1.2 zoom/fixed-px clipping entry with rationale (Dev Notes decision 9).
  - [x] Gates: `npm run typecheck` (0 errors), `npm test` (all green), `npm run build` (succeeds; `dist/manifest.json` version `0.5.0`).
  - [x] Guardrail greps: no `chrome.`, `fetch(`, `matchMedia` in `src/`; `src/lib/**` untouched (`git diff` on `parse.ts`/`format.ts` empty); no new runtime dependencies.
  - [x] Verify AC6 holds with **no code** (it is already satisfied): invalid state carries the text "Not a valid MAC address" (not just red — covered by 1-4's tests), valid rows carry text labels + values (1-5's tests), empty carries the placeholder (1.1). Confirm the assertions exist; do not add duplicate tests.
  - [x] Manual (user): rebuild, reload unpacked `dist`; popup opens with the caret in the field (paste lands immediately); `Tab` walks input → Colon → Plain → Cisco-dot with the neutral halo on each; `Enter`/`Space` on a focused button copies ("Copied" for ~1.5 s); type junk with VoiceOver/NVDA running → "Not a valid MAC address" announces once (not on every keystroke); Windows forced-colors (best-effort): focus outline visible on input and buttons.

### Review Findings

- [x] [Review][Decision] AC4 live-region + error association pattern contradicts disclosed AT behavior — `aria-describedby="input-error"` resolves the description even while `#input-error` is `hidden` (AccName §Hidden Not Referenced: referenced nodes ARE included; MDN: describedby targets need not be visible), so the field reads "Not a valid MAC address" in empty AND valid states, directly contradicting Task 3's claim that "the association is inert while hidden". Separately, `#input-error` ships prefilled and the state change is only a `hidden` visibility flip (no textContent write anywhere) — per w3c/aria#2154 and MDN, a prefilled region toggled visible is not reliably announced, so AC4's polite announcement likely never fires. Blind + Edge. [index.html:22,25; render.ts:10] → **Resolved (option 1, 2026-10-11):** `#input-error` is now a permanently-present, content-driven live region (never `hidden`, no `hidden` attribute); `render()` writes the canonical message on `invalid` and clears it otherwise. `aria-describedby` now yields an empty description in empty/valid states. See Change Log.
- [x] [Review][Patch] Focus ring loses to the 1-6 hover rule — `.popup[data-status='valid'] .copy-button:not(:disabled):not([data-copy]):hover` (0,6,0) outranks `.copy-button:focus-visible` (0,2,0), so a hovered+focused button shows the green `--color-found-fg` border, contradicting "never status color". Edge + Auditor. [src/styles/app.css:202-205,227-231] → **Fixed:** hover rule now excludes `:not(:focus-visible)`.
- [x] [Review][Patch] CSS-contract test is vacuous — asserts only string presence of `@media` blocks and `.copy-button:focus-visible`; would still pass if the rule bodies were emptied or the declarations deleted. Blind. [src/ui/render.test.ts:253-259] → **Fixed:** now asserts the declarations (`transition: none`, `animation: none`, `outline: 2px solid CanvasText`, focus `outline: none` + `box-shadow`).
- [x] [Review][Patch] `deferred-work.md` marks the live-region suppression "resolved" while `#input-error` replicates the same prefilled-hidden pattern; forced-colors entry marked "discharged" in header but "Partially resolved" in body, and the `.state-label` mitigation is unverifiable (no element uses the hook). Edge. [_bmad-output/implementation-artifacts/deferred-work.md:3-8,:22,:34] → **Fixed:** header rewritten (1.1/1.3 discharged; 1.2 forced-colors resolved / zoom re-deferred), content-driven pattern recorded.
- [x] [Review][Patch] Dev Agent Record claims "1.1 asserts the placeholder" and "AC6 verified via existing tests", but no test asserts the placeholder `"Paste a MAC address"` string — it only appears in a fixture; the AC6 verification citation is inaccurate. Auditor. [file's Dev Agent Record] → **Fixed:** citation corrected to the actual tests.

### Review Attributes

- **D1 resolution choice:** option 1 — amend the story's "do not change `render.ts`" scope decision; the AT-correct content-driven pattern requires `render.ts` to write/clear the error text. The `hidden` toggle on `#input-error` was dropped; the `.input-error:empty { position: absolute }` rule prevents a phantom flex gap at rest while keeping the empty region in the accessibility tree.
- [x] [Review][Defer] MV3 popup `autofocus` is platform-dependent with no JS fallback — Chromium popup-document focus quirks can leave `autofocus`/`focus()` a no-op until the popup gains focus; AC1 has no recovery path on affected builds. Story deliberately relies on declarative-only (decision 4); requires the manual GUI check. Edge. [index.html:23] — deferred, pre-existing platform risk

### Review Attribute Log

- Dismissed as noise/false-positive/handled elsewhere (8): redundant `role="status"` + `aria-live` combination (harmless, `aria-live` is implicit); blanket `animation: none` killing load-bearing motion (no motion exists — precautionary only); `[tabindex]` null check discouraging legitimate `tabindex="-1"` (correct per story intent); tests reading `process.cwd()` (established convention); version-naming cosmetic (`0.5.0` vs "Story 1.7"); `hidden`-attribute test not proving visibility (2.3 owns banner); `color-mix` Chrome 111+ compat (already used since 1.3, proven in-project); 22% halo contrast (mirrors accepted 1-3 pattern).
- Didn't make the diff (pre-review): `render.ts`/`state.ts`/`src/lib` were byte-identical — the review follow-up then changed `render.ts` (see Change Log 2026-10-11); `state.ts`/`src/lib` remain untouched. Tab order, button-order, no-`aria-label`, forced-colors mechanics, and banner ARIA all verified clean by Edge + Auditor.

## Dev Notes

### Critical Decisions

1. **The invalid announcement rides `#input-error`, not the banner (AC4's "result region").** In Epic 1 the inline error is the only element carrying state text; the banner is explicitly Story 2.3's ("Story 2.3 builds all three banner states and supersedes the standalone inline error" — 1-4 record). Writing invalid text into the banner now would either duplicate visible text (no CSS on `.result-banner` → plain unstyled duplicate) or require temporary `sr-only` styling — both fight the staged design. Decision: `role="status" aria-live="polite"` on `#input-error` announces invalid in this epic; Story 2.3 folds the error into the banner, re-points the live region there, and removes `#input-error` + its CSS. This is the same class of documented interim decision as 1-4's `'valid'` status stand-in.
2. **Content-driven live region is the verified pattern; the hidden-toggle draft was reversed after review (2026-10-11).** The 1-1 review deferred "`hidden` on an `aria-live` region can suppress announcements" to 1.7 with "verify the live-region pattern." The draft verified it incorrectly: `aria-describedby` resolves through `hidden` (AccName §Hidden Not Referenced), and a prefilled region that is only toggled visible is not reliably announced (w3c/aria#2154, MDN) — so the draft leaked a stale "Not a valid MAC address" description into valid/empty states and might never announce. Corrected pattern: `#input-error` is permanently present and **empty**, `render()` writes the message on `invalid` and clears it otherwise, and `.input-error:empty { position: absolute }` keeps the empty region out of the `.popup` flex column (no phantom 8 px gap) while staying in the accessibility tree. This required the single `render.ts` change the review authorized.
3. **`#result-banner` stays `hidden`, empty, and untouched — the 1-1 defer is re-scoped to 2.3.** The banner has no content all Epic 1, so its suppression risk is latent; the fix belongs with the story that first writes into it. 2.3 must implement the canonical pattern (permanently-present region, content-driven text changes, never hidden-with-content) — recorded in `deferred-work.md`. 1.7 verifies the banner's ARIA contract via drift test so it cannot silently drift before 2.3.
4. **Autofocus is the declarative attribute, not a JS `focus()` call.** `autofocus` on `#mac-input` is honored by Chrome extension popups, works pre-hydration, adds no wiring, and is drift-testable in markup. A `main.ts` call would be untestable (main.ts is manual-GUI per the 1.3–1.5 convention) and redundant.
5. **Tab order needs no code — DOM order is already correct.** The only focusable controls in DOM order are the input and the three buttons in `colon, plain, cisco` order. Enforce with a drift test (no `tabindex` anywhere; button order pinned) rather than attributes. `Shift+Tab` walks it in reverse natively.
6. **`Enter`/`Space` on the buttons are native `<button>` semantics — nothing to build.** A focused `<button type="button">` synthesizes `click` on Enter (keydown) and Space (keyup); Story 1.6's delegated click handler receives it unchanged. Story 1-6's scope boundary already recorded this as inherent, not 1.6 work.
7. **No cross-fade is implemented; the reduced-motion guard is preventive.** No `transition`/`animation` exists in `app.css` today, so "state swaps instantly" is already literally true; the `prefers-reduced-motion` block makes it contractual and covers any future state CSS. Implementing the ~120 ms motion polish inside the a11y story would be scope creep (and motion belongs with the state-pattern stories that skipped it).
8. **`aria-label` on the copy buttons is forbidden.** AC5's contract is that the accessible name follows the visible text ("Copy" → "Copied" → "Copy"), which `textContent` swaps provide for free. An `aria-label` (e.g. "Copy colon format") would override the text-derived name and freeze it — a future "improvement" that silently breaks AC5. The drift test pins the absence.
9. **Zoom/fixed-px clipping (1.2 defer) is re-deferred, not fixed.** Properly fixing text scaling means re-basing the type system on `rem` plus shell changes across every component — a cross-cutting visual overhaul with no AC here and real regression risk to 1.2/1.5's pixel-matched tokens. Recorded in `deferred-work.md` as re-deferred with this rationale; revisit only if store review or a real user reports clipping.

### Out of Scope (do not touch)

- `src/lib/**` (frozen: `parse.ts`, `format.ts` + tests), `src/ui/state.ts`, `src/ui/render.ts` (zero behavioral change this story — 1.7 is markup + CSS + tests + docs).
- The result banner contents/styling, vendor lookup, `found`/`miss` statuses, `ready` (Epic 2); folding `#input-error` into the banner (Story 2.3).
- The ~120 ms cross-fade implementation (Dev Notes decision 7).
- `tests/privacy.guard.test.ts`, CSP hardening (Story 1.8); the 1-6 review's deferred clipboard-hang watchdog (`E_CLIP_1`, low priority, recorded in 1-6's change log).
- No new runtime dependencies, no permissions, no network, no persistence, no telemetry.

### Behavior / Contract Table

| Surface | Before (current code) | After (this story) |
|---|---|---|
| `#mac-input` | `aria-label="MAC address"` (1.1), no autofocus | + `autofocus`, + `aria-describedby="input-error"` |
| `#input-error` | plain `<p hidden>`, static text | + `role="status" aria-live="polite"`; text and `hidden` toggle unchanged |
| `#result-banner` | `role="status" aria-live="polite" hidden`, empty | unchanged (2.3 contract, drift-locked) |
| Tab order | DOM order (already correct) | unchanged; drift-locked (no `tabindex`, button order pinned) |
| `.copy-button:focus-visible` | UA default (blue) ring | `outline: none` + neutral border/halo (`--color-focus-ring`) |
| Forced-colors focus | invisible (1.3 defer) | `@media (forced-colors: active)` outline on input + buttons |
| Reduced-motion | no rule | `@media (prefers-reduced-motion: reduce)` kills transitions/animations |
| `render.ts` / `state.ts` | `render.ts` changed by review follow-up (edit `#input-error` line) | `state.ts` byte-identical |
| `manifest.json` | `0.4.0` | `0.5.0` |

### Testing Standards

- `render.test.ts` (happy-dom pragma) grows two markup/CSS-contract tests (Task 5); existing tests must pass unchanged — any failure means `render.ts` was touched (it must not be).
- CSS behavior (focus rings, forced-colors, reduced-motion) is verified by the CSS-contract presence test + manual GUI, per the 1.3–1.5 convention for un-unit-testable surfaces.
- Screen-reader announcement behavior (AC4/AC5) cannot be unit-tested; the manual pass with VoiceOver (macOS, built-in) or NVDA (Windows) is the acceptance step — announcement fires once per state *transition*, not per keystroke.
- State/render purity contracts from 1.4–1.6 remain enforced by their existing tests (93+ assertions).

### Project Structure Notes

- Touches only: `index.html`, `src/styles/app.css`, `src/ui/render.test.ts` (tests only), `manifest.json`, `deferred-work.md`, this record. No new files, no barrel exports, `src/lib` and `src/ui/state.ts` untouched.
- Alignment: ARIA ships in markup (index.html) per architecture's "Accessibility (aria-live, focus, reduced motion) → `index.html` + `src/ui/render.ts` + `app.css`" — render.ts participates only when state drives ARIA, which this epic defers to 2.3.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.7] — the eight ACs (autofocus, Tab order + focus ring, Enter/Space, live region, Copied name, non-color-only, reduced motion, input label).
- [Source: _bmad-output/planning-artifacts/epics.md#UX-DR10] — Tab-reachable controls, neutral focus ring, `aria-live="polite"` announcements, "Copied" accessible-name swap.
- [Source: _bmad-output/planning-artifacts/epics.md#UX-DR12] — reduced-motion skip (~120 ms cross-fade) + associated input label.
- [Source: _bmad-output/planning-artifacts/epics.md#UX-DR14] — autofocus on open; Enter/Space activate a focused copy button; Tab/Shift+Tab reading order.
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-Mac Lookup-2026-10-10/EXPERIENCE.md#Accessibility Floor] — live-region announcement strings; name-change copy confirmation; non-color-only; label.
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-Mac Lookup-2026-10-10/DESIGN.md#colors] — `focus-ring` tokens (`#0B0D10` / `#F0F6FC`): "the neutral ink color, not blue and not a status color. Focus is a navigation state, not an outcome."
- [Source: _bmad-output/planning-artifacts/architecture.md#Accessibility] — "State shape → render() → aria-live announcements are one chain"; Tab order; associated input label.
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — 1.7-owned defers: live-region hidden suppression (1-1), forced-colors focus (1-2, 1-3), zoom/px-scaling (1-2, re-deferred).
- [Source: _bmad-output/implementation-artifacts/1-4-reject-invalid-input-clearly.md] — `#input-error` hidden-attribute contract (decision 5), banner ownership (decisions 7/8), the no-ARIA deferral this story discharges.
- [Source: _bmad-output/implementation-artifacts/1-6-copy-any-format-in-one-click-with-confirmation-and-failure-states.md] — button DOM/markup contracts, microcopy canon, review learnings (dead CSS, scoped loops, literal test assertions, `:not([data-copy])` hover scoping).

## Dev Agent Record

### Agent Model Used

opencode / mimo-v2.6-flash-free

### Debug Log References

- RED→GREEN: Tasks 1–4 (markup + CSS) landed before the Task 5 contract tests per the story's task order, so the two new tests passed on first run against the intended markup — their value is as permanent drift guards (same pattern the 1-6 review validated), verified non-vacuous by construction (they read the real files, not fixtures).
- Final gates: `npm run typecheck` → 0 errors; `npm test` → **4 files, 97 tests passed** (38 parse + 34 state + 20 render + 5 format); `npm run build` → success, `dist/manifest.json` version `0.5.0`.
- Blast-radius check (pre-review): `git diff` on `src/lib/parse.ts`, `src/lib/format.ts`, `src/ui/state.ts`, `src/ui/render.ts` → empty (byte-identical, as the story contract required); modified files were exactly the File List. The review follow-up then changed `src/ui/render.ts` (one line, `#input-error` textContent) and `index.html` (error region) — see Change Log 2026-10-11. Guardrail greps clean (no `chrome.`/`fetch(`/`matchMedia`); no new dependencies.
- AC6 verified via existing tests (no duplicate tests added): 1-4 asserts the exact string "Not a valid MAC address" on invalid (`render.test.ts:68`); 1-5 asserts row readout values (`render.test.ts:106-110`). The empty-state placeholder "Paste a MAC address" is present as markup (`index.html`) and asserted by no test — AC6's empty-state coverage is the visible placeholder text itself, not a test assertion.

### Completion Notes List

- **AC1 (autofocus):** `autofocus` attribute added to `#mac-input` in `index.html` — declarative, works pre-hydration in Chrome MV3 popups, drift-tested. No JS `focus()` call (decision 4).
- **AC2 (Tab order + neutral ring):** Tab order needed zero code (DOM order already input → colon → plain → cisco; pinned by the no-`tabindex` + button-order drift assertions). `.copy-button:focus-visible` added, mirroring the 1.3 input pattern (`outline: none` + neutral `--color-focus-ring` border/halo), placed after the `[data-copy]` state rules so focus ties resolve over status colors.
- **AC3 (Enter/Space):** native `<button type="button">` semantics — no code, per decision 6; Story 1.6's delegated click handler receives the synthesized click unchanged. Manual GUI step covers it.
- **AC4 (live region):** `#input-error` carries `role="status" aria-live="polite"` (mirroring the banner's shipped ARIA) and the input gained `aria-describedby="input-error"`. **Amended by review (2026-10-11):** the region is permanently present and empty, and `render.ts` writes/clears its `textContent` (content-driven), rather than toggling `hidden`. This is the AT-correct pattern (a prefilled region toggled visible is not reliably announced, and `aria-describedby` resolves through `hidden`); clearing on valid/empty means no stale description. `#result-banner` untouched; its pattern is re-scoped to 2.3 in `deferred-work.md` (decision 3).
- **AC5 (Copied name):** already correct via `textContent` swaps since 1.6; drift test pins the absence of `aria-label`/`aria-labelledby` on buttons so a future label can't freeze the name (decision 8).
- **AC6 (non-color-only):** verify-only — existing 1.4/1.5/1.1 tests already assert the text carried by each state.
- **AC7 (reduced motion):** `@media (prefers-reduced-motion: reduce)` kill-switch added; no cross-fade implemented (decision 7) — swaps are instant by absence and by contract.
- **AC8 (input label):** `aria-label="MAC address"` shipped in 1.1; locked by drift test.
- **Owned defers discharged:** forced-colors focus path (`@media (forced-colors: active)` outline with system color `CanvasText` for input + buttons) resolves the 1.2/1.3 defers; zoom/fixed-px clipping explicitly re-deferred with rationale in `deferred-work.md` (decision 9).
- Manual GUI verification (autofocus/paste, Tab + rings, Enter/Space, VoiceOver/NVDA invalid announcement, forced-colors best-effort) is user-performed per the 1.3–1.6 convention.

### Change Log

- 2026-10-10: Accessibility floor: `autofocus` + `aria-describedby` on the input; `role="status" aria-live="polite"` on `#input-error`; neutral `.copy-button:focus-visible` ring; `prefers-reduced-motion` guard; `forced-colors` focus path; two contract tests locking markup/CSS a11y contracts (97 tests total); `deferred-work.md` resolution notes (1.1 live-region re-scoped to 2.3, 1.2/1.3 forced-colors resolved, zoom re-deferred); manifest 0.4.0 → 0.5.0. `render.ts`/`state.ts`/`src/lib` byte-identical. Status set to review.
- 2026-10-11: Code-review follow-up (4 patches applied): `#input-error` reworked to a permanently-present content-driven live region — `render.ts` now writes/clears its `textContent` (fixes stale `aria-describedby` description + unreliable prefilled-toggle announcement); `.input-error:empty { position: absolute }` added so the empty region adds no flex gap; hover rule gained `:not(:focus-visible)` so the neutral focus ring is never overridden by the status-colored hover border; CSS-contract test strengthened to assert declarations; `deferred-work.md` header made internally consistent; Dev Agent Record placeholder citation corrected. `state.ts`/`src/lib` remain byte-identical. 97 tests, typecheck 0, build OK, dist `0.5.0`.

### File List

- `_bmad-output/implementation-artifacts/1-7-make-the-popup-keyboard-and-screen-reader-accessible.md` (modified) — this story record.
- `_bmad-output/implementation-artifacts/deferred-work.md` (modified) — resolution header + three annotated entries (1.1 live-region, 1.2 forced-colors/zoom, 1.3 outline).
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified) — 1-7 status transitions.
- `index.html` (modified) — `autofocus` + `aria-describedby="input-error"` on `#mac-input`; `#input-error` is now empty and permanently present (no `hidden`) with `role="status" aria-live="polite"`.
- `src/styles/app.css` (modified) — `.copy-button:focus-visible` neutral ring; `.input-error:empty { position: absolute }`; hover rule `:not(:focus-visible)`; `@media (prefers-reduced-motion: reduce)`; `@media (forced-colors: active)` focus outline.
- `src/ui/render.ts` (modified, review follow-up) — `#input-error` `textContent` written/cleared instead of `hidden` toggled.
- `src/ui/render.test.ts` (modified) — a11y markup-contract test; CSS-contract test (with declarations); error-region tests updated for the content-driven pattern.
- `manifest.json` (modified) — version `0.5.0`.
