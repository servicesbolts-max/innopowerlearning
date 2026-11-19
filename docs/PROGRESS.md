# Progress

Current package: **P0**. Built and gate green; database verification is pending Docker Desktop. Not yet tagged `wp-P0-done`.

## P0: Foundation and Claude Code setup (2026-11-19)

**Done, with evidence shown in the session:**

- Scaffold: Next.js 16.4, React 19.3, TypeScript 6.0 strict, Tailwind 4.3, and the Section 13 layout.
- `src/lib/env.ts` (Zod), the pino logger, and `/api/health` plus `/api/ready` (returns 503 without a DB).
- Tooling:
  - ESLint layer boundaries, plus bans on deep module imports and on `src/db` in UI.
  - Prettier, Vitest, Playwright with axe, Husky, lint-staged, and commitlint.
- Database:
  - `docker-compose.yml`: pgvector pg17, Redis, MinIO, and Mailpit.
  - A checksummed, forward-only migration runner, and `0000_foundation.sql` (extensions, `app_user` and `app_platform` roles).
  - Seed and reset guards.
- CI: `.github/workflows/ci.yml` (schema-validated), a Dockerfile, and Lighthouse CI in warn mode.
- Docs skeleton (Section 14) and `docs/PLAN.md` with all 25 packages.
- Claude Code: CLAUDE.md, a one-line AGENTS.md, rules (`db`, `design-system`), skills (`/phase`, `/gate`, `/review`, `/resume`), four subagents, settings with permissions and hooks, and `.mcp.json`.
- Evidence:
  - `pnpm gate`: pass, 61 unit tests.
  - `format:check` and `pnpm audit`: clean.
  - E2E: 6/6, axe clean, mobile light and desktop dark.
  - Clean clone: `pnpm i --frozen-lockfile && pnpm gate` passes.
  - A real Edit of the committed migration was blocked by the hook, and 12 hook payload cases behaved as expected.
- Found and fixed: the spec's `--label-secondary` fails AA on white (3.43:1). Recorded in ASSUMPTIONS for P1.

**Remaining to close P0:**

1. Install Docker Desktop. Then run `docker compose up -d && pnpm db:migrate && pnpm db:migrate && pnpm db:seed && pnpm test:integration`, and confirm `/api/ready` returns 200.
2. The owner creates the GitHub repo and pushes. Confirm the first CI run is green.
3. The owner runs `/hooks` (it should list 4 hooks) and `/doctor` in the Claude Code terminal.
4. Run `/review` on the P0 diff, then tick P0 in PLAN.md and tag `wp-P0-done`.

## Log

- P0: built 2026-11-19 (commits `4d7a3cc`, `20ff821`, and the follow-up). Closing steps are listed above.
