import { ArrowDown, ArrowUp, FileText, ListChecks, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import NextLink from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Badge, Banner, Button, Card, Icon, Select, SelectItem, TextField } from "@/design-system";
import { getCourseForEditing, type OutlineSection } from "@/modules/courses";
import { can } from "@/modules/rbac";
import { ActionForm } from "../../../../../../_components/action-form";
import { staffPage } from "../../../../../../_lib/guard";
import { AdminFrame } from "../../_components/admin-frame";
import {
  addLessonAction,
  addSectionAction,
  moveLessonAction,
  moveSectionAction,
  removeSectionAction,
  renameSectionAction,
  setCourseStatusAction,
  enrollMemberAction,
  updateCourseAction,
} from "../actions";
import { CourseFields } from "../course-fields";

export const instant = false;

type Props = { params: Promise<{ tenant: string; courseId: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("lms.authoring");
  return { title: t("details"), robots: { index: false, follow: false } };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Hidden({ values }: { values: Record<string, string> }) {
  return Object.entries(values).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />);
}

async function MoveButtons({
  action,
  values,
  name,
  isFirst,
  isLast,
}: {
  action: typeof moveSectionAction | typeof moveLessonAction;
  values: Record<string, string>;
  name: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const t = await getTranslations("lms.common");
  return (
    <div className="flex gap-1">
      {(["up", "down"] as const).map((direction) => (
        <ActionForm key={direction} action={action}>
          <Hidden values={{ ...values, direction }} />
          <Button
            type="submit"
            size="small"
            variant="gray"
            aria-label={t(direction === "up" ? "moveUp" : "moveDown", { name })}
            isDisabled={direction === "up" ? isFirst : isLast}
          >
            <Icon icon={direction === "up" ? ArrowUp : ArrowDown} size={16} />
          </Button>
        </ActionForm>
      ))}
    </div>
  );
}

async function SectionCard({
  courseId,
  section,
  index,
  count,
}: {
  courseId: string;
  section: OutlineSection;
  index: number;
  count: number;
}) {
  const t = await getTranslations("lms");
  const ids = { courseId, sectionId: section.id };
  return (
    <Card as="li" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-2">
        <ActionForm action={renameSectionAction} layout="inline" className="min-w-0 flex-1">
          <Hidden values={ids} />
          <TextField
            name="title"
            label={t("authoring.sectionTitle")}
            defaultValue={section.title}
            isRequired
            maxLength={160}
            className="min-w-0 flex-1"
          />
          <Button type="submit" variant="tinted">
            {t("authoring.renameSection")}
          </Button>
        </ActionForm>
        <MoveButtons
          action={moveSectionAction}
          values={ids}
          name={section.title}
          isFirst={index === 0}
          isLast={index === count - 1}
        />
        <ActionForm action={removeSectionAction} confirm={t("authoring.removeSectionConfirm")}>
          <Hidden values={ids} />
          <Button
            type="submit"
            size="small"
            variant="gray"
            destructive
            aria-label={t("authoring.removeSection")}
          >
            <Icon icon={Trash2} size={16} />
          </Button>
        </ActionForm>
      </div>

      {section.lessons.length === 0 ? (
        <p className="text-subheadline text-label-secondary">{t("authoring.noLessons")}</p>
      ) : (
        <ol className="flex flex-col divide-y divide-separator rounded-control bg-bg-secondary">
          {section.lessons.map((lesson, i) => (
            <li key={lesson.id} className="flex items-center gap-3 px-3 py-2">
              <Icon
                icon={lesson.kind === "quiz" ? ListChecks : FileText}
                size={20}
                className="shrink-0 text-accent-text"
              />
              <NextLink
                href={`/admin/courses/${courseId}/lessons/${lesson.id}`}
                className="min-h-touch min-w-0 flex-1 content-center rounded-control text-body underline-offset-2 focus-ring hover:underline"
              >
                {lesson.title}
                <span className="sr-only"> ({t(`common.${lesson.kind}`)})</span>
              </NextLink>
              {lesson.kind === "quiz" && <Badge tone="indigo">{t("common.quiz")}</Badge>}
              <MoveButtons
                action={moveLessonAction}
                values={{ courseId, lessonId: lesson.id }}
                name={lesson.title}
                isFirst={i === 0}
                isLast={i === section.lessons.length - 1}
              />
            </li>
          ))}
        </ol>
      )}

      <ActionForm action={addLessonAction} resetOnSuccess layout="responsive">
        <Hidden values={ids} />
        <TextField
          name="title"
          label={t("authoring.lessonTitle")}
          isRequired
          maxLength={160}
          className="min-w-0 flex-1"
        />
        <Select name="kind" label={t("authoring.lessonKind")} defaultSelectedKey="content">
          <SelectItem id="content">{t("common.content")}</SelectItem>
          <SelectItem id="quiz">{t("common.quiz")}</SelectItem>
        </Select>
        <Button type="submit" variant="tinted">
          {t("authoring.addLesson")}
        </Button>
      </ActionForm>
    </Card>
  );
}

export default async function CourseEditorPage({ params }: Props) {
  const { tenant, courseId } = await params;
  const { shell, session } = await staffPage(tenant, "course.create", `/admin/courses/${courseId}`);
  if (!UUID.test(courseId)) notFound();
  const course = await getCourseForEditing(shell.id, courseId);
  if (!course || !can(session.actor, "course.edit", { ownerId: course.ownerId })) notFound();
  const t = await getTranslations("lms");
  const published = course.status === "published";
  const canPublish = can(session.actor, "course.publish", { ownerId: course.ownerId });

  return (
    <AdminFrame
      actor={session.actor}
      current="courses"
      title={course.title}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={published ? "green" : "gray"}>{t(`common.${course.status}`)}</Badge>
          {published && (
            <NextLink
              href={`/courses/${course.slug}`}
              className="flex min-h-touch items-center rounded-control px-2 text-subheadline text-accent-text underline-offset-2 focus-ring hover:underline"
            >
              {t("authoring.viewInCatalog")}
            </NextLink>
          )}
          {canPublish && (
            <ActionForm action={setCourseStatusAction}>
              <Hidden values={{ courseId, status: published ? "draft" : "published" }} />
              <Button type="submit" variant={published ? "gray" : "filled"}>
                {t(published ? "authoring.unpublish" : "authoring.publish")}
              </Button>
            </ActionForm>
          )}
        </div>
      }
    >
      <Banner
        tone={published ? "success" : "info"}
        title={t(published ? "authoring.publishedNotice" : "authoring.draftNotice")}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <section aria-labelledby="outline" className="flex flex-col gap-4 lg:col-span-2">
          <h2 id="outline" className="text-title2">
            {t("authoring.outline")}
          </h2>
          {course.sections.length === 0 ? (
            <p className="text-body text-label-secondary">{t("authoring.noSections")}</p>
          ) : (
            <ol className="flex flex-col gap-4">
              {course.sections.map((section, i) => (
                <SectionCard
                  key={section.id}
                  courseId={courseId}
                  section={section}
                  index={i}
                  count={course.sections.length}
                />
              ))}
            </ol>
          )}
          <ActionForm action={addSectionAction} resetOnSuccess layout="responsive">
            <Hidden values={{ courseId }} />
            <TextField
              name="title"
              label={t("authoring.sectionTitle")}
              isRequired
              maxLength={160}
              className="min-w-0 flex-1"
            />
            <Button type="submit">{t("authoring.addSection")}</Button>
          </ActionForm>
        </section>
        <div className="flex flex-col gap-6 self-start">
          <Card as="section" className="flex flex-col gap-3">
            <h2 className="text-title3">{t("authoring.details")}</h2>
            <ActionForm action={updateCourseAction} successMessage={t("common.saved")}>
              <Hidden values={{ courseId }} />
              <CourseFields
                defaults={{
                  title: course.title,
                  summary: course.summary,
                  category: course.category,
                  enrollmentMode: course.enrollmentMode,
                }}
              />
              <Button type="submit">{t("common.save")}</Button>
            </ActionForm>
          </Card>
          <Card as="section" className="flex flex-col gap-3">
            <h2 className="text-title3">{t("catalog.enrollmentFor")}</h2>
            <ActionForm
              action={enrollMemberAction}
              resetOnSuccess
              successMessage={t("catalog.enrolledLearner")}
            >
              <Hidden values={{ courseId }} />
              <TextField
                name="email"
                type="email"
                label={t("catalog.enrollEmail")}
                description={t("catalog.enrollEmailHelp")}
                isRequired
                maxLength={320}
              />
              <Button type="submit" variant="tinted">
                {t("catalog.enrollLearner")}
              </Button>
            </ActionForm>
          </Card>
        </div>
      </div>
    </AdminFrame>
  );
}
