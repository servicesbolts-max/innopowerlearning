# Innopower Learn

A multi-tenant learning platform for Innopower AI and its partners. One codebase and one database serve fully branded, isolated partner spaces. The full spec is `docs/MASTER_PROMPT.md`, and progress is tracked in `docs/PROGRESS.md`.

## Prerequisites

- Node.js 26 LTS (`.nvmrc`) and pnpm 12 (`npm i -g pnpm@12`)
- Git
- One development Postgres:
  - **Option A (default):** Docker Desktop, which also runs Redis, MinIO and Mailpit.
  - **Option B:** a hosted dev Postgres 16+ with the `vector` extension available (Neon or Supabase).

## Quick start (clean clone)

```bash
pnpm i
cp .env.example .env          # Option B: set the two database URLs to your hosted ones
docker compose up -d          # Option A only
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Then open <http://localhost:3000> and check <http://localhost:3000/api/ready>, which should return `{"status":"ok"}`.

Local services (Option A): Postgres `localhost:5432`, Redis `6379`, MinIO API `9000` and console <http://localhost:9001>, Mailpit UI <http://localhost:8025>.

### Option B: hosted development Postgres

1. Create a free project on Neon or Supabase.
2. Copy the **direct** (non-pooled) owner connection string into `DATABASE_OWNER_URL` in `.env`, keeping `sslmode=require`.
3. Pick a password for the app's restricted login. Put it in `APP_DB_PASSWORD`, and set `DATABASE_URL` to the same host with user `app_login` and that password.
4. Run `pnpm db:migrate`. It enables `vector`, `pg_trgm` and `citext`, creates the `app_user`, `app_platform` and `app_login` roles, and sets the `app_login` password.
5. `pnpm db:reset` refuses non-local hosts by design. To start over, reset the branch in the provider's dashboard.

Tenant hosts (from P2) use `{slug}.localhost:3000`. `lvh.me:3000` works too if your browser does not resolve `*.localhost`.

## Commands

| Command                                    | What it does                                  |
| ------------------------------------------ | --------------------------------------------- |
| `pnpm dev`                                 | Start the dev server                          |
| `pnpm build` / `pnpm start`                | Production build and serve                    |
| `pnpm lint` / `pnpm typecheck`             | ESLint (zero warnings) and TypeScript         |
| `pnpm test`                                | Unit tests (Vitest)                           |
| `pnpm test:integration`                    | Integration tests (owner and runtime URLs)    |
| `pnpm e2e`                                 | Playwright with axe (starts the dev server)   |
| `pnpm db:migrate` / `db:seed` / `db:reset` | Database lifecycle (`db:reset` is local only) |
| `pnpm gate`                                | Quality gate: lint, typecheck, test, build    |

## Working with Claude Code

Each work package runs in its own session: `/clear`, then `/phase <id>`. To pick up after an interrupted session, use `/resume`. Project instructions are in `CLAUDE.md`, and the guardrails are in `.claude/`. See `CONTRIBUTING.md`.
