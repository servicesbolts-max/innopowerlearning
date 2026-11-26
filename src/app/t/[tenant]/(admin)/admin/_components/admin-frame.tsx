import NextLink from "next/link";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { cx } from "@/design-system";
import { can, type Actor, type Permission } from "@/modules/rbac";

type Section = "dashboard" | "people" | "courses" | "branding";

const SECTIONS: { id: Section; href: string; permission: Permission }[] = [
  { id: "dashboard", href: "/admin", permission: "member.read" },
  { id: "people", href: "/admin/people", permission: "member.read" },
  { id: "courses", href: "/admin/courses", permission: "course.create" },
  { id: "branding", href: "/admin/branding", permission: "tenant.settings.write" },
];

/** Admin page frame: a large title and the admin sections this actor may open. */
export async function AdminFrame({
  actor,
  current,
  title,
  actions,
  children,
}: {
  actor: Actor;
  current: Section;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const t = await getTranslations("lms.admin.nav");
  const visible = SECTIONS.filter((s) => can(actor, s.permission));
  return (
    <div className="mx-auto flex w-full max-w-app flex-col gap-6 px-4 py-8">
      {visible.length > 1 && (
        <nav aria-label={t("label")} className="-mx-2 flex flex-wrap gap-1 hairline-b pb-2">
          {visible.map((s) => (
            <NextLink
              key={s.id}
              href={s.href}
              aria-current={s.id === current ? "page" : undefined}
              className={cx(
                "flex min-h-touch items-center rounded-control px-3 text-subheadline focus-ring",
                s.id === current
                  ? "bg-accent-tint font-semibold text-accent-text-on-tint"
                  : "text-label-secondary hover:text-label",
              )}
            >
              {t(s.id)}
            </NextLink>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-large-title tracking-tight">{title}</h1>
        {actions}
      </div>
      {children}
    </div>
  );
}
