# Progress

Current package: **P0**. Built, verified against real Postgres, and reviewed twice. Three owner-side steps remain before the `wp-P0-done` tag (see "Open").

## P0: Foundation and Claude Code setup (2026-11-19 to 2026-11-20)

**Done, with evidence shown in the session:**

- Scaffold (Next.js 16.4, TypeScript 6.0, Tailwind 4.3), Zod env, pino logger, `/api/health`, `/api/ready`.
- Tooling, the docs skeleton, CI (SHA-pinned, schema-validated), Dockerfile, and the Claude Code environment.
- Dev stack (`docker compose up -d`):
  - pgvector pg17, Redis 7, Mailpit, and RustFS for S3 storage (MinIO images are gone, see ADR 0002).
  - The bucket is created automatically. Every image is pinned by digest, and every port binds to loopback.
- Database roles:
  - The app logs in as `app_login` (`0001`). It is not a superuser and owns nothing.
  - The scripts use `DATABASE_OWNER_URL`.
  - Only `src/db` and `src/modules/tenancy` may open connections (ESLint, with a lint test).
- Reviews, two rounds each of `tenant-isolation-auditor` and `security-reviewer`:
  - Every listed finding is fixed, except the settings item under Open.
  - The second round has not been re-run on `c775185`.
- Evidence:
  - `pnpm gate`: pass, 138 unit tests.
  - Integration against Postgres 17: 13/13. They prove the role split, the RLS template (including reused connections and `tenant_id` changes), and composite foreign keys.
  - `db:migrate` run twice: applies 2, then 0. `db:seed` passes.
  - `/api/ready`: 200 with the DB up, 503 with the DB down, 200 again after restart. The app's only DB session is `app_login`.
  - E2E: 6/6 with axe, light and dark.
  - **Clean clone:** `pnpm i`, `docker compose up -d`, `db:migrate`, `db:seed`, `pnpm dev`, then `/api/ready` returns 200.
  - Live hooks blocked an edit to a committed migration, `.env` access, `HUSKY=0` and `--no-verify` text, and `rm -rf` outside build directories.

**Open (owner):**

1. Decide on the `.claude/settings.json` changes:
   - Route Grep and Glob through the `.env` guard. The code exists, but the matcher doesn't send those tools to it.
   - Add the extra deny rules.
2. Push to GitHub and confirm CI is green.
3. Run `/hooks` (it should list 4 hooks) and `/doctor` in the Claude Code CLI.

Then: tick P0 in `docs/PLAN.md` and tag `wp-P0-done`.

## Log

- P0: built, reviewed and DB-verified 2026-11-19 to 2026-11-20 (`4d7a3cc` through `c775185`).
