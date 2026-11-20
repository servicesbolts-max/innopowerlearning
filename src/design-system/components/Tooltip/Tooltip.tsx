"use client";

import type { ReactNode } from "react";
import {
  Tooltip as AriaTooltip,
  TooltipTrigger,
  type TooltipProps as AriaTooltipProps,
} from "react-aria-components";
import { withClass } from "../../utils/cx";

export interface TooltipProps extends Omit<AriaTooltipProps, "children"> {
  children: ReactNode;
}

/** Short hint on hover or keyboard focus. Never the only place important information lives. */
export function Tooltip({ children, className, offset = 8, ...props }: TooltipProps) {
  return (
    <AriaTooltip
      offset={offset}
      {...props}
      className={withClass(
        className,
        "max-w-xs rounded-control bg-label px-2.5 py-1.5 text-footnote text-bg shadow-elevated data-entering:animate-fade-in data-exiting:animate-fade-out forced-colors:border",
      )}
    >
      {children}
    </AriaTooltip>
  );
}

export { TooltipTrigger };

/** Convenience wrapper: `<WithTooltip tip="Copy link"><Button …/></WithTooltip>`. */
export function WithTooltip({
  tip,
  children,
  delay = 600,
}: {
  tip: ReactNode;
  children: ReactNode;
  delay?: number;
}) {
  return (
    <TooltipTrigger delay={delay}>
      {children}
      <Tooltip>{tip}</Tooltip>
    </TooltipTrigger>
  );
}
