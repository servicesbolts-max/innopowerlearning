import { Award, Smartphone, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Icon, Monogram } from "@/design-system";
import { PrimaryLink } from "../../../_components/shell";
import { getTenantShell } from "../../../_lib/tenancy";

/** Tenant home. The block-built homepage replaces the body in P10c. */
export default async function TenantHome({ params }: { params: Promise<{ tenant: string }> }) {
  const shell = await getTenantShell((await params).tenant);
  if (!shell) notFound();
  const t = await getTranslations("tenant.home");
  const preset = shell.preset === "platform" ? "training_provider" : shell.preset;

  const highlights = [
    { icon: Smartphone, title: t("highlights.learn"), body: t("highlights.learnBody") },
    { icon: Award, title: t("highlights.earn"), body: t("highlights.earnBody") },
    { icon: Users, title: t("highlights.together"), body: t("highlights.togetherBody") },
  ];

  return (
    <div className="flex flex-col">
      <section aria-labelledby="tenant-title" className="hairline-b bg-bg-secondary">
        <div className="mx-auto flex max-w-app flex-col gap-4 px-4 py-12 sm:py-16">
          <Monogram text={shell.logo.text} size={56} />
          <h1 id="tenant-title" className="text-large-title tracking-tight">
            {shell.name}
          </h1>
          {shell.tagline && <p className="max-w-reading text-title3 text-label">{shell.tagline}</p>}
          <p className="max-w-reading text-body text-label-secondary">
            {t(`presetLead.${preset}`)}
          </p>
          <div className="flex flex-wrap gap-3">
            <PrimaryLink href="/courses">{t("browse")}</PrimaryLink>
            <PrimaryLink href="/programs" variant="tinted">
              {t("programs")}
            </PrimaryLink>
          </div>
        </div>
      </section>
      <section aria-labelledby="tenant-highlights" className="mx-auto w-full max-w-app px-4 py-10">
        <h2 id="tenant-highlights" className="mb-4 text-title2">
          {t("highlightsHeading")}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          {highlights.map((h) => (
            <li key={h.title} className="flex flex-col gap-2 rounded-card bg-bg-secondary p-5">
              <Icon icon={h.icon} size={24} className="text-accent-text" />
              <h3 className="text-headline">{h.title}</h3>
              <p className="text-subheadline text-label-secondary">{h.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
