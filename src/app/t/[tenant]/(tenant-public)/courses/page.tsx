import { BookOpen, SearchX } from "lucide-react";
import type { Metadata } from "next";
import NextLink from "next/link";
import { getTranslations } from "next-intl/server";
import { Badge, EmptyState } from "@/design-system";
import { listPublishedCourses } from "@/modules/courses";
import { PrimaryLink } from "../../../../_components/shell";
import { tenantPage } from "../../../../_lib/guard";
import { CatalogSearch } from "./catalog-search";

// Blocks on params by design: see the tenant layout.
export const instant = false;

type Props = {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("lms.catalog");
  return { title: t("title") };
}

export default async function CatalogPage({ params, searchParams }: Props) {
  const shell = await tenantPage((await params).tenant);
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 100) ?? "";
  const t = await getTranslations("lms");
  const courses = await listPublishedCourses(shell.id, q);

  return (
    <div className="mx-auto flex w-full max-w-app flex-col gap-6 px-4 py-10">
      <h1 className="text-large-title tracking-tight">{t("catalog.title")}</h1>
      <CatalogSearch defaultValue={q} />
      {q && (
        <p role="status" className="text-subheadline text-label-secondary">
          {t("catalog.results", { count: courses.length, q })}
        </p>
      )}
      {courses.length === 0 ? (
        <EmptyState
          icon={q ? SearchX : BookOpen}
          title={q ? t("catalog.noResults") : t("catalog.empty")}
          description={q ? t("catalog.noResultsBody") : t("catalog.emptyBody")}
          headingLevel="h2"
          action={
            q ? (
              <PrimaryLink href="/courses" variant="tinted">
                {t("catalog.clear")}
              </PrimaryLink>
            ) : undefined
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <li key={c.id}>
              <NextLink
                href={`/courses/${c.slug}`}
                className="flex h-full flex-col gap-2 rounded-card bg-bg-secondary p-5 focus-ring hover:bg-fill"
              >
                {c.category && (
                  <span className="text-footnote text-label-secondary uppercase">{c.category}</span>
                )}
                <h2 className="text-headline">{c.title}</h2>
                {c.summary && (
                  <p className="line-clamp-3 text-subheadline text-label-secondary">{c.summary}</p>
                )}
                {c.enrollmentMode === "invite_only" && (
                  <Badge tone="orange" className="mt-auto self-start">
                    {t("common.inviteOnly")}
                  </Badge>
                )}
              </NextLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
