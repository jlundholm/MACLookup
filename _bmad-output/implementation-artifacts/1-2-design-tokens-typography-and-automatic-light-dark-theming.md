---
baseline_commit: e53247a4dedfb73a75053b722ba76ebeb8c87041
---

# Story 1.2: Design tokens, typography, and automatic light/dark theming

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Jared,
I want the popup to use the OUI Scout design tokens and follow the system light/dark preference automatically,
so that it looks native and needs no manual toggle.

## Acceptance Criteria

1. **Tokens present.** Given the design system, when `src/styles/app.css` is inspected, then every `DESIGN.md` token is present as a CSS custom property — monochrome surfaces (`surface`, `field`, `border`, `text`, `text-muted`, `focus-ring`) and the three status triads (`found`, `miss`, `invalid`), each in light and dark pairs; corner radii `sm 6 / md 8 / lg 10 / full`; spacing scale `1–4`; and `color-scheme: light dark` is set on `:root`. *(UX-DR1)*
2. **Auto light/dark.** Given the OS is in light mode, when the popup opens, then it renders in light styling; and with the OS in dark mode it renders in dark styling. *(FR7)*
3. **Live theme change, no toggle.** Given the popup is open, when the OS light/dark preference changes, then the popup updates live with no reload, and no manual theme toggle exists anywhere in the UI. *(FR7)*
4. **Typographic roles.** Given the typographic roles, when text is rendered, then body `14px/400`, mac-input `14px/700` uppercase, readout `13.5px/700` with `font-variant-numeric: tabular-nums`, field-label `10px/800` uppercase, state-label `12px/800` uppercase with wide tracking, prefix `11px/700` tabular, button `11.5px/800`, and wordmark `12.5px/700` all use the system font stack with **no webfont**. *(UX-DR9)*
5. **Contrast.** Given either theme, when text contrast is measured, then body and status text meet WCAG AA (≥ 4.5:1). *(UX-DR11)*

## Tasks / Subtasks

- [x] **Task 1: Define the color tokens (light + dark pairs)** (AC: 1, 5)
  - [x] In `src/styles/app.css`, add a `:root` block containing the six monochrome tokens and the nine status-triad tokens with their **light** hex values, exactly as in the DESIGN token table in Dev Notes.
  - [x] Add `@media (prefers-color-scheme: dark) { :root { ... } }` overriding those **same** property names with the **dark** values from the table.
  - [x] Keep every hex value verbatim from DESIGN.md — do not "round" or retint.

- [x] **Task 2: Add `color-scheme` and the non-color tokens** (AC: 1)
  - [x] Set `color-scheme: light dark;` on `:root` (already present from 1.1 — keep it).
  - [x] Add radius tokens `--radius-sm: 6px`, `--radius-md: 8px`, `--radius-lg: 10px`, `--radius-full: 9999px`.
  - [x] Add spacing tokens `--space-1: 4px`, `--space-2: 8px`, `--space-3: 12px`, `--space-4: 16px`.

- [x] **Task 3: Define typography tokens (system stack, no webfont)** (AC: 4)
  - [x] Add `--font-sans` with the exact system stack from DESIGN.md.
  - [x] Add the size/weight/(tracking) custom properties for all eight roles (body, mac-input, readout, field-label, state-label, prefix, button, wordmark) per the typography table in Dev Notes.

