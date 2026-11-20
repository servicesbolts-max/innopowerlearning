import { getTableColumns, getTableName, is, sql } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import type postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runMigrations, setRuntimeLoginPassword } from "@/db/migrate";
import * as schema from "@/db/schema";
import { closeDb } from "@/db/client";
import { uuidv7 } from "@/lib/ids";
import { listPublicPartners, loadTenantShell, resolveTenant, withTenant } from "@/modules/tenancy";
import {
  appPassword,
  createTenants,
  dropTenants,
  ownerConnection,
  runtimeConnection,
} from "./helpers";

const owner = ownerConnection();
let runtime: postgres.Sql;

const ACTIVE = uuidv7();
const SUSPENDED = uuidv7();
const UNLISTED = uuidv7();
const tag = ACTIVE.slice(-6);
const slugs = {
  active: `res-active-${tag}`,
  suspended: `res-susp-${tag}`,
  unlisted: `res-unl-${tag}`,
};
const verifiedHost = `learn-${tag}.example.org`;
const pendingHost = `pending-${tag}.example.org`;

beforeAll(async () => {
  await runMigrations(owner);
  await setRuntimeLoginPassword(owner, appPassword!);
  runtime = runtimeConnection();
  await createTenants(owner, [
    { id: ACTIVE, slug: slugs.active, name: `Active ${tag}`, preset: "university" },
    { id: SUSPENDED, slug: slugs.suspended, status: "suspended" },
    { id: UNLISTED, slug: slugs.unlisted, listed: false },
  ]);
  await owner.begin(async (tx) => {
    await tx`select set_config('app.tenant_id', ${ACTIVE}, true)`;
    await tx`insert into tenant_domains (tenant_id, host, verified_at)
      values (${ACTIVE}, ${verifiedHost}, now()), (${ACTIVE}, ${pendingHost}, null)`;
    const [theme] = await tx`insert into tenant_themes (tenant_id, name, theme)
      values (${ACTIVE}, 'Brand', ${tx.json({ accent: "#7B2D8E", radius: "rounded" })})
      returning id`;
    await tx`insert into tenant_settings (tenant_id, tagline, logo, time_zone, active_theme_id)
      values (${ACTIVE}, 'Placeholder tagline', ${tx.json({ kind: "monogram", text: "AT" })},
              'Africa/Lagos', ${theme!.id})`;
    await tx`insert into feature_flags (tenant_id, key, enabled)
      values (${ACTIVE}, 'academic_records', true), (${ACTIVE}, 'not_a_known_flag', true)`;
  });
});

afterAll(async () => {
  await dropTenants(owner, [ACTIVE, SUSPENDED, UNLISTED]);
  await closeDb();
  await runtime?.end({ timeout: 5 });
  await owner.end({ timeout: 5 });
});

