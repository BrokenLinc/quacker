# Agent Operations

Operational reference for agents working on Quacker.

## User gates vs agent duties

| Task | Who |
| ---- | --- |
| Create GitHub / Supabase / Vercel **accounts** | User (once) |
| Paste `SUPABASE_ACCESS_TOKEN` / `VERCEL_TOKEN` into `.env.local` | User (once, if MCP not authed) |
| **Create Supabase projects** | **Agent** — `create_project` MCP |
| **Apply migrations to cloud** | **Agent** — prefer `supabase db push` (keeps versions = filenames). Avoid MCP `apply_migration` for committed files — it stamps a new timestamp and breaks CI `db push`. |
| **Configure auth redirects** | **Agent** — Management API |
| **Fetch API keys → `.env.local`** | **Agent** — MCP / `supabase projects api-keys` |
| **Sync Vercel Preview/Production env** | **Agent** — `yarn sync:vercel-env` |
| **GitHub Actions secrets** | **Agent** — `gh secret set` (CLI auth, not `.env.local` `GITHUB_TOKEN`) |
| Write code, migrations, tests | Agent |
| `yarn bootstrap`, `yarn verify`, `yarn deploy` | Agent |
| Fix CI failures | Agent |

Full MCP playbook: [`.cursor/rules/mcp-first-ops.mdc`](../.cursor/rules/mcp-first-ops.mdc).

### Local GitHub auth (`gh` vs `GITHUB_TOKEN`)

- **Push / PR / `gh secret set` / triage:** use `gh` CLI (keyring OAuth with `repo` + `workflow`). Do **not** use `.env.local` `GITHUB_TOKEN` as a git credential.
- **`.env.local` `GITHUB_TOKEN`:** Issues-write PAT for suggestion → GitHub Issues Edge only. `gh` reads env `GITHUB_TOKEN` first — after `source .env.local`, run `unset GITHUB_TOKEN` before `git push` / `gh pr create` or you get 403. See mcp-first-ops **GitHub — use `gh` CLI for local work**.

## Commands

```bash
yarn check:requirements  # CLIs, .env.local, MCP expectations
yarn sync:vercel-env     # Preview → dev; Production → prod Supabase (+ VAPID public)
yarn bootstrap           # deps; optional local supabase
yarn dev                 # Vite dev server (dev Supabase)
yarn verify              # lint + build + test + e2e
yarn deploy              # prod Supabase + Vercel production only
scripts/setup-notify-webhook.sh [dev|prod]  # VAPID + webhook vault for Web Push
scripts/setup-suggestion-github-webhook.sh [dev|prod]  # GitHub Issues on new suggestions
supabase db reset        # optional local replay (Docker)
```

## Web Push secrets

1. Generate VAPID (or reuse from `.env.local`): `VITE_VAPID_PUBLIC_KEY` = `VAPID_PUBLIC_KEY`; keep `VAPID_PRIVATE_KEY` server-only
2. `scripts/setup-notify-webhook.sh dev` then `prod` — Management API secrets + Vault for DB trigger
3. Deploy `notify-new-message` (MCP `deploy_edge_function`, `verify_jwt: false` — auth via `x-webhook-secret`)
4. `yarn sync:vercel-env` so Preview/Production get `VITE_VAPID_PUBLIC_KEY`

Note: current Supabase CLI may not accept `--token` on `secrets set`; prefer Management API (`/v1/projects/{ref}/secrets`) with `SUPABASE_ACCESS_TOKEN`.

## Suggestion export + GitHub Issues

1. Put `GITHUB_TOKEN` (Issues write on `BrokenLinc/quacker`) in `.env.local` for Edge/setup scripts only — not for `git`/`gh` local ops. Optional: `GITHUB_REPO`.
2. **App URLs for issue footers**
   - Prod: `PUBLIC_APP_URL` (default `https://yowl.us` / `VITE_APP_URL`).
   - Dev/preview: `PUBLIC_APP_URL_DEV` **or** a non-prod `PUBLIC_APP_URL` (Vercel **branch alias**, e.g. `https://quacker-git-<branch>-….vercel.app`). Never default to `yowl.us` or `http://127.0.0.1:*`. A preview URL duplicated as both `PUBLIC_APP_URL` and `VITE_APP_URL` is OK.
3. `SUGGESTION_GITHUB_WEBHOOK_SECRET` — script mints if empty; must **rewrite** blank `KEY=` lines in `.env.local` (do not skip when the key exists empty). Required for DB→Edge; SPA SuperAdmin override uses JWT instead.
4. `scripts/setup-suggestion-github-webhook.sh dev` then `prod` — Edge secrets + Vault.
5. Deploy `suggestion-export` and `suggestion-github-issue` with `verify_jwt: false`.

Issue footer uses same-origin `/suggestions/:id` and `/api/suggestion-export?id=` (Vercel Edge proxies to Supabase). Label: **`user-suggestion`**.

