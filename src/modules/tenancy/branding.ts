import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { tenants, tenantSettings, tenantThemes } from "@/db/schema";
import { uuidv7 } from "@/lib/ids";
import { DEFAULT_THEME, tenantThemeSchema } from "@/lib/theme";
import { tenantLogoSchema } from "./shell";
import { withTenant, type TenantTx } from "./with-tenant";

/**
 * Partner branding (MVP slice M6): name, tagline, accent colour and an optional logo image URL.
 * The accent goes through the theme engine (contrast-corrected when rendered); the logo is a URL
 * in typed settings, never markup.
 */
const httpsImage = z
  .string()
  .trim()
  .max(500)
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .refine(
    (v) => {
      if (v === null) return true;
      try {
        const u = new URL(v);
        return u.protocol === "https:" && !u.username && !u.password;
      } catch {
        return false;
      }
    },
    { message: "https_url" },
  );

export const brandingSchema = z.object({
  name: z.string().trim().min(2).max(120),
  tagline: z.string().trim().max(200).default(""),
  accent: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/),
  logoUrl: httpsImage.default(null),
  logoAlt: z.string().trim().max(120).default(""),
});
export type BrandingInput = z.infer<typeof brandingSchema>;

export interface Branding {
  name: string;
  tagline: string;
  accent: string;
  logoUrl: string | null;
  logoAlt: string;
}

export function monogramText(name: string): string {
  const initials = name
    .split(/\s+/)
    .map((w) => w.match(/[\p{L}\p{N}]/u)?.[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return initials || "?";
}

async function current(tx: TenantTx, tenantId: string) {
  const [tenant] = await tx
    .select({ name: tenants.name })
    .from(tenants)
    .where(eq(tenants.id, tenantId));
  const [settings] = await tx
    .select()
    .from(tenantSettings)
    .where(isNull(tenantSettings.deletedAt))
    .limit(1);
  const [theme] = settings?.activeThemeId
    ? await tx
        .select({ id: tenantThemes.id, theme: tenantThemes.theme })
        .from(tenantThemes)
        .where(and(eq(tenantThemes.id, settings.activeThemeId), isNull(tenantThemes.deletedAt)))
    : [];
  return { tenant, settings, theme };
}

export function getBranding(tenantId: string): Promise<Branding | null> {
  return withTenant({ tenantId }, async (tx) => {
    const { tenant, settings, theme } = await current(tx, tenantId);
    if (!tenant) return null;
    const parsedTheme = tenantThemeSchema.safeParse(theme?.theme);
    const logo = tenantLogoSchema.safeParse(settings?.logo);
    return {
      name: tenant.name,
      tagline: settings?.tagline ?? "",
      accent: parsedTheme.success ? parsedTheme.data.accent : DEFAULT_THEME.accent,
      logoUrl: logo.success ? (logo.data.imageUrl ?? null) : null,
      logoAlt: logo.success ? (logo.data.imageAlt ?? "") : "",
    };
  });
}

/** Saves branding inside the caller's tenant transaction. */
export async function saveBranding(tx: TenantTx, tenantId: string, input: BrandingInput) {
  const { settings, theme } = await current(tx, tenantId);
  await tx.update(tenants).set({ name: input.name }).where(eq(tenants.id, tenantId));

  const base = tenantThemeSchema.safeParse(theme?.theme);
  const nextTheme = tenantThemeSchema.parse({
    ...(base.success ? base.data : DEFAULT_THEME),
    accent: input.accent,
  });
  let themeId = theme?.id ?? null;
  if (themeId) {
    await tx.update(tenantThemes).set({ theme: nextTheme }).where(eq(tenantThemes.id, themeId));
  } else {
    themeId = uuidv7();
    await tx
      .insert(tenantThemes)
      .values({ tenantId, id: themeId, name: "Brand", theme: nextTheme });
  }

  const oldLogo = tenantLogoSchema.safeParse(settings?.logo);
  const logo = tenantLogoSchema.parse({
    kind: "monogram",
    text: oldLogo.success ? oldLogo.data.text : monogramText(input.name),
    ...(input.logoUrl ? { imageUrl: input.logoUrl, imageAlt: input.logoAlt || input.name } : {}),
  });
  if (!settings) throw new Error("tenant settings are missing");
  await tx
    .update(tenantSettings)
    .set({ tagline: input.tagline || null, logo, activeThemeId: themeId })
    .where(eq(tenantSettings.id, settings.id));
}
