import { eq, isNull, and } from "drizzle-orm";
import { z } from "zod";
import {
  featureFlags,
  tenantSettings,
  tenants,
  tenantThemes,
  type RegistrationMode,
} from "@/db/schema";
import { logger } from "@/lib/logger";
import { safeBuildTheme, themeToCss } from "@/lib/theme";
import { resolveTenant } from "./lookup";
import { featureFlagKey, type FeatureFlagKey } from "./presets";
import { withTenant } from "./with-tenant";

/** Typed logo data. Never stored SVG or markup (Section 6.2: no raw HTML from partners). */
export const tenantLogoSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("monogram"),
    text: z
      .string()
      .trim()
      .regex(/^[\p{L}\p{N}]{1,3}$/u),
  }),
]);
export type TenantLogo = z.infer<typeof tenantLogoSchema>;

export interface TenantShell {
  id: string;
  slug: string;
  name: string;
  preset: (typeof tenants.$inferSelect)["preset"];
  tagline: string | null;
  logo: TenantLogo;
  locale: string;
  timeZone: string;
  placeholderBranding: boolean;
  /** Public sign-up rules, shown on the sign-in and sign-up pages (Section 6.1). */
  registrationMode: RegistrationMode;
  allowedEmailDomains: string[];
  flags: Record<FeatureFlagKey, boolean>;
  /** Validated `--name:value;` CSS from the theme engine, for a server-rendered <style>. */
  themeCss: string;
}

function monogramFor(name: string): TenantLogo {
  const initials = name
    .split(/\s+/)
    .map((w) => w.match(/[\p{L}\p{N}]/u)?.[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return { kind: "monogram", text: initials || "?" };
}

/**
 * The id of the active partner a slug names, or null. Callers may cache this briefly by slug;
 * everything else about a tenant is cached by id (see loadTenantShellById).
 */
export async function activeTenantIdForSlug(slug: string): Promise<string | null> {
  const resolved = await resolveTenant({ surface: "tenant", by: "slug", slug });
  return resolved?.status === "active" ? resolved.id : null;
}

/** Everything the tenant shell renders, for an active partner slug. */
export async function loadTenantShell(slug: string): Promise<TenantShell | null> {
  const id = await activeTenantIdForSlug(slug);
  return id ? loadTenantShellById(id) : null;
}

/**
 * Everything the tenant shell renders, for an active partner tenant id. Null for a missing,
 * deleted or non-active tenant (re-checked here, inside the tenant's own context). Stored data
 * that no longer validates falls back to safe defaults and is logged with the tenant id only.
 * Callers cache this by id (cacheTag `tenant:<id>`), never by slug: a slug can be reassigned.
 */
export async function loadTenantShellById(tenantId: string): Promise<TenantShell | null> {
  return withTenant({ tenantId }, async (tx) => {
    const [tenant] = await tx.select().from(tenants).where(eq(tenants.id, tenantId));
    if (!tenant || tenant.status !== "active" || tenant.deletedAt) return null;
    const [settings] = await tx
      .select()
      .from(tenantSettings)
      .where(isNull(tenantSettings.deletedAt))
      .limit(1);
    const [theme] = settings?.activeThemeId
      ? await tx
          .select({ theme: tenantThemes.theme })
          .from(tenantThemes)
          .where(and(eq(tenantThemes.id, settings.activeThemeId), isNull(tenantThemes.deletedAt)))
      : [];
    const flagRows = await tx
      .select({ key: featureFlags.key, enabled: featureFlags.enabled })
      .from(featureFlags)
      .where(isNull(featureFlags.deletedAt));

    const built = safeBuildTheme(theme?.theme ?? null, () =>
      logger.warn({ tenantId: tenant.id }, "stored tenant theme is invalid; using the default"),
    );
    const logo = tenantLogoSchema.safeParse(settings?.logo);
    const flags = Object.fromEntries(featureFlagKey.options.map((k) => [k, false])) as Record<
      FeatureFlagKey,
      boolean
    >;
    for (const row of flagRows) {
      const key = featureFlagKey.safeParse(row.key);
      if (key.success) flags[key.data] = row.enabled;
    }

    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      preset: tenant.preset,
      tagline: settings?.tagline ?? null,
      logo: logo.success ? logo.data : monogramFor(tenant.name),
      locale: settings?.locale ?? "en",
      timeZone: settings?.timeZone ?? "UTC",
      placeholderBranding: settings?.placeholderBranding ?? false,
      registrationMode: settings?.registrationMode ?? "invite_only",
      allowedEmailDomains: settings?.allowedEmailDomains ?? [],
      flags,
      themeCss: themeToCss(built),
    };
  });
}
