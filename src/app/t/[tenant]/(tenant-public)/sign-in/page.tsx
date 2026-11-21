import { LogIn } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PlaceholderPage } from "../../../../_components/placeholder-page";
import { getTenantShell } from "../../../../_lib/tenancy";

type Props = { params: Promise<{ tenant: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("tenant.signIn");
  return { title: t("title") };
}

export default async function SignInPage({ params }: Props) {
  const shell = await getTenantShell((await params).tenant);
  if (!shell) notFound();
  const t = await getTranslations("tenant.signIn");
  const tenant = await getTranslations("tenant");
  return (
    <PlaceholderPage
      title={t("heading", { name: shell.name })}
      emptyTitle={t("emptyTitle")}
      body={t("emptyBody")}
      icon={LogIn}
      back={{ href: "/", label: tenant("back", { name: shell.name }) }}
    />
  );
}
