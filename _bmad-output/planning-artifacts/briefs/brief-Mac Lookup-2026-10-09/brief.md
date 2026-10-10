---
title: OUI Scout
status: ready
created: 2026-10-09
updated: 2026-10-09
---

# Product Brief: OUI Scout — MAC Converter & OUI Vendor Lookup

## Executive Summary

OUI Scout is a lightweight Chrome extension that converts a pasted MAC address into the three formats network engineers use most, and identifies the hardware vendor from its OUI prefix — entirely offline, in the browser. Paste a MAC, get every conversion plus the manufacturer instantly, in a popup that matches Chrome's light/dark theme.

It exists because the alternatives are incomplete: converter-only tools skip vendor lookup, lookup-only tools depend on remote services, and the reference extension sends every MAC to an external service. OUI Scout handles both conversion and vendor identification in a single paste, with nothing leaving the machine.

## The Problem

Network, IT, and support engineers move MAC addresses between systems all day, and each system wants a different shape: spreadsheets use colon form, Cisco switch output uses dotted form, raw exports use bare hex. Reformatting by hand is slow and error-prone.

Identifying the vendor usually means a second trip — paste the MAC into a website or API that sends data to a third-party service. The reference extension does exactly this, so the MAC and the requester's IP leave the browser on every lookup despite a "no data collection" claim. Meanwhile the converter-only extensions do not identify vendors at all, and the lookup-only ones rely on remote services that break.

The cost is small but constant: time lost per lookup that adds up across hundreds of lookups, plus needless exposure of client and asset MAC addresses to third parties.

## The Solution

A single Chrome popup:

- **Accept any common form** — colon, hyphen, Cisco-dot, space-grouped, or bare hex — and normalize it.
- **Show the three working formats** — colon `AA:BB:CC:DD:EE:FF`, plain `AABBCCDDEEFF`, and Cisco `AABB.CCDD.EEFF` — each with one-click copy.
- **Identify the vendor** from the OUI prefix using a database bundled inside the extension, so the lookup is instant, offline, and private.
- **Follow Chrome's appearance** automatically, light or dark.

Conversion and identification happen in the same paste, with no network request and no third-party dependency.

## What Makes This Different

- **Private by construction.** The OUI database ships in the package, so there are no outbound requests and no host permissions. The reference extension cannot truthfully make this claim.
- **One tool, one paste.** Competitors split conversion and vendor lookup; OUI Scout does both at once.
- **Reliable and instant.** No API latency, no rate limits, and no failed lookups when someone else's service misbehaves — it works on a plane.
- **Native feel.** Follows the Chrome theme instead of shipping a light-only legacy UI.

A small, well-executed utility rather than a technical moat — the edge is privacy, speed, and polish. [ASSUMPTION]

## Who This Serves

**Primary:** network engineers, IT/helpdesk, and support staff who read MAC addresses from spreadsheets, switch and router CLIs, DHCP leases, and asset inventories.

**Secondary:** homelabbers and security practitioners triaging unknown devices.

## Success Criteria

- A lookup plus all three conversions completes in well under a second, with **no network activity**.
- Every accepted input form produces correct conversions.
- The extension works fully offline and requests no permissions (clipboard copy is a user gesture).
- Published and approved on the Chrome Web Store with a "no data collection" disclosure.
- The bundled OUI database can be refreshed from the IEEE registry through a repeatable build step. [ASSUMPTION]

## Scope

**In (v1):**

- Auto-normalizing input for colon, hyphen, Cisco-dot, space-grouped, and bare-hex forms.
- Three output formats (colon, plain, Cisco-dot) with copy buttons.
- Offline OUI vendor lookup from a bundled database.
- Automatic Chrome light/dark theming.
- Chrome Web Store packaging: privacy policy, listing assets, minimal permissions.

**Out (v1):**

- Hyphen/Windows as an *output* format (explicitly excluded).
- Live IEEE auto-update or a remote API fallback.
- EUI-64, decimal, and binary formats. [ASSUMPTION]
- Firefox/Edge ports. [ASSUMPTION]
- A manual theme toggle. [ASSUMPTION]

## Risks and Open Questions

- **IEEE data licensing — resolve before release.** IEEE asserts copyright and restricts redistribution of significant portions of its registry, so bundling it in a published extension is legally uncertain. Options: obtain permission, adopt an openly licensed OUI dataset, or accept the risk with clear attribution.
- **Coverage.** The core MA-L registry (≈40k prefixes) excludes the /28 and /36 assignments common on phones and IoT; decide whether to also bundle the extended MA-M and MA-S registries.
- **Package size.** A fully bundled database lands around 1.3–1.9 MB compressed, which must be justified against store expectations.

## Vision

Become the default "paste a MAC, know the device" utility: multi-format (including EUI-64), a well-maintained offline database with a safe update path, and the same permission-free privacy stance. Over time, add small, practical features that complement MAC lookups — multicast/local-bit interpretation, device-type hints — without ever giving up offline-first or requesting broad permissions. [ASSUMPTION]
