import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import {
  courseSections,
  courses,
  enrollments,
  lessonProgress,
  lessons,
  memberships,
  users,
} from "@/db/schema";
import { uuidv7 } from "@/lib/ids";
import { withTenant, type TenantTx } from "@/modules/tenancy";
import { progressPercent } from "./content";
import { loadLesson, loadOutline, type LessonDetail, type OutlineSection } from "./queries";

/**
 * Enrollment and progress (MVP slices M2 and M3). Learners only ever reach their own rows: every
 * function takes the user id from the validated session, never from input.
 */

export interface Enrollment {
  id: string;
  courseId: string;
  status: "active" | "completed";
  lastLessonId: string | null;
  completedAt: Date | null;
}

const enrollmentColumns = {
  id: enrollments.id,
  courseId: enrollments.courseId,
  status: enrollments.status,
  lastLessonId: enrollments.lastLessonId,
  completedAt: enrollments.completedAt,
};

export async function findEnrollment(
  tx: TenantTx,
  courseId: string,
  userId: string,
): Promise<Enrollment | null> {
  const [row] = await tx
    .select(enrollmentColumns)
    .from(enrollments)
    .where(
      and(
        eq(enrollments.courseId, courseId),
        eq(enrollments.userId, userId),
        isNull(enrollments.deletedAt),
      ),
    );
  return row ?? null;
}

export function getEnrollment(tenantId: string, courseId: string, userId: string) {
  return withTenant({ tenantId }, (tx) => findEnrollment(tx, courseId, userId));
}

/** A published, live course and its enrollment mode, or null. */
export async function enrollableCourse(tx: TenantTx, courseId: string) {
  const [row] = await tx
    .select({ id: courses.id, enrollmentMode: courses.enrollmentMode, title: courses.title })
    .from(courses)
    .where(
      and(eq(courses.id, courseId), eq(courses.status, "published"), isNull(courses.deletedAt)),
    );
  return row ?? null;
}

/** Enrolls a user (idempotent). Returns the enrollment id and whether it is new. */
export async function enroll(
  tx: TenantTx,
  tenantId: string,
  courseId: string,
  userId: string,
  by: string,
): Promise<{ id: string; created: boolean }> {
  const existing = await findEnrollment(tx, courseId, userId);
  if (existing) return { id: existing.id, created: false };
  const id = uuidv7();
  const inserted = await tx
    .insert(enrollments)
    .values({ tenantId, id, courseId, userId, status: "active", createdBy: by })
    .onConflictDoNothing()
    .returning({ id: enrollments.id });
  if (inserted.length > 0) return { id, created: true };
  // Raced with another request: return the row that won.
  const again = await findEnrollment(tx, courseId, userId);
  return { id: again!.id, created: false };
}

async function liveLessonIds(tx: TenantTx, courseId: string): Promise<string[]> {
  const rows = await tx
    .select({ id: lessons.id })
    .from(lessons)
    .innerJoin(
      courseSections,
      and(eq(courseSections.tenantId, lessons.tenantId), eq(courseSections.id, lessons.sectionId)),
    )
    .where(
      and(
        eq(lessons.courseId, courseId),
        isNull(lessons.deletedAt),
        isNull(courseSections.deletedAt),
      ),
    );
  return rows.map((r) => r.id);
}

async function completedLessonIds(tx: TenantTx, enrollmentId: string): Promise<Set<string>> {
  const rows = await tx
    .select({ lessonId: lessonProgress.lessonId })
    .from(lessonProgress)
    .where(and(eq(lessonProgress.enrollmentId, enrollmentId), isNull(lessonProgress.deletedAt)));
  return new Set(rows.map((r) => r.lessonId));
}

/**
 * Marks a lesson complete for an enrollment (idempotent) and completes the enrollment once every
 * live lesson is done. Returns whether this call completed the course.
 */
export async function completeLesson(
  tx: TenantTx,
  tenantId: string,
  enrollment: Enrollment,
  lessonId: string,
  userId: string,
): Promise<{ courseCompleted: boolean }> {
  await tx
    .insert(lessonProgress)
    .values({ tenantId, id: uuidv7(), enrollmentId: enrollment.id, lessonId, createdBy: userId })
    .onConflictDoNothing();
  await tx
    .update(enrollments)
    .set({ lastLessonId: lessonId })
    .where(eq(enrollments.id, enrollment.id));
  if (enrollment.status === "completed") return { courseCompleted: false };
  const all = await liveLessonIds(tx, enrollment.courseId);
  const done = await completedLessonIds(tx, enrollment.id);
  if (all.length === 0 || !all.every((id) => done.has(id))) return { courseCompleted: false };
  await tx
    .update(enrollments)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(enrollments.id, enrollment.id));
  return { courseCompleted: true };
}

