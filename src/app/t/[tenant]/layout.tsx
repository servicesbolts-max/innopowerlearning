import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { ToastProvider, ToastRegion } from "@/design-system";
import { PRODUCT_NAME } from "@/lib/config";
import { logger } from "@/lib/logger";
import { listPublicPartners } from "@/modules/tenancy";
import { AccountNav, ImpersonationBanner } from "../../_components/account-nav";
import { ShellFrame, SiteFooter, SiteHeader } from "../../_components/shell";
import { getTenantShell } from "../../_lib/tenancy";

/**
 * Tenant shell. The proxy rewrites `{slug}.ROOT_DOMAIN/x` to `/t/{slug}/x` only for an active
 * tenant (re-checked at most every 30 s per process), so `tenant` is normally a resolved slug
 * here. notFound() covers slugs that are not, or no longer, an active tenant once the cached
 * slug lookup lapses (minutes) or is expired by its `tenant-slug:<slug>` tag. Suspension (P11)
 * must expire that tag and `tenant:<id>` so the change applies at once.
 *
 * Active tenants are prerendered at build when the database is reachable. Cache Components needs
 * at least one param, so a placeholder (which renders notFound) stands in when it is not.
 */
const PLACEHOLDER = "__shell";

/**
 * Tenant routes await `params` outside Suspense on purpose: the branded shell (theme CSS, name,
 * monogram) must render in the first byte, never as a neutral fallback that then changes color.
 * Navigations into a tenant may therefore block; active tenants are prerendered and cached, so
 * in practice they do not.
 */
export const instant = false;

export async function generateStaticParams() {
  try {
    const partners = await listPublicPartners();
    if (partners.length > 0) return partners.map((p) => ({ tenant: p.slug }));
  } catch (error) {
    logger.warn({ err: error }, "tenant prerender list unavailable; tenants render on demand");
  }
  return [{ tenant: PLACEHOLDER }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenant: string }>;
}): Promise<Metadata> {
  const shell = await getTenantShell((await params).tenant);
  if (!shell) return {};
  const t = await getTranslations("tenant");
  return { title: { default: shell.name, template: t("titleTemplate", { name: shell.name }) } };
}

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const shell = await getTenantShell(tenant);
  if (!shell) notFound();
  const t = await getTranslations("tenant");

  return (
    <>
      {/* Engine output only: validated `--name:value;` pairs, overriding the platform theme. */}
      <style dangerouslySetInnerHTML={{ __html: shell.themeCss }} />
      <NextIntlClientProvider timeZone={shell.timeZone}>
        {/* Keyed by tenant so toasts never carry over from one tenant to another. */}
        <ToastProvider key={shell.id}>
          <ShellFrame skipLabel={t("skipToContent")}>
            <SiteHeader
              brand={{
                name: shell.name,
                monogram: shell.logo.text,
                href: "/",
                logo: shell.logo.imageUrl
                  ? { url: shell.logo.imageUrl, alt: shell.logo.imageAlt ?? "" }
                  : undefined,
              }}
              navLabel={t("nav.label")}
              items={[
                { href: "/courses", label: t("nav.courses"), segment: "courses" },
                { href: "/learn", label: t("nav.learn"), segment: "learn" },
                { href: "/programs", label: t("nav.programs"), segment: "programs" },
              ]}
              account={<AccountNav />}
            />
            <ImpersonationBanner />
            <main id="main" tabIndex={-1} className="flex-1 outline-none">
              {children}
            </main>
            <SiteFooter label={t("footer.label")} items={[]}>
              <span>{t("footer.poweredBy", { product: PRODUCT_NAME })}</span>
              {shell.placeholderBranding && <span>{t("footer.placeholder")}</span>}
            </SiteFooter>
          </ShellFrame>
          <ToastRegion />
        </ToastProvider>
      </NextIntlClientProvider>
    </>
  );
}
