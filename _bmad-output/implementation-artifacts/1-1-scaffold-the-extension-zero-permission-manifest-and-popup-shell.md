# Story 1.1: Scaffold the extension, zero-permission manifest, and popup shell

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the builder,
I want a runnable Chrome MV3 extension with the zero-permission manifest and an opening popup shell,
So that I have a loadable foundation for every later story.

## Acceptance Criteria

1. **Scaffold + dev load + tooling.** Given a fresh repository, when I scaffold the project (`npm create vite@latest . -- --template vanilla-ts`, `npm install`, `npm i -D @crxjs/vite-plugin@latest chrome-types`) and run `npm run dev`, then Chrome loads the unpacked extension and clicking the toolbar icon opens the popup. `vite.config.ts` uses only `crx({ manifest })`, and `tsconfig.json` is `strict: true` with `chrome-types` types. *(NFR6)*
2. **Zero-permission MV3 manifest.** Given the built/loaded `manifest.json`, when it is inspected, then it is `manifest_version: 3` and declares only `action.default_popup`, `name`, `version`, `description`, and `icons` — and contains **no** `permissions`, **no** `host_permissions`, **no** `background`, and **no** `content_scripts`. *(NFR2)*
3. **Popup shell.** Given the running popup, when it opens, then it renders a single **360px-wide, one-column** shell within Chrome's 800×600 ceiling, with the fixed vertical order **wordmark → MAC input → result-banner slot → three format-row slots** and no scrolling. *(UX-DR2, UX-DR8)*
4. **Build + typecheck.** Given the project, when I run `npm run build`, then an unpacked MV3 extension is emitted to `dist/`; and `npm run typecheck` (`tsc --noEmit`) passes with no errors.

## Tasks / Subtasks

- [ ] **Task 1: Scaffold the Vite vanilla-TS project into the existing (non-empty) repo** (AC: 1)
  - [ ] Run `npm create vite@latest . -- --template vanilla-ts`. The directory is non-empty (`.git`, `_bmad`, `_bmad-output`, `public`, `docs` exist) — when prompted, choose **"Ignore files and continue"**; do NOT remove existing files.
  - [ ] Run `npm install`.
  - [ ] Remove the scaffold demo assets that are not part of OUI Scout: delete `src/counter.ts`, `src/style.css`, `src/typescript.svg`, and `public/vite.svg` (keep `public/icons/`).
  - [ ] Replace the demo `src/main.ts` content with a minimal bootstrap (see Task 5).

- [ ] **Task 2: Add CRXJS + Chrome API types** (AC: 1)
  - [ ] `npm i -D @crxjs/vite-plugin@latest chrome-types` (resolves to `@crxjs/vite-plugin@^2.7.x`).
  - [ ] Confirm the root `package.json` has `"type": "module"` (create-vite sets this).

- [ ] **Task 3: Write the zero-permission `manifest.json`** (AC: 2)
  - [ ] Create root `manifest.json` with exactly the keys shown in Dev Notes (manifest snippet). Reference the existing `public/icons/icon-{16,32,48,128}.png`.
  - [ ] Verify NO `permissions`, `host_permissions`, `background`, or `content_scripts` keys are present.

- [ ] **Task 4: Configure Vite + TypeScript** (AC: 1, 4)
  - [ ] `vite.config.ts`: import `defineConfig` and `crx` and export `defineConfig({ plugins: [crx({ manifest })] })` — nothing else. Content is in Dev Notes.
  - [ ] `tsconfig.json`: ensure `"strict": true` and `"types": ["chrome-types"]` (create-vite may split config into `tsconfig.json` + `tsconfig.app.json`; apply `strict` + `types` to the app config that covers `src/`).
  - [ ] Add `"typecheck": "tsc --noEmit"` and confirm `"build": "vite build"`.

- [ ] **Task 5: Build the popup shell** (AC: 3)
  - [ ] `index.html` (Vite root): `<!doctype html>` with `<title>OUI Scout</title>`, `<meta charset="utf-8">`, viewport meta, link to `/src/styles/app.css`, and `<script type="module" src="/src/main.ts"></script>`. Include the popup shell markup with the four vertical regions (wordmark text, MAC input placeholder, empty banner slot, three empty format-row slots).
  - [ ] `src/styles/app.css`: create the file; set `:root { color-scheme: light dark; }` and shell geometry only (fixed `width: 360px`, one column, no scroll, `body` margin 0). Full DESIGN token system is Story 1.2 — do **not** implement it here.
  - [ ] `src/main.ts`: minimal bootstrap module that imports the CSS and does nothing else yet (rendering comes in later stories). No `chrome.*` calls in this story.

- [ ] **Task 6: Scripts + verification** (AC: 1, 4)
  - [ ] Confirm `package.json` scripts: `dev` (`vite`), `build` (`vite build`), `typecheck` (`tsc --noEmit`), `preview` (keep if present).
  - [ ] Run `npm run typecheck` — must pass.
  - [ ] Run `npm run build` — must emit `dist/` containing `manifest.json`, `index.html`, `icons/`, and the bundled popup assets.
  - [ ] Run `npm run dev` and confirm Chrome loads the unpacked extension from the CRXJS dev output and the toolbar icon opens the 360px popup with no console errors.

## Dev Notes

### Critical guardrails (from Architecture — non-negotiable)

