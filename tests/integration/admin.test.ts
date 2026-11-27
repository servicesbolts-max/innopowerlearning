import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runMigrations, setRuntimeLoginPassword } from "@/db/migrate";
import { uuidv7 } from "@/lib/ids";
import { listMembers, memberCount } from "@/modules/auth";
import {
  getBranding,
  listAllPartners,
  loadTenantShellById,
  provisionTenant,
  saveBranding,
  withTenant,
} from "@/modules/tenancy";
import { appPassword, createTenants, dropTenants, expectDbError, ownerConnection } from "./helpers";

/** Partner Admin branding and Console provisioning (MVP slices M6, M7), as the runtime login. */
const owner = ownerConnection();
const PLATFORM = uuidv7();
const A = uuidv7();
const B = uuidv7();
const USER = uuidv7();
const created: string[] = [];

beforeAll(async () => {
  await runMigrations(owner);
  await setRuntimeLoginPassword(owner, appPassword!);
  await createTenants(owner, [
    { id: A, slug: `adm-a-${A.slice(-6)}`, name: "Alpha" },
    { id: B, slug: `adm-b-${B.slice(-6)}`, name: "Beta" },
    // Stands in for the platform tenant: provisioning runs from any tenant context that holds
    // the permission check (defineAction), so a partner row is enough for the database part.
    { id: PLATFORM, slug: `adm-p-${PLATFORM.slice(-6)}`, name: "Platform" },
  ]);
  for (const id of [A, B]) {
    await owner.begin(async (tx) => {
      await tx`select set_config('app.tenant_id', ${id}, true)`;
      const [theme] = await tx`insert into tenant_themes (tenant_id, name, theme)
        values (${id}, 'Brand', ${tx.json({ accent: "#0B6E4F" })}) returning id`;
      await tx`insert into tenant_settings (tenant_id, logo, active_theme_id)
        values (${id}, ${tx.json({ kind: "monogram", text: "AL" })}, ${theme!.id})`;
    });
  }
  await owner.begin(async (tx) => {
    await tx`set local role app_auth`;
    await tx`insert into users (id, name, email) values (${USER}, 'Member', ${`adm-${USER.slice(-8)}@example.org`})`;
    await tx`reset role`;
    await tx`select set_config('app.tenant_id', ${A}, true)`;
    await tx`insert into memberships (tenant_id, user_id, role) values (${A}, ${USER}, 'learner')`;
  });
});

afterAll(async () => {
  await dropTenants(owner, [A, B, PLATFORM, ...created]);
  await owner.begin(async (tx) => {
    await tx`set local role app_auth`;
    await tx`delete from users where id = ${USER}`;
  });
  await owner.end({ timeout: 5 });
});

describe("branding", () => {
  it("renames, recolours and sets a logo for the current tenant only", async () => {
    await withTenant({ tenantId: A }, (tx) =>
      saveBranding(tx, A, {
        name: "Alpha Renamed",
        tagline: "New tagline",
        accent: "#123456",
        logoUrl: "https://example.org/logo.png",
        logoAlt: "Alpha logo",
      }),
    );
    expect(await getBranding(A)).toEqual({
      name: "Alpha Renamed",
      tagline: "New tagline",
      accent: "#123456",
      logoUrl: "https://example.org/logo.png",
      logoAlt: "Alpha logo",
    });
    const shell = await loadTenantShellById(A);
    expect(shell?.logo).toMatchObject({
      kind: "monogram",
      text: "AL",
      imageUrl: "https://example.org/logo.png",
    });
    expect((await getBranding(B))?.name).toBe("Beta");
  });
});

describe("people", () => {
  it("lists only this tenant's members", async () => {
    expect((await listMembers(A)).map((m) => m.userId)).toEqual([USER]);
    expect(await listMembers(B)).toEqual([]);
    expect(await memberCount(A)).toBe(1);
  });
});

describe("provisioning", () => {
  it("creates a partner with its settings, theme and flags, and refuses a taken slug", async () => {
    const slug = `adm-new-${uuidv7().slice(-6)}`;
    const result = await withTenant({ tenantId: PLATFORM }, (tx) =>
      provisionTenant(
        tx,
        PLATFORM,
        {
          slug,
          name: "New Partner",
          preset: "university",
          accent: "#7B2D8E",
          adminEmail: "a@example.org",
        },
        USER,
        async () => null,
      ),
    );
    expect("id" in result).toBe(true);
    const id = (result as { id: string }).id;
    created.push(id);
    const shell = await loadTenantShellById(id);
    expect(shell).toMatchObject({
      slug,
      name: "New Partner",
      preset: "university",
      registrationMode: "invite_only",
    });
    expect(shell?.logo.text).toBe("NP");

    const again = await withTenant({ tenantId: PLATFORM }, (tx) =>
      provisionTenant(
        tx,
        PLATFORM,
        { slug, name: "Dup", preset: "university", accent: "#7B2D8E", adminEmail: "a@example.org" },
        USER,
        async () => null,
      ),
    );
    expect(again).toEqual({ conflict: true });
    expect((await listAllPartners(PLATFORM)).map((p) => p.slug)).toContain(slug);

    // Back in the caller's tenant as app_user afterwards: the platform path does not leak.
    const role = await withTenant({ tenantId: PLATFORM }, async (tx) => {
      await provisionTenant(
        tx,
        PLATFORM,
        { slug, name: "Dup", preset: "university", accent: "#7B2D8E", adminEmail: "a@example.org" },
        USER,
        async () => null,
      );
      return tx.execute(
        sql`select current_user as role, current_setting('app.tenant_id') as tenant`,
      );
    });
    expect(role[0]).toEqual({ role: "app_user", tenant: PLATFORM });
  });

  it("app_platform cannot read or write an existing tenant's provisioning tables", async () => {
    const asPlatformIn = (tenantId: string, query: ReturnType<typeof sql>) =>
      withTenant({ tenantId: PLATFORM }, async (tx) => {
        await tx.execute(sql`set local role app_platform`);
        await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`);
        return tx.execute(query);
      });
    for (const table of ["invitations", "tenant_settings", "tenant_themes", "feature_flags"]) {
      await expectDbError(
        asPlatformIn(A, sql`select * from ${sql.identifier(table)}`),
        /permission denied/,
      );
    }
    await expectDbError(
      asPlatformIn(
        A,
        sql`insert into invitations (tenant_id, email, role, token_hash, expires_at)
          values (${A}, 'x@example.org', 'tenant_admin', ${"a".repeat(64)}, now() + interval '1 day')`,
      ),
      /row-level security/,
    );
    await expectDbError(
      asPlatformIn(A, sql`insert into audit_logs (tenant_id, action) values (${A}, 'x.forged')`),
      /row-level security/,
    );
  });

  it("app_platform cannot read tenant data or write into an existing tenant", async () => {
    await expectDbError(
      withTenant({ tenantId: PLATFORM }, async (tx) => {
        await tx.execute(sql`set local role app_platform`);
        await tx.execute(sql`select set_config('app.tenant_id', ${A}, true)`);
        return tx.execute(sql`select * from memberships`);
      }),
      /permission denied/,
    );
    await expectDbError(
      withTenant({ tenantId: PLATFORM }, async (tx) => {
        await tx.execute(sql`set local role app_platform`);
        await tx.execute(sql`select set_config('app.tenant_id', ${A}, true)`);
        return tx.execute(sql`update tenants set name = 'x' where id = ${A}`);
      }),
      /permission denied/,
    );
  });
});
