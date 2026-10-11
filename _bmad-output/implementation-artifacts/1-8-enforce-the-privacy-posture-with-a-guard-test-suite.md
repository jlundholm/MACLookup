---
baseline_commit: d046177abe19f3aa165a009c7de1bdf1975b8637
---

# Story 1.8: Enforce the privacy posture with a guard test suite

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the builder,
I want automated tests that fail if permissions or network calls are ever introduced,
So that privacy-by-construction cannot silently regress.

## Acceptance Criteria

1. **Given** the built `manifest.json`, **When** `tests/privacy.guard.test.ts` runs, **Then** it fails if `permissions` or `host_permissions` is non-empty (NFR2).
2. **Given** the `src/` sources, **When** the source-scan test runs, **Then** it fails on any remote URL literal or on `XMLHttpRequest`, `WebSocket`, or `EventSource` usage, **And** it permits only `fetch` calls against a `chrome-extension:` / `getURL()` target (NFR2).
3. **Given** the guard suite, **When** I run `npm test`, **Then** the guard tests execute under Vitest alongside the unit tests.

## Tasks / Subtasks

- [x] Task 1: Manifest privacy assertions (AC: 1)
  - [x] Create `tests/` (does not exist yet) and `tests/privacy.guard.test.ts`.
  - [x] Read the **source** `manifest.json` at the repo root via `readFileSync(resolve(process.cwd(), 'manifest.json'))` + `JSON.parse` (the established convention from `render.test.ts`; **not** `new URL` — Node env). Rationale: Vite copies `manifest.json` verbatim into `dist/` (verified IDENTICAL in 1-7), `dist/` is gitignored, and `npm test` must not depend on a prior `npm run build` — the source manifest *is* the shipped manifest.
  - [x] Assert `permissions` is **absent or `[]`** and `host_permissions` is **absent or `[]`** (AC1 / NFR2). Use "absent or empty" — MV3 treats both the same, and forbidding the key outright would force a rewrite if a future key order changes; the privacy invariant is "grants nothing", not "mentions nothing".
  - [x] Also assert `background` and `content_scripts` are **absent** (locks Story 1.1's manifest contract and architecture's "single surface, no service worker, no content script" boundary — cheap, and the zero-permission posture is meaningless if a background worker can later fetch).
  - [x] Keep assertions to the four keys above plus a `manifest_version === 3` sanity check — do **not** snapshot the whole manifest (icons/name/description have no privacy bearing and would make every cosmetic edit a guard failure).
