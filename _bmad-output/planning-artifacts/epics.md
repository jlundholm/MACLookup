---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - '{planning_artifacts}/prds/prd-Mac Lookup-2026-10-10/prd.md'
  - '{planning_artifacts}/prds/prd-Mac Lookup-2026-10-10/addendum.md'
  - '{planning_artifacts}/architecture.md'
  - '{planning_artifacts}/ux-designs/ux-Mac Lookup-2026-10-10/DESIGN.md'
  - '{planning_artifacts}/ux-designs/ux-Mac Lookup-2026-10-10/EXPERIENCE.md'
  - '{planning_artifacts}/ux-designs/ux-Mac Lookup-2026-10-10/mockups/status-popup.html'
---

# Mac Lookup - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Mac Lookup, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Accept and normalize any common MAC form — a user can paste a MAC in colon, hyphen, Cisco-dot, space-grouped, or bare-hex form and the system reduces it to the Canonical value (12 uppercase hex digits). Leading/trailing whitespace and newlines are trimmed; only ASCII separators (`:`, `-`, `.`) and ASCII whitespace are stripped; any other character (including non-ASCII/homoglyphs) makes input invalid; a paste that does not reduce to exactly one 12-hex-digit value (e.g., multiple MACs) is invalid in v1.

FR2: Reject invalid input clearly — an empty field is a neutral resting state with no error; non-empty input that is not exactly 12 hex digits after stripping shows a short inline message ("Not a valid MAC address"); all output fields and the Vendor result are cleared/disabled while invalid (no stale/partial result); the field stays editable and correcting input restores results with no reload.

FR3: Display the three working formats — for the current MAC the popup shows Colon (`AA:BB:CC:DD:EE:FF`), Plain (`AABBCCDDEEFF`), and Cisco-dot (`AABB.CCDD.EEFF`) formats at the same time, all uppercase, immediately on a valid parse with no submit button or manual trigger.

FR4: One-click copy per format — activating a format's copy control places exactly that format string on the clipboard; a brief (~1.5 s) confirmation is shown then clears; if the clipboard write is rejected the popup shows a failure state and never reports "Copied" when the copy did not occur; copying requires no declared permission (user gesture).

FR5: Resolve Vendor offline from the OUI prefix — for a MAC whose prefix exists in the OUI database the Vendor name is displayed together with the Prefix used; lookup succeeds offline with zero outbound network requests; /24, /28, and /36 prefixes all resolve (MA-L, MA-M, MA-S coverage); when registries overlap the longest matching Prefix wins (MA-S /36 > MA-M /28 > MA-L /24).

FR6: Show a clear no-match state — a valid MAC whose prefix is absent from the database shows "Unknown vendor" and the Prefix queried; this state is visually and textually distinct from the invalid-input state (FR-2).

FR7: Follow the light/dark preference automatically — the popup renders light or dark to match the current system preference with no user action; changing the OS preference while open updates it live; no manual toggle is present.

FR8: Publish with a minimal-permission, no-collection posture (conditional on publish decision) — the manifest declares no host permissions and no runtime permission beyond what a user-gesture clipboard write requires; a store listing and privacy policy stating "no data collection" are present; a network trace during a full lookup and copy shows zero outbound requests.

FR9: Display the Hyphen output format — for a valid MAC the popup shows four working formats at once — Plain (`AABBCCDDEEFF`), Colon (`AA:BB:CC:DD:EE:FF`), Cisco-dot (`AABB.CCDD.EEFF`), and Hyphen (`AA-BB-CC-DD-EE-FF`) — in that fixed order, all uppercase, each with its own one-click copy and confirmation/failure behavior identical to the existing rows. This also **reorders** the v1 three (which rendered Colon, Plain, Cisco-dot) so Plain leads and Hyphen trails. Input parsing is unchanged (the hyphen form was already accepted by FR1). This **supersedes** the v1 scope line "Hyphen/Windows as an output format — explicitly excluded by the user" (PRD §6.2); the reversal was authorized by Jared 2026-10-16 because Zoom Phone displays MAC addresses in hyphen form.

### NonFunctional Requirements

NFR1 (Performance): Parse + three conversions + Vendor lookup complete in < 100 ms; popup first paint feels instant.

NFR2 (Privacy & Security): Zero outbound network requests at runtime; no telemetry; the MAC, clipboard content, and results are never persisted or transmitted.

NFR3 (Offline): All v1 features work with no network; nothing degrades without connectivity.

NFR4 (Correctness): Deterministic, verified conversion across all accepted forms and all bundled registries.

NFR5 (Package size): Bundled OUI database compressed to ≤ ~2 MB; total package ≤ ~3 MB.

NFR6 (Platform): Chrome desktop, Manifest V3; popup within the 800×600 limit.

NFR7 (Accessibility): Every interactive control reachable by Tab with visible focus state; both themes meet WCAG AA contrast for text; copy confirmations exposed to assistive tech.

NFR8 (Maintainability): Database refreshed via a repeatable build step; no runtime update path.

