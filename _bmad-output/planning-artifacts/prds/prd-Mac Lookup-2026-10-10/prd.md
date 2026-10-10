---
title: OUI Scout — Product Requirements Document
status: draft
created: 2026-10-10
updated: 2026-10-10
---

# PRD: OUI Scout

*MAC Converter & OUI Vendor Lookup — a Chrome extension.*

## 0. Document Purpose

This PRD defines v1 of OUI Scout for its builder and for the downstream workflows (UX, architecture, stories) that consume it. It builds on the product brief (`briefs/brief-Mac Lookup-2026-10-09/brief.md`, status: ready); it does not restate the competitive or data research, which lives in that brief's addendum and in this document's `addendum.md`. Vocabulary is Glossary-anchored, features are grouped with globally numbered FRs, and inferences carry inline `[ASSUMPTION]` tags indexed in §12.

## 1. Vision

OUI Scout is a Chrome popup that turns a pasted MAC address into the three formats network engineers actually use — colon, plain, and Cisco-dot — and identifies the hardware Vendor from its OUI prefix. Conversion and lookup happen in one paste, fully offline, with nothing leaving the machine.

It exists because the alternatives are each incomplete: converter-only tools skip Vendor lookup, lookup-only tools depend on a remote service that sends the MAC to a third party, and the closest reference extension does exactly that despite a "no data collection" claim. OUI Scout bundles the OUI database inside the package, so there is no network request, no host permission, and no third-party dependency.

The bet is simple: a small, fast, private, native-feeling utility is enough to beat heavier and leakier alternatives. The edge is privacy, speed, and polish — not a technical moat.

## 2. Target User

### 2.1 Jobs To Be Done

- **Builder-as-user (primary):** move a MAC between systems quickly, in whatever shape each system wants, without reformatting by hand.
- **Identify the device:** know the manufacturer from a MAC on sight, without a second tool or a web lookup.
- **Protect the data:** analyze client and asset MAC addresses without exposing them (or my IP) to a third-party service.
- **Keep it out of the way:** a tool that opens fast, works offline (on a plane, on an isolated network), and looks like it belongs in Chrome.

### 2.2 Non-Users (v1)

- Firefox/Edge users — Chrome only in v1.
- Anyone wanting a broad network toolkit (subnet math, packet capture, IP tooling) — OUI Scout does one job.
- Anyone wanting live/always-current registry data — v1 ships a bundled, build-time snapshot.

### 2.3 Key User Journeys

- **UJ-1. Jared pastes a MAC from a switch CLI and gets everything at once.** Jared, a network engineer, copies a MAC out of `show mac address-table`, opens the OUI Scout popup, and pastes it. The popup instantly shows colon, plain, and Cisco-dot forms (all uppercase) plus the Vendor name, and offers a one-click copy on each format. He clicks the Cisco-dot copy, pastes it into the switch config, and closes the popup. All of it offline.
  - **Edge case:** the clipboard holds a screenshot or prose, not a MAC — see UJ-2.

- **UJ-2. Jared pastes junk and gets told, not misled.** He pastes text that isn't a valid MAC. The popup shows a short inline error and clears the outputs and Vendor — no partial or stale conversion left on screen. He fixes the paste and the results appear.
  - **Edge case:** a valid MAC whose OUI isn't in the database — the popup shows "Unknown vendor" with the queried prefix, distinguishing "looked up, no match" from "invalid input."

## 3. Glossary

- **MAC address** — a 48-bit hardware identifier, 12 hex digits. The unit OUI Scout accepts, normalizes, converts, and looks up.
- **OUI (Organizationally Unique Identifier)** — the 24/28/36-bit prefix of a MAC that identifies the assignee (Vendor). OUI Scout reads the prefix to resolve the Vendor.
- **Prefix** — the leading hex digits of a MAC used for the Vendor lookup (24 bits for MA-L, 28 for MA-M, 36 for MA-S).
- **Vendor** — the organization an OUI prefix is assigned to, as recorded in the bundled database.
- **Canonical value** — the normalized 12-hex-digit, uppercase representation all input forms reduce to before conversion and lookup.
- **Colon format** — `AA:BB:CC:DD:EE:FF`.
- **Plain format** — `AABBCCDDEEFF`.
- **Cisco-dot format** — `AABB.CCDD.EEFF` (also called dotted form).
- **OUI database** — the build-time snapshot of the IEEE MA-L, MA-M, and MA-S registries bundled inside the extension.
- **Popup** — the extension's only surface: the browser-action panel a user opens by clicking the toolbar icon.
- **Bundled** — shipped inside the extension package; no runtime fetch.

