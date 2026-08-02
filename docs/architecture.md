# Architecture

## Application boundary

The app uses the Next.js App Router. Public routes are limited to sign-in, auth confirmation, health and provider callbacks. Every finance page is wrapped by a server-side owner check. API routes perform their own checks rather than relying only on navigation or the request proxy.

```text
Browser/PWA
  -> Next.js protected pages and route handlers
      -> authentication adapter
          -> signed demo session OR Supabase PKCE session
      -> finance domain and repository boundary
          -> fictional browser store OR Supabase PostgreSQL with RLS
      -> bank adapter
          -> synthetic demo OR Basiq v3 hosted Consent UI/API
```

## Main areas

- `src/app`: route pages, auth callbacks, API handlers, PWA metadata and error/loading states.
- `src/components`: responsive product UI and fictional demo-state provider.
- `src/lib/domain`: integer-cent calculations, transfer detection, import reconciliation and rules.
- `src/lib/auth`: signed local sessions and approved-owner enforcement.
- `src/lib/supabase`: current SSR browser/server/proxy clients.
- `src/lib/integrations`: Basiq and market-price provider adapters.
- `supabase/migrations`: the complete cloud schema, constraints, indexes, grants and RLS.
- `tests`: unit/security calculations and desktop/mobile user workflows.

## Data modes

`APP_DATA_MODE=demo` is intentionally obvious. The app uses synthetic records and persists user edits in browser storage. The server still protects all pages with a short-lived, HttpOnly signed session.

`APP_DATA_MODE=supabase` switches authentication to Supabase SSR/PKCE. The database migration is ready for hosted or local Supabase. The interface/data boundary is deliberately separated from Basiq so the bank provider can be configured independently.

## Financial rules

- Money is stored as integer cents (`bigint` in PostgreSQL).
- Imported raw payloads and normalised user-facing transactions are separate.
- Provider IDs are preferred for idempotency; a deterministic account/date/amount/description key is the fallback.
- Pending records can become posted without overwriting manual category, note, tag or split edits.
- Transfers and credit-card repayments are linked and excluded from income/spending.
- Investment contributions are transfers for cash flow but remain wealth-building activity.
- Historical net-worth snapshots are immutable records rather than recalculations of current balances.

## Vercel readiness

The project uses standard Next.js server routes, environment variables and no machine-specific runtime dependency. It can be imported into Vercel once external service variables are configured. Deployment was intentionally not performed.
