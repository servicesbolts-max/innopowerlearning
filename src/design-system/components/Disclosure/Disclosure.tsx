"use client";

import { ChevronRight } from "lucide-react";
import {
  Button,
  Disclosure as AriaDisclosure,
  DisclosureGroup as AriaDisclosureGroup,
  DisclosurePanel,
  Heading,
  type DisclosureGroupProps,
  type DisclosureProps as AriaDisclosureProps,
} from "react-aria-components";
import { withClass } from "../../utils/cx";
import { Icon } from "../Icon/Icon";

export interface DisclosureProps extends Omit<AriaDisclosureProps, "children"> {
  title: React.ReactNode;
  children: React.ReactNode;
  /** Heading level of the trigger. */
  level?: 2 | 3 | 4;
}

/** Expandable section. The chevron rotates; Enter or Space toggles it. */
export function Disclosure({ title, children, level = 3, className, ...props }: DisclosureProps) {
  return (
    <AriaDisclosure {...props} className={withClass(className, "group hairline-b last:border-b-0")}>
      <Heading level={level} className="text-headline">
        <Button
          slot="trigger"
          className="flex min-h-touch w-full cursor-pointer items-center justify-between gap-3 px-4 py-2 text-start focus-ring data-hovered:bg-fill"
        >
          {title}
          <Icon
            icon={ChevronRight}
            size={16}
            className="shrink-0 text-label-secondary transition-transform duration-200 group-data-expanded:rotate-90 motion-reduce:transition-none rtl:rotate-180 rtl:group-data-expanded:rotate-90"
          />
        </Button>
      </Heading>
      <DisclosurePanel className="px-4 text-body text-label group-data-expanded:pb-4">
        {children}
      </DisclosurePanel>
    </AriaDisclosure>
  );
}

/** A set of disclosures on one surface. `allowsMultipleExpanded` keeps several open. */
export function DisclosureGroup({ className, ...props }: DisclosureGroupProps) {
  return (
    <AriaDisclosureGroup
      {...props}
      className={withClass(
        className,
        "overflow-hidden rounded-card bg-bg-grouped-row forced-colors:border",
      )}
    />
  );
}
