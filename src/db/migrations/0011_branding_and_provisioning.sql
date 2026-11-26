-- 0011_branding_and_provisioning: Partner Admin branding and Console provisioning (MVP M6, M7).
-- Forward-only: never edit after commit.
--
-- * Tenant admins may rename their own tenant (column grant on tenants.name; the existing
--   tenants_self policy keeps the update to the current tenant). Slug, kind, status and plan
--   stay Super Admin only.
-- * app_platform (audited Console path only) may read the tenant list and create a new
--   tenant's first rows. The existing tenant policies have no TO clause, so every insert still
--   needs app.tenant_id set to the new tenant: app_platform cannot write into another tenant
--   it is not provisioning, and it cannot read any tenant's data.

GRANT UPDATE (name) ON tenants TO app_user;

GRANT SELECT (id, slug, name, kind, preset, status, listed, created_at, deleted_at)
  ON tenants TO app_platform;
GRANT INSERT ON tenants TO app_platform;
CREATE POLICY tenants_platform_read ON tenants FOR SELECT TO app_platform USING (true);

GRANT SELECT, INSERT ON tenant_themes, tenant_settings, feature_flags, invitations TO app_platform;
GRANT INSERT ON audit_logs TO app_platform;