- [x] Task 2: `src/` source scan (AC: 2)
  - [x] Recursively collect `**/*.ts` under `src/` only (Node `readdirSync` with `withFileTypes`, skip `node_modules`; **exclude** any `*.test.ts` — test files may legitimately mention forbidden strings as fixtures/assertions; **exclude** `scripts/` — the build-time IEEE downloader is Story 2.1's network surface and is out of the runtime privacy perimeter).
  - [x] For each file, strip comments **before** scanning, with a small string-aware state machine (line `//` + block `/* */`, tracking `'`, `"`, and backtick string state so a `//` inside a string URL is not treated as a comment). Naive regex comment-stripping would corrupt exactly the string literals this guard cares about.
  - [x] Forbidden-API check: fail if the stripped source matches `/\b(XMLHttpRequest|WebSocket|EventSource)\b/` (AC2's explicit list). Do not add `navigator.sendBeacon`/`RTCPeerConnection` etc. — the AC names three; growing the list ad hoc invites bikeshedding, and a future `fetch` abuse is already covered by the fetch rule.
  - [x] Remote-URL check: fail if any **quoted string literal** in the stripped source contains `http://` or `https://` (AC2 "any remote URL literal"). Scan string literals specifically (the same state machine yields them into a `strings[]` list), not raw source.
  - [x] Fetch-target check (AC2): locate every `fetch(` call in the stripped source; extract its argument text with simple paren matching (depth counter — nested parens like `fetch(chrome.runtime.getURL('oui-data.json'))` are the expected shape); fail unless the argument text contains `getURL` or `chrome-extension:`. String literals are replaced by NUL-delimited index slots during stripping (structure-safe for paren matching) and expanded back before the substring test — so `fetch('chrome-extension://…')` passes. This permits the Story 2.2 pattern and rejects `fetch('https://…')` / bare `fetch(remoteVar)`. Documented heuristic limit (decision 6): bare-variable `fetch(url)` is flagged even if `getURL` appears elsewhere in the file — the pinned architecture shape is the inline call.
  - [x] Failure messages name the file and the matched text (`src/bad.ts: forbidden network API "WebSocket"`, etc.).
- [x] Task 3: Wire into `npm test` (AC: 3)
  - [x] **No config changes needed — verified.** `vitest.config.ts` already includes `tests/**/*.test.ts`; `tsconfig.json` `include` already has `"tests"`. Default Vitest environment is `node`; no happy-dom pragma on the guard file.
  - [x] `npm test` output shows `tests/privacy.guard.test.ts` (18 assertions) passing alongside the existing 4 files — total **5 files, 116 tests**.
- [x] Task 4: CSP evaluation — document the decision, do not ship a dev-breaking CSP (AC: 1–3; owned defer from 1-1)
  - [x] **No `content_security_policy` added to the manifest.** MV3 default (`script-src 'self'; object-src 'self'`) already forbids inline/remote scripts, cannot be relaxed below the floor, and does not restrict `connect-src`; adding a `connect-src` restriction breaks CRXJS dev-mode HMR (`vite.config.ts` uses `crx({ manifest })`; no in-project build-time transform).
  - [x] The enforceable runtime posture is fully covered by Tasks 1–2.
  - [x] `_bmad-output/implementation-artifacts/deferred-work.md` updated: Story 1.8 header block (guard resolved; CSP re-scoped to 3.x with research; stale tsconfig-`tests` entry resolved); inline annotations on the 1-1 CSP entry, 1-1 guard entry, and 1-3 tsconfig-`include` entry. The unrelated `DOM.Iterable` `lib` entry left open.
- [x] Task 5: Version bump + gates (AC: 1–3)
  - [x] `manifest.json` `version`: `0.5.0` → `0.6.0` (minor bump per story; `package.json` untouched).
  - [x] Gates: `npm run typecheck` (0 errors), `npm test` (5 files, 116 tests green), `npm run build` (succeeds; `dist/manifest.json` version `0.6.0`; source == dist manifest byte-identical).
  - [x] Guardrail greps: no `chrome.`, `fetch(`, `XMLHttpRequest`, `WebSocket`, `EventSource`, or `http(s)://` in `src/`; `src/lib/**` and `src/ui/**` untouched this story.
  - [x] Red-path sanity (observed failing, then reverted):
    - Temporarily set `"permissions": ["tabs"]` in `manifest.json` → guard failed with `permissions must be absent or [] (got ["tabs"])`; reverted (byte-identical).
    - Temporarily added `src/bad-fixture.ts` with `new WebSocket('wss://…')` and `'https://evil.example/x'` → scan failed with both violations named; deleted; suite back to 116 green.

## Dev Notes

### Critical Decisions

1. **Scan `src/**/*.ts` only — not `scripts/`, not `tests/`, not `dist/`, not CSS/HTML.** The runtime privacy perimeter is the extension bundle produced from `src/` (architecture: "Add no permissions, no network calls, no telemetry — enforced by the guard suite"). `scripts/build-oui-data.ts` (Story 2.1) *must* make HTTPS requests to IEEE at build time; excluding it is a scope boundary, not a loophole. `tests/` files may contain forbidden strings as negative fixtures. `dist/` is a build artifact (gitignored, may not exist at test time) and is byte-derived from `src/` + `manifest.json`, both of which are asserted directly. CSS/HTML carry no executable network surface under MV3 CSP.
2. **Manifest guard reads the source `manifest.json`, not `dist/manifest.json`.** Architecture line "verify against the built manifest with the guard test" is honored *in effect*: Vite's CRXJS pipeline copies the manifest verbatim (verified IDENTICAL in 1-7), so source == built. Reading `dist/` would couple `npm test` to `npm run build` and break the typecheck+test gate on a clean tree. Task 5 still verifies `dist/manifest.json` version as part of the build gate.
3. **No CSP change this story; the defer is re-scoped with research, not silently dropped.** MV3 default CSP = `script-src 'self'; object-src 'self'` (Chrome docs; floor cannot be relaxed). It does not restrict `connect-src`. CRXJS dev mode requires a dev-server connect (HMR), so a manifest CSP containing `connect-src 'self'` breaks `npm run dev`. A build-time-only CSP transform would require new tooling (CRXJS doesn't expose it in-project) for defense-in-depth the guard already provides. Decision: guard tests = the enforceable posture; CSP re-deferred to the store-publish epic (3.x) where a build transform, if ever, belongs. Recorded in `deferred-work.md` Task 4.
4. **"Absent or empty" for `permissions`/`host_permissions`; "absent" for `background`/`content_scripts`.** Chrome treats `[]` and absent identically for grant lists; forbidding the key would fail on a harmless key reorder. For worker/content-script keys, presence at all is the regression (any value is a surface), so absence is the right assertion. AC1 literally names the two grant keys; the two worker keys extend it to Story 1.1's full manifest contract (epics 1.1: "no `permissions`, no `host_permissions`, no `background`, no `content_scripts`") at near-zero cost — architecture calls the three (manifest, clipboard, guard) "mutually dependent".
5. **Comment stripping must be string-aware.** The very thing the remote-URL rule searches for (`https://…` inside quotes) contains `//`, which a naive `//.*` strip would eat — or worse, a URL in a string would make a subsequent real comment look unterminated. The stripper tracks quote state; it does not need to be a full lexer (no template-literal `${}` interpolation edge cases matter at this codebase size — if one appears, extend the stripper then).
6. **Fetch rule is a conservative argument-text heuristic, not an AST walk.** No new dependencies (architecture: no runtime deps; adding `@typescript-eslint` or `ts-morph` just to parse `fetch(` in a 5-file repo violates the "small, well-executed utility" thesis). Paren-depth extraction + `getURL`/`chrome-extension:` substring test is exactly the AC's wording ("permits only `fetch` against a `chrome-extension:` / `getURL()` target") and is pre-validated against the known future call shape in architecture (`fetch(chrome.runtime.getURL('oui-data.json'))`).
7. **Node test environment, no happy-dom pragma.** The guard does file I/O and regex only. Vitest default is `node` (`vitest.config.ts:5`); the happy-dom pragma remains a per-file opt-in for DOM tests (`render.test.ts`), per the 1-3 review resolution.
8. **Failure messages name file + match.** The 1-7 review killed a vacuous CSS-contract test; the dual of that lesson is a guard that fails with actionable location data the first time it fires in anger.

### Behavior / Contract Table

| Surface | Before (current code) | After (this story) |
|---|---|---|
| `tests/` directory | does not exist | + `tests/privacy.guard.test.ts` |
| `npm test` output | 4 files, 97 tests | 5 files, 97 + guard assertions |
| `manifest.json` | `0.5.0`, no CSP, no permissions keys | `0.6.0`; still no CSP (decision 3); grant/worker keys now guard-asserted |
| `tsconfig.json` / `vitest.config.ts` | already include `tests/` | unchanged (verified) |
| `src/**` | no `fetch`/`chrome.`/network APIs | unchanged (guard is forward-looking for 2.2's `getURL` fetch) |
| `deferred-work.md` | guard defer open; CSP defer open; stale tsconfig-tests entry | guard defer resolved; CSP re-scoped to 3.x with research; tsconfig entry resolved |
| `package.json` version | `0.0.1` | unchanged (manifest-only bumps, per project-context) |

### Testing Standards

- New file `tests/privacy.guard.test.ts` (Node env). Manifest assertions via `readFileSync` + `JSON.parse` (never `import manifest from '…' with { type: 'json' }` in a test — JSON modules under `verbatimModuleSyntax` are fine in `vite.config.ts` but a file read matches the guard's "inspect the artifact" semantics and the established `render.test.ts` convention).
- Source scan is synchronous, pure filesystem + regex; co-locate small helpers (stripper, string extractor, paren matcher) **inside the guard file** — no `src/lib` imports (the guard is infrastructure, not product logic; no barrel, no export).
- Negative-path verification (Task 5): each of the three scan rules + the manifest rules must be observed failing at least once against a temporary fixture before the story is done; fixtures live only inside the test file (`describe` blocks with inline strings), never as committed "bad" files in `src/`.
- Existing 97 tests must pass unchanged — this story adds a file and a manifest version; it touches no `src/` code.
- AC3 is satisfied by infrastructure already in place; the acceptance evidence is the guard file appearing in `vitest run` output.

### Out of Scope (do not touch)

- Any `src/**` code change (including the future 2.2 loader — the guard is built *for* it, not *with* it).
- `scripts/build-oui-data.ts` network behavior (Story 2.1; build-time only, outside the runtime perimeter).
- Chrome Web Store packaging, network-trace verification, telemetry absence review (Story 3.3 — it *consumes* this guard: "the built manifest has empty permissions… the source scan finds no remote URLs").
- `content_security_policy` key in the manifest (decision 3; re-scoped to 3.x).
- New devDependencies, ESLint, AST tooling, CI workflow (architecture deferred decisions).
- `package.json` `version` field (manifest-only bumps).
- E2E/network-trace tooling (architecture deferred; 3.3's manual trace).

### Project Structure Notes

- Adds exactly one file: `tests/privacy.guard.test.ts`. Creates the `tests/` directory per architecture's file tree (`tests/privacy.guard.test.ts  # manifest + source-scan assertions`).
- No config deltas: `tsconfig.json` `include: ["src", "tests", "vite.config.ts"]` and `vitest.config.ts` `include: ['src/**/*.test.ts','tests/**/*.test.ts']` already cover the new path — confirmed in-tree; the matching deferred-work entry is stale and gets marked resolved.
- Naming: kebab-case file, matches the architecture tree and epics' guard description exactly (`tests/privacy.guard.test.ts`).
- Layering: the guard lives outside `src/` so it cannot be imported by product code and is not part of the bundle; it depends only on Node `fs`/`path` and Vitest.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.8] — the three ACs (manifest non-empty fail, source-scan rules, runs under `npm test`); role/action/benefit wording.
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1] — "no `permissions`, no `host_permissions`, no `background`, no `content_scripts`" (Task 1's extra assertions).
- [Source: _bmad-output/planning-artifacts/epics.md#NFR2] — "Zero outbound network requests at runtime; no telemetry; the MAC, clipboard content, and results are never persisted or transmitted."
- [Source: _bmad-output/planning-artifacts/epics.md#FR8] / [Story 3.3] — 3.3's AC "the built manifest has empty `permissions` and `host_permissions`, and the source scan finds no remote URLs or network APIs" is the same guard reused at publish time.
- [Source: _bmad-output/planning-artifacts/architecture.md#Important Decisions] — "Privacy guard test suite (manifest assertions + source scan)."
- [Source: _bmad-output/planning-artifacts/architecture.md#AI Agent Directives] — "Add no permissions, no network calls, no telemetry — enforced by the guard suite"; "`npm test` (Vitest, incl. privacy guard) gate every change; verify against the built `manifest.json` with the guard test."
- [Source: _bmad-output/planning-artifacts/architecture.md#File Organization Patterns] / [file tree] — `tests/privacy.guard.test.ts` location; "the cross-cutting guard lives in `tests/`"; test organization (co-located units, cross-cutting guard separate).
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture] — the single I/O boundary `src/data/load-oui-data.ts` + `fetch(chrome.runtime.getURL('oui-data.json'))` shape the fetch rule must permit.
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision Impact Analysis] — "The zero-permission manifest, the user-gesture clipboard approach, and the privacy guard are mutually dependent."
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — 1.8-owned defers: CSP enforcement (1-1, research note); automated zero-permission/no-background/offline guard (1-1); stale tsconfig-`tests` entry (1-3).
- [Source: _bmad-output/implementation-artifacts/1-7-…md] — conventions: `readFileSync(resolve(process.cwd(), …))`, `git diff` blast-radius checks, vacuous-test lesson (review patch), version-bump discipline, manifest-verbatim-to-dist verification.
- [Source: Chrome extension docs — Extension manifest key `content_security_policy` / MV3 overview] — default extension_pages CSP is `script-src 'self'; object-src 'self'` (no `connect-src` restriction; cannot relax below the script floor). Basis for decision 3.

## Dev Agent Record

### Agent Model Used

opencode / mimo-v2.6-flash-free

### Debug Log References

- RED phase via fixtures, not via breaking the real tree first: the 18 guard tests include negative-path fixtures for every rule (permissions/host_permissions/background/content_scripts; XMLHttpRequest/WebSocket/EventSource; http/https string literals; non-extension fetch) so each detector is proven on first write. The real-tree assertions pass because the tree is clean.
- One implementation bug caught by the first `npm test` run: the string-aware stripper removed string *content* from `stripped`, so `fetch('chrome-extension://…')` looked like `fetch()` with empty args and false-failed. Fixed by emitting NUL-delimited index slots into `stripped` (structure-safe for paren matching) and expanding slots back via `expandStringSlots` before the getURL/chrome-extension: substring test.
- Second false-fail on first run: `fetch(url)` where `url` was assigned from `getURL` earlier — the argument text is just `url`. Per the story's heuristic (decision 6) this is intentionally flagged; the test was corrected to assert the *pinned* inline shape `fetch(chrome.runtime.getURL('oui-data.json'))` passes, the chrome-extension literal passes, and bare-variable fetch is the documented limit.
- Red-path sanity (Task 5): temporary `"permissions": ["tabs"]` in `manifest.json` → 1 test failed naming the key; reverted byte-identical. Temporary `src/bad-fixture.ts` with WebSocket + https URL → 1 test failed naming both violations; deleted; suite green again.
- Final gates: `npm run typecheck` → 0 errors; `npm test` → **5 files, 116 tests passed** (97 existing + 19 guard); `npm run build` → success, `dist/manifest.json` version `0.6.0`, source == dist manifest byte-identical.
- Blast-radius: no files under `src/` modified (`git status` shows only the new test, manifest version, deferred-work, story, sprint-status). Grep for `chrome.`/`fetch(`/`XMLHttpRequest`/`WebSocket`/`EventSource`/`https?://` in `src/` → no matches. `package.json` untouched. No new dependencies.

### Completion Notes List

- **AC1 (manifest guard):** `tests/privacy.guard.test.ts` reads source `manifest.json` via `readFileSync` + `JSON.parse` and fails on non-empty/`present` `permissions`, `host_permissions`, `background`, or `content_scripts`, or non-3 `manifest_version`. Negative fixtures prove each rule. Source manifest == shipped manifest (Vite copies verbatim; verified).
- **AC2 (source scan):** recursive `src/**/*.ts` scan (excludes `*.test.ts`); string-aware comment stripper with NUL slots; three rules — forbidden APIs (XHR/WebSocket/EventSource), remote URL string literals (http/https), fetch-only-against-getURL/chrome-extension. Failure messages include file + match. Real tree clean; every rule observed red on fixtures and on a temporary bad `src` file.
- **AC3 (runs under `npm test`):** no config changes — `vitest.config.ts`/`tsconfig.json` already covered `tests/`. Guard file appears in `vitest run` as the 5th file.
- **CSP (Task 4):** deliberately not added; research recorded in `deferred-work.md` (default CSP lacks connect-src restriction; connect-src breaks CRXJS dev; re-scoped to 3.x with build-transform note). Manifest still has no `content_security_policy`.
- **Owned defers discharged:** 1-1 automated guard (resolved — this file); 1-3 stale tsconfig-`include` claim (confirmed resolved, annotated); 1-1 CSP (re-deferred to 3.x with research, not dropped).
- **Heuristic limit (intentional, decision 6):** bare-variable `fetch(url)` is flagged even if `getURL` appears elsewhere in the same file — the architecture-pinned shape is the inline `fetch(chrome.runtime.getURL(...))`. A determined bypasser edits the guard; this is a regression tripwire, not a security boundary.

### Change Log

- 2026-10-11: Privacy guard suite: added `tests/privacy.guard.test.ts` (manifest assertions + string-aware `src/` source scan; 18 tests including negative-path fixtures for every rule); red-path sanity verified against a temporary permissions grant and a temporary bad `src` file; `deferred-work.md` updated (guard defer resolved, CSP re-scoped to 3.x with research, stale tsconfig-`tests` entry resolved); manifest 0.5.0 → 0.6.0. No `src/` changes, no config changes, no new dependencies. 116 tests, typecheck 0, build OK, dist `0.6.0`. Status set to review.

### File List

- `_bmad-output/implementation-artifacts/1-8-enforce-the-privacy-posture-with-a-guard-test-suite.md` (modified) — this story record.
- `_bmad-output/implementation-artifacts/deferred-work.md` (modified) — 1.8 resolution header + annotated 1-1 CSP/guard entries + resolved 1-3 tsconfig-`include` entry.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified) — 1-8 status transitions.
- `tests/privacy.guard.test.ts` (new) — privacy guard suite (manifest + source scan).
- `manifest.json` (modified) — version `0.6.0`.
