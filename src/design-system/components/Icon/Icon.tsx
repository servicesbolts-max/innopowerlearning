import type { LucideIcon } from "lucide-react";
import { cx } from "../../utils/cx";

export type IconSize = 16 | 20 | 24;

export interface IconProps {
  icon: LucideIcon;
  size?: IconSize;
  /** Accessible name. Without it the icon is decorative and hidden from assistive technology. */
  label?: string;
  className?: string;
}

/** Lucide icon at the system stroke (1.75) and sizes (16, 20, 24). */
export function Icon({ icon: Glyph, size = 20, label, className }: IconProps) {
  return (
    <Glyph
      width={size}
      height={size}
      strokeWidth={1.75}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      focusable={false}
      className={cx("shrink-0", className)}
    />
  );
}
