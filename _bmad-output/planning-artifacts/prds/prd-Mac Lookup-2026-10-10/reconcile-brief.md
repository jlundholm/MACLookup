# Reconciliation: Brief → PRD

Source brief: `briefs/brief-Mac Lookup-2026-10-09/brief.md` (status: ready)
Target: `prds/prd-Mac Lookup-2026-10-10/prd.md` + `addendum.md`

This compares the brief against the PRD and its addendum for requirements, scope decisions, success criteria, user detail, risks, and qualitative nuance that were dropped, weakened, or contradicted. Items fully covered are omitted. The PRD is generally faithful; most gaps cluster around scope posture (publishing) and the user/vision framing that the FR structure quietly flattens.

## Gaps

### [critical] Chrome Web Store publication demoted from a v1 success criterion and in-scope deliverable to optional/conditional
**Brief says:** Success Criteria include "**Published and approved on the Chrome Web Store with a 'no data collection' disclosure.**" and Scope In (v1) includes "**Chrome Web Store packaging: privacy policy, listing assets, minimal permissions.**"
**Where it should land:** PRD §6.1 In Scope, §7 Success Metrics, §4.5.
**Contradiction:** The PRD reframes publication as conditional: §4.5 "*(conditional — required only if published)*"; §6.2 places "Chrome Web Store publication — *conditional*, only if the user decides to publish"; SM-5 is "(if published)". The brief treats shipping on the Chrome Web Store as an accepted success criterion and an in-scope v1 deliverable, not an optional branch.
**Suggested fix:** Either (a) restore CWS publication to In Scope and Primary/committed success criteria, or (b) if the PM genuinely intends to make it optional, surface this explicitly as a deliberate scope change from the brief with rationale — currently it reads as an unannounced weakening.

### [high] Primary target user narrowed to "Builder-as-user"; professional + secondary segments dropped
**Brief says:** "**Primary:** network engineers, IT/helpdesk, and support staff who read MAC addresses from spreadsheets, switch and router CLIs, DHCP leases, and asset inventories. **Secondary:** homelabbers and security practitioners triaging unknown devices."
**Where it should land:** PRD §2 Target User.
**Gap:** §2.1 reframes the primary user as "**Builder-as-user (primary)**" — the individual builder — collapsing the brief's professional-primary market into the author. The secondary segment (homelabbers, security practitioners triaging unknown devices) appears nowhere in §2.1/§2.2. This narrows the product's audience definition and removes the persona that justifies "triaging unknown devices" use cases.
**Suggested fix:** Restore network engineers / IT-helpdesk / support staff as the primary segment and add homelabbers + security practitioners as secondary, even if the builder is the solo v1 audience.

### [medium] Aspirational vision ("default utility", "safe update path") dropped
**Brief says:** Vision — "Become the default 'paste a MAC, know the device' utility... **a well-maintained offline database with a safe update path**, and the same permission-free privacy stance."
**Where it should land:** PRD §1 Vision.
**Gap:** The Vision section collapses the brief's forward-looking arc into a v1 restatement. The "safe update path" idea is not just dropped but effectively negated: §5 Non-Goals "Not always-current. No runtime registry update or remote fallback" and §8 "no runtime update path." The brief imagined a maintained data path; the PRD forecloses it without acknowledging the tension.
**Suggested fix:** Add a short future/vision paragraph naming (a) "default paste-a-MAC utility" ambition and (b) a safe data-refresh path as a future direction; clarify v1 ships a snapshot but the maintenance model is not permanently forbidden.

### [medium] Input-source contexts dropped (spreadsheets, DHCP leases, asset inventories)
**Brief says:** users "read MAC addresses from **spreadsheets**, switch and router CLIs, **DHCP leases, and asset inventories**."
**Where it should land:** PRD §2.1 JTBD / §2.3 UJ-1.
**Gap:** UJ-1 only depicts a switch CLI (`show mac address-table`). The other real-world sources are absent, weakening the JTBD coverage (e.g., pasting a bare-hex export from a spreadsheet is a distinct, motivating case for the "bare hex" input form).
**Suggested fix:** Broaden UJ-1 or add a JTBD bullet covering spreadsheet/DHCP-lease/asset-inventory sources.

### [medium] "Listing assets" deliverable dropped from CWS packaging scope
**Brief says:** In scope v1 — "Chrome Web Store packaging: privacy policy, **listing assets**, minimal permissions."
**Where it should land:** PRD §6.1 / §4.5.
**Gap:** FR-8 requires "A store listing and privacy policy" but the brief's explicit "listing assets" (icons, screenshots, description) as a v1 deliverable is not tracked. Combined with the publication demotion above, the store-readiness workstream loses its concrete deliverables.
**Suggested fix:** Enumerate store listing assets as explicit deliverables under FR-8 / §6.1 if publication remains a goal.

### [low] Problem-framing cost nuance ("small but constant... hundreds of lookups") weakened
**Brief says:** "The cost is small but constant: time lost per lookup that adds up across **hundreds of lookups**, plus needless exposure of client and asset MAC addresses to third parties."
**Where it should land:** PRD §1 Vision / §2.1.
**Gap:** The PRD captures the privacy half well but drops the cumulative-efficiency framing ("hundreds of lookups") that motivates the tool as a recurring daily utility. Minor, since SM-3 gestures at it.
**Suggested fix:** Optionally restore the "high-frequency, cumulative time savings" motivation in the JTBD.

### [low] Brief's included MA-L-only coverage decision now overridden without noting the change
**Brief says:** Risk — "The core MA-L registry (≈40k prefixes) excludes the /28 and /36 assignments common on phones and IoT; **decide whether to also bundle the extended MA-M and MA-S registries.**"
**Where it should land:** PRD §6.1 / addendum.
**Gap:** Fully covered — the PRD bundles MA-L + MA-M + MA-S and the addendum records the 54k-prefix decision. The only nuance missed is that the brief flagged this as an *open decision*, whereas the PRD presents it as settled without recording the PM's resolution. Minor traceability note only.
**Suggested fix:** None required; optionally note the resolved decision in OQ history.
