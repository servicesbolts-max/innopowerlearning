import { asc, sql } from "drizzle-orm";
import { z } from "zod";
import { featureFlags, TENANT_PRESETS, tenants, tenantSettings, tenantThemes } from "@/db/schema";
import { uuidv7 } from "@/lib/ids";
import { tenantThemeSchema } from "@/lib/theme";
import { monogramText } from "./branding";
import { flagsForPreset } from "./presets";
import { isPartnerSlug } from "./slugs";
import { withTenant, type TenantTx } from "./with-tenant";

/**
 * Partner provisioning and the partner list for the Super Admin Console (MVP slice M7).
 *
 * These run inside the platform tenant's audited action transaction. They switch to
 * app_platform (forced RLS still applies: its policies only allow inserting a new tenant's own
 * rows with app.tenant_id set to that new tenant, and reading the tenant list), then switch
 * back to app_user in the platform tenant so the audit entry lands there.
 */
export const provisionSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .refine((s) => isPartnerSlug(s), { message: "slug" }),
  name: z.string().trim().min(2).max(120),
  preset: z.enum(TENANT_PRESETS),
  accent: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/),
  adminEmail: z.email().max(320),
});
export type ProvisionInput = z.infer<typeof provisionSchema>;

async function asPlatform<T>(
  tx: TenantTx,
  platformTenantId: string,
  targetTenantId: string,
  fn: () => Promise<T>,
): Promise<T> {
  await tx.execute(sql`set local role app_platform`);
  await tx.execute(sql`select set_config('app.tenant_id', ${targetTenantId}, true)`);
  try {
    return await fn();
  } finally {
    await tx.execute(sql`set local role app_user`);
    await tx.execute(sql`select set_config('app.tenant_id', ${platformTenantId}, true)`);
  }
}

export interface PartnerRow {
  id: string;
  slug: string;
  name: string;
  preset: string;
  status: string;
  createdAt: Date;
}

/** Every partner tenant (Console list). */
export function listPartners(tx: TenantTx, platformTenantId: string): Promise<PartnerRow[]> {
  return asPlatform(tx, platformTenantId, platformTenantId, () =>
    tx
      .select({
        id: tenants.id,
        slug: tenants.slug,
        name: tenants.name,
        preset: tenants.preset,
        status: tenants.status,
        createdAt: tenants.createdAt,
      })
      .from(tenants)
      .where(sql`${tenants.kind} = 'partner' and ${tenants.deletedAt} is null`)
      .orderBy(asc(tenants.name)),
  );
}

/**
 * Creates an active partner with its settings, theme and preset flags, then runs onCreated in
 * that new tenant. 0012 limits app_platform inserts to a tenant created in this transaction.
 */
export async function provisionTenant<R>(
  tx: TenantTx,
  platformTenantId: string,
  input: ProvisionInput,
  actorUserId: string,
  /** Runs in the new tenant only (its first invitation and audit entry). */
  onCreated: (tenantId: string) => Promise<R>,
): Promise<{ id: string; created: R } | { conflict: true }> {
  const id = uuidv7();
  return asPlatform(tx, platformTenantId, id, async () => {
    const inserted = await tx
      .insert(tenants)
      .values({
        id,
        slug: input.slug,
        name: input.name,
        kind: "partner",
        preset: input.preset,
        status: "active",
        listed: true,
        createdBy: actorUserId,
      })
      .onConflictDoNothing()
      .returning({ id: tenants.id });
    if (inserted.length === 0) return { conflict: true as const };
    const themeId = uuidv7();
    await tx.insert(tenantThemes).values({
      tenantId: id,
      id: themeId,
      name: "Brand",
      theme: tenantThemeSchema.parse({ accent: input.accent }),
      createdBy: actorUserId,
    });
    await tx.insert(tenantSettings).values({
      tenantId: id,
      id: uuidv7(),
      logo: { kind: "monogram", text: monogramText(input.name) },
      locale: "en",
      timeZone: "UTC",
      placeholderBranding: false,
      activeThemeId: themeId,
      registrationMode: "invite_only",
      allowedEmailDomains: [],
      requireAdmin2fa: true,
      sessionHours: 168,
      createdBy: actorUserId,
    });
    for (const [key, enabled] of Object.entries(flagsForPreset(input.preset))) {
      await tx
        .insert(featureFlags)
        .values({ tenantId: id, id: uuidv7(), key, enabled, createdBy: actorUserId });
    }
    return { id, created: await onCreated(id) };
  });
}

/** The partner list for the Console, read on the audited platform path. */
export function listAllPartners(platformTenantId: string): Promise<PartnerRow[]> {
  return withTenant({ tenantId: platformTenantId }, (tx) => listPartners(tx, platformTenantId));
}
