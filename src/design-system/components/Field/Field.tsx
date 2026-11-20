"use client";

import type { ReactNode } from "react";
import {
  FieldError as AriaFieldError,
  Label as AriaLabel,
  Text as AriaText,
  type FieldErrorProps,
  type LabelProps,
} from "react-aria-components";
import { cx } from "../../utils/cx";

/** Shared label, help text and error message for every form control. */
export function FieldLabel({ className, ...props }: LabelProps) {
  return (
    <AriaLabel {...props} className={cx("text-subheadline font-medium text-label", className)} />
  );
}

export function FieldDescription({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <AriaText slot="description" className={cx("text-footnote text-label-secondary", className)}>
      {children}
    </AriaText>
  );
}

/** Errors say what happened and how to fix it (Section 7.6); the icon-free text never relies on color. */
export function FieldErrorText({ className, ...props }: FieldErrorProps) {
  return (
    <AriaFieldError
      {...props}
      className={cx(
        "text-footnote font-medium text-red-text",
        typeof className === "string" ? className : undefined,
      )}
    />
  );
}

/** Classes for a text-like input box. 44 px tall; the border passes 3:1 against every surface. */
export const inputBox = cx(
  "w-full min-h-touch rounded-control border border-control-border bg-bg px-3 text-body text-label",
  "placeholder:text-label-secondary outline-none",
  // Text entry shows the ring on any focus, not only keyboard focus.
  "data-focused:border-accent-fill data-focused:outline-2 data-focused:outline-offset-2 data-focused:outline-accent-fill",
  "data-invalid:border-red-fill data-disabled:opacity-40",
);

/** Wrapper for a group that holds an input plus buttons (search, stepper, date picker). */
export const inputGroup = cx(
  "flex w-full min-h-touch items-center gap-1 rounded-control border border-control-border bg-bg px-2 text-body text-label",
  "data-focus-within:border-accent-fill data-focus-within:outline-2 data-focus-within:outline-offset-2 data-focus-within:outline-accent-fill",
  "data-invalid:border-red-fill data-disabled:opacity-40",
);

export interface FieldChromeProps {
  label?: ReactNode;
  description?: ReactNode;
  errorMessage?: ReactNode;
}
