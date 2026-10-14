---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-10-10'
inputDocuments:
  - '{planning_artifacts}/briefs/brief-Mac Lookup-2026-10-09/brief.md'
  - '{planning_artifacts}/briefs/brief-Mac Lookup-2026-10-09/addendum.md'
  - '{planning_artifacts}/prds/prd-Mac Lookup-2026-10-10/prd.md'
  - '{planning_artifacts}/prds/prd-Mac Lookup-2026-10-10/addendum.md'
  - '{planning_artifacts}/ux-designs/ux-Mac Lookup-2026-10-10/DESIGN.md'
  - '{planning_artifacts}/ux-designs/ux-Mac Lookup-2026-10-10/EXPERIENCE.md'
  - '{planning_artifacts}/ux-designs/ux-Mac Lookup-2026-10-10/mockups/status-popup.html'
workflowType: 'architecture'
project_name: 'Mac Lookup'
user_name: 'Jared'
date: '2026-10-10'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
Eight FRs spanning five areas: input normalization (FR-1), invalid handling (FR-2),
three concurrent format outputs (FR-3), per-format copy (FR-4), offline OUI vendor
lookup (FR-5), explicit no-match state (FR-6), automatic light/dark (FR-7), and
conditional store readiness (FR-8). Architecturally this is one linear
client-side pipeline: normalize → emit formats → resolve vendor → render, with no
network, no persistence, and no cross-surface state.

**Non-Functional Requirements:**
- Privacy/security: zero outbound requests, no telemetry, nothing persisted/transmitted.
- Performance: parse + convert + lookup < 100 ms; instant first paint.
- Offline: full functionality with no connectivity.
- Package size: DB ≤ ~2 MB compressed; total ≤ ~3 MB.
- Platform: Chrome desktop, Manifest V3, popup ≤ 800×600.
- Correctness: deterministic conversion and longest-prefix vendor resolution.
- Accessibility: Tab-reachable controls, visible focus, WCAG AA contrast, live-region status.
- Maintainability: DB refreshed by a repeatable build step; no runtime updater.

**Scale & Complexity:**
- Primary domain: browser extension (client-side)
- Complexity level: low
- Estimated architectural components: ~5 (popup UI/rendering, parse/normalize,
  format/copy, OUI data + lookup, build/data-pipeline)

### Technical Constraints & Dependencies

- MV3 CSP forbids inline scripts → CSS-first theming; no anti-FOUC inline script.
- Chrome exposes only light/dark (no accent colors) → neutral focus ring, status-only color.
- Clipboard write needs no permission under a user gesture.
- OUI dataset sourced from IEEE at build time; redistribution licensing (OQ-1) **resolved 2026-10-14 (Option A)** — see `oq-1-ieee-redistribution-resolution.md`.
- No runtime network path by design — the DB must be self-contained.

### Cross-Cutting Concerns Identified

- Dataset packaging & size budget (affects data format, build pipeline, lookup structure).
- Privacy-by-construction (no network path may ever be introduced).
- Deterministic correctness (parser + longest-prefix resolution).
- Theming (light/dark parity across all states).
- Accessibility (keyboard, focus, live regions, reduced motion).
- Build-time data refresh reproducibility.

## Starter Template Evaluation

### Primary Technology Domain

Browser extension (client-side) — a single-surface Chrome MV3 popup with a
build-time data step for the bundled OUI database. No backend, no server runtime.

### Starter Options Considered

- **WXT** (v0.21.4, Aug 2026) — framework with file-based entrypoints and generated
  manifests. Strong DX and cross-browser targets, but its content-script UI helpers,
  messaging, and multi-browser machinery are weight we don't need for a single popup.
- **Plasmo** (core v0.90.5, May 2025) — React-first, Parcel-based. Heavier than the
  UI demands, slower core cadence, and stronger framework lock-in.
- **Vanilla, no build** — smallest possible footprint, but no HMR, no shared TS
  modules, and no natural home for the build-time OUI data step.
- **CRXJS + Vite + TypeScript** *(selected)* — a Vite plugin, not a framework. We
  own an explicit manifest, get real HMR for the popup, use any Vite plugin, and keep
  zero runtime abstraction over `chrome.*`/browser APIs. Lowest lock-in; easy to leave.

