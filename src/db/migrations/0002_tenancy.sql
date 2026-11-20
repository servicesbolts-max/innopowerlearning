-- 0002_tenancy: core tenancy schema (P2). Forward-only: never edit after commit.
--
-- Global tables: plans (catalog), tenants (the tenant root; RLS on id).
-- Tenant tables (RLS enabled and forced, tenant_id first): tenant_domains, tenant_themes,
-- tenant_settings, feature_flags.
-- Pre-tenant lookups (host resolution, the public partner directory) go through three
-- SECURITY DEFINER functions owned by app_resolver, which can read only a few columns.
-- Users, memberships and profiles arrive with auth in P3.

-- UUIDv7 (time-ordered). Postgres 17 has no built-in; Postgres 18's pg_catalog.uuidv7() is
-- equivalent. Takes a v4 UUID, writes the millisecond timestamp into the first 48 bits and
-- turns the version nibble from 0100 into 0111.
CREATE FUNCTION gen_uuid_v7() RETURNS uuid
LANGUAGE sql VOLATILE PARALLEL SAFE
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT encode(
    set_bit(set_bit(
      overlay(uuid_send(gen_random_uuid())
        PLACING substring(int8send(floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint) FROM 3)
        FROM 1 FOR 6),
      52, 1), 53, 1),
    'hex')::uuid
$$;

CREATE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;

