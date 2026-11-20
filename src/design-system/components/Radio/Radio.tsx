"use client";

import {
  Radio as AriaRadio,
  RadioGroup as AriaRadioGroup,
  type RadioGroupProps as AriaRadioGroupProps,
  type RadioProps as AriaRadioProps,
} from "react-aria-components";
import { withClass } from "../../utils/cx";
import {
  FieldDescription,
  FieldErrorText,
  FieldLabel,
  type FieldChromeProps,
} from "../Field/Field";

export interface RadioGroupProps extends Omit<AriaRadioGroupProps, "children">, FieldChromeProps {
  children: React.ReactNode;
}

export function RadioGroup({
  label,
  description,
  errorMessage,
  children,
  className,
  ...props
}: RadioGroupProps) {
  return (
    <AriaRadioGroup {...props} className={withClass(className, "flex flex-col gap-1")}>
      {label && <FieldLabel>{label}</FieldLabel>}
      {description && <FieldDescription>{description}</FieldDescription>}
      <div className="flex flex-col">{children}</div>
      <FieldErrorText>{errorMessage}</FieldErrorText>
    </AriaRadioGroup>
  );
}

export interface RadioProps extends Omit<AriaRadioProps, "children"> {
  children: React.ReactNode;
}

/** Radio button. Selected state is a filled ring with a center dot, not color alone. */
export function Radio({ children, className, ...props }: RadioProps) {
  return (
    <AriaRadio
      {...props}
      className={withClass(
        className,
        "group flex min-h-touch cursor-pointer items-center gap-3 text-body text-label data-disabled:cursor-default data-disabled:opacity-40",
      )}
    >
      <span
        aria-hidden
        className="flex size-5.5 shrink-0 items-center justify-center rounded-full border-2 border-control-border bg-bg transition-colors duration-150 group-data-focus-visible:outline-2 group-data-focus-visible:outline-offset-2 group-data-focus-visible:outline-accent-fill group-data-invalid:border-red-fill group-data-selected:border-transparent group-data-selected:bg-accent-fill"
      >
        <span className="size-2 scale-0 rounded-full bg-on-accent transition-transform duration-150 group-data-selected:scale-100 motion-reduce:transition-none forced-colors:bg-[CanvasText]" />
      </span>
      {children}
    </AriaRadio>
  );
}
