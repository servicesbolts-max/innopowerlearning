"use client";

import { useTranslations } from "next-intl";
import { cx } from "../../utils/cx";

export interface SkeletonProps {
  className?: string;
  /** Round placeholder for avatars. */
  circle?: boolean;
}

/** A placeholder block. Decorative: wrap a group in `SkeletonGroup`, which announces loading. */
export function Skeleton({ className, circle }: SkeletonProps) {
  return (
    <span
      aria-hidden
      className={cx(
        "block bg-fill motion-safe:animate-shimmer forced-colors:border",
        circle ? "rounded-full" : "rounded-control",
        className,
      )}
    />
  );
}

/** Lines of text-shaped placeholders; the last line is shorter, like real paragraphs. */
export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <span className="flex flex-col gap-2" aria-hidden>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={cx("h-4", i === lines - 1 && lines > 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </span>
  );
}

/** Live region that announces "Loading" once and hides the placeholders from screen readers. */
export function SkeletonGroup({
  children,
  label,
  className,
}: {
  children: React.ReactNode;
  label?: string;
  className?: string;
}) {
  const t = useTranslations("ds");
  return (
    <div role="status" aria-busy="true" aria-label={label ?? t("loading")} className={className}>
      {children}
    </div>
  );
}
