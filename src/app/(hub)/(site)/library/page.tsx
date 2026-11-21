import { Library } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PlaceholderPage } from "../../../_components/placeholder-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("hub.stub");
  return { title: t("library.title") };
}

export default async function LibraryPage() {
  const t = await getTranslations("hub.stub");
  return (
    <PlaceholderPage
      title={t("library.title")}
      emptyTitle={t("comingSoon")}
      body={t("library.body")}
      icon={Library}
      back={{ href: "/", label: t("back") }}
    />
  );
}
