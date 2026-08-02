# Security and privacy

- The approved owner email is read only from a server environment variable.
- Demo magic links expire after ten minutes; demo sessions use an HttpOnly, SameSite=Lax, production-Secure cookie and expire after eight hours.
- Supabase mode uses cookie-based PKCE through `@supabase/ssr` and refreshes tokens through the Next.js proxy.
- Authorization is enforced at the page/data boundary and again by PostgreSQL RLS.
- Every exposed finance table has RLS. Policies compare `auth.uid()` with the row owner for SELECT, INSERT, UPDATE and DELETE; UPDATE includes both `USING` and `WITH CHECK`.
- Anonymous table access is revoked. The service-role key is never used in browser code.
- Tables created through SQL receive explicit authenticated grants to account for current Supabase Data API defaults.
- Basiq keys and access tokens stay server-side. Webhook verification uses the raw body, HMAC-SHA256, timing-safe comparison and a five-minute replay window.
- Account identifiers are masked. Logs and error responses must not include complete account numbers, secrets, raw provider payloads or stack traces.
- Global response headers prevent framing and MIME sniffing and restrict unnecessary device permissions. The service worker is served without caching.
- The service worker does not cache API/auth requests or authenticated HTML. It retains only the public app shell and static assets.
- Destructive local deletion asks for confirmation. Production deletion must require fresh authentication and provider disconnection before user-data removal.
- No real data is present in source, tests, screenshots or seed files.

Before production, complete a threat-model review, run Supabase advisors, configure rate limiting at Vercel, test CSRF protections on state-changing routes, enable MFA, verify backup restoration and commission an independent security review.
