# Deferred Work

## Deferred from: code review of 1-1-scaffold-the-extension-zero-permission-manifest-and-popup-shell (2026-10-10)

- `hidden` on the `aria-live="polite"` banner (`index.html:23-29`) can suppress screen-reader announcements while hidden. Owned by Story 1.7 (accessibility floor) — verify the live-region pattern there.
- Long readout/vendor text has no wrap/ellipsis constraint at the fixed 360px width under `overflow: hidden` (`src/styles/app.css:5`). Revisit in Story 1.5 (format rows) and Epic 2 (vendor name).
- Enforce the offline/no-network posture with a restrictive MV3 CSP (`manifest.json`). Deferred to Story 1.8 (privacy guard suite) — single owner there, keeps 1.1 a pure scaffold. Note: MV3's default CSP does not restrict `connect-src`, and CRXJS dev mode requires a dev-server connect, so any CSP must keep `npm run dev` working.
- No automated guard asserting the zero-permission / no-background / offline posture stays intact (`manifest.json`). Explicitly the scope of Story 1.8 (privacy guard test suite).
- `tsconfig.json` `lib` omits `DOM.Iterable` (`tsconfig.json:4`) — latent typecheck failure if future code iterates DOM collections. Low priority.
- No Node `engines` field / `.nvmrc` pin for the Vite 8 toolchain (`package.json`). Low-risk DX hardening.
- Dev server port is not pinned for the CRXJS dev origin (`vite.config.ts:5-7`) — if Vite falls back off port 5173, the CRXJS dev manifest origin mismatches and popup scripts fail to load. Dev-only edge case.

## Deferred from: code review of 1-2-design-tokens-typography-and-automatic-light-dark-theming (2026-10-10)

- MAC input foreground and box chrome not themed (`.mac-input` sets no `color`; `--color-focus-ring` unused; no `:focus-visible`). Deferred to Story 1.3 (UX-DR3) which owns the input component.
- Typographic role hooks (`.readout`/`.field-label`/`.state-label`/`.prefix`) lack a `margin: 0` reset and `min-width: 0`/`overflow-wrap` guards. Deferred to Story 1.5 (UX-DR6) where the row components render them.
- High-contrast `forced-colors` mode and zoom/fixed-px text scaling are unhandled. Deferred to Story 1.7 (accessibility floor); state is also carried by the `state-label` text, so color is reinforcement.
- Popup-shell shadow and corner radius are clipped/ineffective in a real extension popup (`.popup` width == `body` width, `overflow: hidden`). Cosmetic; revisit only if the shell frame matters.
