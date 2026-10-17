---
baseline_commit: 81d5e4acfa31fa89b321f0f0acb31ed8bd28afd1
---

# Story 4.1: Add the Hyphen format with one-click copy

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Jared,
I want the Hyphen format shown and copyable alongside Colon, Plain, and Cisco-dot,
so that I can paste the exact shape Zoom Phone displays without reformatting by hand.

## Acceptance Criteria

1. **Given** the Canonical value `AABBCCDDEEFF`, **When** a valid MAC is parsed, **Then** the popup shows four formats — `AABBCCDDEEFF`, `AA:BB:CC:DD:EE:FF`, `AABB.CCDD.EEFF`, `AA-BB-CC-DD-EE-FF` — all uppercase (FR9). [AC1]
2. **Given** the format rows, **When** they render, **Then** there are exactly four fixed rows in the order Plain, Colon, Cisco-dot, Hyphen, always all four, and each value is selectable text (FR9; UX-DR6 as amended by Epic 4). [AC2]
3. **Given** the Hyphen row, **When** it renders, **Then** it uses the same format-row anatomy as the others — field background, 1px border, `rounded.md`, 4px left status rail, field-label "Hyphen" over the readout value, empty value in text-muted (UX-DR6). [AC3]
4. **Given** a valid MAC, **When** I activate the Hyphen row's copy control, **Then** exactly `AA-BB-CC-DD-EE-FF` lands on the clipboard, with the same ~1.5 s "Copied" confirmation, per-row independence, and clipboard-rejected failure state as the existing rows (FR4/FR9). [AC4]
5. **Given** invalid input, **When** the Hyphen row renders, **Then** it is inert — em-dash value, disabled copy — like every other row (FR2). [AC5]
6. **Given** the popup, **When** I press `Tab` / `Shift+Tab`, **Then** focus moves in reading order input → Plain copy → Colon copy → Cisco-dot copy → Hyphen copy, each focused control keeping the visible neutral focus ring (UX-DR10 as amended by Epic 4). [AC6]
7. **Given** `src/lib/format.ts`, **When** inspected, **Then** `formats(canonical)` is still a pure function returning `{ plain, colon, cisco, hyphen }`, and `format.test.ts` covers all four outputs including edge cases `000000000000` and `FFFFFFFFFFFF`. [AC7]
8. **Given** the copy state machine, **When** a Hyphen copy resolves or times out, **Then** it is tracked independently per row — `CopyState` carries a `hyphen` flag alongside colon/plain/cisco. [AC8]
9. **Given** the parser, dataset, lookup, and manifest, **When** this story is complete, **Then** none of their behavior changes — hyphen input was already accepted (FR1), zero permissions remain, the privacy guard suite stays green (NFR2). [AC9]
10. **Given** the gates, **When** I run `npm run typecheck`, `npm test`, and `npm run build`, **Then** all three pass, and `manifest.json` `version` is bumped on the rightmost segment (`0.0.10` → `0.0.11`) per project-context.md. [AC10]

## Tasks / Subtasks

- [x] Task 1: Extend the type contracts (AC7, AC8)
  - [x] `src/lib/types.ts`: `Formats` gains `hyphen: string`; `FormatKey` gains `'hyphen'`; `CopyState` gains `hyphen: CopyFlag`. Keep the closed object types (do **not** convert to `Record<…>` — the closed shape is what makes `tsc` flag every stale literal).
  - [x] Decide the key order in each type literal for readability: `plain | colon | cisco | hyphen` (DOM/visual order).
- [x] Task 2: Implement the Hyphen conversion (AC1, AC7)
  - [x] `src/lib/format.ts`: add `hyphen` using the same pure slice-2-join pattern as `colon`, with separator `'-'` (`[canonical.slice(0,2), …].join('-')`). No new helpers, no regex, no dependencies.
  - [x] `src/lib/format.test.ts`: extend every `it.each` tuple's expected object with the hyphen value; rename the case description from "colon, plain, and cisco" to reflect four formats; keep the identity-on-plain case; add/keep edge cases `000000000000` → `00-00-00-00-00-00` and `FFFFFFFFFFFF` → `FF-FF-FF-FF-FF-FF`.
- [x] Task 3: Wire copy-state tracking (AC4, AC8)
  - [x] `src/ui/state.ts`: `IDLE_COPY` gains `hyphen: 'idle'` (everything else — `nextState`, events, `COPY_CONFIRM_MS` — is already generic over `FormatKey`).
  - [x] `src/main.ts`: **no change expected** — the delegated click handler is generic over `data-format` + `formats(canonical)[which]` + `Object.hasOwn(state.copy, which)`. Verify only; do not special-case hyphen.
  - [x] `src/ui/render.ts`: **no change expected** — row fill, button enable/disable, and copy-flag handling are already generic over the DOM's `data-format` and `keyof Formats`. Verify only.
