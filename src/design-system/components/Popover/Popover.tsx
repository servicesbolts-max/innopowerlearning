"use client";

import {
  Dialog,
  OverlayArrow,
  Popover as AriaPopover,
  type PopoverProps as AriaPopoverProps,
} from "react-aria-components";
import { cx, withClass } from "../../utils/cx";

/** Elevated surface used by menus, pickers and the date picker. */
export const popoverSurface = cx(
  "rounded-card border border-separator bg-bg-tertiary text-label shadow-elevated",
  "data-entering:animate-pop-in data-exiting:animate-fade-out",
  "forced-colors:border-[CanvasText]",
);

export interface PopoverProps extends Omit<AriaPopoverProps, "children"> {
  children: React.ReactNode;
  /** Show the arrow pointing at the trigger. */
  showArrow?: boolean;
  /** Accessible name when the popover holds free content (not a menu or list). */
  "aria-label"?: string;
}

/** Non-modal popover. For content popovers it wraps children in a dialog for focus management. */
export function Popover({ children, showArrow, className, offset = 8, ...props }: PopoverProps) {
  return (
    <AriaPopover
      offset={showArrow ? 12 : offset}
      {...props}
      className={withClass(className, cx(popoverSurface, "max-w-[90vw] overflow-auto sm:max-w-sm"))}
    >
      {showArrow && (
        <OverlayArrow>
          <svg
            width={12}
            height={12}
            viewBox="0 0 12 12"
            className="fill-bg-tertiary stroke-separator data-[placement=bottom]:rotate-180"
          >
            <path d="M0 0 L6 6 L12 0" />
          </svg>
        </OverlayArrow>
      )}
      {children}
    </AriaPopover>
  );
}

/** A popover whose content is free-form (not a menu or listbox). */
export function PopoverDialog({ children, ...props }: PopoverProps) {
  return (
    <Popover {...props}>
      <Dialog aria-label={props["aria-label"]} className="p-4 outline-none">
        {children}
      </Dialog>
    </Popover>
  );
}
