"use client";

import { PanelLeft, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, type ReactNode } from "react";
import { Button as AriaButton, Link as AriaLink } from "react-aria-components";
import { cx } from "../../utils/cx";
import { Icon } from "../Icon/Icon";
import { WithTooltip } from "../Tooltip/Tooltip";

export interface SidebarItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Count shown at the end (for example unread items). */
  badge?: ReactNode;
}

export interface SidebarSection {
  title?: string;
  items: SidebarItem[];
}

export interface SidebarProps {
  "aria-label": string;
  sections: SidebarSection[];
  current: string;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  /** Brand or tenant switcher at the top. */
  header?: ReactNode;
  className?: string;
}

/**
 * Collapsible sidebar for wide screens (hidden under 768 px, where the tab bar is used).
 * Collapsed, it shows icons only; each keeps its name for assistive technology and a tooltip.
 */
export function Sidebar({
  sections,
  current,
  collapsed,
  onCollapsedChange,
  header,
  className,
  ...props
}: SidebarProps) {
  const t = useTranslations("ds");
  const navId = useId();
  return (
    <aside
      className={cx(
        "hairline-r sticky top-0 hidden h-dvh shrink-0 flex-col gap-2 border-e border-separator material p-3 transition-[width] duration-(--spring-duration) ease-spring motion-reduce:transition-none md:flex",
        collapsed ? "w-18" : "w-64",
        className,
      )}
    >
      <div className={cx("flex items-center gap-2", collapsed ? "flex-col" : "justify-between")}>
        {!collapsed && <div className="min-w-0 truncate ps-2 text-headline">{header}</div>}
        <AriaButton
          aria-label={t("toggleSidebar")}
          aria-expanded={!collapsed}
          aria-controls={navId}
          onPress={() => onCollapsedChange(!collapsed)}
          className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-control text-label-secondary focus-ring data-hovered:bg-fill"
        >
          <Icon icon={PanelLeft} size={20} className="rtl:-scale-x-100" />
        </AriaButton>
      </div>
      <nav
        id={navId}
        aria-label={props["aria-label"]}
        className="flex flex-col gap-4 overflow-y-auto"
      >
        {sections.map((section, s) => (
          <div key={section.title ?? s} className="flex flex-col gap-0.5">
            {section.title && !collapsed && (
              <p className="px-3 pt-2 pb-1 text-footnote font-semibold text-label-secondary">
                {section.title}
              </p>
            )}
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const active = item.href === current;
                const link = (
                  <AriaLink
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    aria-label={collapsed ? item.label : undefined}
                    className={cx(
                      "flex min-h-10 items-center gap-3 rounded-control px-3 text-body focus-ring",
                      collapsed && "justify-center px-0",
                      active
                        ? "bg-accent-tint font-semibold text-accent-text-on-tint"
                        : "text-label data-hovered:bg-fill",
                    )}
                  >
                    <Icon icon={item.icon} size={20} />
                    {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                    {!collapsed && item.badge && (
                      // On the selected (tinted) row the count inherits the on-tint text color.
                      <span
                        className={cx(
                          "text-footnote font-semibold",
                          !active && "text-label-secondary",
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </AriaLink>
                );
                return (
                  <li key={item.href}>
                    {collapsed ? <WithTooltip tip={item.label}>{link}</WithTooltip> : link}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
