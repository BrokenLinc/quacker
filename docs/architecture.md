# Architecture

## Stack

- **Frontend:** React 19, Vite 6, SWC, Chakra UI v2, FontAwesome
- **Backend:** Supabase (Postgres, Auth, Realtime, Edge Functions)
- **Deploy:** Vercel (static SPA) + GitHub Actions

## Routes

| Path | Page |
| ---- | ---- |
| `/` | Home — group list |
| `/suggestions` | Product suggestions (list + upvote) |
| `/suggestions/new` | Create a suggestion |
| `/:groupId` | Group chat |
| `/g/:slug` | Short link → resolves to group |

Register `/suggestions*` **before** `/:groupId` so room catch-all does not swallow them.

## Data model

```
groups
  id, slug, creator_id, name, author_name, author_photo_url, created_at

group_members
  group_id, user_id, role (creator|mod|member), notify_level (all|announcements|none),
  display_name, photo_url, phone_last4, last_viewed_at
  -- role=mod is room staff (rename, silence, mod/unmod); cleared on leave/rejoin

group_silences
  group_id, user_id, display_name, photo_url, silenced_by, created_at
  -- persistent mute; survives leave/rejoin; blocks message insert until removed

messages
  id, group_id, author_id, author_name, author_photo_url, text, is_announcement, created_at
  -- author_name/photo stamped at send (notifications + left-member fallback);
  -- chat UI prefers live group_members.display_name; phone_last4 on member profile sheet

suggestions
  id, author_id, author_display_name, title, body,
  category (feature_request|bug_report|other),
  status (new|under_review|in_development|done),
  vote_count, created_at, updated_at
  -- author auto-upvoted via trigger; list sorted vote_count desc, created_at desc
  -- INSERT RLS pins status='new' and vote_count=0 (clients must not seed counters/workflow)

suggestion_votes
  suggestion_id, user_id   -- one upvote per user; toggle by insert/delete

user_notification_prefs
  user_id, push_enabled

push_subscriptions
  user_id, endpoint, p256dh, auth   -- device-level (group_id unused)
```

**SuperAdmin:** `is_superadmin()` (SQL) + `isSuperAdminPhone()` (client) match digit-normalized phone `13522622098`. Status updates are RLS-gated to SuperAdmin only.

**RLS habit:** for any table with denormalized counters or workflow columns, INSERT `WITH CHECK` must require the safe defaults — ownership alone (`author_id = auth.uid()`) does not stop a client from writing `vote_count` / `status`.

Unread badges: RPC `unread_message_counts()` — messages after `last_viewed_at` from others, filtered by `notify_level` (`none` → 0). Author column is `messages.author_id` (not `user_id`). Total across groups also drives tab title `(N)` prefix and PWA icon badge via `src/lib/notifications/documentChrome.ts` (`navigator.setAppBadge` when supported).

## Push delivery

1. Client opt-in Switch → OS permission → store endpoint in `push_subscriptions`
2. `messages` INSERT trigger → `pg_net` → Edge `notify-new-message`
3. Filter by `push_enabled` + per-group `notify_level` + skip author
4. `web-push` with VAPID; SW: if any window focused → `postMessage` (in-app toast for other groups); else OS notification

Setup: `scripts/setup-notify-webhook.sh` + `VITE_VAPID_PUBLIC_KEY` / `yarn sync:vercel-env`

## Realtime

Supabase `postgres_changes` on `messages` and `groups` tables. Hooks in `src/api/` refetch or patch local state on events.

## Auth flow

1. User enters phone → Twilio Verify SMS OTP via Edge Functions
2. Code verified → Supabase session minted (`auth-verify-otp`)
3. RLS policies enforce membership for writes

## Folder layout

```
src/
  api/           # group, message, suggestions hooks
  components/    # AppShell, etc.
  lib/supabase/  # client, auth, types
  lib/suggestions/  # Fuse filter helpers
  lib/notifications/  # chirp, push subscribe
  pages/         # route pages
  routing/       # react-router setup
  ui/            # Chakra barrel + custom components
supabase/
  migrations/    # schema + RLS
  functions/     # edge functions
  .temp/         # CLI local state (gitignored)
  .branches/     # CLI branch metadata (gitignored)
tests/e2e/       # Playwright + Axe
```
