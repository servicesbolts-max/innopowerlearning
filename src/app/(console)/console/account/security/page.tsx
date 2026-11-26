import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Skeleton, SkeletonText } from "@/design-system";
import { currentTenantId, getTenantSession } from "@/modules/auth";
import { AuthCard } from "../../../../_components/auth-card";
import { SecurityPanel } from "../../../../t/[tenant]/(learn)/account/security/security-panel";

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.security");
  return { title: t("title"), robots: { index: false, follow: false } };
}

/** Reads the session (request data), so it renders inside Suspense. */
async function Security() {
  const t = await getTranslations("lms.console");
  const session = await getTenantSession(await currentTenantId());
  if (!session) redirect("/sign-in?next=/account/security");
  return (
    <SecurityPanel
      org={t("title")}
      email={session.user.email}
      twoFactorEnabled={session.user.twoFactorEnabled}
      required={session.needsSecondFactor}
    />
  );
}

/** Two-step verification for platform staff (required before the Console opens). */
export default async function ConsoleSecurityPage() {
  const t = await getTranslations("auth.security");
  return (
    <AuthCard heading={t("title")}>
      <Suspense
        fallback={
          <div className="flex flex-col gap-4">
            <SkeletonText lines={1} />
            <Skeleton className="h-40 w-full" />
          </div>
        }
      >
        <Security />
      </Suspense>
    </AuthCard>
  );
}
