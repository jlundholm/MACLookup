---
title: OUI Scout — PRD Addendum
status: draft
created: 2026-10-10
updated: 2026-10-10
---

# Addendum: OUI Scout

Technical detail and research that belongs in downstream documents (architecture, solution design) rather than in the PRD itself. Carried forward from the brief addendum (`briefs/brief-Mac Lookup-2026-10-09/addendum.md`) and extended for the PRD.

## Competitive teardown

| Extension | Ratings / users | Formats | OUI lookup | Notes |
|---|---|---|---|---|
| **MAC Address Converter & OUI Lookup** (Adan Vasconcelos, `hgioagdbplaaoppldpepknaefffimill`) | 0★ / 17 | colon, hyphen, Cisco-dot, none; input strips `: . - space`, requires 12 hex digits | Remote vendor API | ~11 KiB, light-only UI. "No data collection" refers to the developer; the MAC is still sent to a third-party API. |
| **MAC Address Converter** (bySimurg, `jjojkbcinpmiepacepclcckifmnhgamo`) | 5.0★ / 245 | configurable / reorderable | None | Convert-only. |
| **Lookup MAC Address** (Gabriel Godri, `cjmkeakikfcijjbcdlgominglghpbojf`) | 3.6★ / ~515 | — | Stale/broken API | Reviews cite "request failed … not valid JSON". |
| **NetworkCalc — IP Subnet Calculator** | 5.0★ | broad tool | OUI lookup included | Not a focused solution. |

**Gap exploited:** a fast, fully client-side converter + OUI lookup that works offline, supports dark mode.

## OUI data — measured 2026-10-09 from `standards-oui.ieee.org`

| Registry | Block size | Rows | Raw | gzip-9 |
|---|---|---|---|---|
| `oui/oui.csv` (MA-L) | /24 | 40,319 | 3,855,621 B | 1,175,177 B |
| `oui28/mam.csv` (MA-M) | /28 | 6,628 | 758,132 B | 304,459 B |
| `oui36/oui36.csv` (MA-S) | /36 | 7,226 | 671,334 B | 285,783 B |
| `iab/iab.csv` (legacy) | /36 | 4,575 | 381,117 B | 165,057 B |

- Vendor-name-only MA-L index (6-hex → name): 1,225,531 B raw / 419,784 B gzip.
- **Selected for v1:** MA-L + MA-M + MA-S = ≈54k prefixes; combined ≈5.67 MB raw / **≈1.93 MB gzip**. Legacy IAB not included.
- Registries regenerate daily (~02:00 UTC).
- **License:** IEEE asserts copyright; Terms of Use grant one personal copy and prohibit redistributing significant portions without permission. Bundling and redistributing in a published extension is legally uncertain — see PRD OQ-1.

## OUI lookup APIs (rejected alternatives)

| API | Auth | Limits | Privacy |
|---|---|---|---|
| `macvendors.com` | none | ~1,000/day; 1 req/s | MAC + requester IP sent to third party |
| `maclookup.app` | none (new keys discontinued) | 10 req/s + 25,000/6h | Same |
| `macadress.com` | none | ~1,000/day/IP; 60 req/min | Same |
| `macvendor.io` | none | 50 units/10s | Same |

MV3 `host_permissions` would let the service worker call these regardless of CORS — but all leak the MAC to a third party, which the product thesis rejects.

## Input parser rules

- Strip all separators (`:`, `-`, `.`) and whitespace (spaces, tabs, newlines) from the pasted string.
- Accept hex in either case; uppercase the Canonical value.
- Valid iff the stripped string is exactly 12 hex digits.
- No length-, prefix-, or address-type validation beyond the 12-hex-digit rule (local/unicast bits are not interpreted in v1).

## Output formats

| Name | Pattern | Example |
|---|---|---|
| Colon | `AA:BB:CC:DD:EE:FF` | `AA:BB:CC:DD:EE:FF` |
| Plain | `AABBCCDDEEFF` | `AABBCCDDEEFF` |
| Cisco-dot | `AABB.CCDD.EEFF` | `AABB.CCDD.EEFF` |

Hyphen/Windows output is intentionally excluded.

## Chrome MV3 constraints

- `prefers-color-scheme` and `matchMedia('(prefers-color-scheme: dark)')` work in popups; add a `change` listener for live updates.
- Chrome does **not** expose browser theme or accent colors to extensions. `chrome.devtools.panels.themeName` is DevTools-only. "Follow the Chrome theme" therefore means light/dark only, with the accent approximating Chrome blue.
- Add `color-scheme: light dark` on `:root`; approximate the native look with CSS system colors (`Canvas`, `CanvasText`, `Field`, `ButtonFace`, `AccentColor`, …).
- Popup max 800×600.
- MV3 CSP forbids inline scripts, so the early-inline-script anti-FOUC pattern is unavailable; prefer CSS-first theming.
- Clipboard: `navigator.clipboard.writeText()` in a click handler needs no permission; `document.execCommand('copy')` is deprecated.

## Packaging and size math

- Bundled database target: ≤ ~2 MB compressed; total unpacked package budget ~3 MB (PRD §8).
- Potential size reduction: ship a vendor-name-only index (MA-L name index ≈420 KB gzip) instead of full registry rows (PRD OQ-3). Trade-off: less per-prefix metadata.
- Refresh handled by a repeatable build step that downloads the IEEE CSVs, compresses/normalizes them, and regenerates the bundled artifact — no runtime updater (PRD OQ-2).
