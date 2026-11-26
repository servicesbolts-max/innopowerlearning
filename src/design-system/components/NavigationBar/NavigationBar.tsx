"use client";

import { ChevronLeft } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Link as AriaLink } from "react-aria-components";
import { cx } from "../../utils/cx";
import { Icon } from "../Icon/Icon";

export interface NavigationBarProps {
  /** Page title: shown large under the bar, and small in the bar once the large title scrolls away. */
  title: string;
  /** Back link (label is the previous page's title). */
  back?: { href: string; label: string };
  /** Trailing actions (icon buttons, a primary action). */
  actions?: ReactNode;
  /** Content under the large title (search field, segmented control). */
  accessory?: ReactNode;
  className?: string;
  /**
   * The element that scrolls, when it is not the page (a sheet, a split-view pane, a story
   * frame). Defaults to the viewport.
   */
  scrollRoot?: RefObject<HTMLElement | null>;
}

/**
 * Navigation bar with a collapsing large title. The large title is the page's h1; the inline title
 * in the bar is a visual duplicate, hidden from assistive technology.
 */
export function NavigationBar({
  title,
  back,
  actions,
  accessory,
  className,
  scrollRoot,
}: NavigationBarProps) {
  const sentinel = useRef<HTMLHeadingElement>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setCollapsed(!entry!.isIntersecting), {
      root: scrollRoot?.current ?? null,
      rootMargin: "-44px 0px 0px 0px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [scrollRoot]);

  return (
    // A header landmark keeps the bar, the h1 and the accessory inside a landmark (axe "region").
    // display: contents keeps the page (not this header) as the sticky bar's scroll container.
    <header className="contents">
      <div
        className={cx(
          "sticky top-0 z-30 transition-[background-color,border-color] duration-200",
          collapsed ? "hairline-b material" : "border-b border-transparent bg-transparent",
          className,
        )}
      >
        <div className="mx-auto grid min-h-touch max-w-app grid-cols-[1fr_auto_1fr] items-center gap-2 px-4">
          <div className="flex min-w-0 items-center">
            {back && (
              <AriaLink
                href={back.href}
                className="-ms-2 flex min-h-touch items-center gap-0.5 rounded-control pe-2 text-body text-accent-text focus-ring data-hovered:opacity-80"
              >
                <Icon icon={ChevronLeft} size={24} className="rtl:rotate-180" />
                <span className="truncate">{back.label}</span>
              </AriaLink>
            )}
          </div>
          <p
            aria-hidden
            className={cx(
              "truncate text-headline transition-opacity duration-200 motion-reduce:transition-none",
              collapsed ? "opacity-100" : "opacity-0",
            )}
          >
            {title}
          </p>
          <div className="flex items-center justify-end gap-1">{actions}</div>
        </div>
      </div>
      <div className="mx-auto max-w-app px-4 pt-1 pb-3">
        <h1 ref={sentinel} className="text-large-title tracking-tight">
          {title}
        </h1>
        {accessory && <div className="mt-3">{accessory}</div>}
      </div>
    </header>
  );
}
