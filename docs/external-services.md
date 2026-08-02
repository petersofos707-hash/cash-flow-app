# External services and later setup

## Supabase

1. Create a Supabase project in an Australian region suitable for the owner.
2. In Project Connect, copy the project URL and publishable key into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, then set both `APP_DATA_MODE` and `NEXT_PUBLIC_APP_DATA_MODE` to `supabase`.
3. Generate a strong `APP_SESSION_SECRET`, set the real `APPROVED_EMAIL`, and never commit `.env.local`.
4. Link and apply migrations:

```powershell
Set-Location "E:\cash-flow-app"
& "C:\Program Files\nodejs\npx.cmd" supabase login
& "C:\Program Files\nodejs\npx.cmd" supabase link --project-ref "YOUR_PROJECT_REF"
& "C:\Program Files\nodejs\npx.cmd" supabase db push
```

5. In Authentication > URL Configuration, set the production Site URL and add `http://localhost:3000/auth/confirm` plus the eventual Vercel callback URL.
6. In the magic-link template, use the token-hash SSR link described by Supabase: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`.
7. Disable public sign-ups if appropriate, keep JWT expiry short for this sensitive app, enable MFA, and confirm only the approved email can authenticate.
8. Confirm Data API exposure and authenticated grants. The migration explicitly grants authenticated access and enables owner-only RLS because new SQL-created tables may not be automatically exposed.
9. Run database security/performance advisors and test with two synthetic auth users to prove cross-user reads and writes return no rows.

Official references: https://supabase.com/docs/guides/auth/server-side/nextjs and https://supabase.com/docs/guides/database/postgres/row-level-security

## Basiq sandbox

1. Create a Basiq Developer Dashboard account and application, then obtain a sandbox API key.
2. Configure a Consent Policy for accounts and transactions, brand name, allowed institutions and redirect URL.
3. Set `BASIQ_API_KEY`, `BASIQ_ENVIRONMENT=sandbox`, `BASIQ_API_VERSION=3.0`, and the unique endpoint signing secret in server-side environment variables.
4. Configure the webhook callback as `https://YOUR_DOMAIN/api/basiq/webhook`. Basiq uses HMAC-SHA256 over `webhook-id.webhook-timestamp.raw-body`; the implementation rejects signatures more than five minutes from the server clock.
5. Use the Hooli Open Banking sandbox institution `AU00000` and the current credentials shown in Basiq’s official Testing page. Do not copy those credentials into source code.
6. Verify consent, connect, immediate sync, manual refresh, pending-to-posted reconciliation, consent renewal, revoke/disconnect, outage and retry flows with synthetic data only.

Official references: https://api.basiq.io/reference/testing, https://api.basiq.io/docs/consent and https://api.basiq.io/docs/webhooks-security

### Production bank connectivity

Production access cannot be enabled from code alone. Sign the relevant Basiq agreement, complete its security/compliance onboarding, configure the production consent policy and permitted institutions, and receive production/live-data enablement. Basiq states that Open Banking access is available after the required security and compliance steps. The application must remain read-only and must never collect banking passwords itself.

Before switching `BASIQ_ENVIRONMENT`, confirm current pricing, rate limits, retention requirements, enrichment fields, webhook events and required CDR disclosures with Basiq. Rotate the sandbox key and webhook secret rather than reusing them.

## Vercel deployment (not performed)

1. Push the repository to a private Git host.
2. Import it as a new Vercel project with the root directory at the repository root.
3. Add all environment variables separately to Development, Preview and Production. Never expose service-role, Basiq, webhook or cron secrets through `NEXT_PUBLIC_` names.
4. Set `APP_URL` to the production HTTPS domain and update Supabase/Basiq callbacks before testing sign-in or consent.
5. Build, then test the desktop/mobile PWA, service worker, protected routes, auth sign-out, export and deletion flows.
6. Configure a Vercel Cron route only after setting `CRON_SECRET`; do not rely on browser traffic for scheduled bank refresh.

## Backups and restoration

Enable the backup/PITR option appropriate to the Supabase plan. At least quarterly, restore a backup into an isolated non-production project, keep auth and finance access restricted, run migrations, verify record counts and test synthetic reads. Never download production finance data into this repository.
