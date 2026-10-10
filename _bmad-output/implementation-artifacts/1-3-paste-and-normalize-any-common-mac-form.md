---
baseline_commit: 906e18312fb71e068dd37035474e9f4262f0f67d
---

# Story 1.3: Paste and normalize any common MAC form

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Jared,
I want to paste a MAC in any common form and have it reduce to one canonical value,
so that I never reformat by hand.

## Acceptance Criteria

1. **Any common form reduces to canonical.** Given the MAC input field, when I paste `aa:bb:cc:dd:ee:ff`, `AA-BB-CC-DD-EE-FF`, `aabb.ccdd.eeff`, `AA BB CC DD EE FF`, or `AABBCCDDEEFF`, then each reduces to the Canonical value `AABBCCDDEEFF`. *(FR1)*
2. **Trim + case handling.** Given pasted input, when it has leading/trailing whitespace or newlines, then those are trimmed before evaluation; and hex letters are accepted in either case while the Canonical value is uppercase. *(FR1)*
3. **Non-ASCII characters are rejected, never stripped.** Given pasted input, when it contains any character other than ASCII separators (`:`, `-`, `.`) and ASCII whitespace, then the input is treated as invalid (non-ASCII separators and homoglyphs are **not** stripped). *(FR1)*
4. **Exactly one MAC or nothing.** Given a paste that does not reduce to exactly one 12-hex-digit value (e.g., several MACs copied from a table export), when it is parsed, then it is invalid — no first-match guessing. *(FR1)*
5. **Pure parser + co-located tests.** Given the parser, when I inspect `src/lib/parse.ts`, then `parseMac(raw)` is a pure function returning `{ ok: true, canonical } | { ok: false, reason: 'invalid' }` with **no DOM / `chrome.*` / I-O dependencies**, and a co-located `src/lib/parse.test.ts` covers every form and edge case above. *(Additional Requirements; UX-DR3)*
6. **UX-DR3 MAC input component chrome.** Given the MAC input field in the popup, then it is full-width on the field background, with a 1.5px border, `rounded.md` (8px), `11px 12px` padding, `--color-text` foreground, the mac-input typography (uppercase bold 14px / 0.03em already applied in Story 1.2), a muted placeholder, and a **neutral-ink** focus ring — no accent or status color. *(UX-DR3 — see Scope boundary)*

## Tasks / Subtasks

- [x] **Task 1: Define the shared parse type** (AC: 5)
  - [x] Create `src/lib/types.ts` exporting exactly one type for now: `ParseResult = { ok: true; canonical: string } | { ok: false; reason: 'invalid' }` (verbatim from architecture.md:303).
  - [x] Do **not** add `LookupResult` / `Formats` / `MacStatus` / `PopupState` yet — those arrive with the format (1.5), lookup (2.2), and state stories. `types.ts` is the one place later stories extend.

- [x] **Task 2: Implement the pure normalizer** (AC: 1, 2, 3, 4, 5)
  - [x] Create `src/lib/parse.ts` exporting `parseMac(raw: string): ParseResult`.
  - [x] Strip ASCII whitespace and separators with `raw.replace(/[\t\n\v\f\r :.-]/g, '')`. Use this exact ASCII class — **never `\s`** (see Critical guardrails).
  - [x] Validate the stripped (still un-uppercased) string against `/^[0-9A-Fa-f]{12}$/`; on failure return `{ ok: false, reason: 'invalid' }`.
  - [x] Only after validation, uppercase: return `{ ok: true, canonical: stripped.toUpperCase() }`.
  - [x] Import the type with `import type { ParseResult } from './types'`. No other imports. No DOM, no `chrome.*`, no I/O, no `throw` for any input.

