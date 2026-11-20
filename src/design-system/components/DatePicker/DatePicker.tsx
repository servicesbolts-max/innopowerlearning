"use client";

import { CalendarDays } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Button,
  DateInput,
  DatePicker as AriaDatePicker,
  DateSegment,
  Dialog,
  Group,
  TimeField as AriaTimeField,
  type DatePickerProps as AriaDatePickerProps,
  type DateValue,
  type TimeFieldProps as AriaTimeFieldProps,
  type TimeValue,
} from "react-aria-components";
import { withClass } from "../../utils/cx";
import { Calendar } from "../Calendar/Calendar";
import {
  FieldDescription,
  FieldErrorText,
  FieldLabel,
  inputGroup,
  type FieldChromeProps,
} from "../Field/Field";
import { useIsClient } from "../../utils/use-is-client";
import { Icon } from "../Icon/Icon";
import { Skeleton } from "../Skeleton/Skeleton";
import { Popover } from "../Popover/Popover";

const segment =
  "rounded-sm px-0.5 tabular-nums text-label outline-none data-placeholder:text-label-secondary data-focused:bg-accent-fill data-focused:text-on-accent data-[type=literal]:px-0";

function Segments() {
  return (
    <DateInput className="flex flex-1 items-center px-1">
      {(seg) => <DateSegment segment={seg} className={segment} />}
    </DateInput>
  );
}

/**
 * React Aria reads the clock for placeholders and "today", so date and time fields render after
 * hydration. Until then a same-size placeholder keeps the layout stable.
 */
function PendingField({ label }: { label?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5" aria-hidden>
      {label && <span className="text-subheadline font-medium text-label">{label}</span>}
      <Skeleton className="min-h-touch w-full" />
    </div>
  );
}

export type DatePickerProps<T extends DateValue> = AriaDatePickerProps<T> & FieldChromeProps;

/** Date picker: type the date segment by segment, or open the calendar. Locale-aware order. */
export function DatePicker<T extends DateValue>({
  label,
  description,
  errorMessage,
  className,
  ...props
}: DatePickerProps<T>) {
  const t = useTranslations("ds");
  if (!useIsClient()) return <PendingField label={label} />;
  return (
    <AriaDatePicker {...props} className={withClass(className, "group flex flex-col gap-1.5")}>
      {label && <FieldLabel>{label}</FieldLabel>}
      <Group className={inputGroup}>
        <Segments />
        <Button
          aria-label={t("openCalendar")}
          className="flex size-9 cursor-pointer items-center justify-center rounded-control text-accent-text focus-ring data-hovered:bg-fill data-pressed:opacity-70"
        >
          <Icon icon={CalendarDays} size={20} />
        </Button>
      </Group>
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldErrorText>{errorMessage}</FieldErrorText>
      <Popover>
        <Dialog className="p-3 outline-none">
          <Calendar />
        </Dialog>
      </Popover>
    </AriaDatePicker>
  );
}

export type TimeFieldProps<T extends TimeValue> = AriaTimeFieldProps<T> & FieldChromeProps;

/** Time picker: hour, minute and (locale-dependent) day-period segments. */
export function TimeField<T extends TimeValue>({
  label,
  description,
  errorMessage,
  className,
  ...props
}: TimeFieldProps<T>) {
  if (!useIsClient()) return <PendingField label={label} />;
  return (
    <AriaTimeField {...props} className={withClass(className, "flex flex-col gap-1.5")}>
      {label && <FieldLabel>{label}</FieldLabel>}
      <div className={inputGroup}>
        <Segments />
      </div>
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldErrorText>{errorMessage}</FieldErrorText>
    </AriaTimeField>
  );
}