- [x] Task 4: Reorder the existing rows and add the fourth (AC2, AC3, AC5, AC6)
  - [x] `index.html`: reorder the existing three rows to **Plain, Colon, Cisco-dot**, then append a Hyphen row last, copying the existing row structure exactly: `<div class="format-row" data-format="hyphen"><span class="field-label">Hyphen</span><span class="readout"></span><button class="copy-button" type="button" data-format="hyphen">Copy</button></div>`. Final DOM order: Plain, Colon, Cisco-dot, Hyphen. DOM order is what defines tab order — no `tabindex` anywhere. Each row keeps its own matching `data-format` on both the row and its button.
  - [x] `src/styles/app.css`: **no change expected** — row styling keys on `.format-row` / `[data-status]` classes and is row-count/order agnostic. Verify the fourth row inherits rail color, readout muting, and focus styles; only touch CSS if a real defect appears.
- [x] Task 5: Update the contract tests that intentionally pin "three" (AC1, AC2, AC5, AC6)
  - [x] `src/ui/state.test.ts`: every `toEqual({ colon: …, plain: …, cisco: … })` copy-object literal gains `hyphen: 'idle'` (or the flag under test). Do not weaken `toEqual` to `toMatchObject` — exact-shape equality is the contract.
  - [x] `src/ui/render.test.ts`:
    - `fixture()` reorders its rows to mirror `index.html`: Plain, Colon, Cisco-dot, Hyphen.
    - Readout-order assertions become four-element arrays in row order — `['AABBCCDDEEFF', 'AA:BB:CC:DD:EE:FF', 'AABB.CCDD.EEFF', 'AA-BB-CC-DD-EE-FF']` for found, the analogous four for miss.
    - "three enabled Copy buttons" / "leaves all three copy buttons enabled" tests become four.
    - `CopyState` literals (copied/failed fixtures) gain `hyphen: 'idle'`.
    - `index.html format rows match what render fills`: `toHaveLength(3)` → `4`; the allowed-keys list gains `hyphen` (the per-row `toContain` check is order-insensitive — row order lives in the a11y contract test below).
    - `index.html carries the accessibility contracts`: the `btns.map(b => b.dataset.format)` expectation becomes `['plain', 'colon', 'cisco', 'hyphen']` (DOM order).
  - [x] **Trap — the unknown-key fixture:** `render.test.ts` currently uses `data-format="hyphen"` as the example of a row whose key is NOT in `Formats` ("writes a dash for a row whose data-format is not a Formats key"). Once `hyphen` is a real key that fixture becomes a false positive. Change it to a key that will never be a format (e.g. `data-format="eui64"`) **in this story**, or that test silently changes meaning.
  - [x] Do not delete, skip, or relax any assertion — this is a scope amendment, not a weakening of Epic 1/2 contracts.
