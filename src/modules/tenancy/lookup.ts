import { sql } from "drizzle-orm";
import { z } from "zod";
import { TENANT_PRESETS } from "@/db/schema";
import type { HostClass } from "./host";
import { withoutTenant } from "./with-tenant";

export const resolvedTenantSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  status: z.enum(["active", "suspended", "archived"]),
});
export type ResolvedTenant = z.infer<typeof resolvedTenantSchema>;

/** Looks up the tenant a classified host addresses. Null when no tenant matches. */
export async function resolveTenant(
  target: Extract<HostClass, { surface: "tenant" }>,
): Promise<ResolvedTenant | null> {
  const rows = await withoutTenant((tx) =>
    target.by === "slug"
      ? tx.execute(sql`select id, slug, status from resolve_tenant_by_slug(${target.slug})`)
      : tx.execute(sql`select id, slug, status from resolve_tenant_by_host(${target.host})`),
  );
  const [row] = rows as unknown as unknown[];
  return row ? resolvedTenantSchema.parse(row) : null;
}

export const publicPartnerSchema = z.object({
  slug: z.string(),
  name: z.string(),
  preset: z.enum(TENANT_PRESETS),
});
export type PublicPartner = z.infer<typeof publicPartnerSchema>;

/** Active, listed partners for the Hub directory: public fields only. */
export async function listPublicPartners(): Promise<PublicPartner[]> {
  const rows = await withoutTenant((tx) =>
    tx.execute(sql`select slug, name, preset from list_public_partners()`),
  );
  return z.array(publicPartnerSchema).parse(Array.from(rows as unknown as unknown[]));
}
