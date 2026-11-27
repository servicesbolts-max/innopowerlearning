import { and, count, desc, eq, isNull, max } from "drizzle-orm";
import { quizAttempts } from "@/db/schema";
import { uuidv7 } from "@/lib/ids";
import { gradeQuiz, type Quiz, type QuizAnswers } from "@/modules/courses";
import { withTenant, type TenantTx } from "@/modules/tenancy";

/** Quiz attempts (MVP slice M4). Grading happens here, against the stored answer key. */

/** Attempts per learner and quiz (security review: unlimited retakes leak the key). */
export const QUIZ_MAX_ATTEMPTS = 5;

export async function countAttempts(tx: TenantTx, enrollmentId: string, lessonId: string) {
  const [row] = await tx
    .select({ n: count() })
    .from(quizAttempts)
    .where(
      and(
        eq(quizAttempts.enrollmentId, enrollmentId),
        eq(quizAttempts.lessonId, lessonId),
        isNull(quizAttempts.deletedAt),
      ),
    );
  return row?.n ?? 0;
}

export async function recordAttempt(
  tx: TenantTx,
  tenantId: string,
  input: {
    enrollmentId: string;
    lessonId: string;
    userId: string;
    quiz: Quiz;
    answers: QuizAnswers;
  },
) {
  // Keep only answers to real questions and real options.
  const clean: QuizAnswers = {};
  for (const q of input.quiz.questions) {
    const valid = new Set(q.options.map((o) => o.id));
    const given = [...new Set(input.answers[q.id] ?? [])].filter((id) => valid.has(id));
    clean[q.id] = q.kind === "single" ? given.slice(0, 1) : given;
  }
  const result = gradeQuiz(input.quiz, clean);
  const id = uuidv7();
  await tx.insert(quizAttempts).values({
    tenantId,
    id,
    enrollmentId: input.enrollmentId,
    lessonId: input.lessonId,
    answers: clean,
    score: result.score,
    passed: result.passed,
    createdBy: input.userId,
  });
  return { id, ...result };
}

export interface AttemptSummary {
  attempts: number;
  bestScore: number | null;
  passed: boolean;
  lastScore: number | null;
}

export function attemptSummary(
  tenantId: string,
  enrollmentId: string,
  lessonId: string,
): Promise<AttemptSummary> {
  return withTenant({ tenantId }, async (tx) => {
    const where = and(
      eq(quizAttempts.enrollmentId, enrollmentId),
      eq(quizAttempts.lessonId, lessonId),
      isNull(quizAttempts.deletedAt),
    );
    const [agg] = await tx
      .select({ n: count(), best: max(quizAttempts.score) })
      .from(quizAttempts)
      .where(where);
    const [last] = await tx
      .select({ score: quizAttempts.score })
      .from(quizAttempts)
      .where(where)
      .orderBy(desc(quizAttempts.createdAt), desc(quizAttempts.id))
      .limit(1);
    const [anyPass] = await tx
      .select({ id: quizAttempts.id })
      .from(quizAttempts)
      .where(and(where, eq(quizAttempts.passed, true)))
      .limit(1);
    return {
      attempts: agg?.n ?? 0,
      bestScore: agg?.best ?? null,
      passed: !!anyPass,
      lastScore: last?.score ?? null,
    };
  });
}