### Selected Starter: CRXJS + Vite + TypeScript (vanilla-ts, no UI framework)

**Rationale for Selection:**
OUI Scout is one static popup with no content scripts, no routing, and no UI
framework needs — the mismatch that makes full frameworks (WXT/Plasmo) unnecessary
indirection. CRXJS keeps the manifest readable and the code close to the platform,
which suits the "one small, well-executed utility" thesis and the privacy/size
constraints. Vite gives us HMR plus a first-class place to hang the build-time OUI
data pipeline (download IEEE CSVs → normalize/compress → emit the bundled artifact).
TypeScript lets us type the parser, formatter, and lookup so the correctness NFR is
enforced at the boundaries. The same stack runs with no framework and can adopt one
later without a rewrite.

**Initialization Command:**

```bash
# Scaffold a Vite vanilla-TS project, then add CRXJS + Chrome API types
npm create vite@latest . -- --template vanilla-ts
npm install
npm i -D @crxjs/vite-plugin@latest chrome-types
```

(Alternatively, `npm create crxjs@latest` scaffolds a CRXJS project directly; the
Vite-based path above is preferred here so the vanilla-TS base and the build-time
data step stay explicit.)

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
TypeScript (strict), ES modules, Vite/Vitest-compatible. Target Chrome MV3 (Chrome
desktop only in v1). `chrome-types` supplies `chrome.*` typings.

**Styling Solution:**
Plain CSS (no preprocessor/framework), authored CSS-first per the MV3 CSP constraint
(no inline scripts) and the DESIGN.md token model. `color-scheme: light dark` on
`:root`; CSS custom properties mirror the DESIGN.md tokens.

**Build Tooling:**
Vite + `@crxjs/vite-plugin`, which reads the explicit `manifest.json`, bundles the
popup entry, and provides HMR. Production build emits the unpacked MV3 extension.
A separate build-time script (Node) generates the bundled OUI database artifact.

**Testing Framework:**
Vitest for unit tests of the pure logic — parser/normalizer (FR-1/FR-2), formatters
(FR-3), and longest-prefix lookup (FR-5/FR-6). No E2E framework mandated in v1.

**Code Organization:**
Popup entry (`index.html`/`popup.ts`), a framework-free UI/render layer, and pure
`lib/` modules (parse, format, lookup) isolated from DOM and `chrome.*`. The OUI
dataset is a generated asset consumed by the lookup module. `manifest.json` +
`vite.config.ts` at root.

**Development Experience:**
`vite dev` with popup HMR; `vite build` for the extension bundle; `npm run build:data`
(planned) to refresh the OUI artifact. Type checking via `tsc --noEmit`.

**Note:** Project initialization using this command should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- CRXJS + Vite 8 + TypeScript, vanilla DOM (no UI framework) — from Starter Evaluation.
- OUI database: name-only index (MA-L + MA-M + MA-S), plain JSON artifact, three lookup maps, longest-prefix match.
- Single-surface popup only: manifest declares no `permissions`, no `host_permissions`, no `background`, no `content_scripts`.
- Pure pipeline split: `parse` → `format` → `lookup` as framework-free `lib/` modules.

**Important Decisions (Shape Architecture):**
- Explicit popup state object + pure `render(state)`; input-driven dispatch, no framework/reactivity layer.
- Build-time Node script generates the bundled OUI artifact; no runtime update path.
- Privacy guard test suite (manifest assertions + source scan).
- Vitest for pure-logic unit tests.

**Deferred Decisions (Post-MVP):**
- Gzip packaging via `DecompressionStream` (revisit if the plain-JSON size NFR becomes a problem).
- Full IEEE registry metadata (PRD OQ-3) — not needed by any FR.
- E2E/DOM test framework — pure-logic unit tests cover v1's risk.
- CI pipeline — handy, not required for a single-author build.
- Chrome Web Store publication (FR-8) — gated on a publish decision. IEEE licensing (OQ-1) resolved 2026-10-14 (Option A); no longer a blocker.
- Remote registry refresh (OQ-2) — explicitly excluded by design.

