# Features

Quacker (code name) is a private, ad-hoc room chat for trips and conferences. It ships to users as **Yowl** — user-facing copy uses **Yowl** (capital Y); lowercase **yowl** is only for domains/asset ids (`yowl.us`, `yowl-logo.svg`). "Quacker" stays in infra and config only. In UI copy, chat spaces are **rooms** (code/schema still say `group`).

## Implemented

| Feature | Description |
| ------- | ----------- |
| SMS OTP auth | Twilio Verify sign-in via phone number |
| User avatars | Boring Avatars (beam) from user id; explicit photo URL when set |
| Room list | Browse your rooms on home page |
| Create room | Name a room; auto short slug for sharing |
| Room chat | Markdown messages with live realtime feed; live author names; clock times + day dividers |
| Membership | Explicit join on invite; members can post unless silenced |
| Manage room | Creator and mods can rename; creator can delete; mods/creator silence and mod |
| Moderators | `role=mod` — rename, silence, mod/unmod (not delete room); self-unmod allowed |
| Silence | Persistent mute via `group_silences` (survives leave/rejoin); composer blocked |
| Share | Short URL `/g/:slug`, QR code, copy link, native share |
| Chirp notifications | Tab title flash + sound when tab is backgrounded |
| Unread chrome | Tab title `(N)` prefix + PWA icon badge from total unread across rooms |
| Dark mode | System-aware theme toggle |
| PWA install | Web manifest, app icons, install banner (Chrome/Android + iOS Add to Home Screen hint) |
| Web Push | OS notifications when a message arrives (opt-in Switch; per-room All / Announcements only / None) |

## Auth (MVP)

- **SMS OTP** — enter phone, verify 6-digit code via Twilio Verify
- **Sign-in UI** — chrome-less FTUE (large Yowl logo + tagline + phone); invite links use join-focused heading
- Display name defaults to last 4 digits of phone (`···1234`) until the user chooses a real name
- Tap avatar/name in chat for a profile sheet (`···XXXX`, join date; staff get Silenced / Mod switches)
- Onboarding: **What's your name?** + notifications Switch → organic users get **Start a chat room** (Create / Skip); invitees skip create and continue to the room
- Creator tip well above the message feed (Invite someone + mods tip) until another member joins
- Gravatar module retained under `src/lib/avatars/gravatar.ts` for future email auth

## Deferred

- Google OAuth
- Announcement composer (schema `is_announcement` + `notify_level=announcements` ready; staff will post)
