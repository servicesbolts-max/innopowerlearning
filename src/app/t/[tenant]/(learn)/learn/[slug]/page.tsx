import { notFound, redirect } from "next/navigation";
import { getPublishedCourse, loadPlayer } from "@/modules/courses";
import { signedInPage } from "../../../../../_lib/guard";

export const instant = false;

type Props = { params: Promise<{ tenant: string; slug: string }> };

/** Resume: opens the next lesson to do, or the course page when not enrolled. */
export default async function ResumeCourse({ params }: Props) {
  const { tenant, slug } = await params;
  const { shell, session } = await signedInPage(tenant, `/learn/${slug}`);
  const course = await getPublishedCourse(shell.id, slug);
  if (!course) notFound();
  const state = await loadPlayer(shell.id, session.actor.userId, course, null);
  if (!state) redirect(`/courses/${course.slug}`);
  if (!state.resumeLessonId) redirect(`/courses/${course.slug}`);
  redirect(`/learn/${course.slug}/${state.resumeLessonId}`);
}
