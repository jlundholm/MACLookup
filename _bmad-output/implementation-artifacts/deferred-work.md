# Deferred Work

> **Resolved by Story 2.3 (vendor banner):** the Story 1.1 **banner**
> live-region note — re-scoped to 2.3 by Story 1.7 — is discharged. 2.3 makes
> `#result-banner` the single content-driven live region the note asked for:
> permanently present, never `hidden`, with its `#banner-lamp`/`#banner-label`/
> `#banner-value`/`#banner-prefix` children written and cleared by `render()`.
> Because 2.3 ships a static skeleton inside the banner, the element is never
> CSS `:empty`, so the phantom-flex-gap branch of the note ("the banner must do
> the same or land its own layout") is met by its own layout instead: render
> sets or removes `banner.dataset.state`, and
> `.result-banner:not([data-state]) { position: absolute; }` takes the idle
> banner out of the `.popup` flex flow without ever hiding a live region. The
> superseded `#input-error` element and its `.input-error` rules are deleted —
> the banner now owns the invalid message.

> **Resolved by Story 1.8 (privacy guard suite, 2026-10-11):** the Story 1.1
> "automated guard for the zero-permission / no-background / offline posture"
> entry is discharged — `tests/privacy.guard.test.ts` now asserts the manifest
> (permissions/host_permissions absent-or-empty; background/content_scripts
> absent) and scans `src/**/*.ts` (forbidden network APIs, remote URL literals,
> fetch only against `getURL`/`chrome-extension:`) on every `npm test`. The
> Story 1.3 `tsconfig.json` `include`-lacks-`tests/` entry is also resolved
> (config already covered `tests/`; this was a stale claim). The Story 1.1
> **CSP** entry is **re-deferred to the store-publish epic (3.x)** with
> research: MV3's default CSP (`script-src 'self'; object-src 'self'`) does not
> restrict `connect-src` and cannot be relaxed below the script floor; adding a
> `connect-src` restriction breaks CRXJS dev-mode HMR (needs dev-server
> connect), and no in-project build-time transform exists to apply CSP only on
> `vite build`. The guard suite already covers the enforceable runtime posture;
> revisit CSP only if publishing, and only with a build-only transform.

> **Resolved by Story 1.7 (accessibility floor):** the Story 1.1 live-region
> `hidden`-suppression entry and the Story 1.3 `outline: none` forced-colors
> entry are discharged. `#input-error` is a permanently-present polite live
> region whose text is written/cleared by `render()` (content-driven, never
> hidden-with-content), so the same prefilled-then-toggled suppression the 1.1
> entry warned about is not reintroduced; the Story 1.3 entry's
> `@media (forced-colors: active)` focus path is added for both `.mac-input` and
> `.copy-button`. The Story 1.2 entry is **partially** discharged: its
> forced-colors focus concern is resolved by the same 1.7 media block, while its
> zoom/fixed-px clipping concern is **re-deferred** (below). The Story 1.2
> zoom/fixed-px clipping entry is **re-deferred**: properly fixing text scaling means re-basing the type system
> on `rem` plus shell changes across every component — a cross-cutting visual
> overhaul with real regression risk to 1.2/1.5's pixel-matched tokens; revisit
> only if store review or a real user reports clipping.

## Deferred from: code review of 3-1-package-the-built-extension-for-store-submission (2026-10-16)

- **`optional_permissions` / `optional_host_permissions` escape the zero-grant check:** `packageViolations` (scripts/package-extension.ts:119-123) inspects only `permissions` and `host_permissions`, so an MV3 optional-grant key would ship while the script asserts the zero-permission posture. Intentional parity with the Story 1.8 guard (Critical Decision 5 mirrors the guard's invariants, which also omit these keys); revisit only if the guard's threat model changes.

## Deferred from: code review of story 2-3 (2026-10-11)

- **Outcome styling commits to `miss` during the dataset load window:** a valid MAC pasted before `dataset-ready` derives `status: 'miss'` (Critical Decision 1), so `root.dataset.status` (src/ui/render.ts:50) paints the format-row rails and copy-button hover in the amber miss colour before the dataset has answered — only the banner is readiness-gated. Transient (≈ one-time load, measured 172.8 ms in 2.2) and inherited from 2.2's `'valid'`-keyed rails; no failing test. Revisit if the load ever becomes slow enough to be perceptible, or if a fourth "checking" status is ever wanted.
- **Live-region text written unconditionally each render:** `render()` (src/ui/render.ts:86-88) reassigns `#banner-label`/`#banner-value`/`#banner-prefix` `textContent` on every `input` event even when the outcome string is unchanged, which some assistive tech may re-announce while typing into the invalid state. The same unconditional-write pattern pre-dates this story (1.7's `#input-error`); suppressing identical writes is a cross-cutting a11y refinement (diff-before-write), not a 2.3 defect.

## Deferred from: code review of story 2-2 (2026-10-11)

- **Empty-string vendor semantics:** `lookupVendor` (src/lib/lookup.ts:26) returns `{ ok: true, vendor: '' }` for an OUI whose `Organization Name` is blank, which is indistinguishable from a real hit; Story 2.3's "Unknown vendor" microcopy must define how a blank name renders. No blank values exist in the committed artifact, so this is a hand-off rather than a defect.
- **`counts` cross-check / fail-on-drift:** the loader (src/data/load-oui-data.ts:34-49) warn-skips unexpected-length keys (spec-mandated by Critical Decision 3) but never compares the built Map sizes against the artifact's `counts` field, so a truncated or drifted dataset loads as `'ready'` with silently missing vendors. Cross-checking sizes against `counts` and failing the load on mismatch would catch both truncation and drift. Enhancement beyond AC scope.

## Deferred from: code review of story 2-1 (2026-10-11)

- **`fetch` timeout / integrity validation:** `fetchCsv` (scripts/build-oui-data.ts:158-161) has no `AbortSignal`/timeout, so a stalled TCP connection hangs `npm run build:data` indefinitely; it also does no content-type/length/row-count validation beyond `res.ok` (the empty/partial-dataset consequence is covered by the F2 patch). Enhancement beyond AC scope.
- **Symlinked-invocation entrypoint guard:** the guard (scripts/build-oui-data.ts:186) compares `import.meta.url` (realpath) to `pathToFileURL(process.argv[1])` (symlink path), so invoking the script through a symlink silently no-ops without writing the artifact. Normal `npm run build:data` passes the real path and is unaffected; would only matter if tooling ever symlinks the entrypoint.
- **Embedded newline inside a quoted CSV field:** `parseCsv` (scripts/build-oui-data.ts:40-45) splits on `\r\n|\n|\r` before quote handling, so a quoted field containing a newline is split into two unbalanced lines and both are dropped silently. Documented single-line assumption for the IEEE registries; latent only if IEEE changes its format.
- **AC5 size budget unenforced in CI:** the NFR5 budget is only a runtime `console.warn` (scripts/build-oui-data.ts:179-182); no test or gate asserts raw/compressed dataset size or the ≤3 MB total-package bound. Critical Decision 6 deliberately made size a warning rather than a build failure.
- **`measureSizes` untested:** exported (scripts/build-oui-data.ts:152-156) but never imported by tests/build-oui-data.test.ts; only exercised indirectly by `main()`. The size budget is verified manually.

## Deferred from: code review of story 1-8 (2026-10-11)

- **Template-literal interpolation blind spot:** the guard's string-aware stripper treats an entire backtick literal (including any `${…}` interpolation) as one opaque string, so network APIs or remote URLs hidden inside an interpolation expression are never scanned as code. Documented as Critical Decision 5 ("extend the stripper then"); no scanned `src` file performs network work inside interpolation today, and fail-closed is impossible because `src/main.ts:9` legitimately uses `` `…#${id}` ``. Revisit only if `src` gains interpolation that could carry a network target — proper handling needs template-depth tracking, not a regex.
- **Indirection bypasses:** the forbidden-API regex (`\b(XMLHttpRequest|WebSocket|EventSource)\b`), the fetch-call regex (`\bfetch\s*\(`), and the fetch-target substring test can be evaded by bracket notation (`window['XMLHttpRequest']`), TS generics (`fetch<T>(…)`), optional chaining (`fetch?.(…)`), or a target whose text merely contains `getURL`/`chrome-extension:` (`fetch('//evil.example/getURL')`). Documented as Critical Decision 6: the guard is a regression tripwire, not a security boundary; a determined bypasser edits the guard. Revisit only if the guard's threat model changes.
- **Protocol-relative URL literals:** `"//evil.example/x"` is not flagged by the remote-URL literal rule (AC2 names only `http://`/`https://`). Same tripwire caveat as above; the explicit http(s) case is still caught.

## Deferred from: code review of story 1-7 (2026-10-11)

- MV3 popup `autofocus` is platform-dependent and has no fallback: Chromium popup-document focus quirks can leave both `autofocus` and programmatic `focus()` as no-ops until the popup window gains focus, so AC1 ("popup opens with focus in the field") has no recovery path on affected Chrome builds. Story 1-7 deliberately ships declarative-only (no JS `focus()` call in `main.ts`); the manual GUI verification step in Task 6 is the current coverage. Revisit only if a real user reports the field doesn't start focused; a JS fallback would need care not to steal focus from the address bar on open.

## Deferred from: code review of 1-1-scaffold-the-extension-zero-permission-manifest-and-popup-shell (2026-10-10)

- ~~`hidden` on the `aria-live="polite"` banner (`index.html:23-29`) can suppress screen-reader announcements while hidden.~~ **Resolved/Re-scoped by Story 1.7:** `#input-error` is now the Epic-1 live region (`role="status"`); the banner's live-region pattern is re-scoped to Story 2.3 (see header).
- Long readout/vendor text has no wrap/ellipsis constraint at the fixed 360px width under `overflow: hidden` (`src/styles/app.css:5`). Revisit in Story 1.5 (format rows) and Epic 2 (vendor name).
- ~~Enforce the offline/no-network posture with a restrictive MV3 CSP (`manifest.json`).~~ **Re-deferred by Story 1.8 to the store-publish epic (3.x):** MV3 default CSP does not restrict `connect-src`; adding it breaks CRXJS dev HMR; no in-project build-only transform exists. Guard suite covers the enforceable posture (see header).
- ~~No automated guard asserting the zero-permission / no-background / offline posture stays intact (`manifest.json`).~~ **Resolved by Story 1.8:** `tests/privacy.guard.test.ts` (manifest assertions + `src/` source scan) runs under every `npm test`.
- `tsconfig.json` `lib` omits `DOM.Iterable` (`tsconfig.json:4`) — latent typecheck failure if future code iterates DOM collections. Low priority.
- No Node `engines` field / `.nvmrc` pin for the Vite 8 toolchain (`package.json`). Low-risk DX hardening.
- Dev server port is not pinned for the CRXJS dev origin (`vite.config.ts:5-7`) — if Vite falls back off port 5173, the CRXJS dev manifest origin mismatches and popup scripts fail to load. Dev-only edge case.

## Deferred from: code review of 1-2-design-tokens-typography-and-automatic-light-dark-theming (2026-10-10)

- MAC input foreground and box chrome not themed (`.mac-input` sets no `color`; `--color-focus-ring` unused; no `:focus-visible`). Deferred to Story 1.3 (UX-DR3) which owns the input component.
- Typographic role hooks (`.readout`/`.field-label`/`.state-label`/`.prefix`) lack a `margin: 0` reset and `min-width: 0`/`overflow-wrap` guards. Deferred to Story 1.5 (UX-DR6) where the row components render them.
- ~~High-contrast `forced-colors` mode and zoom/fixed-px text scaling are unhandled. Deferred to Story 1.7 (accessibility floor); state is also carried by the `state-label` text, so color is reinforcement.~~ **Partially resolved by Story 1.7:** `@media (forced-colors: active)` focus path added; zoom/fixed-px clipping re-deferred (see header).
- Popup-shell shadow and corner radius are clipped/ineffective in a real extension popup (`.popup` width == `body` width, `overflow: hidden`). Cosmetic; revisit only if the shell frame matters.

## Deferred from: code review of story 1-3 (2026-10-10)

- ~~`outline: none` on `.mac-input` (`src/styles/app.css:138`) leaves keyboard focus invisible under Windows `forced-colors`: author outlines are suppressed and both the `box-shadow` halo and the `border-color` focus cue are forced to system colors. Story 1.3's scope boundary explicitly defers `forced-colors` to Story 1.7 (accessibility floor), which should add the `@media (forced-colors: active)` focus path.~~ **Resolved by Story 1.7:** `@media (forced-colors: active)` outline path added for `.mac-input:focus-visible` and `.copy-button:focus-visible`.
- Vitest's global `environment: 'node'` (`vitest.config.ts:5`) will break the architecture's future `src/ui/render.test.ts` (DOM assertions / happy-dom) under the `src/**/*.test.ts` include. The future DOM-test story should add a per-file `// @vitest-environment happy-dom` pragma (or `environmentMatchGlobs`) rather than change the node default.
- ~~`tsconfig.json` `include` (`["src", "vite.config.ts"]`) does not cover a root `tests/` directory, so Story 1.8's `tests/privacy.guard.test.ts` would be skipped by `npm run typecheck` as well as by Vitest. Note: the Vitest `include` side of this is a **patch** (fixed in this review); the `tsconfig` side rides along with it.~~ **Resolved (stale, confirmed by Story 1.8):** `tsconfig.json` `include` already contained `"tests"` and `vitest.config.ts` already included `tests/**/*.test.ts` before 1.8 started; the guard file typechecks and runs with no config changes.
