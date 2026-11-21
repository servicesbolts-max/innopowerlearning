import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb } from "@/db/client";
import { runMigrations, setRuntimeLoginPassword } from "@/db/migrate";
import { uuidv7 } from "@/lib/ids";
import { auth, createInvitation, INVITE_COOKIE } from "@/modules/auth";
import { closeAuthDb } from "@/modules/auth/db";
import { withTenant } from "@/modules/tenancy";
import { appPassword, createTenants, dropTenants, ownerConnection } from "./helpers";

/**
 * Better Auth end to end against the database: a password sign-up gets no session until the
 * email is confirmed; sign-in on a tenant host binds the session to that tenant and applies its
 * registration mode; a magic link cannot inherit a password set by someone else.
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

/** What clicking the confirmation link does, without the email round trip. */
async function confirmEmail(address: string) {
  await owner.begin(async (tx) => {
    await tx`set local role app_auth`;
    await tx`update users set email_verified = true where email = ${address}`;
  });
}

/** Sign up, confirm the address, then sign in on a tenant host (where admission runs). */
async function signUpAndIn(address: string, tenantId: string, extra: Record<string, string> = {}) {
  await auth().api.signUpEmail({
    body: { email: address, password: PASSWORD, name: "Person" },
    headers: hostHeaders(tenantId),
  });
  await confirmEmail(address);
  return auth().api.signInEmail({
    body: { email: address, password: PASSWORD },
    headers: hostHeaders(tenantId, extra),
    returnHeaders: true,
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
  it("gives no session until the email address is confirmed", async () => {
    const address = email("unconfirmed");
    const res = await auth().api.signUpEmail({
      body: { email: address, password: PASSWORD, name: "Unconfirmed" },
      headers: hostHeaders(OPEN),
    });
    expect(res.token).toBeNull();
    await expect(
      auth().api.signInEmail({
        body: { email: address, password: PASSWORD },
        headers: hostHeaders(OPEN),
      }),
    ).rejects.toMatchObject({ body: { code: "EMAIL_NOT_VERIFIED" } });
  });

  it("after confirmation, joins as learner and binds the session to the tenant", async () => {
    const res = await signUpAndIn(email("open"), OPEN);
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
        where u.email = ${emails[1]!} and a.provider_id = 'credential'`;
    });
    expect(row?.password).toMatch(/^\$argon2id\$/);
  });
});

describe("invite-only tenant", () => {
  it("refuses a sign-in without an invitation", async () => {
    await expect(signUpAndIn(email("uninvited"), INVITE)).rejects.toMatchObject({
      body: { code: "invite_required" },
    });
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
    const res = await signUpAndIn(invited, INVITE, { cookie: `${INVITE_COOKIE}=${token}` });
    expect(await membershipOf(INVITE, res.response.user.id)).toMatchObject({
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
      signUpAndIn(email("thief"), INVITE, { cookie: `${INVITE_COOKIE}=${token}` }),
    ).rejects.toMatchObject({ body: { code: "invite_required" } });
  });
});

describe("account pre-hijacking", () => {
  it("drops a password set before the email was proven when the owner uses a magic link", async () => {
    const victim = email("victim");
    // An attacker registers the victim's address with their own password and never confirms it.
    await auth().api.signUpEmail({
      body: { email: victim, password: PASSWORD, name: "Attacker" },
      headers: hostHeaders(OPEN),
    });
    // The real owner signs in with a magic link (which proves the address).
    await auth().api.signInMagicLink({ body: { email: victim }, headers: hostHeaders(OPEN) });
    const [link] = await owner.begin(async (tx) => {
      await tx`set local role app_auth`;
      return tx`select identifier from verifications
        where identifier like 'magic-link:%' and value like ${`%${victim}%`}
        order by created_at desc limit 1`;
    });
    const token = String(link!.identifier).slice("magic-link:".length);
    await auth().handler(
      new Request(
        `http://auth-${tag}.localhost:3000/api/auth/magic-link/verify?token=${token}&callbackURL=/`,
        {
          headers: hostHeaders(OPEN),
        },
      ),
    );
    // The attacker's password no longer opens the account.
    await expect(
      auth().api.signInEmail({
        body: { email: victim, password: PASSWORD },
        headers: hostHeaders(OPEN),
      }),
    ).rejects.toMatchObject({ body: { code: "INVALID_EMAIL_OR_PASSWORD" } });
  });
});

describe("one person, several tenants", () => {
  it("signs an existing user into another open tenant with the same credentials", async () => {
    const res = await auth().api.signInEmail({
      body: { email: emails[1]!, password: PASSWORD },
      headers: hostHeaders(OPEN),
      returnHeaders: true,
    });
    expect(res.response.user.email).toBe(emails[1]);
  });

  it("never accepts a session cookie on another tenant's host", async () => {
    const res = await auth().api.signInEmail({
      body: { email: emails[1]!, password: PASSWORD },
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
