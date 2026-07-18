# Prerequisites

One-time setup before the agent executes. Put secrets in **`.env.local`** at the repo root (gitignored).

For toolchain details, see **[system-requirements.md](./system-requirements.md)**. For dev/prod split, see **[environments.md](./environments.md)**.

```bash
yarn check:requirements
```

## What you do (user)

| Once | Why |
| ---- | --- |
| **GitHub** account + repo | Ownership |
| **Supabase** account | Billing; agent creates projects via MCP |
| **Vercel** account | Hosting; agent deploys via MCP/CLI |
| **`SUPABASE_ACCESS_TOKEN`** in `.env.local` | [Account token](https://supabase.com/dashboard/account/tokens) — enables agent MCP/CLI |
| **`VERCEL_TOKEN`** in `.env.local` | [Vercel token](https://vercel.com/account/tokens) — if Vercel MCP unavailable |
| **Supabase + Vercel Cursor plugins** enabled | Agent uses MCP tools directly |

Optional: `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (agent can discover/link via CLI).

## What the agent does (not you)

- Create Supabase projects (e.g. `quacker-dev`, prod) via **`create_project`**
- Apply migrations, configure auth redirects, fetch API keys
- Write/update `.env.local` (dev + `*_PROD` vars)
- `yarn sync:vercel-env`, `gh secret set`, `yarn deploy`
- `yarn bootstrap`, `yarn verify`, fix CI

Do **not** create Supabase projects in the dashboard unless the agent is blocked on a missing access token.

## `.env.local` template

Copy from [`.env.example`](../.env.example). The agent fills project URL, keys, and refs after creating or linking projects.

| Variable | Who sets it |
| -------- | ----------- |
| `SUPABASE_ACCESS_TOKEN` | **You** (once) |
| `VERCEL_TOKEN` | **You** (once) |
| `VITE_SUPABASE_*`, `SUPABASE_PROJECT_ID`, service role | **Agent** (from MCP/CLI) |
| `*_PROD` vars | **Agent** (after prod project exists) |
| `VITE_APP_URL` | **Agent** (after first Vercel deploy) |

## Checklist

- [ ] GitHub repo exists
- [ ] Supabase account + access token in `.env.local`
- [ ] Vercel account (+ token if needed)
- [ ] Supabase + Vercel Cursor plugins enabled
- [ ] Agent has run setup (projects, migrations, env sync) — **not manual**

Optional: **GitHub CLI** (`gh auth login`), **Google Chrome** (local e2e). **Docker** not required (remote Supabase).

**Not needed for MVP:** Google OAuth, Twilio, Firebase.