### Data Architecture

**Bundled OUI database (name-only index).**
- Content: `prefix → vendor name` only, uppercased; MA-L (/24, 6 hex), MA-M (/28, 7 hex), MA-S (/36, 9 hex). ~54,000 prefixes. No registration metadata (address/country) — the UI never shows it.
- Serialization: a plain JSON object emitted at build time. Shape (single map; key length routes the registry):
  ```json
  {
    "schemaVersion": 1,
    "generatedAt": "2026-10-10T00:00:00Z",
    "sources": { "ma-l": "oui.csv", "ma-m": "mam.csv", "ma-s": "oui36.csv" },
    "counts": { "l24": 40319, "m28": 6628, "s36": 7226 },
    "entries": { "F01898": "Apple, Inc.", "AABBCCD": "…", "…9hex…": "…" }
  }
  ```
- Location: emitted into `public/` so Vite copies it verbatim to `dist/` (not bundled/processed); loaded at runtime, not imported.
- Load: `fetch(chrome.runtime.getURL('oui-data.json'))` → `JSON.parse` → build three `Map<string,string>` (`l24`, `m28`, `s36`) once on popup init. Local extension resource only — no network.
- Lookup: exact keyed lookups, longest prefix first — 9 hex (MA-S) → 7 hex (MA-M) → 6 hex (MA-L); first hit wins. Exact hex-string keys, never numeric ranges (avoids endianness bugs).
- Generation: `scripts/build-oui-data.ts` (Node) downloads the IEEE CSVs, extracts Assignment → Organization Name, uppercases prefixes, writes `oui-data.json`. Deterministic and repeatable; records `generatedAt` + `counts`.
- Size (estimate): name-only ≈ 0.6–0.8 MB raw JSON across the three registries, vs ≈ 1.77 MB gzip for full rows. Plain JSON chosen over gzip (see Deferred); CWS gzips the CRX in transit.

**Persistence:** none. All state is in-memory and dies with the popup. No `chrome.storage`, no cookies, no logs.

### Authentication & Security

**Authentication/Authorization:** none — no accounts, no server, no user data.

**Privacy-by-construction (enforced, not just declared):**
- Manifest: `manifest_version: 3`, `action.default_popup`, name/version/description/icons — and nothing else. No `permissions`, no `host_permissions`, no `background`, no `content_scripts`.
- Clipboard: `navigator.clipboard.writeText()` inside a click handler — no permission required.
- Theming: CSS-first; no inline scripts (MV3 CSP), no anti-FOUC script.
- Guard suite:
  - Manifest assertion test: fails if `permissions` or `host_permissions` is non-empty.
  - Source scan test: fails on any remote URL literal or network API (`XMLHttpRequest`, `WebSocket`, `EventSource`) and permits only `fetch` against a `chrome-extension:` / `getURL()` target.

**Secrets:** none — no keys, tokens, or config.

### API & Communication Patterns

- No external API, no service worker, no inter-context messaging. All logic runs in the popup document.
- Internal boundary: pure, synchronous `lib/` functions called directly by the UI layer.
- Contracts:
  - `parseMac(raw) → { ok: true, canonical: string } | { ok: false, reason: 'invalid' }`
  - `formats(canonical) → { colon, plain, cisco }`
  - `lookupVendor(canonical, index) → { ok: true, vendor, prefix } | { ok: false, prefix }` (miss)
- Error handling: discriminated results, no thrown control flow; clipboard rejection caught → failure state; DB load failure caught → a distinct non-blocking "database unavailable" state (should be unreachable locally).

### Frontend Architecture

- Vanilla TypeScript + DOM. No framework, no router, no state library.
- State: one object, e.g.
  `{ ready, raw, canonical, status: 'empty'|'found'|'miss'|'invalid', vendor?, prefix?, copied: { colon, plain, cisco } }`.
