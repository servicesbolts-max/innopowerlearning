"use client";

import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, Group, Input, NumberField, type NumberFieldProps } from "react-aria-components";
import { withClass } from "../../utils/cx";
import {
  FieldDescription,
  FieldErrorText,
  FieldLabel,
  inputGroup,
  type FieldChromeProps,
} from "../Field/Field";
import { Icon } from "../Icon/Icon";

export type StepperProps = NumberFieldProps & FieldChromeProps;

const stepButton =
  "touch-target focus-ring flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-control text-accent-text data-hovered:bg-fill data-pressed:opacity-70 data-disabled:cursor-default data-disabled:opacity-40";

/** Number stepper (spin button): type a value or use the buttons and arrow keys. */
export function Stepper({ label, description, errorMessage, className, ...props }: StepperProps) {
  const t = useTranslations("ds");
  return (
    <NumberField {...props} className={withClass(className, "flex flex-col gap-1.5")}>
      {label && <FieldLabel>{label}</FieldLabel>}
      <Group className={`${inputGroup} w-auto max-w-48`}>
        <Button slot="decrement" aria-label={t("decrease")} className={stepButton}>
          <Icon icon={Minus} size={20} />
        </Button>
        <Input className="w-full min-w-0 bg-transparent text-center tabular-nums outline-none" />
        <Button slot="increment" aria-label={t("increase")} className={stepButton}>
          <Icon icon={Plus} size={20} />
        </Button>
      </Group>
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldErrorText>{errorMessage}</FieldErrorText>
    </NumberField>
  );
}
