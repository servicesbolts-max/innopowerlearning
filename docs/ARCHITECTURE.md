# Architecture

A modular monolith: one Next.js App Router codebase, one PostgreSQL database with a shared schema, and strict tenant isolation. See `docs/MASTER_PROMPT.md` Sections 2, 3 and 13 for the requirements.

## Request flow

```mermaid
flowchart LR
  B[Browser / PWA] -->|Host header| P[Next.js proxy<br/>tenant resolution]
  P -->|lookup tenant_domains<br/>cached by host| C[(Redis cache)]
  P --> R{Route group}
  R -->|root domain| H[(hub)]
  R -->|console.ROOT_DOMAIN| K[(console)]
  R -->|slug.ROOT_DOMAIN or custom domain| T[(tenant-public / learn / teach / admin)]
  H & K & T --> M[src/modules/*<br/>public index.ts APIs]
  M -->|can actor, permission, resource| A[rbac]
  M -->|withTenant ctx, fn| W[Transaction:<br/>SET LOCAL ROLE app_user<br/>SET LOCAL app.tenant_id]
  W --> D[(PostgreSQL<br/>RLS forced on every tenant table)]
  M --> J[Background jobs<br/>carry tenant_id]
  M --> S[(Object storage<br/>t/tenant_id/...)]
```

## Layers (enforced by ESLint)

| Layer               | May import                                         |
| ------------------- | -------------------------------------------------- |
| `src/app`           | modules, design-system, lib, i18n (never `src/db`) |
| `src/modules/*`     | other modules via `index.ts`, db, lib, i18n        |
| `src/design-system` | design-system, lib, i18n                           |
| `src/db`            | db, lib                                            |
| `src/lib`           | lib                                                |

## Isolation layers

1. Host-based tenant resolution in the proxy (P2).
2. A data-access layer that cannot run a query without a `TenantContext` (`withTenant`, P2).
3. Postgres RLS with `FORCE ROW LEVEL SECURITY`, under a role without BYPASSRLS (roles created in `0000_foundation.sql`).

_Status: P0 skeleton. Sections are filled in as packages land._
