import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "../../utils/cx";
import { Icon } from "../Icon/Icon";
import { Text } from "../Text/Text";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  /** Exactly one clear action (Section 7.6), usually a Button or Link. */
  action?: ReactNode;
  /** Heading level for the title so it fits the page outline. */
  headingLevel?: "h2" | "h3" | "h4";
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  headingLevel = "h2",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cx(
        "mx-auto flex max-w-sm flex-col items-center gap-3 px-6 py-12 text-center",
        className,
      )}
    >
      {icon && (
        <span className="mb-1 flex size-14 items-center justify-center rounded-full bg-fill text-label-secondary">
          <Icon icon={icon} size={24} />
        </span>
      )}
      <Text as={headingLevel} variant="title3">
        {title}
      </Text>
      {description && (
        <Text variant="subheadline" tone="secondary">
          {description}
        </Text>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
