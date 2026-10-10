# Validation Report — OUI Scout (Mac Lookup)

- **DESIGN.md:** `_bmad-output/planning-artifacts/ux-designs/ux-Mac Lookup-2026-10-10/DESIGN.md`
- **EXPERIENCE.md:** `_bmad-output/planning-artifacts/ux-designs/ux-Mac Lookup-2026-10-10/EXPERIENCE.md`
- **Run at:** 2026-10-10

## Overall verdict

Structurally sound and mechanically clean: every token reference resolves, both UJs have complete flows with named protagonist / numbered steps / climax / failure, component names are identical across both spines, and the stated contrast targets hold under computation. Remaining issues are low-severity polish — a mock-vs-spine radius divergence, paraphrased UJ titles, example-voice meta-commentary, and a duplicated conflict disclaimer — none of which block a downstream consumer.

All eleven findings were applied during the Finalize polish pass (structural then prose editorial review), so this report is a pre-polish snapshot; the spine pair ships with every finding below resolved.

## Category verdicts

- Flow coverage — strong
- Token completeness — strong
- Component coverage — strong
- State coverage — strong
- Visual reference coverage — strong
- Bloat & overspecification — adequate
- Inheritance discipline — adequate
- Shape fit — strong

## Findings by severity

### Critical (0)

None.

### High (0)

None.

### Medium (1)

**Inheritance discipline** — UJ titles paraphrased, not verbatim (EXPERIENCE.md:109,118)
PRD UJ-1 is "Jared pastes a MAC from a switch CLI and gets everything at once"; the spine rendered a paraphrase. IDs were preserved so traceability survived, but the verbatim-name rule was broken.
Fix: Mirror the source titles after the ID. _Resolved._

### Low (10)

**Flow coverage** — Flow 1 failure path placed after the climax/terminal step (EXPERIENCE.md:115–116)
The clipboard-denied failure read as a post-script rather than an alternate branch.
Fix: Label it "Failure (alternate)" or move it before the climax. _Resolved._

**Flow coverage** — Flow 1 cites only UJ-1, not the FRs it realizes (EXPERIENCE.md:109–116)
Flow realizes FR-3 and FR-5 but cited neither, so flow→FR traceability was partial.
Fix: Add FR-3 / FR-5 citations alongside UJ-1. _Resolved._

**Token completeness** — Three component entries were free-text compound strings, not resolvable tokens (DESIGN.md:119,152–154)
`result-banner.layout`, `copy-button.hoverForeground`, and `copiedState`/`disabledState` could not be mechanically extracted.
Fix: Split into discrete sub-tokens. _Resolved._

**Component coverage** — "Wordmark" named in IA and given a typography token, but no Components row (DESIGN.md:213–222, EXPERIENCE.md:51–58)
A named element without a component spec in either spine.
Fix: Add a one-line row or declare it a text element, not a component. _Resolved._

**State coverage** — Focus treated as first-class but had no State Patterns row (EXPERIENCE.md:80,85,91)
Keyboard-focus appearance was under-specified where consumers read State Patterns as the state contract.
Fix: Add a Focus row. _Resolved._

**Visual reference coverage** — "Spines win on conflict" appeared twice, once per spine (DESIGN.md:157, EXPERIENCE.md:30)
The rubric wants the disclaimer stated once.
Fix: Keep it in EXPERIENCE.md only. _Resolved._

**Visual reference coverage** — Promoted mock diverged from the spine's shape tokens (mockups/status-popup.html:87,97 vs DESIGN.md:117,141)
Banner radius 9px vs `{rounded.lg}` 10px; row radius 7px vs `{rounded.md}` 8px — invites copy-paste drift.
Fix: Align the mock radii or annotate the divergence. _Resolved._

**Bloat & overspecification** — EXPERIENCE.md opened with an example-templated meta-blockquote (EXPERIENCE.md:14)
Essay-voice narrative untied to any decision, in a spine whose prose should not carry it.
Fix: Drop it or fold the substance into Foundation. _Resolved._

**Inheritance discipline** — Vocabulary drift with the source glossary (EXPERIENCE.md; DESIGN.md)
PRD term "Canonical value" never appeared in EXPERIENCE; DESIGN said "OUI prefix" where the PRD defines "Prefix" and "OUI" separately.
Fix: Use glossary terms where they apply. _Resolved._

**Inheritance discipline** — Header blockquote contradicted Foundation on UI-system inheritance (EXPERIENCE.md:14 vs :18)
The blockquote called Chrome's colors "an inherited UI system," while Foundation said "No external UI system is named."
Fix: Reconcile the wording. _Resolved._

## Mechanical notes

- All `{path.to.token}` references resolve; no broken refs.
- `status: draft` at review time; both spines set to `final` at close.
- Contrast verified: light triads 4.80–5.85:1 (≥ AA 4.5:1); status is also text-labeled (WCAG 1.4.1 satisfied).
- Component names identical across DESIGN frontmatter/Components and EXPERIENCE Component Patterns.
- `status-popup.html` retains stage chrome (browser frame, "Direction" header) — annotated in-file as reference, not spec.
- No Mermaid diagrams.

## Reviewer files

- `review-rubric.md`
