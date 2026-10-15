# Privacy Policy — OUI Scout

<!-- Source of truth. The public URL of this file goes in the Chrome Web Store
     dashboard privacy-policy field (Jared: publish this file, e.g. via a public
     GitHub repo or gist, and paste that URL). -->

**OUI Scout converts pasted MAC addresses into Colon, Plain, and Cisco-dot
formats and identifies the hardware vendor from a bundled IEEE OUI database —
entirely offline. That is the extension's only purpose.**

## Summary

OUI Scout **collects no data**. It does not collect, use, share, or transmit
any information — about you, your device, or the MAC addresses you paste.

## Details

- **No network activity.** The extension makes zero network requests at
  runtime. The OUI vendor database is bundled inside the extension at build
  time and ships with it; nothing is downloaded while you use it.
- **No telemetry, analytics, or crash reporting.** There is no phone-home of
  any kind.
- **No accounts, cookies, or storage.** The extension uses no browser storage,
  no cookies, and no servers. The MAC you paste and the results derived from
  it exist only in the popup's memory and disappear when the popup closes.
- **No permissions.** The extension declares zero permissions and zero host
  permissions. Clipboard copy (an optional one-click action) runs locally
  under your own click and sends nothing anywhere.
- **No data sharing.** Since no data is collected, none is shared with anyone
  — no third parties, no advertising, no data brokers.

These properties are enforced by an automated test suite in the extension's
source repository, not just promised here.

## Data source attribution

Vendor names are derived from the IEEE Registration Authority public OUI
listing, bundled into the extension at build time. The build-time download of
that public listing is performed by the developer on the developer's own
machine; it is not part of the shipped extension and involves no user data.

## Changes

If this policy ever changes, the updated version will be published at this
same location.