- [x] **Task 3: Introduce Vitest** (AC: 5)
  - [x] `npm install -D vitest@^4.1.0` (Vitest 4.1 is the first line with first-class Vite 8 support; Vitest's own `engines` range is `^20 || ^22 || >=24` — we run Node v22.22.1). This adds `vitest` to `devDependencies` and updates `package-lock.json`.
  - [x] Create `vitest.config.ts` (see Dev Notes for the exact contents) with a `node` environment and `include: ['src/**/*.test.ts']`. A dedicated config keeps the CRXJS plugin in `vite.config.ts` out of the test run.
  - [x] Add scripts to `package.json`: `"test": "vitest run"` and `"test:watch": "vitest"`. (`vitest run` is the deterministic single-run form so `npm test` terminates and can gate; record this as a deliberate, documented deviation from architecture.md:229's shorthand `test` (`vitest`).)

- [x] **Task 4: Write the exhaustive `parse.test.ts`** (AC: 1–5)
  - [x] `src/lib/parse.test.ts`, colocated, importing `{ describe, it, expect }` from `'vitest'` (explicit imports — no globals, so `tsconfig.json` stays untouched) and `parseMac` from `'./parse'`.
  - [x] Cover the full valid matrix (AC1/AC2) and the full invalid matrix (AC3/AC4), including the homoglyph/NBSP/ligature traps listed in Dev Notes. Use a table-driven style (`it.each` or a `for` loop).
  - [x] Assert the exact result shape: valid ⇒ `{ ok: true, canonical }` with `canonical` matching `/^[0-9A-F]{12}$/`; invalid ⇒ `toEqual({ ok: false, reason: 'invalid' })`.

- [x] **Task 5: Apply the UX-DR3 MAC input chrome** (AC: 6)
  - [x] In `src/styles/app.css`, extend the existing `.mac-input` rule (do not rename it) with the base box: `box-sizing: border-box; width: 100%; padding: 11px 12px; background: var(--color-field); color: var(--color-text); border: 1.5px solid var(--color-border); border-radius: var(--radius-md); outline: none;`. Keep the Story 1.2 typography lines.
  - [x] Add `.mac-input:focus-visible { border-color: var(--color-focus-ring); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-focus-ring) 22%, transparent); }` — the mockup's ring pattern with the accent color **replaced by the neutral-ink token**.
  - [x] Leave `.mac-input::placeholder` as-is (muted + `text-transform: none`). Update the file's inline comment to drop the "arrives with Story 1.3" note.

- [x] **Task 6: Verify** (AC: 1–6)
  - [x] `npm test` → all `parse.test.ts` cases pass.
  - [x] `npm run typecheck` → 0 errors (test file is under `src`, so `tsc` checks it too).
  - [x] `npm run build` → succeeds (bundler unaffected; the CRXJS build must still emit `dist/`).
  - [x] `grep`-confirm no `\s` (Unicode) stripping in `parse.ts` and that `parse.ts`/`types.ts` import nothing but `./types`.
  - [x] Manually: `npm run build`, reload the unpacked `dist` in Chrome, paste each of the five forms into the field and confirm the typed text renders uppercase in the field; Tab to the field and confirm the neutral-ink focus ring (no green/blue).

### Review Findings

_Code review 2026-10-10 (target `906e183..a2ee222`; layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor). Acceptance Auditor: AC1 satisfied at parser/unit level (wiring explicitly out of scope); **AC2–AC6 clean** — ASCII-only strip class, validate-before-uppercase, 34-case suite covering every Behavior-table row including NBSP/U+2028/fullwidth/ligature traps, pure `ParseResult` contract, and exact UX-DR3 chrome with neutral `--color-focus-ring` all match spec/architecture/DESIGN. All three gates re-run live: 34 tests pass, typecheck 0 errors, build succeeds._

**Decision-needed (2) — both resolved by Jared on 2026-10-10:**

- [x] [Review][Decision] Manual GUI verification subtask is checked `[x]` but was never performed — Task 6's manual subtask is checked while the Dev Agent Record states the visual Chrome check "is a user-performed confirmation"; two layers flagged the checked box as a false completion claim. — **resolved:** user accepted the Story 1.1/1.2 convention (box checked = delegated to user verification); no change.
- [x] [Review][Decision] `--legacy-peer-deps` workaround has no reusable record — Story 1.3 installed Vitest via `npm install -D vitest@^4.1.0 --legacy-peer-deps` to bypass an npm 9.2.0 arborist crash (`edgesOut` null resolving Vite 8's optional devtools peers); Task 3 documents only the plain command, and a clean-tree `npm install` (no lock) re-triggers the crash. — **resolved:** user chose to add a project `.npmrc` pinning `legacy-peer-deps=true` (promoted to the patch below).

**Patch (8):**

- [x] [Review][Patch] Add project `.npmrc` pinning `legacy-peer-deps=true` [new file `.npmrc`] — resolved from Decision 2, so clean-tree installs don't re-trigger the npm 9.2.0 arborist crash that forced the `--legacy-peer-deps` workaround.
- [x] [Review][Patch] "Purity / does-not-mutate" test is unfalsifiable — `src/lib/parse.test.ts:67` — JS strings are immutable and the return value is discarded, so `expect(input).toBe(...)` can never fail; the suite reports AC5 purity verified when it verifies nothing (no test checks for DOM/`chrome.*`/I-O isolation).
- [x] [Review][Patch] CR, VT and FF (incl. Windows CRLF) are never exercised in tests — `src/lib/parse.ts:3` strips `[\t\n\v\f\r :.-]` but the valid table only uses `\n` and `\t`; a regression dropping `\r`/`\v`/`\f` keeps all 34 tests green.
- [x] [Review][Patch] Vitest include glob silently excludes the root `tests/` guard suite — `vitest.config.ts:6` — `include: ['src/**/*.test.ts']` replaces the default `**/*.test.ts`, so Story 1.8's `tests/privacy.guard.test.ts` would never run and the privacy gate would report green forever (empirically verified by a deliberately failing guard file); `tsconfig.json` `include` has the same blind spot.
- [x] [Review][Patch] sprint-status comment states the wrong status event — `_bmad-output/implementation-artifacts/sprint-status.yaml:45` — comment says "story 1.3 marked ready-for-dev" while the entry is `review`, and it overwrote Story 1.2's real history line.
- [x] [Review][Patch] Redundant shape assertion is dead code — `src/lib/parse.test.ts:27` — `if (result.ok) expect(result.canonical).toMatch(CANONICAL_SHAPE)` immediately after an equality assert against the constant `AABBCCDDEEFF` can never add signal.
- [x] [Review][Patch] Story's Node-floor claim is misattributed — story Dev Notes — "Vitest requires Node ≥ 22.12" is contradicted by `package-lock.json` (`engines: ^20.0.0 || ^22.0.0 || >=24.0.0`); 22.12 is Vite's floor, and no `engines` field enforces anything.
- [x] [Review][Patch] File List omits the story doc the diff creates — story File List lists 8 files while the diff's first entry is the story markdown itself (inconsistent with Story 1.1, which listed its own file).

**Defer (2):**

- [x] [Review][Defer] `outline: none` leaves forced-colors focus invisible until Story 1.7 [src/styles/app.css:138] — deferred, Story 1.7 (accessibility floor) owns the mitigation; in `forced-colors` the border-color and box-shadow focus cues are both suppressed.
- [x] [Review][Defer] Global `environment: 'node'` will break the future DOM test [vitest.config.ts:5] — deferred, Story 1.5/1.7's `render.test.ts` will need a per-file `@vitest-environment happy-dom` pragma.

## Dev Notes

### Scope boundary (do not overreach)

This story delivers the **pure parser + its tests + Vitest + the base MAC input chrome**. It does **not** wire the input to the parser, does not render results, and does not add any state.

- **In scope:** `src/lib/types.ts` (new, `ParseResult` only), `src/lib/parse.ts` (new), `src/lib/parse.test.ts` (new), `vitest.config.ts` (new), `package.json` (+ devDep/scripts), `package-lock.json` (npm), and the `.mac-input` base chrome in `src/styles/app.css`.
- **Out of scope (do not touch):** `index.html` and `src/main.ts` (no wiring — the `input`→`parseMac`→`render` pipeline is later state/render work); invalid-state border/text (Story 1.4, FR2); the three format rows (1.5); copy buttons (1.6); ARIA/live-region/autofocus/forced-colors (1.7); vendor lookup (Epic 2). No new runtime dependencies, no network, no telemetry, no permissions.

> **Why the input chrome is here:** UX-DR3 is referenced in exactly one story (this one), and the Story 1.2 code review explicitly deferred the `.mac-input` box chrome (`color`/`border`/`radius`/`padding`/focus) to "Story 1.3 (UX-DR3)". The invalid-state variant of the field is Story 1.4.

### Critical guardrails (the two traps that break AC3)

1. **Strip ASCII whitespace only — never `\s`.** The architecture's illustrative snippet (`raw.replace(/[\s:.-]/g, '')`) uses `\s`, but in JavaScript `\s` also matches **non-ASCII** whitespace (NBSP `U+00A0`, U+1680, U+2000–200A, U+2028/2029, U+202F, U+205F, U+3000, U+FEFF). The AC requires that non-ASCII characters are **not** stripped, so `\s` would wrongly accept `AA<NBSP>BB…`. Use the explicit ASCII class `[\t\n\v\f\r :.-]` (tab, LF, VT, FF, CR, space, colon, period, hyphen). Do **not** copy the architecture snippet verbatim.
2. **Validate before uppercasing.** Test `/^[0-9A-Fa-f]{12}$/` on the stripped, **still-lowercase** string, then call `.toUpperCase()`. JS `.toUpperCase()` performs Unicode full case mapping, and a few single code points expand to multiple ASCII letters — e.g. `U+FB00 'ﬀ'` → `"FF"`, `U+FB03 'ﬃ'` → `"FFI"`, `U+00DF 'ß'` → `"SS"`. Uppercasing first would let `"ﬀ".repeat(6)` (six characters) become `"FFFFFFFFFFFF"` and pass a naive check, smuggling a homoglyph past AC3. Validating the ASCII hex class **before** uppercasing closes this hole; `[0-9A-Fa-f]` matches only real ASCII hex.
3. **Pure + non-throwing.** `src/lib/parse.ts` must import nothing but `./types`; it must never touch the DOM, `chrome.*`, storage, timers, or I/O, and must never `throw` for any input (expected bad input becomes `{ ok: false, reason: 'invalid' }`).
4. **Discriminated union only.** Return `ParseResult`; never `null`/`undefined`/`''` and never a thrown `Error` (architecture anti-pattern).
5. **Tokens only, neutral focus.** The input chrome uses only `--color-field`, `--color-text`, `--color-border`, `--color-focus-ring`, `--radius-md`. The focus ring is neutral ink — **never** a status color (DESIGN override of the mockup's green accent). Do not add invalid (red) field styling — that is Story 1.4.

### Reference implementation (corrected; use this shape, not the architecture snippet)

```ts
// src/lib/types.ts
export type ParseResult =
  | { ok: true; canonical: string }
  | { ok: false; reason: 'invalid' };
```

```ts
// src/lib/parse.ts
import type { ParseResult } from './types';

const STRIP = /[\t\n\v\f\r :.-]/g; // ASCII whitespace + ASCII separators only
const HEX12 = /^[0-9A-Fa-f]{12}$/; // ASCII hex, case-insensitive — test BEFORE uppercasing

export function parseMac(raw: string): ParseResult {
  const stripped = raw.replace(STRIP, '');
  if (!HEX12.test(stripped)) return { ok: false, reason: 'invalid' };
  return { ok: true, canonical: stripped.toUpperCase() };
}
```

### Behavior table (drive `parse.test.ts` from this)

| Input | Result |
|---|---|
| `aa:bb:cc:dd:ee:ff` | `{ ok: true, canonical: 'AABBCCDDEEFF' }` |
| `AA:BB:CC:DD:EE:FF` | `{ ok: true, canonical: 'AABBCCDDEEFF' }` |
| `AA-BB-CC-DD-EE-FF` | `{ ok: true, canonical: 'AABBCCDDEEFF' }` |
| `aabb.ccdd.eeff` | `{ ok: true, canonical: 'AABBCCDDEEFF' }` |
| `AA BB CC DD EE FF` | `{ ok: true, canonical: 'AABBCCDDEEFF' }` |
| `AABBCCDDEEFF` | `{ ok: true, canonical: 'AABBCCDDEEFF' }` |
| `aAbBcCdDeEfF` (mixed case) | `{ ok: true, canonical: 'AABBCCDDEEFF' }` |
| `"  AA:BB:CC:DD:EE:FF  "` (leading/trailing spaces) | valid → `AABBCCDDEEFF` |
| `"\nAABBCCDDEEFF\n"`, `"\tAA BB CC DD EE FF\t"` (newlines/tabs) | valid → `AABBCCDDEEFF` |
| `AA:BB-CC.DD EE:FF` (mixed separators) | valid → `AABBCCDDEEFF` |
| `::AABBCCDDEEFF` (separators anywhere — positions unconstrained) | valid → `AABBCCDDEEFF` |
| `""` (empty) | `{ ok: false, reason: 'invalid' }` |
| `"   "` (whitespace only) | `{ ok: false, reason: 'invalid' }` |
| `AABBCCDDEEF` (11 hex) | invalid |
| `AABBCCDDEEFFF` (13 hex) | invalid |
| `AA:BB:CC:DD:EE:FG` / `GGGGGGGGGGGG` (non-hex) | invalid |
| `AA:BB:CC:DD:EE:FF 11:22:33:44:55:66` (two MACs) | invalid — **no first-match** |
| `AA:BB:CC:DD:EE:FF,` (trailing comma), `AA:BB:CC:DD:EE:FF Apple` | invalid |
| `AA\u00A0BB\u00A0CC\u00A0DD\u00A0EE\u00A0FF` (NBSP) | invalid — **non-ASCII whitespace is not stripped** |
| `AA\u2028BB\u2028CC\u2028DD\u2028EE\u2028FF` (U+2028) | invalid |
| `AA：BB：CC：DD：EE：FF` (fullwidth colon `U+FF1A`) | invalid |
| `AA–BB–CC–DD–EE–FF` (en dash `U+2013`), em dash `U+2014`, `U+2010`/`U+2011` | invalid |
| `ＡＡＢＢＣＣＤＤＥＥＦＦ` (fullwidth ASCII `U+FF21…`) | invalid |
| `"ﬀﬀﬀﬀﬀﬀ"` (`U+FB00` × 6) | invalid — **locks the validate-before-uppercase fix (trap #2)** |
| `AA/BB/CC/DD/EE/FF` (slash) | invalid |

Notes: an empty string is `invalid` from the parser's perspective; the **empty resting UI state** (placeholder, no banner) is the caller's concern and lands in Story 1.4. Separator *positions* are not validated; only the count and hex-ness of the residual characters matter.

### Vitest setup details

`vitest.config.ts` (new file at repo root):

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

- A dedicated `vitest.config.ts` is used **instead of** adding a `test` field to `vite.config.ts`, so the CRXJS plugin never runs during unit tests. Vitest prefers `vitest.config.ts` when present.
- `environment: 'node'` is correct here — pure logic. `happy-dom` is **not** needed this story (it is for `src/ui/render.test.ts` in a later story). Do not install it.
- Explicit `import { describe, it, expect } from 'vitest'` means no `globals: true` and **no change to `tsconfig.json`** (`types` stays `["vite/client", "chrome-types"]`). `src/lib/parse.test.ts` is already covered by `tsconfig.include: ["src", …]`, so `npm run typecheck` checks the tests too.
- `vitest.config.ts` is a tooling config; it is intentionally left out of `tsconfig.include` (leave `tsconfig.json` untouched) to avoid coupling `tsc` to Vitest's bundled Vite types.

### MAC input chrome (UX-DR3 — exactly these tokens)

DESIGN.md `components.mac-input` frontmatter (verbatim): `background: colors.field`, `foreground: colors.text`, `border: colors.border`, `borderWidth: 1.5px`, `borderFocus: colors.focus-ring`, `radius: rounded.md`, `padding: 11px 12px`, `typography: typography.mac-input`, `placeholderColor: colors.text-muted`.

Target CSS (extend the existing rule; keep the Story 1.2 typography declarations):

```css
.mac-input {
  box-sizing: border-box;
  width: 100%;
  padding: 11px 12px;
  background: var(--color-field);
  color: var(--color-text);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  outline: none;
  /* …existing mac-input typography stays (14px/700, 0.03em, uppercase)… */
}

.mac-input:focus-visible {
  border-color: var(--color-focus-ring);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-focus-ring) 22%, transparent);
}
```

Rationale/conflict note: `mockups/status-popup.html` renders focus with `.in:focus { border-color: var(--accfg); box-shadow: 0 0 0 3px color-mix(in srgb,var(--accfg) 22%,transparent) }` where `--accfg` is **green**. `DESIGN.md` is authoritative: the focus ring is **neutral ink** and the accent is banned. Use the mockup's ring **geometry** with `--color-focus-ring`. `:focus-visible` on a text input matches for both keyboard and pointer focus, so the ring is visible in the paste-first flow and on Tab. The 1.5px border ring is high-contrast (light: `#D6DBE1`→`#0B0D10`; dark: `#30363D`→`#F0F6FC`).

### Testing requirements

- One co-located test file: `src/lib/parse.test.ts`. It must cover **every** row of the Behavior table plus a shape assertion for both outcomes. Prefer `it.each` over many hand-written `it` blocks.
- No DOM/E2E test; no `happy-dom`; no coverage config. `npm test` (Vitest) + `npm run typecheck` + `npm run build` are the gates.

### Previous story intelligence

- **Story 1.2 (tokens/theming, done):** `src/styles/app.css` already defines every token this story needs (`--color-field`, `--color-text`, `--color-border`, `--color-focus-ring`, `--radius-md`) and the `.mac-input` typography block at `app.css:130-141`, with `.mac-input::placeholder` at `:138-141`. The file's comment at `:129` says box chrome "arrives with Story 1.3 (UX-DR3)" — update it. Theming is **pure CSS** (no JS listener); do not add any JS theming.
- **Story 1.1 (scaffold, done):** `index.html` provides `.popup`, `.wordmark`, `.mac-input` (id `mac-input`), `.result-banner` (id `result-banner`, `role="status"`, `aria-live="polite"`, `hidden`), `.format-rows`, and three `.format-row[data-format]` slots (`colon`, `plain`, `cisco`). `src/main.ts` is only `import './styles/app.css';`. Do **not** rename these classes and do **not** wire `main.ts` this story.
- **Toolchain (verified):** `vite@8.3.4`, `@crxjs/vite-plugin@3.0.0`, `chrome-types@0.1.454`, `typescript@6.0.3`; Node v22.22.1, npm 9.2.0. `tsconfig.json` is `strict` + `verbatimModuleSyntax` + `moduleResolution: bundler`.
- **Build/verify caveat (from 1.1):** `npm run dev` rewrites `dist/index.html` into a dev bootstrap; for straight verification run **`npm run build`** then reload the unpacked extension in `chrome://extensions`. The user has `/home/jlundholm/Dev/MACLookup/dist` loaded.
- **Standing guardrails:** zero `permissions`, no network, no telemetry; no runtime dependencies (Vitest is a devDependency).

### Git intelligence

- Recent commits: `906e183` "review of stories 1-1 and 1-2", `c2ecd67` "Story 1-2 creation and dev", `e53247a` "Story 1-1 dev and test", `0d06269` "story 1-1 created". Pattern: one story per feature commit; design tokens and the class surface are already in place; no source logic exists yet (this story creates the first `src/lib/` module).

### Latest technical information

- **Vitest 4.1** (current stable line, `4.1.11` resolved) is the first Vitest release with **first-class Vite 8 support**, and it reuses the installed `vite` (8.3.4) rather than downloading its own. Vitest's own `engines` range is `^20.0.0 || ^22.0.0 || >=24.0.0` (per `package-lock.json`); the widely-quoted Node ≥ 22.12 figure is **Vite 8's** floor, not Vitest's. We run 22.22.1. Use `vitest@^4.1.0` (resolves to `^4.1.11`). (Vitest 5 exists but is brand new; 4.1 is the conservative, documented choice.)
- Import `defineConfig` from `'vitest/config'` (not `'vite'`) in `vitest.config.ts`.

### Project Structure Notes

- New pure layer per architecture.md: `src/lib/` (`types.ts`, `parse.ts`, `parse.test.ts`) — `kebab`/`camel` naming, `parseMac` camelCase, one exported concern per file, **no barrel/index re-export** (import exact paths: `./types`, `./parse`). `vitest.config.ts` sits at the repo root beside `vite.config.ts`, matching the architecture's flat tooling-config layout. Approved variance: none. `tests/fixtures` (architecture gap #3) is **not** needed this story — fixtures are for vendor lookup (Story 2.2).

### References

- [Source: epics.md#Story 1.3] — acceptance criteria; FR1; UX-DR3.
- [Source: epics.md#UX Design Requirements] — UX-DR3 (MAC input component), UX-DR9 (typography), UX-DR10 (focus ring), UX-DR15 (canonical microcopy).
- [Source: architecture.md#Format Patterns] — `ParseResult` discriminated union (line ~303); canonical is exactly 12 uppercase hex (`^[0-9A-F]{12}$`).
- [Source: architecture.md#Pattern Examples] — the illustrative `parseMac` (simplified; superseded by the corrected reference above for AC3).
- [Source: architecture.md#Enforcement Guidelines] — `src/lib/**` pure + co-located test; discriminated-union results; never throw for expected input.
- [Source: architecture.md#Project Structure & Boundaries] — `src/lib/types.ts` contents; co-located `*.test.ts`; no barrel files; `lib` → nothing-else dependency rule.
- [Source: architecture.md#Process Patterns] — error handling (bad input ⇒ `invalid`, no throw); `test` script; `npm run typecheck` + `npm test` gate.
- [Source: DESIGN.md#components.mac-input] — input background/foreground/border/borderWidth/borderFocus/radius/padding/typography/placeholderColor (canonical).
- [Source: DESIGN.md#Color] — focus ring is neutral ink, not a status color; no brand accent/blue.
- [Source: DESIGN.md#Shapes] — `rounded.md` (8px) on the input.
- [Source: ux-.../mockups/status-popup.html] — input focus-ring geometry (reference only; accent color overridden per DESIGN).
- [Source: _bmad-output/implementation-artifacts/1-2-design-tokens-typography-and-automatic-light-dark-theming.md] — token names, `.mac-input` current state, and the review defer that assigned input chrome to this story.
- [Source: _bmad-output/implementation-artifacts/1-1-scaffold-the-extension-zero-permission-manifest-and-popup-shell.md] — class/file surface and toolchain.

## Dev Agent Record

### Agent Model Used

opencode / big-pickle

### Debug Log References

- `npm install -D vitest@^4.1.0` → **failed** with npm 9.2.0 arborist bug `TypeError: Cannot read properties of null (reading 'edgesOut')` at `loadPeerSet` while resolving Vite 8's optional `@vitejs/devtools-*` peers. Re-ran as `npm install -D vitest@^4.1.0 --legacy-peer-deps` → `added 25 packages` (`vitest@4.1.11`). A subsequent plain `npm install` reports `up to date`, so the lock is stable.
- `npm test` → `Test Files 1 passed (1)`, `Tests 34 passed (34)`.
- `npm run typecheck` → 0 errors (`tsc --noEmit`).
- `npm run build` → success, `✓ 7 modules transformed`, emits `dist/assets/index-*.css` (3.82 kB) and the MV3 manifest unchanged.
- Guardrails: `grep '\s' src/lib/parse.ts` → none; `parse.ts` imports only `./types`; `types.ts` has no imports; focused CSS uses `--color-focus-ring` (no status color); `git diff --stat index.html src/main.ts` → empty (untouched).
- **Post-review patch verification (2026-10-10):** `npm test` → 38 passed (was 34; +4 whitespace-class rows); `npm run typecheck` → 0 errors; `npm run build` → success. `.npmrc` exercised by a clean-tree `npm install` in a throwaway copy (no lock): 74 packages, exit 0. Honest caveat: the control run **without** `.npmrc` in a fresh empty tree also succeeded — the original crash was in the *existing* project tree — so the pin is a conservative safeguard that reproduces the known-good `--legacy-peer-deps` resolution, not a proven blocker for empty-tree installs.

### Completion Notes List

- **AC1/AC2 (forms + trim/case):** `parseMac` strips ASCII whitespace and separators `[\t\n\v\f\r :.-]`, validates, then uppercases. All five canonical forms plus mixed case, surrounding whitespace/newlines/tabs, mixed separators, and separators-anywhere reduce to `AABBCCDDEEFF`.
- **AC3 (non-ASCII rejected):** the strip class is **ASCII-only** (never `\s`), so NBSP `U+00A0`, `U+2028`, fullwidth colon/ASCII (`U+FF1A`/`U+FF21`), en/em/non-breaking dashes, and `/` all remain and fail validation. Validation runs on the **un-uppercased** string against `/^[0-9A-Fa-f]{12}$/`, closing the Unicode full-case-expansion homoglyph hole (e.g. `U+FB00` `ﬀ` × 6 → would otherwise become `"FF"`×6) — locked by a dedicated test.
- **AC4 (exactly one MAC):** 11/13 hex, non-hex, two MACs from a table export, trailing comma, and trailing vendor text are all `invalid` — no first-match guessing.
- **AC5 (pure parser + tests):** `src/lib/types.ts` holds `ParseResult`; `src/lib/parse.ts` is pure (imports only `./types`, no DOM/`chrome.*`/I-O, never throws); co-located `src/lib/parse.test.ts` has 34 cases across the valid matrix, invalid matrix, and purity/contract checks.
- **AC6 (UX-DR3 chrome):** `.mac-input` extended with full-width field background, `1.5px` border, `--radius-md`, `11px 12px` padding, `--color-text` foreground, and a neutral-ink `:focus-visible` ring (`--color-focus-ring` + 3px `color-mix` halo) — the mockup's ring geometry with the green accent replaced by the neutral token. Placeholder unchanged.
- **Vitest introduction:** `vitest@4.1.11` (Vite 8-compatible; satisfies Vitest's own `engines` `^20 || ^22 || >=24` — we run 22.22.1), dedicated `vitest.config.ts` (`environment: node`, `include: ['src/**/*.test.ts', 'tests/**/*.test.ts']`) so the CRXJS plugin never runs under tests and Story 1.8's root `tests/` guard suite is collected, explicit `vitest` imports (no globals ⇒ `tsconfig.json` untouched apart from adding `tests` to `include`). Scripts: `test` = `vitest run` (deterministic gate), `test:watch` = `vitest` — documented deviation from architecture.md:229's `vitest` shorthand.
- **Out of scope respected:** `index.html` and `src/main.ts` untouched; no input wiring, no invalid-state styling, no new runtime deps, no network/permissions.
- Manual visual check (reload unpacked `dist`, paste the five forms, Tab for the focus ring) is a user-performed confirmation, consistent with Stories 1.1/1.2.

### Change Log

- 2026-10-10: Implemented pure `parseMac` + `ParseResult`, introduced Vitest with exhaustive co-located tests, and applied the UX-DR3 MAC input chrome; status set to review.
- 2026-10-10: Addressed code review findings — 8 patches applied (`.npmrc` pin, genuine cross-call independence test, CR/VT/FF test coverage, Vitest `tests/` include + `tsconfig` coverage, sprint-status history comment, dead assertion removal, Node-floor doc correction, File List completeness); 2 decisions resolved, 2 items deferred, 7 dismissed.

### File List

- `src/lib/types.ts` (new) — `ParseResult` discriminated union.
- `src/lib/parse.ts` (new) — `parseMac(raw)` pure normalizer (ASCII strip → validate-before-uppercase).
- `src/lib/parse.test.ts` (new) — 38 unit tests (valid/invalid/purity matrices; 4 whitespace-class rows added in review).
- `vitest.config.ts` (new) — Vitest node-env config; `include` covers `src/**` **and** the root `tests/` guard suite (patched in review).
- `.npmrc` (new) — `legacy-peer-deps=true`, so clean-tree installs reproduce the working `--legacy-peer-deps` resolution (patched in review).
- `package.json` (modified) — `vitest` devDependency; `test` / `test:watch` scripts.
- `package-lock.json` (modified) — Vitest dependency tree (installed via `--legacy-peer-deps`).
- `tsconfig.json` (modified) — added `tests` to `include` so the Story 1.8 guard suite is also typechecked (patched in review).
- `src/styles/app.css` (modified) — `.mac-input` UX-DR3 base chrome + `:focus-visible` neutral ring.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified) — story 1.3 status transitions + corrected history comment.
- `_bmad-output/implementation-artifacts/1-3-paste-and-normalize-any-common-mac-form.md` (new) — this story record.
- `_bmad-output/implementation-artifacts/deferred-work.md` (modified) — 2 defers appended from this review.
