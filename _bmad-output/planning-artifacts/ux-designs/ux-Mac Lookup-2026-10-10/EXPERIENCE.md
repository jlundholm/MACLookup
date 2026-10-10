---
name: OUI Scout
status: final
created: 2026-10-10
updated: 2026-10-10
sources:
  - {planning_artifacts}/prds/prd-Mac Lookup-2026-10-10/prd.md
  - {planning_artifacts}/prds/prd-Mac Lookup-2026-10-10/addendum.md
  - {planning_artifacts}/briefs/brief-Mac Lookup-2026-10-09/brief.md
---

# OUI Scout — Experience Spine

> Single-surface Chrome MV3 popup. Native posture, outcome-forward. Paired with `DESIGN.md` (OUI Scout visual identity).

## Foundation

Single surface: the **Chrome desktop popup** (Manifest V3, the browser-action panel). There is no second surface in v1 — no options page, no settings screen, no onboarding, no devtools panel. No external UI system is named; OUI Scout inherits Chrome's popup conventions and the platform's `prefers-color-scheme` light/dark. `DESIGN.md` is the visual identity reference (system surfaces, semantic status color); this spine is the experience.

The popup opens by toolbar-icon click, works fully offline, and makes zero network requests. All state is ephemeral and in-memory — nothing is persisted, and closing the popup ends the session.

## Information Architecture

| Surface | Reached from | Purpose |
|---|---|---|
| Popup | Toolbar icon click | Paste a MAC → see the three formats + the Vendor |

