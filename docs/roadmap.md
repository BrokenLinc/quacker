# Roadmap

## Shipped (Phase 5)

- Short slug URLs (`/g/:slug`) + share sheet
- Chirp tab notifications (zero permission)
- Web Push delivery (VAPID + edge `notify-new-message` + opt-in Switch; per-group notify levels)
- Twilio Verify SMS OTP auth + `yowl.us` production domain

## Tier 1 — next

- Custom slug for creators (`/g/wwdc2026`)
- Downloadable QR card PNG

## Tier 2 — requires user gates

| Feature | Gate |
| ------- | ---- |
| Google OAuth | Google Cloud OAuth app |
| SMS nudges / notifications | Twilio Messaging (beyond Verify) |

## Tier 3 — ideas

- **Announcements** — flag messages; staff (creator/mod) can announce (`is_announcement` placeholder shipped)
- **Quack Codes** — `!quack 42` filters notifications to subscribers with code 42
- Live pin / broadcast chirp for "meet at lobby"
- Message reactions
- Ephemeral groups (auto-expire after N days)
