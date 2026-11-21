import { cx } from "../../utils/cx";

export type MonogramSize = 32 | 40 | 56;

const SIZES: Record<MonogramSize, string> = {
  32: "size-8 text-footnote",
  40: "size-10 text-subheadline",
  56: "size-14 text-title3",
};

export interface MonogramProps {
  /** One to three letters, from the tenant's typed logo data (never markup). */
  text: string;
  size?: MonogramSize;
  /**
   * Accessible name. Omit when the organization's name is printed next to the mark (the usual
   * case): the monogram is then decorative and hidden from assistive technology.
   */
  label?: string;
  className?: string;
}

/**
 * An organization's placeholder logo: initials on the tenant's accent fill, a rounded square so it
 * never reads as a person's avatar. The engine guarantees on-accent text reaches 4.5:1.
 */
export function Monogram({ text, size = 40, label, className }: MonogramProps) {
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true as const };
  return (
    <span
      {...a11y}
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-control bg-accent-fill font-semibold tracking-tight text-on-accent select-none",
        SIZES[size],
        className,
      )}
    >
      <span aria-hidden>{text.slice(0, 3)}</span>
    </span>
  );
}
