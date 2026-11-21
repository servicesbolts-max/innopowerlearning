import { createHash, randomBytes } from "node:crypto";
import postgres from "postgres";
import { uuidv7 } from "../../src/lib/ids";
import { hashPassword } from "../../src/modules/auth/password";

/**
 * Test data for e2e/auth.spec.ts, created straight in the local database before the run and
 * removed after it. Passwords are generated per run and live only in this process's env
 * (E2E_AUTH_FIXTURES), never in files. Each Playwright project gets its own users, because
 * tests change them (2FA, passkeys).
 */
export interface ProjectFixtures {
  admin: { email: string; password: string };
  learner: { email: string; password: string };
  wapseaLearner: { email: string; password: string };
  invite: { token: string; email: string };
}

export interface AuthFixtures {
  runId: string;
  inviteTenantSlug: string;
  projects: Record<string, ProjectFixtures>;
}

export const PROJECTS = ["mobile-light", "desktop-dark"] as const;

function ownerSql() {
  const url = process.env.DATABASE_OWNER_URL;
  if (!url) throw new Error("E2E auth fixtures need DATABASE_OWNER_URL (load .env.example).");
  return postgres(url, { max: 1, onnotice: () => {} });
}

async function tenantId(sql: postgres.Sql, slug: string): Promise<string> {
  const [row] = await sql.begin(async (tx) => {
    await tx`set local role app_resolver`;
    return tx`select id from tenants where slug = ${slug}`;
  });
  if (!row) throw new Error(`Tenant ${slug} is missing: run pnpm db:seed`);
  return row.id as string;
}

async function createUser(
  tx: postgres.TransactionSql,
  email: string,
  name: string,
): Promise<{ id: string; password: string }> {
  const id = uuidv7();
  const password = `E2e-${randomBytes(12).toString("base64url")}`;
  await tx`set local role app_auth`;
  await tx`insert into users (id, name, email, email_verified) values (${id}, ${name}, ${email}, true)`;
  await tx`insert into accounts (id, user_id, account_id, provider_id, password)
    values (${uuidv7()}, ${id}, ${id}, 'credential', ${await hashPassword(password)})`;
  await tx`reset role`;
  return { id, password };
}

async function join(tx: postgres.TransactionSql, tenant: string, userId: string, role: string) {
  await tx`select set_config('app.tenant_id', ${tenant}, true)`;
  await tx`insert into memberships (tenant_id, user_id, role) values (${tenant}, ${userId}, ${role})`;
}

export async function createAuthFixtures(): Promise<AuthFixtures> {
  const sql = ownerSql();
  const runId = Date.now().toString(36);
  try {
    const lsetf = await tenantId(sql, "lsetf");
    const wapsea = await tenantId(sql, "wapsea");
    const inviteTenantSlug = `e2e-invite-${runId}`;
    const inviteTenant = uuidv7();

    await sql.begin(async (tx) => {
      await tx`select set_config('app.tenant_id', ${inviteTenant}, true)`;
      await tx`insert into tenants (id, slug, name, kind, preset, listed)
        values (${inviteTenant}, ${inviteTenantSlug}, 'E2E Invite-only Academy', 'partner', 'university', false)`;
      const [theme] = await tx`insert into tenant_themes (tenant_id, name, theme)
        values (${inviteTenant}, 'Brand', ${tx.json({ accent: "#5B4BC4" })}) returning id`;
      await tx`insert into tenant_settings (tenant_id, logo, registration_mode, active_theme_id, placeholder_branding)
        values (${inviteTenant}, ${tx.json({ kind: "monogram", text: "EI" })}, 'invite_only', ${theme!.id}, true)`;
    });

    const projects: Record<string, ProjectFixtures> = {};
    for (const project of PROJECTS) {
      const mail = (who: string) => `${who}-${project}-${runId}@e2e.test`;
      projects[project] = await sql.begin(async (tx) => {
        const admin = await createUser(tx, mail("admin"), "E2E Admin");
        await join(tx, lsetf, admin.id, "tenant_admin");
        const learner = await createUser(tx, mail("learner"), "E2E Learner");
        await join(tx, lsetf, learner.id, "learner");
        const wapseaLearner = await createUser(tx, mail("wapsea"), "E2E Wapsea Learner");
        await join(tx, wapsea, wapseaLearner.id, "learner");

        const token = randomBytes(32).toString("base64url");
        const invitedEmail = mail("invited");
        await tx`select set_config('app.tenant_id', ${inviteTenant}, true)`;
        await tx`insert into invitations (tenant_id, email, role, token_hash, expires_at, created_by)
          values (${inviteTenant}, ${invitedEmail}, 'instructor',
                  ${createHash("sha256").update(token).digest("hex")},
                  now() + interval '1 day', ${admin.id})`;
        return {
          admin: { email: mail("admin"), password: admin.password },
          learner: { email: mail("learner"), password: learner.password },
          wapseaLearner: { email: mail("wapsea"), password: wapseaLearner.password },
          invite: { token, email: invitedEmail },
        } as ProjectFixtures;
      });
    }
    return { runId, inviteTenantSlug, projects };
  } finally {
    await sql.end({ timeout: 5 });
  }
}

/** Removes everything a run created: e2e users (and their sessions), the invite-only tenant. */
export async function removeAuthFixtures(
  fixtures: Pick<AuthFixtures, "runId" | "inviteTenantSlug">,
) {
  const sql = ownerSql();
  try {
    const [tenant] = await sql.begin(async (tx) => {
      await tx`set local role app_resolver`;
      return tx`select id from tenants where slug = ${fixtures.inviteTenantSlug}`;
    });
    await sql.begin(async (tx) => {
      await tx`set local role app_auth`;
      if (tenant) await tx`delete from sessions where tenant_id = ${tenant.id}`;
      // Every address a run creates (fixtures and sign-ups) ends in -<runId>@e2e.test.
      const users =
        await tx`select id from users where email like ${`%-${fixtures.runId}@e2e.test`}`;
      await tx`reset role`;
      for (const { id } of users) {
        for (const t of ["lsetf", "wapsea", fixtures.inviteTenantSlug]) {
          const [row] = await tx`select id from tenants where slug = ${t}`;
          if (!row) continue;
          await tx`select set_config('app.tenant_id', ${row.id}, true)`;
          await tx`delete from invitations where created_by = ${id} or accepted_by = ${id}`;
          await tx`delete from memberships where user_id = ${id}`;
        }
      }
      await tx`set local role app_auth`;
      await tx`delete from users where email like ${`%-${fixtures.runId}@e2e.test`}`;
      await tx`reset role`;
      if (tenant) {
        await tx`select set_config('app.tenant_id', ${tenant.id}, true)`;
        for (const table of [
          "audit_logs",
          "invitations",
          "memberships",
          "tenant_settings",
          "tenant_themes",
        ]) {
          await tx`delete from ${tx(table)} where tenant_id = ${tenant.id}`;
        }
        await tx`delete from tenants where id = ${tenant.id}`;
      }
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}