### Additional Requirements

- **Starter Template (CRXJS + Vite + TypeScript, vanilla-ts, no UI framework) — drives Epic 1 Story 1.** Init via `npm create vite@latest . -- --template vanilla-ts`; `npm install`; `npm i -D @crxjs/vite-plugin@latest chrome-types`. TypeScript strict, ES modules, plain CSS, Vitest for unit tests.
- **Zero-permission MV3 manifest** — `manifest_version: 3`, `action.default_popup`, name/version/description/icons only. No `permissions`, no `host_permissions`, no `background`, no `content_scripts`.
- **Pure pipeline split** — `src/lib/**` (parse, format, lookup) MUST be free of DOM, `chrome.*`, and I/O; each exported function ships a co-located unit test.
- **Build-time OUI data pipeline** — `scripts/build-oui-data.ts` (Node) downloads IEEE MA-L/MA-M/MA-S CSVs, extracts Assignment → Organization Name, uppercases prefixes, writes `public/oui-data.json`. Deterministic and repeatable.
- **OUI dataset schema (shared contract)** — top-level `schemaVersion` (int), `generatedAt` (ISO-8601 UTC), `sources`, `counts`, `entries` (flat JSON object: uppercase hex prefix key of 6/7/9 chars → vendor name). Key length routes registry (6→MA-L, 7→MA-M, 9→MA-S). Emitted into `public/` and loaded at runtime via `fetch(chrome.runtime.getURL('oui-data.json'))`.
- **Single I/O boundary** — `src/data/load-oui-data.ts` fetches the local `chrome-extension://…/oui-data.json` resource and builds three `Map<string,string>` (l24, m28, s36). No HTTP, no messaging, no service worker.
- **Pinned function contracts** — `parseMac(raw) → { ok: true, canonical } | { ok: false, reason: 'invalid' }`; `formats(canonical) → { colon, plain, cisco }`; `lookupVendor(canonical, index) → { ok: true, vendor, prefix } | { ok: false, prefix }`. Discriminated unions, never throw for expected input.
- **Popup state + pure render** — one `PopupState` object (`ready, raw, canonical, status: 'empty'|'found'|'miss'|'invalid', vendor?, prefix?, copied: { colon, plain, cisco }`); pure `nextState(state, event)`; single pure `render(root, state)` DOM writer; idempotent; `data-status` attribute on popup root.
- **Privacy guard test suite** — `tests/privacy.guard.test.ts`: manifest assertion (fails if `permissions`/`host_permissions` non-empty) + source scan (fails on remote URL literals or network APIs; permits only `fetch` against `chrome-extension:`/`getURL()`).
- **Build/scripts** — `dev` (`vite`), `build` (`vite build`), `build:data` (Node generator), `typecheck` (`tsc --noEmit`), `test` (`vitest`), `zip` (package `dist/` for store upload).
- **Code conventions** — kebab-case files/dirs, camelCase functions/vars, PascalCase types, SCREAMING_SNAKE constants, kebab-case CSS classes matching DESIGN.md; tests co-located `*.test.ts`; no barrel files.
- **Canonical microcopy (invent no new strings)** — "Paste a MAC address", "Not a valid MAC address", "Unknown vendor", "Copied", "Found" / "Not found" / "Invalid".
- **Verification gaps to close during implementation** — (1) dataset-load performance (`JSON.parse` + three Maps for ~54k entries) measured against < 100 ms; (2) CRXJS dev-mode resource path (`fetch(getURL('oui-data.json'))`) resolves; (3) pinned test fixtures (e.g., `F01898` → "Apple, Inc.", a known MA-M and MA-S prefix, a no-match MAC).
- **Distribution** — unpacked MV3 extension in `dist/` for personal use; zipped `dist/` for store upload. No hosting, no servers, no monitoring, no logging.

### UX Design Requirements

UX-DR1: Implement the design-token system as CSS custom properties in `src/styles/app.css`, mirroring DESIGN.md frontmatter exactly: monochrome surface tokens (surface, field, border, text, text-muted, focus-ring) in light+dark pairs; the three status triads (found, miss, invalid) in light+dark pairs; typography roles; corner radii (sm 6 / md 8 / lg 10 / full); spacing scale (1–4). `color-scheme: light dark` on `:root`.

UX-DR2: Build the popup shell component — single fixed 360px surface, `rounded.lg`, surface background, 1px border frame, 12px padding, soft `0 1px 3px rgba(0,0,0,0.16)` shadow (the only elevation), within Chrome's 800×600 ceiling.

UX-DR3: Build the MAC input component — the only editable control, full-width on field background, 1.5px border, `rounded.md`, 11px/12px padding, uppercased bold 14px value with 0.03em letter-spacing, muted placeholder, neutral-ink focus ring, invalid red border/text.

UX-DR4: Build the result banner component — exactly one, always present once input is non-empty; hero row with status-lamp + stack of state-label over value + prefix pinned right; fill/border/foreground switch as a unit per found/miss/invalid sub-tokens; carries a text state label.

