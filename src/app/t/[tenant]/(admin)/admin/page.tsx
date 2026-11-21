import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/design-system";
import { getTenantSession } from "@/modules/auth";
import { can } from "@/modules/rbac";
import type { TenantShell } from "@/modules/tenancy";
import { getTenantShell } from "../../../../_lib/tenancy";

// Blocks on params by design: see the tenant layout.
export const instant = false;

type Props = { params: Promise<{ tenant: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.admin");
  return { title: t("title"), robots: { index: false, follow: false } };
}

/**
 * Partner Admin entry (P10a fills it). Guarded on the server: signed in on this tenant,
 * a second factor for admin roles (Section 10), and can(actor, "tenant.settings.write").
 */
async function Admin({ shell }: { shell: TenantShell }) {
  const t = await getTranslations("auth.admin");
  return (
    <div className="mx-auto flex max-w-reading flex-col gap-2 px-4 py-12">
      <h1 className="text-large-title tracking-tight">{t("heading", { org: shell.name })}</h1>
      <EmptyState icon={ShieldCheck} title={t("title")} description={t("body")} headingLevel="h2" />
    </div>
  );
}

export default async function AdminPage({ params }: Props) {
  const shell = await getTenantShell((await params).tenant);
  if (!shell) notFound();
  // Decided before anything renders, so refusals are real redirects and 404s (not a streamed 200).
  const session = await getTenantSession(shell.id);
  if (!session) redirect("/sign-in?next=/admin");
  if (session.needsSecondFactor) redirect("/account/security?required=1");
  if (!can(session.actor, "tenant.settings.write")) notFound();
  return <Admin shell={shell} />;
}
