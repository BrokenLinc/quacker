# Features

Quacker is a private, ad-hoc group chat for trips and conferences.

## Implemented

| Feature | Description |
| ------- | ----------- |
| Magic-link auth | Email OTP sign-in via Supabase (no password in prod) |
| Group list | Browse all groups on home page |
| Create group | Name a group; auto short slug for sharing |
| Group chat | Markdown messages with live realtime feed |
| Membership | Auto-join on visit; all members can post |
| Manage group | Creator can rename group |
| Share | Short URL `/g/:slug`, QR code, copy link, native share |
| Chirp notifications | Tab title flash + sound when tab is backgrounded |
| Dark mode | System-aware theme toggle |
| Web Push (scaffold) | Service worker + subscription table + edge function stub |

## Auth (MVP)

- **Magic link only** — enter email, click link in inbox (Inbucket locally)
- Display name defaults to email local-part

## Deferred

- Google OAuth
- SMS OTP
- Permissions UI tab
- Full Web Push delivery (needs VAPID keys)
