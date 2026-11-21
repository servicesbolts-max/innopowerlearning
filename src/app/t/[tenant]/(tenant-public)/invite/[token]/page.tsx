import { MailX } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { EmptyState, Skeleton, SkeletonText } from "@/design-system";
import { getOpenInvitation } from "@/modules/auth";
import type { TenantShell } from "@/modules/tenancy";
import { AuthCard } from "../../../../../_components/auth-card";
import { getTenantShell } from "../../../../../_lib/tenancy";
import { continueInvitation } from "./actions";

// Blocks on params by design: see the tenant layout.
export const instant = false;

type Props = { params: Promise<{ tenant: string; token: string }> };

/** Invitation tokens are never known at build time; this placeholder only satisfies the build. */
export function generateStaticParams() {
  return [{ token: "__none" }];
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.invite");
  return { title: t("title"), robots: { index: false, follow: false } };
}

async function Invitation({ shell, token }: { shell: TenantShell; token: string }) {
  const t = await getTranslations("auth");
  const format = await getFormatter();
  const invitation = await getOpenInvitation(shell.id, token);
  if (!invitation) {
    return (
      <EmptyState
        icon={MailX}
        title={t("invite.invalidTitle")}
        description={t("invite.invalidBody", { org: shell.name })}
        headingLevel="h2"
      />
    );
  }
  const role = (await getTranslations("roles"))(invitation.role);
  return (
    <div className="flex flex-col gap-6">
      <p className="text-body">
        {t("invite.body", {
          email: invitation.email,
          role,
          date: format.dateTime(invitation.expiresAt, {
            dateStyle: "long",
            timeZone: shell.timeZone,
          }),
        })}
      </p>
      <form action={continueInvitation} className="flex flex-col gap-3">
        <input type="hidden" name="token" value={token} />
        <button
          type="submit"
          name="next"
          value="sign-up"
          className="inline-flex min-h-touch items-center justify-center rounded-control border border-transparent bg-accent-fill px-4 text-body font-semibold text-on-accent focus-ring"
        >
          {t("invite.continue")}
        </button>
        <button
          type="submit"
          name="next"
          value="sign-in"
          className="inline-flex min-h-touch items-center justify-center rounded-control border border-transparent bg-fill px-4 text-body font-semibold text-label focus-ring"
        >
          {t("invite.signIn")}
        </button>
      </form>
    </div>
  );
}

export default async function InvitePage({ params }: Props) {
  const { tenant, token } = await params;
  const shell = await getTenantShell(tenant);
  if (!shell) notFound();
  const t = await getTranslations("auth.invite");
  return (
    <AuthCard heading={t("heading", { org: shell.name })}>
      <Suspense
        fallback={
          <div className="flex flex-col gap-4">
            <SkeletonText lines={2} />
            <Skeleton className="h-11 w-full" />
          </div>
        }
      >
        <Invitation shell={shell} token={token} />
      </Suspense>
    </AuthCard>
  );
}
