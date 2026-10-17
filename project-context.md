# Project Context — OUI Scout (Mac Lookup)

Standing rules for AI agents working in this repo. BMAD workflows (`dev-story`,
`create-story`, `code-review`) load this file automatically via their
`persistent_facts` glob (`file:{project-root}/**/project-context.md`).

## Release versioning

- **Increment the rightmost version segment for every story's dev work.** The
  version keeps three dot-separated segments; only the **rightmost** moves per
  story (e.g. `0.0.9` → `0.0.10`) — following the Chrome Web Store "prepare"
  guidance to start low and leave room to grow. Bump `manifest.json`'s
  `version` field only. `package.json` is a private npm package version and is
  **not** bumped.
- Scheme rebased 2026-10-14: the earlier middle-segment scheme (`0.1.0` …
  `0.9.0`) was renumbered so `0.9.0` became `0.0.9`; all bumps after the rebase
  increment the rightmost segment.
- Chrome MV3 versions must be 1–4 dot-separated integers, each 0–65535, with no
  leading zeros.

## Standing guardrails (established in Epic 1)

- Zero `permissions` / `host_permissions` / `background` / `content_scripts`.
  No network, no telemetry, no persistence of any kind.
- `src/lib/**` stays pure: no DOM, no `chrome.*`, no I/O. Each exported function
  ships a co-located `*.test.ts`.
- No barrel / index re-export files — import exact paths.
- Never throw for expected bad input; return a discriminated-union result.
- Theming is pure CSS (`@media (prefers-color-scheme)`). No JS theme listener,
  no toggle, no webfont.
- Canonical MAC values are exactly 12 uppercase hex digits at every boundary.
- Gates on every change: `npm run typecheck` + `npm test` + `npm run build`.
  (`npm install` needs no special flags — a project `.npmrc` pins
  `legacy-peer-deps=true`.)

## Key contracts

- `parseMac(raw) → { ok: true, canonical } | { ok: false, reason: 'invalid' }`
- `formats(canonical) → { plain: string; colon: string; cisco: string; hyphen: string }`
- Copy handler is one delegated click listener keyed by `data-format`
  (`plain|colon|cisco|hyphen`).
- Canonical microcopy is fixed: "Paste a MAC address", "Not a valid MAC
  address", "Unknown vendor", "Copy" / "Copied", "Found" / "Not found" /
  "Invalid".
