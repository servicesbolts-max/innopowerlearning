import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runMigrations } from "@/db/migrate";

// Requires a running Postgres (docker compose up -d, or the CI service container).
try {
  process.loadEnvFile(".env");
} catch {
  // CI provides DATABASE_URL directly.
}
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required for integration tests");

const sql = postgres(url, { max: 1, onnotice: () => {} });

beforeAll(async () => {
  await runMigrations(sql);
});

afterAll(async () => {
  await sql.end({ timeout: 5 });
});

describe("foundation migration", () => {
  it("is idempotent: a second run applies nothing", async () => {
    const second = await runMigrations(sql);
    expect(second.applied).toEqual([]);
    expect(second.skipped).toContain("0000_foundation.sql");
  });

  it("installs pgvector, pg_trgm and citext", async () => {
    const rows = await sql<{ extname: string }[]>`
      select extname from pg_extension where extname in ('vector', 'pg_trgm', 'citext')`;
    expect(rows.map((r) => r.extname).sort()).toEqual(["citext", "pg_trgm", "vector"]);
  });

  it("creates app roles that are not superusers and cannot bypass RLS", async () => {
    const roles = await sql<{ rolname: string; rolsuper: boolean; rolbypassrls: boolean }[]>`
      select rolname, rolsuper, rolbypassrls from pg_roles
      where rolname in ('app_user', 'app_platform') order by rolname`;
    expect(roles).toEqual([
      { rolname: "app_platform", rolsuper: false, rolbypassrls: false },
      { rolname: "app_user", rolsuper: false, rolbypassrls: false },
    ]);
  });

  it("lets the owner switch into app_user inside a transaction", async () => {
    const [row] = await sql.begin(async (tx) => {
      await tx`set local role app_user`;
      return tx<{ current_user: string }[]>`select current_user`;
    });
    expect(row?.current_user).toBe("app_user");
  });
});