- Rendering: a pure `render(state)` that sets text, classes, rail/status colors, and ARIA from state. Called on every input change; no diffing layer.
- Events: `input` → parse → new state → render; per-row copy clicks → clipboard → optimistic "Copied" (~1.5 s) or failure state; `matchMedia('(prefers-color-scheme: dark)')` `change` listener for live theme updates (CSS-first).
- Styling: CSS custom properties mirroring DESIGN.md tokens; `color-scheme: light dark` on `:root`; `prefers-color-scheme` media queries; `prefers-reduced-motion` skips the ~120 ms cross-fade.
- Accessibility: `aria-live="polite"` banner announces state; associated input label; Tab order input → Colon → Plain → Cisco-dot; visible neutral focus ring; status never color-only.

### Infrastructure & Deployment

- Scripts: `dev` (`vite`), `build` (`vite build` → unpacked MV3 in `dist/`), `build:data` (Node OUI generator), `typecheck` (`tsc --noEmit`), `test` (`vitest`).
- Packaging: a `zip` script wraps `dist/` for store upload; the dataset version is recorded in `oui-data.json`.
- CI: optional GitHub Actions running typecheck + test + build (deferred).
- Hosting/servers/monitoring/logging: none — and none permitted (no telemetry).
- Environment config: none required.

### Decision Impact Analysis

**Implementation Sequence:**
1. Scaffold CRXJS + Vite + TS; write the zero-permission `manifest.json`; minimal popup shell.
2. `scripts/build-oui-data.ts` → `public/oui-data.json`.
3. Pure `lib/`: `parseMac`, `formats`, `lookupVendor` + unit tests.
4. Popup UI: state object, `render(state)`, input/copy/theme wiring, accessibility.
5. Privacy guard tests; `build` + `zip`; smoke-test the unpacked extension.

**Cross-Component Dependencies:**
- `oui-data.json` schema is a shared contract between the build script and the lookup module — version it (`schemaVersion`).
- The zero-permission manifest, the user-gesture clipboard approach, and the privacy guard are mutually dependent — changing one must reconcile all three.
- DESIGN.md tokens → CSS custom properties → `render()` class names must stay in lockstep across all four states.
- State shape → `render()` → `aria-live` announcements are one chain; the state object is the single source of truth for both visuals and assistive tech.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 7 areas where AI agents could diverge — file/module layout, naming, the parse/format/lookup contracts, the dataset schema, the popup state model, canonical microcopy, and error/loading handling.

### Naming Patterns

**Database Naming Conventions:** N/A — no database. The only "data store" is the bundled JSON artifact; its schema is pinned below.

**API Naming Conventions:** N/A — no HTTP API. Internal function contracts are pinned below.

**Code Naming Conventions:**
- Files & directories: `kebab-case` (`build-oui-data.ts`, `parse-mac.ts`, `lookup-vendor.ts`). React-style `PascalCase` filenames are **not** used (no components).
- Functions & variables: `camelCase` (`parseMac`, `lookupVendor`, `canonical`).
- Types, interfaces, enums: `PascalCase` (`MacStatus`, `LookupResult`).
- Constants: `SCREAMING_SNAKE_CASE` (`COPY_CONFIRM_MS`, `SCHEMA_VERSION`).
- CSS classes: `kebab-case` (`.result-banner`, `.copy-button`), matching DESIGN.md component names; state is exposed via a `data-status` attribute, never via status-specific class names.
- Tests: `*.test.ts` **co-located** beside the module under test (`src/lib/parse.test.ts`).

### Structure Patterns

**Project Organization:**
```
manifest.json            # explicit MV3 manifest (no permissions)
vite.config.ts           # crx({ manifest }) only
tsconfig.json            # strict: true
package.json
index.html               # popup entry (Vite root), loads src/main.ts
public/
  oui-data.json          # GENERATED — never hand-edit
scripts/
  build-oui-data.ts      # IEEE CSVs -> public/oui-data.json
src/
  main.ts                # bootstrap: load DB, wire events, initial render
  ui/
    state.ts             # PopupState type + transition functions
    render.ts            # render(state) — pure DOM writer
  lib/
    parse.ts  format.ts  lookup.ts   # pure, DOM-free, chrome-free
    types.ts             # shared types/contracts
  styles/
    app.css              # DESIGN.md tokens as CSS custom properties
```
- Rule: `src/lib/**` MUST NOT import from `ui/`, touch the DOM, or call `chrome.*` — it is pure and unit-tested.
- Rule: `public/oui-data.json` is a build artifact; regeneration is via `npm run build:data` only.