-- ---------------------------------------------------------------------------------------------
-- plans: global catalog of limits. Read-only for the app; Super Admin manages it (P11).
CREATE TABLE plans (
  id uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  key text NOT NULL UNIQUE CHECK (key ~ '^[a-z][a-z0-9_]{1,39}$'),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  seats integer NOT NULL CHECK (seats >= 0),
  storage_gb integer NOT NULL CHECK (storage_gb >= 0),
  video_minutes integer NOT NULL CHECK (video_minutes >= 0),
  ai_credits integer NOT NULL CHECK (ai_credits >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  deleted_at timestamptz
);
CREATE TRIGGER plans_updated_at BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
GRANT SELECT ON plans TO app_user;

-- ---------------------------------------------------------------------------------------------
-- tenants: one row per tenant, including the Hub (kind = 'platform'). The id is the tenant id,
-- so RLS compares id (not tenant_id) with app.tenant_id: a tenant sees only its own row.
CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  slug citext NOT NULL UNIQUE
    CHECK (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$'),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  kind text NOT NULL DEFAULT 'partner' CHECK (kind IN ('platform', 'partner')),
  preset text NOT NULL CHECK (preset IN ('platform', 'training_provider', 'funded_program',
                                         'university', 'community_organization')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
  listed boolean NOT NULL DEFAULT true,
  plan_id uuid REFERENCES plans (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  deleted_at timestamptz,
  CHECK ((kind = 'platform') = (preset = 'platform')),
  -- Host labels the platform uses itself. Only the platform tenant may take one (the Hub, "hub").
  CHECK (kind = 'platform' OR slug NOT IN ('admin', 'api', 'app', 'assets', 'auth', 'cdn',
    'console', 'docs', 'help', 'hub', 'mail', 'static', 'status', 'support', 't', 'www'))
);
-- At most one platform tenant (the Hub).
CREATE UNIQUE INDEX tenants_one_platform ON tenants ((kind)) WHERE kind = 'platform';
CREATE TRIGGER tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
CREATE POLICY tenants_self ON tenants
  USING (id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (id = nullif(current_setting('app.tenant_id', true), '')::uuid);
-- Tenants never create, rename or re-plan themselves; Super Admin does (P11).
GRANT SELECT ON tenants TO app_user;

-- ---------------------------------------------------------------------------------------------
-- tenant_domains: verified custom domains. Subdomains ({slug}.ROOT_DOMAIN) resolve by
-- tenants.slug, so changing ROOT_DOMAIN needs no data change. host is globally unique (one host
-- maps to one tenant), the documented exception to "tenant_id first in unique constraints".
CREATE TABLE tenant_domains (
  tenant_id uuid NOT NULL REFERENCES tenants (id),
  id uuid NOT NULL DEFAULT gen_uuid_v7(),
  host citext NOT NULL UNIQUE
    CHECK (host ~ '^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$'),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  deleted_at timestamptz,
  PRIMARY KEY (tenant_id, id)
);
CREATE TRIGGER tenant_domains_updated_at BEFORE UPDATE ON tenant_domains
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
ALTER TABLE tenant_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_domains FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_domains_tenant ON tenant_domains
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
-- A tenant may add, soft-delete or remove a domain, never mark it verified: verification is a
-- platform job (P10d).
GRANT SELECT, DELETE ON tenant_domains TO app_user;
GRANT INSERT (tenant_id, id, host, created_by) ON tenant_domains TO app_user;
GRANT UPDATE (deleted_at) ON tenant_domains TO app_user;

-- ---------------------------------------------------------------------------------------------
-- tenant_themes: Section 7.5 theme data, validated by tenantThemeSchema before every write.
CREATE TABLE tenant_themes (
  tenant_id uuid NOT NULL REFERENCES tenants (id),
  id uuid NOT NULL DEFAULT gen_uuid_v7(),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  theme jsonb NOT NULL CHECK (jsonb_typeof(theme) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  deleted_at timestamptz,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, name)
);
CREATE TRIGGER tenant_themes_updated_at BEFORE UPDATE ON tenant_themes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
ALTER TABLE tenant_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_themes FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_themes_tenant ON tenant_themes
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON tenant_themes TO app_user;

-- ---------------------------------------------------------------------------------------------
-- tenant_settings: one row per tenant. The logo is typed data ({"kind":"monogram","text":"LS"}),
-- never stored SVG or markup. active_theme_id uses a composite foreign key, so a tenant can
-- never point at another tenant's theme.
CREATE TABLE tenant_settings (
  tenant_id uuid NOT NULL REFERENCES tenants (id),
  id uuid NOT NULL DEFAULT gen_uuid_v7(),
  tagline text CHECK (length(tagline) <= 200),
  logo jsonb NOT NULL CHECK (jsonb_typeof(logo) = 'object'),
  locale text NOT NULL DEFAULT 'en' CHECK (locale ~ '^[a-z]{2,3}(?:-[A-Z]{2})?$'),
  time_zone text NOT NULL DEFAULT 'UTC' CHECK (length(time_zone) BETWEEN 1 AND 64),
  placeholder_branding boolean NOT NULL DEFAULT false,
  active_theme_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  deleted_at timestamptz,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id),
  FOREIGN KEY (tenant_id, active_theme_id) REFERENCES tenant_themes (tenant_id, id)
);
CREATE TRIGGER tenant_settings_updated_at BEFORE UPDATE ON tenant_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_settings_tenant ON tenant_settings
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON tenant_settings TO app_user;

-- ---------------------------------------------------------------------------------------------
-- feature_flags: per-tenant switches. Keys are validated in code (a Zod enum). Read-only for the
-- tenant; plans and Super Admin set them (P11).
CREATE TABLE feature_flags (
  tenant_id uuid NOT NULL REFERENCES tenants (id),
  id uuid NOT NULL DEFAULT gen_uuid_v7(),
  key text NOT NULL CHECK (key ~ '^[a-z][a-z0-9_]{1,63}$'),
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  deleted_at timestamptz,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, key)
);
CREATE TRIGGER feature_flags_updated_at BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags FORCE ROW LEVEL SECURITY;
CREATE POLICY feature_flags_tenant ON feature_flags
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT ON feature_flags TO app_user;

-- ---------------------------------------------------------------------------------------------
-- app_resolver: owns the pre-tenant lookup functions below. It cannot log in, cannot bypass RLS,
-- and can read only the columns those functions return. Owning the functions (instead of the
-- migrator) matters on hosted Postgres, where the migrator is not a superuser and is itself
-- bound by FORCE ROW LEVEL SECURITY.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_resolver') THEN
    CREATE ROLE app_resolver NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
  EXECUTE format('GRANT app_resolver TO %I', current_user);
END
$$;
GRANT USAGE ON SCHEMA public TO app_resolver;
GRANT SELECT (id, slug, name, kind, preset, status, listed, deleted_at) ON tenants TO app_resolver;
GRANT SELECT (tenant_id, host, verified_at, deleted_at) ON tenant_domains TO app_resolver;
CREATE POLICY tenants_resolver ON tenants FOR SELECT TO app_resolver USING (true);
CREATE POLICY tenant_domains_resolver ON tenant_domains FOR SELECT TO app_resolver USING (true);

-- Subdomain lookup: {slug}.ROOT_DOMAIN. Returns no row for unknown or deleted tenants.
CREATE FUNCTION resolve_tenant_by_slug(p_slug text)
RETURNS TABLE (id uuid, slug text, status text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT t.id, t.slug::text, t.status
  FROM tenants t
  WHERE t.slug = p_slug::citext AND t.kind = 'partner' AND t.deleted_at IS NULL
$$;

-- Custom domain lookup: verified, not deleted domains only.
CREATE FUNCTION resolve_tenant_by_host(p_host text)
RETURNS TABLE (id uuid, slug text, status text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT t.id, t.slug::text, t.status
  FROM tenant_domains d
  JOIN tenants t ON t.id = d.tenant_id
  WHERE d.host = p_host::citext
    AND d.verified_at IS NOT NULL AND d.deleted_at IS NULL
    AND t.kind = 'partner' AND t.deleted_at IS NULL
$$;

-- The Hub's public partner directory: active, listed partners, public fields only.
CREATE FUNCTION list_public_partners()
RETURNS TABLE (slug text, name text, preset text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT t.slug::text, t.name, t.preset
  FROM tenants t
  WHERE t.kind = 'partner' AND t.status = 'active' AND t.listed AND t.deleted_at IS NULL
  ORDER BY t.name
$$;

-- ALTER ... OWNER needs the new owner to hold CREATE on the schema at that moment only.
GRANT CREATE ON SCHEMA public TO app_resolver;
ALTER FUNCTION resolve_tenant_by_slug(text) OWNER TO app_resolver;
ALTER FUNCTION resolve_tenant_by_host(text) OWNER TO app_resolver;
ALTER FUNCTION list_public_partners() OWNER TO app_resolver;
REVOKE CREATE ON SCHEMA public FROM app_resolver;

REVOKE EXECUTE ON FUNCTION resolve_tenant_by_slug(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION resolve_tenant_by_host(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION list_public_partners() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION resolve_tenant_by_slug(text) TO app_user;
GRANT EXECUTE ON FUNCTION resolve_tenant_by_host(text) TO app_user;
GRANT EXECUTE ON FUNCTION list_public_partners() TO app_user;
