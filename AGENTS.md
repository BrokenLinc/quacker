# AGENTS.md — Quacker Operational Runbook

This repository is **agent-operated**. The user sets vision; you execute everything else.

## Quick commands

| Command | Purpose |
| ------- | ------- |
| `yarn bootstrap` | Install deps, scaffold `.env.local`, start local Supabase |
| `yarn dev` | Vite dev server |
| `yarn verify` | lint + build + unit + e2e (definition of done) |
| `yarn deploy` | Push Supabase migrations + Vercel prod deploy |

## Environment

All user-provided secrets live in **`.env.local`** (gitignored). See [`.env.example`](.env.example) and [`docs/prerequisites.md`](docs/prerequisites.md).

- `VITE_*` → browser-safe only (Supabase URL + anon key)
- Never prefix service-role or access tokens with `VITE_`

## Supabase workflow

```bash
supabase start                    # local dev
supabase db reset                 # apply migrations locally
supabase gen types typescript --local > src/lib/supabase/types.ts
supabase link --project-ref $SUPABASE_PROJECT_ID
supabase db push                  # apply to cloud
```

## Deploy sequence

1. Ensure migrations committed
2. `supabase db push`
3. `vercel deploy --prod` (or GitHub Actions on merge to main)
4. Smoke e2e against `VITE_APP_URL`

## User gates (pause only for these)

1. GitHub / Supabase / Vercel account exists
2. `.env.local` filled with Supabase credentials
3. Optional: Vercel token for deploy

Do **not** ask the user to run `yarn dev`, apply migrations, or verify manually.

## Docs

- [`docs/prerequisites.md`](docs/prerequisites.md) — user setup checklist
- [`docs/agent-operations.md`](docs/agent-operations.md) — CLI reference, failure recovery
- [`docs/architecture.md`](docs/architecture.md) — stack and data model
- [`.cursor/skills/quacker-ops/SKILL.md`](.cursor/skills/quacker-ops/SKILL.md) — detailed ops skill

## Auth

Magic link only (MVP). Google OAuth and SMS are deferred — see [`docs/roadmap.md`](docs/roadmap.md).
