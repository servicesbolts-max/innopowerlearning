import type { ReactNode } from "react";
import { cx } from "../../utils/cx";
import { Text } from "../Text/Text";

export interface CardProps {
  children: ReactNode;
  /** Section element with an accessible name, or a plain div. */
  as?: "div" | "section" | "article" | "li";
  /** Remove inner padding (for media that bleeds to the edge). */
  flush?: boolean;
  className?: string;
  "aria-labelledby"?: string;
}

/**
 * Card: a tonal surface with a soft hairline. Depth comes from the surface and separator, not a
 * heavy shadow (Section 7.3). Put links or buttons inside; the card itself is not clickable.
 */
export function Card({ children, as: Element = "div", flush, className, ...props }: CardProps) {
  return (
    <Element
      {...props}
      className={cx(
        "overflow-hidden rounded-card border border-separator bg-bg-grouped-row text-label forced-colors:border-[CanvasText]",
        !flush && "p-5",
        className,
      )}
    >
      {children}
    </Element>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  titleId,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  titleId?: string;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <Text as="h3" variant="headline" id={titleId}>
          {title}
        </Text>
        {subtitle && (
          <Text variant="subheadline" tone="secondary">
            {subtitle}
          </Text>
        )}
      </div>
      {action}
    </div>
  );
}