UX-DR5: Build the status lamp component — a filled 13px circle in `currentColor` with a 4px same-color halo; decorative, `aria-hidden`, not focusable; the text state label is authoritative.

UX-DR6: Build the format row component — three fixed rows (Colon, Plain, Cisco-dot, always that order, always all three); field background, 1px border, `rounded.md`, 4px left status rail; field-label over readout value; selectable value; empty values in text-muted; inert (— value, disabled copy) when input is invalid.

UX-DR7: Build the copy button component — one per row, outlined, `rounded.sm`, button typography (11.5px/800); default ink on border; hover border/text take the active status color; on success briefly fills with the found triad; disabled style (muted ink at 0.5 opacity) when input is invalid.

UX-DR8: Render the "OUI Scout" wordmark as a text element at wordmark typography (12.5px/700) — no logo, icon, or lockup — in the fixed vertical order wordmark → MAC input → result banner → three format rows, no scrolling.

UX-DR9: Apply the full typographic role set — system UI font stack (no webfont); body 14px/400; mac-input 14px/700 uppercase; readout 13.5px/700 with `font-variant-numeric: tabular-nums`; field-label 10px/800 uppercase; state-label 12px/800 uppercase with wide tracking; prefix 11px/700 tabular; button 11.5px/800; wordmark 12.5px/700. Uppercase reserved for the input value and micro-labels.

UX-DR10: Accessibility — the result banner is an `aria-live="polite"` region announcing state changes with distinct announcements ("Found, Apple, Inc." / "Not found, unknown vendor" / "Not a valid MAC address"); copy confirmations change the button's accessible name to "Copied"; each interactive control (input + three copy buttons) is Tab-reachable with a visible neutral focus ring; Tab order input → Colon copy → Plain copy → Cisco-dot copy.

UX-DR11: Non-color-only status (WCAG 1.4.1) — found/miss/invalid each carry a distinct text state label and value, so color is redundant reinforcement; both themes meet WCAG AA text contrast.

UX-DR12: Reduce Motion — under `prefers-reduced-motion: reduce`, skip the ~120 ms state cross-fade and swap state instantly; the input has an associated label for assistive tech even though no visible label is shown.

UX-DR13: Implement the state patterns — cold open/empty resting state (autofocused field, placeholder, no banner/rows/error); focus; valid+found; valid+miss; invalid; correcting-toward-valid (re-evaluate on each change, ~120 ms cross-fade); per-row copy confirmation (~1.5 s) and clipboard-rejected failure state; live dark/light; offline indistinguishable from online (no offline banner).

UX-DR14: Implement the interaction primitives — input autofocuses on popup open (paste lands immediately); paste-first fuzzy parse on change with no second action; Tab/Shift+Tab in reading order; Enter/Space activate a focused copy button; single click copies a row; no drag, hover-only affordances, right-click menus, or non-standard shortcuts.

UX-DR15: Use the canonical microcopy verbatim — placeholder "Paste a MAC address"; invalid "Not a valid MAC address"; no-match "Unknown vendor"; copy "Copied"; state labels "Found" / "Not found" / "Invalid". Terse, functional, no personality, no emoji, no exclamation marks.

### FR Coverage Map

FR1: Epic 1 - Accept and normalize any common MAC form
FR2: Epic 1 - Reject invalid input clearly
FR3: Epic 1 - Display the three working formats
FR4: Epic 1 - One-click copy per format
FR5: Epic 2 - Resolve Vendor offline from the OUI prefix
FR6: Epic 2 - Show a clear no-match state
FR7: Epic 1 - Follow the light/dark preference automatically
FR8: Epic 3 - Publish with a minimal-permission, no-collection posture (conditional)
FR9: Epic 4 - Display the Hyphen output format (supersedes the v1 hyphen exclusion)

## Epic List

### Epic 1: Convert a MAC into every format you need — offline and native

Jared can open the OUI Scout popup, paste a MAC in any common form, see the canonical normalization, and read and one-click-copy all three working formats (Colon, Plain, Cisco-dot) — instantly, offline, with clear inline handling of invalid input and automatic light/dark appearance. This epic stands alone as a complete private converter and establishes the popup shell, design-token system, accessibility floor, and zero-permission manifest later epics build on.

**FRs covered:** FR1, FR2, FR3, FR4, FR7

### Epic 2: Name the device behind the MAC

Building on the popup, Jared sees the hardware Vendor for a pasted MAC, resolved fully offline from the bundled OUI database, plus a distinct "Unknown vendor" state (with the queried prefix) when a valid MAC's prefix is absent. Delivered via a repeatable build-time data pipeline.

**FRs covered:** FR5, FR6

### Epic 3: Ship it to the Chrome Web Store (conditional)

If Jared decides to publish, OUI Scout can be submitted with a minimal-permission, no-collection posture: a store listing and privacy policy stating "no data collection," a packaged zip, and the privacy guard suite passing against the final build. Conditional on the publish decision (and resolving OQ-1).

