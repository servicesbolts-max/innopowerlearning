---
name: add-tenant-table
description: Add a tenant-owned table with forced RLS, composite foreign keys, a Drizzle mirror, an isolation-registry entry, seed data and docs.
argument-hint: <table_name, e.g. courses>
---

Add the tenant table **$ARGUMENTS**. Read `.claude/rules/db.md` first. Tables that are not tenant-owned (global catalogs) are rare. They go in `GLOBAL_TABLES` instead, and each needs a sentence in `docs/ASSUMPTIONS.md` explaining why.

1. **Migration.** Add the next numbered file, `src/db/migrations/NNNN_<name>.sql`. Never edit a committed one. Copy this shape from `0002_tenancy.sql` (`tenant_themes` or `tenant_settings`):

   ```sql
   CREATE TABLE $ARGUMENTS (
     tenant_id uuid NOT NULL REFERENCES tenants (id),
     id uuid NOT NULL DEFAULT gen_uuid_v7(),
     -- columns; money as integer minor units plus an ISO currency; jsonb only for validated config
     parent_id uuid,
     created_at timestamptz NOT NULL DEFAULT now(),
     updated_at timestamptz NOT NULL DEFAULT now(),
     created_by uuid,
     deleted_at timestamptz,
     PRIMARY KEY (tenant_id, id),
     FOREIGN KEY (tenant_id, parent_id) REFERENCES parent_table (tenant_id, id)
   );
   CREATE INDEX $ARGUMENTS_parent ON $ARGUMENTS (tenant_id, parent_id);
   CREATE TRIGGER $ARGUMENTS_updated_at BEFORE UPDATE ON $ARGUMENTS
     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
   ALTER TABLE $ARGUMENTS ENABLE ROW LEVEL SECURITY;
   ALTER TABLE $ARGUMENTS FORCE ROW LEVEL SECURITY;
   CREATE POLICY $ARGUMENTS_tenant ON $ARGUMENTS
     USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
     WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
   GRANT SELECT, INSERT, UPDATE, DELETE ON $ARGUMENTS TO app_user;
   ```

   - Put `tenant_id` first in every index and unique constraint.
   - Reference other tenant tables only through `(tenant_id, x_id)`.
   - Leave the policy without `TO`, so it also binds a non-superuser owner, which is what lets the seed run on hosted Postgres.
   - Grant only what the app needs. Write column-level grants when tenants must not set a column themselves (see `tenant_domains.verified_at`).
   - Never add `SECURITY DEFINER` or a materialized view over tenant data.

2. **Apply:** `set -a && . ./.env.example && set +a && pnpm db:migrate`.
3. **Drizzle mirror.** Add the table to `src/db/schema/<area>.ts` and export it from `src/db/schema/index.ts`. Mirror every column with the same nullability. The drift test in `tests/integration/tenancy.test.ts` compares the mirror with `information_schema`.
4. **Isolation registry.** Add an entry to `TENANT_TABLES` in `tests/integration/tenant-tables.ts`:
   - Place it after its parents.
   - `row()` returns the values of one valid row, with jsonb as plain objects.
   - Set `crossTenantFk` for its first composite foreign key.

   The catalog test fails until the entry exists. The 7 checks then run on the table automatically.

5. **Data access** only goes through `withTenant(ctx, fn)` from `@/modules/tenancy`, inside the owning module's `src/modules/<name>`. UI code never imports `@/db`.
6. **Seed.** If demo content needs the table, extend `scripts/seed/seed-demo.ts`:
   - Upsert by a natural key, so a second run changes nothing.
   - Run with `app.tenant_id` set to the row's tenant.
   - Check that `tests/integration/seed.test.ts` still passes.
7. **Verify:** `pnpm test:integration` (show the isolation output for the new table), then `pnpm gate`.
8. **Docs.**
   - If the table changes the request or data flow, update the "Data model" section in `docs/ARCHITECTURE.md`.
   - Record decisions in `docs/ASSUMPTIONS.md`.
