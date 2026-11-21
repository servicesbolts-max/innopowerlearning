import NextLink from "next/link";
import { getTranslations } from "next-intl/server";
import { PLATFORM_OWNER, PRODUCT_NAME } from "@/lib/config";
import { PrimaryLink } from "../../_components/shell";
import { getPublicPartners } from "../../_lib/tenancy";
import { PartnerList } from "./partner-list";

/** Innopower Hub home (root domain). */
export default async function HubHome() {
  const t = await getTranslations("hub");
  const partners = await getPublicPartners();
  return (
    <div className="mx-auto flex max-w-reading flex-col gap-10 px-4 py-12 sm:py-16">
      <section aria-labelledby="hub-title" className="flex flex-col gap-4">
        <h1 id="hub-title" className="text-large-title tracking-tight">
          {t("home.title")}
        </h1>
        <p className="text-body text-label-secondary">
          {t("home.lead", { product: PRODUCT_NAME, owner: PLATFORM_OWNER })}
        </p>
        <div>
          <PrimaryLink href="/sign-in">{t("home.findOrg")}</PrimaryLink>
        </div>
      </section>
      <section aria-labelledby="hub-partners" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="hub-partners" className="text-title2">
            {t("home.partnersHeading")}
          </h2>
          <NextLink
            href="/partners"
            className="rounded-control text-subheadline text-accent-text underline-offset-2 focus-ring hover:underline"
          >
            {t("home.allPartners")}
          </NextLink>
        </div>
        <PartnerList partners={partners} linkLabel="visit" />
      </section>
    </div>
  );
}
