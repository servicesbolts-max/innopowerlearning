import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PRODUCT_NAME } from "@/lib/config";
import { PlaceholderPage } from "../../../../_components/placeholder-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hub.stub");
  return { title: `${t("privacy.title")} · ${PRODUCT_NAME}` };
}

export default async function PrivacyPage() {
  const t = await getTranslations("hub.stub");
  return (
    <PlaceholderPage
      title={t("privacy.title")}
      body={t("privacy.body")}
      icon={ShieldCheck}
      back={{ href: "/", label: t("back") }}
    />
  );
}
