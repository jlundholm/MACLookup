---
baseline_commit: d046177abe19f3aa165a009c7de1bdf1975b8637
---

# Story 1.8: Enforce the privacy posture with a guard test suite

Status: ready-for-dev

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

- [ ] Task 1: Manifest privacy assertions (AC: 1)
  - [ ] Create `tests/` (does not exist yet) and `tests/privacy.guard.test.ts`.
  - [ ] Read the **source** `manifest.json` at the repo root via `readFileSync(resolve(process.cwd(), 'manifest.json'))` + `JSON.parse` (the established convention from `render.test.ts`; **not** `new URL` — Node env). Rationale: Vite copies `manifest.json` verbatim into `dist/` (verified IDENTICAL in 1-7), `dist/` is gitignored, and `npm test` must not depend on a prior `npm run build` — the source manifest *is* the shipped manifest.
  - [ ] Assert `permissions` is **absent or `[]`** and `host_permissions` is **absent or `[]`** (AC1 / NFR2). Use "absent or empty" — MV3 treats both the same, and forbidding the key outright would force a rewrite if a future key order changes; the privacy invariant is "grants nothing", not "mentions nothing".
  - [ ] Also assert `background` and `content_scripts` are **absent** (locks Story 1.1's manifest contract and architecture's "single surface, no service worker, no content script" boundary — cheap, and the zero-permission posture is meaningless if a background worker can later fetch).
  - [ ] Keep assertions to the four keys above plus a `manifest_version === 3` sanity check — do **not** snapshot the whole manifest (icons/name/description have no privacy bearing and would make every cosmetic edit a guard failure).
- [ ] Task 2: `src/` source scan (AC: 2)
  - [ ] Recursively collect `**/*.ts` under `src/` only (Node `readdirSync` with `withFileTypes`, skip `node_modules`; **exclude** any `*.test.ts` — test files may legitimately mention forbidden strings as fixtures/assertions; **exclude** `scripts/` — the build-time IEEE downloader is Story 2.1's network surface and is out of the runtime privacy perimeter).
  - [ ] For each file, strip comments **before** scanning, with a small string-aware state machine (line `//` + block `/* */`, tracking `'`, `"`, and backtick string state so a `//` inside a string URL is not treated as a comment). Naive regex comment-stripping would corrupt exactly the string literals this guard cares about.
  - [ ] Forbidden-API check: fail if the stripped source matches `/\b(XMLHttpRequest|WebSocket|EventSource)\b/` (AC2's explicit list). Do not add `navigator.sendBeacon`/`RTCPeerConnection` etc. — the AC names three; growing the list ad hoc invites bikeshedding, and a future `fetch` abuse is already covered by the fetch rule.
  - [ ] Remote-URL check: fail if any **quoted string literal** in the stripped source contains `http://` or `https://` (AC2 "any remote URL literal"). Scan string literals specifically (the same state machine can yield them), not raw source — otherwise a comment mentioning `https://`… wait, comments are already stripped; still, scanning string literals keeps the rule precise and matches "literal".
  - [ ] Fetch-target check (AC2): locate every `fetch(` call in the stripped source; extract its argument text with simple paren matching (depth counter — nested parens like `fetch(chrome.runtime.getURL('oui-data.json'))` are the expected shape); fail unless the argument text contains `getURL` or `chrome-extension:`. This permits the Story 2.2 pattern (`fetch(chrome.runtime.getURL('oui-data.json'))` → `chrome-extension://<id>/oui-data.json`) and rejects `fetch('https://…')` / `fetch(remoteVar)` where the argument mentions neither. Document the heuristic's limit: it is argument-text-based, not a full AST — a future caller that hides a remote URL behind a variable named `getURL` would slip through; that is an acceptable false-negative for a 3-rule guard (a determined bypasser edits the guard).
  - [ ] Failure messages must name the file and the matched text (a bare "network API found" in a 5-file codebase is useless when this fires in year two).
- [ ] Task 3: Wire into `npm test` (AC: 3)
  - [ ] **No config changes needed — verify only.** `vitest.config.ts` already includes `tests/**/*.test.ts`; `tsconfig.json` `include` already has `"tests"` (both fixed in 1-3/1-7 reviews — the old deferred-work entry claiming `tests/` would be skipped by typecheck is **stale**; Task 5 marks it resolved). Default Vitest environment is `node`, which is what this file wants (no `// @vitest-environment happy-dom` pragma).
  - [ ] Run `npm test` and confirm the output shows the new `tests/privacy.guard.test.ts` file and its assertions passing alongside the existing 4 files / 97 tests.
- [ ] Task 4: CSP evaluation — document the decision, do not ship a dev-breaking CSP (AC: 1–3; owned defer from 1-1)
  - [ ] The 1-1 review deferred "enforce the offline/no-network posture with a restrictive MV3 CSP" to this story as single owner. Research conclusion (see Dev Notes decision 3): **do not add `content_security_policy` to the manifest in this story.** MV3's default extension-page CSP (`script-src 'self'; object-src 'self'`) already forbids inline/remote scripts and cannot be relaxed below the floor; it does **not** restrict `connect-src`, and adding `connect-src 'self'` (or similar) to cover the already-redundant network gap **breaks CRXJS dev mode**, which needs a dev-server connect for HMR (`vite.config.ts` uses `crx({ manifest })`; no build-time transform exists in-project to apply CSP only on `vite build`).
  - [ ] The enforceable runtime posture (no permissions, no background/content scripts, no network APIs, no remote literals, fetch-local-only) is fully covered by Tasks 1–2 — the CSP would be defense-in-depth against a vector (`connect-src`) that the source scan and manifest guard already make unreachable without a manifest edit that the guard would catch.
  - [ ] Update `_bmad-output/implementation-artifacts/deferred-work.md`: mark the Story 1.8 **guard-suite** defer resolved (this story); rewrite the **CSP** defer with the research finding and re-scope it to Story 3.x (store publish — the only context where a build-only CSP transform, if ever wanted, would be worth the tooling); mark the stale `tsconfig.json` `include`-lacks-`tests/` entry resolved (already fixed in-tree).
- [ ] Task 5: Version bump + gates (AC: 1–3)
  - [ ] `manifest.json` `version`: `0.5.0` → `0.6.0` (minor bump per story; `package.json` untouched per project-context).
  - [ ] Gates: `npm run typecheck` (0 errors), `npm test` (all green, guard file included), `npm run build` (succeeds; `dist/manifest.json` version `0.6.0`).
  - [ ] Guardrail greps (self-application): the new test file is the *only* place forbidden strings/API names may appear; `src/` greps for `chrome.`, `fetch(`, `XMLHttpRequest` stay clean today (Story 2.2 will introduce the first permitted `fetch`+`getURL` — the guard is pre-built for it).
  - [ ] Sanity: temporarily break a copy of the guard inputs (e.g. assert against a fixture manifest with `"permissions": ["tabs"]`, or a fixture source with `fetch('https://example.com')`) and confirm each rule fails loudly — then revert. A guard that has never been observed red is a guard of unknown quality (mirrors the 1-7 review's "vacuous test" finding).

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

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
