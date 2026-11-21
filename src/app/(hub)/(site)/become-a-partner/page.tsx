import { Handshake } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PRODUCT_NAME } from "@/lib/config";
import { PlaceholderPage } from "../../../_components/placeholder-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hub.stub");
  return { title: `${t("becomePartner.title")} · ${PRODUCT_NAME}` };
}

export default async function BecomePartnerPage() {
  const t = await getTranslations("hub.stub");
  return (
    <PlaceholderPage
      title={t("becomePartner.title")}
      body={t("becomePartner.body")}
      icon={Handshake}
      back={{ href: "/", label: t("back") }}
    />
  );
}
