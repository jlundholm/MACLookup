---
name: OUI Scout
description: Offline MAC-address converter and OUI vendor lookup in a single Chrome popup. Monochrome system surfaces; semantic status color is the only color in the product.
status: final
created: 2026-10-10
updated: 2026-10-10
sources:
  - {planning_artifacts}/prds/prd-Mac Lookup-2026-10-10/prd.md
  - {planning_artifacts}/prds/prd-Mac Lookup-2026-10-10/addendum.md
  - {planning_artifacts}/briefs/brief-Mac Lookup-2026-10-09/brief.md
colors:
  # Monochrome system surfaces (light)
  surface: '#FFFFFF'
  field: '#F6F8FA'
  border: '#D6DBE1'
  text: '#0B0D10'
  text-muted: '#57606A'
  focus-ring: '#0B0D10'
  # Status triads (light) — the only color in the product
  found-bg: '#E6F6EA'
  found-border: '#A7E0B3'
  found-fg: '#0F7B34'
  miss-bg: '#FFF4DD'
  miss-border: '#F0D199'
  miss-fg: '#8A5300'
  invalid-bg: '#FDEAEA'
  invalid-border: '#F3B7B7'
  invalid-fg: '#C62828'
  # Monochrome system surfaces (dark)
  surface-dark: '#0D1117'
  field-dark: '#161B22'
  border-dark: '#30363D'
  text-dark: '#F0F6FC'
  text-muted-dark: '#8B949E'
  focus-ring-dark: '#F0F6FC'
  # Status triads (dark)
  found-bg-dark: '#0F2417'
  found-border-dark: '#1F6F3F'
  found-fg-dark: '#56D364'
  miss-bg-dark: '#2A2110'
  miss-border-dark: '#8A6D1E'
  miss-fg-dark: '#E3B341'
  invalid-bg-dark: '#2B1416'
  invalid-border-dark: '#8B3B3B'
  invalid-fg-dark: '#FF7B72'
typography:
  body:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.45'
  mac-input:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: 14px
    fontWeight: '700'
    letterSpacing: 0.03em
    note: 'Rendered uppercase via text-transform; input itself is case-insensitive'
  readout:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: 13.5px
    fontWeight: '700'
    letterSpacing: 0.03em
    note: 'Tabular figures (font-variant-numeric: tabular-nums) so hex columns align'
  field-label:
    fontSize: 10px
    fontWeight: '800'
    letterSpacing: 0.09em
    note: 'Inherits body fontFamily; uppercased — the format name (Colon / Plain / Cisco-dot)'
  state-label:
    fontSize: 12px
    fontWeight: '800'
    letterSpacing: 0.13em
    note: 'Inherits body fontFamily; uppercased — the outcome word (Found / Not found / Invalid)'
  prefix:
    fontSize: 11px
    fontWeight: '700'
    note: 'Inherits body fontFamily; tabular-nums — the prefix queried'
  button:
    fontSize: 11.5px
    fontWeight: '800'
    letterSpacing: 0.04em
    note: 'Inherits body fontFamily'
  wordmark:
    fontSize: 12.5px
    fontWeight: '700'
    letterSpacing: 0.02em
    note: 'Inherits body fontFamily'
rounded:
  sm: 6px
  md: 8px
  lg: 10px
  full: 9999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
components:
  popup-shell:
    background: '{colors.surface}'
    foreground: '{colors.text}'
    border: '{colors.border}'
    radius: '{rounded.lg}'
    padding: '{spacing.3}'
    width: 360px
    shadow: '0 1px 3px rgba(0, 0, 0, 0.16)'
  mac-input:
    background: '{colors.field}'
    foreground: '{colors.text}'
    border: '{colors.border}'
    borderWidth: 1.5px
    borderFocus: '{colors.focus-ring}'
    radius: '{rounded.md}'
    padding: '11px 12px'
    typography: '{typography.mac-input}'
    placeholderColor: '{colors.text-muted}'
  result-banner:
    radius: '{rounded.lg}'
    padding: '{spacing.3}'
    anatomy:
      - status-lamp
      - state-label
      - value
      - prefix
    found:
      background: '{colors.found-bg}'
      border: '{colors.found-border}'
      foreground: '{colors.found-fg}'
    miss:
      background: '{colors.miss-bg}'
      border: '{colors.miss-border}'
      foreground: '{colors.miss-fg}'
    invalid:
      background: '{colors.invalid-bg}'
      border: '{colors.invalid-border}'
      foreground: '{colors.invalid-fg}'
  status-lamp:
    size: 13px
    shape: circle
    color: 'currentColor'
    halo: '4px ring at ~22% of currentColor'
  format-row:
    background: '{colors.field}'
    border: '{colors.border}'
    railWidth: 4px
    radius: '{rounded.md}'
    railFound: '{colors.found-fg}'
    railMiss: '{colors.miss-fg}'
    railInvalid: '{colors.invalid-fg}'
    emptyValueColor: '{colors.text-muted}'
  copy-button:
    foreground: '{colors.text}'
    border: '{colors.border}'
    borderWidth: 1.5px
    radius: '{rounded.sm}'
    padding: '6px 11px'
    hover-foreground-found: '{colors.found-fg}'
    hover-foreground-miss: '{colors.miss-fg}'
    hover-foreground-invalid: '{colors.invalid-fg}'
    copied-background: '{colors.found-bg}'
    copied-border: '{colors.found-border}'
    copied-foreground: '{colors.found-fg}'
    disabled-foreground: '{colors.text-muted}'
    disabled-opacity: 0.5
