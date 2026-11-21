"use client";

import NextLink from "next/link";
import { useSelectedLayoutSegments } from "next/navigation";
import { cx } from "@/design-system";

export interface NavLinkItem {
  href: string;
  label: string;
  /** First route segment under the shell layout that this link represents ("courses"). */
  segment: string;
  emphasis?: boolean;
}

/**
 * Header links with the current page marked (aria-current plus a non-color cue). Reads the
 * route tree, not the browser URL: the proxy serves `/courses` from `/t/<slug>/courses`, so
 * usePathname would disagree between server and client.
 */
export function NavLinks({ items }: { items: NavLinkItem[] }) {
  const current = useSelectedLayoutSegments().find((s) => !s.startsWith("("));
  return <NavLinkList items={items} current={current} />;
}

/** Same links with nothing marked: the Suspense fallback and the static render. */
export function NavLinkList({ items, current }: { items: NavLinkItem[]; current?: string }) {
  return (
    <>
      {items.map((item) => {
        const active = item.segment === current;
        return (
          <NextLink
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "flex min-h-touch items-center rounded-control px-2 text-subheadline underline-offset-4 focus-ring",
              item.emphasis
                ? "font-semibold text-accent-text"
                : active
                  ? "font-semibold text-label"
                  : "text-label-secondary hover:text-label",
              active && "underline decoration-2",
            )}
          >
            {item.label}
          </NextLink>
        );
      })}
    </>
  );
}