## 4. Features

### 4.1 MAC Input & Normalization

**Description:** A single paste field accepts a MAC in any common form, strips separators and whitespace, and normalizes it to the Canonical value. Input is case-insensitive; the Canonical value and all outputs are uppercase. Realizes UJ-1. Invalid input is handled distinctly (FR-2). Separator handling is specified in the addendum.

**Functional Requirements:**

#### FR-1: Accept and normalize any common MAC form

A user can paste a MAC in colon, hyphen, Cisco-dot, space-grouped, or bare-hex form and the system reduces it to the Canonical value. Realizes UJ-1.

**Consequences (testable):**
- `aa:bb:cc:dd:ee:ff`, `AA-BB-CC-DD-EE-FF`, `aabb.ccdd.eeff`, `AA BB CC DD EE FF`, and `AABBCCDDEEFF` all produce identical output.
- Leading/trailing whitespace and newlines are trimmed.
- Hex letters are accepted in either case; the Canonical value is uppercase.

#### FR-2: Reject invalid input clearly

A user pasting text that is not a valid MAC sees an inline error and no results. Realizes UJ-2.

**Consequences (testable):**
- Input that is not exactly 12 hex digits after separator/whitespace stripping produces a short inline message (e.g., "Not a valid MAC address").
- All output fields and the Vendor result are cleared or disabled while input is invalid — no stale or partial result remains.
- The field remains editable; correcting the input immediately restores results, with no reload.

**Out of Scope:** per-field guidance on *why* input failed (e.g., "11 digits"); a single error message is sufficient for v1.

### 4.2 Format Conversion & Copy

**Description:** On a valid MAC, the popup shows all three working formats simultaneously, each with a one-click copy control. Realizes UJ-1.

**Functional Requirements:**

#### FR-3: Display the three working formats

A user sees the Colon format, Plain format, and Cisco-dot format for the current MAC at the same time. Realizes UJ-1.

**Consequences (testable):**
- For Canonical value `AABBCCDDEEFF`, the popup shows `AA:BB:CC:DD:EE:FF`, `AABBCCDDEEFF`, and `AABB.CCDD.EEFF`, all uppercase.
- Formats appear immediately on a valid parse; there is no submit button or manual trigger.

#### FR-4: One-click copy per format

A user can copy any single format to the clipboard with one click. Realizes UJ-1.

**Consequences (testable):**
- Activating a format's copy control places exactly that format string on the clipboard.
- A brief confirmation is shown after copying and then clears. [ASSUMPTION: ~1.5 s confirmation, e.g., "Copied".]
- Copying requires no declared permission (performed under a user gesture).

### 4.3 Offline Vendor Lookup

**Description:** On a valid MAC, the popup resolves the Vendor from the OUI prefix using the Bundled OUI database (MA-L, MA-M, MA-S), entirely offline. An unmatched prefix produces a distinct "no match" state rather than a blank. Realizes UJ-1, UJ-2.

**Functional Requirements:**

#### FR-5: Resolve Vendor offline from the OUI prefix

A user can see the Vendor for a valid MAC without any network request. Realizes UJ-1.

**Consequences (testable):**
- For a MAC whose prefix exists in the OUI database, the Vendor name is displayed, together with the Prefix used.
- The lookup succeeds with the device offline and produces zero outbound network requests.
- Both /24, /28, and /36 prefixes resolve (MA-L, MA-M, MA-S coverage).

#### FR-6: Show a clear no-match state

A user pasting a valid MAC whose prefix is absent from the database sees an explicit no-match result. Realizes UJ-2.

