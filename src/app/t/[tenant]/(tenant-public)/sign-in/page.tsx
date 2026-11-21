import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { oauthProviders } from "../../../../_lib/auth";
import { AuthCard } from "../../../../_components/auth-card";
import { getTenantShell } from "../../../../_lib/tenancy";
import { Suspense } from "react";
import { SignInForm, SignInFromQuery } from "./sign-in-form";

// Blocks on params by design: see the tenant layout.
export const instant = false;

type Props = { params: Promise<{ tenant: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.signIn");
  return { title: t("title"), robots: { index: false } };
}

export default async function SignInPage({ params }: Props) {
  const shell = await getTenantShell((await params).tenant);
  if (!shell) notFound();
  const t = await getTranslations("auth.signIn");
  return (
    <AuthCard heading={t("heading", { org: shell.name })}>
      <Suspense
        fallback={
          <SignInForm
            org={shell.name}
            ssoOnly={shell.registrationMode === "sso_only"}
            providers={oauthProviders()}
          />
        }
      >
        <SignInFromQuery
          org={shell.name}
          ssoOnly={shell.registrationMode === "sso_only"}
          providers={oauthProviders()}
        />
      </Suspense>
    </AuthCard>
  );
}
