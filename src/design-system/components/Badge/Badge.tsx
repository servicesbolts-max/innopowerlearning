"use client";

import { Check } from "lucide-react";
import { ToggleButton, type ToggleButtonProps } from "react-aria-components";
import { cx, withClass } from "../../utils/cx";
import { Icon } from "../Icon/Icon";

export type BadgeTone =
  "accent" | "gray" | "green" | "red" | "orange" | "yellow" | "indigo" | "purple";

const TONES: Record<BadgeTone, string> = {
  accent: "bg-accent-tint text-accent-text-on-tint",
  gray: "bg-fill text-label",
  green: "bg-green-tint text-green-text-on-tint",
  red: "bg-red-tint text-red-text-on-tint",
  orange: "bg-orange-tint text-orange-text-on-tint",
  yellow: "bg-yellow-tint text-yellow-text-on-tint",
  indigo: "bg-indigo-tint text-indigo-text-on-tint",
  purple: "bg-purple-tint text-purple-text-on-tint",
};

export interface BadgeProps {
  tone?: BadgeTone;
  /** Optional leading icon. Status badges always carry words, so color is never the only signal. */
  icon?: React.ComponentProps<typeof Icon>["icon"];
  children: React.ReactNode;
  className?: string;
}

/** Non-interactive status or count label. */
export function Badge({ tone = "gray", icon, children, className }: BadgeProps) {
  return (
    <span
      className={cx(
        "inline-flex min-h-6 items-center gap-1 rounded-full px-2 text-footnote font-semibold whitespace-nowrap forced-colors:border",
        TONES[tone],
        className,
      )}
    >
      {icon && <Icon icon={icon} size={16} />}
      {children}
    </span>
  );
}

export type ChipProps = Omit<ToggleButtonProps, "children"> & { children: React.ReactNode };

/** Toggleable filter chip. Selected chips show a check mark as well as the accent tint. */
export function Chip({ children, className, ...props }: ChipProps) {
  return (
    <ToggleButton
      {...props}
      className={withClass(
        className,
        cx(
          "touch-target inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full border border-control-border bg-bg px-3 text-subheadline font-medium text-label focus-ring",
          "data-disabled:opacity-40 data-hovered:bg-fill data-pressed:opacity-70",
          "data-selected:border-transparent data-selected:bg-accent-tint data-selected:text-accent-text-on-tint",
        ),
      )}
    >
      {({ isSelected }) => (
        <>
          {isSelected && <Icon icon={Check} size={16} />}
          {children}
        </>
      )}
    </ToggleButton>
  );
}
