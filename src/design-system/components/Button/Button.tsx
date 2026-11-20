"use client";

import { Button as AriaButton, type ButtonProps as AriaButtonProps } from "react-aria-components";
import { cx, withClass } from "../../utils/cx";
import { Spinner } from "../Spinner/Spinner";

export type ButtonVariant = "filled" | "tinted" | "gray" | "plain";
export type ButtonSize = "small" | "medium" | "large";

export interface ButtonProps extends AriaButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Destructive actions use the system red. */
  destructive?: boolean;
  /** Pill shape for marketing calls to action. */
  pill?: boolean;
  /** Fill the container width. */
  fullWidth?: boolean;
}

const BASE =
  "focus-ring relative inline-flex select-none items-center justify-center gap-2 border border-transparent font-semibold transition-[opacity,background-color] duration-200 data-disabled:opacity-40 data-pressed:opacity-70 data-pending:cursor-wait";

const SIZES: Record<ButtonSize, string> = {
  // 32 px: dense admin controls only (Section 7.3).
  small: "min-h-touch-dense px-3 text-subheadline",
  medium: "min-h-touch px-4 text-body",
  large: "min-h-12.5 px-5 text-headline",
};

function colors(variant: ButtonVariant, destructive: boolean): string {
  if (destructive) {
    switch (variant) {
      case "filled":
        return "bg-red-fill text-on-red";
      case "plain":
        return "bg-transparent text-red-text data-hovered:bg-fill";
      default:
        return "bg-red-tint text-red-text-on-tint";
    }
  }
  switch (variant) {
    case "filled":
      return "bg-accent-fill text-on-accent";
    case "tinted":
      return "bg-accent-tint text-accent-text-on-tint";
    case "gray":
      return "bg-fill text-label";
    case "plain":
      return "bg-transparent text-accent-text data-hovered:bg-fill";
  }
}

/**
 * Button (Section 7.4): filled, tinted, gray and plain; small, medium and large; destructive;
 * loading via `isPending`, which keeps the width and announces progress.
 */
export function Button({
  variant = "filled",
  size = "medium",
  destructive = false,
  pill = false,
  fullWidth = false,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <AriaButton
      {...props}
      className={withClass(
        className,
        cx(
          BASE,
          SIZES[size],
          colors(variant, destructive),
          pill ? "rounded-full" : "rounded-control",
          // Full-width buttons (dialogs, sheets) wrap at 200% zoom; inline ones keep one line.
          fullWidth ? "w-full py-2 text-center whitespace-normal" : "whitespace-nowrap",
        ),
      )}
    >
      {(renderProps) => (
        <>
          <span
            className={cx("inline-flex items-center gap-2", renderProps.isPending && "invisible")}
          >
            {typeof children === "function" ? children(renderProps) : children}
          </span>
          {renderProps.isPending && <Spinner size={20} className="absolute" />}
        </>
      )}
    </AriaButton>
  );
}
