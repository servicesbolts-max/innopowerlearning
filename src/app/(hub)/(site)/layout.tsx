import { getTranslations } from "next-intl/server";
import { PLATFORM_OWNER, PRODUCT_NAME } from "@/lib/config";
import { ShellFrame, SiteFooter, SiteHeader } from "../../_components/shell";

/** Innopower Hub shell (root domain). Uses the platform default theme from the root layout. */
export default async function HubSiteLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("hub");
  return (
    <ShellFrame>
      <SiteHeader
        brand={{ name: PRODUCT_NAME, monogram: "IL", href: "/" }}
        navLabel={t("nav.label")}
        items={[
          { href: "/partners", label: t("nav.partners") },
          { href: "/library", label: t("nav.library") },
          { href: "/become-a-partner", label: t("nav.becomePartner") },
        ]}
        cta={{ href: "/sign-in", label: t("nav.signIn") }}
      />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter
        label={t("footer.label")}
        items={[
          { href: "/legal/privacy", label: t("footer.privacy") },
          { href: "/legal/terms", label: t("footer.terms") },
          { href: "/api/health", label: t("footer.status") },
          { href: "/design/innopower", label: t("footer.designSystem") },
        ]}
      >
        <span>{t("footer.owner", { owner: PLATFORM_OWNER })}</span>
      </SiteFooter>
    </ShellFrame>
  );
}
