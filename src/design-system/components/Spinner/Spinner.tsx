import { useTranslations } from "next-intl";
import { cx } from "../../utils/cx";

export interface SpinnerProps {
  size?: 16 | 20 | 24;
  /** Accessible name; defaults to "Loading". Pass `decorative` when a parent already announces it. */
  label?: string;
  decorative?: boolean;
  className?: string;
}

/** Activity indicator. Under reduced motion it stops spinning and stays visible. */
export function Spinner({ size = 20, label, decorative, className }: SpinnerProps) {
  const t = useTranslations("ds");
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : (label ?? t("loading"))}
      className={cx("shrink-0 motion-safe:animate-spin-slow", className)}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="2.5"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
