# Environments

Quacker uses two Supabase projects and Vercel's Preview vs Production slots.

| Environment | Supabase project | Git | Vercel |
| ----------- | ---------------- | --- | ------ |
| **Development** | `quacker-dev` (`ylujbohoifhmyxxqarum`) | `feature/*` PRs | Preview (auto) |
| **Production** | `Quacker` (`wcbxopujwnsxdrmdbofc`) | `main` | Production |

No `develop` branch — solo workflow: PR preview → merge to `main` → prod deploy.

## Local (`.env.local`)

**Development vars (default)** — used by `yarn dev`, `yarn verify`, and e2e:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PROJECT_ID`

**Production vars (`*_PROD`)** — used only by `yarn deploy` and production smoke:

- `VITE_SUPABASE_URL_PROD`
- `VITE_SUPABASE_ANON_KEY_PROD`
- `SUPABASE_SERVICE_ROLE_KEY_PROD`
- `SUPABASE_PROJECT_ID_PROD`
- `VITE_APP_URL`

Shared: `SUPABASE_ACCESS_TOKEN`, `VERCEL_*`.

See [`.env.example`](../.env.example).

## Vercel env vars

| Variable | Preview | Production |
| -------- | ------- | ---------- |
| `VITE_SUPABASE_URL` | dev project URL | prod project URL |
| `VITE_SUPABASE_ANON_KEY` | dev anon key | prod anon key |
| `VITE_APP_URL` | omit (uses origin) | `https://quacker-five.vercel.app` |

## Supabase auth

Email OTP does not use redirect URLs. Remote projects should use an OTP-only email template (`{{ .Token }}`; no confirmation link).

| Project | `site_url` |
| ------- | ---------- |
| **dev** | Preview / local origin |
| **prod** | `https://quacker-five.vercel.app` |

## Workflows

| Command / workflow | Target |
| ------------------ | ------ |
| `yarn dev` | dev Supabase |
| `yarn verify` | lint + build + unit + smoke e2e locally; full e2e with local Supabase or CI |
| `yarn verify:fast` | lint + build + unit only (skip e2e) |
| `yarn deploy` | **prod** Supabase + Vercel production |
| `ci.yml` | Ephemeral local Supabase on runner (isolated) |
| `deploy.yml` on `main` | **prod** Supabase + Vercel production |

## GitHub Actions secrets

Use **production** values for deploy secrets:

- `SUPABASE_PROJECT_ID` → prod ref (`wcbxopujwnsxdrmdbofc`)
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_SERVICE_ROLE_KEY` → prod service role
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

CI verify does not need cloud secrets (local ephemeral Supabase).

## Migration flow

1. Develop locally against **dev** project
2. Commit migration SQL in `supabase/migrations/`
3. PR → CI validates against ephemeral DB
4. Merge to `main` → `deploy.yml` pushes migrations to **prod** project

Apply migrations to dev manually (agent — not the user) before or in parallel with prod:

```bash
# Agent: Supabase MCP apply_migration, or:
supabase link --project-ref ylujbohoifhmyxxqarum
supabase db push
```

New dev projects: agent uses `create_project` MCP — see [agent-operations.md](./agent-operations.md).
