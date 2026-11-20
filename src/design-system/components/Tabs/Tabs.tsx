"use client";

import type { LucideIcon } from "lucide-react";
import {
  Link as AriaLink,
  Tab as AriaTab,
  TabList as AriaTabList,
  TabPanel as AriaTabPanel,
  Tabs as AriaTabs,
  type TabListProps,
  type TabPanelProps,
  type TabProps,
  type TabsProps,
} from "react-aria-components";
import { cx, withClass } from "../../utils/cx";
import { Icon } from "../Icon/Icon";

/** In-page tabs. Arrow keys move between tabs; the selected tab is underlined and bold. */
export function Tabs({ className, ...props }: TabsProps) {
  return <AriaTabs {...props} className={withClass(className, "flex flex-col gap-4")} />;
}

export function TabList<T extends object>({ className, ...props }: TabListProps<T>) {
  return (
    <AriaTabList
      {...props}
      className={withClass(className, "flex gap-6 overflow-x-auto hairline-b")}
    />
  );
}

export function Tab({ className, ...props }: TabProps) {
  return (
    <AriaTab
      {...props}
      className={withClass(
        className,
        cx(
          "relative flex min-h-touch cursor-pointer items-center text-body whitespace-nowrap text-label-secondary focus-ring",
          "data-disabled:opacity-40 data-hovered:text-label",
          "data-selected:font-semibold data-selected:text-label",
          "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-transparent data-selected:after:bg-accent-fill forced-colors:data-selected:after:bg-[Highlight]",
        ),
      )}
    />
  );
}

export function TabPanel({ className, ...props }: TabPanelProps) {
  return <AriaTabPanel {...props} className={withClass(className, "rounded-control focus-ring")} />;
}

export interface TabBarItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface TabBarProps {
  items: TabBarItem[];
  /** href of the current section. */
  current: string;
  "aria-label": string;
  className?: string;
}

/**
 * Bottom tab bar for phones (hidden from 768 px, where the sidebar takes over). Translucent
 * material; labels stay visible under icons, so the current tab is not shown by color alone.
 */
export function TabBar({ items, current, className, ...props }: TabBarProps) {
  return (
    <nav
      {...props}
      className={cx(
        "fixed inset-x-0 bottom-0 z-40 hairline-t material pb-[env(safe-area-inset-bottom)] md:hidden",
        className,
      )}
    >
      <ul className="mx-auto flex max-w-reading">
        {items.map((item) => {
          const active = item.href === current;
          return (
            <li key={item.href} className="flex-1">
              <AriaLink
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex min-h-12.5 flex-col items-center justify-center gap-0.5 rounded-control text-caption2 font-medium focus-ring",
                  active ? "text-accent-text" : "text-label-secondary",
                )}
              >
                <Icon icon={item.icon} size={24} />
                <span className={cx(active && "font-bold")}>{item.label}</span>
              </AriaLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
