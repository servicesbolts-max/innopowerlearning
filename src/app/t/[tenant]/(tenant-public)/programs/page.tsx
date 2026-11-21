import { Layers } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PlaceholderPage } from "../../../../_components/placeholder-page";
import { getTenantShell } from "../../../../_lib/tenancy";

type Props = { params: Promise<{ tenant: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const shell = await getTenantShell((await params).tenant);
  const t = await getTranslations("tenant.programs");
  return { title: t("title", { name: shell?.name ?? "" }) };
}

export default async function ProgramsPage({ params }: Props) {
  const shell = await getTenantShell((await params).tenant);
  if (!shell) notFound();
  const t = await getTranslations("tenant.programs");
  return (
    <PlaceholderPage
      title={t("title", { name: shell.name })}
      emptyTitle={t("emptyTitle")}
      body={t("emptyBody")}
      icon={Layers}
      back={{ href: "/", label: shell.name }}
    />
  );
}