**File Structure Patterns:** tests co-located (`*.test.ts`); one exported concern per `lib` file; no barrel/index re-export files (agents import exact paths).

### Format Patterns

**API Response Formats:** Methods that can fail return discriminated unions, never throw for expected conditions:
```ts
type ParseResult = { ok: true; canonical: string } | { ok: false; reason: 'invalid' };
type LookupResult = { ok: true; vendor: string; prefix: string } | { ok: false; prefix: string };
type Formats = { colon: string; plain: string; cisco: string };
```

**Data Exchange Formats (the dataset schema — a shared contract):**
- Top-level keys: `schemaVersion` (int), `generatedAt` (ISO-8601 UTC), `sources` (registry → filename), `counts`, `entries`.
- `entries`: a flat JSON object, key = **uppercase hex prefix** (6/7/9 chars), value = vendor name string verbatim from source.
- Key length routes the registry: 6 → MA-L, 7 → MA-M, 9 → MA-S. No registry letter in the key.
- All internal hex is uppercase; the canonical MAC is exactly 12 hex digits, uppercase (`^[0-9A-F]{12}$`).

### Communication Patterns

**Event System Patterns:** DOM events only. No custom event bus, no `CustomEvent`, no pub/sub.
- Input: single `input` listener → `parseMac` → transition → `render`.
- Copy: one delegated click handler on the rows container, keyed by `data-format` (`colon|plain|cisco`).
- Theming: pure CSS `@media (prefers-color-scheme)` — **no JS listener** (CSS updates live by itself).

**State Management Patterns:**
- One state object; **pure transitions** `nextState(state, event) → state` (no in-place mutation of the object handed to `render`); `render(state)` is the only DOM writer.
- Status is exactly the string union `'empty' | 'found' | 'miss' | 'invalid'`; `data-status` on the popup root mirrors it.
- Copy confirmation is per-format boolean flags in state, cleared by timer `COPY_CONFIRM_MS`.
- `render` is idempotent: same state → same DOM.

### Process Patterns

**Error Handling Patterns:**
- Expected bad input never throws — it becomes `status: 'invalid'`.
- Clipboard rejection is caught → row shows the failure state; UI never displays "Copied" when the write failed.
- Dataset load failure is caught → a distinct non-blocking "database unavailable" state (should be unreachable for a local resource).

**Loading State Patterns:**
- Single boolean `ready`, false until the dataset is parsed; the input is usable immediately, and lookup renders once `ready` flips.

### Enforcement Guidelines

**All AI Agents MUST:**
- Keep `src/lib/**` pure (no DOM, no `chrome.*`, no I/O) and ship a co-located unit test for each exported function.
- Represent MAC values as uppercase 12-hex-digit canonical strings at every boundary.
- Use discriminated-union results for parse/lookup; never throw for expected input.
- Use the exact canonical microcopy from the PRD (§Voice and Tone): "Not a valid MAC address", "Unknown vendor", "Copied", "Found" / "Not found" / "Invalid", "Paste a MAC address". Invent no new user-facing strings.
- Add no permissions, no network calls, no telemetry — enforced by the guard suite.

**Pattern Enforcement:**
- `npm run typecheck` (tsc strict) + `npm test` (Vitest, incl. privacy guard) gate every change; verify against the built `manifest.json` with the guard test.
- Violations are fixed at the source, not worked around; any change to the dataset schema bumps `schemaVersion` and updates the lookup contract together.

### Pattern Examples

**Good Examples:**
```ts
// src/lib/parse.ts
export function parseMac(raw: string): ParseResult {
  const hex = raw.replace(/[\s:.-]/g, '').toUpperCase();
  return /^[0-9A-F]{12}$/.test(hex) ? { ok: true, canonical: hex } : { ok: false, reason: 'invalid' };
}
```
```ts
// src/ui/render.ts — only DOM writer
export function render(root: HTMLElement, s: PopupState): void {
  root.dataset.status = s.status; ...
}
```

