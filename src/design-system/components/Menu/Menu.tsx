"use client";

import { Check, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useRef, useState, type ReactNode } from "react";
import {
  Header,
  Keyboard,
  Menu as AriaMenu,
  MenuItem as AriaMenuItem,
  MenuSection as AriaMenuSection,
  MenuTrigger,
  Separator,
  type MenuItemProps as AriaMenuItemProps,
  type MenuProps as AriaMenuProps,
  type MenuTriggerProps,
} from "react-aria-components";
import { cx, withClass } from "../../utils/cx";
import { Icon } from "../Icon/Icon";
import { Popover } from "../Popover/Popover";

export { MenuTrigger };
export type { MenuTriggerProps };

export function Menu<T extends object>({ className, ...props }: AriaMenuProps<T>) {
  return (
    <Popover className="min-w-56">
      <AriaMenu
        {...props}
        className={withClass(className, "max-h-[60vh] overflow-auto p-1 outline-none")}
      />
    </Popover>
  );
}

export interface MenuItemProps extends Omit<AriaMenuItemProps, "children"> {
  children: ReactNode;
  icon?: LucideIcon;
  /** Keyboard shortcut hint, for example "⌘D". */
  shortcut?: string;
  destructive?: boolean;
}

/** Menu row: optional icon, label, shortcut; selected items show a check. */
export function MenuItem({
  children,
  icon,
  shortcut,
  destructive,
  className,
  ...props
}: MenuItemProps) {
  const textValue = props.textValue ?? (typeof children === "string" ? children : undefined);
  return (
    <AriaMenuItem
      {...props}
      textValue={textValue}
      className={withClass(
        className,
        cx(
          "group flex min-h-touch cursor-pointer items-center gap-3 rounded-control px-3 text-body outline-none data-disabled:opacity-40 data-focus-visible:outline-2 data-focus-visible:-outline-offset-2 data-focus-visible:outline-accent-fill data-focused:forced-selected data-focused:bg-fill",
          destructive ? "text-red-text" : "text-label",
        ),
      )}
    >
      {({ selectionMode, isSelected }) => (
        <>
          {selectionMode !== "none" && (
            <span className="w-4 shrink-0">{isSelected && <Icon icon={Check} size={16} />}</span>
          )}
          <span className="flex-1 truncate">{children}</span>
          {shortcut && (
            <Keyboard className="text-footnote text-label-secondary">{shortcut}</Keyboard>
          )}
          {icon && <Icon icon={icon} size={20} className="shrink-0" />}
        </>
      )}
    </AriaMenuItem>
  );
}

export function MenuSection<T extends object>({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <AriaMenuSection<T> className="[&:not(:first-child)]:mt-1">
      {title && (
        <Header className="px-3 pt-2 pb-1 text-footnote font-semibold text-label-secondary">
          {title}
        </Header>
      )}
      {children}
    </AriaMenuSection>
  );
}

export function MenuSeparator() {
  return <Separator className="mx-3 my-1 border-t border-separator" />;
}

export interface ContextMenuProps {
  /** The element that gets the menu. It must be focusable so keyboard users can open the menu. */
  children: ReactNode;
  /**
   * Accessible name, only when the visible content is not a good name. It must contain the
   * visible text (WCAG 2.5.3); by default the name comes from the content.
   */
  "aria-label"?: string;
  menu: ReactNode;
  className?: string;
}

/**
 * Context menu: right click (or long press with a mouse), Shift+F10 or the Menu key opens the same
 * menu at the pointer or at the element. It is a shortcut: every action must also exist elsewhere.
 */
export function ContextMenu({ children, menu, className, ...props }: ContextMenuProps) {
  const [open, setOpen] = useState(false);
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const anchor = useRef<HTMLSpanElement>(null);
  const area = useRef<HTMLDivElement>(null);

  const t = useTranslations("ds");
  const hintId = useId();
  const openKeys = ["Enter", " ", "ContextMenu"];
  return (
    <div
      ref={area}
      role="button"
      tabIndex={0}
      aria-label={props["aria-label"]}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-describedby={hintId}
      className={cx("relative focus-visible:outline-2 focus-visible:outline-offset-2", className)}
      onContextMenu={(e) => {
        e.preventDefault();
        const rect = area.current!.getBoundingClientRect();
        setPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        setOpen(true);
      }}
      onKeyDown={(e) => {
        // Keys pressed inside the (portaled) menu bubble here through React; ignore them.
        if (e.target !== e.currentTarget) return;
        if (openKeys.includes(e.key) || (e.shiftKey && e.key === "F10")) {
          e.preventDefault();
          setPoint(null);
          setOpen(true);
        }
      }}
    >
      {/* hidden: excluded from the name, still read as the description via aria-describedby. */}
      <span id={hintId} hidden>
        {t("contextMenuHint")}
      </span>
      {children}
      <span
        ref={anchor}
        aria-hidden
        className="pointer-events-none absolute size-0"
        style={point ? { left: point.x, top: point.y } : { left: 0, bottom: 0 }}
      />
      <Popover
        triggerRef={anchor}
        isOpen={open}
        onOpenChange={setOpen}
        placement="bottom start"
        className="min-w-56"
      >
        <AriaMenu
          autoFocus="first"
          onAction={() => setOpen(false)}
          onClose={() => setOpen(false)}
          className="max-h-[60vh] overflow-auto p-1 outline-none"
        >
          {menu}
        </AriaMenu>
      </Popover>
    </div>
  );
}
