---
baseline_commit: c5dab794455dcb42db5b3f486dbfd3e2d592d408
---

# Story 2.1: Generate the bundled OUI database at build time

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the builder,
I want a repeatable build step that generates the bundled OUI dataset from the IEEE CSVs,
So that vendor lookup is offline, deterministic, and refreshable without any runtime updater.

## Acceptance Criteria

1. **Given** the build scripts, **When** `npm run build:data` runs, **Then** `scripts/build-oui-data.ts` (Node) downloads the IEEE MA-L, MA-M, and MA-S CSVs and extracts Assignment → Organization Name for each row.
2. **Given** the generation script, **When** it writes `public/oui-data.json`, **Then** the artifact has a top-level `schemaVersion` (int), `generatedAt` (ISO-8601 UTC), `sources` (registry → filename), `counts`, and `entries`, **And** `entries` is a flat JSON object whose keys are **uppercase hex prefixes** of 6, 7, or 9 characters and whose values are vendor names **verbatim** from source.
3. **Given** the dataset keys, **When** the registry is determined, **Then** key length routes it — 6 → MA-L, 7 → MA-M, 9 → MA-S — with no registry letter in the key and all hex uppercase.
4. **Given** unchanged source CSVs, **When** the script runs again, **Then** it produces a deterministic, repeatable artifact recording `generatedAt` and `counts`.
5. **Given** the build output, **When** `npm run build` runs, **Then** `oui-data.json` is emitted into `public/` and copied verbatim to `dist/` (loaded at runtime, not imported), **And** the dataset stays within the size budget (DB ≤ ~2 MB compressed; total package ≤ ~3 MB) (NFR5).
6. **Given** the extension, **When** vendor data is needed, **Then** there is no runtime update path — the dataset is only refreshed via the build step (NFR8).

## Tasks / Subtasks

- [ ] Task 1: Add the `build:data` runner and script scaffold (AC: 1)
  - [ ] Add `tsx` and `@types/node` to `devDependencies`; add `"build:data": "tsx scripts/build-oui-data.ts"` to `package.json` scripts. `tsx` is required because this environment's Node (v22.22.1) is **not compiled with TypeScript support** (`node scripts/foo.ts` → `ERR_NO_TYPESCRIPT`), and no `tsx`/`esbuild`/`vite-node` is present in the tree. Build-time-only; never bundled; the privacy guard excludes `scripts/` and `node_modules/` (1-8 decisions 1 & patch), so the IEEE `https://` URLs below do not trip the runtime scan. See Critical Decision 1.
  - [ ] Create `scripts/build-oui-data.ts` exporting pure functions (`parseCsvLine`, `normalizePrefix`, `buildDataset`, …) plus an **entrypoint-guarded** `main()` (`if (import.meta.url === pathToFileURL(process.argv[1]).href)`) so importing the module for tests never triggers a download.
  - [ ] Import Node built-ins explicitly (`node:fs`, `node:path`, `node:url`); no enums/namespaces/parameter-properties (`erasableSyntaxOnly`); use `import type` where needed (`verbatimModuleSyntax`).
- [ ] Task 2: Download + RFC4180 parse the three CSVs (AC: 1)
  - [ ] Fetch (global `fetch`, Node 18+) the three sources — all verified HTTP 200 this story:
    - MA-L → `oui.csv` → `https://standards-oui.ieee.org/oui/oui.csv`
    - MA-M → `mam.csv` → `https://standards-oui.ieee.org/oui28/mam.csv`
    - MA-S → `oui36.csv` → `https://standards-oui.ieee.org/oui36/oui36.csv`
  - [ ] Strip a leading UTF-8 BOM; handle CRLF and LF. Parse per line with a **quote-aware splitter** (no CSV dependency): a field wrapped in `"` may contain commas, and `""` is a literal quote. Verified shape: `MA-L,286FB9,"Nokia Shanghai Bell Co., Ltd.","No.388 Ning Qiao Road,…"`. Fields in these CSVs are single-line (no embedded newlines), so line-splitting is safe; a line with unbalanced quotes is skipped and counted.
  - [ ] Read columns **by header index** (`Registry,Assignment,Organization Name,Organization Address`), not by fixed position. Extract only Assignment + Organization Name.
  - [ ] Defensive: skip rows with empty Assignment or empty Organization Name; tally skips and report.
