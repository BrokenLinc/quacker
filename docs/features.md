# Features

Quacker is a private, ad-hoc group chat for trips and conferences.

## Implemented

| Feature | Description |
| ------- | ----------- |
| SMS OTP auth | Twilio Verify sign-in via phone number |
| User avatars | Gravatar v3 SHA256 avatars from sign-in email; Chakra initials fallback |
| Group list | Browse all groups on home page |
| Create group | Name a group; auto short slug for sharing |
| Group chat | Markdown messages with live realtime feed |
| Membership | Auto-join on visit; all members can post |
| Manage group | Creator can rename group |
| Share | Short URL `/g/:slug`, QR code, copy link, native share |
| Chirp notifications | Tab title flash + sound when tab is backgrounded |
| Dark mode | System-aware theme toggle |
| PWA install | Web manifest, app icons, install banner (Chrome/Android + iOS Add to Home Screen hint) |
| Web Push (scaffold) | Service worker + subscription table + edge function stub |

## Auth (MVP)

- **SMS OTP** — enter phone, verify 6-digit code via Twilio Verify
- **Sign-in UI** — header **Log in** opens a modal; protected pages show the same form inline until authenticated
- Display name defaults to last 4 digits of phone (`···1234`)
- Legacy email users keep Gravatar avatars; phone users use initials

## Deferred

- Google OAuth
- SMS OTP
- Permissions UI tab
- Full Web Push delivery (needs VAPID keys)
