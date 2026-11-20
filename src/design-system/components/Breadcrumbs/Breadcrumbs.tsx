"use client";

import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Breadcrumb,
  Breadcrumbs as AriaBreadcrumbs,
  Link as AriaLink,
} from "react-aria-components";
import { Icon } from "../Icon/Icon";

export interface Crumb {
  href: string;
  label: string;
}

/** Breadcrumb trail. The last item is the current page (not a link, aria-current="page"). */
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  const t = useTranslations("ds");
  return (
    <nav aria-label={t("breadcrumbs")} className={className}>
      <AriaBreadcrumbs items={items} className="flex flex-wrap items-center gap-1 text-subheadline">
        {(item) => (
          <Breadcrumb id={item.href} className="flex items-center gap-1">
            {({ isCurrent }) => (
              <>
                <AriaLink
                  href={isCurrent ? undefined : item.href}
                  className="rounded-sm text-accent-text focus-ring data-current:font-semibold data-current:text-label data-hovered:underline data-current:data-hovered:no-underline"
                >
                  {item.label}
                </AriaLink>
                {!isCurrent && (
                  <Icon
                    icon={ChevronRight}
                    size={16}
                    className="text-label-secondary rtl:rotate-180"
                  />
                )}
              </>
            )}
          </Breadcrumb>
        )}
      </AriaBreadcrumbs>
    </nav>
  );
}
