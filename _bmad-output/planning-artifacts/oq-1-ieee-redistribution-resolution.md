---
title: OQ-1 Resolution — IEEE OUI Redistribution License
status: final
created: 2026-10-14
updated: 2026-10-14
---

# OQ-1 Resolution: IEEE OUI Redistribution License

Resolves **OQ-1** (PRD §11) so that Story 3.2's publication gate — "OQ-1 is
resolved first" (`epics.md:538-541`) — is satisfied on record.

## Decision

**Option A — rely on IEEE's non-assertion of copyright.** The bundled OUI
dataset continues to be fetched directly from the IEEE Registration Authority
public listing at build time. No change to the build pipeline or the shipped
artifact.

- **Decided by:** Jared
- **Date:** 2026-10-14
- **Scope:** Chrome Web Store publication (FR-8). The personal-use build was
  never gated on OQ-1 and is unchanged.

## Original question

`prd.md` §11 / `prd.md:248`:

> **OQ-1:** IEEE redistribution license — resolve before publishing. Options:
> adopt an openly licensed dataset, seek IEEE permission, or accept the risk
> with clear attribution. *(Launch-blocker if published; irrelevant for
> personal use.)*

The prior working assumption (brief addendum, PRD addendum) was that IEEE
asserts copyright and prohibits redistributing significant portions without
permission.

## Evidence reviewed

| Source | Date | Position | Weight |
|---|---|---|---|
| Debian `ieee-data` package copyright file (shipped in Debian *main*) | 2024 | *"IEEE does not assert any copyright in the OUI Public Listing or attempt to restrict distribution of the listing in any way. The IEEE Registration Authority does, however, strongly encourage those who use the list to obtain it directly from IEEE (and to update it on a regular basis) to ensure the integrity of the information."* | **High** — Debian's legal review accepted the data as freely redistributable (`License: other / Public Domain`) |
| IEEE Registration Authority public listing page (`standards.ieee.org/products-programs/regauth/`) | current | Publishes the CSVs openly; carries no redistribution prohibition (only general site terms) | High |
| `macadress.com` downloads | 2026 | Releases a compiled IEEE registry under **CC0**; argues the underlying facts are not independently copyrightable | Medium |
| Informal report (Flameeyes blog) | 2012 | Reports IEEE told a developer the file could not be redistributed | Low — informal, 14 years old, not corroborated by current terms |

The strictest reading — that IEEE affirmatively forbids redistribution — is
**not supported by IEEE's current public terms** and appears to derive from
earlier, informal guidance about a different context.

## Consequences

**Pipeline / code:** none. `scripts/build-oui-data.ts` keeps downloading the
MA-L / MA-M / MA-S CSVs from `standards-oui.ieee.org`; `public/oui-data.json`
stays committed and shipped; there is no runtime network surface.

**Documents corrected (this change):**

- `prds/prd-Mac Lookup-2026-10-10/addendum.md` §"OUI data" — license paragraph
  rewritten to reflect IEEE's current non-assertion.
- `prds/prd-Mac Lookup-2026-10-10/prd.md` §9 (Data) and §11 (OQ-1) — OQ-1
  marked resolved; stale "asserts copyright" premise removed.

**Attribution:** not required under non-assertion. A one-line credit —
"OUI data from the IEEE Registration Authority public listing" — is carried
into the store listing (Story 3.2) as low-cost good practice.

**Personal use:** unaffected; OQ-1 was never a blocker for the private build.

## Residual risk and mitigation

| Risk | Likelihood | Mitigation |
|---|---|---|
| IEEE changes its stance and asserts copyright | Low | Re-fetch directly from IEEE keeps provenance clean; the dataset is factual registry data (threshold-of-originality argument is strong); attribution ready to add |
| A third party disputes the compilation | Low | We redistribute IEEE's own public listing, not a third party's compilation; CC0 re-publication precedent (Option B) remains a fallback if needed |

**Fallback (Option B):** if the stance changes, re-source the build from an
explicitly CC0-licensed compilation (vendored, not fetched at build) — an
isolated change to `scripts/build-oui-data.ts` only.

## Unblocks

- **Story 3.2** — publication gate cleared ("OQ-1 resolved first").
- **Epic 3** — proceed to Story 3.1 (packaging) with no licensing dependency.
