import { Library } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PRODUCT_NAME } from "@/lib/config";
import { PlaceholderPage } from "../../../_components/placeholder-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hub.stub");
  return { title: `${t("library.title")} · ${PRODUCT_NAME}` };
}

export default async function LibraryPage() {
  const t = await getTranslations("hub.stub");
  return (
    <PlaceholderPage
      title={t("library.title")}
      body={t("library.body")}
      icon={Library}
      back={{ href: "/", label: t("back") }}
    />
  );
}