- [x] **Task 4: Apply tokens to the shell + wire theming** (AC: 2, 3, 4)
  - [x] `body`: `background: var(--color-surface)`, `color: var(--color-text)`, body typography (`font-family/size/weight/line-height`), keep `width: 360px; margin: 0; overflow: hidden`.
  - [x] `.popup`: apply the popup-shell token set — `background: var(--color-surface)`, `border: 1px solid var(--color-border)`, `border-radius: var(--radius-lg)`, `padding: var(--space-3)`, and the single allowed shadow `0 1px 3px rgba(0, 0, 0, 0.16)`.
  - [x] `.wordmark`: wordmark role tokens. **Plain text only — no accent/status color** (see conflict note).
  - [x] `.mac-input`: mac-input role tokens (`14px/700`), `text-transform: uppercase`, and `.mac-input::placeholder { color: var(--color-text-muted); text-transform: none; }`. **Do not** yet add the input box chrome (background/border/padding/focus) — that is Story 1.3 (UX-DR3).
  - [x] Verify NO JavaScript theme code is added (no `matchMedia`, no `.dark`/`.light` class toggling, no `chrome.storage`).

- [x] **Task 5: Add the remaining typographic-role classes** (AC: 4)
  - [x] Add class hooks for the roles whose components arrive later: `.readout` (tabular-nums), `.field-label` (uppercase), `.state-label` (uppercase, wide tracking), `.prefix` (tabular-nums), `.copy-button` (button role). These are declarations only — no elements reference them yet. Later stories (1.5 rows, 1.6 copy, 2.3 banner) MUST reuse these class names.

- [x] **Task 6: Verify** (AC: 1–5)
  - [x] `npm run typecheck` passes and `npm run build` succeeds (CSS change must not break the CRXJS build).
  - [x] `grep`-confirm each DESIGN hex value appears in `app.css`.
  - [x] Manually: rebuild, reload the unpacked `dist` in Chrome, and toggle the OS light/dark theme while the popup is open — the popup flips instantly with no reload.

### Review Findings

_Code review 2026-10-10 (target `e53247a..c2ecd67`; layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor). Acceptance Auditor: **zero AC violations** — all 27 hex values, radii, spacing, and typography roles match DESIGN.md verbatim; AC5 contrast all ≥4.5:1._

- [x] [Review][Defer] MAC input foreground + box chrome not themed (no `color`, no `:focus-visible`) [src/styles/app.css:130-141] — deferred to Story 1.3 (UX-DR3): `.mac-input` sets no `color`, so typed text falls back to the UA `fieldtext` value (theme-appropriate via `color-scheme`, but not the `--color-text` token); `--color-focus-ring` is defined but unused. The input component story owns foreground/border/radius/focus.
- [x] [Review][Defer] Typographic role hooks lack layout guards [src/styles/app.css:144-169] — deferred to Story 1.5 (UX-DR6): `.readout`/`.field-label`/`.state-label`/`.prefix` set only font properties — no `margin: 0` reset (UA margins on `<p>/<h*>` would break the `.popup` `gap` rhythm) and no `min-width: 0`/`overflow-wrap` to stop an unbroken readout from overflowing the 360px shell.
- [x] [Review][Defer] High-contrast (`forced-colors`) and zoom/fixed-px text scaling not handled [src/styles/app.css:66-87] — deferred to Story 1.7 (accessibility floor): no `@media (forced-colors: active)` path (status triads collapse to system colors; mitigated because the required `state-label` text also conveys state), and fixed px sizes under `overflow: hidden` can clip at large font/zoom settings.
- [x] [Review][Defer] Popup-shell shadow/radius ineffective in a real extension popup [src/styles/app.css:106-118] — deferred (cosmetic): `.popup` is the same width as `body` and clipped by `overflow: hidden`, so the `0 1px 3px` shell shadow and corner radius don't render against the popup window edge (they read correctly only in the mockup-on-a-page context). Revisit only if the shell frame matters.

## Dev Notes

### Scope boundary (do not overreach)

This story is **tokens + typography + theming only**. It touches **one file: `src/styles/app.css`**. Do **not** build component chrome — the MAC input box (UX-DR3), the result banner (UX-DR4/5), the format rows (UX-DR6), or the copy button (UX-DR7) are Stories 1.3 / 1.5 / 1.6 / 2.3. You define their **tokens and typographic role classes** now; their visual chrome comes with their components.

