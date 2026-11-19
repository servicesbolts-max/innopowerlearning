-- 0001_runtime_login: the role the application logs in as. Forward-only: never edit after commit.
--
-- The owner/migrator role (DATABASE_OWNER_URL) owns every table and is used only by
-- scripts/db-*.ts and tests. The app (DATABASE_URL) logs in as app_login, which:
--   * is not a superuser and cannot bypass RLS,
--   * owns nothing and has no direct grants (NOINHERIT), so a query outside withTenant fails
--     with "permission denied" instead of reading other tenants' rows, and RESET ROLE gains nothing,
--   * may switch into app_user (tenant paths) or app_platform (audited Super Admin paths).
-- db:migrate sets its password from APP_DB_PASSWORD after migrations run.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_login') THEN
    CREATE ROLE app_login LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END
$$;

GRANT app_user TO app_login;
GRANT app_platform TO app_login;

-- Nobody but the owner creates objects in public (already the default on Postgres 15+).
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
