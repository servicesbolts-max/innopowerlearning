import NextLink from "next/link";
import { Suspense, type ReactNode } from "react";
import { cx, Monogram } from "@/design-system";
import { NavLinkList, NavLinks, type NavLinkItem } from "./nav-links";

/**
 * Site chrome shared by the Hub and tenant shells: a skip link, a header with the brand and
 * primary navigation, and a footer. Server components (the nav marks the current page on the
 * client); tokens only.
 */
export interface NavItem {
  href: string;
  label: string;
}

export function SiteHeader({
  brand,
  items,
  navLabel,
  account,
}: {
  brand: { name: string; monogram: string; href: string };
  /** Primary links; mark one with `emphasis` for the call to action (Sign in). */
  items: NavLinkItem[];
  navLabel: string;
  /** The account entry after the links (sign in, or the signed-in person). */
  account?: ReactNode;
}) {
  return (
    <header className="hairline-b bg-bg">
      <div className="mx-auto flex max-w-app flex-wrap items-center justify-between gap-x-6 px-4 py-1">
        <NextLink
          href={brand.href}
          className="-ms-1 flex min-h-touch min-w-0 items-center gap-2 rounded-control px-1 text-headline focus-ring"
        >
          <Monogram text={brand.monogram} size={32} />
          <span className="truncate">{brand.name}</span>
        </NextLink>
        <nav aria-label={navLabel} className="-mx-2 flex flex-wrap items-center">
          <Suspense fallback={<NavLinkList items={items} />}>
            <NavLinks items={items} />
          </Suspense>
          {account}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({
  label,
  items,
  children,
}: {
  label: string;
  items: NavItem[];
  children?: ReactNode;
}) {
  return (
    <footer className="mt-auto hairline-t bg-bg-secondary">
      <div className="mx-auto flex max-w-app flex-col gap-2 px-4 py-6 text-footnote text-label-secondary sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">{children}</div>
        {items.length > 0 && (
          <nav aria-label={label} className="-mx-2 flex flex-wrap">
            {items.map((item) => (
              <NextLink
                key={item.href}
                href={item.href}
                className="flex min-h-touch items-center rounded-control px-2 underline-offset-2 focus-ring hover:underline"
              >
                {item.label}
              </NextLink>
            ))}
          </nav>
        )}
      </div>
    </footer>
  );
}

/**
 * A link styled as a filled or tinted button (DS Button renders a <button>, not a link). The
 * transparent border becomes visible in forced-colors mode, where backgrounds are removed.
 */
export function PrimaryLink({
  href,
  children,
  variant = "filled",
}: {
  href: string;
  children: ReactNode;
  variant?: "filled" | "tinted";
}) {
  return (
    <NextLink
      href={href}
      className={cx(
        "inline-flex min-h-touch items-center justify-center rounded-control border border-transparent px-4 text-body font-semibold focus-ring",
        variant === "filled"
          ? "bg-accent-fill text-on-accent"
          : "bg-accent-tint text-accent-text-on-tint",
      )}
    >
      {children}
    </NextLink>
  );
}

/**
 * Page frame: a skip link to `#main` (WCAG 2.4.1), then a column layout so the footer sits at the
 * bottom of short pages.
 */
export function ShellFrame({ skipLabel, children }: { skipLabel: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-control bg-bg px-4 py-3 text-body font-semibold text-accent-text focus-ring focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
      >
        {skipLabel}
      </a>
      {children}
    </div>
  );
}
