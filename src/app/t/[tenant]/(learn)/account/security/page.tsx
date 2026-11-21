import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Skeleton, SkeletonText } from "@/design-system";
import { getTenantSession } from "@/modules/auth";
import type { TenantShell } from "@/modules/tenancy";
import { AuthCard } from "../../../../../_components/auth-card";
import { getTenantShell } from "../../../../../_lib/tenancy";
import { SecurityPanel } from "./security-panel";

// Blocks on params by design: see the tenant layout.
export const instant = false;

type Props = { params: Promise<{ tenant: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.security");
  return { title: t("title"), robots: { index: false, follow: false } };
}

/** Reads the session (request data), so it renders inside Suspense. */
async function Security({ shell }: { shell: TenantShell }) {
  const session = await getTenantSession(shell.id);
  if (!session) redirect("/sign-in?next=/account/security");
  return (
    <SecurityPanel
      org={shell.name}
      email={session.user.email}
      twoFactorEnabled={session.user.twoFactorEnabled}
      required={session.needsSecondFactor}
    />
  );
}

export default async function SecurityPage({ params }: Props) {
  const shell = await getTenantShell((await params).tenant);
  if (!shell) notFound();
  const t = await getTranslations("auth.security");
  return (
    <AuthCard heading={t("title")}>
      <Suspense
        fallback={
          <div className="flex flex-col gap-4">
            <SkeletonText lines={1} />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        }
      >
        <Security shell={shell} />
      </Suspense>
    </AuthCard>
  );
}