**FRs covered:** FR8

### Epic 4: Match the hyphen shape Zoom Phone and Windows tools display

Jared's v1 scope deliberately excluded a hyphen output format (PRD §6.2). Zoom Phone — and common Windows tooling — displays MAC addresses hyphen-separated, so the popup now shows and one-click-copies the Hyphen form alongside Colon, Plain, and Cisco-dot. Purely additive: same offline, zero-permission, per-row copy machinery, no parser or lookup changes.

**FRs covered:** FR9

## Epic 1: Convert a MAC into every format you need — offline and native

Jared can open the OUI Scout popup, paste a MAC in any common form, see the canonical normalization, and read and one-click-copy all three working formats (Colon, Plain, Cisco-dot) — instantly, offline, with clear inline handling of invalid input and automatic light/dark appearance. This epic stands alone as a complete private converter and establishes the popup shell, design-token system, accessibility floor, and zero-permission manifest later epics build on.

**FRs covered:** FR1, FR2, FR3, FR4, FR7

### Story 1.1: Scaffold the extension, zero-permission manifest, and popup shell

As the builder,
I want a runnable Chrome MV3 extension with the zero-permission manifest and an opening popup shell,
So that I have a loadable foundation for every later story.

**Acceptance Criteria:**

**Given** a fresh repository,
**When** I scaffold the project (`npm create vite@latest . -- --template vanilla-ts`, `npm install`, `npm i -D @crxjs/vite-plugin@latest chrome-types`) and run `npm run dev`,
**Then** Chrome loads the unpacked extension and clicking the toolbar icon opens the popup.
**And** `vite.config.ts` uses only `crx({ manifest })` and `tsconfig.json` is `strict: true` with `chrome-types`.

**Given** the built/loaded `manifest.json`,
**When** the manifest is inspected,
**Then** it is `manifest_version: 3` and declares only `action.default_popup`, name, version, description, and icons,
**And** it contains no `permissions`, no `host_permissions`, no `background`, and no `content_scripts` (NFR2).

**Given** the running popup,
**When** it opens,
**Then** it renders a single 360px-wide, one-column shell within Chrome's 800×600 ceiling, with the fixed vertical order wordmark → MAC input → result-banner slot → three format-row slots and no scrolling (UX-DR2, UX-DR8).

**Given** the project,
**When** I run `npm run build`,
**Then** an unpacked MV3 extension is emitted to `dist/`,
**And** `npm run typecheck` (`tsc --noEmit`) passes with no errors.

### Story 1.2: Design tokens, typography, and automatic light/dark theming

As Jared,
I want the popup to use the OUI Scout design tokens and follow the system light/dark preference automatically,
So that it looks native and needs no manual toggle.

**Acceptance Criteria:**

**Given** the design system,
**When** `src/styles/app.css` is inspected,
**Then** every DESIGN.md token is present as a CSS custom property — monochrome surfaces (surface, field, border, text, text-muted, focus-ring) and the three status triads (found, miss, invalid), each in light and dark pairs; corner radii sm 6 / md 8 / lg 10 / full; spacing scale 1–4,
**And** `color-scheme: light dark` is set on `:root`.

**Given** the OS is in light mode,
**When** the popup opens,
**Then** it renders in light styling;
**And** with the OS in dark mode it renders in dark styling (FR7).

**Given** the popup is open,
**When** the OS light/dark preference changes,
**Then** the popup updates live with no reload,
**And** no manual theme toggle exists anywhere in the UI.

**Given** the typographic roles,
**When** text is rendered,
**Then** body 14px/400, mac-input 14px/700 uppercase, readout 13.5px/700 with `font-variant-numeric: tabular-nums`, field-label 10px/800 uppercase, state-label 12px/800 uppercase with wide tracking, prefix 11px/700 tabular, button 11.5px/800, and wordmark 12.5px/700 all use the system font stack with no webfont (UX-DR9).

**Given** either theme,
**When** text contrast is measured,
**Then** body and status text meet WCAG AA (≥ 4.5:1) (UX-DR11).

### Story 1.3: Paste and normalize any common MAC form

As Jared,
I want to paste a MAC in any common form and have it reduce to one canonical value,
So that I never reformat by hand.

**Acceptance Criteria:**

**Given** the MAC input field,
**When** I paste `aa:bb:cc:dd:ee:ff`, `AA-BB-CC-DD-EE-FF`, `aabb.ccdd.eeff`, `AA BB CC DD EE FF`, or `AABBCCDDEEFF`,
**Then** each reduces to the Canonical value `AABBCCDDEEFF` (FR1).

**Given** pasted input,
**When** it has leading/trailing whitespace or newlines,
**Then** those are trimmed before evaluation;
**And** hex letters are accepted in either case while the Canonical value is uppercase.

**Given** pasted input,
**When** it contains any character other than ASCII separators (`:`, `-`, `.`) and ASCII whitespace,
**Then** the input is treated as invalid (non-ASCII separators and homoglyphs are not stripped) (FR1).

