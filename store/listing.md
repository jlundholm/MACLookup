# OUI Scout — Chrome Web Store listing

Source of truth for every developer-dashboard text field. Copy each block
verbatim. Dashboard field limits: title ~45 chars, summary ≤ 132 chars.

## Store listing tab

### Title (29 chars)

```
OUI Scout — MAC Vendor Lookup
```

### Summary (127 chars)

```
Convert any MAC address to Colon, Plain, and Cisco-dot formats and look up its vendor — offline. No permissions, no data collection.
```

### Detailed description

```markdown
OUI Scout turns a pasted MAC address into the three formats network engineers actually use — Colon (`AA:BB:CC:DD:EE:FF`), Plain (`AABBCCDDEEFF`), and Cisco-dot (`AABB.CCDD.EEFF`) — and identifies the hardware vendor from its OUI prefix.

Conversion and vendor lookup happen in a single paste, fully offline. The OUI database is bundled inside the extension, so there are no network requests, no host permissions, and no third-party services. A MAC address never leaves your machine.

## What it does

- Paste any common MAC shape — colon, hyphen, dotted, space-grouped, or bare hex — and it is normalized instantly.
- Shows all three output formats at once, each with one-click copy.
- Resolves the hardware vendor by longest-prefix match against the bundled IEEE MA-L / MA-M / MA-S registries.
- Shows a clear "Unknown vendor" state when a prefix is not in the database, and a clear error when the input is not a valid MAC address.
- Follows your system light or dark appearance automatically. Keyboard accessible and screen-reader friendly.

## Privacy

No data collection. No telemetry. No accounts. The extension requests zero permissions, makes zero network requests at runtime, and stores nothing. Your MAC addresses are processed locally in the popup and disappear when it closes.

OUI data from the IEEE Registration Authority public listing.
```

### Category

```
Tools
```

### Language

```
English
```

### Icon

Reuse `public/icons/icon-128.png` (already 128×128).

## Screenshots

At least one 1280×800 screenshot is required (up to 5 allowed). Capture steps:

1. `npm run build` — never `npm run dev` (CRXJS dev augments `dist/` with a service worker; the screenshots must show the shipped artifact).
2. Load `dist/` unpacked in `chrome://extensions` (Developer mode → Load unpacked). Confirm the card shows version **0.0.10**.
3. Open the popup and paste `f0:18:98:00:00:00` — the banner shows **Found / Apple, Inc.** and all three format rows fill.
4. Capture the popup window in light mode. Switch the OS to dark mode (the popup follows live) and capture again.
5. Center each capture on a neutral flat canvas at **1280×800 px** — light-gray field for the light shot, dark-gray for the dark shot. No fake browser chrome, no marketing text, no callout arrows.
6. Save as `store/screenshots/light-1280x800.png` and `store/screenshots/dark-1280x800.png` and commit both.

Optional assets skipped (not required): 440×280 small promo tile, 1400×560 marquee tile, YouTube video.

## Dashboard entry order

### 1. Store listing tab

| Field | Value |
|---|---|
| Icon | `public/icons/icon-128.png` |
| Title | `OUI Scout — MAC Vendor Lookup` |
| Summary | block above |
| Detailed description | block above |
| Category | Tools |
| Language | English |
| Screenshots | `store/screenshots/light-1280x800.png`, `store/screenshots/dark-1280x800.png` |

### 2. Privacy practices tab

| Field | Value |
|---|---|
| Single-purpose statement | `Converts pasted MAC addresses into Colon, Plain, and Cisco-dot formats and identifies the hardware vendor from a bundled IEEE OUI database — entirely offline, with no network access and no data collection.` |
| Remote code? | **No** (no remote code exists; enforced by `tests/privacy.guard.test.ts`) |
| Data collection | **No data is collected** — leave every collection category unchecked |
| Privacy policy URL | public URL of `store/privacy-policy.md` (e.g. a GitHub repo/gist link — Jared provides after publishing the file) |

These three answers must match `store/privacy-policy.md` and the shipped behavior. Contradiction between privacy fields, the policy, or actual behavior is a removal trigger (CWS Listing Requirements).

### 3. Distribution tab

Public vs. unlisted during review is Jared's call (unlisted-during-review is the CWS default).

### Package

Upload `release/oui-scout-0.0.10.zip`. If missing: `npm run build && npm run zip`, then confirm with `unzip -l release/oui-scout-0.0.10.zip` that `manifest.json` is at the archive root.

## Claims discipline

The listing may not improve on the truth. Verified inventory: README Features + the guard-enforced posture. No superlatives ("the fastest", "the only"), no Google-affiliation signals, no Editors'-Choice/ranking claims, no named competitor comparisons, no keyword stuffing (each keyword ≤ 5 uses), no testimonials, no emoji/exclamation (PRD §10 tone).
