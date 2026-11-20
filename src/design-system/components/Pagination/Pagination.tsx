"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "react-aria-components";
import { cx } from "../../utils/cx";
import { Icon } from "../Icon/Icon";

export interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/** Page numbers to show: first, last, and a window around the current page, with gaps as null. */
export function pageWindow(page: number, pageCount: number, radius = 1): Array<number | null> {
  const pages = new Set([1, pageCount]);
  for (let p = page - radius; p <= page + radius; p++) if (p >= 1 && p <= pageCount) pages.add(p);
  const sorted = [...pages].sort((a, b) => a - b);
  const out: Array<number | null> = [];
  sorted.forEach((p, i) => {
    const prev = sorted[i - 1];
    if (prev !== undefined && p - prev > 1) out.push(p - prev === 2 ? p - 1 : null);
    out.push(p);
  });
  return out;
}

const item =
  "focus-ring flex min-h-touch min-w-11 cursor-pointer items-center justify-center rounded-control px-2 text-body tabular-nums text-label data-hovered:bg-fill data-pressed:opacity-70 data-disabled:cursor-default data-disabled:opacity-40";

export function Pagination({ page, pageCount, onPageChange, className }: PaginationProps) {
  const t = useTranslations("ds");
  if (pageCount <= 1) return null;
  return (
    <nav aria-label={t("pagination")} className={className}>
      <ul className="flex items-center gap-1">
        <li>
          <Button
            aria-label={t("previousPage")}
            isDisabled={page <= 1}
            onPress={() => onPageChange(page - 1)}
            className={item}
          >
            <Icon icon={ChevronLeft} size={20} className="rtl:rotate-180" />
          </Button>
        </li>
        {pageWindow(page, pageCount).map((p, i) =>
          p === null ? (
            <li key={`gap-${i}`} aria-hidden className="px-1 text-label-secondary max-sm:hidden">
              …
            </li>
          ) : (
            <li key={p} className={cx(p !== page && "max-sm:hidden")}>
              <Button
                aria-label={t("pageNumber", { page: p })}
                aria-current={p === page ? "page" : undefined}
                onPress={() => onPageChange(p)}
                className={cx(
                  item,
                  p === page &&
                    "forced-selected bg-accent-fill font-semibold text-on-accent data-hovered:bg-accent-fill",
                )}
              >
                {p}
              </Button>
            </li>
          ),
        )}
        <li>
          <Button
            aria-label={t("nextPage")}
            isDisabled={page >= pageCount}
            onPress={() => onPageChange(page + 1)}
            className={item}
          >
            <Icon icon={ChevronRight} size={20} className="rtl:rotate-180" />
          </Button>
        </li>
      </ul>
    </nav>
  );
}
