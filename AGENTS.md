# AGENTS.md — Quacker Operational Runbook

This repository is **agent-operated**. The user sets vision; you execute everything else.

## Quick commands

| Command | Purpose |
| ------- | ------- |
| `yarn check:requirements` | Verify CLIs, `.env.local`, and list MCP plugin expectations |
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
2. Test against **dev** Supabase locally (`yarn verify`)
3. Merge to `main` → `deploy.yml` pushes migrations to **prod** + Vercel production
4. Smoke e2e against `VITE_APP_URL` (production)

See [`docs/environments.md`](docs/environments.md) for dev vs prod split.

## User gates (pause only for these)

1. **Accounts** — GitHub, Supabase, Vercel exist (one-time signup)
2. **Tokens in `.env.local`** — `SUPABASE_ACCESS_TOKEN`, `VERCEL_TOKEN` (if MCP cannot auth)
3. **Ambiguous product choices** — e.g. custom domain name

The agent **creates Supabase projects**, applies migrations, configures auth, fetches keys, syncs Vercel/GitHub — see [`.cursor/rules/mcp-first-ops.mdc`](.cursor/rules/mcp-first-ops.mdc).

Do **not** ask the user to create projects, use dashboards, run `yarn dev`, apply migrations, or verify manually.

## Docs

- [`docs/environments.md`](docs/environments.md) — dev vs prod Supabase projects, Vercel Preview/Production
- [`docs/prerequisites.md`](docs/prerequisites.md) — user setup checklist
- [`docs/agent-operations.md`](docs/agent-operations.md) — CLI reference, failure recovery
- [`docs/architecture.md`](docs/architecture.md) — stack and data model
- [`docs/gravatar-llms.txt`](docs/gravatar-llms.txt) — Gravatar API v3.0.0 reference for AI development environments
- [`.cursor/skills/quacker-ops/SKILL.md`](.cursor/skills/quacker-ops/SKILL.md) — detailed ops skill

## Auth

Magic link only (MVP). Google OAuth and SMS are deferred — see [`docs/roadmap.md`](docs/roadmap.md).