/** Where "continue" goes: the first incomplete lesson after the last one completed. */
export function resumeLesson(
  sections: OutlineSection[],
  completed: ReadonlySet<string>,
  lastLessonId: string | null,
): string | null {
  const order = sections.flatMap((s) => s.lessons.map((l) => l.id));
  if (order.length === 0) return null;
  const start = lastLessonId ? order.indexOf(lastLessonId) + 1 : 0;
  const rotated = [...order.slice(start), ...order.slice(0, start)];
  return rotated.find((id) => !completed.has(id)) ?? lastLessonId ?? order[0]!;
}

export interface LearningItem {
  courseId: string;
  slug: string;
  title: string;
  status: "active" | "completed";
  percent: number;
  resumeLessonId: string | null;
}

/** My learning: the user's enrollments with progress. */
export function listMyLearning(tenantId: string, userId: string): Promise<LearningItem[]> {
  return withTenant({ tenantId }, async (tx) => {
    const rows = await tx
      .select({
        ...enrollmentColumns,
        slug: courses.slug,
        title: courses.title,
      })
      .from(enrollments)
      .innerJoin(
        courses,
        and(eq(courses.tenantId, enrollments.tenantId), eq(courses.id, enrollments.courseId)),
      )
      .where(
        and(
          eq(enrollments.userId, userId),
          isNull(enrollments.deletedAt),
          isNull(courses.deletedAt),
          eq(courses.status, "published"),
        ),
      )
      .orderBy(desc(enrollments.updatedAt));
    const items: LearningItem[] = [];
    for (const row of rows) {
      const outline = await loadOutline(tx, row.courseId);
      const done = await completedLessonIds(tx, row.id);
      const ids = outline.flatMap((s) => s.lessons.map((l) => l.id));
      items.push({
        courseId: row.courseId,
        slug: row.slug,
        title: row.title,
        status: row.status,
        percent:
          row.status === "completed"
            ? 100
            : progressPercent(ids.filter((id) => done.has(id)).length, ids.length),
        resumeLessonId: resumeLesson(outline, done, row.lastLessonId),
      });
    }
    return items;
  });
}

export interface PlayerState {
  enrollment: Enrollment;
  completed: Set<string>;
  percent: number;
  resumeLessonId: string | null;
  lesson: LessonDetail | null;
}

/** Everything the player needs for one lesson of an enrolled course. */
export function loadPlayer(
  tenantId: string,
  userId: string,
  course: { id: string; sections: OutlineSection[] },
  lessonId: string | null,
): Promise<PlayerState | null> {
  return withTenant({ tenantId }, async (tx) => {
    const enrollment = await findEnrollment(tx, course.id, userId);
    if (!enrollment) return null;
    const completed = await completedLessonIds(tx, enrollment.id);
    const ids = course.sections.flatMap((s) => s.lessons.map((l) => l.id));
    const lesson =
      lessonId && ids.includes(lessonId) ? await loadLesson(tx, course.id, lessonId) : null;
    return {
      enrollment,
      completed,
      percent:
        enrollment.status === "completed"
          ? 100
          : progressPercent(ids.filter((id) => completed.has(id)).length, ids.length),
      resumeLessonId: resumeLesson(course.sections, completed, enrollment.lastLessonId),
      lesson,
    };
  });
}

/** Counts for the admin dashboard. */
export function learningCounts(tenantId: string) {
  return withTenant({ tenantId }, async (tx) => {
    const [all] = await tx
      .select({ n: count() })
      .from(enrollments)
      .where(isNull(enrollments.deletedAt));
    const [done] = await tx
      .select({ n: count() })
      .from(enrollments)
      .where(and(isNull(enrollments.deletedAt), eq(enrollments.status, "completed")));
    const [courseRow] = await tx
      .select({
        total: count(),
        published: sql<number>`count(*) filter (where ${courses.status} = 'published')`,
      })
      .from(courses)
      .where(isNull(courses.deletedAt));
    return {
      enrollments: all?.n ?? 0,
      completions: done?.n ?? 0,
      courses: courseRow?.total ?? 0,
      published: Number(courseRow?.published ?? 0),
    };
  });
}

/** An active member's user id by email address, in this tenant only (staff enrollment). */
export async function memberIdByEmail(tx: TenantTx, email: string): Promise<string | null> {
  const [row] = await tx
    .select({ id: users.id })
    .from(users)
    .innerJoin(memberships, and(eq(memberships.userId, users.id), isNull(memberships.deletedAt)))
    .where(and(eq(users.email, email.trim().toLowerCase()), eq(memberships.status, "active")));
  return row?.id ?? null;
}
