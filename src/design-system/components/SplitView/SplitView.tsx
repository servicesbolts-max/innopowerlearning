"use client";

import { ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Button as AriaButton } from "react-aria-components";
import { cx } from "../../utils/cx";
import { Icon } from "../Icon/Icon";

export interface SplitViewProps {
  /** The list (inbox, submissions, learners). */
  list: ReactNode;
  /** The selected item's detail, or an empty state. */
  detail: ReactNode;
  /** On phones only one pane shows: true shows the detail with a Back button. */
  showDetail: boolean;
  onBack: () => void;
  listLabel: string;
  detailLabel: string;
  className?: string;
}

/** List and detail side by side from 768 px; one at a time, with Back, on phones. */
export function SplitView({
  list,
  detail,
  showDetail,
  onBack,
  listLabel,
  detailLabel,
  className,
}: SplitViewProps) {
  const t = useTranslations("ds");
  return (
    <div
      className={cx(
        "flex min-h-96 overflow-hidden rounded-card border border-separator bg-bg-grouped-row",
        className,
      )}
    >
      <section
        aria-label={listLabel}
        className={cx(
          "w-full shrink-0 overflow-y-auto border-e border-separator md:block md:w-80",
          showDetail && "max-md:hidden",
        )}
      >
        {list}
      </section>
      <section
        aria-label={detailLabel}
        className={cx("min-w-0 flex-1 overflow-y-auto", !showDetail && "max-md:hidden")}
      >
        <AriaButton
          onPress={onBack}
          className="m-2 flex min-h-touch cursor-pointer items-center gap-0.5 rounded-control pe-2 text-body text-accent-text focus-ring md:hidden"
        >
          <Icon icon={ChevronLeft} size={24} className="rtl:rotate-180" />
          {t("back")}
        </AriaButton>
        {detail}
      </section>
    </div>
  );
}