**Anti-Patterns:**
- Throwing `Error('invalid mac')` for bad input, or returning `null`/`undefined` instead of a discriminated result.
- Lowercase or separator-laden values crossing module boundaries.
- Importing a DOM or `chrome.*` helper into `src/lib/**`.
- Adding a `background`/`content_scripts` entry, a `permissions` array, or a `fetch()` to a remote host.
- Re-inventing microcopy ("Couldn't find that one", "Oops!").

## Project Structure & Boundaries

### Complete Project Directory Structure
```
oui-scout/                       # repo root (Mac Lookup)
├── README.md
├── package.json
├── package-lock.json
├── tsconfig.json                # strict: true, "types": ["chrome-types"]
├── vite.config.ts               # crx({ manifest }) only
├── manifest.json                # explicit MV3 manifest — zero permissions
├── .gitignore                   # ignores dist/, node_modules/, generated data
├── index.html                   # popup entry (Vite root); loads /src/main.ts
├── public/
│   ├── icons/
│   │   ├── icon-16.png          # referenced by manifest "icons" + "action"
│   │   ├── icon-32.png
│   │   ├── icon-48.png
│   │   └── icon-128.png
│   └── oui-data.json            # GENERATED — name-only OUI index (build artifact)
├── scripts/
│   └── build-oui-data.ts        # IEEE CSVs → public/oui-data.json
├── src/
│   ├── main.ts                  # bootstrap: load dataset, wire events, initial render
│   ├── lib/                     # PURE: no DOM, no chrome.*, no I/O
│   │   ├── types.ts             # ParseResult, LookupResult, Formats, MacStatus, PopupState
│   │   ├── parse.ts             # parseMac (FR-1, FR-2)
│   │   ├── parse.test.ts
│   │   ├── format.ts            # formats (FR-3)
│   │   ├── format.test.ts
│   │   ├── lookup.ts            # lookupVendor (FR-5, FR-6)
│   │   └── lookup.test.ts
│   ├── data/
│   │   └── load-oui-data.ts     # fetch(getURL('oui-data.json')) → Maps (the only I/O)
│   ├── ui/
│   │   ├── state.ts             # nextState(state, event) — pure transitions
│   │   ├── state.test.ts
│   │   ├── render.ts            # render(root, state) — sole DOM writer
│   │   └── render.test.ts       # DOM assertions (happy-dom)
│   └── styles/
│       └── app.css              # DESIGN.md tokens as CSS custom properties
└── tests/
    └── privacy.guard.test.ts    # manifest + source-scan assertions (FR-8 posture)
```

### Architectural Boundaries

**API Boundaries:** None external. There is exactly one I/O boundary in the whole system — `src/data/load-oui-data.ts`, which reads the local `chrome-extension://…/oui-data.json` resource. No HTTP, no messaging, no service worker.

**Component Boundaries (strict, one-directional):**
- `src/lib/**` — pure functions and types. Depends on nothing but `types.ts`. Never imports `ui/`, `data/`, or touches DOM/`chrome.*`.
- `src/data/**` — depends on `lib/types.ts` only; owns the fetch + Map construction.
- `src/ui/**` — depends on `lib/` (types + pure fns); `state.ts` is pure, `render.ts` writes DOM.
- `src/main.ts` — the only module allowed to depend on all layers; orchestrates and wires events.

**Service Boundaries:** N/A — no services. Logic is in-process in the popup document.

**Data Boundaries:** The dataset schema (`schemaVersion`, `entries`) is the contract between `scripts/build-oui-data.ts` (producer) and `src/data/load-oui-data.ts` + `src/lib/lookup.ts` (consumers). Prefix length routes registry; keys are uppercase hex.

### Requirements to Structure Mapping

**Feature/FR Mapping:**
- FR-1, FR-2 (input & normalize / reject) → `src/lib/parse.ts`
- FR-3 (three formats) → `src/lib/format.ts`
- FR-4 (per-format copy) → `src/ui/render.ts` + click handler in `src/main.ts`
- FR-5, FR-6 (offline vendor lookup / no-match) → `src/lib/lookup.ts` + `src/data/load-oui-data.ts` + `scripts/build-oui-data.ts`
- FR-7 (auto light/dark) → `src/styles/app.css` (`prefers-color-scheme`)
- FR-8 (store readiness, conditional) → `manifest.json`, packaging script, `tests/privacy.guard.test.ts`

