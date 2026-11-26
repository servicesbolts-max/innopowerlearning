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

/**
 * Global identity tables. `sessions` carries a tenant_id (the host a session is bound to) but is
 * not a tenant table: app_user has no access to it at all.
 */
export const IDENTITY_TABLES = [
  "users",
  "accounts",
  "sessions",
  "verifications",
  "two_factors",
  "passkeys",
  "auth_rate_limits",
] as const;

/** Tables that are not tenant-owned. Anything else in `public` must be in TENANT_TABLES. */
export const GLOBAL_TABLES = [
  "_migrations",
  "plans",
  "tenants",
  // Identity (Better Auth), written only by app_auth: see 0004 and docs/adr/0004-auth.md.
  ...IDENTITY_TABLES,
] as const;

/**
 * In dependency order: parents first. `own.user` is a global fixture user (users is not a tenant
 * table), the same for both tenants.
 */
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
  {
    table: "memberships",
    row: (tenantId, id, own) => ({ tenant_id: tenantId, id, user_id: own.user, role: "learner" }),
  },
  {
    table: "invitations",
    row: (tenantId, id) => ({
      tenant_id: tenantId,
      id,
      email: `invitee-${id.slice(-8)}@example.org`,
      role: "learner",
      token_hash: id.replace(/-/g, "").repeat(2),
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    }),
  },
  {
    table: "audit_logs",
    row: (tenantId, id) => ({ tenant_id: tenantId, id, action: "test.event", metadata: {} }),
  },
  {
    table: "course_categories",
    row: (tenantId, id) => ({ tenant_id: tenantId, id, name: `Category ${id.slice(-8)}` }),
  },
  {
    table: "courses",
    row: (tenantId, id, own) => ({
      tenant_id: tenantId,
      id,
      slug: `course-${id.slice(-8)}`,
      title: "Fixture course",
      category_id: own.course_categories,
    }),
    crossTenantFk: { column: "category_id", parent: "course_categories" },
  },
  {
    table: "course_sections",
    row: (tenantId, id, own) => ({
      tenant_id: tenantId,
      id,
      course_id: own.courses,
      title: "Section",
    }),
    crossTenantFk: { column: "course_id", parent: "courses" },
  },
  {
    table: "lessons",
    row: (tenantId, id, own) => ({
      tenant_id: tenantId,
      id,
      course_id: own.courses,
      section_id: own.course_sections,
      title: "Lesson",
    }),
    crossTenantFk: { column: "section_id", parent: "course_sections" },
  },
];
