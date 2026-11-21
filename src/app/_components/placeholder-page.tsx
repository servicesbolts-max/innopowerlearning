import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/design-system";
import { PrimaryLink } from "./shell";

/** A page whose feature arrives in a later package: a title and one clear way back. */
export function PlaceholderPage({
  title,
  emptyTitle,
  body,
  icon,
  back,
}: {
  title: string;
  emptyTitle?: string;
  body: string;
  icon?: LucideIcon;
  back: { href: string; label: string };
}) {
  return (
    <div className="mx-auto flex max-w-reading flex-col gap-2 px-4 py-12">
      <h1 className="text-large-title tracking-tight">{title}</h1>
      <EmptyState
        icon={icon}
        title={emptyTitle ?? title}
        description={body}
        headingLevel="h2"
        action={
          <PrimaryLink href={back.href} variant="tinted">
            {back.label}
          </PrimaryLink>
        }
      />
    </div>
  );
}