**Cross-Cutting Concerns:**
- Privacy-by-construction → `manifest.json` (zero permissions) + `tests/privacy.guard.test.ts`
- Theming tokens → `src/styles/app.css` (mirrors `DESIGN.md` frontmatter)
- Accessibility (aria-live, focus, reduced motion) → `index.html` + `src/ui/render.ts` + `app.css`
- State model → `src/lib/types.ts` (`PopupState`, `MacStatus`) shared by `ui/state.ts` and `ui/render.ts`

### Integration Points

**Internal Communication:** `main.ts` is the hub. Input events → `parseMac` → `formats` + `lookupVendor` → `nextState` → `render`. Layers communicate via plain values (canonical strings + discriminated results), never via shared mutable state or events.

**External Integrations:** None at runtime. The only external touch is **build-time**: `scripts/build-oui-data.ts` downloads the IEEE MA-L/MA-M/MA-S CSVs.

**Data Flow:**
```
paste → input event (main.ts)
      → parseMac(raw)            → {ok, canonical} | {ok:false}
      → formats(canonical)       → {colon, plain, cisco}
      → lookupVendor(canonical, maps) → {ok, vendor, prefix} | {ok:false, prefix}
      → nextState(...) → render(root, state)
copy  → click(data-format) → navigator.clipboard.writeText(...) → copy state → render
```

### File Organization Patterns

**Configuration Files:** `manifest.json`, `vite.config.ts`, `tsconfig.json` at repo root; no env files (nothing to configure).

**Source Organization:** by layer — `lib/` (pure), `data/` (I/O), `ui/` (DOM + state), `main.ts` (wiring). No feature folders — the project is one feature.

**Test Organization:** unit tests co-located (`src/lib/*.test.ts`, `src/ui/*.test.ts`); the cross-cutting guard lives in `tests/privacy.guard.test.ts`. Vitest + happy-dom.

**Asset Organization:** generated dataset and icons in `public/` (copied verbatim to `dist/` by Vite); CSS authored in `src/styles/` and bundled.

### Development Workflow Integration

**Development Server Structure:** `npm run dev` (CRXJS) opens Chrome with the extension loaded and HMR for the popup; `public/` assets are served from `dist/`.

**Build Process Structure:** `npm run build:data` generates `public/oui-data.json`; `npm run build` (`vite build`) emits the unpacked MV3 extension to `dist/`; a `zip` script packages `dist/` for the store. `typecheck` + `test` gate the build.

**Deployment Structure:** distribution is the zipped `dist/` (or unpacked load for personal use). No hosting, no servers. The dataset version travels inside `oui-data.json`; the extension version travels in `manifest.json`.

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All choices are mutually compatible: CRXJS 2.7.0 supports Vite 8.x, and Vite 8.3.4 is the current stable line. TypeScript (strict) with `chrome-types` is standard for MV3. The plain-JSON dataset in `public/` is copied verbatim by Vite and fetched via `chrome.runtime.getURL()` — a supported local-resource path with no network. No contradictory decisions; the deferred gzip option is explicitly noted as a switch, not a conflict.

**Pattern Consistency:**
Patterns reinforce the decisions: vanilla DOM + a single pure `render()` matches "no framework"; the pure/`lib` boundary matches the correctness and unit-testing NFRs; the `data-status` attribute and CSS custom properties match the DESIGN.md token model and the accessibility (non-color-only) requirement.

**Structure Alignment:**
The `lib → data/ui → main` layering and the one-way dependency rule support every decision; the single I/O boundary (`load-oui-data.ts`) matches privacy-by-construction; co-located tests match Vitest; `public/` matches the generated-artifact strategy.

### Requirements Coverage Validation ✅

**Epic/Feature Coverage:** N/A (no epics yet) — FRs mapped directly.