**Given** a paste that does not reduce to exactly one 12-hex-digit value (e.g., several MACs copied from a table export),
**When** it is parsed,
**Then** it is invalid — no first-match guessing (FR1).

**Given** the parser,
**When** I inspect `src/lib/parse.ts`,
**Then** `parseMac(raw)` is a pure function returning `{ ok: true, canonical } | { ok: false, reason: 'invalid' }` with no DOM/`chrome.*`/I-O dependencies (Additional Requirements),
**And** a co-located `parse.test.ts` covers every form and edge case above (UX-DR3).

### Story 1.4: Reject invalid input clearly

As Jared,
I want a clear inline error and no results when my paste isn't a MAC,
So that I'm told, not misled.

**Acceptance Criteria:**

**Given** the field is empty,
**When** the popup is at rest,
**Then** it shows the placeholder "Paste a MAC address" with no banner, no rows, and no error — a neutral resting state (FR2, UX-DR13).

**Given** a non-empty field,
**When** the input is not exactly 12 hex digits after separator/whitespace stripping,
**Then** a short inline message "Not a valid MAC address" is shown (FR2, UX-DR15).

**Given** invalid input,
**When** the state renders,
**Then** all output format rows are cleared or disabled and no stale or partial result remains,
**And** the field border uses the invalid triad red (FR2).

**Given** invalid input,
**When** I correct the field to a valid MAC,
**Then** results are restored immediately with no reload (FR2).

### Story 1.5: Display the three working formats

As Jared,
I want to see Colon, Plain, and Cisco-dot at the same time,
So that I can grab whichever shape each system wants.

**Acceptance Criteria:**

**Given** the Canonical value `AABBCCDDEEFF`,
**When** a valid MAC is parsed,
**Then** the popup shows `AA:BB:CC:DD:EE:FF`, `AABBCCDDEEFF`, and `AABB.CCDD.EEFF`, all uppercase (FR3).

**Given** a valid parse,
**When** the results render,
**Then** all three formats appear immediately with no submit button or manual trigger (FR3).

**Given** the format rows,
**When** they render,
**Then** there are exactly three fixed rows in the order Colon, Plain, Cisco-dot, always all three,
**And** each value is selectable text (UX-DR6).

**Given** the design system,
**When** a format row renders,
**Then** it uses field background, a 1px border, `rounded.md`, a 4px left status rail, and a field-label stacked over the readout value, with empty values in text-muted (UX-DR6).

**Given** the formatter,
**When** I inspect `src/lib/format.ts`,
**Then** `formats(canonical)` is a pure function returning `{ colon, plain, cisco }`,
**And** a co-located `format.test.ts` covers the three outputs.

### Story 1.6: Copy any format in one click, with confirmation and failure states

As Jared,
I want a one-click copy on each row with honest feedback,
So that I can paste directly into a config.

**Acceptance Criteria:**

**Given** a valid MAC with rendered format rows,
**When** I activate a row's copy control,
**Then** exactly that format string is placed on the clipboard (FR4).

**Given** a successful copy,
**When** the write completes,
**Then** the button briefly shows "Copied" for ~1.5 s and then reverts,
**And** the confirmation is independent per row (FR4, UX-DR13).

**Given** the browser rejects the clipboard write,
**When** I activate copy,
**Then** the row shows the failure state instead of the confirmation,
**And** the UI never displays "Copied" when the write did not occur (FR4).

**Given** the copy control,
**When** it is activated,
**Then** the copy occurs under a user gesture with no declared permission required (FR4, NFR2).

**Given** the copy button visual states,
**When** it renders in each state,
**Then** it uses the outlined `rounded.sm` default, takes the active status color on hover, fills with the found triad on success, and applies the muted disabled style when input is invalid (UX-DR7).

### Story 1.7: Make the popup keyboard- and screen-reader-accessible

As Jared,
I want to operate the popup entirely by keyboard and have state announced,
So that it is usable with assistive tech.

**Acceptance Criteria:**

**Given** the popup is opened,
**When** it renders,
**Then** the MAC input is focused automatically so a paste lands immediately (UX-DR14).

**Given** the popup is open,
**When** I press `Tab` / `Shift+Tab`,
**Then** focus moves in reading order input → Colon copy → Plain copy → Cisco-dot copy,
**And** each focused control shows a visible neutral `{colors.focus-ring}` ring (never status color) (UX-DR10).

**Given** a focused copy button,
**When** I press `Enter` or `Space`,
**Then** the copy is triggered (UX-DR14).

**Given** the result region,
**When** the state changes,
**Then** it is an `aria-live="polite"` region that announces the change (invalid is announced in this epic; found and miss announcements are wired in Epic 2) (UX-DR10).

**Given** a copy confirmation,
**When** the button swaps to "Copied",
**Then** its accessible name changes to "Copied" and reverts afterward (UX-DR10).

**Given** any outcome,
**When** it is displayed,
**Then** meaning is never carried by color alone — each state has a distinct text label (WCAG 1.4.1) (UX-DR11).

