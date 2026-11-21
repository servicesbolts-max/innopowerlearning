import NextLink from "next/link";
import type { ReactNode } from "react";
import { cx, Monogram } from "@/design-system";

/**
 * Site chrome shared by the Hub and tenant shells: a header with the brand and primary
 * navigation, and a footer. Server components; tokens only.
 */
export interface NavItem {
  href: string;
  label: string;
}

export function SiteHeader({
  brand,
  items,
  navLabel,
  cta,
}: {
  brand: { name: string; monogram: string; href: string };
  items: NavItem[];
  navLabel: string;
  cta?: NavItem;
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
          {items.map((item) => (
            <NextLink
              key={item.href}
              href={item.href}
              className="flex min-h-touch items-center rounded-control px-2 text-subheadline text-label-secondary focus-ring hover:text-label"
            >
              {item.label}
            </NextLink>
          ))}
          {cta && (
            <NextLink
              href={cta.href}
              className="flex min-h-touch items-center rounded-control px-2 text-subheadline font-semibold text-accent-text focus-ring"
            >
              {cta.label}
            </NextLink>
          )}
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

/** A link styled as the filled primary button (DS Button renders a <button>, not a link). */
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
        "inline-flex min-h-touch items-center justify-center rounded-control px-4 text-body font-semibold focus-ring",
        variant === "filled"
          ? "bg-accent-fill text-on-accent"
          : "bg-accent-tint text-accent-text-on-tint",
      )}
    >
      {children}
    </NextLink>
  );
}

/** Page frame: column layout so the footer sits at the bottom of short pages. */
export function ShellFrame({ children }: { children: ReactNode }) {
  return <div className="flex min-h-dvh flex-col">{children}</div>;
}