- [ ] Task 3: Normalize keys, route registry, build `entries` + `counts` (AC: 2, 3)
  - [ ] `normalizePrefix`: trim Assignment → uppercase → validate `/^[0-9A-F]+$/` and length ∈ {6, 7, 9}. **Length is authoritative** for routing (AC3): 6 → `l24`/MA-L, 7 → `m28`/MA-M, 9 → `s36`/MA-S. The CSV `Registry` column is a defensive cross-check only (MA-L=6, MA-M=7, MA-S=9); on mismatch trust the length and log.
  - [ ] Vendor = Organization Name **trimmed, verbatim** — do **not** uppercase or reformat vendor names (only the prefix key is uppercased; "Apple, Inc." stays exactly as written). Skip empty vendors.
  - [ ] Build the flat `entries` object inserting keys in **ascending sorted order** so the serialized artifact is canonical and independent of CSV row order. (JS engines hoist integer-like keys — an all-digit prefix like `123456` — ahead of letter-bearing keys; sorting makes the output deterministic regardless of insertion order.) See Critical Decision 4.
  - [ ] Assemble the pinned top-level shape (exact key names — Story 2.2 builds Maps named `l24`/`m28`/`s36` off `counts`):
    ```json
    {
      "schemaVersion": 1,
      "generatedAt": "<new Date().toISOString()>",
      "sources": { "ma-l": "oui.csv", "ma-m": "mam.csv", "ma-s": "oui36.csv" },
      "counts": { "l24": 0, "m28": 0, "s36": 0 },
      "entries": {}
    }
    ```
    `counts.l24/m28/s36` = number of entries in each bucket; their sum must equal `Object.keys(entries).length`. `sources` stores the **filename**, not the URL.
- [ ] Task 4: Emit, verify determinism + size, wire the dist copy (AC: 4, 5)
  - [ ] Write `public/oui-data.json` (`writeFileSync`, `JSON.stringify` with the sorted-keys object). `public/` already exists (holds `icons/`).
  - [ ] Determinism: run the build twice against the same fixture/input and confirm `entries` and `counts` are deep-equal (`generatedAt` is excluded from the comparison — it is a run timestamp). See Critical Decision 4.
  - [ ] Measure **raw + gzipped** byte size of the JSON; record both in the story. Confirm within NFR5 (DB ≤ ~2 MB compressed; total package ≤ ~3 MB). Architecture estimates 0.6–0.8 MB raw, so expect large headroom. See Critical Decision 6.
  - [ ] Run `npm run build`; verify `dist/oui-data.json` exists and is **byte-identical** to `public/oui-data.json` (Vite `publicDir` copy). If CRXJS does not copy it, handle explicitly and note it — AC5 requires the verbatim dist copy. Confirm the JSON is *copied*, never imported/bundled by Vite.
- [ ] Task 5: Tests (AC: 2, 3, 4)
  - [ ] Create `tests/build-oui-data.test.ts` (Node env; **no** happy-dom pragma — pure string/object logic). Import the pure functions from `../scripts/build-oui-data.ts`; the entrypoint guard (Task 1) guarantees no download on import.
  - [ ] Inline CSV **fixtures** inside the test file (never committed "bad" files): a quoted org name with an embedded comma; an escaped quote (`""`); CRLF; a leading BOM; an all-numeric prefix vs. a letter-bearing prefix (sorted-insertion / integer-key check); a wrong-length Assignment (skipped); an empty vendor (skipped). Assert: uppercase keys, correct length→bucket routing, verbatim vendor casing, `counts` sum == entries size.
  - [ ] Determinism test: build twice from the same fixture → `entries` and `counts` deep-equal.
  - [ ] **Committed-artifact structural test**: `readFileSync(resolve(process.cwd(), 'public/oui-data.json'))` + `JSON.parse` (the established `render.test.ts`/`privacy.guard.test.ts` convention). Assert `schemaVersion === 1`; `generatedAt` parses as a valid ISO-8601 UTC string; `sources` has exactly `ma-l`/`ma-m`/`ma-s`; `counts.l24 + m28 + s36 === Object.keys(entries).length`; every key matches `/^[0-9A-F]{6,7,9}$/` and lands in the bucket its length implies. **Pinned vendor lookups (e.g. `F01898` → "Apple, Inc.") are Story 2.2's `lookup.test.ts`, not here** — this story proves shape and parse integrity only.
  - [ ] Note for the dev agent: the `https://` IEEE URLs live **only** in `scripts/`, which the privacy guard (1-8) excludes from its `src/` scan — no conflict; do not move them into `src/`.