---

> Composition reference: `mockups/status-popup.html` (the chosen *Status* direction — light + dark, found / unknown-vendor / invalid).

_Frontmatter tokens are canonical; the section prose below explains intent and usage, not new values._

## Brand & Style

OUI Scout is a single-purpose instrument that lives in the Chrome toolbar. It does one job — turn a pasted MAC into the three shapes engineers use, and name the vendor — and it should feel like a pane of the browser rather than a separate app: system type, system light/dark, no marketing chrome, no onboarding, no settings.

The visual posture is **outcome-forward**. In every other respect the surface is monochrome — greys and system ink only — and the single moment of color in the entire product is the *result*: green when a vendor is found, amber when a valid MAC matches nothing, red when the paste is not a MAC at all. The result should read at a glance, before the words do.

Two consequences of that posture, taken deliberately during Discovery:

- **No brand accent, and specifically no blue.** The PRD's provisional "approximate Chrome blue" note is superseded: a neutral focus ring carries interaction, and status color carries meaning. Nothing else is colored.
- **Loudest, but still one screen.** Type weights and contrast run higher than a purely native treatment so the outcome dominates; the surface stays chrome-free and single-screen.

## Colors

The palette is two systems: a monochrome surface system, and exactly three semantic status triads. There is no fourth status color.

- **Surface / Field / Border / Text / Muted** — the monochrome system, in light and dark pairs (`{colors.surface}`/`{colors.surface-dark}`, `{colors.field}`/`{colors.field-dark}`, `{colors.border}`/`{colors.border-dark}`, `{colors.text}`/`{colors.text-dark}`, `{colors.text-muted}`/`{colors.text-muted-dark}`). Field fills inputs and format rows; border draws every hairline; muted carries placeholders, field labels, and empty readouts.
- **Found triad — green (`{colors.found-fg}` / `{colors.found-bg}` / `{colors.found-border}`).** Used only for a resolved vendor: the banner, the copy-confirmation state, and the format-row rail.
- **Miss triad — amber (`{colors.miss-fg}` / `{colors.miss-bg}` / `{colors.miss-border}`).** Used only for a valid MAC whose prefix is absent — "Unknown vendor" (FR-6). Distinct enough from found that the two never blur.
- **Invalid triad — red (`{colors.invalid-fg}` / `{colors.invalid-bg}` / `{colors.invalid-border}`).** Used only for non-MAC input (FR-2): the field border, the banner, and the inert row rails.
- **Focus ring (`{colors.focus-ring}` / `{colors.focus-ring-dark}`)** — the neutral ink color, not blue and not a status color. Focus is a navigation state, not an outcome.

**Contrast targets.** Banner foreground-on-fill and body text meet WCAG AA (≥ 4.5:1) in both modes: `{colors.found-fg}` on `{colors.found-bg}`, `{colors.miss-fg}` on `{colors.miss-bg}`, `{colors.invalid-fg}` on `{colors.invalid-bg}`, `{colors.text}` on `{colors.surface}`, and their dark counterparts. Because status is *also* carried by a text label, the color pair is reinforcement, not the sole signal.

Avoid: a blue or brand accent; gradients; a second accent; using status color for anything that is not an outcome (no colored hover on neutral chrome, no colored icons, no colored branding).

## Typography

System UI stack throughout — OUI Scout uses the platform font, never a webfont. Roles:

