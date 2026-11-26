import { FileText, ListChecks } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Badge, Banner, Button, Icon } from "@/design-system";
import { getTenantSession } from "@/modules/auth";
import { getEnrollment, getPublishedCourse } from "@/modules/courses";
import { can } from "@/modules/rbac";
import { ActionForm } from "../../../../../_components/action-form";
import { PrimaryLink } from "../../../../../_components/shell";
import { tenantPage } from "../../../../../_lib/guard";
import { enrollAction } from "../../../(learn)/learn/actions";

// Blocks on params by design: see the tenant layout.
export const instant = false;

type Props = { params: Promise<{ tenant: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tenant, slug } = await params;
  const shell = await tenantPage(tenant);
  const course = await getPublishedCourse(shell.id, slug);
  return course ? { title: course.title, description: course.summary || undefined } : {};
}

export default async function CoursePage({ params }: Props) {
  const { tenant, slug } = await params;
  const shell = await tenantPage(tenant);
  const course = await getPublishedCourse(shell.id, slug);
  if (!course) notFound();
  const t = await getTranslations("lms");
  const session = await getTenantSession(shell.id);
  const enrollment =
    session && !session.needsSecondFactor
      ? await getEnrollment(shell.id, course.id, session.actor.userId)
      : null;
  const lessonCount = course.sections.reduce((n, s) => n + s.lessons.length, 0);

  let cta: React.ReactNode;
  if (enrollment) {
    cta = (
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone="green">{t("catalog.enrolled")}</Badge>
        <PrimaryLink href={`/learn/${course.slug}`}>{t("catalog.continue")}</PrimaryLink>
      </div>
    );
  } else if (!session) {
    cta = (
      <PrimaryLink href={`/sign-in?next=${encodeURIComponent(`/courses/${course.slug}`)}`}>
        {t("catalog.signInToEnroll")}
      </PrimaryLink>
    );
  } else if (course.enrollmentMode === "open" && can(session.actor, "course.learn")) {
    cta = (
      <ActionForm action={enrollAction} redirectTo={`/learn/${course.slug}`}>
        <input type="hidden" name="courseId" value={course.id} />
        <Button type="submit" size="large" className="self-start">
          {t("catalog.enroll")}
        </Button>
      </ActionForm>
    );
  } else {
    cta = <Banner tone="info" title={t("catalog.inviteOnlyBody")} />;
  }

  return (
    <div className="flex flex-col">
      <section aria-labelledby="course-title" className="hairline-b bg-bg-secondary">
        <div className="mx-auto flex max-w-app flex-col gap-4 px-4 py-10">
          {course.category && (
            <span className="text-footnote text-label-secondary uppercase">{course.category}</span>
          )}
          <h1 id="course-title" className="text-large-title tracking-tight">
            {course.title}
          </h1>
          {course.summary && (
            <p className="max-w-reading text-title3 text-label-secondary">{course.summary}</p>
          )}
          <p className="text-subheadline text-label-secondary">
            {t("common.lessons", { count: lessonCount })}
          </p>
          {cta}
        </div>
      </section>
      <section aria-labelledby="outline" className="mx-auto w-full max-w-app px-4 py-10">
        <h2 id="outline" className="mb-4 text-title2">
          {t("catalog.outline")}
        </h2>
        <ol className="flex max-w-reading flex-col gap-4">
          {course.sections.map((s) => (
            <li key={s.id} className="flex flex-col gap-2">
              <h3 className="text-headline">{s.title}</h3>
              <ul className="flex flex-col rounded-card bg-bg-secondary">
                {s.lessons.map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center gap-3 hairline-b px-4 py-3 last:border-b-0"
                  >
                    <Icon
                      icon={l.kind === "quiz" ? ListChecks : FileText}
                      size={20}
                      className="shrink-0 text-accent-text"
                    />
                    <span className="flex-1">{l.title}</span>
                    {l.kind === "quiz" && <Badge tone="indigo">{t("common.quiz")}</Badge>}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
