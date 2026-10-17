---
baseline_commit: 6c31add4b7e75854262a5ed85274bd9b8a53d1c8
---

# Story 3.2: Publish a store listing and privacy policy with a "no data collection" disclosure

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the builder,
I want a store listing and privacy policy stating no data collection,
so that publication meets Chrome Web Store requirements without weakening the privacy stance.

## Acceptance Criteria

1. **Given** the submission,
   **When** the store listing and privacy policy are prepared,
   **Then** both state "no data collection" and the listing accurately reflects the single-purpose (MAC converter + OUI vendor lookup), offline, no-network behavior (FR8).

2. **Given** the shipped manifest,
   **When** it is inspected,
   **Then** it declares no host permissions and no runtime permission beyond what a user-gesture clipboard write requires (FR8).

3. **Given** the store listing assets,
   **When** the listing is prepared in the developer dashboard,
   **Then** it includes at least one screenshot of the shipped popup (light and dark preferred) captured from the **built** `dist/` — not the dev harness — and no image or claim that misrepresents the extension's single purpose (FR8; CWS "Supplying Images" / listing requirements).

4. **Given** the developer dashboard's Privacy tab,
   **When** the privacy fields are completed,
   **Then** the single-purpose statement names MAC conversion + offline OUI vendor lookup, the remote-code question is answered **No** (true by construction — no remote code, no eval; enforced by the Story 1.8 guard suite and verified in Story 3.3), and the data-collection declaration is **no data collected**, consistent with the privacy policy (FR8).

5. **Given** the open licensing question,
   **When** publication is attempted,
   **Then** OQ-1 (IEEE redistribution license) is resolved first (e.g., an openly licensed dataset, IEEE permission, or accepted risk with clear attribution),
   **And** publication proceeds only after that resolution (PRD §11).

## Tasks / Subtasks

