# Spine Pair Review — Mac Lookup

## Overall verdict

Structurally sound and mechanically clean: every token reference resolves, both UJs have complete flows with named protagonist / numbered steps / climax / failure, component names are identical across both spines, and the stated contrast targets hold under computation. Remaining issues are low-severity polish — a mock-vs-spine radius divergence, paraphrased UJ titles, example-voice meta-commentary, and a duplicated conflict disclaimer — none of which block a downstream consumer. Safe to hand to architecture / story-dev after a light pass.

## 1. Flow coverage — strong

Extracted the two UJs from the PRD (`§2.3`, UJ-1, UJ-2) and matched against `EXPERIENCE.md.Key Flows`. Both are present with named protagonist (Jared), numbered steps, an explicit **Climax** beat, and a failure path.

### Findings
- **[low]** Flow 1 places its failure path (clipboard denied) *after* the climax and after an "He pastes into the switch config and closes the popup" terminal step, so it reads as a post-script rather than an alternate branch (`EXPERIENCE.md:115–116`). *Fix:* label it "Failure (alternate):" or move it before the climax.
- **[low]** Flow 1 realizes FR-3 and FR-5 but cites neither; only UJ-1 is referenced, so flow→FR traceability is partial (`EXPERIENCE.md:109–116`). *Fix:* add FR-3 / FR-5 citations alongside UJ-1.

## 2. Token completeness — strong

Extracted the 28 frontmatter `colors` (all light+dark pairs, all six-digit hex), 8 `typography` roles, 4 `rounded`, 4 `spacing`, and 6 `components` entries, plus every `{path.to.token}` used in prose. Every reference resolves to a defined token. No color token lacks hex; every load-bearing color has a light/dark pair. Contrast targets are stated (`DESIGN.md:180`) and verified by computation: found 4.80:1, miss 5.80:1, invalid 4.85:1 (light), all ≥ AA 4.5:1.

### Findings
- **[low]** Three component entries are free-text compound strings rather than resolvable tokens: `result-banner.layout`, `copy-button.hoverForeground` (pipe-delimited alternates), and `copy-button.copiedState`/`disabledState` (`DESIGN.md:119,152–154`). A consumer cannot mechanically extract them the way they can `{colors.*}`. *Fix:* split into discrete sub-tokens (e.g. `hover-foreground-found`, `hover-foreground-miss`, …).

## 3. Component coverage — strong

Extracted every component name used anywhere. The set is identical and consistent across all four locations — `DESIGN.md` frontmatter `components`, `DESIGN.md.Components`, `EXPERIENCE.md.Component Patterns`, and the prose references in both spines: **Popup shell, MAC input, Result banner, Status lamp, Format row, Copy button** (6/6). Each has a real visual spec (DESIGN) and a real behavioral rule (EXPERIENCE), not one-word descriptions.

### Findings
- **[low]** "Wordmark" is a named element in `EXPERIENCE.md` IA (`:28`, vertical order) and has a `{typography.wordmark}` token, but it has no Components row in either spine (`DESIGN.md:213–222`, `EXPERIENCE.md:51–58`). *Fix:* either add a one-line row or explicitly declare it a text element, not a component.

## 4. State coverage — strong

Walked the single IA surface (Popup). Applicable states — empty/cold-open, found, miss, invalid, correcting, copy-confirmation, copy-failure, dark/light, offline — are all covered as rows in `EXPERIENCE.md.State Patterns` (`:62–72`). Permission-denied and general network error are correctly N/A (no permissions, no network), and this is stated.

### Findings
- **[low]** Focus is treated as a first-class state in Interaction Primitives and Accessibility but has no State Patterns row (`EXPERIENCE.md:80, 85, 91`). If consumers read State Patterns as the state contract, keyboard-focus appearance is under-specified there. *Fix:* add a Focus row.

## 5. Visual reference coverage — strong

Enumerated `mockups/` (`status-popup.html`), `wireframes/` (does not exist), `imports/` (empty). The single mock is linked inline in both spines and each states what it illustrates (`DESIGN.md:157`; `EXPERIENCE.md:30`). No orphans; no unspecific references.

