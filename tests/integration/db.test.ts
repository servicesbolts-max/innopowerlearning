import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runMigrations, setRuntimeLoginPassword } from "@/db/migrate";

// Requires a running Postgres (docker compose up -d, or the CI service container).
try {
  process.loadEnvFile(".env");
} catch {
  // CI provides the variables directly.
}
const ownerUrl = process.env.DATABASE_OWNER_URL;
const runtimeUrl = process.env.DATABASE_URL;
const appPassword = process.env.APP_DB_PASSWORD;
if (!ownerUrl || !runtimeUrl || !appPassword) {
  throw new Error("DATABASE_OWNER_URL, DATABASE_URL and APP_DB_PASSWORD are required");
}

const owner = postgres(ownerUrl, { max: 1, onnotice: () => {} });
let runtime: postgres.Sql;

const TENANT_A = "0190a1b2-0000-7000-8000-00000000000a";
const TENANT_B = "0190a1b2-0000-7000-8000-00000000000b";

beforeAll(async () => {
  await runMigrations(owner);
  await setRuntimeLoginPassword(owner, appPassword);
  runtime = postgres(runtimeUrl, { max: 1, onnotice: () => {} });

  // A throwaway table built exactly like .claude/rules/db.md tells P2 to build tenant tables.
  await owner.unsafe(`
    drop table if exists _isolation_probe;
    create table _isolation_probe (tenant_id uuid not null, label text not null);
    alter table _isolation_probe enable row level security;
    alter table _isolation_probe force row level security;
    create policy _isolation_probe_tenant on _isolation_probe
      using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
      with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
    grant select, insert, update, delete on _isolation_probe to app_user;
    insert into _isolation_probe values ('${TENANT_A}', 'a'), ('${TENANT_B}', 'b');
  `);
});

afterAll(async () => {
  await owner`drop table if exists _isolation_probe`;
  await runtime?.end({ timeout: 5 });
  await owner.end({ timeout: 5 });
});

/** Runs fn as app_user with app.tenant_id set, the way withTenant will (P2). */
function asTenant<T>(tenantId: string, fn: (tx: postgres.TransactionSql) => Promise<T>) {
  return runtime.begin(async (tx) => {
    await tx`set local role app_user`;
    await tx`select set_config('app.tenant_id', ${tenantId}, true)`;
    return fn(tx);
  }) as Promise<T>;
}

describe("foundation migrations", () => {
  it("are idempotent: a second run applies nothing", async () => {
    const second = await runMigrations(owner);
    expect(second.applied).toEqual([]);
    expect(second.skipped).toEqual(["0000_foundation.sql", "0001_runtime_login.sql"]);
  });

  it("install pgvector, pg_trgm and citext", async () => {
    const rows = await owner<{ extname: string }[]>`
      select extname from pg_extension where extname in ('vector', 'pg_trgm', 'citext')`;
    expect(rows.map((r) => r.extname).sort()).toEqual(["citext", "pg_trgm", "vector"]);
  });

  it("create app roles that are not superusers and cannot bypass RLS", async () => {
    const roles = await owner<{ rolname: string; rolsuper: boolean; rolbypassrls: boolean }[]>`
      select rolname, rolsuper, rolbypassrls from pg_roles
      where rolname in ('app_login', 'app_user', 'app_platform') order by rolname`;
    expect(roles).toEqual([
      { rolname: "app_login", rolsuper: false, rolbypassrls: false },
      { rolname: "app_platform", rolsuper: false, rolbypassrls: false },
      { rolname: "app_user", rolsuper: false, rolbypassrls: false },
    ]);
  });
});

describe("runtime login (DATABASE_URL)", () => {
  it("logs in as app_login, which is not a superuser and owns nothing", async () => {
    const [me] = await runtime<{ current_user: string; rolsuper: boolean; owned: number }[]>`
      select current_user, r.rolsuper,
        (select count(*)::int from pg_class c where c.relowner = r.oid) as owned
      from pg_roles r where r.rolname = current_user`;
    expect(me).toEqual({ current_user: "app_login", rolsuper: false, owned: 0 });
  });

  it("cannot read a tenant table without switching role (query outside withTenant)", async () => {
    await expect(runtime`select * from _isolation_probe`).rejects.toThrow(/permission denied/);
  });

  it("gains nothing from RESET ROLE", async () => {
    await expect(
      runtime.begin(async (tx) => {
        await tx`set local role app_user`;
        await tx`reset role`;
        return tx`select * from _isolation_probe`;
      }),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("RLS policy template from .claude/rules/db.md", () => {
  it("shows a tenant only its own rows", async () => {
    const rows = await asTenant(TENANT_A, (tx) => tx`select label from _isolation_probe`);
    expect(rows.map((r) => r.label)).toEqual(["a"]);
  });

  it("returns 0 rows with no tenant context, even on a reused connection", async () => {
    await asTenant(TENANT_A, (tx) => tx`select 1`); // leaves app.tenant_id = '' on this session
    const rows = await runtime.begin(async (tx) => {
      await tx`set local role app_user`;
      return tx`select * from _isolation_probe`;
    });
    expect(rows).toHaveLength(0);
  });

  it("rejects writing a row for another tenant", async () => {
    await expect(
      asTenant(TENANT_A, (tx) => tx`insert into _isolation_probe values (${TENANT_B}, 'x')`),
    ).rejects.toThrow(/row-level security/);
  });

  it("rejects moving an own row to another tenant", async () => {
    await expect(
      asTenant(TENANT_A, (tx) => tx`update _isolation_probe set tenant_id = ${TENANT_B}`),
    ).rejects.toThrow(/row-level security/);
  });

  it("cannot update or delete another tenant's rows", async () => {
    const updated = await asTenant(
      TENANT_A,
      (tx) => tx`update _isolation_probe set label = 'pwned' where tenant_id = ${TENANT_B}`,
    );
    const deleted = await asTenant(
      TENANT_A,
      (tx) => tx`delete from _isolation_probe where tenant_id = ${TENANT_B}`,
    );
    expect([updated.count, deleted.count]).toEqual([0, 0]);
  });
});
