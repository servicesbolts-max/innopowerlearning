"use client";

import {
  Slider as AriaSlider,
  SliderOutput,
  SliderThumb,
  SliderTrack,
  type SliderProps as AriaSliderProps,
} from "react-aria-components";
import { withClass } from "../../utils/cx";
import { FieldLabel } from "../Field/Field";

export interface SliderProps<T extends number | number[]> extends AriaSliderProps<T> {
  label?: React.ReactNode;
  /** Hide the numeric output next to the label. */
  hideValue?: boolean;
}

/** Slider with an iOS-style white thumb. Works with arrows, Page Up/Down, Home and End. */
export function Slider<T extends number | number[]>({
  label,
  hideValue,
  className,
  ...props
}: SliderProps<T>) {
  return (
    <AriaSlider
      {...props}
      className={withClass(className, "flex w-full flex-col gap-2 data-disabled:opacity-40")}
    >
      {(label || !hideValue) && (
        <div className="flex items-center justify-between">
          {label && <FieldLabel>{label}</FieldLabel>}
          {!hideValue && (
            <SliderOutput className="text-subheadline text-label-secondary tabular-nums" />
          )}
        </div>
      )}
      <SliderTrack className="relative h-touch w-full">
        {({ state }) => (
          <>
            <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-control-border" />
            <div
              className="absolute start-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-accent-fill forced-colors:bg-[Highlight]"
              style={
                state.values.length > 1
                  ? {
                      insetInlineStart: `${state.getThumbPercent(0) * 100}%`,
                      width: `${(state.getThumbPercent(1) - state.getThumbPercent(0)) * 100}%`,
                    }
                  : { width: `${state.getThumbPercent(0) * 100}%` }
              }
            />
            {state.values.map((_, i) => (
              <SliderThumb
                key={i}
                index={i}
                className="top-1/2 size-7 rounded-full border border-separator bg-thumb shadow-elevated data-dragging:scale-110 data-focus-visible:outline-2 data-focus-visible:outline-offset-2 data-focus-visible:outline-accent-fill motion-safe:transition-transform"
              />
            ))}
          </>
        )}
      </SliderTrack>
    </AriaSlider>
  );
}
