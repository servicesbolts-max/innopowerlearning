import { ArrowUpRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState, Icon } from "@/design-system";
import type { PublicPartner } from "@/modules/tenancy";
import { tenantUrl } from "../../_lib/tenancy";

/**
 * The Hub's partner directory as an inset grouped list. Partners are shown in neutral Hub
 * colors (each partner's own branding lives on its host).
 */
export async function PartnerList({
  partners,
  path = "/",
  linkLabel,
}: {
  partners: PublicPartner[];
  /** Page on the partner's host to link to. */
  path?: string;
  linkLabel: "visit" | "signIn";
}) {
  const t = await getTranslations("hub");
  if (partners.length === 0) {
    return (
      <EmptyState
        title={t("partners.emptyTitle")}
        description={t("partners.emptyBody")}
        headingLevel="h2"
      />
    );
  }
  return (
    <ul className="overflow-hidden rounded-card bg-bg-grouped-row">
      {partners.map((p, i) => (
        <li key={p.slug} className={i > 0 ? "hairline-t" : undefined}>
          <a
            href={tenantUrl(p.slug, path)}
            className="flex min-h-touch items-center justify-between gap-4 px-4 py-3 focus-ring"
          >
            <span className="flex min-w-0 flex-col">
              <span className="text-body font-semibold text-label">
                {linkLabel === "visit" ? p.name : t("signIn.go", { name: p.name })}
              </span>
              <span className="text-subheadline text-label-secondary">
                {t(`presets.${p.preset}`)}
              </span>
            </span>
            <Icon
              icon={ArrowUpRight}
              size={20}
              className="shrink-0 text-label-secondary rtl:-scale-x-100"
            />
          </a>
        </li>
      ))}
    </ul>
  );
}
