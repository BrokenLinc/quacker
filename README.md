# Quacker

Private, ad-hoc group chat for trips and conferences — a lightweight way for organic groups to sync during chaotic, short-lived moments.

## Status

Agent-operated prototype. See [docs/features.md](docs/features.md) for capabilities.

## Owner setup (one time)

1. Create [Supabase](https://supabase.com/dashboard) and [Vercel](https://vercel.com) accounts
2. Enable **Supabase** and **Vercel** Cursor plugins; add `SUPABASE_ACCESS_TOKEN` and `VERCEL_TOKEN` to `.env.local` — see [docs/prerequisites.md](docs/prerequisites.md)

The agent creates Supabase projects, runs migrations, syncs env vars, and deploys — you do not use dashboards for that. See [AGENTS.md](AGENTS.md).

## Stack

Vite · React · Chakra UI · Supabase · Vercel

## License

MIT
