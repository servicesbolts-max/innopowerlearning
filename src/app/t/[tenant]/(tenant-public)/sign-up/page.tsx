import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Banner } from "@/design-system";
import { AuthCard } from "../../../../_components/auth-card";
import { getTenantShell } from "../../../../_lib/tenancy";
import { Suspense } from "react";
import { SignUpForm, SignUpFromQuery } from "./sign-up-form";

// Blocks on params by design: see the tenant layout.
export const instant = false;

type Props = { params: Promise<{ tenant: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.signUp");
  return { title: t("title"), robots: { index: false } };
}

/** Sign-up follows the tenant's registration mode (Section 5.1); the server enforces it too. */
export default async function SignUpPage({ params }: Props) {
  const shell = await getTenantShell((await params).tenant);
  if (!shell) notFound();
  const t = await getTranslations("auth.signUp");
  const org = shell.name;

  const note =
    shell.registrationMode === "invite_only"
      ? t("inviteOnly", { org })
      : shell.registrationMode === "email_domain"
        ? t("domain", { domains: shell.allowedEmailDomains.join(", ") })
        : shell.registrationMode === "application"
          ? t("application", { org })
          : null;

  return (
    <AuthCard heading={t("heading", { org })}>
      {note && <Banner tone="info" title={note} />}
      {shell.registrationMode !== "sso_only" && (
        <Suspense fallback={<SignUpForm org={org} />}>
          <SignUpFromQuery org={org} />
        </Suspense>
      )}
    </AuthCard>
  );
}