- **Zero permission now and forever.** `manifest.json` must contain no `permissions`, `host_permissions`, `background`, or `content_scripts`. This is the product thesis (privacy-by-construction). A guard test enforces it in Story 1.8.
- **No network, no telemetry.** Do not add any `fetch`, `XMLHttpRequest`, analytics, or remote URL literal anywhere. The only permitted I/O (Story 2.x) is `fetch` against a `chrome-extension:`/`getURL()` target.
- **`vite.config.ts` uses only `crx({ manifest })`.** The manifest is authored explicitly at the repo root — do not generate it from config or add other plugins this story.
- **Vanilla TS + DOM only.** No UI framework, no router, no state library.
- **Keep the surface minimal.** Full design tokens/theming and component styling are **Story 1.2**; the MAC parser is **Story 1.3**; formats **1.5**; copy **1.6**; accessibility **1.7**. This story only lays the shell and the loadable extension.

### Technology versions (verified 2026-10-10)

- `vite` **^8.3.x** (latest stable `8.3.1`; Vite 8 uses Rolldown).
- `@crxjs/vite-plugin` **^2.7.x** (latest `2.7.1`; the 2.7 line added Vite 8 support).
- `chrome-types` — latest (supplies `chrome.*` typings).
- `typescript` — version from `create-vite` scaffold (strict).
- Node engine requirement: Vite 8 needs **Node 20.19+ or 22.12+**. The dev machine is Node v22.22.1 ✅.

### `manifest.json` (root) — exact shape

```json
{
  "manifest_version": 3,
  "name": "OUI Scout",
  "version": "0.0.1",
  "description": "Offline MAC-address converter and OUI vendor lookup.",
  "icons": {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  "action": {
    "default_popup": "index.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  }
}
```

Notes: icon paths are relative to the extension root (Vite copies `public/` verbatim to `dist/`, so `public/icons/*` → `dist/icons/*`). The four icon PNGs already exist in `public/icons/` (committed in `3916496`) — do not recreate them.

### `vite.config.ts` (root)

```ts
import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [crx({ manifest })],
});
```

If importing `manifest.json` trips `resolveJsonModule`, enable `"resolveJsonModule": true` in `tsconfig.json` (or cast/disable the specific lint). Prefer the JSON import so the manifest stays the single source of truth.

### Target project structure (Architecture) — only create files this story needs

```
manifest.json          # NEW this story (zero permissions)
vite.config.ts         # NEW this story — crx({ manifest }) only
tsconfig.json          # NEW this story — strict + chrome-types
package.json           # NEW this story — scripts: dev/build/typecheck
index.html             # NEW this story — popup entry (Vite root)
public/
  icons/icon-16.png    # EXISTS (do not recreate)
  icons/icon-32.png    # EXISTS
  icons/icon-48.png    # EXISTS
  icons/icon-128.png   # EXISTS
src/
  main.ts              # NEW this story — minimal bootstrap
  styles/
    app.css            # NEW this story — shell geometry + color-scheme only
```

Do **not** create `src/lib/`, `src/data/`, or `src/ui/` files yet — those arrive with the stories that need them (`src/lib/parse.ts` in 1.3, `src/data/load-oui-data.ts` in 2.2, `src/ui/*` in later UI stories). The architecture's full tree is the target, not this story's scope.

### Naming conventions (Architecture)

- Files/dirs: `kebab-case` (`build-oui-data.ts`, `app.css`).
- Tests co-located as `*.test.ts`. **No tests are required by this story's ACs** — the first unit test arrives with `src/lib/parse.ts` (Story 1.3). Vitest installation can be deferred to that story to avoid unused dependencies; if you prefer to set it up now, add `vitest` as a dev dependency and a `"test": "vitest"` script, but do not add test files for nonexistent modules.

### Popup shell details (AC 3)

- Fixed **360px** width, single column, no scrolling, inside Chrome's 800×600 popup ceiling.
- Fixed vertical order: **wordmark → MAC input → result-banner slot → three format-row slots**.
- This story only needs the structural regions to exist and stack correctly. Visual styling, tokens, states, and the banner anatomy are implemented in later stories (UX-DR1/2/4/6). Keep it a bare, unstyled-but-laid-out shell.
- Wordmark text is the plain string "OUI Scout" (no logo/icon).

### References

- [Source: architecture.md#Starter Template Evaluation] — selected stack CRXJS + Vite + TypeScript, init command, "project initialization should be the first implementation story".
- [Source: architecture.md#Core Architectural Decisions] — zero-permission manifest; single popup surface; no background/content_scripts.
- [Source: architecture.md#Project Structure & Boundaries] — full directory tree and file responsibilities.
- [Source: architecture.md#Implementation Patterns & Consistency Rules] — kebab-case files, `crx({ manifest })` only, no tests for non-existent modules; no invented strings.
- [Source: architecture.md#Architecture Validation Results] — versions (CRXJS 2.7.0 / Vite 8.3.x) and "First Implementation Priority" scaffold command.
- [Source: epics.md#Story 1.1] — acceptance criteria.
- [Source: ux-designs/ux-Mac Lookup-2026-10-10/DESIGN.md] — Layout & Spacing (360px, single column, no scroll); Components (popup shell); Wordmark.
- [Source: ux-designs/ux-Mac Lookup-2026-10-10/EXPERIENCE.md#Information Architecture] — one surface, fixed vertical order.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
