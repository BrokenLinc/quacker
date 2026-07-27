# AGENTS.md — Quacker Operational Runbook

This repository is **agent-operated**. The user sets vision; you execute everything else.

## Naming: code name vs brand

- **Quacker** = internal **code name** → infrastructure and config only (repo, `package.json` name, Supabase project names, env/`localStorage` keys, CI, internal docs).
- **Hork** = user-facing **brand** → all copy an end user sees (UI text, titles, notifications, PWA manifest, meta tags). Production domain is `hork.us`.
- Never surface "Quacker" in user-facing copy. See [`.cursor/rules/quacker-core.mdc`](.cursor/rules/quacker-core.mdc).

## Quick commands

| Command | Purpose |
| ------- | ------- |
| `yarn check:requirements` | Verify CLIs, `.env.local`, and list MCP plugin expectations |
| `yarn test:maestro` | MobileSafari login on iOS Simulator (needs Maestro + LAN Vite) |
| `yarn test:maestro:keyboard` | Group chat keyboard open/close — light + dark screenshots (Safari) |
| `yarn test:maestro:pwa:keyboard` | Same keyboard shots in standalone PWA (install once; flakier) |
| `yarn test:maestro:pwa` | Add to Home Screen + login (flakier; optional) |
| `yarn test:maestro:android` | Chrome login on Android emulator (`adb reverse` → localhost) |
| `yarn test:maestro:android:keyboard` | Chrome keyboard open/close — light + dark screenshots |
| `yarn test:maestro:android:pwa:keyboard` | Standalone Android PWA keyboard — light + dark (install once) |
| `yarn test:maestro:android:pwa` | Android Chrome Install app / Add to Home screen + login |
| `yarn check:android` | adb + Play Store AVD / Chrome readiness for Android Maestro |
| `yarn bootstrap` | Install deps, scaffold `.env.local`, start local Supabase |
| `yarn dev` | Vite dev server |
| `yarn verify` | lint + build + unit + smoke e2e locally (~seconds); full e2e in CI or with local Supabase |
| `yarn verify:fast` | lint + build + unit only (skip e2e) |
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

`supabase link` writes `supabase/.temp/` (and branch metadata under `supabase/.branches/`). Both are gitignored — do not commit them. When stack or CLI workflows change, update `.gitignore` in the same change.

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
- [`docs/ux.md`](docs/ux.md) — layout contract, color roles, Native/PWA (viewport, safe areas, action sheets)
- [`docs/gravatar-llms.txt`](docs/gravatar-llms.txt) — Gravatar API v3.0.0 reference for AI development environments
- [`.cursor/skills/quacker-ops/SKILL.md`](.cursor/skills/quacker-ops/SKILL.md) — detailed ops skill

## Auth

Twilio Verify SMS OTP (MVP). Google OAuth is deferred — see [`docs/roadmap.md`](docs/roadmap.md).

## Cursor Cloud specific instructions

The VM snapshot already has JS deps, Docker, and the Supabase CLI installed; the startup update script only re-runs `yarn install`. Services are NOT auto-started — start them per session as below. Standard commands live in the Quick commands table above; only the non-obvious caveats are captured here.

### Start the backend (Docker + local Supabase) each session
Docker runs rootless-in-VM and is not started automatically:
1. `sudo dockerd` (run in the background, e.g. a tmux session; it stays up for the session).
2. `supabase start` from the repo root (brings up Postgres/Auth/Realtime/Storage on 54321–54324 and applies `supabase/migrations/*`).

`.env.local` is created during setup from `.env.example` with the standard local Supabase demo keys (`http://127.0.0.1:54321`). It is gitignored, so recreate it if missing: `cp .env.example .env.local` and fill `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` with the values printed by `supabase start`.

### Auth / SMS OTP testing

Production and **prod** Supabase use Twilio Verify via Edge Functions (`auth-send-otp`, `auth-verify-otp`). E2E tests bypass Twilio via admin session seeding in `tests/e2e/fixtures/supabase.ts`.

**Local / agent UI login (test OTP):** with `AUTH_ALLOW_TEST_OTP=true` (local `supabase/functions/.env`, or the **quacker-dev** project secret — never production):

1. Use a fictional `555-01XX` number, e.g. `(202) 555-0100`
2. Enter code `555555` (or `AUTH_TEST_OTP_CODE`)
3. Edge functions skip Twilio and issue a normal magiclink session

Fallback if `supabase start` does not load `supabase/functions/.env`:

```bash
supabase functions serve auth-send-otp auth-verify-otp \
  --env-file supabase/functions/.env --no-verify-jwt
```

**Maestro (iOS Safari / Android Chrome / PWA):**

Shared product steps live in `maestro/shared/` (`login-steps`, theme ensure). Platform chrome (share sheet, keyboard IME, install UI) stays in `ios-*` / `android-*` flows.

```bash
# iOS — Vite must bind LAN so the simulator can reach the host (not 127.0.0.1):
yarn dev -- --host 0.0.0.0 --port 5174
yarn test:maestro               # Safari login
yarn test:maestro:keyboard      # Safari keyboard open/close — light + dark screenshots
yarn test:maestro:pwa:keyboard  # standalone PWA keyboard — light + dark (install once)
yarn test:maestro:pwa           # optional Add to Home Screen (flaky on iOS 26)

# Android — Play Store AVD + Chrome; runner adb-reverses host ports → localhost:
yarn check:android
yarn test:maestro:android
yarn test:maestro:android:keyboard
# PWA install needs prod SW — prefer preview on a reversed localhost port:
yarn build && yarn preview --host 127.0.0.1 --port 4173
yarn test:maestro:android:pwa
yarn test:maestro:android:pwa:keyboard
```

`scripts/test-maestro.sh` puts Homebrew OpenJDK on `PATH`, sets `APP_ID` (`com.apple.mobilesafari` vs `com.android.chrome`), and resolves `APP_URL` (iOS: LAN `en0`/`en1`; Android: `adb reverse` → `http://localhost:<port>`). Ports probed: `5174`, `5173`, `4173`. Override with `APP_URL=…` or `MAESTRO_PORT=5173` if needed.

Install Maestro: `brew tap mobile-dev-inc/tap && brew install mobile-dev-inc/tap/maestro` (needs Java 17+). Not part of `yarn verify`.

Notes from live runs: do not use `clearState` on Safari (system app); Chrome `clearState` is fine; Chakra PinInput needs one `inputText` per digit; account avatar is labeled **Account menu** for VoiceOver/Maestro.

### Running e2e
`yarn test:e2e` uses the installed Google **Chrome** (`channel: 'chrome'`), not bundled Chromium. Start a preview server first (`yarn preview --host 127.0.0.1 --port 4173`) and run with `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173`; `yarn verify` wires this up automatically.

**Color modes (efficiency):** `a11y-home` seeds `chakra-ui-color-mode` and runs axe + canvas/`theme-color` checks for **light and dark** (no auth — included in verify smoke). `theme-modes` covers the authenticated sidebar toggle (needs Supabase, full e2e). Do not duplicate messaging/auth suites per mode. Assert `html[data-theme]`, not `chakra-ui-*` classes.
