import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PRODUCT_NAME } from "@/lib/config";
import { getPublicPartners } from "../../../_lib/tenancy";
import { PartnerList } from "../partner-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hub");
  return { title: `${t("signIn.title")} · ${PRODUCT_NAME}` };
}

/** "Find your organization": sessions are scoped to each tenant host (Section 3). */
export default async function FindOrganizationPage() {
  const t = await getTranslations("hub");
  const partners = await getPublicPartners();
  return (
    <div className="mx-auto flex max-w-reading flex-col gap-6 px-4 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-large-title tracking-tight">{t("signIn.title")}</h1>
        <p className="text-body text-label-secondary">{t("signIn.lead")}</p>
      </div>
      <PartnerList partners={partners} path="/sign-in" linkLabel="signIn" />
    </div>
  );
}
