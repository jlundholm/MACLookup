---
baseline_commit: 679093333e14a3aecebb573b5367bd4f6de72a6f
---

# Story 1.7: Make the popup keyboard- and screen-reader-accessible

Status: ready-for-dev

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

- [ ] Task 1: Autofocus + Tab-order contracts in markup (AC: 1, 2, 8)
  - [ ] In `index.html`, add the `autofocus` attribute to `<input id="mac-input">` (declarative; Chrome MV3 popups honor it — no JS `focus()` call in `main.ts`).
  - [ ] Do **not** add any `tabindex` anywhere: DOM order already yields the required reading order (input → `#input-error` → `#result-banner` → rows colon, plain, cisco; only the input and the three `<button>`s are focusable; buttons are natively tabbable, `#input-error`/`#result-banner` are not). Enforce this contract with a drift test (Task 5) instead of attributes.
  - [ ] AC8 is already satisfied — Story 1.1 shipped `aria-label="MAC address"` on the input (verified: `git log -S 'aria-label'` → `e53247a`). Do not change the string; lock it with a drift test (Task 5).
- [ ] Task 2: Neutral focus ring on the copy buttons (AC: 2)
  - [ ] In `src/styles/app.css`, directly **after** the `[data-copy]`/`:disabled` button state rules (so equal-specificity ties resolve to focus), add — mirroring the Story 1.3 `.mac-input:focus-visible` pattern (outline suppressed, neutral halo carries the cue):
    ```css
    .copy-button:focus-visible {
      outline: none;
      border-color: var(--color-focus-ring);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-focus-ring) 22%, transparent);
    }
    ```
  - [ ] Rationale: the browser's default blue UA ring violates the neutral-ink focus contract (`{colors.focus-ring}`, never a status color — DESIGN.md colors). The input already establishes this pattern; the buttons must match. Focus is a navigation state, not an outcome.
