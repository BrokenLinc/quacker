# Yowl UX / Visual System

Working agreement for how Yowl should look, feel, and behave. The enforceable
summary lives in [`.cursor/rules/ux-standards.mdc`](../.cursor/rules/ux-standards.mdc);
this doc holds the rationale. Brand casing: user-visible **Yowl**; domain/assets
`yowl.us` / `yowl-…`; never lowercase **yowl** as UI brand text — see
[`.cursor/rules/quacker-core.mdc`](../.cursor/rules/quacker-core.mdc).

## North star

Slack-class utility chat for short-lived groups (trips, conferences). People
should love it because it works great and feels great — not because of the
brand. Snappy beats fancy; honest states beat clean-looking blanks.

## Information architecture

| Route | Purpose |
| ----- | ------- |
| `/` | Your rooms (membership-scoped) + create CTA |
| `/:groupId` | Chat. Non-members get an explicit join prompt |
| `/g/:slug` | Invite link → resolves slug → redirects to the room |
| `*` | Not-found page with a way home |

Everything secondary (share, members, rename, new room, change name, sign-in)
is a `QuickModal` — modal on desktop, bottom drawer on mobile. No settings
pages, no nested routes.

### Shell

- **Desktop (md+):** persistent left sidebar (brand + plus, room nav,
  user + appearance in the footer). Chat pane content is capped at ~760px for
  readable line length.
- **Mobile:** compact top header on home (brand, avatar); room pages have
  exactly one bar (back, title, share, overflow, avatar). Never stack two
  headers. "New room" is a plus icon in the page header (and sidebar brand
  row on desktop).

## Color system

Defined in `src/theming/ThemeProvider.tsx`.

- **Purple-tinted neutrals** (`gray.*` override): all chrome, surfaces,
  borders. This is where the brand lives — quiet, everywhere.
- **`brand.*` purple:** identity accents — wordmark, selected nav
  (`nav.selected`), install banner.
- **`action.*` teal:** the single interaction hue — primary buttons
  (`preset="primary"`), links, switches, focus rings, send. If it's teal, you
  can tap it.
- **Status hues stay free:** green success, red error/destructive, amber
  warning, blue info. Purple/teal never signal status; status hues never
  decorate chrome.

Semantic tokens: `surface.canvas` (page), `surface.raised` (cards, bars,
sheets), `surface.sunken` (sidebar, input wells), `border.subtle`,
`text.muted`, `nav.selected`. Light and dark are equal citizens (system
default).

## Feel: soft native, light skeuomorphism

- Filled (slightly sunken) inputs with a teal focus ring
- Buttons depress 1px on press
- Sheets/menus get real elevation; list rows get borders, not shadows
- Rounded-friendly type: Nunito Sans Variable
- No gradients, gloss, oversized radii, or decorative shadows

## Chat mechanics

- Chronological order, composer pinned to the bottom, full-height frame
- Enter sends; Shift+Enter for a newline; send button as secondary affordance
- Optimistic sends: pending bubble at ~55% opacity with "sending…"; failure
  restores the composer text and toasts
- Consecutive messages from the same author within 5 minutes collapse under
  one header
