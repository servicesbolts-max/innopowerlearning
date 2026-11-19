# Assumptions and decisions

Decisions made while building, so they can be reviewed and reversed. Newest at the bottom of each section.

## Product

- Most learners are in West Africa (for example Nigeria and Liberia) on mid-range Android phones with variable 3G/4G connectivity. Performance budgets, data-saver mode and offline-lite follow from this.
- Seed preset mapping (editable): LSETF `funded_program`, WAPSEA AI Training `training_provider`, God's Entrepreneurs `community_organization`, William V. S. Tubman University `university`.
- Innopower Learn is a working name, defined once in `src/lib/config.ts`.

## P0 (2026-11-19)

- **Runtime:** Node.js 26 (current LTS) and pnpm 12.21, pinned in `.nvmrc` and `packageManager`.
- **TypeScript 6.0**, not 7.0: typescript-eslint 8.x supports `<6.1`. Revisit when typescript-eslint supports 7.
- **Next.js 16.4** with Cache Components and Turbopack, as `create-next-app` generates it. `agentRules: false` keeps `AGENTS.md` a one-line pointer to `CLAUDE.md`; CLAUDE.md tells agents to read `node_modules/next/dist/docs/`.
- **Migrations:** plain numbered SQL files in `src/db/migrations`, applied by our own runner (`src/db/migrate.ts`) with an advisory lock and SHA-256 checksums. Editing an applied migration fails `db:migrate`. drizzle-kit only drafts SQL into `migrations/drafts/` for review.
- **Database roles:** `0000_foundation.sql` creates `app_user` and `app_platform` as NOLOGIN, NOSUPERUSER, NOBYPASSRLS. The app connects as the owner role and runs tenant queries under `SET LOCAL ROLE app_user` inside `withTenant` (P2). This keeps one connection string for Docker and hosted Postgres.
- **Health:** the `system` module owns readiness checks, because UI routes may not import `src/db`.
- **Architecture lint:** `eslint-plugin-boundaries` enforces the layers, and `no-restricted-imports` blocks deep cross-module imports and `src/db` imports from UI code.
- **CI evidence:** no GitHub remote yet, and Claude may not push. The workflow is schema-validated, and each CI command is run locally. The first remote run happens when the owner pushes.
- **Docker image tags:** Postgres (`pgvector/pgvector:pg17`) and Redis (`redis:7-alpine`) are pinned. MinIO and Mailpit use `latest` for local development only.
- **Lighthouse CI** assertions are `warn` until P14, when they become `error`.
- **Spec conflict for P1:** Section 7.2 `--label-secondary` (light `rgba(60,60,67,.60)`) composites to #8A8A8E on white, which is 3.43:1. That fails WCAG AA (4.5:1) for body text; axe caught it in the P0 smoke test. The hub page uses `--label` for body text. P1 must either restrict the secondary label to large or non-essential text, or darken it until it passes.