- [ ] Task 6: Commit the artifact, version bump, gates (AC: 1–6)
  - [ ] **Commit `public/oui-data.json`** (Critical Decision 5) so `npm run build` ships a working, offline extension without re-running `build:data`; the committed-artifact test (Task 5) guards against a missing/stale/corrupt file.
  - [ ] `manifest.json` `version`: `0.6.0` → `0.7.0` (minor bump per story; `package.json` `version` untouched).
  - [ ] Gates: `npm run typecheck` (0 errors), `npm test` (existing 118 + the new file, all green), `npm run build` (succeeds; `dist/oui-data.json` present and byte-identical to `public/`).
  - [ ] Guardrail greps: no changes under `src/**`; no runtime `fetch`/update path added anywhere in `src/` (AC6); `dist/` size within budget.
  - [ ] Record the raw + gzipped sizes and the MA-L/MA-M/MA-S entry counts in the story's Completion Notes.

## Dev Notes

### Critical Decisions

1. **`tsx` is the `build:data` runner — a build-time-only devDependency.** This Node (v22.22.1) throws `ERR_NO_TYPESCRIPT` on `.ts` entrypoints (the binary is not compiled with type-stripping), and the tree has no `tsx`/`esbuild`/`vite-node`. `tsx` is the de-facto way to run Node TypeScript, installs as a devDependency only, and is never bundled (Vite/CRXJS build from `src/` + `manifest.json`; `tsx`/its `esbuild` live in `node_modules`, which the guard skips). The IEEE `https://` URLs live in `scripts/`, which 1-8 decision 1 deliberately excluded from the runtime privacy scan precisely because "the build-time IEEE downloader is Story 2.1's network surface." Alternative — native `node --experimental-strip-types` — is unusable on this Node build; revisit only if the toolchain standardizes on a Node compiled with TS support.
2. **Hand-rolled RFC4180 parser, no CSV dependency.** The project's thesis is a small, zero-runtime-dependency utility; `csv-parse` for three files and a ~20-line quote-aware splitter is overkill. Verified file shape: header `Registry,Assignment,Organization Name,Organization Address`; CRLF; UTF-8 BOM; org names quoted with embedded commas; single-line fields.
3. **Key length is authoritative for registry routing; vendor names stay verbatim.** AC3 routes purely by length (6/7/9), so the CSV `Registry` column is only a cross-check. Only the prefix key is uppercased — the AC says values are "verbatim from source," so "Nokia Shanghai Bell Co., Ltd." and "Apple, Inc." keep their exact casing and punctuation. (Architecture's "prefix → vendor name only, uppercased" refers to the key.)
4. **Determinism means same CSVs → identical `entries` + `counts`; `generatedAt` is a timestamp and is *expected* to change.** Entry keys are inserted in ascending sorted order so the artifact is canonical and immune to CSV row reordering — and to JS engines hoisting integer-like keys ahead of letter-bearing ones. The determinism test therefore deep-compares `entries`/`counts`, never `generatedAt`.
5. **Commit `public/oui-data.json`.** It is the actual shipped data. The gates run `npm run build`, which must produce a working extension offline without re-dialing IEEE; gitignoring it would let a fresh clone silently ship an extension with **no database** (Vite would simply have nothing to copy). OQ-1 (IEEE redistribution) is a launch-blocker only if published and irrelevant for a private, personal-use repo. The committed-artifact structural test (Task 5) makes a missing/stale/corrupt file a gate failure. Alternative — gitignore + a `prebuild` regenerate hook — is deferred: it reintroduces a network dependency into every build.
6. **Size budget is enforced by measurement, not a hard build failure (for now).** NFR5 caps the DB at ~2 MB compressed / package at ~3 MB; architecture estimates 0.6–0.8 MB raw. The script records raw + gzipped size; if it ever approaches the budget, revisit (gzip packaging via `DecompressionStream` is an architecture deferred decision). A hard fail today would be speculative.
7. **No `tsconfig.json` change required.** `scripts/` is not in `include`, but the test in `tests/` imports the script, so `tsc --noEmit` typechecks it via the import — the same reason `tests/privacy.guard.test.ts` already typechecks its `node:fs` imports and `process.cwd()` global under `types: ["vite/client","chrome-types"]`. Keep the script free of bundle-only or DOM-incompatible imports. Adding `"scripts"` to `include` is an optional fallback if typecheck errors force it.

### Behavior / Contract Table

| Surface | Before (current code) | After (this story) |
|---|---|---|
| `scripts/` directory | does not exist | + `scripts/build-oui-data.ts` (Node generator; pure fns + guarded `main`) |
| `public/oui-data.json` | does not exist | + committed artifact (`schemaVersion` 1, `generatedAt`, `sources`, `counts`, `entries`) |
| `package.json` scripts | `dev`/`build`/`typecheck`/`test`/`test:watch`/`preview` | + `build:data` (`tsx scripts/build-oui-data.ts`) |
| `package.json` devDependencies | vite, vitest, typescript, @crxjs/vite-plugin, chrome-types, happy-dom | + `tsx`, `@types/node` (build-time / types-only; never shipped) |
| `npm test` | 5 files, 118 tests | + `tests/build-oui-data.test.ts` (parse/build/determinism + committed-artifact structural) |
| `manifest.json` | `0.6.0` | `0.7.0` |
| `dist/` after build | icons, index.html, manifest, … | + `oui-data.json` (copied verbatim from `public/`) |
| `src/**` | no network, no update path | **unchanged** — AC6: no runtime update path is added |
| Data payload at runtime | none (Story 1 popup has no vendor) | `oui-data.json` present for Story 2.2 to `fetch(getURL(...))` |

### Testing Standards

- New file `tests/build-oui-data.test.ts`, Node env, **no** happy-dom pragma (pure string/object logic, per the 1-3/1-8 resolution). Import pure functions from `../scripts/build-oui-data.ts`; the entrypoint guard makes import side-effect-free.
- CSV fixtures live **inline in the test file** as strings — the 1-8 lesson (never commit "bad" fixture files into the tree). Cover: quoted-comma vendor, escaped `""` quote, CRLF, BOM, all-numeric vs. letter-bearing key, wrong-length skip, empty-vendor skip.
- Determinism test compares `entries`/`counts` only (never `generatedAt`), building twice from one fixture.
- Committed-artifact structural test reads `public/oui-data.json` via `readFileSync` + `JSON.parse` and asserts shape + counts-consistency + key format. Pinned vendor lookups belong to Story 2.2's `lookup.test.ts` — keep the separation so 2.1 fails only on *generation* defects.
- All 118 existing tests must pass unchanged; this story adds a script, a test file, an artifact, and a manifest version — **no `src/` code changes**.

### Out of Scope (do not touch)

- Any `src/**` change — the loader `src/data/load-oui-data.ts`, `lookupVendor`, the three Maps (`l24`/`m28`/`s36`), and the "Unknown vendor" UI are Stories 2.2 / 2.3.
- A runtime update/refresh path (AC6 explicitly forbids one; none is added).
- Gzip packaging / `DecompressionStream` (architecture deferred decision).
- Full IEEE registry metadata beyond vendor name (address/country) — OQ-3, no FR needs it.
- Chrome Web Store packaging and IEEE redistribution licensing (OQ-1) — Story 3.x; the artifact is committed for personal use only.
- CI workflow (architecture deferred).
- `package.json` `version` field (manifest-only bumps, per project-context).

### Project Structure Notes

- Adds exactly `scripts/build-oui-data.ts`, `tests/build-oui-data.test.ts`, and commits `public/oui-data.json` — all three already named in architecture's file tree (`scripts/build-oui-data.ts  # IEEE CSVs → public/oui-data.json`).
- `public/` exists (holds `icons/`); Vite's `publicDir` copies it to `dist/` on build — Task 4 verifies the copy, including under CRXJS.
- Naming: kebab-case, matches the architecture tree and epics exactly.
- Layering: the generator lives **outside** `src/` so it can never be imported by product code and is not part of the bundle; it depends only on Node `fs`/`path`/`url` + global `fetch` + `tsx`. This mirrors the 1-8 guard's `scripts/` exclusion — build-time network is intentionally outside the runtime privacy perimeter.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.1] — the six ACs; role/action/benefit wording.
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 2] — "FRs covered: FR5, FR6"; Epic 2 framing (offline vendor resolution).
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture] — pinned JSON shape (`schemaVersion`/`generatedAt`/`sources`/`counts`/`entries`); name-only index; "emitted into `public/` so Vite copies it verbatim to `dist/` (not bundled/processed)"; load via `fetch(chrome.runtime.getURL('oui-data.json'))`; deterministic generation recording `generatedAt` + `counts`; ~54,000 prefixes; 0.6–0.8 MB raw; persistence none.
- [Source: _bmad-output/planning-artifacts/architecture.md#Infrastructure & Deployment] — "`build:data` (Node OUI generator)"; "the dataset version is recorded in `oui-data.json`".
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision Impact Analysis] — implementation-sequence step 2 (`scripts/build-oui-data.ts` → `public/oui-data.json`); "the `oui-data.json` schema is a shared contract between the build script and the lookup module — version it (`schemaVersion`)".
- [Source: _bmad-output/planning-artifacts/prds/prd-Mac Lookup-2026-10-10/prd.md#FR-5] / [#FR-6] / [NFR5] / [NFR8] / [OQ-1] — offline vendor resolution; no-match state; size budget (DB ≤ ~2 MB compressed, package ≤ ~3 MB); "no runtime update path"; IEEE redistribution is a publish-time concern.
- [Source: IEEE CSV endpoints, verified HTTP 200 this story] — `https://standards-oui.ieee.org/oui/oui.csv` (MA-L), `https://standards-oui.ieee.org/oui28/mam.csv` (MA-M), `https://standards-oui.ieee.org/oui36/oui36.csv` (MA-S); header `Registry,Assignment,Organization Name,Organization Address`; quoted org names with embedded commas; CRLF; UTF-8 BOM.
- [Source: _bmad-output/implementation-artifacts/1-8-…md] — Critical Decision 1 (`scripts/` excluded from the privacy scan because "the build-time IEEE downloader is Story 2.1's network surface"); `node_modules` skip; `readFileSync(resolve(process.cwd(), …))` convention; version-bump discipline; manifest-verbatim-to-dist verification.
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — guard/CSP/tsconfig resolutions that shaped the `scripts/` boundary and the "no tsconfig change" decision.
- [Source: environment facts verified this story] — Node v22.22.1 lacks native TS stripping (`ERR_NO_TYPESCRIPT`); no `tsx`/`esbuild`/`vite-node` in tree; `@types/node@26.6.5` present transitively; `tsconfig.json` `include: ["src", "tests", "vite.config.ts"]`; `vitest.config.ts` include covers `tests/`.

## Dev Agent Record

### Agent Model Used

opencode / mimo-v2.6-flash-free

### Debug Log References

### Completion Notes List

### File List

- `_bmad-output/implementation-artifacts/2-1-generate-the-bundled-oui-database-at-build-time.md` (new) — this story record.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified) — 2-1 → ready-for-dev; epic-2 → in-progress.
