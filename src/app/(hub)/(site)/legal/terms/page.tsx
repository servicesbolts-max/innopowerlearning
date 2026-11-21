import { FileText } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PRODUCT_NAME } from "@/lib/config";
import { PlaceholderPage } from "../../../../_components/placeholder-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hub.stub");
  return { title: `${t("terms.title")} · ${PRODUCT_NAME}` };
}

export default async function TermsPage() {
  const t = await getTranslations("hub.stub");
  return (
    <PlaceholderPage
      title={t("terms.title")}
      body={t("terms.body")}
      icon={FileText}
      back={{ href: "/", label: t("back") }}
    />
  );
}
