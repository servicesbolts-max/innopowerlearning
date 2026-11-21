import { Layers } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PlaceholderPage } from "../../../../_components/placeholder-page";
import { getTenantShell } from "../../../../_lib/tenancy";

// Blocks on params by design: see the tenant layout.
export const instant = false;

type Props = { params: Promise<{ tenant: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("tenant.programs");
  return { title: t("title") };
}

export default async function ProgramsPage({ params }: Props) {
  const shell = await getTenantShell((await params).tenant);
  if (!shell) notFound();
  const t = await getTranslations("tenant.programs");
  const tenant = await getTranslations("tenant");
  return (
    <PlaceholderPage
      title={t("title")}
      emptyTitle={t("emptyTitle")}
      body={t("emptyBody")}
      icon={Layers}
      back={{ href: "/", label: tenant("back", { name: shell.name }) }}
    />
  );
}
