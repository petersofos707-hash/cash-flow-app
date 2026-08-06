# Cash Flow App

A private, responsive Australian personal-finance Progressive Web App for cash flow, spending plans, savings goals, investments, liabilities, net worth, recurring costs and monthly reviews.

The checked-in application defaults to an explicitly labelled **fictional demo mode** because Supabase and Basiq credentials are not yet available. Demo records remain in the current browser. No real banking credentials or financial data are included.

## Current delivery

- Next.js 16 App Router, React 19, TypeScript and Tailwind CSS
- Passwordless, approved-email authentication boundary
- Signed local magic links in demo mode; Supabase PKCE magic links in cloud mode
- Complete responsive navigation and all specified product sections
- Exact integer-cent financial calculations
- Supabase PostgreSQL migration covering every specified model, indexes and owner-only RLS
- Basiq v3 adapter, hosted Consent UI boundary and signed-webhook verification
- Manual market-price provider with an adapter for a future price API
- Installable PWA manifest, secure service worker shell and security headers
- Vitest domain/security tests and Playwright desktop/mobile workflows

## Requirements

- Windows PowerShell
- Node.js 20.9 or newer (Node.js 24 is currently installed)
- Git
- Docker Desktop only if you want to run Supabase locally
- A Supabase project and Basiq developer application only when switching out of demo mode

All project-specific dependencies, caches, generated output and history are kept under `E:\cash-flow-app`.

## Install and run

```powershell
Set-Location "E:\cash-flow-app"
$env:NPM_CONFIG_CACHE = "E:\cash-flow-app\.cache\npm"
Copy-Item ".env.example" ".env.local"
& "C:\Program Files\nodejs\npm.cmd" install
& "C:\Program Files\nodejs\npm.cmd" run dev
```

Open `http://localhost:3000`. The default approved demo email is `owner@example.com`. Request the local magic link and open the link shown on screen. No email is sent in demo mode.

Before storing any personal information, replace `APP_SESSION_SECRET`, set your real `APPROVED_EMAIL`, provision Supabase, and switch to cloud mode as described in [External services](docs/external-services.md).

## Quality commands

```powershell
Set-Location "E:\cash-flow-app"
& "C:\Program Files\nodejs\npm.cmd" run format:check
& "C:\Program Files\nodejs\npm.cmd" run lint
& "C:\Program Files\nodejs\npm.cmd" run typecheck
& "C:\Program Files\nodejs\npm.cmd" run test
& "C:\Program Files\nodejs\npm.cmd" run build
& "C:\Program Files\nodejs\npm.cmd" run start
```

End-to-end tests require the bundled Chromium browser:

```powershell
Set-Location "E:\cash-flow-app"
$env:PLAYWRIGHT_BROWSERS_PATH = "E:\cash-flow-app\.cache\ms-playwright"
& "C:\Program Files\nodejs\npx.cmd" playwright install chromium
& "C:\Program Files\nodejs\npm.cmd" run test:e2e
```

Or run the main verification script:

```powershell
Set-Location "E:\cash-flow-app"
powershell -ExecutionPolicy Bypass -File ".\scripts\verify.ps1"
```

## Supabase locally

Docker Desktop is not installed on the current machine, so local database execution is an external prerequisite. After installing it:

```powershell
Set-Location "E:\cash-flow-app"
& "C:\Program Files\nodejs\npx.cmd" supabase start
& "C:\Program Files\nodejs\npx.cmd" supabase db reset
& "C:\Program Files\nodejs\npx.cmd" supabase status
```

The reset command applies `supabase/migrations/` and then `supabase/seed.sql`. The browser demo seed is separate and can be reset in Settings.

## Deploying with a real Postgres backend

Set `APP_DATA_MODE=postgres` (and `NEXT_PUBLIC_APP_DATA_MODE=postgres`) to run
against a real Postgres database instead of demo mode's browser-local data.
Any Postgres-compatible database works (Timescale Cloud, Render Postgres,
plain Postgres) — Supabase is not required for this mode. Auth stays the
app's own signed-cookie, single-approved-email session; no separate auth
provider is needed either.

1. Provision a Postgres database and copy its connection string into
   `DATABASE_URL`.
2. Apply the schema once: `DATABASE_URL=... npm run db:migrate`. This runs
   every file in `db/migrations/` in order; each one is safe to re-run.
3. Set `APP_DATA_MODE=postgres`, `NEXT_PUBLIC_APP_DATA_MODE=postgres`,
   `APPROVED_EMAIL`, `APP_SESSION_SECRET` and `APP_URL` on your host.
4. Deploy the app as a normal Next.js server (`npm run build && npm run
start`) — Render, Railway, Fly.io or any Node host works.

There's no email-sending wired up yet: sign-in shows the magic link directly
on the confirmation screen instead of emailing it, the same as demo mode.
"Reset fictional demo" is hidden in this mode; "Permanently delete finance
data" clears transactional data from the database and keeps categories,
rules and preferences.

## Documentation

- [Architecture](docs/architecture.md)
- [External services and deployment](docs/external-services.md)
- [Security and privacy](docs/security.md)
- [Implementation checklist](docs/implementation-checklist.md)
- [Completion report](docs/completion-report.md)

## Important limitations

- Demo mode is for evaluation only. It is not suitable for real financial data.
- Live Supabase, Basiq sandbox and production bank flows cannot be executed without accounts and credentials.
- Production CDR/bank access depends on Basiq commercial approval, consent-policy configuration and relevant compliance onboarding.
- Automatic market pricing remains manual until a suitable licensed provider is configured.
- The app provides financial tracking information, not financial, tax or debt advice.
