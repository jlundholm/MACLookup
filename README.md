# OUI Scout

A Chrome extension (Manifest V3) that turns a pasted MAC address into the three
formats network engineers actually use — **colon**, **plain**, and **Cisco-dot** —
and identifies the hardware **vendor** from its OUI prefix.

Conversion and lookup happen in a single paste, **fully offline**. The OUI
database is bundled inside the extension, so there are no network requests, no
host permissions, and no third-party services. A MAC address never leaves the
machine.

---

## Why it exists

The alternatives are each incomplete: converter-only tools skip vendor lookup,
lookup-only tools send the MAC to a remote service, and the closest reference
extension does exactly that despite a "no data collection" claim. OUI Scout
bundles a build-time snapshot of the IEEE MA-L / MA-M / MA-S registries and does
everything in the popup.

## Privacy posture

These are enforced by a test suite (`tests/privacy.guard.test.ts`), not just
promised:

- **Zero** `permissions`, `host_permissions`, `background`, and `content_scripts`.
- No runtime network access, no telemetry, no persistence.
- The only network activity in the project is the **build-time** dataset
  generator, which runs on your machine and never ships.

## Features

- Paste any common MAC shape — colon, dotted, plain, mixed case, with or without
  separators — and it is normalized to a canonical 12-hex-digit uppercase value.
- Three output formats, each with one-click copy and a "Copied" confirmation:
  - Colon: `AA:BB:CC:DD:EE:FF`
  - Plain: `AABBCCDDEEFF`
  - Cisco-dot: `AABB.CCDD.EEFF`
- Vendor name resolved by longest-prefix match (MA-L / MA-M / MA-S).
- Clear states for the three non-happy paths: **Invalid** (`Not a valid MAC
  address`), **Not found** (`Unknown vendor`, with the queried /24 prefix), and
  **unavailable** (`Database unavailable`).
- Keyboard accessible and screen-reader friendly; automatic light/dark theming.

---

## Requirements

- **Node.js 22.12+** (or 20.19+). Developed and verified on Node 22.
- **Chrome** (or any Chromium browser) for loading the extension.

> `npm install` needs no special flags — the repo's `.npmrc` pins
> `legacy-peer-deps=true`.

## Quick start: build and load the extension

```bash
# 1. Install dependencies
npm install

# 2. Build the production extension (outputs to dist/)
npm run build

# 3. Load it into Chrome
```

1. Open `chrome://extensions` in Chrome.
2. Toggle **Developer mode** (top-right).
3. Click **Load unpacked** and select the **`dist/`** folder.
4. Click the OUI Scout toolbar icon to open the popup.

Paste a MAC (for example `aabb.ccdd.eeff`, `AA:BB:CC:DD:EE:FF`, or
`AABBCCDDEEFF`) and the three formats plus the vendor appear instantly.

To pick up a new build after changing code, run `npm run build` again and click
the **reload** (↻) button on the extension card in `chrome://extensions`.

## Development

```bash
npm run dev
```

This starts the Vite/CRXJS dev server with hot reload and writes a dev build to
`dist/`. Load the unpacked `dist/` folder once (same steps as above); subsequent
edits reload automatically.

> **Verification caveat:** in dev mode CRXJS rewrites `dist/index.html` into a
> bootstrap page and augments `dist/manifest.json` with a dev service worker. For
> a reliable check of real behavior, use `npm run build` and reload the unpacked
> `dist/`.

## Regenerating the OUI database

The bundled dataset at `public/oui-data.json` is committed, so a normal build
does not need it regenerated. To refresh it from the live IEEE registries:

```bash
npm run build:data
```

This is the **only** step that touches the network. It downloads the MA-L, MA-M,
and MA-S CSVs from `standards-oui.ieee.org`, emits a name-only index, and
overwrites `public/oui-data.json`. `npm run build` then copies it verbatim into
`dist/`.

## Packaging for the Chrome Web Store

```bash
npm run build && npm run zip
```

This validates the production `dist/` (zero-permission manifest, store
checklist, dataset byte-equality with `public/`) and writes
`release/oui-scout-<version>.zip` with `manifest.json` at the archive root.
A dev-mode `dist/` (CRXJS adds a service worker) is refused — always `build`
first. Confirm the layout with:

```bash
unzip -l release/oui-scout-<version>.zip   # manifest.json must be at the root
```

The zip is the exact artifact to upload in the developer dashboard; test it by
extracting and loading it unpacked, not just the `dist/` folder.

Store listing copy and the privacy policy live in [`store/`](store/).

---

## Project scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite/CRXJS dev server with hot reload (dev build in `dist/`) |
| `npm run build` | Production build into `dist/` |
| `npm run build:data` | Download IEEE registries and regenerate `public/oui-data.json` |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run test` | Run the full Vitest suite once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run preview` | Preview the built output |
| `npm run zip` | Package `dist/` into `release/oui-scout-<version>.zip` for store upload |

## Testing and quality gates

Every change is expected to pass:

```bash
npm run typecheck   # 0 errors
npm test            # full suite (includes the privacy guard)
npm run build       # production build succeeds
```

- `tests/privacy.guard.test.ts` asserts the zero-permission/no-network posture
  and scans `src/**` for forbidden network APIs and remote URL literals.
- `src/lib/**` is pure (no DOM, no `chrome.*`, no I/O) and each export ships a
  co-located `*.test.ts`.

## Project layout

```
index.html                 Popup markup
manifest.json              MV3 manifest (version bumps happen here)
vite.config.ts             Vite + @crxjs/vite-plugin
public/
  oui-data.json            Bundled OUI dataset (committed; copied into dist/)
  icons/                   Toolbar / extension icons
src/
  main.ts                  Entry point: wiring, event dispatch, dataset load
  lib/                     Pure logic: parse, format, lookup, types (+ tests)
  ui/                      state.ts (reducer) and render.ts (sole DOM writer)
  data/                    Runtime loader for the bundled dataset
  styles/app.css           Design tokens, theming, component styles
scripts/build-oui-data.ts  Build-time IEEE dataset generator (network surface)
tests/                     Privacy guard + build-script tests
```

## Versioning

- Bump the extension version in **`manifest.json`** only (currently `0.0.10`).
  The **rightmost** segment increments once per story/release (`0.0.9` →
  `0.0.10`) — start low, leave room to grow, per the Chrome Web Store "prepare"
  guidance. (Earlier history used the middle segment — `0.1.0` … `0.9.0` —
  renumbered to `0.0.9` on 2026-10-14.)
- `package.json`'s `version` is the private npm package version and is not bumped.

## Status

Published on the Chrome Web Store (version 0.0.10).