- [x] Task 6: Version bump and documentation (AC10; store-truthfulness)
  - [x] `manifest.json`: `version` `0.0.10` → `0.0.11` (rightmost segment only; `package.json` stays `0.0.1`).
  - [x] `README.md`: "three formats network engineers actually use" → four, add **hyphen** (`AA-BB-CC-DD-EE-FF`) to the feature list and the formats bullet; update every version mention (`currently 0.0.10`, the rebase example's current number, the "Published … (version 0.0.10)" line) to `0.0.11`.
  - [x] `store/listing.md` + `store/privacy-policy.md`: every "Colon, Plain, and Cisco-dot" enumeration becomes "Plain, Colon, Cisco-dot, and Hyphen" (the single-purpose statement in `store/privacy-policy.md:7` and `store/listing.md:89` must keep matching shipped behavior — a listing/policy/behavior contradiction is a CWS removal trigger). Leave screenshots alone (Story 3.2's court — see Out of Scope).
  - [x] `store/listing.md` line ~30 "Shows all three output formats" → four; its packaging instruction references `release/oui-scout-0.0.10.zip` → `0.0.11` (the zip name follows `manifest.json`).
  - [x] `tests/package-extension.test.ts` version strings are **self-contained inline fixtures** (never read the real manifest) — leave them as-is.
- [x] Task 7: Run the gates and verify in Chrome (AC9, AC10)
  - [x] `npm run typecheck` → 0 errors (the closed `CopyState`/`Formats` types sweep every stale literal — fix all reported sites).
  - [x] `npm test` → full suite green, including the untouched `tests/privacy.guard.test.ts`.
  - [x] `npm run build` → production build succeeds.
  - [x] Manual check (`npm run dev` or load `dist/` unpacked): paste `f0:18:98:00:00:00`, confirm four rows in the order Plain, Colon, Cisco-dot, Hyphen, Hyphen reads `F0-18-98-00-00-00`, its Copy writes the exact hyphen string, "Copied" reverts after ~1.5 s, invalid input dashes/disables all four rows, and the popup still fits with no clipping (the shell is fixed 360px wide with `overflow: hidden`; one extra ~46px row keeps total height far under Chrome's 800×600 ceiling).

## Dev Notes

**Scope reversal context.** Hyphen/Windows output was explicitly excluded by Jared when the product was defined (brief decision log item 2, PRD §6.2). Zoom Phone displays MACs with hyphens, so the exclusion is reversed 2026-10-16. `epics.md` FR9 + Epic 4 are the implementation contract; PRD §6.2 carries a supersession note. Do not edit the historical UX artifacts (`DESIGN.md`, `EXPERIENCE.md`) — they document the v1 three-row design; Epic 4 supersedes the row-count/order/tab-order clauses.

**Row order (decided 2026-10-16 by Jared):** Plain, Colon, Cisco-dot, Hyphen. This **reorders the original three** (v1 was Colon, Plain, Cisco-dot) and appends Hyphen last — it is not a pure append. Tab order follows DOM order: input → Plain → Colon → Cisco-dot → Hyphen. The a11y contract test in `render.test.ts` that pins the button sequence is the single place the order is asserted as a sequence; keep it exact.

**Read before writing.** Files this story touches: `src/lib/types.ts`, `src/lib/format.ts`, `src/lib/format.test.ts`, `src/ui/state.ts`, `src/ui/state.test.ts`, `index.html`, `src/ui/render.test.ts`, `manifest.json`, `README.md`, `store/listing.md`, `store/privacy-policy.md`. Files that must NOT change: `src/lib/parse.ts`, `src/lib/lookup.ts`, `src/data/load-oui-data.ts`, `tests/privacy.guard.test.ts`, `src/styles/app.css` (expected), `src/main.ts` (expected), `src/ui/render.ts` (expected), `vite.config.ts`, `package.json`.

**The architecture is already generic — extend types, not logic.** The whole pipeline keys off `FormatKey`/`Formats`: `render()` iterates DOM rows via `data-format` and fills from `formats(canonical)[which]`; the copy handler resolves the same key; `nextState` spreads `[event.format]` into `CopyState`. Adding the type members plus one row of markup turns the feature on. Any hyphen-specific branch in `main.ts`/`render.ts`/`state.ts` is a reinvention — reject it.

**Canonical microcopy.** Exactly one new UI string is introduced: the field-label **"Hyphen"** (10px/800 uppercase via the existing `.field-label` role). All other copy ("Copy"/"Copied", banner states, placeholder) is unchanged. The row label is "Hyphen" — not "Windows", not "Hyphenated".

**Format key naming.** Use `hyphen` everywhere (type member, `data-format`, copy-state key). It matches the domain vocabulary (the parser's separator class, IEEE/Windows convention) and the existing render-test fixture that anticipated the key.

**Regression watchlist (the tests that intentionally say "three"):** `format.test.ts` tuple objects, `state.test.ts` `toEqual` copy literals, `render.test.ts` row-count/order/button-count/`index.html` contract tests, plus the unknown-key fixture trap (Task 5). These are contract tests from Stories 1.5–1.7 and 2.3 — update them to four, never delete them.

**Versioning (project-context.md).** Bump `manifest.json` `version` rightmost segment only: `0.0.10` → `0.0.11`. `package.json` is private and stays `0.0.1`. MV3 allows 1–4 dot-separated integers, each 0–65535, no leading zeros.

**Gates on every change:** `npm run typecheck` + `npm test` + `npm run build` (project-context.md). `npm install` needs no special flags (`.npmrc` pins `legacy-peer-deps=true`).

**Privacy posture unchanged (AC9).** Zero permissions, no network, no persistence; `src/lib/**` stays pure (no DOM/`chrome.*`/I/O) with co-located tests; no barrel files; never throw for expected input; theming stays pure CSS. The Story 1.8 guard suite and the Story 3.1 packaging invariants must pass untouched.

### Project Structure Notes

- All changes follow existing conventions: kebab-case files, camelCase functions, PascalCase types, co-located `*.test.ts`, exact-path imports (no barrels).
- `src/lib/format.ts` mirrors the existing slice/join style — do not introduce a shared "group by n" helper for two lines (reinvention risk; the repo prefers explicit, trivially auditable pure functions).
- Story file + sprint-status.yaml updates accompany this story per BMAD flow.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — FR9, Epic 4, Story 4.1] (implementation contract)
- [Source: `_bmad-output/planning-artifacts/prds/prd-Mac Lookup-2026-10-10/prd.md` §6.2] (superseded exclusion)
- [Source: `_bmad-output/planning-artifacts/briefs/brief-Mac Lookup-2026-10-09/.decision-log.md` item 2] (original exclusion rationale)
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-Mac Lookup-2026-10-10/DESIGN.md` — Format row component, Tab order] (row anatomy still authoritative; row count/tab order amended by Epic 4)
- [Source: `project-context.md`] (versioning, guardrails, contracts)
- [Source: `src/lib/types.ts`, `src/lib/format.ts`, `src/ui/state.ts`, `src/ui/render.ts`, `src/main.ts`, `index.html`] (current implementation — all read during story creation)
- [Source: `_bmad-output/implementation-artifacts/1-5-display-the-three-working-formats.md`, `1-6-copy-any-format-in-one-click-with-confirmation-and-failure-states.md`, `1-7-make-the-popup-keyboard-and-screen-reader-accessible.md`] (the contract tests being amended)

### Out of Scope / Follow-ups

- Store screenshots (`store/screenshots/`) still show three rows — Story 3.2 (in progress) must recapture them from the built popup before submission.
- EUI-64 / decimal / binary formats remain deferred (PRD §6.2).
- No new format settings, toggles, reordering UI, or preference persistence.
- No changes to the packaging script or privacy guard.

## Dev Agent Record

### Agent Model Used

opencode/mimo-v2.6-flash-free

### Debug Log References

- `npm run typecheck` → 0 errors.
- `npm test` → 9 files, 266 tests passed (baseline 3-1: 229; +tests from 3.2 and this story).
- `npm run build` → success; `dist/` shows 4 rows in DOM order plain, colon, cisco, hyphen and `manifest.json` version `0.0.11`.

### Completion Notes List

- Types extended (`Formats`, `FormatKey`, `CopyState`) as closed objects in DOM order `plain | colon | cisco | hyphen` — `tsc` swept every stale literal across `state.test.ts` / `render.test.ts`.
- `formats()` gained `hyphen` via the existing slice/join pattern (separator `-`); no new helpers, no dependencies.
- `IDLE_COPY` gained `hyphen: 'idle'`. `render.ts`, `main.ts`, and `app.css` required no changes — the pipeline is generic over `FormatKey`/`data-format` (verified).
- `index.html` rows reordered to Plain, Colon, Cisco-dot and a Hyphen row appended (DOM order = tab order).
- Contract tests updated to four rows/buttons; the unknown-key fixture (`render.test.ts`) was retargeted from `hyphen` to `eui64` because `hyphen` is now a real key. Added a state test proving the hyphen copy flag resolves, fails, and times out independently.
- Version bumped `0.0.10` → `0.0.11` (manifest only). README + store listing + privacy policy enumerations updated to the four formats (New Order); listing summary retrimmed to 131 chars.
- Manual Chrome check: performed structurally against the built `dist/` (4 rows present in order, `0.0.11`), backed by the happy-dom render/state contract tests. Live GUI confirmation (paste `f0:18:98:00:00:00`, copy hyphen row, light/dark, no clipping) remains for Jared — the residual gap is browser clipboard UX, which no unit test covers.

### File List

- `manifest.json` (modified — version 0.0.11)
- `src/lib/types.ts` (modified — `Formats`/`FormatKey`/`CopyState` gain `hyphen`)
- `src/lib/format.ts` (modified — hyphen output)
- `src/lib/format.test.ts` (modified — four-format expectations)
- `src/ui/state.ts` (modified — `IDLE_COPY` gains `hyphen`)
- `src/ui/state.test.ts` (modified — four-key copy literals + hyphen copy test)
- `src/ui/render.test.ts` (modified — four-row fixtures/assertions, unknown-key fixture retargeted)
- `index.html` (modified — rows reordered + Hyphen row)
- `README.md` (modified — four formats, version)
- `store/listing.md` (modified — four formats, version, summary)
- `store/privacy-policy.md` (modified — four formats)
- `_bmad-output/implementation-artifacts/4-1-add-the-hyphen-format-with-one-click-copy.md` (this story)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (status)

### Change Log

- 2026-10-16: Implemented Story 4.1 — Hyphen output format added with per-row copy; rows reordered to Plain, Colon, Cisco-dot, Hyphen; version bumped to 0.0.11; docs updated. Typecheck + 266 tests + build all green.

