# Implementation checklist

Status legend: **Implemented** is present in the repository and demonstrable with fictional data. **External verification** needs credentials, provider approval or software not available during this build.

## Foundation

- **Implemented:** isolated Git repository at `E:\cash-flow-app`; Next.js, TypeScript, React, Tailwind, ESLint, Prettier, Vitest and Playwright.
- **Implemented:** responsive application shell, desktop sidebar, compact mobile navigation, light/dark modes, accessible labels, keyboard focus, loading, empty and error states.
- **Implemented:** PWA manifest, 192/512 icons, service worker, install guidance and secure caching boundary.
- **Implemented:** approved-email passwordless flow, protected pages/APIs, sign-out and safe session expiry.
- **External verification:** actual Supabase emails, MFA and cloud session recovery need a Supabase project.

## Data and security

- **Implemented:** every specified table, UUID keys, timestamps, foreign keys, indexes, soft-deletion fields, integer cents, currency fields and raw/normalised transaction separation.
- **Implemented:** RLS on all exposed tables, owner predicates, secure update checks, anonymous revocation and explicit authenticated Data API grants.
- **Implemented:** signed provider webhook validation, security headers, masked identifiers, safe errors, audit/sync/error models and secret placeholders.
- **External verification:** migration execution, advisors, backups/PITR and restoration drill need Supabase and Docker or a hosted project.

## Bank connectivity

- **Implemented:** Basiq v3 token/client boundary, hosted Consent UI URL, user/account/transaction paths, manual refresh, disconnect/reconnect, sync/audit models, idempotency and pending reconciliation domain functions.
- **Implemented:** synthetic connection state is visibly labelled and never presented as live data.
- **External verification:** Basiq sandbox consent, Hooli Open Banking, actual enriched fields, rate behaviour and live webhooks need a developer key.
- **External verification:** production connectivity needs Basiq commercial, security/compliance and CDR onboarding.

## Accounts and transactions

- **Implemented:** connected/manual accounts, masks, source/sync status, local rename-ready model, hide/report/net-worth toggles, archive, refresh and disconnect.
- **Implemented:** transaction search, account/category/review filters, category edits, manual records, selection/bulk category, splits, transfer/refund/report flags and CSV export.
- **Implemented:** CSV preview, column mapping, date/amount validation, duplicate detection, error feedback and confirmed import.
- **Implemented:** deterministic rules with priority and manual override; transfer candidates and credit-card repayment pairs.
- **Implemented:** raw imported records remain separate from normalised records in the cloud schema.

## Cash flow and planning

- **Implemented:** income, spending, saved amount, savings rate, wealth-building rate, investment contribution boundary, liquid net worth and emergency-runway explanation.
- **Implemented:** dashboard cards, net-worth trend, income/spending, category mix, goals, recurring costs, recent records, accounts, investments and review alerts.
- **Implemented:** required date-range selector, Australian 1 July financial-year default and custom-range option.
- **Implemented:** monthly overall/category plans, targets, actuals, remaining, percentage, forecast, daily pace, safe-daily estimate and rollover model.

## Goals, investments, assets and liabilities

- **Implemented:** multiple goals, target/current/date/priority, linked-account allocation model, contribution frequencies, manual contributions, pause, complete and archive.
- **Implemented:** weekly/fortnightly/monthly requirements, projected completion and on-track status.
- **Implemented:** manual holdings, purchases/sales/distributions model, tickers/exchange/classes/units/cost/current prices/returns/platform/currency/notes/update date and CSV schema.
- **Implemented:** editable fictional IOO and IVV holdings, manual market-price adapter and clear stale-date presentation.
- **Implemented:** manual superannuation, assets and HECS–HELP/liability tracking; total, liquid and excluding-super net worth; immutable historical snapshots.

## Recurring costs, reports and review

- **Implemented:** recurring transaction records, frequency, range, next date, active/cancelled status and confidence.
- **Implemented:** subscription monthly/annual equivalents, price-increase and renewal flags.
- **Implemented:** cash-flow, category, merchant-ready, rates, goal, net-worth, recurring, subscription and financial-year report views with filters and CSV export.
- **Implemented:** guided monthly summary, unusual records, reflection, priorities, target changes and saved prior review.
- **Implemented:** restrained in-app notifications and configurable notification categories.

## Data control

- **Implemented:** transaction CSV export, complete JSON export, browser-local reset and permanent local deletion.
- **Implemented:** cloud models for import/export jobs, rollback window and deletion audit.
- **External verification:** provider-token revocation and auth-user deletion need configured Supabase/Basiq credentials and fresh-auth production testing.

## Verification

- **Implemented:** automated tests for calculations, transfer detection, rules, manual override, deduplication, pending reconciliation, splits, subscription equivalents, webhook signatures and manifest.
- **Implemented:** Playwright desktop/mobile workflows for protected sign-in, navigation, transaction editing, goal progress, health and PWA manifest.
- **External verification:** real RLS cross-user test query, Basiq sandbox callback and hosted PWA installation require external services.
