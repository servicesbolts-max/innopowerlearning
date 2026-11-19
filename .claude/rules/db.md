---
paths:
  - "src/db/**"
  - "src/modules/**"
---

# Database rules

- **Tenant tables:** `tenant_id uuid not null`, first in every index and unique constraint. Primary keys are UUIDv7. Include `created_at`, `updated_at`, `created_by`, and `deleted_at` (soft delete). Timestamps are `timestamptz`. Money is integer minor units plus an ISO currency.
- **Composite foreign keys:** reference `(tenant_id, id)`, never `id` alone, so a row can't point at another tenant's row. Each referenced table needs `unique (tenant_id, id)`.
- **RLS, in the same migration that creates the table:**
  ```sql
  alter table x enable row level security;
  alter table x force row level security;
  create policy x_tenant on x
    using (tenant_id = current_setting('app.tenant_id', true)::uuid)
    with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
  grant select, insert, update, delete on x to app_user;
  ```
- **Access:** only through `withTenant(ctx, fn)`, which opens a transaction and runs `set local role app_user` and `set local app.tenant_id`. No query runs outside it, except audited platform paths that use `app_platform`.
- **Migrations:** forward-only, numbered `NNNN_name.sql` in `src/db/migrations`. Never edit a committed one (a hook blocks it, and `db:migrate` checksums fail). Use expand and contract for breaking changes. drizzle-kit drafts go to `migrations/drafts/` for review only.
- **Isolation test** (required for every tenant table, in `tests/integration/`): seed tenants A and B, then inside `withTenant(A)`:
  1. Selecting B's rows returns 0.
  2. Inserting a row with B's `tenant_id` fails.
  3. Updating or deleting B's rows affects 0 rows.
  4. A query with no tenant context returns 0 rows.
- **Keys:** cache keys, storage keys (`t/{tenant_id}/...`), jobs, and webhooks always carry the tenant.