### Findings
- **[low]** "Spines win on conflict" appears twice — once per spine (`DESIGN.md:157` and `EXPERIENCE.md:30`). The rubric wants it stated once. *Fix:* keep it in `EXPERIENCE.md` only.
- **[low]** The promoted mock diverges from the spine's shape tokens: `.banner` radius 9px vs `{rounded.lg}` 10px, `.row` radius 7px vs `{rounded.md}` 8px (`mockups/status-popup.html:87,97` vs `DESIGN.md:117,141`). Spine wins, but the mismatch invites copy-paste drift. *Fix:* align the mock radii or annotate the divergence.

## 6. Bloat & overspecification — adequate

DESIGN.md prose carries editorial voice (permitted). No source restatement of personas/FRs/scope was found; the spines inherit by reference. Pixel specs are confined to component anatomy, matching the examples' allowance.

### Findings
- **[low]** `EXPERIENCE.md` opens with an example-templated meta-blockquote ("Demonstrates: an inherited UI system … where IA closure is trivial but state coverage is not") (`:14`) — essay-voice narrative untied to any decision, in a spine whose prose should not carry it. *Fix:* drop it or fold the substance into Foundation.

## 7. Inheritance discipline — adequate

Both spines' `sources` frontmatter resolves to real files (PRD, addendum, brief), verbatim paths including the space in `Mac Lookup`. Component names are identical across every section of both files. EXPERIENCE's sole token reference (`{colors.focus-ring}`) resolves to a DESIGN token by name. Glossary is inherited by reference (no local glossary), consistent with the "inherit, don't duplicate" rule.

### Findings
- **[medium]** UJ titles are paraphrased, not verbatim: PRD UJ-1 is "Jared pastes a MAC from a switch CLI and gets everything at once" but `EXPERIENCE.md:109` renders it "UJ-1: Jared, network engineer, mid-config"; same for UJ-2 (`:118`). IDs are preserved so traceability survives, but the verbatim-name rule is broken. *Fix:* mirror the source titles after the ID.
- **[low]** Vocabulary drift with the source glossary: the PRD term **"Canonical value"** (`§3`) never appears in EXPERIENCE (it says "normalizes" / "valid value"), and DESIGN says "OUI prefix" where the PRD defines both "Prefix" and "OUI." *Fix:* use glossary terms where they apply.
- **[low]** The header blockquote calls Chrome's colors "an inherited UI system," while Foundation says "No external UI system is named" (`EXPERIENCE.md:14` vs `:18`). *Fix:* reconcile the wording.

## 8. Shape fit — strong

`DESIGN.md` sections are all present in canonical order: Brand & Style → Colors → Typography → Layout & Spacing → Elevation & Depth → Shapes → Components → Do's and Don'ts. `EXPERIENCE.md` carries every required default (Foundation, IA, Voice and Tone, Component Patterns, State Patterns, Interaction Primitives, Accessibility Floor, Key Flows). Inspiration & Anti-patterns is present and correctly triggered (sources/log show reference products and explicit rejects). Responsive & Platform is omitted and defensible (single surface; log confirms). No invented sections.

### Findings
- None.

## Mechanical notes

- **Cross-refs:** all `{path.to.token}` references in both spines resolve; no broken refs.
- **Frontmatter:** both spines carry `name`, `status`, `created`, `updated`, `sources`. `status: draft` on both (finalize not yet run) — expected for a validate pass.
- **Contrast:** DESIGN's AA claim verified by computation (light triads 4.80–5.85:1); status is also text-labeled, so color is never the sole signal (WCAG 1.4.1 satisfied).
- **Naming:** component names identical across DESIGN frontmatter/Components and EXPERIENCE Component Patterns; no drift found.
- **Mock artifact:** `status-popup.html` is a promoted *direction* artifact — it still contains stage chrome (browser frame, "Direction 4 of 4" header) that is not part of the product surface; harmless as a reference but should not be read as a spec.
- **Mermaid:** none present; nothing to validate.
- **FR citations observed:** FR-1, FR-2, FR-4, FR-6, FR-7 referenced; FR-3 and FR-5 unrealized by explicit citation (covered behaviorally).
