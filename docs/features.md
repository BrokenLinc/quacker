# Features

Quacker is a private, ad-hoc group chat for trips and conferences.

## Implemented

| Feature | Description |
| ------- | ----------- |
| Email OTP auth | Enter email, verify 6-digit code in-app (PWA-safe; no magic link) |
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

- **Email OTP only** — enter email, type 6-digit code from inbox (Inbucket locally at `http://127.0.0.1:54324`)
- All routes require sign-in via `RequireAuth` wrapper
- Display name defaults to email local-part
- Avatar defaults to [Gravatar](https://gravatar.com) (SHA256 hash of email); see [`docs/gravatar-llms.txt`](gravatar-llms.txt)

## Deferred

- Google OAuth
- SMS OTP
- Permissions UI tab
- Full Web Push delivery (needs VAPID keys)
