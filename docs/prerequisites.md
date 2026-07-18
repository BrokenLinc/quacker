# Prerequisites

One-time setup before the agent executes. Put all secrets in **`.env.local`** at the repo root (gitignored).

## Accounts

1. **GitHub** — repo for this codebase
2. **Supabase** — [new project](https://supabase.com/dashboard); magic link works out of the box
3. **Vercel** — [import repo](https://vercel.com/new); can be linked after first push

## `.env.local` template

Copy from [`.env.example`](../.env.example):

| Variable | Where to find it |
| -------- | ---------------- |
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Same page → anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page → service_role key (never `VITE_` prefix) |
| `SUPABASE_PROJECT_ID` | Project Settings → General → Reference ID |
| `SUPABASE_ACCESS_TOKEN` | [Account tokens](https://supabase.com/dashboard/account/tokens) |
| `VERCEL_TOKEN` | [vercel.com/account/tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Vercel team/account settings |
| `VERCEL_PROJECT_ID` | Vercel project settings (after project exists) |
| `VITE_APP_URL` | Production URL (after first deploy) |

## Checklist

- [ ] GitHub repo exists
- [ ] Supabase project created
- [ ] `.env.local` has all Supabase variables
- [ ] Vercel account exists

**Not needed for MVP:** Google OAuth, Twilio, Firebase.

The agent propagates secrets to GitHub Actions and Vercel via CLI — you do not need to configure those UIs manually.