**Consequences (testable):**
- The popup shows "Unknown vendor" and the Prefix queried.
- The state is visually and textually distinct from the invalid-input state (FR-2).

### 4.4 Appearance

**Description:** The popup follows the operating system / Chrome light-or-dark preference automatically and approximates native Chrome styling. Realizes UJ-1. There is no manual theme control in v1.

**Functional Requirements:**

#### FR-7: Follow the light/dark preference automatically

The popup renders in light or dark styling to match the current system preference, with no user action. Realizes UJ-1.

**Consequences (testable):**
- With the OS in dark mode, the popup renders dark; in light mode, light.
- Changing the OS preference while the popup is open updates it live.
- No manual toggle is present in the UI.

### 4.5 Chrome Web Store Readiness *(conditional — required only if published)*

**Description:** If OUI Scout is published, it must meet Chrome Web Store requirements without weakening the privacy stance. Conditional on the publish decision; a personal-use-only build does not require this feature.

**Functional Requirements:**

#### FR-8: Publish with a minimal-permission, no-collection posture

The extension can be published with no data-collection disclosure and no meaningful install-time permission warnings. Realizes UJ-1.

**Consequences (testable):**
- The manifest declares no host permissions and no runtime permission beyond what a user-gesture clipboard write requires.
- A store listing and privacy policy stating "no data collection" are present.
- A network trace during a full lookup and copy shows zero outbound requests.

**Notes:** `[NOTE FOR PM]` Publishing is gated on resolving OQ-1 (IEEE data licensing).

## 5. Non-Goals (Explicit)

- **Not a network toolkit.** No subnet math, IP tooling, packet features, or device scanning.
- **Not a service.** No account, no server, no API, no sync.
- **Not connected.** No telemetry, analytics, crash reporting, or "phone home" of any kind in v1.
- **Not always-current.** No runtime registry update or remote fallback; the database is a build-time snapshot.
- **Not multi-browser.** Chrome only in v1.
- **Not multi-format-extended.** No EUI-64, decimal, or binary in v1.
- **Not a Windows-output tool.** Hyphen/Windows form is not an *output*.

## 6. MVP Scope

### 6.1 In Scope

- Auto-normalizing input for colon, hyphen, Cisco-dot, space-grouped, and bare-hex forms (FR-1).
- Inline invalid-input handling (FR-2).
- Three output formats with per-format copy (FR-3, FR-4).
- Offline Vendor lookup from the Bundled OUI database, MA-L + MA-M + MA-S (FR-5).
- Explicit "Unknown vendor" no-match state (FR-6).
- Automatic light/dark appearance (FR-7).
- No permissions, no network requests, no data collection.

### 6.2 Out of Scope for MVP

- Hyphen/Windows as an output format — explicitly excluded by the user.
- EUI-64, decimal, and binary formats — deferred to v2 [ASSUMPTION].
- Firefox/Edge ports — deferred [ASSUMPTION].
- Manual theme toggle — deferred [ASSUMPTION].
- Runtime registry auto-update or API fallback.
- Chrome Web Store publication — *conditional*, only if the user decides to publish (then FR-8 applies). [NOTE FOR PM] This is the one scope item most likely to be revisited.
- Multicast/local-bit and device-type interpretation — vision-only, not v1.

## 7. Success Metrics

**Primary**

- **SM-1:** A valid MAC's normalization, all three conversions, and Vendor lookup render in well under a second with no network activity. Target: perceptibly instant (< 100 ms on a typical laptop [ASSUMPTION]). Validates FR-1, FR-3, FR-5.
- **SM-2:** 100% conversion correctness across all accepted input forms. Validates FR-1, FR-3.
- **SM-3 (personal):** The builder uses it at least weekly and stops reformatting MACs by hand or pasting them into a third-party lookup. Validates FR-3, FR-4, FR-5.

**Secondary**

- **SM-4:** 100% of valid MACs whose prefix is present in the bundled database resolve to a Vendor; no false "Unknown" on in-coverage prefixes. Validates FR-5.
- **SM-5 (if published):** Approved on the Chrome Web Store with a "no data collection" disclosure and no install-time permission warning. Validates FR-8.

