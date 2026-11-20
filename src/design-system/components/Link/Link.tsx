"use client";

import { Link as AriaLink, type LinkProps as AriaLinkProps } from "react-aria-components";
import { cx, withClass } from "../../utils/cx";

export interface LinkProps extends AriaLinkProps {
  /**
   * `inline` links sit inside running text and are always underlined, so they never rely on color
   * alone (WCAG 1.4.1). `standalone` links stand on their own and underline on hover.
   */
  variant?: "inline" | "standalone";
}

export function Link({ variant = "inline", className, ...props }: LinkProps) {
  return (
    <AriaLink
      {...props}
      className={withClass(
        className,
        cx(
          "cursor-pointer rounded-sm text-accent-text underline-offset-2 focus-ring data-disabled:cursor-default data-disabled:opacity-40",
          variant === "inline" ? "underline" : "data-hovered:underline",
        ),
      )}
    />
  );
}