One surface, one column, fixed vertical order: wordmark → input → result banner → three format rows. There are no navigation affordances and nothing to route between; the whole product is visible at once and fits without scrolling (target 360px wide, within Chrome's 800×600 popup ceiling).

→ Composition reference: `mockups/status-popup.html` (light + dark; found / unknown-vendor / invalid). Spine wins on conflict.

## Voice and Tone

Microcopy. Brand voice and aesthetic posture live in `DESIGN.md`.

| Do | Don't |
|---|---|
| "Paste a MAC address" (placeholder) | "Welcome to OUI Scout! Start by entering a MAC 👋" |
| "Copied" | "Copied successfully ✓" |
| "Unknown vendor" | "No results found" / "Hmm, we couldn't find that one" |
| "Not a valid MAC address" | "Error: invalid input (code 422)" |
| "Found" / "Not found" / "Invalid" (state labels) | Color-only status, or cheerful status copy |
| Terse, functional, lowercase-sentence where labels aren't uppercase | Personality-driven copy, exclamation marks, emoji |

The voice is the voice of a tool: it tells you what happened and stops. Canonical strings are fixed by the PRD — "Unknown vendor" (FR-6), "Not a valid MAC address" (FR-2), "Copied" (FR-4) — and are used verbatim.

## Component Patterns

Behavioral. Visual specs live in `DESIGN.md.Components`.

| Component | Use | Behavioral rules |
|---|---|---|
| Popup shell | Popup | The single surface. Fixed 360px, one column, no scroll, no navigation. Hosts the input, the banner, and the rows. Opening it focuses the input. |
| MAC input | Popup | The only editable control. Autofocuses on popup open. Accepts any single MAC form (colon, hyphen, Cisco-dot, space-grouped, bare hex) and normalizes it to the Canonical value on every change — no submit button, no trigger. Rejects multi-MAC pastes and any non-12-hex-digit result as invalid. |
| Result banner | Popup | Exactly one, always present once input is non-empty. Reflects `found` / `miss` / `invalid`. Carries a text state label so the outcome never depends on color alone. |
| Status lamp | Result banner | Decorative only — the color source for the banner. `aria-hidden` and not focusable; the text state label is authoritative, so the lamp never carries meaning alone. |
| Format row | Popup | Three fixed rows (Colon, Plain, Cisco-dot), always in that order, always all three. Value is selectable text. Inert (— and disabled copy) when input is invalid. |
| Copy button | Format row | One per row. Fires `navigator.clipboard.writeText()` with the row's exact string under the user gesture. On success, swaps to "Copied" for ~1.5 s, then reverts. On clipboard rejection, shows the failure state and never claims "Copied". |

## State Patterns

| State | Surface | Treatment |
|---|---|---|
| Cold open / empty (resting) | Popup | Field autofocused with placeholder "Paste a MAC address". No banner, no rows, no error — a neutral resting state (FR-2). |
| Focus | Popup | The focused control (input or a copy button) shows a visible `{colors.focus-ring}` ring — neutral ink, never status color. `Tab` order: input → Colon copy → Plain copy → Cisco-dot copy. |
| Valid MAC, Vendor found | Popup | Found banner (green): "Found" + Vendor name + the prefix queried (FR-5). Three format rows in the found rail color with active copy buttons (FR-3). |
| Valid MAC, prefix not found | Popup | Miss banner (amber): "Not found" + "Unknown vendor" + the prefix queried (FR-6). Rows still convert and copy. Textually and chromatically distinct from invalid. |
| Invalid input | Popup | Invalid banner (red): "Invalid" + "Not a valid MAC address". Field border turns red. All three rows go inert (— values, disabled copy). No stale result remains (FR-2). |
| Correcting toward valid | Popup | Edits re-evaluate on each change; a valid value restores results immediately, no reload. State transition is a ~120 ms cross-fade. |
| Copy confirmation | Copy button | "Copied" for ~1.5 s (FR-4), then reverts. Independent per row. |
| Clipboard rejected | Copy button | Failure state shown instead of "Copied"; the confirmation is never shown when the write did not occur (FR-4). |
| Dark / light | Popup | Follows `prefers-color-scheme`; a `change` listener updates live while open (FR-7). No manual control. |
| Offline | Popup | Indistinguishable from online — the product never needs the network. No offline banner (there is nothing to degrade). |

## Interaction Primitives

**Paste-first.** The product is built around one gesture — paste — and the keyboard is the primary surface; the mouse is only needed for copy.

- **Autofocus** — the input is focused the instant the popup opens, so a paste lands immediately.
- **Paste (any form)** — parsed on change; results appear without a second action.
- **`Tab` / `Shift+Tab`** — moves focus in reading order: input → Colon copy → Plain copy → Cisco-dot copy.
- **`Enter` / `Space`** — activate the focused copy button.
- **`Esc`** — no special handling needed; closing the popup is Chrome's own behaviour.
- **Click** — copy a row on a single click; no double-click, no long-press.

**Banned:** drag, hover-only affordances, right-click menus, keyboard shortcuts beyond standard traversal, any control that requires discovering hidden state.

## Accessibility Floor

Behavioral. Visual contrast lives in `DESIGN.md` (both themes meet WCAG AA for text; status is not encoded by color alone).

- Every interactive control (input + three copy buttons) is reachable by `Tab` with a visible `{colors.focus-ring}` focus state.
- The result banner is an `aria-live="polite"` region: state changes announce "Found, Apple, Inc." / "Not found, unknown vendor" / "Not a valid MAC address" (and the no-match and invalid cases each announce distinctly). The text state label is the accessible signal; color is redundant.
- Copy confirmations are exposed to assistive tech — the button's accessible name changes to "Copied" (and the live region or button state announces the copy), then reverts (FR-4, PRD §8).
- Meaning is never carried by color alone: found / miss / invalid each have a distinct text label and value (WCAG 1.4.1).
- Reduce Motion: under `prefers-reduced-motion: reduce`, the ~120 ms state cross-fade is skipped; state swaps instantly.
- The input has an associated label for assistive tech even though no visible label is shown.

## Inspiration & Anti-patterns

- **Lifted from the Chrome popup itself:** system fonts, system light/dark, tight density, no chrome. OUI Scout should read as a native pane, not an app.
- **Lifted from the switch CLI:** the tabular, uppercase, column-aligned readout of hex values; the tool speaks the user's vocabulary (colon / plain / Cisco-dot).
- **Rejected — the reference extension's remote lookup:** calling a vendor API (e.g., `api.macvendors.com`) leaks the MAC and the requester's IP. Privacy-by-construction is the product thesis, so lookup is local (PRD §9).
- **Rejected — consumer onboarding & settings:** no welcome screen, no theme toggle, no preferences. The popup does its one job on open.
- **Rejected — pickup/gamification/celebratory motion:** no confetti, no streak, no "Nice!" — copy confirmation is a quiet two-state button.
- **Rejected — a broad network toolkit:** no subnet math, IP tooling, or scanning surfaces; one job, one screen.

## Key Flows

### Flow 1 — UJ-1: Jared pastes a MAC from a switch CLI and gets everything at once

1. Jared copies a MAC out of `show mac address-table`.
2. He clicks the OUI Scout toolbar icon. The popup opens with the field already focused.
3. He pastes. The popup normalizes in one pass and — with no second action — paints the Found banner ("Found", the Vendor name, the prefix) and all three format rows (FR-3, FR-5).
4. He scans the readout, then clicks **Copy** on the Cisco-dot row (FR-4).
5. **Climax:** the button flips to "Copied" and the Cisco-dot string is on his clipboard — no reformatting by hand, no second tool, and the whole exchange happens offline with nothing leaving the machine.
6. He pastes the string into the switch config and closes the popup.

Failure (alternate to step 5): the clipboard write is denied — the button shows the failure state instead of "Copied", and he retries by clicking again.

### Flow 2 — UJ-2: Jared pastes junk and gets told, not misled

1. Jared pastes the wrong thing — a screenshot's alt text, or a line of prose from a ticket.
2. The popup shows the Invalid banner ("Invalid" / "Not a valid MAC address"), the field border turns red, and all three rows go inert (— values). No partial or stale conversion is left on screen.
3. He re-pastes an actual MAC, but one whose prefix isn't in the bundled database.
4. **Climax:** the banner flips to the Miss state — "Not found" / "Unknown vendor" — with the exact prefix it queried, so he can tell *"we looked and there's no match"* apart from *"that wasn't a MAC."* He can still copy any of the three converted forms.

Failure (alternate): a multi-MAC paste (several addresses copied from a table export) is treated as invalid in v1 — Invalid banner, no first-match guessing (PRD FR-1).
