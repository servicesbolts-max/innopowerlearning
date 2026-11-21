import { Compass } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { env } from "@/lib/env";
import { PRODUCT_NAME } from "@/lib/config";
import { PlaceholderPage } from "./_components/placeholder-page";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * App-wide 404, including every request the proxy refuses (unknown host, unknown tenant, a
 * hub-only path on a tenant host). It links to the Hub, never to the requested host.
 */
export default async function NotFound() {
  const t = await getTranslations("hub.notFound");
  const { ROOT_DOMAIN, APP_ENV } = env();
  const hub = `${APP_ENV === "development" ? "http" : "https"}://${ROOT_DOMAIN}/`;
  return (
    <main id="main">
      <PlaceholderPage
        title={t("title")}
        body={t("body")}
        icon={Compass}
        back={{ href: hub, label: t("home", { product: PRODUCT_NAME }) }}
      />
    </main>
  );
}
