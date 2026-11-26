import { BadgeCheck, SearchX } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { EmptyState, Icon, Monogram } from "@/design-system";
import { getCertificateByCode } from "@/modules/credentials";
import { tenantUrl } from "../../../../../_lib/tenancy";
import { tenantPage } from "../../../../../_lib/guard";
import { PrintButton } from "./print-button";

// Blocks on params by design: see the tenant layout.
export const instant = false;

type Props = { params: Promise<{ tenant: string; code: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("lms.certificate");
  // Certificates name a person: never index them.
  return { title: t("title"), robots: { index: false, follow: false } };
}

/**
 * Public certificate and verification page, on the issuing tenant's host only: a code from
 * another tenant is not found here. Shows what the certificate itself shows, nothing more.
 */
export default async function VerifyPage({ params }: Props) {
  const { tenant, code } = await params;
  const shell = await tenantPage(tenant);
  const t = await getTranslations("lms.certificate");
  const format = await getFormatter();
  const cert = await getCertificateByCode(shell.id, code);

  if (!cert) {
    return (
      <div className="mx-auto flex max-w-reading flex-col gap-2 px-4 py-12">
        <h1 className="text-large-title tracking-tight">{t("title")}</h1>
        <EmptyState
          icon={SearchX}
          title={t("notFound")}
          description={t("notFoundBody")}
          headingLevel="h2"
        />
      </div>
    );
  }

  const issued = format.dateTime(cert.issuedAt, { dateStyle: "long" });
  return (
    <div className="mx-auto flex w-full max-w-app flex-col gap-6 px-4 py-10">
      <p
        role="status"
        className="flex items-center gap-2 self-start rounded-control bg-green-tint px-3 py-2 text-subheadline font-semibold text-green-text-on-tint print:hidden"
      >
        <Icon icon={BadgeCheck} size={20} />
        {t("verified")}: {t("verifiedBody", { org: shell.name })}
      </p>
      <article
        aria-labelledby="certificate-heading"
        className="flex flex-col items-center gap-5 rounded-card border-2 border-accent-fill bg-bg px-6 py-12 text-center sm:px-12"
      >
        <Monogram text={shell.logo.text} size={56} />
        <p className="text-subheadline text-label-secondary uppercase">{shell.name}</p>
        <h1 id="certificate-heading" className="text-large-title tracking-tight">
          {t("heading")}
        </h1>
        <p className="text-body text-label-secondary">{t("presented")}</p>
        <p className="text-title1 font-semibold">{cert.recipientName}</p>
        <p className="text-body text-label-secondary">{t("completed")}</p>
        <p className="text-title2">{cert.courseTitle}</p>
        <p className="text-subheadline text-label-secondary">
          {t("issued", { date: issued, org: shell.name })}
        </p>
        <p className="font-mono text-footnote text-label-secondary">
          {t("code", { code: cert.code })}
        </p>
        <p className="text-footnote break-all text-label-secondary">
          {t("verifyLink")}: {tenantUrl(shell.slug, `/verify/${cert.code}`)}
        </p>
      </article>
      <PrintButton label={t("print")} />
    </div>
  );
}
