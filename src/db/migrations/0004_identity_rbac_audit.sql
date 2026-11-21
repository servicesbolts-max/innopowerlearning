-- 0004_identity_rbac_audit: identity (Better Auth), memberships, invitations, audit log (P3).
-- Forward-only: never edit after commit.
--
-- Global identity tables are written by Better Auth only, through the role app_auth (a separate
-- pool in src/modules/auth). Tenant data stays behind withTenant and app_user:
--   * users: app_user may read a few columns of users who are members of the current tenant;
--   * memberships, invitations, audit_logs: ordinary tenant tables with forced RLS.
-- See docs/adr/0004-auth.md.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_auth') THEN
    CREATE ROLE app_auth NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
  EXECUTE format('GRANT app_auth TO %I', current_user);
END
$$;
GRANT app_auth TO app_login;
GRANT USAGE ON SCHEMA public TO app_auth;

-- ---------------------------------------------------------------------------------------------
-- Identity (Better Auth core + twoFactor + passkey + database rate limits). Column names are
-- snake_case; src/db/schema/identity.ts maps Better Auth's camelCase fields onto them.

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  email citext NOT NULL UNIQUE CHECK (length(email) BETWEEN 3 AND 320),
  email_verified boolean NOT NULL DEFAULT false,
  image text,
  two_factor_enabled boolean NOT NULL DEFAULT false,
  -- Section 4 platform roles; tenant roles live on memberships.
  platform_role text CHECK (platform_role IN ('platform_owner', 'platform_staff')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE accounts (
  id uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  account_id text NOT NULL,
  provider_id text NOT NULL,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  password text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, account_id)
);
CREATE INDEX accounts_user ON accounts (user_id);

-- Sessions are bound to the tenant host they were created on (tenant_id), and may carry an
-- impersonation (impersonated_by, reason). Not a tenant table: only app_auth reads it.
CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants (id),
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  ip_address text,
  user_agent text,
  impersonated_by uuid REFERENCES users (id),
  impersonation_reason text CHECK (length(impersonation_reason) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((impersonated_by IS NULL) = (impersonation_reason IS NULL))
);
CREATE INDEX sessions_user ON sessions (user_id);

CREATE TABLE verifications (
  id uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  identifier text NOT NULL,
  value text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX verifications_identifier ON verifications (identifier);

CREATE TABLE two_factors (
  id uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  secret text NOT NULL,
  backup_codes text NOT NULL,
  verified boolean,
  failed_verification_count integer,
  locked_until timestamptz
);
CREATE INDEX two_factors_user ON two_factors (user_id);

CREATE TABLE passkeys (
  id uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name text,
  public_key text NOT NULL,
  credential_id text NOT NULL UNIQUE,
  counter integer NOT NULL,
  device_type text NOT NULL,
  backed_up boolean NOT NULL,
  transports text,
  aaguid text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX passkeys_user ON passkeys (user_id);

CREATE TABLE auth_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_uuid_v7(),
  key text NOT NULL UNIQUE,
  count integer NOT NULL,
  last_request bigint NOT NULL
);

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- app_auth owns the identity flow: full access to these tables, nothing else.
GRANT SELECT, INSERT, UPDATE, DELETE
  ON users, accounts, sessions, verifications, two_factors, passkeys, auth_rate_limits
  TO app_auth;
-- Session binding validates the tenant id it stores.
GRANT SELECT (id, status, kind, deleted_at) ON tenants TO app_auth;
CREATE POLICY tenants_auth ON tenants FOR SELECT TO app_auth USING (true);

-- Forced RLS on every identity table: app_auth sees everything (it is the auth service), every
-- other role sees nothing unless a policy below says otherwise.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users', 'accounts', 'sessions', 'verifications', 'two_factors',
                           'passkeys', 'auth_rate_limits']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON %I TO app_auth USING (true) WITH CHECK (true)',
                   t || '_auth', t);
  END LOOP;
END
$$;

