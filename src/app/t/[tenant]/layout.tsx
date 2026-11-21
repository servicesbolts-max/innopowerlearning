import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { ToastProvider, ToastRegion } from "@/design-system";
import { PRODUCT_NAME } from "@/lib/config";
import { logger } from "@/lib/logger";
import { listPublicPartners } from "@/modules/tenancy";
import { ShellFrame, SiteFooter, SiteHeader } from "../../_components/shell";
import { getTenantShell } from "../../_lib/tenancy";

/**
 * Tenant shell. The proxy rewrites `{slug}.ROOT_DOMAIN/x` to `/t/{slug}/x` only for an active
 * tenant, so `tenant` is always a resolved slug here; notFound() covers a tenant suspended
 * between the proxy check and the render.
 *
 * Active tenants are prerendered at build when the database is reachable. Cache Components needs
 * at least one param, so a placeholder (which renders notFound) stands in when it is not.
 */
const PLACEHOLDER = "__shell";

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
  return shell ? { title: { default: shell.name, template: `%s · ${shell.name}` } } : {};
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
          <ShellFrame>
            <SiteHeader
              brand={{ name: shell.name, monogram: shell.logo.text, href: "/" }}
              navLabel={t("nav.label")}
              items={[
                { href: "/courses", label: t("nav.courses") },
                { href: "/programs", label: t("nav.programs") },
              ]}
              cta={{ href: "/sign-in", label: t("nav.signIn") }}
            />
            <main id="main" className="flex-1">
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
