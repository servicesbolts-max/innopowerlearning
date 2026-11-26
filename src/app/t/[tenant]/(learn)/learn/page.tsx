import { Award, GraduationCap } from "lucide-react";
import type { Metadata } from "next";
import NextLink from "next/link";
import { getTranslations } from "next-intl/server";
import { Badge, EmptyState, ProgressBar } from "@/design-system";
import { listMyLearning } from "@/modules/courses";
import { listMyCertificates } from "@/modules/credentials";
import { can } from "@/modules/rbac";
import { PrimaryLink } from "../../../../_components/shell";
import { signedInPage } from "../../../../_lib/guard";

export const instant = false;

type Props = { params: Promise<{ tenant: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("lms.learn");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function MyLearningPage({ params }: Props) {
  const { shell, session } = await signedInPage((await params).tenant, "/learn");
  const t = await getTranslations("lms");
  const [items, certificates] = await Promise.all([
    listMyLearning(shell.id, session.actor.userId),
    listMyCertificates(shell.id, session.actor.userId),
  ]);
  const staff = can(session.actor, "course.create") || can(session.actor, "member.read");

  return (
    <div className="mx-auto flex w-full max-w-app flex-col gap-6 px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-large-title tracking-tight">{t("learn.title")}</h1>
        {staff && (
          <PrimaryLink
            href={can(session.actor, "member.read") ? "/admin" : "/admin/courses"}
            variant="tinted"
          >
            {t("admin.title")}
          </PrimaryLink>
        )}
      </div>
      {items.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title={t("learn.empty")}
          description={t("learn.emptyBody")}
          headingLevel="h2"
          action={<PrimaryLink href="/courses">{t("learn.browse")}</PrimaryLink>}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <li
              key={item.courseId}
              className="flex flex-col gap-3 rounded-card bg-bg-secondary p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-headline">
                  <NextLink
                    href={`/learn/${item.slug}`}
                    className="rounded-sm underline-offset-2 focus-ring hover:underline"
                  >
                    {item.title}
                  </NextLink>
                </h2>
                {item.status === "completed" && (
                  <Badge tone="green" icon={Award}>
                    {t("learn.completed")}
                  </Badge>
                )}
              </div>
              <ProgressBar
                label={t("learn.progress")}
                value={item.percent}
                aria-valuetext={t("learn.percent", { value: item.percent })}
              />
              <div className="flex flex-wrap gap-2">
                <PrimaryLink href={`/learn/${item.slug}`}>
                  {item.percent === 0 ? t("catalog.start") : t("catalog.continue")}
                </PrimaryLink>
                {certificates.get(item.courseId) && (
                  <PrimaryLink href={`/verify/${certificates.get(item.courseId)}`} variant="tinted">
                    {t("learn.certificate")}
                  </PrimaryLink>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