- [ ] Task 3: Invalid-state announcement region (AC: 4) + error association (AC: 4)
  - [ ] In `index.html`, on `<p class="input-error" id="input-error" hidden>`, add `role="status" aria-live="polite"` (mirroring the banner's shipped ARIA exactly). The text stays the static canonical microcopy "Not a valid MAC address".
  - [ ] On the input, add `aria-describedby="input-error"` (standard error-association: focused input + visible error are announced together; the association is inert while `#input-error` is `hidden`, so no stale description leaks into valid/empty states).
  - [ ] **Do not change `render.ts`.** The announcement rides the existing `hidden`-attribute toggle: show-with-content is the standard inline-validation live-region pattern (`role="status"` elements that appear carrying text are announced by Chrome-based screen readers). The always-present content-swap alternative was rejected: an always-rendered empty `#input-error` is a flex item under `.popup { gap: var(--space-2) }` and would add 8 px of phantom spacing at rest and between input/rows — a visible regression against Stories 1.4/1.5 — and would break 1.4's tested `hidden`-attribute contract for zero announcement benefit in this epic.
  - [ ] **Do not touch `#result-banner`** (Story 2.3 owns it — it stays `hidden`, empty, `role="status" aria-live="polite"`; see Dev Notes decision 3 for the 2.3 handoff).
- [ ] Task 4: Reduced-motion guard + forced-colors focus path (AC: 7; owned defers from 1-2/1-3)
  - [ ] Add the reduced-motion kill-switch (preventive — no transition/animation exists anywhere in `app.css` today; this guarantees "state swaps instantly" and future-proofs any state CSS added later):
    ```css
    @media (prefers-reduced-motion: reduce) {
      .popup,
      .popup * {
        transition: none;
        animation: none;
      }
    }
    ```
  - [ ] Do **not** implement the ~120 ms cross-fade this story (Dev Notes decision 7) — 1.7 is the a11y floor, not a motion story; the guard above makes the AC literally true.
  - [ ] Resolve the Story 1.3/1-2 `forced-colors` defers — `outline: none` on `.mac-input` leaves keyboard focus invisible under Windows forced-colors (author box-shadow/border cues are suppressed). Add:
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
- [ ] Task 5: Drift tests locking the accessibility contracts (AC: 1, 2, 4, 5, 8)
  - [ ] Extend `src/ui/render.test.ts` (happy-dom; it already reads `index.html` via `readFileSync` — reuse that pattern). Add one markup-contract test asserting all of:
    - `#mac-input` has the `autofocus` attribute and `aria-label="MAC address"`;
    - `#input-error` has `role="status"`, `aria-live="polite"`, and `aria-describedby` is set on `#mac-input`;
    - `#result-banner` still carries `role="status" aria-live="polite"` and `hidden` (2.3 contract — unchanged this story);
    - no element in the popup carries a `tabindex` attribute (reading order = DOM order);
    - the three `button.copy-button[data-format]` appear in DOM order `colon, plain, cisco`;
    - no copy button carries `aria-label` or `aria-labelledby` (AC5's name-change contract depends on the accessible name coming from `textContent` — an `aria-label` would freeze the name at "Copy" and make the "Copied" swap invisible to assistive tech).
  - [ ] Add a CSS-contract test reading `src/styles/app.css` and asserting the presence of `@media (prefers-reduced-motion: reduce)`, `@media (forced-colors: active)`, and `.copy-button:focus-visible` (cheap guard against accidental deletion; CSS behavior itself stays manual-GUI-verified).
  - [ ] All existing tests must stay green — `render.ts`/`state.ts` are untouched this story.
- [ ] Task 6: Version bump + verify (AC: 1–8)
  - [ ] `manifest.json` `version`: `0.4.0` → `0.5.0` (minor bump per story; `package.json` untouched).
  - [ ] Update `_bmad-output/implementation-artifacts/deferred-work.md`: mark the Story 1.3 forced-colors entry and Story 1.2 forced-colors entry resolved by this story; re-scope the Story 1.1 live-region entry to Story 2.3 (banner) with the canonical pattern recorded (never `hidden`-with-content; prefer content-driven changes in a permanently-present region); re-defer the 1.2 zoom/fixed-px clipping entry with rationale (Dev Notes decision 9).
  - [ ] Gates: `npm run typecheck` (0 errors), `npm test` (all green), `npm run build` (succeeds; `dist/manifest.json` version `0.5.0`).
  - [ ] Guardrail greps: no `chrome.`, `fetch(`, `matchMedia` in `src/`; `src/lib/**` untouched (`git diff` on `parse.ts`/`format.ts` empty); no new runtime dependencies.
  - [ ] Verify AC6 holds with **no code** (it is already satisfied): invalid state carries the text "Not a valid MAC address" (not just red — covered by 1-4's tests), valid rows carry text labels + values (1-5's tests), empty carries the placeholder (1.1). Confirm the assertions exist; do not add duplicate tests.
  - [ ] Manual (user): rebuild, reload unpacked `dist`; popup opens with the caret in the field (paste lands immediately); `Tab` walks input → Colon → Plain → Cisco-dot with the neutral halo on each; `Enter`/`Space` on a focused button copies ("Copied" for ~1.5 s); type junk with VoiceOver/NVDA running → "Not a valid MAC address" announces once (not on every keystroke); Windows forced-colors (best-effort): focus outline visible on input and buttons.

## Dev Notes

### Critical Decisions

1. **The invalid announcement rides `#input-error`, not the banner (AC4's "result region").** In Epic 1 the inline error is the only element carrying state text; the banner is explicitly Story 2.3's ("Story 2.3 builds all three banner states and supersedes the standalone inline error" — 1-4 record). Writing invalid text into the banner now would either duplicate visible text (no CSS on `.result-banner` → plain unstyled duplicate) or require temporary `sr-only` styling — both fight the staged design. Decision: `role="status" aria-live="polite"` on `#input-error` announces invalid in this epic; Story 2.3 folds the error into the banner, re-points the live region there, and removes `#input-error` + its CSS. This is the same class of documented interim decision as 1-4's `'valid'` status stand-in.
2. **Show-with-content is the verified live-region pattern; always-present content-swap was rejected.** The 1-1 review deferred "`hidden` on an `aria-live` region can suppress announcements" to 1.7 with "verify the live-region pattern." Verified conclusion: the suppression failure mode is *content changing while the region is hidden*; a `role="status"` element that appears carrying its text is announced by Chrome-based screen readers (the standard inline-validation pattern). The always-present element was rejected on layout grounds: `.popup` is `display:flex; flex-direction:column; gap: var(--space-2)` (8 px), so an always-rendered empty `#input-error` adds phantom spacing at rest and between input and rows — a visible regression breaking 1.4/1.5's shipped layout — plus it would break 1.4's tested `hidden` contract. `render.ts` therefore does not change.
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
| `render.ts` / `state.ts` | — | byte-identical |
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

### Completion Notes List

### File List
