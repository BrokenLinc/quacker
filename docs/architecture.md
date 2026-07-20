# Architecture

## Stack

- **Frontend:** React 18, Vite 6, SWC, Chakra UI v2, FontAwesome
- **Backend:** Supabase (Postgres, Auth, Realtime, Edge Functions)
- **Deploy:** Vercel (static SPA) + GitHub Actions

## Routes

| Path | Page |
| ---- | ---- |
| `/` | Home — group list |
| `/:groupId` | Group chat |
| `/g/:slug` | Short link → resolves to group |

## Data model

```
groups
  id, slug, creator_id, name, author_name, author_photo_url, created_at

group_members
  group_id, user_id, role (creator|member)

messages
  id, group_id, author_id, author_name, author_photo_url, text, created_at

push_subscriptions
  user_id, group_id, endpoint, p256dh, auth
```

## Realtime

Supabase `postgres_changes` on `messages` and `groups` tables. Hooks in `src/api/` refetch or patch local state on events.

## Auth flow

1. User enters phone → Twilio Verify SMS OTP via Edge Functions
2. Code verified → Supabase session minted (`auth-verify-otp`)
3. RLS policies enforce membership for writes

## Folder layout

```
src/
  api/           # group + message hooks
  components/    # Header, etc.
  lib/supabase/  # client, auth, types
  lib/notifications/  # chirp, push subscribe
  pages/         # route pages
  routing/       # react-router setup
  ui/            # Chakra barrel + custom components
supabase/
  migrations/    # schema + RLS
  functions/     # edge functions
tests/e2e/       # Playwright + Axe
```
