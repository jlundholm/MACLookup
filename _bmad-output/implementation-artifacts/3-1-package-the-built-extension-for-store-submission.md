---
baseline_commit: 254c84f642d604eda7fc5a7e621b2943e54ea541
---

# Story 3.1: Package the built extension for store submission

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the builder,
I want a repeatable packaging step,
So that I can upload a consistent, versioned build to the Chrome Web Store.

## Acceptance Criteria

1. **Given** a successful production build,
   **When** I run the `zip` script,
   **Then** it packages `dist/` into an archive suitable for store upload.

2. **Given** the packaged artifact,
   **When** versions are inspected,
   **Then** the extension version travels in `manifest.json` and the dataset version is recorded in `oui-data.json` (Additional Requirements).

3. **Given** the packaged extension,
   **When** it is installed in Chrome,
   **Then** it loads as an MV3 extension with no install-time permission warnings (FR8, NFR6).

## Tasks / Subtasks

- [ ] Task 1: Add the `zip` script entry and bump the extension version (AC: 1, 2)
  - [ ] In `package.json` `scripts`, add `"zip": "tsx scripts/package-extension.ts"` alongside the existing entries (same `tsx` runner as `build:data`; no new dependencies of any kind).
  - [ ] Bump `manifest.json` `version` from `0.9.0` to `0.10.0` (project-context: manifest-only minor bump per story's dev work; `package.json` stays `0.0.1`; MV3 permits 1–4 dot-separated integers each 0–65535, no leading zeros).
- [ ] Task 2: Implement `scripts/package-extension.ts` — validation first, zip second (AC: 1, 2, 3; Critical Decisions 1–6)
  - [ ] Give the file the same header treatment as `scripts/build-oui-data.ts`: a doc comment stating it is the **build-time packaging surface**, lives outside `src/` on purpose, and is excluded from the runtime privacy guard (which scans `src/` only).
  - [ ] Export a **pure** `packageViolations(inputs): string[]` function that takes raw inputs (no filesystem reads inside it) — `rootManifestRaw`, `distManifestRaw`, `datasetRaw`, `publicDatasetRaw` (all strings), and `distFiles: string[]` (relative paths present in `dist/`) — and returns every violation found. Checks, all of which fail the run when non-empty:
    - `manifest_version === 3` in the dist manifest;
    - dist manifest `version` **equals** root `manifest.json` `version`;
    - `permissions` / `host_permissions` absent or `[]`; `background` and `content_scripts` absent (the same invariants `tests/privacy.guard.test.ts:17-37` asserts on the root manifest — Critical Decision 5);
    - every file the dist manifest references exists in `distFiles`: `action.default_popup`, every key of `icons`, every key of `action.default_icon`;
    - `dist/oui-data.json` parses and has `schemaVersion` (int), `generatedAt` (ISO-8601 string), `counts`, and a non-empty `entries` object;
    - `dist/oui-data.json` is **byte-identical** to `public/oui-data.json` (catches a hand-edited or stale dataset).
  - [ ] Export a pure `readVersions(distManifestRaw, datasetRaw)` helper that returns the two records AC2 inspects: `{ extension: manifest.version }` and `{ schemaVersion, generatedAt, counts }` from the dataset.
  - [ ] `main()` plumbing (thin, untested): read the files from disk, run both pure helpers, and on any violation print each one plus `Run 'npm run build' first — dist/ is missing or stale.` and `process.exit(1)`.
  - [ ] Zip step, only reached with zero violations:
    - create `<repo>/release/` and delete any pre-existing `release/oui-scout-*.zip` so exactly one artifact remains;
    - spawn the system `zip` with **cwd = `dist/`**: `zip -r -X <abs>/release/oui-scout-<version>.zip . -x "*.DS_Store"` — running from inside `dist/` is what puts `manifest.json` at the **archive root** (Critical Decision 2); `-X` drops extra file attributes;
    - if the `zip` binary is unavailable, fail with an explicit message naming it as a system prerequisite (it is present at `/usr/bin/zip` on this machine).
  - [ ] Report, in one block: extension version (from the packaged manifest), dataset `schemaVersion` + `generatedAt` + `counts`, the archive path, the archive byte size, and the uncompressed `dist/` byte size (AC2).
  - [ ] Enforce the size budget: fail if the archive exceeds **3 MiB** (NFR5 / SM-C1 / PRD §8 — Critical Decision 6).
- [ ] Task 3: Ship `tests/package-extension.test.ts` (AC: 1, 2, 3)
  - [ ] Node-env Vitest (already in `vitest.config.ts` `include: ['src/**', 'tests/**']`), importing the two pure exports from `../scripts/package-extension`.
  - [ ] Inline JSON fixtures only — **never** committed "bad" files (the Story 1.8 lesson): build manifest/dataset literals with `JSON.stringify` inside the test.
  - [ ] Cover: a valid package → `[]`; version mismatch (root `0.10.0` vs dist `0.9.0`); a dev-augmented dist manifest carrying `background`; `permissions: ['tabs']`; a manifest referencing a missing icon; `host_permissions` present; malformed/missing dataset keys; a dist dataset that differs from `public/`'s; and `readVersions` returning both records verbatim.
  - [ ] Nothing is added under `src/` — there is nothing to unit-test there (see Out of Scope). Record in Completion Notes that `git status` shows zero `src/**` changes, and that the privacy guard passed untouched.
- [ ] Task 4: Documentation and housekeeping (AC: 1, 2)
  - [ ] `.gitignore`: add a `release/` entry (packaged artifacts are build output, never committed — same treatment as `dist/`).
  - [ ] `README.md`:
    - add `npm run zip` to the **Project scripts** table (packages `dist/` into `release/oui-scout-<version>.zip` for store upload);
    - update **Versioning** "currently `0.9.0`" → "`0.10.0`";
    - add a short **Packaging for the Chrome Web Store** block: `npm run build && npm run zip`, then `unzip -l release/…` confirms `manifest.json` at the archive root.
  - [ ] Leave README's **Status** section ("Not yet submitted") alone — still true until Story 3.2 publishes.
- [ ] Task 5: Run the gates and package (AC: 1, 2, 3; all Critical Decisions)
  - [ ] `npm run typecheck` → 0 errors; `npm test` → full suite green (228 tests at baseline, incl. the untouched privacy guard); `npm run build` → production build succeeds.
  - [ ] `npm run zip` → prints the version block and exits 0.
  - [ ] `unzip -l release/oui-scout-0.10.0.zip` → `manifest.json`, `index.html`, `oui-data.json`, `icons/*`, `assets/*` all at the archive root (no `dist/` prefix folder).
  - [ ] **Dev-dist rejection drill:** confirm the guard actually fires — e.g. run `npm run dev` once (which augments `dist/manifest.json` with a dev service worker), then `npm run zip` must fail and tell you to rebuild. Re-run `npm run build` afterward so `dist/` is a production build again (README's dev-mode caveat).
  - [ ] **Manual AC3 verification** (record the result in Completion Notes): `unzip release/oui-scout-0.10.0.zip -d /tmp/oui-scout-pkg` → `chrome://extensions` → Developer mode → **Load unpacked** `/tmp/oui-scout-pkg` → no install-time permission warning appears, the popup opens, and a known MAC still resolves its vendor. This is the last-mile check no unit test can make.

### Review Findings

_(added by code-review)_

## Dev Notes

Epic 3 opens with the smallest of its three stories: no runtime code, no UI, no data work — a packaging tool plus the verification that what lands in the zip is the same zero-permission, offline artifact Epic 1 and 2 built. Epic 3 is **conditional** on the publish decision (sprint-status.yaml, FR8), and OQ-1 is already resolved (2026-10-14, Option A), so nothing gates this story.

**Read before writing.** Files this story touches: `package.json`, `manifest.json`, `.gitignore`, `README.md`, plus two **new** files (`scripts/package-extension.ts`, `tests/package-extension.test.ts`). Existing code to read first: `scripts/build-oui-data.ts` (the house style for a `scripts/*.ts` build tool: doc header, exported pure helpers, `node:` imports, main() at the bottom), `tests/build-oui-data.test.ts` (the house style for testing one: inline fixtures, import from `../scripts/…`), and `tests/privacy.guard.test.ts:17-37` (the manifest invariants you are mirroring for the dist copy).

**What already works and must not break:** the entire runtime extension — parser, formatter, clipboard, dataset, lookup, banner, a11y floor — is untouched by this story; the privacy guard's root-manifest and `src/` scans; `npm run build` output shape (`dist/` = `manifest.json`, `index.html`, `oui-data.json`, `icons/`, `assets/`). Baseline: 228 tests green, `dist` 1,942,154 B uncompressed (NFR5's ~2 MB dataset / ~3 MB package budgets met with headroom).

### Critical Decisions

1. **The system `zip` binary, not an npm library.** No new dependency enters the project for this: `archiver`/`bestzip` would be a wheel for what `/usr/bin/zip` does, and adding a packaging dependency to a zero-dependency-philosophy repo is the wrong trade. The orchestration lives in `scripts/package-extension.ts` (run by `tsx`, exactly like `build:data`), which shells out to `zip`. Portability note recorded in the script's header: `zip` is a system prerequisite; the failure message must say so.

2. **`manifest.json` must sit at the archive root — zip from inside `dist/`.** Chrome Web Store requirement: "place the manifest file in the root directory, not in a folder" (developer.chrome.com/docs/webstore/prepare). The classic bug is `zip -r out.zip dist`, which nests everything under `dist/` and produces an upload Chrome rejects with "Cannot parse the manifest". Running with `cwd = dist/` and zipping `.` makes the failure structurally impossible; the `unzip -l` subtask proves it.

3. **A dev-mode `dist/` is rejected, loudly.** README's verification caveat: "in dev mode CRXJS rewrites `dist/index.html` into a bootstrap page and augments `dist/manifest.json` with a dev service worker." Packaging that artifact would ship a `background` service worker — a direct violation of the zero-permission posture (AC3: install-time permission warnings) and of the manifest invariants the guard asserts on the root manifest. The dist-manifest checks are therefore not belt-and-braces; they are the difference between packaging the product and packaging the dev harness. The error message must point at `npm run build`.

4. **AC2's "dataset version" is the existing `schemaVersion` + `generatedAt` + `counts` — no new field.** architecture.md:309-313 pins the dataset schema as a shared contract ("any change to the dataset schema bumps `schemaVersion`"), and there is no separate version key in it. Inventing one would be an unrequested schema change rippling into `build-oui-data.ts` and the loader. The packaging script *reports* the three existing fields from the artifact inside the archive, which is what "the dataset version is recorded in `oui-data.json`" asks for.

5. **Mirror the guard's invariants; do not import the guard.** `tests/privacy.guard.test.ts` is a test, not a library — importing it into a build script couples packaging to a test file's internals. The ~10 lines of manifest checks are intentionally duplicated so the packaging script can refuse a bad `dist/` on its own. The guard remains the enforcement point for `manifest.json` (root) and `src/`; it does not scan `scripts/` (`collectSourceFiles` walks `src/` only), so the two never interact. Adding anything to `src/` for this story would be scope creep *and* would feed the guard's scan.

6. **Size budget is a hard failure at 3 MiB, not a warning.** NFR5/SM-C1/PRD §8: database ≤ ~2 MB compressed, total package ≤ ~3 MB. Today `dist/` is 1.9 MB and the deflate zip will be smaller, so a failure means something regressed badly (e.g. an asset or source map crept in). A packaging step that quietly ships an over-budget artifact defeats the point of the budget.

7. **Output goes to `release/oui-scout-<version>.zip`, gitignored, exactly one at a time.** Version-stamped filenames keep uploads unambiguous (CWS rejects a re-upload without a version bump — the dashboard warns you cannot edit manifest metadata after upload), while deleting stale ones keeps `release/` from becoming an archive of guesses. `release/` joins `dist/` in `.gitignore`: build output, never committed.

8. **Version `0.9.0` → `0.10.0`, manifest only.** project-context.md:9-13 — bump `manifest.json`'s minor for every story's dev work; `package.json` version stays `0.0.1`; segments are 0–65535 so `0.10.0` is valid (leading zeros forbidden, and `10` has none). This is also what CWS compares for future updates.

### Behavior / Contract Table

| Surface | Before (this story) | After |
|---|---|---|
| `package.json` scripts | no `zip` entry | `"zip": "tsx scripts/package-extension.ts"` |
| `scripts/package-extension.ts` | — | NEW — pure `packageViolations` + `readVersions`, thin `main()` |
| `tests/package-extension.test.ts` | — | NEW — inline-fixture coverage of both exports |
| `manifest.json` version | `0.9.0` | `0.10.0` |
| `release/` | does not exist | created by `npm run zip`, gitignored, holds `oui-scout-0.10.0.zip` |
| `.gitignore` | no `release/` | `release/` ignored |
| `README.md` | scripts table without `zip`; "currently `0.9.0`" | `zip` row + packaging block; "currently `0.10.0`" |
| `dist/` manifest | production build, no `background` | unchanged (but a dev-augmented one is now **refused**) |
| `src/**` | — | **zero changes** |
| dataset schema | `schemaVersion`/`generatedAt`/`sources`/`counts`/`entries` | unchanged — reported, not extended |

### Testing Standards

- **Vitest node environment, `tests/` directory** — same precedent as `tests/build-oui-data.test.ts` (build-script tests live in `tests/`, not co-located beside `scripts/`).
- **Pure functions take strings and arrays** — no `readFileSync` inside the tested code paths, so `npm test` passes on a clean clone with no `dist/` and no `release/`. Never make the suite depend on a prior `npm run build`.
- **Inline fixtures only** — construct manifests/datasets via object literals + `JSON.stringify` in the test body. No committed "bad manifest" files (Story 1.8 lesson, restated in 2.3).
- **The full existing suite must stay green** — 228 tests at baseline, privacy guard untouched. A new test count of ~236+ is expected (exact number is the dev agent's to report honestly).
- **Negative-path tests are the value here**: each violation class (version drift, dev `background`, permissions, missing icon, dataset drift, byte mismatch) gets its own assertion that it produces a non-empty `[]`-to-violations list, plus one happy path proving a correct package reports none.
- **Do not test the shell-out.** The `zip` spawn and `process.exit` stay in untestable `main()` glue; the review will ask whether pure logic leaked into it.

### Previous Story Intelligence (Story 2.3 hand-off)

- **Gates baseline:** `typecheck` 0 errors, `npm test` **228 passed / 8 files**, `npm run build` OK; `dist/oui-data.json` byte-identical to `public/oui-data.json` (1,895,897 B). 2-3 verified that equality by hand with `sha256` — this story automates it inside `packageViolations`.
- **Manifest bump mechanics:** 2-3's task was written verbatim as "bump `manifest.json` `version` from `0.8.0` to `0.9.0`" and executed as such; do the same here (`0.9.0` → `0.10.0`) and keep `package.json` untouched.
- **Review discipline learned in 2-3:** comments must match the code they explain (a patch was filed for a stale "disabled on empty" comment); Dev Agent Record must include the tracking docs in the File List/Change Log (2-3 got patched for omitting them); completion claims must not overstate (a "grep-clean" claim was corrected). Report `npm test` counts and `unzip -l` output exactly as observed.
- **Never-touch list carried forward:** `src/data/load-oui-data.ts`'s inline `fetch(chrome.runtime.getURL('oui-data.json'))` must stay byte-identical; no `src/**` file needs a change for 3.1.
- **The last-mile gap:** 2-3 shipped with "no manual in-browser walkthrough was performed." This story's whole point is a package a human loads — the manual unzip + Load unpacked step is required, not optional.

### Git Intelligence

- Baseline: `254c84f` ("Update sprint-status.yaml"), working tree clean apart from the sprint-status epic-3 status edit made when this story was created.
- Commit pattern in this repo: `story <id> dev` then `story <id> review` — follow it; never commit unless asked.
- Recent history confirms no packaging tooling exists yet: `package.json` has no `zip`, no `release/`, no packaging script — nothing to extend, nothing to conflict with.

### Latest Technical Information

- **No new libraries or versions** — this story adds zero npm dependencies. The runner (`tsx` ^4.23), test framework (Vitest ^4.1.11), and build (Vite ^8.3.0 + `@crxjs/vite-plugin` ^3.0.0) are unchanged from the architecture's pinned stack.
- **Chrome Web Store packaging rules** (developer.chrome.com/docs/webstore/prepare, /publish): submit a ZIP containing all extension files with `manifest.json` at the root; manifest metadata is not editable after upload (fix = edit + bump version + re-zip); package max 2 GB (our budget is 3 MiB); every file the manifest references must exist in the package (icons are the usual casualty — hence the `distFiles` check); "test the exact files that you submit … this may mean extracting resources from the package" — the unzip-and-load-unpacked subtask is exactly that.
- **System prerequisite:** `zip` at `/usr/bin/zip` and `unzip` at `/usr/bin/unzip` are present on this machine.

### Out of Scope (do not touch)

- **Any file under `src/`** — runtime code, tests, and CSS are complete and unaffected. Zero `src/` changes is a reviewable claim.
- Store listing and privacy policy text — Story 3.2 (its OQ-1 gate is already cleared).
- Network-trace verification and the final guard run against the shipped build — Story 3.3.
- **The deferred MV3 CSP entry** (deferred-work.md: the Story 1.1 CSP note "re-deferred to the store-publish epic (3.x)" — a build-only `connect-src` transform that must not break CRXJS dev HMR). It is *not* part of Story 3.1's ACs; it needs its own decision and belongs to 3.x, not silently to a packaging script. If it lands anywhere, it lands with an explicit scope decision recorded first.
- Gzip/`DecompressionStream` dataset packaging (architecture Deferred; the ~3 MB budget is met without it).
- The dataset schema, `build-oui-data.ts`, `oui-data.json` content, `schemaVersion`, or a fresh `build:data` run (the committed artifact is fine; only byte-equality with `dist/` is asserted).
- `package.json` `version` (manifest-only bumps), icons, `index.html`, `manifest.json` fields other than `version`, README **Status** section.

### Project Structure Notes

- New files land exactly where architecture.md:273-295 puts build tooling: `scripts/package-extension.ts` (kebab-case, like `build-oui-data.ts`) and `tests/package-extension.test.ts` (build-script tests in `tests/`, like `build-oui-data.test.ts`). No barrel/index files — import the exact path `../scripts/package-extension`.
- `scripts/` is Node-side code (`node:fs`, `node:path`, `node:child_process`), never browser code — same as the IEEE generator, and deliberately outside the privacy guard's `src/` scan.
- `release/` is a new top-level directory sibling to `dist/`; both are gitignored build output.
- Naming inside the new script: camelCase functions, `SCREAMING_SNAKE_CASE` constants (e.g. `MAX_PACKAGE_BYTES = 3 * 1024 * 1024`), PascalCase types (`PackageInputs`).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.1] — ACs 1–3, lines 504-522; Epic 3 context lines 496-502 (conditional; OQ-1 resolved).
- [Source: _bmad-output/planning-artifacts/architecture.md:229-232] — "a `zip` script wraps `dist/` for store upload; the dataset version is recorded in `oui-data.json`."
- [Source: _bmad-output/planning-artifacts/architecture.md:479-481] — build/`zip`/deployment structure; typecheck + test gate the build.
- [Source: _bmad-output/planning-artifacts/architecture.md:308-313] — the dataset schema as a shared contract (why no new version field).
- [Source: _bmad-output/planning-artifacts/prds/prd-Mac Lookup-2026-10-10/prd.md#4.5 FR-8] — minimal-permission posture; §8 size budget (DB ≤ ~2 MB, package ≤ ~3 MB); SM-C1 counterbalance.
- [Source: project-context.md] — manifest-only version bump rule; gates (`typecheck` + `test` + `build`); zero-permission posture; no barrel files.
- [Source: README.md — "Verification caveat"] — CRXJS dev augments `dist/manifest.json` with a dev service worker (Critical Decision 3).
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — the CSP entry reserved for the store-publish epic (3.x); 2-2/2-3 review deferrals (none touch packaging).
- [Source: _bmad-output/implementation-artifacts/2-3-show-the-vendor-and-the-unknown-vendor-no-match-state-in-the-result-banner.md] — gates baseline (228 tests), manifest bump precedent, review-discipline lessons.
- [Source: https://developer.chrome.com/docs/webstore/prepare + /publish] — zip layout, root manifest, post-upload immutability, 2 GB cap, "test the exact files you submit".

## Dev Agent Record

### Agent Model Used

opencode / mimo-v2.6-flash-free (create-story workflow)

### Debug Log References

### Completion Notes List

### File List
