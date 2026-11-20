"use client";

import type { Key } from "react-aria-components";
import { ToggleButton, ToggleButtonGroup } from "react-aria-components";
import { cx } from "../../utils/cx";

export interface Segment {
  id: Key;
  label: React.ReactNode;
}

export interface SegmentedControlProps {
  segments: Segment[];
  selectedKey: Key;
  onSelectionChange: (key: Key) => void;
  /** Required: names the group for assistive technology. */
  "aria-label": string;
  isDisabled?: boolean;
  className?: string;
}

/**
 * Segmented control: a single-choice group (radio semantics). The selected segment is raised on a
 * tonal track and set in semibold, so selection never relies on color alone.
 */
export function SegmentedControl({
  segments,
  selectedKey,
  onSelectionChange,
  className,
  ...props
}: SegmentedControlProps) {
  return (
    <ToggleButtonGroup
      {...props}
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[selectedKey]}
      onSelectionChange={(keys) => {
        const [next] = keys;
        if (next !== undefined) onSelectionChange(next);
      }}
      className={cx(
        "inline-flex w-full gap-0.5 rounded-control bg-fill p-0.5 sm:w-auto",
        className,
      )}
    >
      {segments.map((segment) => (
        <ToggleButton
          key={segment.id}
          id={segment.id}
          className={cx(
            "min-h-8 flex-1 cursor-pointer rounded-control-inner px-3 text-subheadline font-medium text-label focus-ring transition-colors duration-200",
            "data-disabled:opacity-40 data-hovered:bg-fill data-pressed:opacity-70",
            "data-selected:bg-segment-selected data-selected:font-semibold data-selected:shadow-elevated data-selected:data-hovered:bg-segment-selected",
            "forced-colors:data-selected:outline forced-colors:data-selected:outline-[Highlight]",
          )}
        >
          {segment.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
