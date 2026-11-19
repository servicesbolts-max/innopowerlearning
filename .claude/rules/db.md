---
paths:
  - "src/db/**"
  - "src/modules/**"
  - "tests/integration/**"
---

# Database rules

- **Roles:**
  - The owner role (`DATABASE_OWNER_URL`) owns all objects and is used only by `scripts/db-*.ts` and tests.
  - The app logs in as `app_login` (`DATABASE_URL`). It is not a superuser, owns nothing, and has no grants of its own.
  - Tenant queries run as `app_user`. Audited Super Admin paths run as `app_platform`.
  - Grant table privileges to `app_user` (and `app_platform` where needed). Never grant to `public` or `app_login`.
- **Tenant tables:** `tenant_id uuid not null`, first in every index and unique constraint. Primary keys are UUIDv7. Include `created_at`, `updated_at`, `created_by`, and `deleted_at` (soft delete). Timestamps are `timestamptz`. Money is integer minor units plus an ISO currency.
- **Composite foreign keys:** reference `(tenant_id, id)`, never `id` alone. Each referenced table needs `unique (tenant_id, id)`.
- **RLS, in the same migration that creates the table.** Use `nullif`, because a pooled connection that ran `set_config` earlier returns `''`, not NULL:
  ```sql
  alter table x enable row level security;
  alter table x force row level security;
  create policy x_tenant on x
    using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
  grant select, insert, update, delete on x to app_user;
  ```
- **`withTenant(ctx, fn)`** is the only way tenant data is queried (only `src/modules/tenancy` may import `getSql`; ESLint enforces this). Inside `sql.begin`:
  1. Validate `ctx.tenantId` with `z.uuid()`.
  2. `set local role app_user` (or `app_platform` only on the audited platform path).
  3. `select set_config('app.tenant_id', ${ctx.tenantId}, true)`, using a bind parameter. Never build `SET LOCAL ... = '${id}'` by string interpolation.
- **Views and functions:**
  - Views over tenant tables use `with (security_invoker = true)`.
  - No materialized views over tenant data. RLS cannot apply to them.
  - Avoid `SECURITY DEFINER`. If one is unavoidable, it gets `set search_path = public, pg_temp`, an explicit `tenant_id` filter, and `revoke execute ... from public`.
- **Migrations:**
  - Forward-only, numbered `NNNN_name.sql` in `src/db/migrations`.
  - Never edit a committed one. A hook blocks it, and `db:migrate` checksums fail.
  - Use expand and contract for breaking changes.
  - drizzle-kit drafts go to `migrations/drafts/` for review only.
- **Isolation test** (required for every tenant table, in `tests/integration/`; copy the pattern in `tests/integration/db.test.ts`):
  - Run as the **runtime login** (`DATABASE_URL`), never the owner. Owner queries prove nothing.
  - Seed tenants A and B, then inside `withTenant(A)`:
    1. Selecting B's rows returns 0.
    2. Inserting a row with B's `tenant_id` fails.
    3. Updating or deleting B's rows affects 0 rows.
    4. Updating an own row's `tenant_id` to B fails.
    5. Inserting a row whose composite foreign key points at B's parent row fails.
    6. A query with no tenant context returns 0 rows, including on a reused connection.
    7. A query outside `withTenant` fails with "permission denied".
- **Keys:** cache keys, storage keys (`t/{tenant_id}/...`), jobs, and webhooks always carry the tenant.
