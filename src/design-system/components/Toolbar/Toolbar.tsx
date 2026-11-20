"use client";

import { Toolbar as AriaToolbar, type ToolbarProps } from "react-aria-components";
import { withClass } from "../../utils/cx";

/**
 * Toolbar: a group of controls reached with one Tab stop; arrow keys move between them.
 * Needs an `aria-label`. Use with plain or gray small Buttons, separated by `ToolbarDivider`.
 */
export function Toolbar({ className, ...props }: ToolbarProps) {
  return (
    <AriaToolbar
      {...props}
      className={withClass(
        className,
        "flex flex-wrap items-center gap-1 rounded-control bg-bg-secondary p-1 data-[orientation=vertical]:flex-col",
      )}
    />
  );
}

export function ToolbarDivider() {
  return <span aria-hidden className="mx-1 h-6 w-px bg-separator" />;
}