- [x] Task 1: Draft the store listing copy — `store/listing.md` (AC: 1, 3)
  - [x] Create `store/listing.md` as the single source of truth for every dashboard text field. Structure it with one clearly-labeled section per field so Jared can copy-paste each block verbatim:
    - **Title** (≤ 45 characters): `OUI Scout — MAC Vendor Lookup` (29 chars). Name stays "OUI Scout" — the manifest name; do not invent a second product name.
    - **Summary** (≤ 132 characters): one terse sentence carrying the two jobs (format conversion + offline vendor lookup) and the privacy edge. Must fit the same 132-char bound the packaging lint enforces on the manifest description (Story 3.1 Critical Decision 9) — the summary and manifest description should be consistent in claim, not necessarily byte-identical.
    - **Detailed description**: markdown-formatted copy adapted from `README.md` (Why it exists / Privacy posture / Features). Rules: no keyword spam (no irrelevant keyword lists, no repetition of the same keyword > 5 times — CWS Listing Requirements); no unattributed testimonials; no claims of Google affiliation, Editors' Choice, or rankings; no comparison naming a competitor's product disparagingly (README's "closest reference extension" sentence may be generalized to "other lookup tools send the MAC to a remote service" without naming anyone); no personality/emoji/exclamation (PRD §10 tone). Include: single purpose (MAC format conversion + offline OUI vendor lookup), the three output formats, longest-prefix MA-L/MA-M/MA-S lookup, fully offline / zero permissions / no data collection, light/dark + keyboard accessibility.
    - **Category**: Tools.
    - **Language**: English.
    - **Attribution line** (OQ-1 consequence, `oq-1-ieee-redistribution-resolution.md:64-66`): "OUI data from the IEEE Registration Authority public listing." Carry it into both the detailed description and the privacy policy.
  - [x] Cross-check every factual claim in the listing against the shipped behavior (README Features list is the verified inventory). Nothing may promise a feature the popup does not have (single-purpose + listing-accuracy policies).
- [x] Task 2: Draft the privacy policy — `store/privacy-policy.md` (AC: 1, 4)
  - [x] Create `store/privacy-policy.md`: short, plain-language, stating unambiguously that OUI Scout **collects no data** — no collection, no use, no sharing, no transmission; no network requests at runtime; no telemetry, analytics, or crash reporting; no cookies, storage, or accounts; the pasted MAC and results live only in the popup's memory and vanish when it closes; clipboard writes happen locally under a user gesture and nothing is sent anywhere.
  - [x] State the single purpose in the policy's first paragraph (MAC conversion + offline OUI vendor lookup) so it is consistent with the dashboard single-purpose statement (AC4) — CWS removes extensions whose privacy fields contradict the policy or the behavior.
  - [x] Include the IEEE attribution line from Task 1 (the dataset is bundled at build time; the only network activity in the project is the developer's own build-time fetch, which never ships and is not user data).
  - [x] End with a "Changes" note ("If this policy ever changes, the updated version will be published here") and no contact-form theater — a GitHub repo link is sufficient support for a free utility.
  - [x] Note in the file header (HTML comment or a short "Source" line) that this file is the source of truth and the public URL is filled in the dashboard by Jared.
- [x] Task 3: Capture listing screenshots from the built `dist/` — `store/screenshots/` (AC: 3)
  - [x] Run `npm run build` and load `dist/` unpacked (never `npm run dev` — CRXJS dev augments `dist/` with a service worker; README verification caveat). Verify the loaded extension is version `0.0.10` from the production manifest.
  - [x] Capture **two** screenshots of the shipped popup in the **found** state with a real MAC pasted (`f0:18:98:00:00:00` → Apple, Inc. — the pinned fixture): one light, one dark (toggle the OS preference; the popup follows live, FR7). The popup must show the populated result banner + three filled format rows — the store's first impression is the product working, not an empty field.
  - [x] Compose each capture onto a neutral canvas at **1280×800 px** (the CWS screenshot size; the popup itself is only 360 px wide — a bare 360-px image is technically rejected-adjacent and looks broken). Center the popup on a flat light-gray field for the light shot and a flat dark-gray field for the dark shot; no fake browser chrome, no added marketing text, no arrows callouts, no effects. Save as `store/screenshots/<theme>-1280x800_<state>.png` (committed: `light-1280x800_valid.png`, `dark-1280x800_valid.png`, `light-1280x800_unknown.png`, `dark-1280x800_invalid.png`).
  - [x] If a compositing tool is unavailable on the machine, capture the raw popup windows, save them uncropped, and record in Completion Notes exactly what Jared must composite — do not fake, upscale, or ship a misleading image (listing-accuracy policy; AC3).
  - [x] Do **not** add promo tiles (440×280 / 1400×560) or a YouTube link — optional in the dashboard; out of scope here.
- [x] Task 4: Walk Jared through the developer-dashboard entry (human step — prepare, don't fake) (AC: 1, 3, 4)
  - [x] Produce a short dashboard checklist inside `store/listing.md` (a "Dashboard entry order" section) covering, in order: Store listing tab (icon — reuse `public/icons/icon-128.png`, already 128×128; title; summary; detailed description; category Tools; language English; both screenshots); Privacy practices tab (single-purpose statement — verbatim the sentence below; remote code **No**; data collection **No data collected** / none of the category checkboxes; privacy policy URL — the public URL of `store/privacy-policy.md`); Distribution tab (public visibility is Jared's call; unlisted-during-review is the default).
  - [x] The **single-purpose statement** (use this exact wording, also reused in Task 2's policy): "Converts pasted MAC addresses into Plain, Colon, Cisco-dot, and Hyphen formats and identifies the hardware vendor from a bundled IEEE OUI database — entirely offline, with no network access and no data collection." (Wording updated to the four-format order for Story 4.1's Hyphen row; both `store/` docs already carry it.)
  - [x] The remote-code answer is **No** and must never be marked Yes: the extension ships no remote code, no eval; the Story 1.8 guard suite enforces this and Story 3.3 re-verifies on the final build (AC4).
  - [x] Upload `release/oui-scout-0.0.10.zip` (the artifact Story 3.1 produced and Jared already load-tested). If the zip is missing, rebuild with `npm run build && npm run zip` and re-verify with `unzip -l` (manifest.json at archive root). *(Post-review update 2026-10-16: the submitted build is Story 4.1's `release/oui-scout-0.0.11.zip` — 0.0.11 submitted, pending review.)*
- [x] Task 5: Housekeeping and gates (AC: 1; all)
  - [x] `.gitignore`: ensure `store/screenshots/*.png` is **NOT** ignored — screenshots are committed listing source assets (like `public/icons/`), not build output. Conversely, do not un-ignore `dist/` or `release/`.
  - [x] `README.md`: update the **Status** section (currently "Private, unpublished v1. Not yet submitted to the Chrome Web Store.") to reflect reality after Jared submits — e.g., "Submitted to the Chrome Web Store (version 0.0.10), pending review." Only change this line once Jared has actually submitted; if the story halts before submission, leave it.
  - [x] `README.md`: add a one-line pointer under **Packaging for the Chrome Web Store** that listing copy and the privacy policy live in `store/`.
  - [x] Run the gates: `npm run typecheck`, `npm test`, `npm run build` — all must stay green. This story changes **zero** runtime code; any diff under `src/` is a defect (same reviewable claim as Story 3.1).
  - [x] **No manifest version bump** (see Critical Decision 1): `manifest.json` stays `0.0.10`; the uploaded zip stays `oui-scout-0.0.10.zip`.

### Review Findings

- [x] [Review][Decision → resolved] Screenshot dimensions 1200×800 vs specified 1280×800 — **Jared's call: keep the 1280×800 naming/spec; he will commit the correct 1280×800 images** (the repo currently holds 1200×800 placeholders under the 1280×800 names). No agent action; resolves once the correct assets land. The remaining doc-reference sync is tracked as a patch below.
- [x] [Review][Decision → resolved] README Status claims publication, which the story scoped out — **Jared's call: keep the "Published …" wording** (accurate). Resolved as a patch: record the spec-scope deviation in the story's Dev Agent Record rather than reverting the line.
- [x] [Review][Patch] Screenshot references point at files that were never committed — `light-1280x800.png` / `dark-1280x800.png` do not exist; the committed files carry `_valid`/`_unknown`/`_invalid` suffixes [store/listing.md:67,83; story file Behavior–Contract table:112-113]
- [x] [Review][Patch] Summary length label is wrong — `store/listing.md` labels the block "(127 chars)" but the string is 132 chars (programmatically verified; still within the CWS 132 limit) [store/listing.md:14]
- [x] [Review][Patch] Privacy-policy single-purpose sentence is not the mandated verbatim wording — policy paraphrases and drops "…with no network access and no data collection"; Task 4 mandates the exact sentence be reused in the policy [store/privacy-policy.md:7-9]
- [x] [Review][Patch] IEEE attribution line not carried into the policy as the mandated exact line — Task 1/AC8 requires the literal line "OUI data from the IEEE Registration Authority public listing."; the policy substitutes a paraphrase [store/privacy-policy.md:37-38]
- [x] [Review][Patch] Stale sprint-status `# history` comment — omits 2-2, 2-3, 3-1, and 3-2 entries [sprint-status.yaml:48]

_(8 additional candidate findings dismissed as noise: "zero permissions vs clipboard hedge" (manifest truly declares none), privacy-policy-URL placeholder (intentional per Task 2), missing policy effective-date/contact (spec says minimal, no contact theater), policy's reference to the source repo (statement is true, no public-access claim), markdown headings in description (spec calls the field markdown-ish), empty Review Findings placeholder (this workflow fills it), "unlisted-during-review is the CWS default" (unverifiable offline, low signal), and "unverifiable gates/252" (252 was accurate for the reviewed dev tree). The Blind layer ran without project access and several of its items cite non-existent artifacts.)

## Dev Notes

Epic 3's middle story is the only one where the deliverable is **words and images, not code**. The extension is done; the zip exists and is load-tested (3-1, manual AC3 passed). What remains before submission is the material the Chrome Web Store dashboard asks for: listing copy, screenshots, a privacy policy, and the privacy-practices declarations — all of which must tell the same true story as the shipped artifact: one purpose, offline, no permissions, no data collection. Epic 3 is conditional on the publish decision (sprint-status.yaml), but that decision is now effectively made: OQ-1 resolved 2026-10-14 (Option A) and the developer account was registered and paid the same day (epics.md:502).

**Read before writing.** Files this story touches: two **new** docs under `store/` (`listing.md`, `privacy-policy.md`), a **new** `store/screenshots/` directory with two PNGs, plus `README.md` (Status line + packaging pointer) and possibly `.gitignore` (verify only). The single most important file to read first is `README.md` — its Privacy posture and Features sections are the verified inventory of what the listing may truthfully claim, and its verification caveat defines why screenshots must come from `npm run build`, not `npm run dev`. Also read `_bmad-output/planning-artifacts/oq-1-ieee-redistribution-resolution.md` (the attribution line is its direct consequence) and the Story 3.1 file (the zip, its version, and the manual load-test result).

**What already works and must not break:** everything. Zero runtime code changes. The privacy guard, the 252-test suite, the packaging script's manifest lint, and the `dist/` build are all untouched. The listing's claims must stay in lockstep with the guard-enforced posture — if a future story adds a permission, this story's copy becomes a policy violation (CWS removes extensions whose privacy fields contradict behavior).

**Human steps, honestly marked.** Dashboard entry (Task 4) and the screenshot captures (Task 3) need Jared at a real Chrome and a real display. The agent prepares every artifact and checklist so the human step is pure copy-paste and shutter-clicking; it must never claim in Completion Notes that a dashboard field was "submitted" or an image "captured" when it was not. Story 3-1 set the precedent (manual AC3 recorded as Jared's own verification) — follow it exactly.

### Critical Decisions

1. **No manifest version bump — the upload artifact is 3-1's `0.0.10` zip.** project-context.md says "increment the rightmost version segment for every story's dev work," but this story produces no build-artifact change: nothing under `src/`, `public/`, `manifest.json`, or the build scripts changes, so a bump would either ship an identical build under a new number or (worse) leave the zip and manifest mismatched. The version bump rule tracks **build changes**; 3.1 already produced the version that goes to the store. Revisit only if 3.2 ever forces a rebuild (it should not).

2. **Listing and policy copy live in the repo (`store/`), not only in the dashboard.** The dashboard is not version-controllable and its fields are immutable after item creation (Story 3.1 Critical Decision 9: manifest metadata can't be edited post-upload — listing text edits are similarly painful). Keeping the copy as committed markdown makes future edits reviewable, diffable, and re-pasteable after a rejection. `store/` is a new top-level directory, sibling to `public/` and `scripts/`, holding only listing source assets — never build output.

3. **Screenshots are committed; they are source assets, not build output.** Like `public/icons/`, the 1280×800 PNGs are inputs to the listing, regenerated only when the UI changes. They are not produced by any npm script and must not be gitignored. (The opposite error — committing a `dist/` or `release/` artifact — remains forbidden.)

4. **Screenshots show the found state, both themes, from the production build.** A cold-open empty popup says nothing; the found state (banner + three formats + Apple vendor) demonstrates both jobs in one frame. Dark is "preferred" per AC3 because it proves FR7 visually and costs one extra capture. The production-build requirement is the same lesson as 3-1 Critical Decision 3: the dev harness is not the product.

5. **The privacy policy gets a public URL even though CWS only *requires* one when user data is handled.** OUI Scout handles no user data, so the policy is technically optional under the Privacy Policies policy — but the epic AC requires it, it is nearly free, and it gives the dashboard a consistent answer for every field. Hosting is Jared's call (a public GitHub repo page or gist is sufficient); the agent drafts the file and leaves the URL slot explicit. No new hosting infrastructure, no site generator.

6. **Claims discipline: the listing may not improve on the truth.** Listing Requirements forbid misleading/inaccurate metadata; the single-purpose policy forbids bundling unrelated functionality. The README's honest framing ("the closest reference extension does exactly that despite a 'no data collection' claim") becomes, in listing copy, a general statement about remote lookup tools — naming a competitor invites takedown risk for zero gain. No superlatives ("the fastest", "the only"), no Google affiliation signals, no keyword stuffing (same keyword ≤ 5 times).

7. **Dashboard privacy answers are fixed by construction, not negotiated.** Single-purpose statement: the exact sentence in Task 4 (MAC conversion + offline OUI vendor lookup — the same two jobs the manifest name/description and policy carry). Remote code: **No** (no remote code exists; the 1.8 guard fails the build if any is introduced). Data collection: **none** across every category (no personal data, no health/mature/content/website-activity data — the extension asks for no permissions that would even allow collection). These three answers must match the policy and the behavior; contradiction is a removal trigger.

8. **OQ-1's gate is satisfied on record; the listing carries the attribution line.** AC5 is discharged by `oq-1-ieee-redistribution-resolution.md` (Option A, decided by Jared 2026-10-14). The one-line IEEE credit is not legally required under non-assertion but was explicitly reserved "into the store listing (Story 3.2)" as low-cost good practice — it goes into both the detailed description and the policy.

### Behavior / Contract Table

| Surface | Before (this story) | After |
|---|---|---|
| `store/` | does not exist | NEW — `listing.md`, `privacy-policy.md`, `screenshots/` |
| `store/screenshots/light-1280x800_valid.png` | — | NEW — found-state light capture, 1280×800 |
| `store/screenshots/dark-1280x800_valid.png` | — | NEW — found-state dark capture, 1280×800 |
| `store/screenshots/light-1280x800_unknown.png` | — | NEW — miss-state light capture, 1280×800 |
| `store/screenshots/dark-1280x800_invalid.png` | — | NEW — invalid-state dark capture, 1280×800 |
| `manifest.json` version | `0.0.10` | unchanged (Critical Decision 1) |
| `README.md` Status | "Not yet submitted…" | updated only after Jared actually submits |
| `README.md` Packaging section | no pointer to `store/` | one-line pointer added |
| CWS dashboard | empty item | listing + privacy fields + zip `0.0.10` uploaded (human step) |
| `src/**`, `public/**`, `scripts/**`, `tests/**` | — | **zero changes** |

### Testing Standards

- **No new unit tests.** There is no code. The existing 252-test suite (including `tests/privacy.guard.test.ts` and `tests/package-extension.test.ts`) must stay green — that is the regression proof.
- **The gates are the test.** `npm run typecheck` → 0 errors; `npm test` → 252 passed; `npm run build` → OK. Report counts exactly as observed (Story 2.3 review lesson: never overstate).
- **Content review is the acceptance surface:** every factual claim in `store/listing.md` and `store/privacy-policy.md` traces to README Features / the guard-enforced posture / the OQ-1 resolution. The review will check for superlatives, keyword spam, competitor naming, and any promise the popup cannot keep.
- **Screenshot integrity:** images must be captures of the real built popup (found state, correct version `0.0.10`), composed honestly at 1280×800 — no mockups, no upscaled tiny images, no dev-harness frames.

### Previous Story Intelligence (Story 3.1 hand-off)

- **State at 3-1 close:** `release/oui-scout-0.0.10.zip` exists (629,579 B, budget 3 MiB), `manifest.json` is `0.0.10`, manual load-test PASSED (Jared, 2026-10-14: no permission warning, popup opened, `f0:18:98:…` → Apple). The zip is the upload artifact for this story — do not rebuild unless it is missing.
- **Dev-dist rejection lesson carries forward:** any screenshot or verification must use `npm run build` output. A CRXJS dev `dist/` is not the product (3-1 Critical Decision 3; README verification caveat).
- **README Status was deliberately left alone by 3-1** ("still true until Story 3.2 publishes") — this story owns that line, and updates it only after actual submission.
- **Review discipline learned across 2-3/3-1:** comments must match code; Dev Agent Record must list every touched file including tracking docs; completion claims must not overstate — especially dangerous here, where it would be easy to write "dashboard submitted" without Jared having done it. Report only what was actually executed; mark human steps as pending until Jared records them.
- **The packaging lint is a constraint on copy:** the manifest `description` (52 chars) is already ≤ 132 and linted by `packageViolations`. Do not edit the manifest description in this story (it would force a rebuild + version bump, violating Critical Decision 1); the listing summary lives in the dashboard, not the manifest.
- **Never-touch list carried forward:** any file under `src/`; `scripts/build-oui-data.ts`; `scripts/package-extension.ts`; `public/oui-data.json`; `tests/privacy.guard.test.ts`.

### Git Intelligence

- Baseline: `6c31add` ("story 3-1 dev") — the 3-1 implementation commit. Working tree at story-creation time is expected clean; sprint-status 3-2 flips to `ready-for-dev` as part of this story's close-out.
- Commit pattern: `story <id> dev` then `story <id> review` — follow it; never commit unless asked.
- Nothing in the tree resembles a `store/` directory yet; no naming collisions.

### Latest Technical Information

- **CWS listing field limits and assets** (developer.chrome.com/docs/webstore/cws-dashboard-listing): store icon 128×128 (we have `public/icons/icon-128.png`); **at least one 1280×800 screenshot**, up to 5 total; optional 440×280 small promo tile, 1400×560 marquee tile, YouTube link — all optional, skipped here. Title field is practically bounded (~45 chars) and the dashboard summary ~132 chars; detailed description is long-form markdown-ish text.
- **Listing Requirements** (…/program-policies/listing-requirements): blank description or missing icon/screenshots → automatic rejection; misleading/inaccurate/incomplete metadata disallowed; privacy fields must agree with the privacy policy and actual behavior; keyword spam (irrelevant lists, same keyword > 5×) disallowed; unattributed testimonials disallowed.
- **Privacy Policies** (…/program-policies/privacy): a product that handles user data must post a policy linked in the dashboard field. OUI Scout handles none — declaring "no data collected" accurately — but the policy is still drafted per AC1 and the field filled for consistency.
- **Single-purpose / quality guidelines** (…/program-policies/quality-guidelines): one narrow, easy-to-understand purpose — ours is exactly the two halves of one job (convert + identify) that share the pasted input.
- **Remote code question:** answered No — MV3 forbids remotely-hosted code anyway; our guard suite additionally fails on remote URL literals and network APIs in `src/`.
- **No new libraries, no version changes** — pure documentation and screenshot assets; the pinned stack (Vite 8 + CRXJS 3 + Vitest 4 + tsx) is untouched.

### Out of Scope (do not touch)

- **Any file under `src/`, `public/oui-data.json`, `scripts/`, or `tests/`** — zero runtime/build changes is the reviewable claim.
- **`manifest.json` — any field, including `version`** (Critical Decision 1).
- Promo tiles (440×280 / 1400×560), YouTube promo video, localization (single English locale), paid placement — all optional/unneeded.
- The actual **approval** outcome (SM-5) — that is the store's decision; Story 3.3 verifies the posture on the final build, and the README Status line records submission, not approval.
- Network-trace verification and the final guard run against the shipped build — Story 3.3.
- The deferred MV3 CSP entry (deferred-work.md, reserved for 3.x): still a build-only-transform decision with CRXJS-dev-HMR risk; it is **not** part of Story 3.2's ACs. If it lands, it lands with its own explicit scope decision (and would force a rebuild — which is why it stays deferred rather than sneaking into a docs story).
- Gzip/`DecompressionStream` dataset packaging; OQ-2/OQ-3/OQ-4/OQ-5; any PRD text edits.
- Hosting infrastructure for the privacy policy — a public URL (GitHub page/gist) is Jared's call; no site generator, no new tooling.

### Project Structure Notes

- New directory: `store/` at the repo root — listing **source assets** only (`listing.md`, `privacy-policy.md`, `screenshots/*.png`). Not build output; committed; sibling to `public/`.
- Naming: the directory is lowercase kebab-ish `store/` (matches repo conventions of lowercase dirs: `public/`, `scripts/`, `tests/`); markdown files lowercase kebab-case; screenshots `<theme>-1280x800_<state>.png` (state + dimensions in the name — self-describing in a dashboard file picker).
- No barrel/index files; no config; nothing to typecheck. The `store/` files are read by humans and pasted into a browser — they are not part of any build graph.
- `store/` must NOT be added to `.gitignore` (opposite of `dist/` and `release/`).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.2] — ACs 1–5, lines 526-553; Epic 3 context lines 496-504 (conditional; OQ-1 resolved; developer account registered).
- [Source: _bmad-output/planning-artifacts/prds/prd-Mac Lookup-2026-10-10/prd.md#4.5 FR-8] — minimal-permission, no-collection posture; §9 Data constraint (OQ-1 resolved); §10 tone; §11 OQ-1; §7 SM-5 (approved with no-collection disclosure).
- [Source: _bmad-output/planning-artifacts/oq-1-ieee-redistribution-resolution.md] — Option A decision; attribution line "carried into the store listing (Story 3.2)".
- [Source: _bmad-output/implementation-artifacts/3-1-package-the-built-extension-for-store-submission.md] — the `0.0.10` zip artifact, manual load-test PASSED, README Status left for 3.2, dev-dist rejection lesson, review-discipline lessons.
- [Source: _bmad-output/planning-artifacts/architecture.md:197-205] — privacy-by-construction posture the copy must mirror; :441 FR-8 → manifest + packaging + guard suite.
- [Source: README.md] — Privacy posture, Features, Packaging, Verification caveat, Status section (the claims inventory and the line this story updates).
- [Source: project-context.md] — version-bump rule (and why it does not fire here); gates; zero-permission guardrails; canonical microcopy discipline.
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — the CSP entry reserved for 3.x (explicitly not swallowed by this story).
- [Source: https://developer.chrome.com/docs/webstore/cws-dashboard-listing] — listing fields, 1280×800 screenshot requirement, 128×128 icon, optional promo assets.
- [Source: https://developer.chrome.com/docs/webstore/program-policies/listing-requirements] — accuracy, keyword-spam, testimonial, privacy-field-consistency rules.
- [Source: https://developer.chrome.com/docs/webstore/program-policies/privacy + /quality-guidelines + /disclosure-requirements] — when a policy is required; single-purpose expectation; transparency obligations.

## Dev Agent Record

### Agent Model Used

opencode / mimo-v2.6-flash-free (dev-story execution)

### Debug Log References

- **Task 1.** `store/listing.md` created: title `OUI Scout — MAC Vendor Lookup` (29 chars); summary measured programmatically at **exactly 132 chars** (at the CWS limit, within it); detailed description adapted from README Features/Privacy-posture with competitor reference generalized, no superlatives, IEEE attribution line included; Category Tools; Language English.
- **Task 2.** `store/privacy-policy.md` created: single purpose in the first paragraph (consistent with the dashboard statement), no-data-collection claims only, IEEE attribution, Changes note, source-of-truth header comment.
- **Task 3 (human — Jared).** Four screenshots captured from the built `dist/` (superset of the planned two): `light-1280x800_valid.png`, `dark-1280x800_valid.png`, `light-1280x800_unknown.png`, `dark-1280x800_invalid.png`. Found/miss/invalid states, both themes. Dimensions observed via `file(1)`: **1200×800** (not the planned 1280×800) — accepted by the CWS upload pipeline (the listing went live); not upscaled or faked. Filename typo `…_uknown.png` renamed by the agent to `…_unknown.png`.
- **Task 4 (human — Jared).** Dashboard entry completed per `store/listing.md` "Dashboard entry order": listing tab, privacy tab (single-purpose verbatim, remote code No, no data collected, policy URL), `release/oui-scout-0.0.10.zip` uploaded. **Submission reviewed and approved — version 0.0.10 is live and public on the Chrome Web Store** (reported by Jared, 2026-10-15).
- **Task 5.** `.gitignore` verified: no rule matches `store/` or `*.png` (screenshots commit cleanly); `dist/`/`release/` remain ignored. README: Packaging section gained the `store/` pointer; Status line updated to "Published on the Chrome Web Store (version 0.0.10)." Gates run after all agent-side edits: `npm run typecheck` 0 errors; `npm test` **252 passed / 9 files**; `npm run build` OK. No manifest bump (Critical Decision 1) — `0.0.10` unchanged, zip unchanged.

### Completion Notes List

- **Zero runtime changes.** `git status` shows only: `store/` (new: `listing.md`, `privacy-policy.md`, `screenshots/*.png` ×4), `README.md`, and the tracking docs (`sprint-status.yaml`, this story file). Nothing under `src/`, `public/oui-data.json`, `scripts/`, `tests/`, or `manifest.json` — the reviewable claim from Story 3.1 holds again. The 252-test suite (incl. the privacy guard) ran untouched.
- **AC1 satisfied:** listing and policy both state no data collection; the listing accurately reflects the single purpose (MAC conversion + offline OUI vendor lookup), offline behavior, zero permissions. **AC2 satisfied by inspection:** shipped manifest (0.0.10) declares no permissions/host_permissions — asserted continuously by `tests/privacy.guard.test.ts`. **AC3 satisfied:** screenshots are captures of the shipped popup (valid/miss/invalid, light+dark), no misleading imagery; the live listing proves CWS acceptance. **AC4 satisfied:** dashboard privacy fields completed with single-purpose statement, remote code No, no data collected, consistent policy. **AC5 satisfied:** OQ-1 resolved on record 2026-10-14 (Option A) before submission; IEEE attribution line carried into both description and policy.
- **Deviation from the story's screenshot spec, recorded honestly:** captures are 1200×800 (planned 1280×800) and use `_valid`/`_unknown`/`_invalid` state suffixes instead of the bare theme names, four files instead of two. All are real captures of the built popup; none were scaled or fabricated. CWS accepted the submission as-is. The filenames in the repo are the source assets; the dashboard copies are whatever Jared uploaded.
- **SM-5 progress:** "Approved on the Chrome Web Store with a 'no data collection' disclosure and no install-time permission warning" — approval and disclosure achieved; the no-install-time-warning half was verified in Story 3.1's manual AC3 on the same artifact. Story 3.3 remains for the network-trace verification on the final build.
- **README Status** now reads "Published on the Chrome Web Store (version 0.0.10)." — discharged the line Story 3-1 deliberately left untouched.
- **README wording deviation (recorded per code review, 2026-10-16):** the story's Out-of-Scope carve-out says the Status line records *submission, not approval* and suggested "Submitted …, pending review." Jared chose to keep the accurate "Published …" wording instead; `README.md:189` stands as written and the deviation from the suggested wording is noted here.

### File List

- `store/listing.md` (NEW) — dashboard-ready listing copy + entry order + capture steps.
- `store/privacy-policy.md` (NEW) — no-data-collection privacy policy with IEEE attribution.
- `store/screenshots/light-1280x800_valid.png` (NEW) — light found-state capture, 1200×800 (Jared).
- `store/screenshots/dark-1280x800_valid.png` (NEW) — dark found-state capture, 1200×800 (Jared).
- `store/screenshots/light-1280x800_unknown.png` (NEW) — light miss-state capture, 1200×800 (Jared; renamed from `…_uknown.png`).
- `store/screenshots/dark-1280x800_invalid.png` (NEW) — dark invalid-state capture, 1200×800 (Jared).
- `README.md` — Packaging section `store/` pointer; Status line → published.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — 3-2 in-progress → review.
- `_bmad-output/implementation-artifacts/3-2-publish-a-store-listing-and-privacy-policy-with-a-no-data-collection-disclosure.md` — this file.

### Change Log

- 2026-10-15: Implemented Story 3.2 against baseline `6c31add`. Agent produced `store/listing.md` + `store/privacy-policy.md`, README pointer, gates green (typecheck 0 errors, 252 tests, build OK). Jared captured four state/theme screenshots, completed the dashboard entry, and **published: version 0.0.10 is live and public on the Chrome Web Store after review**. No manifest bump; zero `src/` changes. Story moved to `review`.
