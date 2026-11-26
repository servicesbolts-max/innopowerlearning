"use server";

import { z } from "zod";
import { recordAttempt } from "@/modules/assessments";
import { ActionFailure, defineAction } from "@/modules/auth";
import {
  completeLesson,
  enroll,
  enrollableCourse,
  findEnrollment,
  loadLesson,
  quizAnswersSchema,
  type Enrollment,
} from "@/modules/courses";
import { issueCertificate } from "@/modules/credentials";
import type { TenantTx } from "@/modules/tenancy";

/**
 * Learner actions (MVP slices M2 to M5). The learner is always the session's user; course and
 * lesson ids are re-checked inside the tenant transaction, and quizzes are graded on the server.
 */
const courseId = z.uuid();

export const enrollAction = defineAction(
  {
    schema: z.object({ courseId }),
    permission: "course.learn",
    audit: (i, r: { id: string; created: boolean }) =>
      r.created
        ? {
            action: "enrollment.created",
            target: { type: "enrollment", id: r.id },
            metadata: { courseId: i.courseId, mode: "open" },
          }
        : null,
  },
  async ({ tx, input, actor }) => {
    const course = await enrollableCourse(tx, input.courseId);
    // Invite-only courses are enrolled by course staff, never by the learner.
    if (!course || course.enrollmentMode !== "open") throw new ActionFailure("forbidden");
    return enroll(tx, actor.tenantId, input.courseId, actor.userId, actor.userId);
  },
);

/** The learner's enrollment in a published course, or a refusal. */
async function ownEnrollment(tx: TenantTx, courseId: string, userId: string) {
  const course = await enrollableCourse(tx, courseId);
  const enrollment = course ? await findEnrollment(tx, courseId, userId) : null;
  if (!course || !enrollment) throw new ActionFailure("forbidden");
  return { course, enrollment };
}

/** Records progress and issues the certificate when the course is now complete. */
async function progress(
  tx: TenantTx,
  tenantId: string,
  userId: string,
  course: { id: string; title: string },
  enrollment: Enrollment,
  lessonId: string,
) {
  const { courseCompleted } = await completeLesson(tx, tenantId, enrollment, lessonId, userId);
  const certificate = courseCompleted
    ? await issueCertificate(tx, tenantId, {
        enrollmentId: enrollment.id,
        courseId: course.id,
        userId,
        courseTitle: course.title,
      })
    : null;
  return {
    courseCompleted,
    certificateCode: certificate?.code ?? null,
    certificateId: certificate?.id ?? null,
  };
}

type ProgressResult = Awaited<ReturnType<typeof progress>>;

export const completeLessonAction = defineAction(
  {
    schema: z.object({ courseId, lessonId: z.uuid() }),
    permission: "course.learn",
    audit: (i, r: ProgressResult) => ({
      action: r.courseCompleted ? "course.completed" : "lesson.completed",
      target: { type: "course", id: i.courseId },
      metadata: { lessonId: i.lessonId, certificateId: r.certificateId },
    }),
  },
  async ({ tx, input, actor }) => {
    const { course, enrollment } = await ownEnrollment(tx, input.courseId, actor.userId);
    const lesson = await loadLesson(tx, input.courseId, input.lessonId);
    // Quiz lessons are completed by passing the quiz, not by this button.
    if (!lesson || lesson.kind !== "content") throw new ActionFailure("invalid_input");
    return progress(tx, actor.tenantId, actor.userId, course, enrollment, lesson.id);
  },
);

export const submitQuizAction = defineAction(
  {
    schema: z.object({ courseId, lessonId: z.uuid(), answers: quizAnswersSchema }),
    permission: "course.learn",
    audit: (i, r: ProgressResult & { attemptId: string; score: number; passed: boolean }) => ({
      action: "quiz.attempted",
      target: { type: "quiz_attempt", id: r.attemptId },
      metadata: {
        lessonId: i.lessonId,
        score: r.score,
        passed: r.passed,
        courseCompleted: r.courseCompleted,
        certificateId: r.certificateId,
      },
    }),
  },
  async ({ tx, input, actor }) => {
    const { course, enrollment } = await ownEnrollment(tx, input.courseId, actor.userId);
    const lesson = await loadLesson(tx, input.courseId, input.lessonId);
    if (!lesson || lesson.kind !== "quiz" || !lesson.quiz) throw new ActionFailure("invalid_input");
    const attempt = await recordAttempt(tx, actor.tenantId, {
      enrollmentId: enrollment.id,
      lessonId: lesson.id,
      userId: actor.userId,
      quiz: lesson.quiz,
      answers: input.answers,
    });
    const done = attempt.passed
      ? await progress(tx, actor.tenantId, actor.userId, course, enrollment, lesson.id)
      : { courseCompleted: false, certificateCode: null, certificateId: null };
    return {
      ...done,
      attemptId: attempt.id,
      score: attempt.score,
      passed: attempt.passed,
      correctCount: attempt.correctCount,
      total: attempt.total,
    };
  },
);
