# Roadmap

## Shipped (Phase 5)

- Short slug URLs (`/g/:slug`) + share sheet
- Chirp tab notifications (zero permission)
- Web Push scaffold (SW + subscriptions table + edge function stub)
- Twilio Verify SMS OTP auth + `hork.us` production domain

## Tier 1 — next

- Custom slug for creators (`/g/wwdc2026`)
- Downloadable QR card PNG
- Display name prompt on first sign-in

## Tier 2 — requires user gates

| Feature | Gate |
| ------- | ---- |
| Google OAuth | Google Cloud OAuth app |
| SMS nudges / notifications | Twilio Messaging (beyond Verify) |
| Full Web Push delivery | VAPID keys + edge function web-push lib |

## Tier 3 — ideas

- **Quack Codes** — `!quack 42` filters notifications to subscribers with code 42
- Live pin / broadcast chirp for "meet at lobby"
- Permissions UI (roles beyond creator/member)
- Message reactions
- Ephemeral groups (auto-expire after N days)
