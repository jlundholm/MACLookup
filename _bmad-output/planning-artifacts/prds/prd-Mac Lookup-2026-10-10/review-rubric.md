# PRD Quality Review — OUI Scout (prd-Mac Lookup-2026-10-10)

## Overall verdict

This is a tight, honest, correctly-sized PRD for a solo hobby utility with an optional publish path. Its strongest assets are the testable "Consequences" attached to every FR (§4), a clear thesis (privacy/speed/polish, explicitly *not* a moat, §1), and disciplined scope honesty (§5–§6). The main risks are minor and mechanical: one Assumptions Index entry has no inline tag to round-trip (§12 vs §4.1), and a couple of traceability links to UJ-1 are padded. None of these block downstream consumption; the PRD is ready to feed UX, architecture, and stories.

## Decision-readiness — strong

The load-bearing decision — publish or not — is surfaced as a decision rather than buried: FR-8 is explicitly marked "conditional — required only if published" (§4.5), repeated in §6.2, and flagged "the one scope item most likely to be revisited" ([NOTE FOR PM], §6.2). That is the right way to hold an open decision that belongs to the solo owner. Trade-offs are named with what's surrendered, not just what's chosen: SM-C1 (package size) counterbalances coverage, SM-C2 prefers "Unknown" over a wrong Vendor (§7), and OQ-1 states the IEEE licensing trade-off plainly with three concrete options (adopt an open dataset / seek permission / accept risk with attribution). The Vision states the bet and its ceiling honestly — "The edge is privacy, speed, and polish — not a technical moat" (§1) — which is exactly the kind of anti-theater candor a reviewer can act on.

The Open Questions are genuinely open, not rhetorical. OQ-2 (refresh cadence / who runs the build) and OQ-3 (name-only index vs full rows) are real choices left to the builder; OQ-3 even has its size math worked in the addendum (addendum "Packaging and size math"), which is the right split between PRD and technical detail. No decisions are buried as "considerations."

### Findings
- **[low]** OQ-3 is half-answered elsewhere (§11 vs addendum "Packaging and size math") — the addendum already computes the name-only index at ~420 KB gzip and frames the trade-off ("less per-prefix metadata"), so the PRD could either commit or state the decision criterion. *Fix:* add one line to OQ-3 naming the trigger for choosing name-only ("decide if total package exceeds the ~3 MB budget"), or leave as-is and accept slight duplication.

## Substance over theater — strong

No furniture. There is exactly one persona, "Builder-as-user (primary)" (§2.1), and it maps directly to the author — no persona invented to pad the section, and §2.2 Non-Users does real scoping work (Firefox/Edge, broad toolkit, always-current data). Innovation claims are modest and evidence-backed: the "gap exploited" is a concrete delta from a teardown of named competitors (addendum "Competitive teardown"), and the PRD explicitly disclaims novelty. NFRs carry product-specific thresholds rather than boilerplate — < 100 ms (§8, SM-1), database ≤ ~2 MB / package ≤ ~3 MB (§8), zero outbound requests (§8, FR-5). The Vision could not be swapped into another PRD in this category: it names the three conversion formats, the offline OUI bundle, and the no-host-permission posture (§1).

The one soft spot is the Accessibility NFR (§8), which is the only adjective-level line among otherwise bounded NFRs ("all controls keyboard-reachable; copy confirmations exposed to assistive tech"). It is flagged `[ASSUMPTION]` and this is a solo utility, so it does not rise to theater — but it is the least earned line in the document.

### Findings
- **[low]** Accessibility NFR lacks a bound (§8) — "keyboard-reachable" and "exposed to assistive tech" have no verifiable condition, unlike every other NFR in the section. *Fix:* either add one testable check (e.g., "every control focusable via Tab in document order; copy confirmation is an ARIA live region") or state plainly that a11y is best-effort for v1.

## Strategic coherence — strong

The PRD has a thesis and the features follow from it: privacy-by-construction drives bundling the OUI database, declaring no host permissions, and rejecting the keyless-but-leaky APIs (§9, addendum "OUI lookup APIs (rejected alternatives)"). Prioritization is principled, not "easy first": conversion + lookup are the core job (§4.1–§4.3), appearance (§4.4) and store-readiness (§4.5) are ordered after, and store-readiness is conditional. The MVP scope kind is coherent — a small problem-solving utility — and the scope logic matches (one job, done well; §5 Non-Goals enforce it).

Success Metrics validate the thesis rather than measuring activity: SM-1 (latency + zero network), SM-2/SM-4 (correctness), SM-3 is the only usage metric and is framed personally and behaviorally ("stops reformatting by hand or pasting into a third-party lookup") — appropriate for a solo tool, and the tell for metric theater is avoided because SM-3 measures the thesis (replacing leaky alternatives), not vanity. Counter-metrics are present and pointed (SM-C1–C3), each naming the SM it counterbalances.

### Findings
- **[low]** FR-8 "Realizes UJ-1" is a padded traceability link (§4.5) — publishing to the store does not realize the "paste a MAC, get results" journey. *Fix:* drop the "Realizes UJ-1" from FR-8 (and consider whether FR-7 needs it); the Chrome Web Store feature is a distribution concern, not a user journey.

## Done-ness clarity — strong

Every FR carries at least one testable consequence, and they are specific: FR-1 enumerates five exact input forms that must "produce identical output" (line 74); FR-2 bounds validity to "exactly 12 hex digits after stripping" and requires clearing stale results (lines 83–85); FR-3 names `AABBCCDDEEFF` → the three exact strings (line 100); FR-5 requires the Vendor plus the Prefix and asserts "zero outbound network requests" (lines 123–125); FR-8 makes publish-readiness verifiable via a network trace (line 163). I found no instance of the banned vocabulary — no "gracefully," "reasonable performance," or "user-friendly" anywhere in the FRs. Non-functional bounds are numeric (100 ms, 2 MB, 3 MB, 800×600). This is the dimension downstream story creation will lean on hardest, and it holds.

