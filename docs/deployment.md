# Deployment

## Vercel

- Framework: Vite
- Build: `yarn build`
- Output: `dist`
- Rewrites: [`vercel.json`](../vercel.json) — SPA + `/g/:slug`

## Vercel env sync

```bash
yarn sync:vercel-env   # Preview → dev Supabase; Production → prod Supabase
```

## GitHub Actions secrets (production deploy)

- `SUPABASE_PROJECT_ID_PROD`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_SERVICE_ROLE_KEY_PROD` (optional for deploy workflow)
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

See [environments.md](./environments.md).

## Supabase

```bash
supabase link --project-ref $SUPABASE_PROJECT_ID
supabase db push
```

Update `supabase/config.toml` `site_url` and `additional_redirect_urls` for production domain.

## GitHub Actions

Secrets required:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_ID`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Workflows:

- [`ci.yml`](../.github/workflows/ci.yml) — verify on PR
- [`deploy.yml`](../.github/workflows/deploy.yml) — migrate + deploy on main

## Agent deploy script

```bash
yarn deploy   # scripts/deploy.sh
```
