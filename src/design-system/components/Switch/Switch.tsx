"use client";

import { Switch as AriaSwitch, type SwitchProps as AriaSwitchProps } from "react-aria-components";
import { withClass } from "../../utils/cx";

export interface SwitchProps extends Omit<AriaSwitchProps, "children"> {
  children?: React.ReactNode;
}

/**
 * Switch with iOS proportions (51 x 31 track, 27 px thumb). The off track keeps a 3:1 border so
 * the control stays visible; state is shown by thumb position as well as color.
 */
export function Switch({ children, className, ...props }: SwitchProps) {
  return (
    <AriaSwitch
      {...props}
      className={withClass(
        className,
        "group inline-flex min-h-touch cursor-pointer items-center gap-3 text-body text-label data-disabled:cursor-default data-disabled:opacity-40",
      )}
    >
      <span
        aria-hidden
        className="relative inline-flex h-7.75 w-12.75 shrink-0 items-center rounded-full border border-control-border bg-fill transition-colors duration-200 group-data-focus-visible:outline-2 group-data-focus-visible:outline-offset-2 group-data-focus-visible:outline-accent-fill group-data-selected:border-transparent group-data-selected:bg-accent-fill forced-colors:group-data-selected:bg-[Highlight]"
      >
        <span className="ms-px size-6.75 rounded-full bg-thumb shadow-elevated transition-transform duration-(--spring-duration) ease-spring group-data-selected:translate-x-5.25 motion-reduce:transition-none rtl:group-data-selected:-translate-x-5.25 forced-colors:border forced-colors:border-[CanvasText]" />
      </span>
      {children}
    </AriaSwitch>
  );
}
