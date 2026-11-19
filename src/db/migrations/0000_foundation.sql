-- 0000_foundation: extensions and database roles. Forward-only: never edit after commit.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS citext;

-- app_user: the role application queries run as (via SET LOCAL ROLE inside withTenant, from P2).
-- Not a superuser and cannot bypass Row-Level Security.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END
$$;

-- app_platform: narrowly scoped role for audited Super Admin code paths only (P11).
-- Also cannot bypass RLS; platform policies grant it access explicitly.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_platform') THEN
    CREATE ROLE app_platform NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END
$$;

-- Let the connecting (owner) role switch into the restricted roles.
DO $$
BEGIN
  EXECUTE format('GRANT app_user TO %I', current_user);
  EXECUTE format('GRANT app_platform TO %I', current_user);
END
$$;

GRANT USAGE ON SCHEMA public TO app_user, app_platform;
