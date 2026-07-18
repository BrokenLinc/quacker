# Agent Operations

Operational reference for agents working on Quacker.

## User gates vs agent duties

| Task | Who |
| ---- | --- |
| Create GitHub / Supabase / Vercel accounts | User |
| Fill `.env.local` | User |
| Write code, migrations, tests | Agent |
| `yarn bootstrap`, `yarn verify`, `yarn deploy` | Agent |
| `gh secret set`, `vercel env add` | Agent |
| Fix CI failures | Agent |

## Commands

```bash
yarn bootstrap          # deps + local supabase
yarn dev                # Vite dev server
yarn verify             # lint + build + test + e2e
yarn deploy             # supabase db push + vercel prod
supabase db reset       # replay migrations locally
supabase gen types typescript --local > src/lib/supabase/types.ts
```

## Secret propagation

From `.env.local`:

```bash
gh secret set SUPABASE_ACCESS_TOKEN
gh secret set SUPABASE_PROJECT_ID
gh secret set SUPABASE_SERVICE_ROLE_KEY
gh secret set VERCEL_TOKEN
gh secret set VERCEL_ORG_ID
gh secret set VERCEL_PROJECT_ID
```

## Failure recovery

| Symptom | Fix |
| ------- | --- |
| Migration error | Fix SQL, `supabase db reset`, re-run verify |
| E2e auth fails | Ensure `supabase start`; check service role key |
| Magic link redirect 404 | Add `/auth/callback` to Supabase redirect URLs |
| Realtime not updating | Confirm tables in `supabase_realtime` publication |

## User gates

See [prerequisites.md](./prerequisites.md).
