import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ToastProvider, ToastRegion } from "@/design-system";
import { PRODUCT_NAME } from "@/lib/config";
import { AccountNav } from "../../_components/account-nav";
import { ShellFrame, SiteFooter, SiteHeader } from "../../_components/shell";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("lms.console");
  return {
    title: { default: t("title"), template: `%s · ${t("title")}` },
    robots: { index: false, follow: false },
  };
}

/** Super Admin Console shell, served on console.{ROOT_DOMAIN} only (see the proxy). */
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("lms.console");
  const hub = await getTranslations("hub");
  return (
    <ToastProvider>
      <ShellFrame skipLabel={hub("skipToContent")}>
        <SiteHeader
          brand={{ name: t("title"), monogram: "IL", href: "/" }}
          navLabel={hub("nav.label")}
          items={[]}
          account={<AccountNav />}
        />
        <main id="main" tabIndex={-1} className="flex-1 outline-none">
          {children}
        </main>
        <SiteFooter label={hub("footer.label")} items={[]}>
          <span>{PRODUCT_NAME}</span>
        </SiteFooter>
      </ShellFrame>
      <ToastRegion />
    </ToastProvider>
  );
}
