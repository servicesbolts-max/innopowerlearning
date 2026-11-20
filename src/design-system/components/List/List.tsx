"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import { useId, type ReactNode } from "react";
import { Button, Link as AriaLink } from "react-aria-components";
import { cx } from "../../utils/cx";
import { Icon } from "../Icon/Icon";

export interface ListSectionProps {
  /** Section header in small caps style above the rows. */
  header?: ReactNode;
  /** Help text under the rows. */
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Inset grouped list (iOS Settings style). Rows sit on a rounded tonal surface with hairline
 * separators inset past the leading icon.
 */
export function ListSection({ header, footer, children, className }: ListSectionProps) {
  const headerId = useId();
  return (
    <section
      aria-labelledby={header ? headerId : undefined}
      className={cx("flex flex-col gap-1.5", className)}
    >
      {header && (
        <h3 id={headerId} className="px-4 text-footnote font-normal text-label-secondary uppercase">
          {header}
        </h3>
      )}
      <ul className="overflow-hidden rounded-card bg-bg-grouped-row forced-colors:border">
        {children}
      </ul>
      {footer && <p className="px-4 text-footnote text-label-secondary">{footer}</p>}
    </section>
  );
}

export interface ListRowProps {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: LucideIcon;
  /** Tile color behind the leading icon. */
  iconTone?: "accent" | "green" | "red" | "orange" | "indigo" | "purple" | "gray";
  /** Trailing value or control (a Switch, a Badge, a value like "English"). */
  trailing?: ReactNode;
  /** Makes the whole row a link with a disclosure chevron. */
  href?: string;
  /** Makes the whole row a button with a disclosure chevron. */
  onPress?: () => void;
  /** The item open in a detail pane: tinted, bold and aria-current. */
  isSelected?: boolean;
}

const TILE: Record<NonNullable<ListRowProps["iconTone"]>, string> = {
  accent: "bg-accent-fill text-on-accent",
  green: "bg-green-fill text-on-green",
  red: "bg-red-fill text-on-red",
  orange: "bg-orange-fill text-on-orange",
  indigo: "bg-indigo-fill text-on-indigo",
  purple: "bg-purple-fill text-on-purple",
  gray: "bg-fill text-label",
};

export function ListRow({
  title,
  subtitle,
  icon,
  iconTone = "accent",
  trailing,
  href,
  onPress,
  isSelected,
}: ListRowProps) {
  const interactive = Boolean(href || onPress);
  const content = (
    <>
      {icon && (
        <span
          className={cx(
            "flex size-7.5 shrink-0 items-center justify-center rounded-lg",
            TILE[iconTone],
          )}
        >
          <Icon icon={icon} size={20} />
        </span>
      )}
      <span className="flex min-h-touch min-w-0 flex-1 items-center gap-3 hairline-b py-2.5 pe-4 group-last/row:border-b-0">
        <span className="flex min-w-0 flex-1 flex-col text-start">
          {/* Text wraps rather than truncates, so 200% zoom and large text keep every word. */}
          <span className={cx("text-body break-words text-label", isSelected && "font-semibold")}>
            {title}
          </span>
          {subtitle && (
            <span
              className={cx(
                "text-subheadline break-words",
                isSelected ? "text-label" : "text-label-secondary",
              )}
            >
              {subtitle}
            </span>
          )}
        </span>
        {/* Negative margin: a 44 px control (Switch) fits the row without making it taller. */}
        {trailing && (
          <span className="-my-2.5 flex shrink-0 items-center text-body text-label-secondary">
            {trailing}
          </span>
        )}
        {interactive && (
          <Icon
            icon={ChevronRight}
            size={16}
            className="shrink-0 text-label-secondary rtl:rotate-180"
          />
        )}
      </span>
    </>
  );
  const rowClass = cx(
    "flex w-full items-center gap-3 ps-4 text-start",
    interactive &&
      "focus-ring cursor-pointer -outline-offset-2 data-hovered:bg-fill data-pressed:bg-fill",
    isSelected && "bg-accent-tint forced-selected data-hovered:bg-accent-tint",
  );
  // aria-current marks the open item in list-and-detail layouts (SplitView).
  const current = isSelected ? ("true" as const) : undefined;
  return (
    <li className="group/row">
      {href ? (
        <AriaLink href={href} aria-current={current} className={rowClass}>
          {content}
        </AriaLink>
      ) : onPress ? (
        <Button onPress={onPress} aria-current={current} className={rowClass}>
          {content}
        </Button>
      ) : (
        <div className={rowClass}>{content}</div>
      )}
    </li>
  );
}