**Given** `prefers-reduced-motion: reduce`,
**When** state changes,
**Then** the ~120 ms cross-fade is skipped and state swaps instantly (UX-DR12).

**Given** the input,
**When** inspected for assistive tech,
**Then** it has an associated label even though no visible label is shown (UX-DR12).

### Story 1.8: Enforce the privacy posture with a guard test suite

As the builder,
I want automated tests that fail if permissions or network calls are ever introduced,
So that privacy-by-construction cannot silently regress.

**Acceptance Criteria:**

**Given** the built `manifest.json`,
**When** `tests/privacy.guard.test.ts` runs,
**Then** it fails if `permissions` or `host_permissions` is non-empty (NFR2).

**Given** the `src/` sources,
**When** the source-scan test runs,
**Then** it fails on any remote URL literal or on `XMLHttpRequest`, `WebSocket`, or `EventSource` usage,
**And** it permits only `fetch` calls against a `chrome-extension:` / `getURL()` target (NFR2).

**Given** the guard suite,
**When** I run `npm test`,
**Then** the guard tests execute under Vitest alongside the unit tests.

## Epic 2: Name the device behind the MAC

Building on the popup, Jared sees the hardware Vendor for a pasted MAC, resolved fully offline from the bundled OUI database, plus a distinct "Unknown vendor" state (with the queried prefix) when a valid MAC's prefix is absent. Delivered via a repeatable build-time data pipeline.

**FRs covered:** FR5, FR6

### Story 2.1: Generate the bundled OUI database at build time

As the builder,
I want a repeatable build step that generates the bundled OUI dataset from the IEEE CSVs,
So that vendor lookup is offline, deterministic, and refreshable without any runtime updater.

**Acceptance Criteria:**

**Given** the build scripts,
**When** `npm run build:data` runs,
**Then** `scripts/build-oui-data.ts` (Node) downloads the IEEE MA-L, MA-M, and MA-S CSVs and extracts Assignment → Organization Name for each row.

**Given** the generation script,
**When** it writes `public/oui-data.json`,
**Then** the artifact has a top-level `schemaVersion` (int), `generatedAt` (ISO-8601 UTC), `sources` (registry → filename), `counts`, and `entries`,
**And** `entries` is a flat JSON object whose keys are **uppercase hex prefixes** of 6, 7, or 9 characters and whose values are vendor names verbatim from source.

**Given** the dataset keys,
**When** the registry is determined,
**Then** key length routes it — 6 → MA-L, 7 → MA-M, 9 → MA-S — with no registry letter in the key and all hex uppercase (Additional Requirements).

**Given** unchanged source CSVs,
**When** the script runs again,
**Then** it produces a deterministic, repeatable artifact recording `generatedAt` and `counts`.

**Given** the build output,
**When** `npm run build` runs,
**Then** `oui-data.json` is emitted into `public/` and copied verbatim to `dist/` (loaded at runtime, not imported),
**And** the dataset stays within the size budget (DB ≤ ~2 MB compressed; total package ≤ ~3 MB) (NFR5).

**Given** the extension,
**When** vendor data is needed,
**Then** there is no runtime update path — the dataset is only refreshed via the build step (NFR8).

### Story 2.2: Load the dataset and resolve the Vendor with longest-prefix match

As Jared,
I want the popup to resolve the Vendor for a MAC's prefix entirely offline,
So that I know the manufacturer without any network request.

**Acceptance Criteria:**

**Given** the popup initializes,
**When** the dataset loads,
**Then** `src/data/load-oui-data.ts` (the single I/O boundary) calls `fetch(chrome.runtime.getURL('oui-data.json'))`, parses the JSON, and builds three `Map<string,string>` (`l24`, `m28`, `s36`) once,
**And** the lookup succeeds with the device offline and produces zero outbound network requests (FR5, NFR2, NFR3).

**Given** a MAC whose prefix exists in the dataset,
**When** lookup runs,
**Then** the Vendor name is resolved together with the Prefix used,
**And** `/24`, `/28`, and `/36` prefixes all resolve (MA-L, MA-M, MA-S coverage) (FR5).

**Given** overlapping registries,
**When** more than one prefix matches,
**Then** the longest matching Prefix wins (MA-S /36 > MA-M /28 > MA-L /24) so the most specific assignment is returned (FR5, NFR4).

**Given** the lookup module,
**When** I inspect `src/lib/lookup.ts`,
**Then** `lookupVendor(canonical, index)` is a pure function returning `{ ok: true, vendor, prefix } | { ok: false, prefix }`, uses exact uppercase-hex-string keys (never numeric ranges), and never throws for expected input (Additional Requirements),
**And** a co-located `lookup.test.ts` covers the pinned fixtures — `F01898` → "Apple, Inc.", a known MA-M prefix, a known MA-S prefix, and a no-match MAC (verification gap 3).

**Given** the dataset (~54,000 prefixes),
**When** the popup loads and a MAC is pasted,
**Then** `JSON.parse` + building the three Maps completes within a measured budget and paste → result is < 100 ms after load (NFR1, verification gap 1).

