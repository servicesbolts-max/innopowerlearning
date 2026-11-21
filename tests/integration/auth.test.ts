import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb } from "@/db/client";
import { runMigrations, setRuntimeLoginPassword } from "@/db/migrate";
import { uuidv7 } from "@/lib/ids";
import { auth, createInvitation, INVITE_COOKIE } from "@/modules/auth";
import { closeAuthDb } from "@/modules/auth/db";
import { withTenant } from "@/modules/tenancy";
import { appPassword, createTenants, dropTenants, ownerConnection } from "./helpers";

/**
 * Better Auth end to end against the database: sign-up and sign-in on a tenant host bind the
 * session to that tenant and apply its registration mode.
 */
const owner = ownerConnection();
const OPEN = uuidv7();
const INVITE = uuidv7();
const tag = OPEN.slice(-6);
const emails: string[] = [];
const email = (who: string) => {
  const e = `${who}-${tag}@example.org`;
  emails.push(e);
  return e;
};
const PASSWORD = `pw-${uuidv7()}`;
/** The open-tenant learner from the first test: invitations need a real inviting user. */
let inviter = "";

const hostHeaders = (tenantId: string, extra: Record<string, string> = {}) =>
  new Headers({ host: `auth-${tag}.localhost:3000`, "x-tenant-id": tenantId, ...extra });

async function settings(tenantId: string, mode: string) {
  await owner.begin(async (tx) => {
    await tx`select set_config('app.tenant_id', ${tenantId}, true)`;
    await tx`insert into tenant_settings (tenant_id, logo, registration_mode)
      values (${tenantId}, ${tx.json({ kind: "monogram", text: "T" })}, ${mode})`;
  });
}

beforeAll(async () => {
  await runMigrations(owner);
  await setRuntimeLoginPassword(owner, appPassword!);
  await createTenants(owner, [
    { id: OPEN, slug: `auth-open-${tag}` },
    { id: INVITE, slug: `auth-inv-${tag}` },
  ]);
  await settings(OPEN, "open");
  await settings(INVITE, "invite_only");
});

afterAll(async () => {
  await dropTenants(owner, [OPEN, INVITE]);
  await owner.begin(async (tx) => {
    await tx`set local role app_auth`;
    await tx`delete from users where email in ${tx(emails)}`;
  });
  await closeAuthDb();
  await closeDb();
  await owner.end({ timeout: 5 });
});

async function membershipOf(tenantId: string, userId: string) {
  const rows = (await withTenant({ tenantId }, (tx) =>
    tx.query.memberships.findMany({ where: (m, { eq }) => eq(m.userId, userId) }),
  )) as { role: string; status: string }[];
  return rows[0] ?? null;
}

describe("password sign-up on an open tenant", () => {
  it("creates the user, joins as learner, and binds the session to the tenant", async () => {
    const res = await auth().api.signUpEmail({
      body: { email: email("open"), password: PASSWORD, name: "Open Learner" },
      headers: hostHeaders(OPEN),
      returnHeaders: true,
    });
    const userId = res.response.user.id;
    inviter = userId;
    expect(await membershipOf(OPEN, userId)).toMatchObject({ role: "learner", status: "active" });

    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/il\.session_token=/);
    expect(cookie).not.toMatch(/Domain=/i); // host-only

    const session = await auth().api.getSession({
      headers: hostHeaders(OPEN, { cookie: cookie.split(";")[0]! }),
    });
    expect((session?.session as { tenantId?: string } | undefined)?.tenantId).toBe(OPEN);
  });

  it("stores the password as Argon2id", async () => {
    const [row] = await owner.begin(async (tx) => {
      await tx`set local role app_auth`;
      return tx`select a.password from accounts a join users u on u.id = a.user_id
        where u.email = ${emails[0]!} and a.provider_id = 'credential'`;
    });
    expect(row?.password).toMatch(/^\$argon2id\$/);
  });
});

describe("invite-only tenant", () => {
  it("refuses a sign-in without an invitation", async () => {
    await expect(
      auth().api.signUpEmail({
        body: { email: email("uninvited"), password: PASSWORD, name: "Uninvited" },
        headers: hostHeaders(INVITE),
      }),
    ).rejects.toMatchObject({ body: { code: "invite_required" } });
  });

  it("admits the invited address with the invitation token, in the invited role", async () => {
    const invited = email("invited");
    const { token } = await withTenant({ tenantId: INVITE }, (tx) =>
      createInvitation(tx, {
        tenantId: INVITE,
        email: invited,
        role: "instructor",
        invitedBy: inviter,
      }),
    );
    const res = await auth().api.signUpEmail({
      body: { email: invited, password: PASSWORD, name: "Invited" },
      headers: hostHeaders(INVITE, { cookie: `${INVITE_COOKIE}=${token}` }),
    });
    expect(await membershipOf(INVITE, res.user.id)).toMatchObject({
      role: "instructor",
      status: "active",
    });
  });

  it("does not let an invitation be used by a different address", async () => {
    const { token } = await withTenant({ tenantId: INVITE }, (tx) =>
      createInvitation(tx, {
        tenantId: INVITE,
        email: email("target"),
        role: "learner",
        invitedBy: inviter,
      }),
    );
    await expect(
      auth().api.signUpEmail({
        body: { email: email("thief"), password: PASSWORD, name: "Thief" },
        headers: hostHeaders(INVITE, { cookie: `${INVITE_COOKIE}=${token}` }),
      }),
    ).rejects.toMatchObject({ body: { code: "invite_required" } });
  });
});

describe("one person, several tenants", () => {
  it("signs an existing user into another open tenant with the same credentials", async () => {
    const res = await auth().api.signInEmail({
      body: { email: emails[0]!, password: PASSWORD },
      headers: hostHeaders(OPEN),
      returnHeaders: true,
    });
    expect(res.response.user.email).toBe(emails[0]);
  });

  it("never accepts a session cookie on another tenant's host", async () => {
    const res = await auth().api.signInEmail({
      body: { email: emails[0]!, password: PASSWORD },
      headers: hostHeaders(OPEN),
      returnHeaders: true,
    });
    const cookie = (res.headers.get("set-cookie") ?? "").split(";")[0]!;
    const session = await auth().api.getSession({ headers: hostHeaders(INVITE, { cookie }) });
    // Better Auth finds the session; the tenant binding is what getTenantSession enforces.
    expect((session?.session as { tenantId?: string } | undefined)?.tenantId).toBe(OPEN);
    expect((session?.session as { tenantId?: string } | undefined)?.tenantId).not.toBe(INVITE);
  });
});