- **Body (`{typography.body}`)** — 14px/400; placeholders and secondary prose.
- **MAC input (`{typography.mac-input}`)** — 14px/700, rendered uppercase. The pasted value reads as a value, not as prose.
- **Readout (`{typography.readout}`)** — 13.5px/700 tabular figures for the three format values and the banner value, so hex columns line up.
- **Field label (`{typography.field-label}`)** — 10px/800 uppercase: the format names (Colon / Plain / Cisco-dot).
- **State label (`{typography.state-label}`)** — 12px/800 uppercase, wide tracking: the outcome word (Found / Not found / Invalid). This is the text that makes status color redundant, satisfying 1.4.1.
- **Prefix (`{typography.prefix}`)** — 11px/700 tabular: the OUI prefix queried, right-aligned in the banner.
- **Button (`{typography.button}`)** — 11.5px/800: "Copy" / "Copied".
- **Wordmark (`{typography.wordmark}`)** — 12.5px/700: "OUI Scout".

No display sizes, no serif, no italic. Uppercase is reserved for the input value and the two micro-label roles; it is a structural signal, not decoration.

## Layout & Spacing

Fixed-width single column: a **360px** popup (well inside Chrome's 800×600 popup ceiling). Shell padding `{spacing.3}` (12px); internal rhythm on the 4 / 8 / 12 / 16 scale (`{spacing.1}`–`{spacing.4}`).

Vertical order is fixed: wordmark → MAC input → result banner → three format rows. Vertical gaps sit at `{spacing.2}`–`{spacing.3}`; within a row, label-over-value uses `{spacing.1}`. Content never scrolls in v1 — the whole surface fits without it.

## Elevation & Depth

Flat. The only shadow is the popup shell's soft `0 1px 3px` shadow (`{components.popup-shell.shadow}`), which reads as the popup edge against the page. The banner and format rows are separated by **tone**, a 1px `{colors.border}` hairline, and the 4px status rail — never by shadow. No layered elevation, no hover lift.

## Shapes

Three radii: `{rounded.sm}` (6px) on copy buttons, `{rounded.md}` (8px) on the input and format rows, `{rounded.lg}` (10px) on the banner and popup shell. `{rounded.full}` exists only for the status lamp and the mock frame's decorative window dots. No pill-shaped buttons, no fully-rounded surfaces — the corners read "tool," not "consumer app."

## Components

Visual specs. Behavioral rules live in `EXPERIENCE.md.Component Patterns`.

- **Popup shell (`{components.popup-shell}`)** — the single surface; 360px, `{rounded.lg}`, on `{colors.surface}` with a 1px `{colors.border}` frame. Its soft shadow is the only elevation in the product. One per screen.
- **MAC input (`{components.mac-input}`)** — the only editable control, full-width on `{colors.field}`. Typed/pasted text is uppercased (`{typography.mac-input}`); the placeholder uses `{colors.text-muted}`. Focus uses `{colors.focus-ring}`; invalid input uses `{colors.invalid-fg}` on border and text.
- **Result banner (`{components.result-banner}`)** — the hero. One row: a `status-lamp`, a stack of `state-label` over the value, and the `prefix` pinned right. Fill/border/foreground switch as a unit per the `found` / `miss` / `invalid` sub-tokens. Exactly one banner, always present once there is input.
- **Status lamp (`{components.status-lamp}`)** — a filled 13px circle in `currentColor` with a soft same-color halo. The outcome's color source; decorative (the `state-label` carries the meaning).
- **Format row (`{components.format-row}`)** — `{colors.field}` fill, 1px `{colors.border}`, `{rounded.md}`, with a 4px left rail in the active status color. Holds a `field-label` over a `readout` value, and a `copy-button`. Empty values show `{colors.text-muted}`.
- **Copy button (`{components.copy-button}`)** — outlined, `{rounded.sm}`, `{typography.button}`. Default ink on `{colors.border}`; hover border/text take the active status color (`{components.copy-button.hover-foreground-found}` / `-miss` / `-invalid`); on success it briefly fills with the found triad (`{components.copy-button.copied-background}` / `{components.copy-button.copied-border}` / `{components.copy-button.copied-foreground}`); when input is invalid the disabled style applies (`{components.copy-button.disabled-foreground}` at `{components.copy-button.disabled-opacity}`).
- **Wordmark** — a text element, not a component: the string "OUI Scout" at `{typography.wordmark}`. No logo, no icon, no lockup.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Use color only to carry the outcome (found / miss / invalid) | Introduce a blue or brand accent, or a second accent |
| Keep the outcome legible from type + text label alone | Rely on color alone to convey state |
| Keep the surface monochrome everywhere except the outcome | Color icons, hover states, or chrome for decoration |
| Use system font and system light/dark surfaces | Ship a webfont or force a theme |
| Reserve uppercase for the input value and micro-labels | Set body or prose in uppercase |
| Align hex with tabular figures | Use proportional figures for readouts |
| Keep radii at 6 / 8 / 10; shadow only on the shell | Use pills, gradients, or layered elevation |
| Let the result dominate via weight and contrast | Add marketing chrome, onboarding, or settings screens |