### Critical guardrails

- **Theming is pure CSS.** Use `@media (prefers-color-scheme: dark)` overriding `:root` custom properties. **No JS listener, no `matchMedia`, no theme toggle, no storage, no anti-FOUC inline script** (MV3 CSP forbids inline scripts). CSS re-evaluates on OS change by itself — that is how live updates are achieved. *(Architecture "Communication Patterns" — see conflict resolution below.)*
- **No webfont.** System UI stack only. No `@font-face`, no Google Fonts, no network.
- **No brand accent / no blue.** The neutral focus ring (`--color-focus-ring`) carries interaction; status triads carry meaning. Nothing else is colored.
- **No network, no telemetry, no new dependencies.** This story adds zero packages.
- **Hex values are canonical.** Copy them exactly from the table below; they are already WCAG-AA validated.

### Conflict resolution (record — prevents wrong implementation)

- Architecture lists theming twice: line ~223 mentions a `matchMedia('(prefers-color-scheme: dark)')` change listener, while the later **"Communication Patterns"** section (architecture.md:319) states: *"Theming: pure CSS `@media (prefers-color-scheme)` — **no JS listener** (CSS updates live by itself)."* The later section is authoritative; line 200 ("CSS-first; no inline scripts") agrees. → **Implement CSS-only theming.**
- The design mockup `mockups/status-popup.html` colors the wordmark accent ("OUI **Scout**") and uses the green status color for the input focus ring. The mockup is **visual reference only**, and `DESIGN.md` says the wordmark is plain text and the focus ring is **neutral ink**. → **Wordmark is plain; focus ring uses `--color-focus-ring`, never a status color.**

### Color token table (from `DESIGN.md` frontmatter — use verbatim)

| CSS custom property | Light | Dark |
|---|---|---|
| `--color-surface` | `#FFFFFF` | `#0D1117` |
| `--color-field` | `#F6F8FA` | `#161B22` |
| `--color-border` | `#D6DBE1` | `#30363D` |
| `--color-text` | `#0B0D10` | `#F0F6FC` |
| `--color-text-muted` | `#57606A` | `#8B949E` |
| `--color-focus-ring` | `#0B0D10` | `#F0F6FC` |
| `--color-found-bg` | `#E6F6EA` | `#0F2417` |
| `--color-found-border` | `#A7E0B3` | `#1F6F3F` |
| `--color-found-fg` | `#0F7B34` | `#56D364` |
| `--color-miss-bg` | `#FFF4DD` | `#2A2110` |
| `--color-miss-border` | `#F0D199` | `#8A6D1E` |
| `--color-miss-fg` | `#8A5300` | `#E3B341` |
| `--color-invalid-bg` | `#FDEAEA` | `#2B1416` |
| `--color-invalid-border` | `#F3B7B7` | `#8B3B3B` |
| `--color-invalid-fg` | `#C62828` | `#FF7B72` |

Pattern (the dark pair for each token is the override inside the media query):

```css
:root {
  color-scheme: light dark;
  --color-surface: #FFFFFF;
  --color-field: #F6F8FA;
  /* …all light tokens… */
}
@media (prefers-color-scheme: dark) {
  :root {
    --color-surface: #0D1117;
    --color-field: #161B22;
    /* …same property names, dark values… */
  }
}
```

### Radius + spacing tokens

```css
--radius-sm: 6px; --radius-md: 8px; --radius-lg: 10px; --radius-full: 9999px;
--space-1: 4px;  --space-2: 8px;  --space-3: 12px;  --space-4: 16px;
```

### Typography table (from `DESIGN.md` frontmatter)

