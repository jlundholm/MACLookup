# Reconciliation: Brief Addendum & Decision Log vs PRD + PRD Addendum

Compares the brief addendum and `.decision-log.md` (brief-Mac Lookup-2026-10-09) against the PRD and its addendum (prd-Mac Lookup-2026-10-10). Lists only items that are missing, weakened, or contradicted in the targets. Covered items (bundled-offline source, three output formats, Windows/hyphen exclusion, automatic light/dark theme, EUI-64/Firefox/manual-toggle deferrals, MV3 CSP/inline-script and clipboard constraints, 800×600 popup, IEEE licensing risk as OQ-1, measured registry rows/raw/gzip, IAB row, daily regen, rejected APIs) are omitted.

## Gaps

### [critical] Chrome Web Store publication is stated as a user-confirmed in-scope decision, but the PRD demotes it to conditional
- **Source:** Decision log, "Decisions (user-confirmed)": "**3. Scope = publish to Chrome Web Store.** Adds naming, privacy policy, packaging, and review readiness to scope."
- **Target:** PRD §4.5 is titled "*Chrome Web Store Readiness (conditional — required only if published)*", and §6.2 lists "Chrome Web Store publication — *conditional*, only if the user decides to publish … [NOTE FOR PM] This is the one scope item most likely to be revisited."
- **Where it should land:** PRD §4.5 / §6.1 (In Scope) and Success Metric SM-5, stated as committed v1 scope rather than optional.
- **Suggested fix:** Restore publication to in-scope v1 (publish is the confirmed scope decision). Keep FR-8 and SM-5 unconditional, and move any "personal-use-only build" language to a fallback note. If the intent genuinely changed, record that as a new user-confirmed decision rather than silently downgrading.

### [high] OUI coverage (MA-M/MA-S) is presented as settled although the source recorded it as an unresolved decision
- **Source:** Brief addendum: "**Decisions to resolve:** … (2) OUI coverage — core MA-L only, or include MA-M/MA-S." Decision log lists the same under "Open risks carried into the brief" ("**OUI coverage** — MA-L-only vs adding MA-M/MA-S"). No user-confirmed decision adopting MA-M/MA-S appears in the decision log.
- **Target:** PRD §4.3 / FR-5 and §6.1 require "MA-L + MA-M + MA-S"; glossary defines OUI as 24/28/36-bit; PRD addendum states "**Selected for v1:** MA-L + MA-M + MA-S … Legacy IAB not included." No `[ASSUMPTION]` tag or open question marks the choice.
- **Where it should land:** PRD §11 (Open Questions) or an `[ASSUMPTION]` entry in §12; whichever way, the rationale for including MA-M/MA-S must be traceable.
- **Suggested fix:** Either tag the MA-M/MA-S inclusion as an assumption (with the package-size/coverage tradeoff noted) or carry it as an open question until the user confirms.

### [medium] Combined OUI size figures are misattributed: the PRD addendum quotes the four-registry total while claiming IAB is excluded
- **Source:** Brief addendum: "The three MA registries (≈54k prefixes) plus the legacy IAB registry total ≈58.7k prefixes; combined ≈5.67 MB raw / 1.93 MB gzip." The 5.67 MB / 1.93 MB figures include IAB (3,855,621+758,132+671,334+381,117 = 5,666,204 B ≈ 5.67 MB; gzip 1,175,177+304,459+285,783+165,057 = 1,930,476 B ≈ 1.93 MB).
- **Target:** PRD addendum, "Packaging and size math" section: "**Selected for v1:** MA-L + MA-M + MA-S = ≈54k prefixes; combined ≈5.67 MB raw / **≈1.93 MB gzip**. Legacy IAB not included."
- **Where it should land:** PRD addendum §"OUI data" / §"Packaging and size math", and the §8 package-size budget.
- **Suggested fix:** Correct the three-registry totals to ≈5.29 MB raw / ≈1.77 MB gzip and reserve 5.67 MB / 1.93 MB for the four-registry ("including IAB") figure. This keeps the ≤ ~2 MB compressed budget honest.

### [low] Naming collision caveat is flattened; the specific "Scout" crowding/USPTO activity is dropped
- **Source:** Decision log, "Naming decided": "Caveat noted: 'Scout' alone is a crowded/contested term (multiple extensions; active USPTO activity) — recommend a formal clearance search only if commercialized; low risk for a free published utility."
- **Target:** PRD OQ-4: "Trademark/name clearance for 'OUI Scout' if the extension is ever commercialized (low risk while free)."
- **Where it should land:** PRD §11 OQ-4.
- **Suggested fix:** Add the specific caveat that the standalone word "Scout" is crowded/contested (existing extensions, active USPTO activity), so the clearance note reflects why the risk exists.

### [low] Competitor's declared permissions/host detail dropped from the teardown
- **Source:** Decision log, "Research grounding": competitor uses "a remote call to `api.macvendors.com` (`host_permissions: https://api.macvendors.com/*`); only other permission is `clipboardWrite`."
- **Target:** PRD addendum competitive table lists the lookup only as "Remote vendor API" / "the MAC is still sent to a third-party API"; the concrete endpoint and permission set are absent.
- **Where it should land:** PRD addendum §"Competitive teardown".
- **Suggested fix:** Optionally restore the endpoint and permission detail; it strengthens the privacy contrast (the closest competitor still declares a host permission) but is not load-bearing for requirements.