**Given** the local dataset fails to load (should be unreachable for a local resource),
**When** the failure is caught,
**Then** the popup shows a distinct, non-blocking "database unavailable" state rather than crashing (Additional Requirements).

### Story 2.3: Show the Vendor and the "Unknown vendor" no-match state in the result banner

As Jared,
I want the Vendor name — or a clear "Unknown vendor" — shown in one result banner,
So that I can tell "vendor found," "looked up, no match," and "invalid" apart at a glance.

**Acceptance Criteria:**

**Given** a non-empty input,
**When** the popup renders,
**Then** exactly one result banner is present with the anatomy status-lamp + state-label stacked over the value + prefix pinned right (UX-DR4).

**Given** a MAC whose prefix resolves,
**When** the found state renders,
**Then** the banner uses the found (green) triad and shows "Found", the Vendor name, and the prefix queried (FR5).

**Given** a valid MAC whose prefix is absent,
**When** the miss state renders,
**Then** the banner uses the miss (amber) triad and shows "Not found", "Unknown vendor", and the prefix queried,
**And** the state is both textually and chromatically distinct from the invalid state (FR6, UX-DR13).

**Given** invalid input,
**When** the banner renders,
**Then** it uses the invalid (red) triad and shows "Invalid" and "Not a valid MAC address", the field border is red, and all rows are inert,
**And** this banner invalid state supersedes the standalone inline error from Story 1.4 (FR2, UX-DR4).

**Given** the status lamp,
**When** it renders,
**Then** it is a filled 13px `currentColor` circle with a 4px same-color halo, `aria-hidden`, not focusable,
**And** the text state label carries the meaning (UX-DR5).

**Given** the miss state,
**When** the format rows render,
**Then** they still convert and copy normally (only the invalid state makes them inert) (UX-DR13).

**Given** the result banner is an `aria-live="polite"` region,
**When** the state changes,
**Then** it announces "Found, Apple, Inc." for found and "Not found, unknown vendor" for miss,
**And** no outcome relies on color alone (UX-DR10, UX-DR11).

**Given** all banner states,
**When** copy is shown,
**Then** the canonical microcopy is used verbatim (UX-DR15).

## Epic 3: Ship it to the Chrome Web Store (conditional)

If Jared decides to publish, OUI Scout can be submitted with a minimal-permission, no-collection posture: a store listing and privacy policy stating "no data collection," a packaged zip, and the privacy guard suite passing against the final build. Conditional on the publish decision (and resolving OQ-1).

