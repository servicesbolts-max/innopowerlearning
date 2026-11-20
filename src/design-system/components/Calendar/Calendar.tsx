"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Button,
  Calendar as AriaCalendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  Heading,
  type CalendarProps as AriaCalendarProps,
  type DateValue,
} from "react-aria-components";
import { cx, withClass } from "../../utils/cx";
import { useIsClient } from "../../utils/use-is-client";
import { Icon } from "../Icon/Icon";
import { Skeleton } from "../Skeleton/Skeleton";

export type CalendarProps<T extends DateValue> = AriaCalendarProps<T>;

const navButton =
  "focus-ring flex size-11 cursor-pointer items-center justify-center rounded-full text-accent-text data-hovered:bg-fill data-pressed:opacity-70 data-disabled:opacity-40";

/** Month calendar. Arrow keys move by day, Page Up/Down by month. Today is ringed, not only tinted. */
export function Calendar<T extends DateValue>({ className, ...props }: CalendarProps<T>) {
  const t = useTranslations("ds");
  // React Aria marks "today" from the clock, so the calendar renders after hydration.
  if (!useIsClient()) return <Skeleton className="h-80 w-72" />;
  return (
    <AriaCalendar {...props} className={withClass(className, "w-fit text-label")}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <Heading className="ps-2 text-headline" />
        <div className="flex">
          <Button slot="previous" aria-label={t("previousMonth")} className={navButton}>
            <Icon icon={ChevronLeft} size={20} className="rtl:rotate-180" />
          </Button>
          <Button slot="next" aria-label={t("nextMonth")} className={navButton}>
            <Icon icon={ChevronRight} size={20} className="rtl:rotate-180" />
          </Button>
        </div>
      </div>
      <CalendarGrid className="border-separate border-spacing-0.5">
        <CalendarGridHeader>
          {(day) => (
            <CalendarHeaderCell className="pb-1 text-caption1 font-semibold text-label-secondary">
              {day}
            </CalendarHeaderCell>
          )}
        </CalendarGridHeader>
        <CalendarGridBody>
          {(date) => (
            <CalendarCell
              date={date}
              className={cx(
                "flex size-11 cursor-pointer items-center justify-center rounded-full text-body tabular-nums focus-ring",
                "data-disabled:text-label-tertiary data-hovered:bg-fill data-outside-month:hidden data-unavailable:text-label-tertiary data-unavailable:line-through",
                "data-today:font-semibold data-today:text-accent-text data-today:ring-1 data-today:ring-accent-text",
                "data-selected:forced-selected data-selected:bg-accent-fill data-selected:font-semibold data-selected:text-on-accent data-selected:data-hovered:bg-accent-fill",
              )}
            />
          )}
        </CalendarGridBody>
      </CalendarGrid>
    </AriaCalendar>
  );
}
