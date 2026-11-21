# Security

Checklist: OWASP ASVS Level 2 (`docs/MASTER_PROMPT.md` Section 10). Each package records which controls it adds.

## Controls in place (P0)

- Env validated with Zod; error messages name variables, never values.
- Logger redaction is a safety net, not a guarantee. It masks passwords, tokens, API keys, secrets, cookies, auth headers, emails, phone numbers and DB URLs by key name, up to three levels deep (unit-tested). It does not mask deeper keys, or secrets inside string values such as error messages, so never log those on purpose.
- The app logs in as `app_login`: not a superuser, no BYPASSRLS, owns nothing, no grants of its own. Tenant work runs as `app_user`, platform work as `app_platform`. Only `src/modules/tenancy` may open connections (ESLint).
- Database TLS:
  - Preview, staging and production use `verify-full`, which checks the certificate and hostname.
  - In development, any non-loopback host uses `require`, including the owner connection the scripts use.
  - A provider with a private CA will need that CA configured (P14).
- `db:reset` runs only on loopback hosts with `APP_ENV=development` set explicitly.
- Local services bind to `127.0.0.1` only.
- Claude Code hooks block `.env*` reads and writes (file tools and shell), edits to committed migrations, pushes, force flags, hook bypasses (`-n`, abbreviated no-verify flags, `HUSKY=0`, `core.hooksPath`), command substitution inside commit messages, recursive deletes outside build directories, recursive grep without an `.env` exclude, and destructive SQL.
  - They fail closed on an unreadable payload or any internal error.
  - The shell guard is best-effort pattern matching, not a parser. The permission rules are the second layer.
  - Destructive DML such as `DELETE` is not blocked, because it can only reach the local dev database.
- CI: actions pinned to commit SHAs, `permissions: contents: read`, `pnpm audit --prod` (high and above), and gitleaks secret scanning.

## Controls added in P2

- **Isolation layer 1:** the proxy resolves the tenant from the Host header before rendering. Unknown or inactive tenants, malformed hosts, reserved labels and hub-only paths on tenant hosts get a 404. Incoming `x-tenant-*` and `x-innopower-*` headers are stripped, so clients cannot inject tenant context.
- **Isolation layer 2:** `withTenant(ctx, fn)` validates the id with `z.uuid()`, then `SET LOCAL ROLE app_user` and `set_config('app.tenant_id', $1, true)` with a bind parameter. Both are transaction-local, so pooled connections never carry them over.
- **Isolation layer 3:** every tenant table has RLS enabled and forced, with no `TO` clause, so the policy binds the owner too. `tenants` is filtered on its own `id`. Composite foreign keys `(tenant_id, x_id)` block cross-tenant references.
- **Least-privilege grants:** tenants can read but not change `tenants`, `plans` and `feature_flags`. They cannot set `tenant_domains.verified_at`, and hosts are unique per tenant, with a single verified owner (0003), so a tenant can neither claim, block nor probe another organization's domain.
- **Fail closed in production:** `APP_ENV` must be explicit when `NODE_ENV=production`, so dev-only behavior (the `/t/<slug>` fallback, `http` links) can never switch on by default.
- **Proxy coverage:** only build assets, `favicon.ico` and the exact health probes skip the proxy. A file extension cannot bypass the host checks. Misses are cached separately, so Host-header floods cannot evict real tenants.
- **Cache keys:** tenant data is cached by tenant id, never by slug alone. Slugs that are not valid partner slugs never reach a cache.
- **Focus visibility:** plain links get the 2 px focus ring (WCAG 2.4.7).
- **Pre-tenant lookups:** three `SECURITY DEFINER` functions with a fixed `search_path`. Execute is revoked from PUBLIC and granted to `app_user`. They are owned by `app_resolver` (NOLOGIN, NOBYPASSRLS), which can read only the columns they return, and they return public fields only.
- **Tests:** a data-driven isolation suite runs as the runtime login. A catalog test fails if any table with `tenant_id` lacks a registry entry, forced RLS or a policy.
- **Theme and logo data** are validated on read: an invalid stored theme falls back to the default, so it cannot inject CSS. Logos are typed monogram data, never markup.

## Controls added in P3

- **Identity separated by database role (ADR 0004):** Better Auth runs as `app_auth`, which reaches only the identity tables (users, accounts, sessions, verifications, TOTP secrets, passkeys, rate limits). It cannot read any tenant table. Tenants (`app_user`) see a few columns of their own members only, never credentials, sessions or secrets.
- **Passwords:** Argon2id (19 MiB, 2 iterations, 1 lane), 10 to 128 characters. A breached-password check (k-anonymity) runs in staging and production. Only Argon2id hashes verify; anything else fails closed.
- **Sessions:**
  - Bound to the tenant host they were created on; other hosts' sessions are rejected server-side.
  - Host-only, httpOnly cookies, `Secure` outside development, capped by the tenant's session length.
  - Same-origin trusted origins (CSRF). Auth forms POST even before hydration.
- **Admin two-step verification:** TOTP (encrypted with `BETTER_AUTH_SECRET`, single-use backup codes) or a passkey is required for admin roles and platform staff. Magic links and OAuth are refused for them (OAuth is allowed on SSO-only tenants).
- **Admission:** registration modes, suspended and pending members, and invitations are enforced when a session is created, not only in the UI. Invitations need a hashed, single-use, expiring token plus the invited address.
- **Email verification and pre-hijacking:** password sign-ups need a confirmed address before any session. A magic link that proves an unverified address drops any password set on it first.
- **Rate limits:** sign-in, sign-up, magic link, TOTP and backup codes, per client IP from `AUTH_IP_HEADER`, which staging and production must set to a header the edge overwrites.
- **Redirects:** `next` and `callbackURL` accept same-origin paths only.
- **Impersonation:** platform owner only (staff need an explicit grant), members only, never platform staff, required reason, hard deadline of 60 minutes or less. Password, 2FA, passkey, payment and impersonation permissions are blocked while active. Only reading the session, signing out and stopping are allowed while active, and nothing after the deadline. Start requires the platform user's own second factor. Start and stop are audited; a banner shows throughout.
- **Security changes audited:** password, 2FA, backup codes, passkeys and session revocation.
- **Audit log:** append-only (grants plus a trigger that blocks UPDATE everywhere, and DELETE for app roles). Metadata is validated to hold no PII or secrets.
- **Server actions:** `defineAction` runs a session check (tenant-bound), the 2FA gate, Zod validation and `can()`, then writes the change and its audit entry in one transaction.
- **Secrets:** `BETTER_AUTH_SECRET` is required in staging and production; production servers refuse Better Auth's default secret.

## To come

CSP with nonces (P14 hardening), upload and webhook rules (P4b, P9), passkeys on custom domains (P10d), backup and restore drill (P14).

## Reporting a vulnerability

Email the platform owner's security contact (to be supplied in HANDOFF). Do not open public issues for vulnerabilities.
