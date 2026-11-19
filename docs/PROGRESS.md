# Progress

Current package: **P0**. Built, reviewed and hardened; gate green. Database verification is blocked: Docker Desktop is installed, but WSL 2 is not, so its engine cannot start. Not yet tagged `wp-P0-done`.

## P0: Foundation and Claude Code setup (2026-11-19)

**Done, with evidence shown in the session:**

- Scaffold (Next.js 16.4, TypeScript 6.0, Tailwind 4.3), Zod env, pino logger, `/api/health`, `/api/ready`.
- Tooling, the docs skeleton, CI (SHA-pinned, schema-validated), Dockerfile, and the Claude Code environment.
- Review (`tenant-isolation-auditor` and `security-reviewer`): 16 findings (3 high, 9 medium, 4 low). All fixed in `5c8dd71` except the items under "Open" below. Main changes:
  - The app now logs in as `app_login`, created in `0001_runtime_login.sql`. It is not a superuser and owns nothing. Migrations, seed and reset use `DATABASE_OWNER_URL`.
  - Only `src/modules/tenancy` may import `getSql` (ESLint).
  - RLS template uses `nullif`. The isolation-test recipe runs as the runtime login.
  - Shell guard bypasses closed. Hooks fail closed. The `db:reset` guard is stricter. Logger redaction goes deeper. Compose binds to loopback.
- Evidence:
  - `pnpm gate`: pass, 94 unit tests.
  - `format:check`: clean.
  - E2E: 6/6 with axe, light and dark.
  - Clean clone passes the gate (before the review fixes).
  - Live hooks blocked an edit to a committed migration, a `.env` heredoc, and a `HUSKY=0` message.

**Open:**

1. Install WSL 2 (admin PowerShell: `wsl --install --no-distribution`, then reboot) and start Docker Desktop.
2. Then: `cp .env.example .env`, `docker compose up -d`, `pnpm db:migrate` (twice), `pnpm db:seed`, and `pnpm test:integration`. The integration tests that prove the role split and the RLS template have **not run yet**. Then confirm `/api/ready` returns 200.
3. The owner decides on the proposed `.claude/settings.json` changes: route Grep and Glob through the `.env` guard, and extend the deny list.
4. The owner pushes to GitHub and confirms CI is green. The owner runs `/hooks` and `/doctor` in the CLI.
5. Re-run `/review` after step 2, tick P0, and tag `wp-P0-done`.

## Log

- P0: built and reviewed 2026-11-19 (`4d7a3cc`, `20ff821`, `45a1ebd`, `5c8dd71`, plus this update).
