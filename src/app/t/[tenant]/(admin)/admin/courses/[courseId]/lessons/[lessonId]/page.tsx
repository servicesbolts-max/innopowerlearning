import type { Metadata } from "next";
import NextLink from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCourseForEditing, getLessonForEditing } from "@/modules/courses";
import { can } from "@/modules/rbac";
import { staffPage } from "../../../../../../../../_lib/guard";
import { AdminFrame } from "../../../../_components/admin-frame";
import { removeLessonAction, updateLessonAction } from "../../../actions";
import { LessonEditor } from "./lesson-editor";

export const instant = false;

type Props = { params: Promise<{ tenant: string; courseId: string; lessonId: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("lms.authoring.lesson");
  return { title: t("title"), robots: { index: false, follow: false } };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function LessonEditorPage({ params }: Props) {
  const { tenant, courseId, lessonId } = await params;
  const { shell, session } = await staffPage(
    tenant,
    "course.create",
    `/admin/courses/${courseId}/lessons/${lessonId}`,
  );
  if (!UUID.test(courseId) || !UUID.test(lessonId)) notFound();
  const course = await getCourseForEditing(shell.id, courseId);
  if (!course || !can(session.actor, "course.edit", { ownerId: course.ownerId })) notFound();
  const lesson = await getLessonForEditing(shell.id, courseId, lessonId);
  if (!lesson) notFound();
  const t = await getTranslations("lms.authoring.lesson");

  return (
    <AdminFrame actor={session.actor} current="courses" title={lesson.title}>
      <NextLink
        href={`/admin/courses/${courseId}`}
        className="-mt-4 flex min-h-touch items-center self-start rounded-control text-subheadline text-accent-text underline-offset-2 focus-ring hover:underline"
      >
        {t("backToCourse", { course: course.title })}
      </NextLink>
      <div className="max-w-reading">
        <LessonEditor
          courseId={courseId}
          lesson={lesson}
          updateAction={updateLessonAction}
          removeAction={removeLessonAction}
        />
      </div>
    </AdminFrame>
  );
}