-- ---------------------------------------------------------------------------------------------
-- memberships: a user's role in one tenant (Section 3 Identity, Section 4 roles).
CREATE TABLE memberships (
  tenant_id uuid NOT NULL REFERENCES tenants (id),
  id uuid NOT NULL DEFAULT gen_uuid_v7(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('tenant_admin', 'program_manager', 'instructor',
                                     'teaching_assistant', 'learner', 'sponsor_viewer')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  deleted_at timestamptz,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, user_id)
);
CREATE TRIGGER memberships_updated_at BEFORE UPDATE ON memberships
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships FORCE ROW LEVEL SECURITY;
CREATE POLICY memberships_tenant ON memberships
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON memberships TO app_user;

-- users as seen by a tenant: members of the current tenant only, a few columns only.
CREATE POLICY users_tenant_members ON users FOR SELECT TO app_user
  USING (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.user_id = users.id
      AND m.tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
      AND m.deleted_at IS NULL));
GRANT SELECT (id, name, email, image, email_verified, two_factor_enabled, platform_role,
              created_at) ON users TO app_user;

-- ---------------------------------------------------------------------------------------------
-- invitations: single-use, hashed tokens (the raw token only ever lives in the email link).
CREATE TABLE invitations (
  tenant_id uuid NOT NULL REFERENCES tenants (id),
  id uuid NOT NULL DEFAULT gen_uuid_v7(),
  email citext NOT NULL CHECK (length(email) BETWEEN 3 AND 320),
  role text NOT NULL CHECK (role IN ('tenant_admin', 'program_manager', 'instructor',
                                     'teaching_assistant', 'learner', 'sponsor_viewer')),
  token_hash text NOT NULL CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  accepted_by uuid REFERENCES users (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES users (id),
  deleted_at timestamptz,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, token_hash)
);
CREATE INDEX invitations_email ON invitations (tenant_id, email);
CREATE TRIGGER invitations_updated_at BEFORE UPDATE ON invitations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations FORCE ROW LEVEL SECURITY;
CREATE POLICY invitations_tenant ON invitations
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON invitations TO app_user;

-- ---------------------------------------------------------------------------------------------
-- audit_logs: append-only (Section 4, Section 10). No PII beyond ids in metadata.
CREATE TABLE audit_logs (
  tenant_id uuid NOT NULL REFERENCES tenants (id),
  id uuid NOT NULL DEFAULT gen_uuid_v7(),
  actor_user_id uuid,
  impersonator_user_id uuid,
  action text NOT NULL CHECK (action ~ '^[a-z][a-z0-9_.]{2,63}$'),
  target_type text CHECK (length(target_type) <= 64),
  target_id text CHECK (length(target_id) <= 128),
  metadata jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id)
);
CREATE INDEX audit_logs_recent ON audit_logs (tenant_id, created_at DESC);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY audit_logs_tenant ON audit_logs
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT ON audit_logs TO app_user;

-- Belt and braces on top of the grants: application roles can never rewrite history. The owner
-- may still delete (tenant deletion after its grace period, test cleanup).
CREATE FUNCTION audit_logs_append_only() RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' OR current_user IN ('app_user', 'app_platform', 'app_auth', 'app_login') THEN
    RAISE EXCEPTION 'audit_logs is append-only' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN OLD;
END
$$;
CREATE TRIGGER audit_logs_no_update BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_append_only();

-- ---------------------------------------------------------------------------------------------
-- Tenant access and security settings (Section 6.1).
ALTER TABLE tenant_settings
  ADD COLUMN registration_mode text NOT NULL DEFAULT 'open'
    CHECK (registration_mode IN ('open', 'invite_only', 'application', 'sso_only', 'email_domain')),
  ADD COLUMN allowed_email_domains text[] NOT NULL DEFAULT '{}',
  ADD COLUMN require_admin_2fa boolean NOT NULL DEFAULT true,
  ADD COLUMN session_hours integer NOT NULL DEFAULT 168 CHECK (session_hours BETWEEN 1 AND 720);
