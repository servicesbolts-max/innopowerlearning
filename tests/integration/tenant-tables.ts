/**
 * Registry of every tenant table, driving tests/integration/isolation.test.ts. A new tenant
 * table is not done until it has an entry here (skill: add-tenant-table). The catalog test fails
 * for any table with a tenant_id column that is missing from this list.
 */
export interface TenantTableFixture {
  table: string;
  /** Column values for one row of `tenantId` (objects are jsonb). `own` holds earlier row ids. */
  row: (tenantId: string, id: string, own: Record<string, string>) => Record<string, unknown>;
  /** A composite foreign key to probe: setting `column` to another tenant's `parent` row fails. */
  crossTenantFk?: { column: string; parent: string };
}

/** Tables that are not tenant-owned. Anything else in `public` must be in TENANT_TABLES. */
export const GLOBAL_TABLES = ["_migrations", "plans", "tenants"] as const;

/** In dependency order: parents first. */
export const TENANT_TABLES: TenantTableFixture[] = [
  {
    table: "tenant_domains",
    row: (tenantId, id) => ({ tenant_id: tenantId, id, host: `t${id.slice(-12)}.example.org` }),
  },
  {
    table: "tenant_themes",
    row: (tenantId, id) => ({
      tenant_id: tenantId,
      id,
      name: "Default",
      theme: { accent: "#0071E3" },
    }),
  },
  {
    table: "tenant_settings",
    row: (tenantId, id, own) => ({
      tenant_id: tenantId,
      id,
      logo: { kind: "monogram", text: "T" },
      active_theme_id: own.tenant_themes,
    }),
    crossTenantFk: { column: "active_theme_id", parent: "tenant_themes" },
  },
  {
    table: "feature_flags",
    row: (tenantId, id) => ({ tenant_id: tenantId, id, key: "community", enabled: true }),
  },
];
