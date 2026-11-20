"use client";

import {
  Input,
  TextArea as AriaTextArea,
  TextField as AriaTextField,
  type TextFieldProps as AriaTextFieldProps,
} from "react-aria-components";
import { cx, withClass } from "../../utils/cx";
import {
  FieldDescription,
  FieldErrorText,
  FieldLabel,
  inputBox,
  type FieldChromeProps,
} from "../Field/Field";

export interface TextFieldProps extends AriaTextFieldProps, FieldChromeProps {
  placeholder?: string;
}

/** Single-line text field with label, help text and validation message. */
export function TextField({
  label,
  description,
  errorMessage,
  placeholder,
  className,
  ...props
}: TextFieldProps) {
  return (
    <AriaTextField {...props} className={withClass(className, "flex flex-col gap-1.5")}>
      {label && <FieldLabel>{label}</FieldLabel>}
      <Input placeholder={placeholder} className={inputBox} />
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldErrorText>{errorMessage}</FieldErrorText>
    </AriaTextField>
  );
}

export interface TextAreaProps extends AriaTextFieldProps, FieldChromeProps {
  placeholder?: string;
  rows?: number;
}

/** Multi-line text field. Grows vertically by user resize only. */
export function TextArea({
  label,
  description,
  errorMessage,
  placeholder,
  rows = 4,
  className,
  ...props
}: TextAreaProps) {
  return (
    <AriaTextField {...props} className={withClass(className, "flex flex-col gap-1.5")}>
      {label && <FieldLabel>{label}</FieldLabel>}
      <AriaTextArea
        placeholder={placeholder}
        rows={rows}
        className={cx(inputBox, "resize-y py-2.5")}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldErrorText>{errorMessage}</FieldErrorText>
    </AriaTextField>
  );
}