**Working a `user-suggestion` issue:** fetch Export JSON first; prioritize
`author.isSuperAdmin` comments; reinterpret end-user wording toward Yowl’s
north star; comment proposed alterations on the GitHub thread before shipping a
pivot. Rule: [`.cursor/rules/user-suggestion-issues.mdc`](../.cursor/rules/user-suggestion-issues.mdc).

**Export curl** (prefer app origin so Preview/Production pick the right Supabase):

```bash
# Preview / production app host (injects anon key server-side)
curl -sS "https://<app-host>/api/suggestion-export?id=<uuid>"

# Or call Supabase directly with the publishable anon key:
curl -sS "https://<project-ref>.supabase.co/functions/v1/suggestion-export?id=<uuid>" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY"
```

### Webhook setup pitfalls (any Vault → Edge script)

| Bug class | Do |
| --- | --- |
| Empty `x-webhook-secret` posted when Vault secret missing | Skip `http_post` if secret (or URL) empty — privileged Edge must fail closed |
| Soft-skip auth on `verify_jwt: false` + privileged side effect | Require secret (or SuperAdmin JWT); never “if secret then check” |
| Setup treats `KEY=` as configured | Replace blank assignments when minting; don’t append a second line |
| Non-prod links inherit `VITE_APP_URL` / yowl.us / localhost | Explicit preview base URL; reject only production host |
| `anon` can call SuperAdmin probe RPC | Embed checks in security-definer export; grant probe helpers only to authenticated/service_role |

## Secret propagation (agent runs these)

From `.env.local`:

```bash
yarn sync:vercel-env
gh secret set SUPABASE_PROJECT_ID_PROD
gh secret set SUPABASE_DB_PASSWORD < <(grep SUPABASE_DB_PASSWORD_PROD .env.local | cut -d= -f2-)
gh secret set SUPABASE_ACCESS_TOKEN
gh secret set SUPABASE_SERVICE_ROLE_KEY_PROD
gh secret set VERCEL_TOKEN
gh secret set VERCEL_ORG_ID
gh secret set VERCEL_PROJECT_ID
```

## New Supabase project (agent recipe)

1. `GetMcpTools` → confirm `plugin-supabase-supabase` is `ready`
2. `list_organizations` → `get_cost` → `confirm_cost` → `create_project`
3. Apply migrations with `supabase db push` (or `execute_sql` + insert matching `schema_migrations` versions). Do **not** use MCP `apply_migration` for files already named in `supabase/migrations/` — it creates orphan remote versions.
4. `get_publishable_keys` + CLI for service role → update `.env.local`
5. PATCH auth config (redirect URLs) via Management API
6. `yarn sync:vercel-env` if Vercel env needs updating

Do not ask the user to perform steps 2–6.

## Failure recovery

| Symptom | Fix |
| ------- | --- |
| Missing tool / plugin | `yarn check:requirements`; `GetMcpTools`; `mcp_auth` if needed |
| No Supabase project | Agent: `create_project` — do not ask user to use dashboard |
| Migration history mismatch (`Remote migration versions not found…`) | `list_migrations`; repair orphans to match filenames (`migration repair` or `execute_sql` on `schema_migrations`); never leave MCP-stamped versions that differ from git |
| `unsafe use of new value "…" of enum type` (`55P04`) in CI / `supabase start` | Split: migration N = only `alter type … add value`; migration N+1 = SQL that references the label. Same-file ADD VALUE + use fails inside one transaction |
| `Failed to resolve latest Supabase CLI release: rate limit exceeded` | Pin `supabase/setup-cli` `version` (e.g. `2.111.0`) in `.github/workflows` — do not use `latest` |
| Migration SQL error | Fix SQL, `supabase db reset` (optional), re-run verify |
| `supabase start` hangs/fails on `supabase_vector` mounting `/var/run/docker.sock` | Rootless daemons (colima) cannot bind-mount the socket. `[analytics] enabled = false` in `supabase/config.toml` already skips it — nothing here reads local logs |
| E2e auth fails | Check dev `SUPABASE_SERVICE_ROLE_KEY`; remote Supabase reachable |
| Magic link redirect 404 | Agent: PATCH auth `uri_allow_list` — see `docs/environments.md` |
| Realtime not updating | Confirm tables in `supabase_realtime` publication |
| Accidentally committed `supabase/.temp/` | `git rm -r --cached supabase/.temp` and ensure `.gitignore` entries exist |

## Repository hygiene

When adding tools, CLIs, or deploy targets, extend `.gitignore` for generated local paths in the same PR. Supabase CLI state:

- `supabase/.temp/` — linked project ref (created by `supabase link`)
- `supabase/.branches/` — branch metadata
- `.supabase/` — local Docker stack data

`yarn check:requirements` validates these patterns are present.

## User gates

See [prerequisites.md](./prerequisites.md) — accounts and access tokens only.
