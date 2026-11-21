import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb } from "@/db/client";
import { runMigrations, setRuntimeLoginPassword } from "@/db/migrate";
import { uuidv7 } from "@/lib/ids";
import { withTenant } from "@/modules/tenancy";
import { appPassword, createTenants, dropTenants, ownerConnection } from "./helpers";

/**
 * P3 identity boundaries: Better Auth's global tables are reachable only as app_auth; tenants see
 * their own members' basic profile and nothing else; the audit log cannot be rewritten.
 */
const owner = ownerConnection();
const A = uuidv7();
const B = uuidv7();
const MEMBER_A = uuidv7();
const MEMBER_B = uuidv7();

const denied = (e: { message?: string; cause?: { message?: string } }) =>
  /permission denied|append-only/.test(`${e.message} ${e.cause?.message}`);

beforeAll(async () => {
  await runMigrations(owner);
  await setRuntimeLoginPassword(owner, appPassword!);
  await createTenants(owner, [
    { id: A, slug: `id-a-${A.slice(-6)}` },
    { id: B, slug: `id-b-${B.slice(-6)}` },
  ]);
  await owner.begin(async (tx) => {
    await tx`set local role app_auth`;
    for (const id of [MEMBER_A, MEMBER_B]) {
      await tx`insert into users (id, name, email) values (${id}, 'Member', ${`m-${id.slice(-8)}@example.org`})`;
    }
    await tx`insert into accounts (user_id, account_id, provider_id, password)
      values (${MEMBER_A}, ${MEMBER_A}, 'credential', 'hash-not-for-tenants')`;
  });
  for (const [tenant, user] of [
    [A, MEMBER_A],
    [B, MEMBER_B],
  ] as const) {
    await owner.begin(async (tx) => {
      await tx`select set_config('app.tenant_id', ${tenant}, true)`;
      await tx`insert into memberships (tenant_id, user_id, role) values (${tenant}, ${user}, 'learner')`;
      await tx`insert into audit_logs (tenant_id, action) values (${tenant}, 'test.seeded')`;
    });
  }
});

afterAll(async () => {
  await dropTenants(owner, [A, B]);
  await owner.begin(async (tx) => {
    await tx`set local role app_auth`;
    await tx`delete from users where id in (${MEMBER_A}, ${MEMBER_B})`;
  });
  await closeDb();
  await owner.end({ timeout: 5 });
});

describe("users as seen by a tenant (app_user)", () => {
  it("lists only the current tenant's members", async () => {
    const rows = (await withTenant({ tenantId: A }, (tx) =>
      tx.execute(sql`select id from users where id in (${MEMBER_A}, ${MEMBER_B})`),
    )) as unknown as { id: string }[];
    expect(Array.from(rows).map((r) => r.id)).toEqual([MEMBER_A]);
  });

  it("cannot read credentials, sessions or 2FA secrets", async () => {
    for (const query of [
      sql`select password from accounts`,
      sql`select token from sessions`,
      sql`select secret from two_factors`,
      sql`select public_key from passkeys`,
      sql`select value from verifications`,
    ]) {
      await expect(withTenant({ tenantId: A }, (tx) => tx.execute(query))).rejects.toSatisfy(
        denied,
      );
    }
  });

  it("cannot change users", async () => {
    await expect(
      withTenant({ tenantId: A }, (tx) =>
        tx.execute(sql`update users set name = 'pwned' where id = ${MEMBER_A}`),
      ),
    ).rejects.toSatisfy(denied);
  });
});

describe("app_auth (Better Auth's role)", () => {
  it("cannot read any tenant table", async () => {
    for (const table of ["memberships", "invitations", "audit_logs", "tenant_settings"]) {
      await expect(
        owner.begin(async (tx) => {
          await tx`set local role app_auth`;
          return tx`select 1 from ${tx(table)}`;
        }),
      ).rejects.toThrow(/permission denied/);
    }
  });

  it("may read only a few tenant columns (session binding)", async () => {
    await expect(
      owner.begin(async (tx) => {
        await tx`set local role app_auth`;
        return tx`select name from tenants`;
      }),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("audit_logs is append-only", () => {
  it("lets a tenant insert and read its own entries", async () => {
    await withTenant({ tenantId: A }, (tx) =>
      tx.execute(sql`insert into audit_logs (tenant_id, action) values (${A}, 'test.appended')`),
    );
    const rows = (await withTenant({ tenantId: A }, (tx) =>
      tx.execute(sql`select action from audit_logs order by created_at`),
    )) as unknown as { action: string }[];
    expect(Array.from(rows).map((r) => r.action)).toEqual(["test.seeded", "test.appended"]);
  });

  it("rejects update and delete from the app", async () => {
    await expect(
      withTenant({ tenantId: A }, (tx) => tx.execute(sql`update audit_logs set action = 'x.y.z'`)),
    ).rejects.toSatisfy(denied);
    await expect(
      withTenant({ tenantId: A }, (tx) => tx.execute(sql`delete from audit_logs`)),
    ).rejects.toSatisfy(denied);
  });

  it("rejects update even from the owner", async () => {
    await expect(
      owner.begin(async (tx) => {
        await tx`select set_config('app.tenant_id', ${A}, true)`;
        return tx`update audit_logs set action = 'x.y.z' where tenant_id = ${A}`;
      }),
    ).rejects.toThrow(/append-only/);
  });
});
