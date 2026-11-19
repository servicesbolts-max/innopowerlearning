# Security

Checklist: OWASP ASVS Level 2 (`docs/MASTER_PROMPT.md` Section 10). Each package records which controls it adds.

## Controls in place (P0)

- Env validated with Zod; error messages name variables, never values.
- Logger redacts passwords, tokens, secrets, cookies, emails and phone numbers.
- App DB roles `app_user` and `app_platform` are NOSUPERUSER and NOBYPASSRLS.
- Claude Code hooks block `.env*` access, edits to committed migrations, pushes, force flags and destructive SQL.
- CI: `pnpm audit --prod` (high and above) and gitleaks secret scanning.

## To come

CSP with nonces (P1/P2), CSRF and rate limits (P3), Argon2id and 2FA (P3), upload and webhook rules (P4b, P9), backup and restore drill (P14).

## Reporting a vulnerability

Email the platform owner's security contact (to be supplied in HANDOFF). Do not open public issues for vulnerabilities.
