import { randomBytes } from "node:crypto";
import type postgres from "postgres";
import { uuidv7 } from "../../src/lib/ids";
import { hashPassword } from "../../src/modules/auth/password";
import { DEMO_ACCOUNTS, DEMO_PLANS, DEMO_TENANTS } from "./demo-data";

export interface SeedSummary {
  plans: number;
  tenants: { slug: string; id: string; created: boolean }[];
  /** Accounts created by this run, with their one-time passwords (printed once, never stored). */
  newAccounts: { email: string; password: string; where: string; role: string }[];
}

/**
 * Idempotent demo seed (Section 11), run on the owner connection. Rows are upserted by natural
 * key (plan key, tenant slug, theme name, flag key), so running it again changes nothing.
 *
 * Every tenant write happens with app.tenant_id set to that tenant, so the seed also works where
 * the owner is not a superuser and is bound by FORCE ROW LEVEL SECURITY (hosted Postgres).
 */
export async function seedDemo(
  sql: postgres.Sql,
  options: { rotateDemoPasswords?: boolean } = {},
): Promise<SeedSummary> {
  return sql.begin(async (tx) => {
    const planIds = new Map<string, string>();
    for (const p of DEMO_PLANS) {
      const [row] = await tx<{ id: string }[]>`
        insert into plans (id, key, name, seats, storage_gb, video_minutes, ai_credits)
        values (${uuidv7()}, ${p.key}, ${p.name}, ${p.seats}, ${p.storageGb}, ${p.videoMinutes}, ${p.aiCredits})
        on conflict (key) do update set name = excluded.name, seats = excluded.seats,
          storage_gb = excluded.storage_gb, video_minutes = excluded.video_minutes,
          ai_credits = excluded.ai_credits
        returning id`;
      planIds.set(p.key, row!.id);
    }

    // Existing tenant ids, read as app_resolver (allowed to see slug and id of every tenant).
    await tx`set local role app_resolver`;
    const existing = await tx<{ id: string; slug: string }[]>`select id, slug::text from tenants`;
    await tx`reset role`;
    const ids = new Map(existing.map((r) => [r.slug, r.id]));

    const summary: SeedSummary = { plans: DEMO_PLANS.length, tenants: [], newAccounts: [] };
    for (const t of DEMO_TENANTS) {
      const created = !ids.has(t.slug);
      const id = ids.get(t.slug) ?? uuidv7();
      await tx`select set_config('app.tenant_id', ${id}, true)`;

      await tx`
        insert into tenants (id, slug, name, kind, preset, status, listed, plan_id)
        values (${id}, ${t.slug}, ${t.name}, ${t.kind}, ${t.preset}, 'active', ${t.listed},
                ${planIds.get(t.plan) ?? null})
        on conflict (slug) do update set name = excluded.name, kind = excluded.kind,
          preset = excluded.preset, listed = excluded.listed, plan_id = excluded.plan_id`;

      const [theme] = await tx<{ id: string }[]>`
        insert into tenant_themes (tenant_id, id, name, theme)
        values (${id}, ${uuidv7()}, 'Brand (placeholder)', ${tx.json(t.theme)})
        on conflict (tenant_id, name) do update set theme = excluded.theme, deleted_at = null
        returning id`;

      await tx`
        insert into tenant_settings (tenant_id, id, tagline, logo, locale, time_zone,
                                     placeholder_branding, active_theme_id)
        values (${id}, ${uuidv7()}, ${t.tagline}, ${tx.json(t.logo)}, ${t.locale}, ${t.timeZone},
                ${t.kind === "partner"}, ${theme!.id})
        on conflict (tenant_id) do update set tagline = excluded.tagline, logo = excluded.logo,
          locale = excluded.locale, time_zone = excluded.time_zone,
          placeholder_branding = excluded.placeholder_branding,
          active_theme_id = excluded.active_theme_id, deleted_at = null`;

      for (const [key, enabled] of Object.entries(t.flags)) {
        await tx`
          insert into feature_flags (tenant_id, id, key, enabled)
          values (${id}, ${uuidv7()}, ${key}, ${enabled})
          on conflict (tenant_id, key) do update set enabled = excluded.enabled, deleted_at = null`;
      }
      summary.tenants.push({ slug: t.slug, id, created });
    }
    // Demo accounts (Section 11): identity rows as app_auth, memberships per tenant. Existing
    // accounts are left alone, so their passwords never change and are never printed again.
    const tenantIds = new Map(summary.tenants.map((t) => [t.slug, t.id]));
    for (const account of DEMO_ACCOUNTS) {
      await tx`set local role app_auth`;
      const [existing] = await tx<
        { id: string }[]
      >`select id from users where email = ${account.email}`;
      let userId = existing?.id;
      if (userId && options.rotateDemoPasswords) {
        // Explicit opt-in (--rotate-demo-passwords): new passwords for existing demo accounts.
        const password = randomBytes(15).toString("base64url");
        await tx`update accounts set password = ${await hashPassword(password)}
          where user_id = ${userId} and provider_id = 'credential'`;
        summary.newAccounts.push({
          email: account.email,
          password,
          where: account.tenant,
          role: account.role ?? account.platformRole ?? "",
        });
      }
      if (!userId) {
        userId = uuidv7();
        const password = randomBytes(15).toString("base64url");
        await tx`insert into users (id, name, email, email_verified, platform_role)
          values (${userId}, ${account.name}, ${account.email}, true, ${account.platformRole ?? null})`;
        await tx`insert into accounts (id, user_id, account_id, provider_id, password)
          values (${uuidv7()}, ${userId}, ${userId}, 'credential', ${await hashPassword(password)})`;
        summary.newAccounts.push({
          email: account.email,
          password,
          where: account.tenant,
          role: account.role ?? account.platformRole ?? "",
        });
      }
      await tx`reset role`;
      if (account.role) {
        const tenantId = tenantIds.get(account.tenant)!;
        await tx`select set_config('app.tenant_id', ${tenantId}, true)`;
        await tx`insert into memberships (tenant_id, id, user_id, role, status)
          values (${tenantId}, ${uuidv7()}, ${userId}, ${account.role}, 'active')
          on conflict (tenant_id, user_id) do nothing`;
      }
    }
    await tx`select set_config('app.tenant_id', '', true)`;
    return summary;
  }) as Promise<SeedSummary>;
}
