# System Requirements

Tools and plugins the Quacker agent expects on the **developer machine** (where Cursor runs). CI installs its own deps in GitHub Actions.

Run the checker anytime:

```bash
yarn check:requirements
```

The agent should run this when blocked on deploy, secrets, local Supabase, or e2e — then tell the user exactly what to install or configure.

## Recommended workflow (no local Docker)

Most contributors use **remote Supabase** only:

| Where | App | Database | E2e |
| ----- | --- | -------- | --- |
| **Local** | `yarn dev` or preview | **quacker-dev** via `.env.local` | Playwright + Chrome |
| **CI** | GitHub Actions preview | Ephemeral local Supabase on runner | Full suite |
| **Vercel Preview** | PR branches | **quacker-dev** (Preview env vars) | Manual / optional |
| **Production** | `main` → Vercel | **Quacker** prod project | Smoke optional |

Docker is **not** required on your machine for this workflow.

---

## Summary

| Category | Item | Required? | Check | If missing |
| -------- | ---- | --------- | ----- | ---------- |
| Core | Node.js 22+ | Yes | `node -v` | [nodejs.org](https://nodejs.org/) |
| Core | Yarn 1.x | Yes | `yarn -v` | `npm install -g yarn` |
| Core | Git | Yes | `git --version` | Xcode CLT or [git-scm.com](https://git-scm.com/) |
| Secrets | `.env.local` | Yes | `yarn check:requirements` | Copy [`.env.example`](../.env.example) — see [prerequisites.md](./prerequisites.md) |
| CLI | Supabase CLI | Recommended | `supabase --version` | `brew install supabase/tap/supabase` |
| CLI | GitHub CLI | Recommended | `gh auth status` | `brew install gh && gh auth login` |
| CLI | Vercel CLI | Optional* | `vercel --version` | `npm i -g vercel` or use Vercel MCP |
| Browser | Google Chrome | Recommended | Chrome in `/Applications` (macOS) | [google.com/chrome](https://www.google.com/chrome/) |
| Runtime | Docker Desktop | **Optional** | `docker info` | Only for local `supabase start` — not needed with remote Supabase |
| Cursor | Supabase plugin | Recommended | MCP `plugin-supabase-supabase` | Cursor Settings → MCP → Supabase |
| Cursor | Vercel plugin | Recommended | MCP `plugin-vercel-vercel` | Cursor Settings → MCP → Vercel |

\*Vercel deploy works via **Vercel Cursor Plugin** MCP or **`npx vercel`** with `VERCEL_TOKEN` in `.env.local`.

---

## Core toolchain

### Node.js & Yarn

- **Node 22** matches [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).
- Install deps: `yarn install` or `yarn bootstrap`.

### Git

Required for commits, PRs, and CI. Remote: `origin` → GitHub repo.

---

## CLI tools

### Supabase CLI

Used for:

- `supabase start` / `db reset` (local dev + e2e)
- `supabase link` / `db push` (remote migrations via shell)

**Install (macOS):**

```bash
brew install supabase/tap/supabase
```

**Fallback:** Supabase **Cursor Plugin** MCP can apply migrations and generate types on the remote project without the CLI.

### GitHub CLI (`gh`)

Used for:

- `gh secret set …` (CI deploy secrets)
- `gh pr create`, issue triage

**Install & auth:**

```bash
brew install gh
gh auth login
```

Without `gh`, the agent cannot propagate secrets to GitHub Actions — user must add secrets in the repo UI or install `gh`.

### Vercel CLI

Used for:

- `vercel env add`, `vercel deploy --prod`
- Fallback when Vercel MCP is unavailable

**Install:**

```bash
npm install -g vercel
```

Requires `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` in `.env.local`.

---

## Cursor MCP plugins

These extend what the agent can do without opening dashboards.

### Supabase Cursor Plugin

- **MCP server ID:** `plugin-supabase-supabase`
- **Agent check:** `GetMcpTools` with `{"server":"plugin-supabase-supabase"}` — expect `serverStatus: "ready"`
- **Typical tools:** `apply_migration`, `list_migrations`, `generate_typescript_types`, `get_advisors`, `execute_sql`
- **Auth:** If `needsAuth`, run `mcp_auth` for that server

**User setup:** Install the Supabase plugin in Cursor and connect the project. Add Supabase values to `.env.local` (see [prerequisites.md](./prerequisites.md)).

### Vercel Cursor Plugin

- **MCP server ID:** `plugin-vercel-vercel`
- **Agent check:** `GetMcpTools` with `{"server":"plugin-vercel-vercel"}` — expect `serverStatus: "ready"`
- **Typical tools:** deploy, env, project and domain operations (prefer MCP or CLI over manual dashboard)
- **Auth:** Plugin uses Vercel account linkage; keep `VERCEL_TOKEN` in `.env.local` for CLI fallback

**User setup:** Install the Vercel plugin in Cursor and link the account. Add Vercel IDs and token to `.env.local`.

---

## Playwright / e2e

- **Local & agent runs:** Installed **Google Chrome** (`channel: 'chrome'` in `playwright.config.ts`)
- **CI:** Bundled Chromium (`CI=true`, `playwright install --with-deps chromium`)
- See [`.cursor/rules/playwright-chrome.mdc`](../.cursor/rules/playwright-chrome.mdc)

If e2e hangs in the agent sandbox, the agent should request **`all`** shell permissions for the test command before switching browsers.

---

## Docker (optional — local Supabase only)

**Not required** if you use your **remote Supabase project** (typical setup with `.env.local` + Supabase Cursor Plugin).

Docker is only needed when you want the full **offline** stack via `supabase start` (Postgres, Auth, Inbucket for local magic links, Studio). That path is for contributors who prefer local DB e2e; CI runs its own Supabase on GitHub Actions.

```bash
docker info   # optional check
supabase start
```

Without Docker you can still:

- Develop and deploy against **cloud Supabase**
- Run **lint, build, and unit tests**
- Run **reduced local e2e** (`a11y-home`) — `yarn verify` detects no local Supabase and skips the full suite
- Rely on **CI** for full e2e with auth and messaging

---

## Environment file

All user-provided secrets go in **`.env.local`** (gitignored). The checker validates presence of keys; it does not print values.

| Variable | Required for |
| -------- | ------------- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | App build & runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | E2e session seeding |
| `SUPABASE_PROJECT_ID`, `SUPABASE_ACCESS_TOKEN` | Remote Supabase / CLI |
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | Deploy & env sync |
| `VITE_APP_URL` | Production smoke tests |

Details: [prerequisites.md](./prerequisites.md).

---

## Agent workflow when something is missing

1. Run `yarn check:requirements`
2. Call `GetMcpTools` for `plugin-supabase-supabase` and `plugin-vercel-vercel`
3. **Fix it yourself** — create projects, migrations, auth, env sync (see [agent-operations.md](./agent-operations.md))
4. Pause only for [user gates](./prerequisites.md) (accounts, access tokens)
5. Do not ask the user to run `yarn verify` manually — fix tooling first, then run it yourself

---

## CI (GitHub Actions)

No manual install on the developer machine. The workflow installs Node 22, Yarn, Supabase CLI, Playwright Chromium, and runs `supabase start` on `ubuntu-latest`. Requires GitHub repo secrets for deploy workflow (see [deployment.md](./deployment.md)).
