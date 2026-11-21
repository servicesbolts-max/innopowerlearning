-- 0003_tenant_domain_claims: stop one tenant from squatting or probing another's domain.
-- Forward-only: never edit after commit.
--
-- 0002 made tenant_domains.host globally unique, including unverified and soft-deleted rows. A
-- tenant could therefore claim another organization's domain first (blocking it for good) and
-- learn from the unique-violation error which hosts other tenants hold. Now:
--   * a tenant can list a host once (tenant_id first, as the rules require);
--   * only one verified, live row per host may exist across all tenants, which is what host
--     resolution needs (resolve_tenant_by_host reads verified rows only).

ALTER TABLE tenant_domains DROP CONSTRAINT tenant_domains_host_key;
ALTER TABLE tenant_domains ADD CONSTRAINT tenant_domains_tenant_host_key UNIQUE (tenant_id, host);
CREATE UNIQUE INDEX tenant_domains_verified_host ON tenant_domains (host)
  WHERE verified_at IS NOT NULL AND deleted_at IS NULL;
