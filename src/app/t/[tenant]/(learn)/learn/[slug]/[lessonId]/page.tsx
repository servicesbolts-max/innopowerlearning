import { CircleCheck, Circle, FileDown, ListChecks } from "lucide-react";
import type { Metadata } from "next";
import NextLink from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Banner, Button, cx, Icon, ProgressBar } from "@/design-system";
import { attemptSummary, QUIZ_MAX_ATTEMPTS } from "@/modules/assessments";
import {
  getPublishedCourse,
  loadPlayer,
  parseBody,
  publicQuiz,
  videoEmbedUrl,
} from "@/modules/courses";
import { listMyCertificates } from "@/modules/credentials";
import { ActionForm } from "../../../../../../_components/action-form";
import { LessonBody } from "../../../../../../_components/learn/lesson-body";
import { PrimaryLink } from "../../../../../../_components/shell";
import { signedInPage } from "../../../../../../_lib/guard";
import { completeLessonAction, submitQuizAction } from "../../actions";
import { QuizForm } from "./quiz-form";

export const instant = false;

type Props = { params: Promise<{ tenant: string; slug: string; lessonId: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("lms.learn");
  return { title: t("title"), robots: { index: false, follow: false } };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PlayerPage({ params }: Props) {
  const { tenant, slug, lessonId } = await params;
  const { shell, session } = await signedInPage(tenant, `/learn/${slug}/${lessonId}`);
  if (!UUID.test(lessonId)) notFound();
  const course = await getPublishedCourse(shell.id, slug);
  if (!course) notFound();
  const userId = session.actor.userId;
  const state = await loadPlayer(shell.id, userId, course, lessonId);
  if (!state) redirect(`/courses/${course.slug}`);
  const lesson = state.lesson;
  if (!lesson) notFound();
  const t = await getTranslations("lms");

  const order = course.sections.flatMap((s) => s.lessons);
  const index = order.findIndex((l) => l.id === lesson.id);
  const prev = order[index - 1];
  const next = order[index + 1];
  const done = state.completed.has(lesson.id);
  const embed = lesson.kind === "content" ? videoEmbedUrl(lesson.videoUrl) : null;
  const [attempts, certificates] = await Promise.all([
    lesson.kind === "quiz"
      ? attemptSummary(shell.id, state.enrollment.id, lesson.id)
      : Promise.resolve(null),
    state.enrollment.status === "completed"
      ? listMyCertificates(shell.id, userId)
      : Promise.resolve(new Map<string, string>()),
  ]);
  const certificateCode = certificates.get(course.id);

  return (
    <div className="mx-auto grid w-full max-w-app gap-8 px-4 py-8 lg:grid-cols-3">
      <aside aria-labelledby="outline-heading" className="flex flex-col gap-4 lg:order-last">
        <div className="flex flex-col gap-2 rounded-card bg-bg-secondary p-4">
          <NextLink
            href={`/courses/${course.slug}`}
            className="self-start rounded-sm text-headline underline-offset-2 focus-ring hover:underline"
          >
            {course.title}
          </NextLink>
          <ProgressBar
            label={t("learn.progress")}
            value={state.percent}
            aria-valuetext={t("learn.percent", { value: state.percent })}
          />
        </div>
        <nav aria-labelledby="outline-heading" className="flex flex-col gap-3">
          <h2 id="outline-heading" className="text-headline">
            {t("learn.outline")}
          </h2>
          {course.sections.map((s) => (
            <div key={s.id} className="flex flex-col gap-1">
              <h3 className="text-footnote text-label-secondary uppercase">{s.title}</h3>
              <ol className="flex flex-col">
                {s.lessons.map((l) => {
                  const isDone = state.completed.has(l.id);
                  const current = l.id === lesson.id;
                  return (
                    <li key={l.id}>
                      <NextLink
                        href={`/learn/${course.slug}/${l.id}`}
                        aria-current={current ? "page" : undefined}
                        className={cx(
                          "flex min-h-touch items-center gap-2 rounded-control px-2 text-subheadline focus-ring",
                          current
                            ? "bg-accent-tint font-semibold text-accent-text-on-tint"
                            : "hover:bg-fill",
                        )}
                      >
                        <Icon
                          icon={isDone ? CircleCheck : l.kind === "quiz" ? ListChecks : Circle}
                          size={16}
                          className={
                            isDone ? "shrink-0 text-green-text" : "shrink-0 text-label-secondary"
                          }
                        />
                        <span className="flex-1">{l.title}</span>
                        {isDone && <span className="sr-only">({t("learn.done")})</span>}
                      </NextLink>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </nav>
      </aside>

      <article aria-labelledby="lesson-title" className="flex min-w-0 flex-col gap-6 lg:col-span-2">
        <div className="flex flex-col gap-1">
          <p className="text-footnote text-label-secondary">
            {t("learn.lessonOf", { n: index + 1, total: order.length })}
          </p>
          <h1 id="lesson-title" className="text-large-title tracking-tight">
            {lesson.title}
          </h1>
        </div>

        {certificateCode && (
          <Banner
            tone="success"
            title={t("learn.courseComplete")}
            action={
              <PrimaryLink href={`/verify/${certificateCode}`} variant="tinted">
                {t("learn.certificate")}
              </PrimaryLink>
            }
          />
        )}

        {embed && (
          <div className="aspect-video overflow-hidden rounded-card bg-bg-secondary">
            <iframe
              src={embed}
              title={t("learn.videoTitle", { title: lesson.title })}
              className="size-full"
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              allow="encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          </div>
        )}

        {lesson.body && <LessonBody blocks={parseBody(lesson.body)} />}

        {lesson.kind === "content" && lesson.pdfUrl && (
          <a
            href={lesson.pdfUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="flex min-h-touch items-center gap-2 self-start rounded-control bg-accent-tint px-4 text-body font-semibold text-accent-text-on-tint focus-ring"
          >
            <Icon icon={FileDown} size={20} />
            {t("learn.pdf")}
          </a>
        )}

        {lesson.kind === "quiz" &&
          (lesson.quiz ? (
            <>
              {attempts && attempts.attempts > 0 && (
                <p className="text-subheadline text-label-secondary">
                  {t("quiz.attempts", { count: attempts.attempts })}
                  {attempts.bestScore !== null &&
                    ` · ${t("quiz.best", { score: attempts.bestScore })}`}
                  {` · ${t("quiz.attemptsLeft", { count: Math.max(0, QUIZ_MAX_ATTEMPTS - attempts.attempts) })}`}
                </p>
              )}
              {attempts && attempts.attempts >= QUIZ_MAX_ATTEMPTS ? (
                <Banner
                  tone={attempts.passed ? "success" : "warning"}
                  title={attempts.passed ? t("quiz.passed") : t("errors.limit_reached")}
                />
              ) : (
                <QuizForm
                  courseId={course.id}
                  lessonId={lesson.id}
                  quiz={publicQuiz(lesson.quiz)}
                  action={submitQuizAction}
                />
              )}
            </>
          ) : (
            <Banner tone="info" title={t("learn.notReady")} />
          ))}

        <div className="flex flex-wrap items-center gap-3 hairline-t pt-6">
          {lesson.kind === "content" &&
            (done ? (
              <p className="flex items-center gap-2 text-body text-green-text">
                <Icon icon={CircleCheck} size={20} />
                {t("learn.isComplete")}
              </p>
            ) : (
              <ActionForm
                action={completeLessonAction}
                successMessage={t("learn.markedComplete")}
                redirectTo={next ? `/learn/${course.slug}/${next.id}` : undefined}
              >
                <input type="hidden" name="courseId" value={course.id} />
                <input type="hidden" name="lessonId" value={lesson.id} />
                <Button type="submit" size="large">
                  {t("learn.markComplete")}
                </Button>
              </ActionForm>
            ))}
          <div className="ms-auto flex gap-2">
            {prev && (
              <PrimaryLink href={`/learn/${course.slug}/${prev.id}`} variant="tinted">
                {t("learn.previous")}
              </PrimaryLink>
            )}
            {next && (
              <PrimaryLink href={`/learn/${course.slug}/${next.id}`} variant="tinted">
                {t("learn.next")}
              </PrimaryLink>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}