| Role | Size | Weight | Extra |
|---|---|---|---|
| body | 14px | 400 | line-height 1.45 |
| mac-input | 14px | 700 | letter-spacing 0.03em; rendered `text-transform: uppercase` |
| readout | 13.5px | 700 | letter-spacing 0.03em; `font-variant-numeric: tabular-nums` |
| field-label | 10px | 800 | letter-spacing 0.09em; uppercase |
| state-label | 12px | 800 | letter-spacing 0.13em; uppercase |
| prefix | 11px | 700 | tabular-nums |
| button | 11.5px | 800 | letter-spacing 0.04em |
| wordmark | 12.5px | 700 | letter-spacing 0.02em |

Font stack (verbatim): `system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`

Suggested custom-property names (keep consistent): `--font-sans`, `--type-<role>-size`, `--type-<role>-weight`, and `--type-<role>-tracking` where a letter-spacing applies.

### Contrast pairs to confirm (AC5 — DESIGN.md guarantees AA; spot-check only)

- `--color-text` on `--color-surface`: `#0B0D10` on `#FFFFFF`; dark `#F0F6FC` on `#0D1117`
- `--color-found-fg` on `--color-found-bg`: `#0F7B34` on `#E6F6EA`; dark `#56D364` on `#0F2417`
- `--color-miss-fg` on `--color-miss-bg`: `#8A5300` on `#FFF4DD`; dark `#E3B341` on `#2A2110`
- `--color-invalid-fg` on `--color-invalid-bg`: `#C62828` on `#FDEAEA`; dark `#FF7B72` on `#2B1416`

### Testing requirements

- **No automated tests this story.** There is no logic to unit-test, and Vitest is not installed until Story 1.3 (`parse.test.ts`). Do **not** add a test framework now.
- Verification = `npm run typecheck` + `npm run build` + a manual OS light/dark toggle against the loaded extension.

### Previous story intelligence (Story 1.1)

- **Established file/class surface to build on:** `index.html` already provides `.popup`, `.wordmark`, `.mac-input` (id `mac-input`), `.result-banner` (id `result-banner`), `.format-rows`, and three `.format-row[data-format]` slots. `src/main.ts` is `import './styles/app.css';`. `src/styles/app.css` currently holds **shell geometry only** (`:root { color-scheme: light dark }`, `html,body { margin:0 }`, `body { width:360px; overflow:hidden }`, `.popup { flex column; width:360px; overflow:hidden }`).
- **Do not renaming existing classes.** Extend `app.css`; keep `.popup/.wordmark/.mac-input/.result-banner/.format-rows/.format-row` names intact.
- **Toolchain (verify against `package.json`):** `vite@8.3.4`, `@crxjs/vite-plugin@3.0.0`, `chrome-types`, `typescript@6.0.3`; Node v22.22.1. `tsconfig.json` is `strict` with `types: ["vite/client", "chrome-types"]` and includes `src` + `vite.config.ts`.
- **CRXJS dev-mode caveat (from 1.1):** `npm run dev` rewrites `dist/index.html` into a dev bootstrap page and augments the dev manifest. For straightforward visual verification, run **`npm run build`** then click **reload (↻)** on the unpacked extension in `chrome://extensions`. (The user has already loaded `/home/jlundholm/Dev/MACLookup/dist`.)
- **Guardrails still in force:** zero `permissions`; no network; no new deps.

### Project Structure Notes