- Auto-scroll on open, on own sends, and on new messages when already near the
  bottom (don't yank the scrollback reader)

## Identity

Phone-only users default to `···1234` — treat that as a bug, not a name. The
sign-in flow asks "What should people call you?" right after first OTP verify
(skippable); "Change name" lives in the avatar menu. Names are denormalized
onto `group_members` for the roster and onto `messages` at send time. Message
headers show the live display name only — tap avatar or name for a profile
sheet (`···XXXX`, join date, creator badge when known).

## Inputs

Make invalid input hard to type, not just hard to submit. Prefer:

| Pattern | When | In this repo |
| ------- | ---- | ------------ |
| Masked input | Fixed digit/format strings (phone, zip, SSN) | `UI.MaskedInput` + `react-hook-mask`; masks in `subtypeMetas` |
| Filtered / typed | Allowed character set is small (names) | Strip on change + `maxLength` |
| Length limit | Short-form content (chat) | TipTap `CharacterCount` + visible `n/max` when typing |
| Purpose-built control | Structure or a11y beats a single text box | OTP → Chakra `PinInput`; closed sets → combobox/select; money/date → form subtypes |

Custom controls (OTP pin fields, comboboxes, masked phones) are preferred when
they reduce mistakes and map better to assistive tech — do not default to a
plain text field “because validation will catch it.” Reuse `src/forms/` and
`@@ui` primitives before adding another masking library.

## State handling

| State | Pattern |
| ----- | ------- |
| Loading | Skeletons shaped like the final layout |
| Empty | `UI.EmptyState` with an icon + CTA |
| Error | `UI.ErrorState` with retry, or a toast for action failures |
| Submitting | Button `isLoading`, disabled double-submit |
| Destructive | `useConfirmation({ isDestructive: true })` |

Blank screens are bugs. `return null` on error/empty is banned in page-level
components.

## Native / PWA

Yowl installs as a standalone PWA. Treat phones like a native shell: edge-to-edge
chrome, keyboard-safe chat, and touch-first overlays — not a shrunk desktop page.

### Viewport and keyboard

Implementation: `index.html` (geometry + `html.standalone`),
`src/lib/pwa/canvasColors.ts`, `useVisualViewportHeight.ts`.

- Lock document scroll: `html`/`body` `overflow: hidden`. App shell is
  `position: absolute; inset: 0` inside `#root`.
- **Keyboard closed / browser:** `#root` is `position: fixed; inset: 0`.
- **Keyboard closed / iOS standalone:** WebKit’s lying viewport
  ([bug 254868](https://bugs.webkit.org/show_bug.cgi?id=254868)) makes
  `bottom: 0`, `dvh`, and `-webkit-fill-available` short of the home indicator
  (`innerHeight` ≈ 812 on a 874 screen → canvas gap on **every** page). Use
  classic `100vh` on `#root` (`html.standalone` from an early script). Composer
  pad once: `0.75rem + env(safe-area-inset-bottom)` via `--app-composer-pb`.
- **Keyboard open:** only when VV shrinks **and** an editable is focused. JS
  sets `#root` `top`/`height` from `visualViewport`; `--app-composer-pb: 0`.
- On VV `resize`/`scroll` + focus change, `scrollTo(0,0)` then re-apply.
  Do not document-scroll to inputs.
- Prefer `interactive-widget=resizes-content` in the viewport meta where
  supported (Chrome). Safari ignores it; the VV + fixed-root path covers iOS.

#### Anti-patterns (failed approaches — do not reintroduce)

| Tempting fix | Why it fails |
| --- | --- |
| Size closed `#root` from `visualViewport` / `innerHeight` | Lying viewport is already short; shell stops above the HI |
| `bottom: 0` + `height: -webkit-fill-available` / `100dvh` on standalone `#root` | Same lying height; over-constrained height wins over `bottom` |
| Drop composer `safe-area-inset-bottom` to “fix double pad” | Outer gap is the short shell, not double inset; content then sits under the HI once `100vh` is correct |
| Treat VV shrink alone as keyboard-open | Standalone often has a large VV delta with no keyboard |
| Trust screenshot captions / vision descriptions of the bottom gap | Sample pixels (`surface.raised` vs `surface.canvas` at bottom center) |
| Change JS only and retest PWA without wiping webclip Storage | Installed PWAs cache `index.html`; wipe Storage or reinstall |

**Symptom check:** `screen.height - innerHeight ≈ 60` and `#root.getBoundingClientRect().height === innerHeight` while a canvas strip sits under chrome → missing `html.standalone` / still on `bottom: 0`. After the fix, raised chrome (composer) samples to the physical bottom; safe-area is **inside** that raised fill.

### First paint (no white flash)

- Early in `index.html` `<head>`: `<meta name="color-scheme" content="dark light">`
  plus inline CSS that defaults `html` to dark **raised** (`#302A44`), with a light
  `prefers-color-scheme` override (`#FFFFFF`).
- Inline body script (before the Vite module) applies stored
  `chakra-ui-color-mode` (or system) to `data-theme`, `color-scheme`,
  document = raised, `#root` = canvas — same role as Chakra’s `ColorModeScript`,
  but before React. Do not rely on a React-mounted `ColorModeScript` alone.
- Wipe installed PWA Storage after `index.html` boot changes (webclip cache).

### Document vs content paint (Safari accessory)

iOS Safari’s keyboard accessory bar (and overscroll rubber-band) sample the
**document** background (`html`/`body`), not `#root`. Composer / headers use
`surface.raised`, so:

| Plane | Token | Where |
| ----- | ----- | ----- |
| Document / UA chrome | `surface.raised` | `html`, `body`, `theme-color` |
| App content | `surface.canvas` | `#root`, `AppShell` |

Do not paint `html`/`body` with canvas — that leaves a darker strip under the
composer when the keyboard is open. Keep content areas on canvas so the chat
plane stays distinct from chrome.

### Predictable chrome containers

Fixed-size shells (group top bar, composer, sidebar column) must **mount at
their known dimensions immediately**. Put skeletons or placeholders *inside*
the frame while auth/group data loads — never withhold the frame until ready
(that causes header/layout pop-in on group chat).

### Safe areas and system chrome blending

- Paint `html` / `body` with `surface.raised` (Safari accessory / overscroll);
  `#root` / shell with `surface.canvas` for the content plane.
- Extend UI under safe areas; pad **chrome** (headers, composer, fixed banners,
  drawer footers) with `env(safe-area-inset-*)` — do not double-subtract insets
  from both body padding and shell height.
- `theme-color`, manifest `theme_color`, and `background_color` track **raised**
  (light + dark). Sync `theme-color` when the in-app color mode changes.
  Tests: Playwright `a11y-home` (both modes via localStorage) + `theme-modes`
  (sidebar toggle); Maestro keyboard flows screenshot light then dark in one run.
- With edge-to-edge painting, use `apple-mobile-web-app-status-bar-style` =
  `black-translucent`.
- **Icons / splash / share:** source art in `img-src/`; shipping assets under
  `public/` (`icon.svg`, `icons/*.png`, `splash/*-{light,dark}.png`,
  `favicon.ico`, `og-image.png`, `safari-pinned-tab.svg`). Regenerate with
  `yarn generate:pwa-assets` (needs ImageMagick). iOS launch images are wired
  via `apple-touch-startup-image` in `index.html`.

### Overlays

- Every overlay has an obvious dismiss (X and/or Cancel). Outside click and Esc
  remain available unless a flow intentionally requires an explicit choice —
  still keep Cancel.
- **Small dialogs** (menus, popovers, short action lists) → `MorphingPopover`
  (`src/ui/MorphingPopover.tsx`): shared `layoutId` morph from trigger → panel.
  Account menu is the reference consumer. Uses a 9-point overlapping `anchor`
  (default `center`) so trigger and panel share a point, then clamps into the
  visual viewport.
- **Larger dialogs** (forms, listings, multi-field / multi-step content) →
  `QuickModal` (modal ≥ md, tray/drawer on mobile). Confirmations use the
  **same** mobile drawer shell — not a centered desktop modal on phones.
- **Trigger-aligned placement (trays):** QuickModal mobile trays open from the
  same edge as the trigger (header / top chrome → top tray; sidebar footer /
  bottom chrome → bottom tray).
- Morphing spring counts toward the intentional micro-motion budget
  (~≤400ms). Honor `prefers-reduced-motion` (near-instant open/close).

### Menus

- Prefer `MorphingPopover` for short action lists on **all** viewports
  (Account, room title options, message-author profile).
- Longer navigational lists (e.g. rooms) may use a floating drawer.
- Legacy `ActionSheet` / Chakra `Menu` remain only until remaining call
  sites migrate — new small menus should not add more of those.
- On room pages, the **title is the options control** (name + ellipsis) — no
  separate ⋯ button.