### Findings
- **[low]** FR-4 confirmation timing lives only in an assumption (§4.2 / FR-4) — "a brief confirmation is shown after copying and then clears. [ASSUMPTION: ~1.5 s]" (line 109). The behavior (show-then-clear) is testable; the duration is a soft number. *Fix:* acceptable as-is for v1; if it matters, promote ~1.5 s to a stated requirement so the consequence is fully deterministic.

## Scope honesty — adequate

Omissions are explicit rather than inferred. §5 Non-Goals is substantive (not a service, not connected, not always-current, not multi-browser, not EUI-64/decimal/binary, hyphen is not an *output*), and §6.2 Out of Scope for MVP repeats the deferrals with inline `[ASSUMPTION]` tags. The conditional publish path is de-scoped honestly and repeatedly (§4.5, §6.2, §12). Open-item density — 5 OQs + ~8 assumptions + 2 `[NOTE FOR PM]` callouts — is appropriate for this stakes level and would be a blocker only if the PRD were green-lit to build blind; it is not, and the OQs are mostly publish-gated rather than v1-gated.

The gap is in Assumptions Index hygiene, not scope honesty: the entry "§4.1 — outputs are uppercase; input is case-insensitive" appears in §12 but the corresponding FR-1 consequence states it as a settled requirement with no inline `[ASSUMPTION]` tag (lines 76, 255). That is either an assumption that should be tagged inline or a requirement that should not be listed as an assumption — the round-trip is broken. `[NON-GOAL for MVP]` callouts are not used, but §5/§6.2 carry that weight, so their absence is not a defect.

### Findings
- **[medium]** Assumptions Index round-trip breaks for §4.1 (§12 line 255 vs FR-1 lines 74–76) — indexed as an assumption but not tagged inline, and arguably a decision, not an assumption. *Fix:* either add `[ASSUMPTION: outputs uppercase; input case-insensitive]` at FR-1 or remove the §4.1 entry from §12.
- **[low]** §6.2 defers three items with a single shared structure (lines 192–194) but the index collapses them into one line (§12 line 256) — the mapping is inferable, not exact. *Fix:* split into three index lines or keep and accept the summary.

## Downstream usability — strong

The document is built for clean source-extraction. A Glossary (§3) anchors every domain noun, and usage is consistent across sections: "Canonical value," "Cisco-dot format," "Prefix," "Vendor," "OUI database," "Popup" read identically in FRs, UJs, and SM definitions. IDs are contiguous and unique — FR-1…FR-8, UJ-1/UJ-2, SM-1…SM-5 plus SM-C1…C3, OQ-1…OQ-5. Cross-references resolve and are by ID, not "see above": FR-2 is cited from §4.1 (line 65), FR-8 from §6.2 (line 196), and the FR/SM validation links are explicit ("Validates FR-1, FR-3, FR-5"). Each UJ has a named protagonist carrying context inline — UJ-1/UJ-2 both follow Jared with the switch CLI and clipboard state included (§2.3). The PRD states its downstream role up front (§0), so the traceability expectation is deliberate rather than accidental.

### Findings
- **[low]** Weak "Realizes UJ-…" links (§4.4 FR-7, §4.5 FR-8 both claim UJ-1) — see Strategic coherence. Downstream story creation reading these will inherit a stretch mapping. *Fix:* trim journey claims to features that actually realize a journey.

## Shape fit — strong

The shape matches the product. This is a hobby/solo, personal-use utility with an optional free publish; the rubric says rigor-light but the substance bar still applies, and that is what this delivers. The formal apparatus (Glossary, globally-numbered FRs, consequence lists, SM definitions) is applied with discipline rather than ceremony, and it is justified because the PRD declares itself chain-top — it feeds UX, architecture, and stories (§0). UJ density is deliberately low (two journeys, both the same operator), so there is no over-formalization problem for a single-operator tool. The conditional-publish handling is the standout shape decision: instead of pretending to be either a private script or a store product, §4.5 gates the store-readiness feature on a decision the owner has not made, which is exactly right for "personal use with an optional future free publish." No under-formalization: a consumer-facing extension is not the case here, and the two UJs are load-bearing for the core paste-and-convert flow they describe.

### Findings
- (none — dimension holds)

## Mechanical notes

- **Assumptions Index round-trip:** §4.1 entry has no inline tag (see Scope honesty, medium). All other index entries map: §4.2/FR-4, §7/SM-1+§8, §8 (size), §8 (a11y), §6.2, §4.5/§6.2, §10. The §6.2 three-way deferral is collapsed to one line (low).
- **Glossary drift:** none material. "Cisco-dot format" is defined with the synonym "dotted form" (§3) but the synonym is never used elsewhere — harmless. Case-consistent use of "Vendor," "Prefix," "Bundled."
- **ID continuity:** FR-1…FR-8, UJ-1…UJ-2, SM-1…SM-5, SM-C1…C3, OQ-1…OQ-5 — contiguous, unique, no gaps or duplicates.
- **Cross-references:** all resolve (FR-2, FR-8, SM↔FR mappings). No dangling "see above" references.
- **UJ protagonists:** both UJs name Jared and carry context inline; no floating UJs.
- **Required sections:** present and appropriate for the agreed stakes — Document Purpose, Vision, Target User, Glossary, Features, Non-Goals, MVP Scope, Success Metrics, NFRs, Constraints, Aesthetic/Tone, Open Questions, Assumptions Index.