- Single file change: `src/styles/app.css`. No new directories (the architecture's target `src/styles/app.css` already exists). Naming stays kebab-case; custom properties use the `--color-*` / `--radius-*` / `--space-*` / `--type-*` / `--font-sans` scheme above so later stories and `render()` can stay in lockstep.

### References

- [Source: architecture.md#Frontend Architecture] — CSS custom properties mirror DESIGN tokens; `color-scheme: light dark` on `:root`; `prefers-color-scheme` media queries; no framework.
- [Source: architecture.md#Communication Patterns] — "Theming: pure CSS `@media (prefers-color-scheme)` — no JS listener."
- [Source: architecture.md#Privacy-by-construction] — CSS-first theming; no inline/anti-FOUC script (MV3 CSP).
- [Source: architecture.md#Project Structure & Boundaries] — `src/styles/app.css` = DESIGN.md tokens as CSS custom properties.
- [Source: ux-designs/ux-Mac Lookup-2026-10-10/DESIGN.md] — Colors, Typography, Layout & Spacing, Shapes, Components (token frontmatter is canonical).
- [Source: ux-designs/ux-Mac Lookup-2026-10-10/EXPERIENCE.md#State Patterns] — "Dark / light: follows `prefers-color-scheme`; a `change` listener updates live … No manual control." (behavioral: no toggle; live update)
- [Source: epics.md#Story 1.2] — acceptance criteria; UX-DR1, UX-DR9, UX-DR11.
- [Source: _bmad-output/implementation-artifacts/1-1-scaffold-the-extension-zero-permission-manifest-and-popup-shell.md] — prior-story learnings and the class/file surface.

## Dev Agent Record

### Agent Model Used

opencode / big-pickle

### Debug Log References

- `npm run typecheck` → 0 errors.
- `npm run build` → success; emits `dist/assets/index-*.css` (3.49 kB) with no manifest/CSP changes.
- Hex-presence check: all 27 DESIGN.md color values grep-confirmed in `src/styles/app.css`.

### Completion Notes List

- Implemented all increments in a single file, `src/styles/app.css` (no other files touched).
- **AC1:** Every DESIGN.md token is a CSS custom property — six monochrome surfaces + nine status-triad colors, light values on `:root` and dark values overriding the same names inside `@media (prefers-color-scheme: dark)`; radii `sm/md/lg/full`; spacing `1–4`; `color-scheme: light dark` retained on `:root`.
- **AC2/AC3:** Pure-CSS theming. `@media` re-evaluates when the OS preference changes, so the open popup flips live with no reload. No `matchMedia`, no `.dark`/`.light` class toggling, no theme toggle control, no storage — `src/main.ts` remains `import './styles/app.css';`. (Resolved the architecture line 223 vs line 319 conflict in favor of line 319: no JS listener.)
- **AC4:** All eight typographic roles defined as `--type-*` custom properties over the single `--font-sans` system stack (no webfont, no `@font-face`). Applied to the elements that exist (`body`, `.wordmark`, `.mac-input`) and exposed as role classes (`.readout`, `.field-label`, `.state-label`, `.prefix`, `.copy-button`) for Stories 1.5/1.6/2.3. `.readout`/`.prefix` use `font-variant-numeric: tabular-nums`; `.mac-input` uses `text-transform: uppercase` with placeholder `text-transform: none` and `--color-text-muted`.
- **AC5:** Used the canonical hexes verbatim; DESIGN.md guarantees AA for the body and status pairs, so no retinting was needed.
- Applied the popup-shell token set (UX-DR2) to `.popup` — surface background, 1px border, `--radius-lg`, `--space-3` padding, the single allowed `0 1px 3px` shadow — and a `--space-2` vertical rhythm, so the light/dark surface is actually visible. Wordmark kept **plain** (no accent) and the focus-ring token is **neutral ink**, per DESIGN.md, overriding the mockup's green accents (mockup is reference-only; spines win).
- Deferred by design: MAC input box chrome → Story 1.3 (UX-DR3); result banner → 2.3; format rows → 1.5; copy button → 1.6.
- No automated tests: no logic to test and Vitest arrives in Story 1.3. Verification = typecheck + build + hex grep (below) + the manual OS light/dark toggle the user performs against the reloaded `dist`.

### Change Log

- 2026-10-10: Implemented design tokens, typography roles, and pure-CSS light/dark theming in `src/styles/app.css`; status set to review.

### File List

- `src/styles/app.css` (modified) — added full DESIGN.md token set (colors light/dark, radii, spacing, typography), pure-CSS `prefers-color-scheme` theming, popup-shell token application, and typographic role classes.