> **OQ-1 resolved 2026-10-14** (Option A — IEEE's public listing carries no redistribution restriction; see `oq-1-ieee-redistribution-resolution.md`). The Story 3.2 licensing gate is therefore cleared; only the publish decision itself remains.

> **Prerequisite (human, not a story):** publishing requires a registered Chrome Web Store developer account — one-time registration fee, Google account (developer.chrome.com/docs/webstore/register). **RESOLVED 2026-10-14** — account created and the one-time fee paid.

**FRs covered:** FR8

### Story 3.1: Package the built extension for store submission

As the builder,
I want a repeatable packaging step,
So that I can upload a consistent, versioned build to the Chrome Web Store.

**Acceptance Criteria:**

**Given** a successful production build,
**When** I run the `zip` script,
**Then** it packages `dist/` into an archive suitable for store upload.

**Given** the packaged artifact,
**When** versions are inspected,
**Then** the extension version travels in `manifest.json` and the dataset version is recorded in `oui-data.json` (Additional Requirements).

**Given** the packaged extension,
**When** it is installed in Chrome,
**Then** it loads as an MV3 extension with no install-time permission warnings (FR8, NFR6).

### Story 3.2: Publish a store listing and privacy policy with a "no data collection" disclosure

As the builder,
I want a store listing and privacy policy stating no data collection,
So that publication meets Chrome Web Store requirements without weakening the privacy stance.

**Acceptance Criteria:**

**Given** the submission,
**When** the store listing and privacy policy are prepared,
**Then** both state "no data collection" and the listing accurately reflects the single-purpose (MAC converter + OUI vendor lookup), offline, no-network behavior (FR8).

**Given** the shipped manifest,
**When** it is inspected,
**Then** it declares no host permissions and no runtime permission beyond what a user-gesture clipboard write requires (FR8).

**Given** the store listing assets,
**When** the listing is prepared in the developer dashboard,
**Then** it includes at least one screenshot of the shipped popup (light and dark preferred) captured from the **built** `dist/` — not the dev harness — and no image or claim that misrepresents the extension's single purpose (FR8; CWS "Supplying Images" / listing requirements).

**Given** the developer dashboard's Privacy tab,
**When** the privacy fields are completed,
**Then** the single-purpose statement names MAC conversion + offline OUI vendor lookup, the remote-code question is answered **No** (true by construction — no remote code, no eval; enforced by the Story 1.8 guard suite and verified in Story 3.3), and the data-collection declaration is **no data collected**, consistent with the privacy policy (FR8).

**Given** the open licensing question,
**When** publication is attempted,
**Then** OQ-1 (IEEE redistribution license) is resolved first (e.g., an openly licensed dataset, IEEE permission, or accepted risk with clear attribution),
**And** publication proceeds only after that resolution (PRD §11).

### Story 3.3: Verify the no-collection posture on the final build

As the builder,
I want verification that the final build makes zero outbound requests,
So that I can publish with confidence in the no-collection claim.

**Acceptance Criteria:**

**Given** the final build is loaded in Chrome,
**When** I run a network trace across a full lookup and copy,
**Then** zero outbound requests are observed (FR8, NFR2).

**Given** the final build,
**When** `tests/privacy.guard.test.ts` runs,
**Then** it passes — the built manifest has empty `permissions` and `host_permissions`, and the source scan finds no remote URLs or network APIs (FR8).

**Given** valid MACs whose prefix is present in the bundled database,
**When** lookup runs,
**Then** 100% resolve to a Vendor with no false "Unknown" on in-coverage prefixes (SM-4).

**Given** the shipped extension,
**When** its behavior is reviewed,
**Then** no telemetry, analytics, or crash reporting is present (PRD §5 Non-Goals, NFR2).

## Epic 4: Match the hyphen shape Zoom Phone and Windows tools display

Jared's v1 scope deliberately excluded a hyphen output format (PRD §6.2, brief decision log item 2: "Windows/hyphen output explicitly excluded by the user"). Zoom Phone — and common Windows tooling — displays MAC addresses hyphen-separated, so the popup now shows and one-click-copies the Hyphen form alongside Colon, Plain, and Cisco-dot. Purely additive: same offline, zero-permission, per-row copy machinery; no parser, dataset, lookup, or manifest-permission changes.

**FRs covered:** FR9

> **Scope reversal record (2026-10-16):** the hyphen exclusion is superseded by FR9 at Jared's request. This epic is the source of truth; PRD §6.2 carries a supersession note. The v1 UX artifacts (`ux-designs/…/DESIGN.md`, `EXPERIENCE.md`) still describe "three fixed rows" — Epic 4 supersedes that clause; do not edit the historical UX files.

### Story 4.1: Add the Hyphen format with one-click copy

As Jared,
I want the Hyphen format shown and copyable alongside Colon, Plain, and Cisco-dot,
So that I can paste the exact shape Zoom Phone displays without reformatting by hand.

**Acceptance Criteria:**

**Given** the Canonical value `AABBCCDDEEFF`,
**When** a valid MAC is parsed,
**Then** the popup shows four formats — `AABBCCDDEEFF`, `AA:BB:CC:DD:EE:FF`, `AABB.CCDD.EEFF`, `AA-BB-CC-DD-EE-FF` — all uppercase (FR9).

**Given** the format rows,
**When** they render,
**Then** there are exactly four fixed rows in the order Plain, Colon, Cisco-dot, Hyphen, always all four,
**And** each value is selectable text (FR9, UX-DR6 as amended by Epic 4).

**Given** the Hyphen row,
**When** it renders,
**Then** it uses the same format-row anatomy as the others — field background, 1px border, `rounded.md`, 4px left status rail, field-label "Hyphen" over the readout value, empty value in text-muted (UX-DR6).

**Given** a valid MAC with rendered format rows,
**When** I activate the Hyphen row's copy control,
**Then** exactly `AA-BB-CC-DD-EE-FF` is placed on the clipboard,
**And** the confirmation (~1.5 s "Copied"), per-row independence, and clipboard-rejected failure state behave identically to the existing rows (FR4/FR9).

**Given** invalid input,
**When** the Hyphen row renders,
**Then** it is inert — em-dash value, disabled copy — like every other row (FR2).

**Given** the popup,
**When** I press `Tab` / `Shift+Tab`,
**Then** focus moves in reading order input → Plain copy → Colon copy → Cisco-dot copy → Hyphen copy,
**And** each focused control keeps the visible neutral focus ring (UX-DR10 as amended by Epic 4).

**Given** the formatter,
**When** I inspect `src/lib/format.ts`,
**Then** `formats(canonical)` is still a pure function and now returns `{ plain, colon, cisco, hyphen }`,
**And** a co-located `format.test.ts` covers all four outputs including edge cases (`000000000000`, `FFFFFFFFFFFF`).

**Given** the copy state machine,
**When** a Hyphen copy resolves or times out,
**Then** it is tracked independently per row — `CopyState` carries a `hyphen` flag alongside colon/plain/cisco.

**Given** the parser, dataset, lookup, and manifest,
**When** this story is complete,
**Then** none of their behavior changes — hyphen input was already accepted (FR1), zero permissions remain, the privacy guard suite stays green (NFR2).

**Given** the gates,
**When** I run `npm run typecheck`, `npm test`, and `npm run build`,
**Then** all three pass,
**And** `manifest.json` `version` is bumped on the rightmost segment per project-context.md.
