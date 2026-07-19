# Agent Operations

Operational reference for agents working on Quacker.

## User gates vs agent duties

| Task | Who |
| ---- | --- |
| Create GitHub / Supabase / Vercel **accounts** | User (once) |
| Paste `SUPABASE_ACCESS_TOKEN` / `VERCEL_TOKEN` into `.env.local` | User (once, if MCP not authed) |
| **Create Supabase projects** | **Agent** — `create_project` MCP |
| **Apply migrations to cloud** | **Agent** — `apply_migration` or `supabase db push` |
| **Configure auth redirects** | **Agent** — Management API |
| **Fetch API keys → `.env.local`** | **Agent** — MCP / `supabase projects api-keys` |
| **Sync Vercel Preview/Production env** | **Agent** — `yarn sync:vercel-env` |
| **GitHub Actions secrets** | **Agent** — `gh secret set` |
| Write code, migrations, tests | Agent |
| `yarn bootstrap`, `yarn verify`, `yarn deploy` | Agent |
| Fix CI failures | Agent |

Full MCP playbook: [`.cursor/rules/mcp-first-ops.mdc`](../.cursor/rules/mcp-first-ops.mdc).

## Commands

```bash
yarn check:requirements  # CLIs, .env.local, MCP expectations
yarn sync:vercel-env     # Preview → dev; Production → prod Supabase
yarn bootstrap           # deps; optional local supabase
yarn dev                 # Vite dev server (dev Supabase)
yarn verify              # lint + build + test + e2e
yarn deploy              # prod Supabase + Vercel production only
supabase db reset        # optional local replay (Docker)
```

## Secret propagation (agent runs these)

From `.env.local`:

```bash
yarn sync:vercel-env
gh secret set SUPABASE_PROJECT_ID_PROD
gh secret set SUPABASE_ACCESS_TOKEN
gh secret set SUPABASE_SERVICE_ROLE_KEY_PROD
gh secret set VERCEL_TOKEN
gh secret set VERCEL_ORG_ID
gh secret set VERCEL_PROJECT_ID
```

## New Supabase project (agent recipe)

1. `GetMcpTools` → confirm `plugin-supabase-supabase` is `ready`
2. `list_organizations` → `get_cost` → `confirm_cost` → `create_project`
3. `apply_migration` for each file in `supabase/migrations/`
4. `get_publishable_keys` + CLI for service role → update `.env.local`
5. PATCH auth config (redirect URLs) via Management API
6. `yarn sync:vercel-env` if Vercel env needs updating

Do not ask the user to perform steps 2–6.

## Failure recovery

| Symptom | Fix |
| ------- | --- |
| Missing tool / plugin | `yarn check:requirements`; `GetMcpTools`; `mcp_auth` if needed |
| No Supabase project | Agent: `create_project` — do not ask user to use dashboard |
| Migration error | Fix SQL, `supabase db reset` (optional), re-run verify |
| E2e auth fails | Check dev `SUPABASE_SERVICE_ROLE_KEY`; remote Supabase reachable |
| OTP email not received locally | Check Inbucket at `http://127.0.0.1:54324` after **Send code** |
| Realtime not updating | Confirm tables in `supabase_realtime` publication |

## User gates

See [prerequisites.md](./prerequisites.md) — accounts and access tokens only.
