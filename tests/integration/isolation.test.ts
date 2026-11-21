import { sql, type SQL } from "drizzle-orm";
import type postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runMigrations, setRuntimeLoginPassword } from "@/db/migrate";
import { uuidv7 } from "@/lib/ids";
import { withTenant, type TenantTx } from "@/modules/tenancy";
import {
  appPassword,
  createTenants,
  dropTenants,
  expectDbError,
  ownerConnection,
  runtimeConnection,
} from "./helpers";
import { GLOBAL_TABLES, TENANT_TABLES } from "./tenant-tables";

/**
 * Isolation for every tenant table (.claude/rules/db.md, checks 1-7), run through withTenant as
 * the runtime login. Driven by the registry in ./tenant-tables.ts; the catalog test makes sure the
 * registry covers every table that has a tenant_id column.
 */
const owner = ownerConnection();
let runtime: postgres.Sql;

const A = uuidv7();
const B = uuidv7();
// rows[tenant][table] = id of the fixture row
const rows: Record<string, Record<string, string>> = { [A]: {}, [B]: {} };

const DENIED = /row-level security|permission denied/;

function insertSql(table: string, values: Record<string, unknown>): SQL {
  const cols = Object.keys(values);
  const vals = cols.map((c) => {
    const v = values[c];
    return v !== null && typeof v === "object" ? sql`${JSON.stringify(v)}::jsonb` : sql`${v}`;
  });
  return sql`insert into ${sql.identifier(table)} (${sql.join(
    cols.map((c) => sql.identifier(c)),
    sql`, `,
  )}) values (${sql.join(vals, sql`, `)})`;
}

const asA = <T>(fn: (tx: TenantTx) => Promise<T>) => withTenant({ tenantId: A }, fn);
const countOf = (result: unknown) => (result as { count: number }).count;

/** A write that RLS (or a missing grant) must reject or reduce to zero rows. */
async function affectsNothing(run: () => Promise<unknown>) {
  try {
    expect(countOf(await run())).toBe(0);
  } catch (error) {
    const e = error as { message?: string; cause?: { message?: string } };
    expect(`${e.message} | ${e.cause?.message}`).toMatch(DENIED);
  }
}

beforeAll(async () => {
  await runMigrations(owner);
  await setRuntimeLoginPassword(owner, appPassword!);
  runtime = runtimeConnection();
  await createTenants(owner, [
    { id: A, slug: `iso-a-${A.slice(-6)}` },
    { id: B, slug: `iso-b-${B.slice(-6)}` },
  ]);
  for (const tenantId of [A, B]) {
    await owner.begin(async (tx) => {
      await tx`select set_config('app.tenant_id', ${tenantId}, true)`;
      for (const fixture of TENANT_TABLES) {
        const id = uuidv7();
        const values = fixture.row(tenantId, id, rows[tenantId]!);
        const prepared = Object.fromEntries(
          Object.entries(values).map(([k, v]) => [
            k,
            v !== null && typeof v === "object" ? tx.json(v as postgres.JSONValue) : v,
          ]),
        );
        await tx`insert into ${tx(fixture.table)} ${tx(prepared as Record<string, postgres.ParameterOrJSON<never>>)}`;
        rows[tenantId]![fixture.table] = id;
      }
    });
  }
});

afterAll(async () => {
  await dropTenants(owner, [A, B]);
  await runtime?.end({ timeout: 5 });
  await owner.end({ timeout: 5 });
});

describe("schema catalog", () => {
  it("registers every public table as global or tenant-owned", async () => {
    const tables = await owner<{ relname: string }[]>`
      select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r', 'p') order by 1`;
    const known = new Set<string>([...GLOBAL_TABLES, ...TENANT_TABLES.map((t) => t.table)]);
    expect(tables.map((t) => t.relname).filter((t) => !known.has(t))).toEqual([]);
  });

  it("puts a tenant_id column on every registered tenant table, and on no global one", async () => {
    const withTenantId = await owner<{ table_name: string }[]>`
      select table_name from information_schema.columns
      where table_schema = 'public' and column_name = 'tenant_id' and is_nullable = 'NO'`;
    expect(withTenantId.map((r) => r.table_name).sort()).toEqual(
      TENANT_TABLES.map((t) => t.table).sort(),
    );
  });

  it("enables and forces RLS, with a policy, on every tenant table and on tenants", async () => {
    const names = [...TENANT_TABLES.map((t) => t.table), "tenants"];
    const flags = await owner<
      { relname: string; rls: boolean; forced: boolean; policies: number }[]
    >`
      select c.relname, c.relrowsecurity as rls, c.relforcerowsecurity as forced,
        (select count(*)::int from pg_policy p where p.polrelid = c.oid) as policies
      from pg_class c where c.relname in ${owner(names)} and c.relnamespace = 'public'::regnamespace`;
    expect(flags).toHaveLength(names.length);
    for (const f of flags) expect(f, f.relname).toMatchObject({ rls: true, forced: true });
    for (const f of flags) expect(f.policies, f.relname).toBeGreaterThan(0);
  });

  it("starts every unique constraint and index on a tenant table with tenant_id", async () => {
    const indexes = await owner<{ table: string; index: string; first: string }[]>`
      select t.relname as table, i.relname as index, a.attname as first
      from pg_index x
      join pg_class t on t.oid = x.indrelid
      join pg_class i on i.oid = x.indexrelid
      join pg_attribute a on a.attrelid = t.oid and a.attnum = x.indkey[0]
      where t.relname in ${owner(TENANT_TABLES.map((f) => f.table))}`;
    // tenant_domains.host is globally unique on purpose: one host maps to exactly one tenant.
    const offenders = indexes.filter(
      (r) => r.first !== "tenant_id" && !(r.table === "tenant_domains" && r.first === "host"),
    );
    expect(offenders).toEqual([]);
  });
});