**Counter-metrics (do not optimize)**

- **SM-C1:** Package size — do not grow coverage or features at the cost of a bloated download. Counterbalances SM-4.
- **SM-C2:** Vendor-match precision — do not trade accuracy for coverage; a wrong Vendor is worse than "Unknown". Counterbalances SM-4.
- **SM-C3:** Runtime network requests — this must stay at zero; never add telemetry to improve SM-1/SM-3. Counterbalances SM-1.

## 8. Cross-Cutting NFRs

- **Performance:** Parse + three conversions + Vendor lookup complete in < 100 ms; popup first paint feels instant. [ASSUMPTION: < 100 ms target.]
- **Privacy & Security:** Zero outbound network requests at runtime; no telemetry; the MAC, clipboard content, and results are never persisted or transmitted.
- **Offline:** All v1 features work with no network; nothing degrades without connectivity.
- **Correctness:** Deterministic, verified conversion across all accepted forms and all bundled registries.
- **Package size:** Bundled OUI database compressed to ≤ ~2 MB; total package ≤ ~3 MB, reviewed against store norms. [ASSUMPTION: ~3 MB budget.]
- **Platform:** Chrome desktop, Manifest V3; popup within the 800×600 limit.
- **Accessibility:** All controls keyboard-reachable; copy confirmations exposed to assistive tech. [ASSUMPTION.]
- **Maintainability:** Database refreshed via a repeatable build step; no runtime update path.

## 9. Constraints and Guardrails

**Privacy.** Privacy-by-construction is the product thesis. Any feature requiring a network call or broad permission is rejected by default. Third-party MAC-lookup APIs (`macvendors.com`, `maclookup.app`, etc.) are explicitly *not* used, despite being available and keyless — using them would leak the MAC and the requester's IP.

**Platform.** Chrome MV3 constraints shape the build: CSP forbids inline scripts (so CSS-first theming, not an inline anti-FOUC script); the browser exposes only light/dark, not accent colors; clipboard copy via `navigator.clipboard.writeText()` under a user gesture needs no permission.

**Data.** The OUI database is bundled from IEEE data; the redistribution question is carried as OQ-1 and is a launch-blocker only if published.

## 10. Aesthetic and Tone

Native, unobtrusive, fast. The popup should look like it belongs in Chrome — system colors, an accent that approximates Chrome blue, no marketing chrome, no onboarding, no settings screen. Microcopy is terse and functional: "Copied", "Unknown vendor", "Not a valid MAC address". No personality-driven copy. [ASSUMPTION: accent approximates Chrome blue since the browser does not expose it.]

## 11. Open Questions

- **OQ-1:** IEEE redistribution license — resolve before publishing. Options: adopt an openly licensed dataset, seek IEEE permission, or accept the risk with clear attribution. *(Launch-blocker if published; irrelevant for personal use.)*
- **OQ-2:** Refresh cadence for the bundled database, and who runs the build step.
- **OQ-3:** Whether to ship vendor-name-only indexes (smaller) versus full registry data to reduce package size.
- **OQ-4:** Trademark/name clearance for "OUI Scout" if the extension is ever commercialized (low risk while free).
- **OQ-5:** Whether a non-IEEE data source should supplement coverage.

## 12. Assumptions Index

- §4.2 / FR-4 — copy confirmation shown for ~1.5 s after copying.
- §7 / SM-1, §8 — performance target of < 100 ms; perceptibly instant.
- §8 — package size budget: database ≤ ~2 MB compressed, total ≤ ~3 MB.
- §8 — accessibility expectation: all controls keyboard-reachable; copy confirmations announced.
- §4.1 — outputs are uppercase; input is case-insensitive.
- §6.2 — EUI-64/decimal/binary, Firefox/Edge, and a manual theme toggle deferred to v2.
- §4.5 / §6.2 — Chrome Web Store readiness is conditional on a publish decision.
- §10 — accent approximates Chrome blue; no manual theme control.