**Functional Requirements Coverage:**
- FR-1, FR-2 → `src/lib/parse.ts` ✅
- FR-3 → `src/lib/format.ts` ✅
- FR-4 → `src/ui/render.ts` + `main.ts` clipboard handler ✅
- FR-5, FR-6 → `src/lib/lookup.ts` + `src/data/load-oui-data.ts` + `scripts/build-oui-data.ts` ✅
- FR-7 → `src/styles/app.css` (`prefers-color-scheme`, no JS listener) ✅
- FR-8 → `manifest.json` (zero permissions) + packaging + `tests/privacy.guard.test.ts` ✅ (conditional on publish)

**Non-Functional Requirements Coverage:**
- Performance: in-memory Maps, lookups are O(1)/O(3); parse+format+lookup well under 100 ms — dataset load (parse once on open) is the item to verify. ✅ (verify below)
- Privacy/Security: zero permissions + guard suite + no network path ✅
- Offline: local `chrome-extension://` resource only ✅
- Package size: name-only index; plain JSON chosen (larger than gzip — accepted tradeoff, gzip deferred) ⚠️
- Platform: MV3, 360px popup within 800×600 ✅
- Correctness: pure modules + unit tests ✅
- Accessibility: `aria-live`, focus ring, reduced motion, non-color-only status ✅
- Maintainability: repeatable `build:data` step; no runtime updater ✅

### Implementation Readiness Validation ✅

**Decision Completeness:** Stack + versions pinned (CRXJS 2.7.0, Vite 8.3.4, TS strict, Vitest, chrome-types); contracts and schemas specified with examples.

**Structure Completeness:** Full tree defined with every file and directory; boundaries and integration points mapped; FR→file mapping complete.

**Pattern Completeness:** Naming, structure, format, communication/state, and process (error/loading) patterns defined; anti-patterns enumerated; enforcement via `typecheck`/`test`.

### Gap Analysis Results

**Critical Gaps:** None.

**Important Gaps (verify during implementation):**
1. **Dataset-load performance** — `JSON.parse` + building three `Map`s for ~54k entries on popup open must be measured against the <100 ms goal. Mitigation: parse once per popup session and cache in memory; the <100 ms target applies to paste→result after load. Confirm in the first data story.
2. **Dev-mode resource path** — confirm `fetch(chrome.runtime.getURL('oui-data.json'))` resolves under CRXJS dev (assets served from `dist/`). Fallback: import via `?url`, or place the fetch behind a small `getOuiDataUrl()` helper.
3. **Test fixtures** — pin a small fixture set (e.g., `F01898` → "Apple, Inc."; a known MA-M and MA-S prefix; a no-match MAC) in `tests/fixtures` so parser/formatter/lookup tests are deterministic.

**Nice-to-Have Gaps:** placeholder icon assets in `public/icons/`; CI workflow (deferred); store listing/privacy-policy drafts (FR-8, only if publishing).

### Validation Issues Addressed

No critical or blocking issues. The important gaps above are verification tasks assigned to early stories, not missing architectural decisions. The IEEE licensing question (OQ-1) was **resolved 2026-10-14** (Option A — IEEE's public listing carries no redistribution restriction; see `oq-1-ieee-redistribution-resolution.md`); it gated **publication only** (FR-8) and never affected the personal-use build.

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** high

**Key Strengths:**
- Minimal, well-bounded architecture: one surface, one I/O boundary, pure logic split out for testing.
- Privacy-by-construction is not just declared but enforced by a guard suite.
- Every FR maps to a specific file; agent conflicts pre-empted by explicit patterns and contracts.
- Deliberately low-lock-in stack (CRXJS is a plugin; leaving it is a config swap).

**Areas for Future Enhancement:**
- Gzip the dataset (`DecompressionStream`) if the size NFR becomes a problem.
- Optional CI (typecheck + test + build).
- E2E smoke test against the built extension.

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented.
- Use implementation patterns consistently across all components.
- Respect project structure and boundaries (keep `src/lib/**` pure).
- Refer to this document for all architectural questions.

**First Implementation Priority:**
```bash
npm create vite@latest . -- --template vanilla-ts
npm install
npm i -D @crxjs/vite-plugin@latest chrome-types
```
Then: write the zero-permission `manifest.json`, add `vite.config.ts` (`crx({ manifest })`), and a minimal popup shell — the first story.