describe.each(TENANT_TABLES)("isolation: $table", (fixture) => {
  const table = sql.identifier(fixture.table);

  it("1. hides the other tenant's rows", async () => {
    const own = await asA((tx) => tx.execute(sql`select tenant_id from ${table}`));
    expect(Array.from(own as unknown as { tenant_id: string }[]).map((r) => r.tenant_id)).toEqual([
      A,
    ]);
    const other = await asA((tx) => tx.execute(sql`select 1 from ${table} where tenant_id = ${B}`));
    expect(countOf(other)).toBe(0);
  });

  it("2. rejects inserting a row for the other tenant", async () => {
    const values = fixture.row(B, uuidv7(), rows[B]!);
    await expectDbError(
      asA((tx) => tx.execute(insertSql(fixture.table, values))),
      DENIED,
    );
  });

  it("3. cannot update or delete the other tenant's rows", async () => {
    await affectsNothing(() =>
      asA((tx) => tx.execute(sql`update ${table} set deleted_at = now() where tenant_id = ${B}`)),
    );
    await affectsNothing(() =>
      asA((tx) => tx.execute(sql`delete from ${table} where tenant_id = ${B}`)),
    );
    const [check] = await owner.begin(async (tx) => {
      await tx`select set_config('app.tenant_id', ${B}, true)`;
      return tx`select count(*)::int as n from ${tx(fixture.table)}
        where tenant_id = ${B} and deleted_at is null`;
    });
    expect(check?.n).toBe(1);
  });

  it("4. rejects moving an own row to the other tenant", async () => {
    // Clear the composite foreign key too, so only RLS (or a missing grant) can stop the move:
    // a foreign-key error must not be able to mask a policy without WITH CHECK.
    const clearFk = fixture.crossTenantFk
      ? sql`, ${sql.identifier(fixture.crossTenantFk.column)} = null`
      : sql``;
    await expectDbError(
      asA((tx) =>
        tx.execute(sql`update ${table} set tenant_id = ${B}${clearFk} where tenant_id = ${A}`),
      ),
      DENIED,
    );
  });

  it.runIf(fixture.crossTenantFk)(
    "5. rejects a composite foreign key that points at the other tenant's row",
    async () => {
      const { column, parent } = fixture.crossTenantFk!;
      await expectDbError(
        asA((tx) =>
          tx.execute(
            sql`update ${table} set ${sql.identifier(column)} = ${rows[B]![parent]} where tenant_id = ${A}`,
          ),
        ),
        /foreign key/,
      );
    },
  );

  it("6. returns nothing without a tenant context, even on a reused connection", async () => {
    await runtime.begin(async (tx) => {
      await tx`set local role app_user`;
      await tx`select set_config('app.tenant_id', ${A}, true)`;
    }); // leaves app.tenant_id = '' on this pooled session
    const result = await runtime.begin(async (tx) => {
      await tx`set local role app_user`;
      return tx`select 1 from ${tx(fixture.table)}`;
    });
    expect(result).toHaveLength(0);
  });

  it("7. fails with permission denied outside withTenant", async () => {
    await expect(runtime`select 1 from ${runtime(fixture.table)}`).rejects.toThrow(
      /permission denied/,
    );
  });
});

describe("isolation: tenants (the tenant root, RLS on id)", () => {
  it("shows a tenant only its own row", async () => {
    const result = await asA((tx) => tx.execute(sql`select id from tenants`));
    expect(Array.from(result as unknown as { id: string }[]).map((r) => r.id)).toEqual([A]);
  });

  it("cannot create, rename or delete tenants", async () => {
    await expectDbError(
      asA((tx) =>
        tx.execute(sql`insert into tenants (id, slug, name, kind, preset)
          values (${A}, 'x-new', 'x', 'partner', 'university')`),
      ),
      /permission denied/,
    );
    await expectDbError(
      asA((tx) => tx.execute(sql`update tenants set name = 'pwned'`)),
      /permission denied/,
    );
    await expectDbError(
      asA((tx) => tx.execute(sql`delete from tenants`)),
      /permission denied/,
    );
  });

  it("fails with permission denied outside withTenant", async () => {
    await expect(runtime`select 1 from tenants`).rejects.toThrow(/permission denied/);
  });
});
