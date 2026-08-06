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
| `/suggestions/:suggestionId` | Suggestion detail + comment thread |
| `/:groupId` | Group chat |
| `/g/:slug` | Short link → resolves to group |

Register `/suggestions/new` and `/suggestions/:suggestionId` **before**
`/suggestions` and `/:groupId` so more-specific paths win.

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
  vote_count, comment_count, created_at, updated_at
  -- author auto-upvoted via trigger; list sorted vote_count desc, created_at desc
  -- INSERT RLS pins status='new', vote_count=0, comment_count=0
  -- comment_count maintained by trigger on suggestion_comments

suggestion_votes
  suggestion_id, user_id   -- one upvote per user; toggle by insert/delete

suggestion_comments
  id, suggestion_id, author_id, author_display_name, body, created_at
  -- flat chronological thread on the suggestion detail page

user_notification_prefs
  user_id, push_enabled

push_subscriptions
  user_id, endpoint, p256dh, auth   -- device-level (group_id unused)
```

**SuperAdmin:** `is_superadmin()` (SQL) + `isSuperAdminPhone()` (client) match digit-normalized phone `13522622098`. Status updates are RLS-gated to SuperAdmin only.

**RLS habit:** for any table with denormalized counters or workflow columns, INSERT `WITH CHECK` must require the safe defaults — ownership alone (`author_id = auth.uid()`) does not stop a client from writing `vote_count` / `status`.

**Public export:** Edge Function `suggestion-export` (`GET ?id=<uuid>`, `verify_jwt: false`) returns one suggestion as JSON via RPC `suggestion_export`. App-facing links use `/api/suggestion-export` on the Vercel host (Preview or `yowl.us`), which proxies to the env’s Supabase and injects the publishable anon key.

**GitHub Issues:** `suggestions` INSERT → Vault `suggestion_github_webhook_*` → Edge `suggestion-github-issue` (secret required; skip post if Vault URL/secret missing). SuperAdmin can also invoke the same function from the detail page (JWT). Issue body links use the env’s app origin (`PUBLIC_APP_URL` / `PUBLIC_APP_URL_DEV`), not localhost. Setup: `scripts/setup-suggestion-github-webhook.sh`. Webhook pitfalls: [agent-operations](agent-operations.md#webhook-setup-pitfalls-any-vault--edge-script).

Unread badges: RPC `unread_message_counts()` — messages after `last_viewed_at` from others, filtered by `notify_level` (`none` → 0). Author column is `messages.author_id` (not `user_id`). Total across groups also drives tab title `(N)` prefix and PWA icon badge via `src/lib/notifications/documentChrome.ts` (`navigator.setAppBadge` when supported).

## Push delivery

1. Client opt-in Switch → OS permission → store endpoint in `push_subscriptions`
2. `messages` INSERT trigger → `pg_net` → Edge `notify-new-message`
3. Filter by `push_enabled` + per-group `notify_level` + skip author
4. `web-push` with VAPID; the payload carries the **full message row**, not just
 title/body, so clients can merge it without a network round-trip
5. SW records the message in an IndexedDB inbox, `postMessage`s **all** clients
 (tagged with whether they were focused), and only shows an OS notification
 when nothing is focused
6. `notificationclick` asks the client to route via `postMessage`
 (`yowl-navigate`) and only falls back to `client.navigate()` / `openWindow()`
 when no client acknowledges — a document reload would throw away the warm cache

Setup: `scripts/setup-notify-webhook.sh` + `VITE_VAPID_PUBLIC_KEY` / `yarn sync:vercel-env`

## Data layer

TanStack Query v5 owns all server state. Cached rooms, messages, membership, and
unread counts persist to IndexedDB, so re-entering a room or cold-launching the
PWA paints from cache instead of a skeleton.

```
src/lib/query/client.ts       # queryClient defaults + IndexedDB persister
src/lib/query/QueryProvider.tsx  # PersistQueryClientProvider (mounted in App)
src/api/queryKeys.ts          # key factory + PERSISTED_QUERY_ROOTS allowlist
src/api/cache.ts              # invalidate*/retry* helpers for mutations and UI
src/api/messageSync.ts        # pure merge/dedupe/trim + delta window helpers
```

- Hooks return the same `[data, loading, error]` tuple as before via
 `asHookResult`. **`loading` maps to `isPending`** (no data at all), not
 `isFetching` — that distinction is what removes the room re-entry skeleton.
- Only the families in `PERSISTED_QUERY_ROOTS` are dehydrated. Auth and
 one-shot lookups must never be persisted.
- Messages sync incrementally: cold fetch is the newest `limit` rows; warm
 fetches ask for `created_at >= lastKnown - overlap` and merge by `id`.

## Realtime

`src/lib/realtime/manager.ts` keeps **one reference-counted channel per logical
topic** and writes `payload.new` straight into the query cache — no refetch per
event. Topics are declared next to their row mappers in `src/api/*.ts`;
components subscribe with `useRealtimeTopic`. The manager also exposes socket
health so the lifecycle module can detect a dead websocket after backgrounding.

## Service worker

`src/sw.ts` is built by `vite-plugin-pwa` with `strategies: 'injectManifest'` —
the plugin only injects the precache manifest; the push, `notificationclick`,
and inbox handlers are ours. Output is `dist/sw.js`, served with
`Cache-Control: must-revalidate` (see [`vercel.json`](../vercel.json)) so a new
worker is always noticed.

- App shell precached; every navigation falls back to `index.html`, so a cold
 launch works offline and deep links resolve without the network.
- Remote Gravatar avatars use CacheFirst with a bounded expiration.
- `manifest: false` — [`public/manifest.webmanifest`](../public/manifest.webmanifest)
 and the iOS meta in `index.html` stay hand-tuned.
- `registerType: 'prompt'`: a new build never activates itself. `UpdatePrompt`
 toasts and the user accepts, then `SKIP_WAITING` activates and the page
 reloads once. Registration lives at module scope in
 `src/lib/pwa/useServiceWorkerUpdate.ts` — see the comment there for why.
- `devOptions.enabled` keeps `/sw.js` present in dev so the push opt-in switch
 works locally. Dev output lands in `dev-dist/` (gitignored).

## App lifecycle

`src/lib/lifecycle/appLifecycle.ts` is mounted once in `AppShell` and owns
resume/suspend behavior: reconnect realtime, refresh the auth session, drain the
service worker push inbox, flush the outbox, and invalidate queries after a long
absence. It also purges all local data (query cache, IndexedDB, outbox, push
inbox) on sign-out or user switch so a shared device does not leak rooms.

`src/lib/outbox/` is a durable IndexedDB send queue keyed by a client-generated
message `id`, which makes retries idempotent. Sends while offline show as
`queued`, retry with backoff on reconnect, and survive reload.

## Auth flow

1. User enters phone → Twilio Verify SMS OTP via Edge Functions
2. Code verified → Supabase session minted (`auth-verify-otp`)
3. RLS policies enforce membership for writes

## Folder layout

```
src/
  api/           # group, message, suggestions hooks; queryKeys, cache, messageSync
  components/    # AppShell, ConnectionStatus, etc.
  lib/supabase/  # client, auth, types
  lib/query/     # queryClient, IndexedDB persister, QueryProvider
  lib/realtime/  # reference-counted channel manager + useRealtimeTopic
  lib/lifecycle/ # resume/suspend orchestrator, connection state
  lib/outbox/    # durable send queue + send error classification
  lib/suggestions/  # Fuse filter helpers
  lib/notifications/  # chirp, push subscribe, push inbox
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
