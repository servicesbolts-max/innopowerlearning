"use client";

import { useTranslations } from "next-intl";
import {
  ProgressBar as AriaProgressBar,
  type ProgressBarProps as AriaProgressBarProps,
} from "react-aria-components";
import { cx, withClass } from "../../utils/cx";
import { FieldLabel } from "../Field/Field";

export interface ProgressBarProps extends AriaProgressBarProps {
  label?: React.ReactNode;
  /** Hide the percentage text (it stays available to assistive technology). */
  hideValue?: boolean;
}

/** Linear progress. Omit `value` (or pass `isIndeterminate`) while the amount is unknown. */
export function ProgressBar({ label, hideValue, className, ...props }: ProgressBarProps) {
  const t = useTranslations("ds");
  return (
    <AriaProgressBar
      aria-label={label ? undefined : t("progress")}
      {...props}
      className={withClass(className, "flex w-full flex-col gap-1.5")}
    >
      {({ percentage, valueText, isIndeterminate }) => (
        <>
          {(label || !hideValue) && (
            <div className="flex justify-between gap-2">
              {label && <FieldLabel>{label}</FieldLabel>}
              {!hideValue && !isIndeterminate && (
                <span className="text-subheadline text-label-secondary tabular-nums">
                  {valueText}
                </span>
              )}
            </div>
          )}
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-fill forced-colors:border forced-colors:border-[CanvasText]">
            <div
              className={cx(
                "absolute inset-y-0 start-0 rounded-full bg-accent-fill forced-colors:bg-[Highlight]",
                isIndeterminate
                  ? "w-1/3 motion-safe:animate-shimmer"
                  : "transition-[width] duration-300 motion-reduce:transition-none",
              )}
              style={isIndeterminate ? undefined : { width: `${percentage ?? 0}%` }}
            />
          </div>
        </>
      )}
    </AriaProgressBar>
  );
}

export interface ProgressRingProps extends AriaProgressBarProps {
  size?: 24 | 40 | 64;
  /** Show the percentage in the middle (64 px only). */
  showValue?: boolean;
}

/** Circular progress, for course completion and compact places. */
export function ProgressRing({ size = 40, showValue, className, ...props }: ProgressRingProps) {
  const t = useTranslations("ds");
  const stroke = size >= 64 ? 6 : 4;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <AriaProgressBar
      aria-label={t("progress")}
      {...props}
      className={withClass(className, "relative inline-flex shrink-0 items-center justify-center")}
    >
      {({ percentage = 0, valueText }) => (
        <>
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="-rotate-90"
            aria-hidden
          >
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              strokeWidth={stroke}
              className="stroke-fill"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - percentage / 100)}
              className="stroke-accent-fill transition-[stroke-dashoffset] duration-300 motion-reduce:transition-none forced-colors:stroke-[Highlight]"
            />
          </svg>
          {showValue && size >= 64 && (
            <span className="absolute text-footnote font-semibold tabular-nums">{valueText}</span>
          )}
        </>
      )}
    </AriaProgressBar>
  );
}
