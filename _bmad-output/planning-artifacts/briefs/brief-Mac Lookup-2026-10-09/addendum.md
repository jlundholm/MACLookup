---
title: OUI Scout — Brief Addendum
status: ready
created: 2026-10-09
updated: 2026-10-09
---

# Addendum: OUI Scout

Detail captured during the brief that belongs in downstream documents (PRD, architecture) rather than the brief itself.

**Decisions to resolve:** (1) IEEE data licensing for redistribution; (2) OUI coverage — core MA-L only, or include MA-M/MA-S. Both are detailed below.

## Competitive teardown

| Extension | Ratings / users | Formats | OUI lookup | Notes |
|---|---|---|---|---|
| **MAC Address Converter & OUI Lookup** (Adan Vasconcelos, `hgioagdbplaaoppldpepknaefffimill`) | 0★ / 17 | colon, hyphen, Cisco-dot, none; input strips `: . - space`, requires 12 hex digits | Remote vendor API | ~11 KiB, light-only UI. Verified by reading its published CRX. "No data collection" refers to the developer; the MAC is still sent to a third-party API. |
| **MAC Address Converter** (bySimurg, `jjojkbcinpmiepacepclcckifmnhgamo`) | 5.0★ / 245 | configurable / reorderable | None | Convert-only. |
| **Lookup MAC Address** (Gabriel Godri, `cjmkeakikfcijjbcdlgominglghpbojf`) | 3.6★ / ~515 | — | Stale/broken API | Reviews cite "request failed … not valid JSON". |
| **NetworkCalc — IP Subnet Calculator** | 5.0★ | broad tool | OUI lookup included | Not a focused solution. |

**Gap exploited:** a fast, fully client-side converter + OUI lookup that works offline, supports dark mode, and, if feasible, EUI-64.

## OUI data — measured 2026-10-09 from `standards-oui.ieee.org`

| Registry | Block size | Rows | Raw | gzip-9 |
|---|---|---|---|---|
| `oui/oui.csv` (MA-L) | /24 | 40,319 | 3,855,621 B | 1,175,177 B |
| `oui28/mam.csv` (MA-M) | /28 | 6,628 | 758,132 B | 304,459 B |
| `oui36/oui36.csv` (MA-S) | /36 | 7,226 | 671,334 B | 285,783 B |
| `iab/iab.csv` (legacy) | /36 | 4,575 | 381,117 B | 165,057 B |

- Vendor-name-only MA-L index (6-hex → name): 1,225,531 B raw / 419,784 B gzip.
- The three MA registries (≈54k prefixes) plus the legacy IAB registry total ≈58.7k prefixes; combined ≈5.67 MB raw / 1.93 MB gzip.
- Registries regenerate daily (~02:00 UTC).
- **License:** IEEE asserts copyright; Terms of Use grant one personal copy and prohibit redistributing significant portions without permission. Bundling and redistributing in a published extension is legally uncertain — must be resolved.

## OUI lookup APIs (alternatives, if needed)

| API | Auth | Limits | Privacy |
|---|---|---|---|
| `macvendors.com` | none | ~1,000/day; 1 req/s | MAC + requester IP sent to third party |
| `maclookup.app` | none (new keys discontinued) | 10 req/s + 25,000/6h | Same |
| `macadress.com` (keyless vendor endpoint; site intentionally drops the "D") | none | ~1,000/day/IP; 60 req/min | Same |
| `macvendor.io` | none | 50 units/10s | Same |

MV3 `host_permissions` allow the service worker to call these regardless of CORS. All of these APIs leak the MAC to a third party.

## Chrome MV3 theming constraints

- `prefers-color-scheme` and `matchMedia('(prefers-color-scheme: dark)')` work in popups; add a `change` listener for live updates.
- Chrome does **not** expose browser theme or accent colors to extensions. `chrome.devtools.panels.themeName` is DevTools-only. So "follow the Chrome theme" means light/dark only.
- Add `color-scheme: light dark` on `:root`; approximate native look with CSS system colors (`Canvas`, `CanvasText`, `Field`, `ButtonFace`, `AccentColor`, …).
- Popup max 800×600.
- **MV3 CSP forbids inline scripts**, so the early inline theme script anti-FOUC (flash of unstyled content) pattern is unavailable; prefer CSS-first theming.
- Clipboard: `navigator.clipboard.writeText()` in a click handler needs no permission; `document.execCommand('copy')` is deprecated.
