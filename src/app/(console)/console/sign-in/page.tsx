import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthCard } from "../../../_components/auth-card";
import { oauthProviders } from "../../../_lib/auth";
import {
  SignInForm,
  SignInFromQuery,
} from "../../../t/[tenant]/(tenant-public)/sign-in/sign-in-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.signIn");
  return { title: t("title"), robots: { index: false } };
}

/** Console sign-in: platform staff only (the admission policy refuses everyone else). */
export default async function ConsoleSignInPage() {
  const t = await getTranslations("lms.console");
  const org = t("title");
  return (
    <AuthCard heading={t("signIn")}>
      <p className="text-subheadline text-label-secondary">{t("signInBody")}</p>
      <Suspense fallback={<SignInForm org={org} ssoOnly={false} providers={oauthProviders()} />}>
        <SignInFromQuery org={org} ssoOnly={false} providers={oauthProviders()} />
      </Suspense>
    </AuthCard>
  );
}
