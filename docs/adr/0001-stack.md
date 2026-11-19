# ADR 0001: Technology stack

- Status: accepted
- Date: 2026-11-19

## Context

`docs/MASTER_PROMPT.md` Section 2 prescribes the stack and asks for an ADR when a choice differs.

## Decision

We adopt the Section 2 stack as written: TypeScript (strict), Next.js App Router, PostgreSQL 16+ with Drizzle, Better Auth, Tailwind with CSS-variable tokens, Zod, Vitest, Playwright and axe, and Docker Compose for local services. P0 fixes these versions:

| Item              | Version                | Note                                     |
| ----------------- | ---------------------- | ---------------------------------------- |
| Node.js           | 26 LTS                 | `.nvmrc`                                 |
| pnpm              | 12.21                  | `packageManager`                         |
| Next.js           | 16.4                   | Cache Components, Turbopack              |
| TypeScript        | 6.0                    | 7.0 waits for typescript-eslint support  |
| Postgres image    | pgvector/pgvector:pg17 | satisfies 16+ and pgvector               |
| Drizzle ORM / kit | 0.45 / 0.31            | SQL migrations applied by our own runner |

## Consequences

- Migrations are hand-reviewed SQL, so RLS policies and composite foreign keys stay visible in review.
- Upgrading TypeScript to 7 needs a follow-up ADR once lint tooling supports it.
