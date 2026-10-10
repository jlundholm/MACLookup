# Edge-Case Review — OUI Scout PRD

Adversarial review of `prd.md` and `addendum.md`, walking every branching path and boundary condition in the input parsing, conversion/copy, OUI lookup, empty/unknown, theming, and clipboard/permission requirements. Only genuinely unhandled edge cases are reported. "Unhandled" means the PRD/addendum neither specifies behavior nor explicitly declares the case out of scope.

Severity legend: **critical** (blocks correct build / legal/safety), **high** (contradicts a core journey or silently produces wrong output), **medium** (normal usage will hit it and behavior is undefined), **low** (rare but plausible).

---

## Input parsing

- [severity: high] Multiple MACs / multi-line paste — UJ-1's own source is `show mac address-table`, which contains many MACs; a user pasting that table (or a diff/list of addresses) yields a blob that is not exactly 12 hex digits and therefore silently produces "Not a valid MAC address". — The parser rule (addendum "Input parser rules") only defines a single-string 12-hex-digit accept/reject and never says what to do when a paste contains one, several, or hundreds of MACs; there is no "pick first / pick unique / list all" rule. — Suggested FR: define multi-MAC behavior explicitly (e.g., FR-1a: if the stripped paste contains multiple MAC-like tokens, resolve the first valid one and note "first of N", or reject with a distinct multi-MAC message).
- [severity: high] Empty vs. invalid input state — An empty field (initial state, or after the user deletes all text) is not the same as invalid text, but FR-2 only defines the "not a valid MAC" error and requires outputs/vendor to be "cleared or disabled while input is invalid". — The PRD never states whether an empty/whitespace-only field is neutral (no error, no results) or triggers the inline error, so a fresh popup may show a spurious error. — Suggested FR: add an explicit empty-state requirement (FR-2a: empty/whitespace-only input shows no error and a neutral idle state; the error appears only for non-empty input that fails the 12-hex rule).
- [severity: medium] Unicode separators and homoglyphs — Pastes from docs/PDFs/websites frequently carry en/em dashes (`–`, `—`), non-breaking or en/em spaces, zero-width characters, fullwidth digits/letters, or smart quotes; the addendum only strips ASCII `: - .` plus "whitespace". — The exact whitespace class is unspecified (does it include U+00A0, U+2007, U+200B?) and no rule covers non-ASCII separators, so visually identical MACs may fail inconsistently. — Suggested FR: specify the normalization class (e.g., NFKC-normalize, then strip ASCII and Unicode dash/space separators) and state behavior for non-ASCII hex homoglyphs.
- [severity: medium] Very long paste / no length bound — A paste of a large document, log, or base64 blob is processed through the strip+validate path (and, if it happens to strip to 12 hex, is accepted). — No maximum input length is defined, and no performance bound is stated for pathological pastes, risking a janky popup that violates SM-1/§8. — Suggested FR: define a max pasted length (e.g., truncate/reject above N KB) and require validation to stay under the 100 ms budget for oversized input.
- [severity: low] `0x`/prefixed or quoted forms — Inputs like `0xAABBCCDDEEFF` or `"AA:BB:CC:DD:EE:FF"` strip to `0XAABBCCDDEEFF`/`AABBCCDDEEFF`; the `X` makes the first invalid (arguably fine) but quotes/handling are unstated. — Suggested FR: state that only the listed separators are stripped and document the resulting behavior for prefixes/quotes.

## Format conversion & copy

- [severity: medium] Clipboard write failure — FR-4 assumes the copy always succeeds ("places exactly that format string on the clipboard"), but `navigator.clipboard.writeText()` can reject (permission/policy denial, non-focused document, overridden clipboard tooling). — The PRD defines no failure state, so a rejected write could show a false "Copied" confirmation or nothing. — Suggested FR: add FR-4a: on a rejected clipboard write, show a distinct error (e.g., "Copy failed") and do not show the success confirmation.
- [severity: low] Rapid/repeated copy and confirmation races — FR-4 specifies a ~1.5 s confirmation that "then clears", but clicking multiple format copies (or the same control) in quick succession stacks timers and can clear the confirmation early/indefinitely or copy stale text. — Suggested FR: specify per-control confirmation replacement and that the copied string is always the format of the current canonical value at click time.

## OUI lookup (MA-L / MA-M / MA-S)

- [severity: high] Prefix precedence / longest-match — FR-5 says /24, /28, and /36 all resolve, but never defines which match wins when prefixes overlap or nest (e.g., the first 24 bits match an MA-L assignee while the first 36 bits match a different MA-S assignee). — Without a longest-prefix (most-specific-wins) rule the displayed Vendor is implementation-dependent and may be wrong, violating SM-4/SM-C2. — Suggested FR: add a precedence requirement (most-specific prefix wins: /36 > /28 > /24, with deterministic tie-breaking) and a test for nested-prefix MACs.
- [severity: medium] Prefix display format for /28 and /36 — FR-5/FR-6 require showing "the Prefix used/queried", but a /28 is 7 hex digits and a /36 is 9, which don't align to a clean separator form. — The PRD never defines how a 7- or 9-digit prefix is rendered (and in FR-6's "Unknown" case, which of the three prefix lengths to display when none match). — Suggested FR: define prefix formatting per registry and specify which prefix is shown in the no-match state.
- [severity: low] Locally-administered / multicast MACs get a meaningless lookup — A valid 12-hex MAC with the U/L or I/G bit set can never resolve to a real assignee, yet FR-5/FR-6 will show "Unknown vendor" as if it were a real miss. — Although device-type interpretation is deferred (§6.2), the *user-facing* distinction is unaddressed. — Suggested FR: optionally note when the U/L bit is set (e.g., "Locally administered — no vendor") to avoid implying a database gap.

## Empty / unknown states

- [severity: medium] Distinguishing "no match in one registry" from "no match at all" — FR-6 defines a single "Unknown vendor" state, but a prefix can miss /24 while hitting /28 (or vice versa); the PRD doesn't specify that lookup must check all three registries before declaring no-match. — Risk of a false "Unknown" when any registry actually covers the MAC (violates SM-4). — Suggested FR: require checking MA-L, MA-M, and MA-S before declaring no-match, and add a cross-registry test case.
- [severity: low] Very long Vendor names — Bundled registry names can be long; no wrapping/truncation behavior is specified for the Vendor display. — Suggested FR: specify truncation/wrap and tooltip for long vendor names.

## Theming / appearance

- [severity: low] Forced-colors / high-contrast mode — FR-7 covers only `prefers-color-scheme`; addendum relies on CSS system colors, which can render poorly or invisibly under Windows forced-colors / `prefers-contrast`. — Suggested FR: state acceptable behavior under forced-colors mode (or add regression coverage).
- [severity: low] First-paint theme flash — FR-7 requires matching the OS theme but the addendum notes MV3 CSP forbids the inline anti-FOUC script; the PRD doesn't define the acceptable first-paint behavior (a light flash in dark mode). — Suggested FR: state the CSS-first approach guarantees no wrong-theme first paint (covered by `color-scheme: light dark` on `:root`).

---

## Summary of top unhandled cases

1. **high** — Multi-MAC / multi-line paste (from `show mac address-table`, UJ-1's own source) has no defined behavior.
2. **high** — Empty vs. invalid input states are not distinguished; FR-2 could show an error on a fresh/cleared field.
3. **high** — No longest-prefix precedence across overlapping/neseted /24 /28 /36 registries, so Vendor can be wrong.
4. **medium** — Unicode separators/homoglyphs and very long pastes are unspecified in the parser rules.
5. **medium** — Clipboard write rejection has no failure state (false "Copied").
