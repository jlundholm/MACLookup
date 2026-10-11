---
baseline_commit: e78dfd74b6eeeeb61bbb0c615ee86ebac55e6cf2
---

# Story 2.2: Load the dataset and resolve the vendor with longest-prefix match

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Jared,
I want the popup to resolve the Vendor for a MAC's prefix entirely offline,
So that I know the manufacturer without any network request.

## Acceptance Criteria

1. **Given** the popup initializes, **When** the dataset loads, **Then** `src/data/load-oui-data.ts` (the single I/O boundary) calls `fetch(chrome.runtime.getURL('oui-data.json'))`, parses the JSON, and builds three `Map<string,string>` (`l24`, `m28`, `s36`) once, **And** the lookup succeeds with the device offline and produces zero outbound network requests (FR5, NFR2, NFR3).
2. **Given** a MAC whose prefix exists in the dataset, **When** lookup runs, **Then** the Vendor name is resolved together with the Prefix used, **And** `/24`, `/28`, and `/36` prefixes all resolve (MA-L, MA-M, MA-S coverage) (FR5).
3. **Given** overlapping registries, **When** more than one prefix matches, **Then** the longest matching Prefix wins (MA-S /36 > MA-M /28 > MA-L /24) so the most specific assignment is returned (FR5, NFR4).
4. **Given** the lookup module, **When** I inspect `src/lib/lookup.ts`, **Then** `lookupVendor(canonical, index)` is a pure function returning `{ ok: true, vendor, prefix } | { ok: false, prefix }`, uses exact uppercase-hex-string keys (never numeric ranges), and never throws for expected input (Additional Requirements), **And** a co-located `lookup.test.ts` covers the pinned fixtures — `F01898` → "Apple, Inc.", a known MA-M prefix, a known MA-S prefix, and a no-match MAC (verification gap 3).
5. **Given** the dataset (~54,000 prefixes), **When** the popup loads and a MAC is pasted, **Then** `JSON.parse` + building the three Maps completes within a measured budget and paste → result is < 100 ms after load (NFR1, verification gap 1).
6. **Given** the local dataset fails to load (should be unreachable for a local resource), **When** the failure is caught, **Then** the popup shows a distinct, non-blocking "database unavailable" state rather than crashing (Additional Requirements).

## Tasks / Subtasks

- [x] Task 1: Add the pure lookup module `src/lib/lookup.ts` (AC: 3, 4)
  - [x] Create `src/lib/lookup.ts` exporting the exact architecture signature `lookupVendor(canonical: string, index: OuiIndex): VendorResult` where `VendorResult = { ok: true; vendor: string; prefix: string } | { ok: false; prefix: string }` and `OuiIndex = { l24: Map<string,string>; m28: Map<string,string>; s36: Map<string,string> }` (architecture.md:214).
  - [x] **Longest-prefix, no chained `||`:** probe `canonical.slice(0, 9)` in `index.s36`, then `canonical.slice(0, 7)` in `index.m28`, then `canonical.slice(0, 6)` in `index.l24`; the **first hit wins** and its key length is the reported `prefix`. Use explicit branching (`if (hit) return …`) rather than `a || b || c` — a chain cannot report *which* level matched, which the `prefix` in the result exists to carry. Keys are exact uppercase-hex strings; **never** numeric ranges or integer coercion (avoids endianness bugs).
  - [x] On no match at all three levels, return `{ ok: false, prefix: canonical.slice(0, 6) }` — the /24 OUI, which Story 2.3 must display as "the prefix queried" on the miss banner (epics.md:470). See Critical Decision 4.
  - [x] Validate the input first: if `canonical` does not match `/^[0-9A-F]{12}$/`, return `{ ok: false, prefix: '' }` — never throw, never fabricate a prefix from garbage. See Critical Decision 5.
  - [x] Keep the module pure: no `chrome.*`, no DOM, no `fetch`, no side effects. Import nothing except `export type`. Vendor strings pass through **verbatim** (already verbatim in the artifact; do not trim/uppercase).
