"use client";

import { Check, Minus } from "lucide-react";
import {
  Checkbox as AriaCheckbox,
  CheckboxGroup as AriaCheckboxGroup,
  type CheckboxGroupProps as AriaCheckboxGroupProps,
  type CheckboxProps as AriaCheckboxProps,
} from "react-aria-components";
import { cx, withClass } from "../../utils/cx";
import {
  FieldDescription,
  FieldErrorText,
  FieldLabel,
  type FieldChromeProps,
} from "../Field/Field";
import { Icon } from "../Icon/Icon";

export interface CheckboxProps extends Omit<AriaCheckboxProps, "children"> {
  children?: React.ReactNode;
}

/** Shared box styling: 3:1 border when off, accent fill with a check (not just color) when on. */
export const checkBox = cx(
  "flex size-5.5 shrink-0 items-center justify-center rounded-md border-2 border-control-border bg-bg text-on-accent transition-colors duration-150",
  "group-data-selected:border-transparent group-data-selected:bg-accent-fill group-data-indeterminate:border-transparent group-data-indeterminate:bg-accent-fill",
  "group-data-invalid:border-red-fill group-data-focus-visible:outline-2 group-data-focus-visible:outline-offset-2 group-data-focus-visible:outline-accent-fill",
);

export function Checkbox({ children, className, ...props }: CheckboxProps) {
  return (
    <AriaCheckbox
      {...props}
      className={withClass(
        className,
        "group flex min-h-touch cursor-pointer items-center gap-3 text-body text-label data-disabled:cursor-default data-disabled:opacity-40",
      )}
    >
      {({ isSelected, isIndeterminate }) => (
        <>
          <span aria-hidden className={checkBox}>
            {isIndeterminate ? (
              <Icon icon={Minus} size={16} />
            ) : isSelected ? (
              <Icon icon={Check} size={16} />
            ) : null}
          </span>
          {children}
        </>
      )}
    </AriaCheckbox>
  );
}

export interface CheckboxGroupProps
  extends Omit<AriaCheckboxGroupProps, "children">, FieldChromeProps {
  children: React.ReactNode;
}

export function CheckboxGroup({
  label,
  description,
  errorMessage,
  children,
  className,
  ...props
}: CheckboxGroupProps) {
  return (
    <AriaCheckboxGroup {...props} className={withClass(className, "flex flex-col gap-1")}>
      {label && <FieldLabel>{label}</FieldLabel>}
      {description && <FieldDescription>{description}</FieldDescription>}
      <div className="flex flex-col">{children}</div>
      <FieldErrorText>{errorMessage}</FieldErrorText>
    </AriaCheckboxGroup>
  );
}
