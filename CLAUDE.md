# Innopower Learn

Multi-tenant learning platform for Innopower AI and its partners (LSETF, WAPSEA AI Training, God's Entrepreneurs, William V. S. Tubman University).
One codebase, one Postgres database, strict tenant isolation. The spec is `docs/MASTER_PROMPT.md`. Read only the sections a package names.

## Stack

Next.js 16 App Router (Cache Components, Turbopack), React 19, TypeScript 6 strict, Tailwind v4 with CSS-variable tokens, Zod 4, PostgreSQL 17 + pgvector, Drizzle ORM, pino, Vitest, Playwright + axe, pnpm 12, Node 26.
Next.js 16 differs from older versions: before using a Next API, read the matching guide in `node_modules/next/dist/docs/`.

## Commands

- Install: `pnpm i`. Services: `docker compose up -d`.
- Dev: `pnpm dev` (http://localhost:3000, tenants at `{slug}.localhost:3000` from P2).
- Database: `pnpm db:migrate`, `pnpm db:seed`, `pnpm db:reset` (local only).
- Checks: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration`, `pnpm e2e`, `pnpm build`.
- Quality gate: `pnpm gate` (lint, typecheck, test, build). It must exit 0 before a commit.

## The loop for every work package (`/phase <id>`)

1. Orient: `docs/PROGRESS.md`, the package row in `docs/PLAN.md`, and only the spec sections it names.
2. Plan in plan mode: files, tests, risks, acceptance checks with evidence. At most three questions.
3. Implement in vertical slices. Commit each green slice with a Conventional Commit.
4. Verify with evidence: run the gate, and take screenshots at 390 and 1280 px, light and dark, for UI.
5. Review (`/review`), fix real findings, update PROGRESS and PLAN, tag `wp-<id>-done`, print the next command, and stop.

## IMPORTANT: non-negotiables

- Every tenant table has `tenant_id uuid not null`, composite foreign keys `(tenant_id, id)`, and RLS enabled **and forced**.
- All database access goes through `withTenant(ctx, fn)`. UI code (`src/app`, `src/design-system`) never imports `src/db`.
- Every server action checks `can()`, validates input with Zod, and writes an audit log entry when it changes state.
- UI uses design tokens only: no raw colors, radii, or spacing values.
- Partner admins never inject raw HTML or JavaScript. Page blocks are typed, Zod-validated JSON.
- All user-facing strings are externalized (next-intl). No secrets in code. Never read or write `.env*` files.
- Migrations are forward-only. Never edit a committed migration; add the next numbered file.
- Never push, force, hard-reset, or use `--no-verify`. Destructive DB commands run only on the local dev DB.

## Where things are

- `docs/PLAN.md`: work packages and acceptance. `docs/PROGRESS.md`: current state.
- `docs/ASSUMPTIONS.md`: decisions made while building. Add yours here.
- `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/RUNBOOK.md`, `docs/DESIGN_SYSTEM.md`, `docs/adr/`.
- Code layout: `src/app` (route groups), `src/modules/<name>` (public API in `index.ts`), `src/db` (schema, migrations), `src/lib`, `src/design-system`, `src/i18n`.
- Claude Code: `.claude/rules/` (path-scoped), `.claude/skills/` (`/phase`, `/gate`, `/review`, `/resume`), `.claude/agents/` (reviewers), `.claude/hooks/` (guardrails).

## Compaction

When compacting, preserve: the current package id, files changed so far, failing tests with their errors, open decisions, and the next step.
