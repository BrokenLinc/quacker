---
name: quacker-ops
description: >-
  Operational playbook for the Quacker agent-operated repo: bootstrap, verify,
  deploy, Supabase migrations, secret propagation, and user gate unblocking.
---

# Quacker Ops

Use when operating, deploying, or debugging the Quacker codebase.

## Bootstrap

```bash
yarn bootstrap   # scripts/bootstrap.sh
```

Creates `.env.local` from `.env.example` if missing. Starts local Supabase when CLI is available.

## Verify (definition of done)

```bash
yarn verify      # scripts/verify.sh
```

Runs lint, build, vitest, playwright. Must pass before marking work complete.

## Deploy

```bash
yarn deploy      # scripts/deploy.sh
```

Requires in `.env.local`: `SUPABASE_PROJECT_ID`, `SUPABASE_ACCESS_TOKEN`. Optional: `VERCEL_TOKEN`, `VITE_APP_URL`.

## Secret propagation (from `.env.local`)

```bash
gh secret set SUPABASE_ACCESS_TOKEN < <(grep SUPABASE_ACCESS_TOKEN .env.local | cut -d= -f2-)
gh secret set SUPABASE_PROJECT_ID < <(grep SUPABASE_PROJECT_ID .env.local | cut -d= -f2-)
gh secret set SUPABASE_SERVICE_ROLE_KEY < <(grep SUPABASE_SERVICE_ROLE_KEY .env.local | cut -d= -f2-)
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
```

## Supabase local dev

```bash
supabase start
# Studio: http://127.0.0.1:54323
# Inbucket (magic links): http://127.0.0.1:54324
```

Local anon URL/key are printed by `supabase start`. Use them in `.env.local` for local dev.

## User gate unblocking

| Blocked | Ask user for | Then |
| ------- | ------------ | ---- |
| No Supabase | Project URL, anon key, service role, project ref, access token | Add to `.env.local`, `supabase link` |
| No Vercel | Token, org ID, project ID | Add to `.env.local`, `vercel link` |
| Magic link redirect fails | Production URL | Update `supabase/config.toml` `site_url` + `additional_redirect_urls` |

## Failure recovery

- **Migration failed**: read error, fix SQL, `supabase db reset` locally, re-run verify
- **E2e flaky on realtime**: use `expect.poll` in tests; check RLS policies
- **Build fails on types**: re-run `supabase gen types typescript --local`
