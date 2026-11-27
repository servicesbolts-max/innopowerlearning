-- 0012_platform_provisioning_scope: narrow app_platform to the tenant it is creating (review fix).
-- Forward-only: never edit after commit.
--
-- 0011 let app_platform SELECT and INSERT tenant_themes, tenant_settings, feature_flags and
-- invitations under the ordinary tenant policy (tenant_id = app.tenant_id), so app_platform
-- pointed at an existing tenant could read its rows or add an admin invitation. Now:
--   * no SELECT on those tables at all (provisioning only inserts);
--   * a RESTRICTIVE insert policy per table: the row's tenant must have been created in the
--     current transaction (created_at >= now(), which is the transaction start time), so only a
--     tenant being provisioned right now qualifies.

REVOKE SELECT ON tenant_themes, tenant_settings, feature_flags, invitations FROM app_platform;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['tenant_themes', 'tenant_settings', 'feature_flags', 'invitations',
                           'audit_logs']
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON %I AS RESTRICTIVE FOR INSERT TO app_platform
         WITH CHECK (tenant_id IN (SELECT id FROM tenants WHERE created_at >= now()))',
      t || '_platform_new_tenant', t);
  END LOOP;
END
$$;

-- The tenant row itself: app_platform may only insert a tenant stamped with this transaction.
CREATE POLICY tenants_platform_new ON tenants AS RESTRICTIVE FOR INSERT TO app_platform
  WITH CHECK (created_at >= now());
