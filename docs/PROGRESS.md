# Progress

Current package: **P1 Design system** (not started). Start it in a fresh session with `/phase P1`.

## Log

- **P0 Foundation and Claude Code setup: done 2026-11-20, tag `wp-P0-done`.**
  - Stack and tooling:
    - Next.js 16.4, TypeScript 6.0 and Tailwind 4.3, with env validation, a logger, and `/api/health` and `/api/ready`.
    - Lint layer boundaries, Vitest, Playwright with axe, and Husky plus commitlint.
    - The docs skeleton and the Claude Code environment (rules, 4 skills, 4 subagents, 4 hooks, `.mcp.json`).
  - Database:
    - pgvector Postgres 17, Redis, Mailpit and RustFS (ADR 0002), pinned by digest and bound to loopback.
    - Checksummed forward-only migrations (`0000`, `0001`).
    - The app logs in as `app_login`, which is not a superuser and owns nothing. Only `src/db` and tenancy may connect.
  - Evidence:
    - Gate: 138 unit tests. Integration: 13/13 against Postgres 17. E2E: 6/6 with axe.
    - A clean clone runs end to end.
    - CI is green on GitHub (run #2, `0f4256c`).
    - Hooks blocked live attempts (committed-migration edit, `.env` access, `--no-verify`, `rm -rf`).
  - Reviews: two rounds each of the isolation and security reviewers. Every finding is fixed.

## Notes for P1

- The spec's `--label-secondary` fails AA on white (3.43:1). Resolve it in the token set (see ASSUMPTIONS).
- Port 3000 is often taken by another dev server on this machine. Run E2E with `PORT=3100`.
- Claude does not push. The owner runs `git push` after each package.
