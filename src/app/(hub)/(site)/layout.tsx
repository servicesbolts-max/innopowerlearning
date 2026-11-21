import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PLATFORM_OWNER, PRODUCT_NAME } from "@/lib/config";
import { ShellFrame, SiteFooter, SiteHeader } from "../../_components/shell";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hub");
  return {
    title: { default: PRODUCT_NAME, template: t("titleTemplate", { product: PRODUCT_NAME }) },
  };
}

/** Innopower Hub shell (root domain). Uses the platform default theme from the root layout. */
export default async function HubSiteLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("hub");
  return (
    <ShellFrame skipLabel={t("skipToContent")}>
      <SiteHeader
        brand={{ name: PRODUCT_NAME, monogram: "IL", href: "/" }}
        navLabel={t("nav.label")}
        items={[
          { href: "/partners", label: t("nav.partners"), segment: "partners" },
          { href: "/library", label: t("nav.library"), segment: "library" },
          { href: "/become-a-partner", label: t("nav.becomePartner"), segment: "become-a-partner" },
          { href: "/sign-in", label: t("nav.signIn"), segment: "sign-in", emphasis: true },
        ]}
      />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <SiteFooter
        label={t("footer.label")}
        items={[
          { href: "/legal/privacy", label: t("footer.privacy") },
          { href: "/legal/terms", label: t("footer.terms") },
          { href: "/design/innopower", label: t("footer.designSystem") },
        ]}
      >
        <span>{t("footer.owner", { owner: PLATFORM_OWNER })}</span>
      </SiteFooter>
    </ShellFrame>
  );
}