- [x] Task 2: Co-located lookup tests with pinned fixtures (AC: 2, 3, 4)
  - [x] Create `src/lib/lookup.test.ts` — **Node env, no** `// @vitest-environment happy-dom` pragma (pure string/Map logic; same call as 1-3, 1-8, and 2-1).
  - [x] **Unit layer** — tiny inline fixture `OuiIndex` Maps (3-5 entries): a hit at each of the three levels; a constructed overlap where all three levels hit and the /36 wins; a miss; the malformed-canonical guard (`'junk'`, `'AABBCC'`, lower-case, 11 chars → all `{ ok: false, prefix: '' }`); and an assertion that a returned `prefix` is always a substring of the canonical (union shape check).
  - [x] **Integration layer against the committed artifact** — `readFileSync(resolve(process.cwd(), 'public/oui-data.json'), 'utf8')` + `JSON.parse` (the established `render.test.ts` / `privacy.guard.test.ts` convention; **never** `new URL`), then build the three Maps exactly the way the loader will (one pass over `Object.entries`, routing by key length) and assert the pinned fixtures below. This ties 2.2 to the real committed database and catches schema drift, and it is where 2-1 deliberately parked the pinned lookups (2-1 testing standards).
  - [x] Pinned fixtures, **verified against the committed artifact this story**:
    - MA-L: `F01898000000` → `{ ok: true, vendor: 'Apple, Inc.', prefix: 'F01898' }` (AC4's explicit fixture).
    - MA-M: `1006483ABCD` → `{ ok: true, vendor: 'illuminous LLC', prefix: '1006483' }` — its /24 `100648` is "IEEE Registration Authority", so this simultaneously proves MA-M coverage (AC2) and /28-beats-/24 (AC3).
    - MA-S: `001BC5000123` → `{ ok: true, vendor: 'Converging Systems Inc.', prefix: '001BC5000' }` — its /24 `001BC5` is "IEEE Registration Authority", proving MA-S coverage (AC2) and /36-beats-/24 (AC3). Note `001BC500` (the /28) is absent, which also proves the lookup does not require a full cascade.
    - No match: `FFFFFF000001` → `{ ok: false, prefix: 'FFFFFF' }` (absent at all three levels).
  - [x] Cross-check the Map sizes against the artifact's `counts` (`l24` 40316, `m28` 6628, `s36` 7226; sum 54170) so a routing bug that drops a bucket fails the suite.
- [x] Task 3: Add the single I/O boundary `src/data/load-oui-data.ts` (AC: 1, 6)
  - [x] Create the new directory `src/data/` (architecture reserves it as the I/O layer) with `load-oui-data.ts` exporting `loadOuiIndex(): Promise<OuiIndex>`.
  - [x] Call `fetch(chrome.runtime.getURL('oui-data.json'))` **inline on one line, exactly in that shape** — the 1-8 privacy guard's heuristic flags a bare-variable `fetch(url)` even when `getURL` appears elsewhere in the file, and that behavior is itself asserted by `tests/privacy.guard.test.ts:300-305`. Do not hoist the URL into a `const`. See Critical Decision 6.
  - [x] Reject on a non-ok `Response` (`res.ok === false` or missing), on a `JSON.parse` failure, and when `schemaVersion !== 1` (the versioned contract 2-1 pinned for exactly this consumer). See Critical Decision 7.
  - [x] Build the three Maps in **one pass** over `Object.entries(entries)`, routing by key length (6 → `l24`, 7 → `m28`, 9 → `s36`) — length is authoritative (2-1 Critical Decision 3). Keys of any other length are skipped with a `console.warn` and counted; they are never inserted into a wrong bucket. O(n), no second scan, no sorting.
  - [x] Do not cache at module scope and do not mutate the Maps after returning — the caller owns the index. Exactly one load happens per popup lifetime (AC1: "builds … once").
  - [x] No `AbortSignal`/timeout (the resource is local; 2-1 deferred the same for the build-time download and this is the same trade-off).
- [x] Task 4: Loader tests with stubbed `chrome`/`fetch` (AC: 1, 6)
  - [x] Create `src/data/load-oui-data.test.ts` — Node env (no DOM required). In `beforeEach` stub `globalThis.chrome = { runtime: { getURL: (p: string) => \`chrome-extension://test/${p}\` } }` and `globalThis.fetch`; restore both in `afterEach`. (`chrome-types` already declares the global, so the stub typechecks with no import.) Use `new Response(...)` — available in Node 18+.
  - [x] Cover: **success** → three Maps whose `.size`s equal the payload `counts` and whose values are verbatim; **non-ok Response** → rejects; **invalid JSON body** → rejects; **`schemaVersion: 2`** → rejects; **an unexpected-length key** in a fixture payload → skipped with a `console.warn` (spy it) and absent from all three Maps.
  - [x] Use a small synthetic payload in the error cases — never the 1.8 MB artifact — so the suite stays fast.
- [x] Task 5: Extend the state model for the lookup result and dataset status (AC: 2, 3, 6)
  - [x] In `src/lib/types.ts`: add `export type DataStatus = 'loading' | 'ready' | 'unavailable';` next to `MacStatus`, and extend `PopupState` with two **required** fields — `vendor: VendorResult | null` and `dataStatus: DataStatus` — importing `VendorResult` via `import type` from `./lookup` (no cycle: `lookup.ts` imports nothing).
  - [x] In `src/ui/state.ts`: add `| { type: 'dataset-ready' } | { type: 'dataset-unavailable' }` to `PopupEvent`; add the defaulted third parameter `index: OuiIndex | null = null` to `nextState` (existing 2-arg calls keep compiling and behave as the `vendor: null` subset); set `initialState.dataStatus = 'loading'` and `initialState.vendor = null`.
  - [x] `case 'input'`: parse as today; if the parsed canonical is non-null **and** `index` is non-null, set `vendor = lookupVendor(canonical, index)`, else `vendor = null`. `vendor` is therefore always `null` exactly when `canonical` is null. Single parse — see Critical Decision 1.
  - [x] `case 'dataset-ready'`: `dataStatus: 'ready'`; if `state.canonical` is non-null, re-resolve `vendor = lookupVendor(state.canonical, index)` so a MAC typed *before* the load finished lights up without re-typing; else `vendor: null`.
  - [x] `case 'dataset-unavailable'`: `dataStatus: 'unavailable'` and `vendor: null`. This is the distinct non-blocking state AC6 requires — parsing, `status`, and `canonical` are untouched, so format conversion keeps working (non-blocking).
  - [x] Update `src/ui/state.test.ts`: the `toEqual` assertions on `initialState` (lines 11, 17, 37, 57) and the `before` literal (line 88) gain `vendor: null` / the right `dataStatus`. Add cases — valid input **with** an index yields the pinned `vendor`; valid input **without** an index yields `vendor: null`; `dataset-ready` fills `vendor` from an already-typed canonical; `dataset-ready` with empty input does not throw; `dataset-unavailable` clears `vendor` and sets `dataStatus`; input after `dataset-unavailable` still derives `status`/`canonical`/formats.
- [x] Task 6: Wire the load + lookup in `src/main.ts` (AC: 1, 5, 6)
  - [x] Keep `main.ts` as the composition hub: hold the loaded index in a module-level `let index: OuiIndex | null = null`; on module init dispatch `{ type: 'dataset-ready' }` through `nextState` passing the freshly loaded index, or `{ type: 'dataset-unavailable' }` in a `catch`. Do **not** store the index on `PopupState` (Critical Decision 3).
  - [x] Pass `index` on every `input` dispatch so live typing resolves while the dataset is ready.
  - [x] Await the load before the first `render` **only** if it does not delay first paint — prefer firing the load without blocking (the `loading` state renders nothing, so the popup is interactive immediately) and letting `dataset-ready` re-resolve. Either way the `input` listener must be attached before the load resolves, so a fast paste is never dropped.
  - [x] Catch **all** load failures (rejected promise, thrown sync error) so the popup can never crash on a local-resource miss (AC6).
- [x] Task 7: Minimal "database unavailable" render treatment (AC: 6)
  - [x] In `src/ui/render.ts`, when `state.dataStatus === 'unavailable'`, un-hide the existing `#result-banner` and write the literal text `Database unavailable`; leave it hidden for `'loading'` and `'ready'`. Nothing else about the banner changes — the full status-lamp / triad / announcement anatomy is Story 2.3's, which will extend this same element. See Critical Decision 8.
  - [x] Non-blocking: the invalid inline error, the three format rows, and the copy buttons keep their current behavior while unavailable.
  - [x] Update `src/ui/render.test.ts`: add `vendor: null, dataStatus: 'ready'` to the `EMPTY` / `INVALID` / `VALID` fixtures (they are `PopupState` literals); add cases for `unavailable` (banner visible with the exact text), `loading` (hidden), and `ready` (hidden); confirm idempotence and the "never writes the input value" invariant still hold.
- [x] Task 8: Measure load + lookup performance (AC: 5)
  - [x] Add a perf/integration test that reads the **real** `public/oui-data.json`, `JSON.parse`s it, and builds the three Maps, asserting wall-clock under a deliberately generous ceiling (pin **2000 ms** — this guards the pathological O(n²) regression only; the NFR's < 100 ms is a human-perception target, not a CI-assertable number). Record the actual measured local build time in the story's Completion Notes.
  - [x] Manually verify paste → result is perceptually instant in the built popup (`npm run build`, load unpacked `dist/`) and record the observation. NFR1 / SM-1.
- [x] Task 9: Gates, guardrails, version bump (AC: 1–6)
  - [x] `manifest.json` `version`: `0.7.0` → `0.8.0` (minor bump per story; `package.json` `version` untouched, per project-context).
  - [x] Gates, all green before done: `npm run typecheck` (0 errors), `npm test` (existing 145 + the new lookup/loader/state/render cases), `npm run build` (succeeds; `dist/oui-data.json` still copied verbatim; `dist/` size unchanged within NFR5).
  - [x] Guardrail greps: the **only** `fetch` in `src/` is the inline `chrome.runtime.getURL` call; no outbound URL literal anywhere in `src/`; no `chrome.storage`, no permissions, no background/content-script additions (`tests/privacy.guard.test.ts` enforces all of this — keep it green).
  - [x] Record the pinned fixture values, the measured build time, and the manual paste-latency observation in Completion Notes.

### Review Findings

- [x] [Review][Patch] Validate that entry values are strings in the loader [src/data/load-oui-data.ts:31,38-41] — `parseEntries` casts `entries` to `Record<string, string>` after checking only the *object* shape, and `buildIndex` inserts each value verbatim. A corrupted or regenerated artifact whose values are `null`/number/object yields `lookupVendor` returning `{ ok: true, vendor: <non-string> }`, breaking the declared `vendor: string` in `VendorResult` and any downstream rendering in 2.3. Skip + `console.warn` + count values that are not strings, exactly as invalid keys are handled. → **Fixed:** `buildIndex` now skips entries whose value is not a string; test added.
- [x] [Review][Patch] Validate key *content*, not just key length [src/data/load-oui-data.ts:38-42] — routing is by `key.length` alone (6/7/9), so a key of the right length but wrong content (lowercase, non-hex, or a surrogate-pair whose UTF-16 `length` happens to be 6/7/9) is stored with no warning yet can *never* match, because `lookupVendor` only ever queries uppercase hex. Assert `/^(?:[0-9A-F]{6}|[0-9A-F]{7}|[0-9A-F]{9})$/` and route any violation into the existing skipped-and-warned counter. → **Fixed:** `ENTRY_KEY` pattern guard added; routing now keyed off the validated length; test added.
- [x] [Review][Patch] Reject an empty `entries` object [src/data/load-oui-data.ts:27-31] — `{}` passes the `schemaVersion` and object checks, so a truncated or broken artifact loads as `'ready'` and every valid MAC silently reports a normal "no vendor" miss, indistinguishable from a genuine unknown OUI. A shipped OUI database is never empty; reject (→ `dataset-unavailable`) when `Object.keys(entries).length === 0`. → **Fixed:** `parseEntries` throws on an empty entries object; test added.
- [x] [Review][Patch] Log the caught load error in `main.ts` [src/main.ts:36-38] — the bare `catch { dispatch({ type: 'dataset-unavailable' }); }` maps *any* throw — including a programming `TypeError` somewhere in the load path — to the user-facing "Database unavailable" state with nothing written to the console. The loader already `console.warn`s on skipped keys; add `console.error(err)` in the catch so a real defect is diagnosable. → **Fixed:** catch now binds the error and `console.error`s it before dispatching.
- [x] [Review][Defer] Empty-string vendor values are accepted as a valid hit [src/lib/lookup.ts:26] — deferred to Story 2.3: an OUI present with a blank `Organization Name` yields `{ ok: true, vendor: '' }`, which the 2.3 "Unknown vendor" microcopy must distinguish from a real miss. No blank values exist in the current artifact, so this is a hand-off, not a defect.
- [x] [Review][Defer] Loader ignores the `counts` contract and never fails on drift [src/data/load-oui-data.ts:34-49] — deferred, enhancement beyond AC scope: warn-and-skip of unexpected-length keys is spec-mandated (Critical Decision 3), but nothing detects silent partial data. Cross-checking the built Map sizes against the artifact's `counts` (and failing the load on mismatch) would catch truncation and drift in one guard.

### Dev Agent Record

#### Files Modified

New:
- `src/lib/lookup.ts` — pure `lookupVendor(canonical, index)` + `OuiIndex` + `VendorResult` (no imports of any kind)
- `src/lib/lookup.test.ts` — 21 tests (unit layer + committed-artifact integration layer)
- `src/data/load-oui-data.ts` — `loadOuiIndex(): Promise<OuiIndex>`, the system's single I/O boundary
- `src/data/load-oui-data.test.ts` — 13 tests (stubbed `chrome`/`fetch`, real-artifact perf)

Modified:
- `src/lib/types.ts` — + `DataStatus`; `PopupState` gains required `vendor` and `dataStatus`
- `src/ui/state.ts` — + `dataset-ready` / `dataset-unavailable` events, defaulted `index` param, vendor resolution
- `src/ui/state.test.ts` — updated `PopupState` literals; + vendor-resolution, dataset-event, and index-contract coverage
- `src/ui/render.ts` — + minimal `Database unavailable` treatment on the existing `#result-banner`
- `src/ui/render.test.ts` — updated `PopupState` fixtures; + 8 unavailable-state tests
- `src/main.ts` — index load lifecycle (fire-and-catch), `dispatch()` helper that threads the index into every `nextState` call
- `manifest.json` — `0.7.0` → `0.8.0`

Explicitly untouched (verified): `index.html`, `public/oui-data.json`, `scripts/**`, `tests/privacy.guard.test.ts`, `package.json`, `src/lib/parse.ts`, `src/lib/format.ts`.

#### Change Log

- 2026-10-11: Story 2.2 implemented — offline OUI dataset load (`src/data/load-oui-data.ts`) + pure longest-prefix vendor resolution (`src/lib/lookup.ts`), wired through an extended reducer into a minimal non-blocking "Database unavailable" state. Manifest → `0.8.0`.
- 2026-10-11: Code review — 4 patches applied (loader now validates key *content* and value *type*, rejects an empty `entries` object, and `main.ts` logs the caught load error); 2 defers logged to `deferred-work.md`; 7 dismissed. 3 loader tests added (202 total).

#### Completion Notes

**Gates (all green):**
- `npm run typecheck` — 0 errors
- `npm test` — **199 passed** (145 baseline → 199; +54 = 21 lookup + 13 loader + 10 state + 8 render + 2 perf/extra)
- `npm run build` — succeeds; `dist/oui-data.json` **byte-identical** to `public/oui-data.json`; `dist/` total **1,939,735 bytes** (~1.85 MB, NFR5 package ≤ ~3 MB); `dist/oui-data.json` gzip **592,464 bytes** (~0.58 MB, NFR5 DB ≤ ~2 MB)

**AC satisfaction:**
- **AC1** — `load-oui-data.ts:53` is the only `fetch` in `src/`, written inline as `fetch(chrome.runtime.getURL('oui-data.json'))` exactly as the privacy guard requires. Test asserts the resolved URL is `chrome-extension://test/oui-data.json`. Three Maps built in one pass; no module-scope cache (tested). Zero outbound requests: no `https?://` literal exists anywhere in `src/`, `chrome.*` is used only for `runtime.getURL`, and `tests/privacy.guard.test.ts` passes unchanged.
- **AC2** — all three registries resolve: pinned MA-L `F01898` → "Apple, Inc.", MA-M `1006483` → "illuminous LLC", MA-S `001BC5000` → "Converging Systems Inc."
- **AC3** — longest prefix wins via explicit branching (`lookup.ts:19-27`), never a chained `||`. Proven against real overlaps: `1006483ABCDE` picks MA-M over its "IEEE Registration Authority" /24, and `001BC5000123` picks MA-S over its "IEEE Registration Authority" /24 *with no /28 present*, so the cascade is not required.
- **AC4** — exact signature `{ ok: true; vendor; prefix } | { ok: false; prefix }`; exact uppercase-hex string keys (a leading-zero key `00000A` test proves no numeric coercion); total function — malformed canonicals return `{ ok: false, prefix: '' }` and a 7-case `it.each` plus a never-throws loop cover it.
- **AC5** — measured on the real 1,895,897-byte artifact: `JSON.parse` **61.9 ms** + three-Map build **110.9 ms** = **172.8 ms** one-time load (asserted < 2000 ms). Paste → result after load, measured over 2000 real `nextState(input, index)` calls via `tsx`: **avg 0.0058 ms, best 0.0019 ms, worst 0.96 ms** (worst is JIT warm-up) — ~17,000× headroom under the 100 ms NFR1 target. The one-time load runs fire-and-forget alongside first paint, so it never blocks interaction.
- **AC6** — `main.ts` wraps the load in `try/catch` and maps any failure to `{ type: 'dataset-unavailable' }`; render un-hides the pre-existing `#result-banner` with `Database unavailable`. Non-blocking verified: with `dataStatus: 'unavailable'`, invalid input still shows "Not a valid MAC address" and the three format rows still render.

**Pinned fixture values** (all verified against the committed artifact):
- `F01898000000` → `{ ok: true, vendor: 'Apple, Inc.', prefix: 'F01898' }`
- `1006483ABCDE` → `{ ok: true, vendor: 'illuminous LLC', prefix: '1006483' }`
- `001BC5000123` → `{ ok: true, vendor: 'Converging Systems Inc.', prefix: '001BC5000' }`
- `FFFFFF000001` → `{ ok: false, prefix: 'FFFFFF' }`
- Map sizes cross-checked against `counts`: l24 40316, m28 6628, s36 7226 (sum 54170), 0 keys skipped.

**Story typo corrected during dev:** the Task 2 MA-M fixture was written as `1006483ABCD`, which is **11** characters and therefore correctly rejected by the `/^[0-9A-F]{12}$/` guard. Used `1006483ABCDE` (12 chars) — the MA-M prefix (`1006483`) and vendor (`illuminous LLC`) are exactly as specified, so AC2/AC3 are unaffected.

**Manual verification (Jared, 2026-10-11, unpacked `dist/` in Chrome):** speed good, results displayed on paste, `junk` showed "Not a valid MAC address", and with `dist/oui-data.json` temporarily renamed the popup showed the non-blocking "Database unavailable" banner while still formatting. NFR1 / SM-1 satisfied.

#### Debug Log

- RED → GREEN on `lookup.test.ts`: first run failed to import `./lookup` (module absent, as expected). After implementing, one failure — the MA-M fixture — traced to the 11-character canonical described above, not to the lookup logic.
- RED → GREEN on `load-oui-data.test.ts`: privacy guard passed on the first attempt because the `fetch` call was written inline exactly as Critical Decision 6 requires; no iteration needed.
- Initial `state.test.ts` run: 1 failure. My own test asserted `vendor` stayed null after `dataset-unavailable` while still passing an index — that over-specified behavior the story does not ask for (Task 5 says resolve whenever canonical *and* index are non-null; `main.ts` simply never holds an index while unavailable). Fixed the test, not the implementation.
- Typecheck caught a real test-authoring bug: `fetchMock.mock.calls[0]?.[0]` on a zero-arg `vi.fn` typed its calls as `[]`. Typed the mock parameter (`(_url: string)`) instead.
- While rewriting `state.test.ts` I initially flattened the three unicode fixtures (` `, `：`, `ﬀ`) to literals; verified with `cat -A` that the on-disk bytes are the original U+00A0 / U+FF1A / U+FB00 characters, so the cases are unchanged.


## Dev Local Learnings

- **This story's runtime code is bundled by Vite** — the Node-has-no-TypeScript problem that forced `tsx` for `scripts/` does not apply to `src/`; do not try to execute `src/**` under `node`.
- **The privacy guard's fetch heuristic is literal.** It regexes for `fetch\s*\(` and then inspects the *argument expression*; only an inline `chrome.runtime.getURL(...)` argument or a `chrome-extension:` literal passes. A hoisted `const url = …; fetch(url)` is flagged by design — `tests/privacy.guard.test.ts:300-305` asserts that limitation so nobody "fixes" it by loosening the guard.
- **`chrome-types` is already in tsconfig `types`** — `chrome.runtime.getURL` typechecks with no import and no `/// <reference>`; only `src/**` sees it, and the loader test must stub `globalThis.chrome` because Node has no such global.
- **Artifact-reading convention is `readFileSync(resolve(process.cwd(), 'public/oui-data.json'), 'utf8')`** — never `new URL(import.meta.url, …)` (the 1-3 resolution; `render.test.ts` and `privacy.guard.test.ts` both use the cwd form).
- **`tsconfig.json` `lib` is `["ES2023", "DOM"]` — no `DOM.Iterable`.** Spreading a `Map` (`[...map]`, `[...map.entries()]`) needs `Array.from(...)`; `for…of` over a Map and `map.forEach` are fine.
- **Vitest picks up co-located tests automatically** (`include: ['src/**/*.test.ts', 'tests/**/*.test.ts']`); no config change is needed for the two new test files. Node env is the default — the happy-dom pragma is opt-in per file and only needed where `document` is touched.
- **`erasableSyntaxOnly` + `verbatimModuleSyntax`**: no enums/namespaces/parameter properties; `import type` for every type-only import (`VendorResult`, `OuiIndex`, `PopupState`).
- **Baseline is clean.** 145 tests pass, typecheck 0, build succeeds; `public/oui-data.json` is committed at 1,895,897 bytes (0.56 MB gzip) with `l24` 40316 / `m28` 6628 / `s36` 7226. (Housekeeping: the baseline commit is titled "story 2-2 creation" but actually carries Story 2-1's review patches — the message is misleading, the content is correct.)
- **MA-L contains 3 duplicate `Assignment`s** (`080030`, `0001C8`) — that is why `l24` is 40316, not 40319. Not a loader bug; the loader reads the committed artifact, not the CSVs.
- **`index.html` already ships `#result-banner`** with `role="status"`, `aria-live="polite"`, and `hidden` (Story 1.7) — 2.2 only toggles it; do not add a new element or re-plumb the accessibility contract.

## Critical Decisions

1. **The lookup is composed inside `nextState`, not in `main.ts`.** Architecture's data-flow diagram lists `lookupVendor` between `formats` and `nextState` and calls `main.ts` the hub (architecture.md:451, 457-462); here `nextState` — already the sole owner of parse-derived state — performs the lookup through its new `index` parameter. Rationale: `parseMac` is called exactly once per input, and the reducer stays the single source of truth for every derived field. The architecture contract that actually matters — `lookupVendor(canonical, index)` is pure with the signature `{ok:true,vendor,prefix} | {ok:false,prefix}` (architecture.md:214) — is untouched; only the call site moves. The alternative (parse in `main`, pass `vendor` inside the input event) was rejected because it either duplicates `parseMac` or strips parsing out of `state.ts`, and `main.ts` remains the hub in the sense that matters: it owns the index and the load lifecycle.
2. **`PopupState` gains two required fields, `vendor` and `dataStatus`.** `vendor: VendorResult | null` is null exactly when `canonical` is null (no valid MAC) or the data is not ready. `dataStatus: DataStatus` is `'loading' | 'ready' | 'unavailable'`. Required rather than optional so `render` never branches on `undefined`, matching project-context's preference for explicit fields over nullable ambiguity. Consequence: the `PopupState` literals in `state.test.ts` and `render.test.ts` must be updated — a mechanical, expected cost of the contract change.
3. **`index` is a defaulted third parameter to `nextState` and never stored in state.** `nextState(state, event, index: OuiIndex | null = null)`. All existing 2-arg calls compile unchanged and produce the `vendor: null` subset of behavior, so no unrelated test churn. The 54,170-entry Maps must not live in `PopupState`: state is compared with `toEqual` for assertions and with `document.body.innerHTML` for render idempotence, and it is rendered data — an index of Maps is neither.
4. **On a miss, `prefix` is the /24 OUI (`canonical.slice(0, 6)`).** Story 2.3 must show "the prefix queried" on the found banner *and* the miss banner (epics.md:466, 470), and PRD FR-6 pairs "Unknown vendor" with "the OUI Prefix". On a miss nothing matched, so the honest answer is the base OUI — always derivable and always meaningful. On a hit, `prefix` is the **winning** key (9, 7, or 6 hex), i.e. the longest match — not unconditionally the /24 — which is what makes AC3 observable.
5. **`lookupVendor` is total: a malformed canonical returns `{ ok: false, prefix: '' }`, never throws.** AC4 requires "never throws for expected input"; a non-`/^[0-9A-F]{12}$/` string is *not* expected input (the parser gates it), but the function is still guarded so an accidental bad call cannot crash the popup. `prefix: ''` deliberately declines to fabricate a prefix — `slice(0, 6)` of garbage would be a lie, and the empty string is an unambiguous sentinel distinct from the miss case's real 6-hex OUI.
6. **The loader's `fetch` must be written inline.** `fetch(chrome.runtime.getURL('oui-data.json'))` on one line, no hoisted URL. The 1-8 privacy guard scans `src/**/*.ts` (excluding tests) and flags any bare-variable `fetch(...)` argument even when `getURL` appears elsewhere — and that limitation is locked in by an asserting test (`tests/privacy.guard.test.ts:300-305`) so it cannot be relaxed by accident. This is the one place where an otherwise-sensible refactor is a hard gate failure.
7. **The loader throws; `main.ts` catches.** `loadOuiIndex(): Promise<OuiIndex>` rejects on a non-ok `Response`, a `JSON.parse` failure, or `schemaVersion !== 1`. It is the system's only I/O boundary (architecture.md:421) and its input is a *packaged local resource*, so failure is an unreachable-condition error, not the expected user input the no-throw rule governs (that rule is about `lib/` parsing user strings). `main.ts` is the one place that converts the rejection into the non-blocking `unavailable` state — keeping the policy in the composition root, not in the I/O primitive.
8. **"Database unavailable" is a minimal, provisional treatment rendered into the existing `#result-banner`.** The implementation-readiness report flags that this state's *surface* belongs to Story 2.3, which owns the banner taxonomy (found / miss / invalid) and the microcopy canon. 2.2 therefore un-hides the element 1.7 already shipped — `role="status"`, `aria-live="polite"`, `hidden` — with the literal text `Database unavailable`. Reusing `#result-banner` rather than adding a sibling element means 2.3 extends the same live region instead of re-plumbing `index.html`. The text is explicitly *not* canon microcopy (canon covers invalid / unknown-vendor / found / copy); 2.3 may reword it. Non-blocking is a hard requirement: input parsing and all three format rows keep working while unavailable.
9. **Only `'unavailable'` speaks.** `'loading'` renders nothing — the popup opens fast enough that a flash-of-unavailable is worse than silence — and `'ready'` renders nothing about the dataset, because vendor display is 2.3's job. This keeps 2.2's diff small and hands 2.3 a clean surface.
10. **`formats()` stays where Story 1.5 put it — inside `render.ts`.** The architecture data-flow lists `formats` in the pipeline, but it is realized within `render` today; this story adds no second call site and does not move it. Avoiding that refactor keeps the 2.2 diff focused on lookup + load.

## Behavior / Contract Table

| Surface | Before (after 2.1) | After (this story) |
|---|---|---|
| `src/lib/lookup.ts` | does not exist | + `lookupVendor`, `OuiIndex`, `VendorResult` (pure, no imports) |
| `src/data/` directory | does not exist | + `load-oui-data.ts` — the system's single I/O boundary |
| `PopupState` | `raw`, `status`, `canonical`, `copy` | + `vendor: VendorResult \| null`, `dataStatus: DataStatus` (required) |
| `nextState(state, event)` | 2 parameters | 3 parameters — `index: OuiIndex \| null = null` (back-compatible default) |
| `PopupEvent` | `input`, `copy-resolved`, `copy-timeout` | + `dataset-ready`, `dataset-unavailable` |
| `initialState` | `status: 'empty'`, `vendor` n/a | + `vendor: null`, `dataStatus: 'loading'` |
| `#result-banner` | always `hidden` (Story 1.5) | unhidden **only** when `dataStatus === 'unavailable'` (text `Database unavailable`) |
| Data payload at runtime | `dist/oui-data.json` present, unread | fetched once via `chrome.runtime.getURL`, parsed into three Maps |
| Outbound network requests | none | **still none** — the fetch target is a packaged `chrome-extension://` resource (AC1) |
| `manifest.json` | `0.7.0` | `0.8.0` |
| `npm test` | 145 tests, 5 src test files | + `lookup.test.ts`, `load-oui-data.test.ts`; `state`/`render` tests extended |
| `src/**` runtime deps | none (no third-party) | none — still zero runtime dependencies |

## Testing Standards

- **Unit + integration in `lookup.test.ts`** (Node env, no happy-dom): inline fixture Maps for edge-case control; the committed artifact for the pinned end-to-end fixtures. Never assert against a synthetic subset where a real fixture exists — the pinned MA-L/MA-M/MA-S values are the whole point of AC4.
- **Loader tests stub globals, they do not mock the module.** `globalThis.chrome` and `globalThis.fetch` are stubbed/restored around each test so `loadOuiIndex` is exercised end-to-end through its real control flow. Small synthetic payloads for the failure paths.
- **State tests stay reducer-pure** — no DOM, no fetch; `nextState` with a literal index is a pure function call.
- **Render tests keep the happy-dom pragma** and the established `document.body.innerHTML` idempotence pattern; index.html cross-checks (the "contains every id the renderer wires" tests) must keep passing, and no new element is introduced for the unavailable state.
- **All 145 existing tests must pass unchanged** except the mechanical `PopupState` literal/`toEqual` updates required by the new required fields — no behavioral regressions are acceptable.
- Do not add a test-only CSV/JSON fixture file to the tree (the 1-8 lesson); payloads are inline strings.

## Out of Scope (do not touch)

- The full result-banner anatomy — status lamp, found (green) / miss (amber) / invalid (red) triads, the "Found" / "Not found" / "Unknown vendor" microcopy, the aria-live announcement strings, and superseding the Story 1.4 inline error — **all Story 2.3**.
- Any dataset regeneration — `npm run build:data` is Story 2.1's and reads IEEE, not `src/`.
- A runtime update/refresh/repoll path (2.1 AC6, FR8, NFR8) — none may be added.
- A service worker / background script / messaging — architecture pins a popup-only system with no background and no messaging; the loader runs in the popup context.
- Gzip packaging or `DecompressionStream` (architecture deferred decision).
- Chrome store packaging, privacy policy, and IEEE redistribution licensing (OQ-1) — Epic 3.
- `package.json` `version` (manifest-only bumps, per project-context).
- Moving `formats()` out of `render.ts` (see Critical Decision 10).

## Project Structure Notes

- Adds exactly `src/lib/lookup.ts`, `src/lib/lookup.test.ts`, `src/data/load-oui-data.ts`, `src/data/load-oui-data.test.ts` — the first three names are already pinned in architecture's file tree (`src/lib/lookup.ts  # lookupVendor (FR-5, FR-6)` at architecture.md:404; `src/data/load-oui-data.ts  # fetch(getURL('oui-data.json')) → Maps (the only I/O)` at :407); the fourth is the co-located-test convention.
- `src/data/` is the one new directory; architecture already reserves it as the I/O layer ("by layer — `lib/` (pure), `data/` (I/O), `ui/` (DOM + state), `main.ts` (wiring)", architecture.md:466) and names it in the API-boundaries section ("exactly one I/O boundary in the whole system — `src/data/load-oui-data.ts`", :421).
- Layering rule honored: `lookup.ts` imports nothing; `types.ts` → `lookup.ts` (type-only); `ui/state.ts` → `lib/lookup` + `lib/types`; `data/load-oui-data.ts` → `lib/lookup` (type-only) and `chrome.*`; `main.ts` composes all of it. No cycles, no barrel files.
- Naming: kebab-case files, `camelCase` functions (`lookupVendor`, `loadOuiIndex`) — matches architecture.md:264 and the existing `parseMac` / `formats` / `nextState`.
- `OuiIndex`'s Map names `l24` / `m28` / `s36` are the same names 2-1 used for `counts` (2-1 Task 3) — the schema's bucket names and the runtime Map names are deliberately identical so the loader's routing is self-documenting.

## References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.2] — the six ACs; the `lookupVendor` signature and the pinned-fixture requirement; "zero outbound network requests"; the "database unavailable" requirement.
- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.3] — the banner taxonomy 2.2 must not preempt; "shows … the prefix queried" on both found and miss (the contract behind Critical Decision 4); the readiness-report ownership note.
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture] — `load-oui-data.ts` fetch contract, three `Map`s from `counts`, name-only index, exact-key longest-prefix lookup (9 → 7 → 6, first hit wins), "exact hex-string keys, never numeric ranges".
- [Source: _bmad-output/planning-artifacts/architecture.md:214] — the pinned `lookupVendor(canonical, index) → { ok: true, vendor, prefix } | { ok: false, prefix }` signature.
- [Source: _bmad-output/planning-artifacts/architecture.md:421] — "exactly one I/O boundary in the whole system — `src/data/load-oui-data.ts` … No HTTP, no messaging, no service worker."
- [Source: _bmad-output/planning-artifacts/architecture.md:451, 457-462] — `main.ts` as hub; the paste → parse → lookup → nextState → render data flow.
- [Source: _bmad-output/planning-artifacts/architecture.md:404, 407, 466] — file-tree and layer placement for `lookup.ts` / `load-oui-data.ts` / `data/`.
- [Source: _bmad-output/planning-artifacts/prds/prd-Mac Lookup-2026-10-10/prd.md#FR-5] / [#FR-6] — offline vendor resolution from the bundled MA-L/MA-M/MA-S index; the explicit no-match state paired with the OUI Prefix.
- [Source: _bmad-output/planning-artifacts/prds/prd-Mac Lookup-2026-10-10/prd.md#NFR1] / [NFR2] / [NFR3] / [NFR4] / [SM-1] / [SM-4] — < 100 ms paste→result; zero outbound requests; no external deps; longest-prefix correctness; no false "Unknown" on in-coverage prefixes.
- [Source: _bmad-output/planning-artifacts/prds/prd-Mac Lookup-2026-10-10/addendum.md#Vendor resolution] — "Resolve with longest-prefix match — try /36, then /28, then /24 … No match across all three registries → 'Unknown vendor' + the OUI Prefix … Keep prefixes as exact-digit lookups keyed by hex string, not numeric ranges, to avoid endianness bugs."
- [Source: _bmad-output/implementation-artifacts/2-1-generate-the-bundled-oui-database-at-build-time.md] — the consumed `public/oui-data.json` contract (`schemaVersion` 1, `sources`, `counts`, `entries`); Critical Decision 3 (length is authoritative for routing); the note that pinned vendor lookups were deliberately deferred to this story's `lookup.test.ts`; the committed counts.
- [Source: _bmad-output/planning-artifacts/implementation-readiness-report-2026-10-10.md] — Story 2.2's "database unavailable" banner-surface ownership note (resolve with the minimal treatment in Critical Decision 8).
- [Source: project-context.md] — pure `src/lib/**` with co-located tests; no barrel files; never throw for expected bad input; zero permissions/network/persistence at runtime; `erasableSyntaxOnly` + `verbatimModuleSyntax`; manifest-only version bumps; canonical microcopy list.