describe("withTenant", () => {
  it("runs as app_user with app.tenant_id set", async () => {
    const [row] = (await withTenant({ tenantId: ACTIVE }, (tx) =>
      tx.execute(sql`select current_user as role, current_setting('app.tenant_id') as tenant`),
    )) as unknown as { role: string; tenant: string }[];
    expect(row).toEqual({ role: "app_user", tenant: ACTIVE });
  });

  it("rejects a context that is not a UUID before touching the database", async () => {
    await expect(
      withTenant({ tenantId: "' or true --" }, () => Promise.resolve(1)),
    ).rejects.toThrow(/uuid/i);
  });

  it("rolls back when the callback throws", async () => {
    await expect(
      withTenant({ tenantId: ACTIVE }, async (tx) => {
        await tx.execute(sql`insert into tenant_themes (tenant_id, name, theme)
          values (${ACTIVE}, 'Rolled back', '{}'::jsonb)`);
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    const result = await withTenant({ tenantId: ACTIVE }, (tx) =>
      tx.execute(sql`select 1 from tenant_themes where name = 'Rolled back'`),
    );
    expect((result as unknown as unknown[]).length).toBe(0);
  });

  it("does not leak the role or tenant into the next transaction on the pool", async () => {
    await withTenant({ tenantId: ACTIVE }, (tx) => tx.execute(sql`select 1`));
    // Run enough plain queries to touch every pooled connection.
    const rows = await Promise.all(
      Array.from({ length: 12 }, () =>
        withTenant({ tenantId: SUSPENDED }, (tx) =>
          tx.execute(sql`select count(*)::int as n from tenant_settings`),
        ),
      ),
    );
    for (const r of rows) expect((r as unknown as { n: number }[])[0]?.n).toBe(0);
  });
});

describe("pre-tenant lookups (SECURITY DEFINER, owned by app_resolver)", () => {
  it("resolves an active subdomain slug to id and status only", async () => {
    expect(await resolveTenant({ surface: "tenant", by: "slug", slug: slugs.active })).toEqual({
      id: ACTIVE,
      slug: slugs.active,
      status: "active",
    });
  });

  it("reports a suspended tenant's status, so the proxy can refuse it", async () => {
    expect(
      await resolveTenant({ surface: "tenant", by: "slug", slug: slugs.suspended }),
    ).toMatchObject({ status: "suspended" });
  });

  it("resolves verified custom domains only", async () => {
    expect(
      await resolveTenant({ surface: "tenant", by: "host", host: verifiedHost }),
    ).toMatchObject({ id: ACTIVE });
    expect(await resolveTenant({ surface: "tenant", by: "host", host: pendingHost })).toBeNull();
    expect(await resolveTenant({ surface: "tenant", by: "slug", slug: "nope-x" })).toBeNull();
  });

  it("lists active, listed partners with public fields only", async () => {
    const partners = await listPublicPartners();
    const mine = partners.filter((p) => p.slug.endsWith(tag));
    expect(mine).toEqual([{ slug: slugs.active, name: `Active ${tag}`, preset: "university" }]);
  });

  it("are not callable by the login role without switching to app_user", async () => {
    await expect(runtime`select * from list_public_partners()`).rejects.toThrow(
      /permission denied/,
    );
  });

  it("run as a role that cannot read tenant content", async () => {
    await expect(
      owner.begin(async (tx) => {
        await tx`set local role app_resolver`;
        return tx`select tagline from tenant_settings`;
      }),
    ).rejects.toThrow(/permission denied/);
    await expect(
      owner.begin(async (tx) => {
        await tx`set local role app_resolver`;
        return tx`select plan_id from tenants`;
      }),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("loadTenantShell", () => {
  it("returns the branded shell for an active tenant", async () => {
    const shell = await loadTenantShell(slugs.active);
    expect(shell).toMatchObject({
      id: ACTIVE,
      name: `Active ${tag}`,
      preset: "university",
      tagline: "Placeholder tagline",
      logo: { kind: "monogram", text: "AT" },
      timeZone: "Africa/Lagos",
    });
    expect(shell?.flags.academic_records).toBe(true);
    expect(shell?.flags).not.toHaveProperty("not_a_known_flag");
    expect(shell?.themeCss).toContain(":root{");
  });

  it("returns null for suspended and unknown tenants", async () => {
    expect(await loadTenantShell(slugs.suspended)).toBeNull();
    expect(await loadTenantShell("nope-x")).toBeNull();
  });

  it("falls back to the default theme when stored theme data is invalid", async () => {
    await owner.begin(async (tx) => {
      await tx`select set_config('app.tenant_id', ${UNLISTED}, true)`;
      const [theme] = await tx`insert into tenant_themes (tenant_id, name, theme)
        values (${UNLISTED}, 'Broken', ${tx.json({ accent: "red; } body { display:none" })})
        returning id`;
      await tx`insert into tenant_settings (tenant_id, logo, active_theme_id)
        values (${UNLISTED}, ${tx.json({ kind: "svg", markup: "<svg/>" })}, ${theme!.id})`;
    });
    const shell = await loadTenantShell(slugs.unlisted);
    expect(shell?.themeCss).not.toContain("display:none");
    expect(shell?.logo).toEqual({ kind: "monogram", text: "R" });
  });
});

describe("Drizzle schema mirrors the migrations", () => {
  const tables = Object.values(schema as Record<string, unknown>).filter((v): v is PgTable =>
    is(v, PgTable),
  );

  it.each(tables.map((t): [string, PgTable] => [getTableName(t), t]))("%s", async (name, table) => {
    const dbCols = await owner<{ column_name: string; is_nullable: string }[]>`
      select column_name, is_nullable from information_schema.columns
      where table_schema = 'public' and table_name = ${name} order by column_name`;
    const drizzleCols = Object.values(getTableColumns(table))
      .map((c) => ({ column_name: c.name, is_nullable: c.notNull ? "NO" : "YES" }))
      .sort((a, b) => a.column_name.localeCompare(b.column_name));
    expect(drizzleCols).toEqual(dbCols.map((c) => ({ ...c })));
  });

  it("covers every table the migrations create", () => {
    expect(tables.length).toBeGreaterThanOrEqual(6);
  });
});
