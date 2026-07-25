# Hork UX / Visual System

Working agreement for how Hork should look, feel, and behave. The enforceable
summary lives in [`.cursor/rules/ux-standards.mdc`](../.cursor/rules/ux-standards.mdc);
this doc holds the rationale.

## North star

Slack-class utility chat for short-lived groups (trips, conferences). People
should love it because it works great and feels great — not because of the
brand. Snappy beats fancy; honest states beat clean-looking blanks.

## Information architecture

| Route | Purpose |
| ----- | ------- |
| `/` | Your groups (membership-scoped) + create CTA |
| `/:groupId` | Chat. Non-members get an explicit join prompt |
| `/g/:slug` | Invite link → resolves slug → redirects to the group |
| `*` | Not-found page with a way home |

Everything secondary (share, members, rename, new group, change name, sign-in)
is a `QuickModal` — modal on desktop, bottom drawer on mobile. No settings
pages, no nested routes.

### Shell

- **Desktop (md+):** persistent left sidebar (brand, New group, group nav,
  user + appearance in the footer). Chat pane content is capped at ~760px for
  readable line length.
- **Mobile:** compact top header on home; group pages have exactly one bar
  (back, title, share, overflow, avatar). Never stack two headers.

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
onto `group_members` for the roster and onto `messages` at send time.

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
