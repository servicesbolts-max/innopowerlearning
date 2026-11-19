# Security

Checklist: OWASP ASVS Level 2 (`docs/MASTER_PROMPT.md` Section 10). Each package records which controls it adds.

## Controls in place (P0)

- Env validated with Zod; error messages name variables, never values.
- Logger redacts passwords, tokens, API keys, secrets, cookies, auth headers, emails, phone numbers and DB URLs, up to three levels deep (unit-tested).
- The app logs in as `app_login`: not a superuser, no BYPASSRLS, owns nothing, no grants of its own. Tenant work runs as `app_user`, platform work as `app_platform`. Only `src/modules/tenancy` may open connections (ESLint).
- TLS is required for the database connection in staging and production.
- `db:reset` runs only on loopback hosts with `APP_ENV=development` set explicitly.
- Local services bind to `127.0.0.1` only.
- Claude Code hooks block `.env*` reads and writes (file tools and shell), edits to committed migrations, pushes, force flags, hook bypasses (`-n`, `HUSKY=0`, `core.hooksPath`), recursive deletes and destructive SQL. They fail closed on an unreadable payload.
- CI: actions pinned to commit SHAs, `permissions: contents: read`, `pnpm audit --prod` (high and above), and gitleaks secret scanning.

## To come

CSP with nonces (P1/P2), CSRF and rate limits (P3), Argon2id and 2FA (P3), upload and webhook rules (P4b, P9), backup and restore drill (P14).

## Reporting a vulnerability

Email the platform owner's security contact (to be supplied in HANDOFF). Do not open public issues for vulnerabilities.
