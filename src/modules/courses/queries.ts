import { and, asc, desc, eq, ilike, isNull, or, type SQL } from "drizzle-orm";
import { courseCategories, courseSections, courses, lessons, type LessonKind } from "@/db/schema";
import { logger } from "@/lib/logger";
import { withTenant, type TenantTx } from "@/modules/tenancy";
import { quizSchema, type Quiz } from "./content";

/** Reads for the catalog, the course page, the player and the editor. Always tenant-scoped. */

export interface CourseSummary {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string | null;
  status: "draft" | "published";
  enrollmentMode: "open" | "invite_only";
  ownerId: string | null;
  updatedAt: Date;
}

export interface OutlineLesson {
  id: string;
  title: string;
  kind: LessonKind;
}
export interface OutlineSection {
  id: string;
  title: string;
  lessons: OutlineLesson[];
}
export interface CourseDetail extends CourseSummary {
  sections: OutlineSection[];
}

export interface LessonDetail {
  id: string;
  courseId: string;
  sectionId: string;
  title: string;
  kind: LessonKind;
  body: string;
  videoUrl: string | null;
  pdfUrl: string | null;
  quiz: Quiz | null;
}

const summaryColumns = {
  id: courses.id,
  slug: courses.slug,
  title: courses.title,
  summary: courses.summary,
  category: courseCategories.name,
  status: courses.status,
  enrollmentMode: courses.enrollmentMode,
  ownerId: courses.ownerId,
  updatedAt: courses.updatedAt,
};

/** Escapes LIKE wildcards so a search for "50%" means the literal text. */
export function likePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

async function listCourses(tx: TenantTx, where: SQL | undefined): Promise<CourseSummary[]> {
  return tx
    .select(summaryColumns)
    .from(courses)
    .leftJoin(
      courseCategories,
      and(
        eq(courseCategories.tenantId, courses.tenantId),
        eq(courseCategories.id, courses.categoryId),
      ),
    )
    .where(and(isNull(courses.deletedAt), where))
    .orderBy(desc(courses.publishedAt), asc(courses.title));
}

/** Published courses, optionally filtered by a search term (title, summary, category). */
export function listPublishedCourses(tenantId: string, query = ""): Promise<CourseSummary[]> {
  const q = query.trim().slice(0, 100);
  return withTenant({ tenantId }, (tx) =>
    listCourses(
      tx,
      and(
        eq(courses.status, "published"),
        q
          ? or(
              ilike(courses.title, likePattern(q)),
              ilike(courses.summary, likePattern(q)),
              ilike(courseCategories.name, likePattern(q)),
            )
          : undefined,
      ),
    ),
  );
}

/** Every course for the authoring list; `ownerId` limits it to one author's courses. */
export function listAllCourses(tenantId: string, ownerId?: string): Promise<CourseSummary[]> {
  return withTenant({ tenantId }, (tx) =>
    listCourses(tx, ownerId ? eq(courses.ownerId, ownerId) : undefined),
  );
}

export async function loadOutline(tx: TenantTx, courseId: string): Promise<OutlineSection[]> {
  const sectionRows = await tx
    .select({ id: courseSections.id, title: courseSections.title })
    .from(courseSections)
    .where(and(eq(courseSections.courseId, courseId), isNull(courseSections.deletedAt)))
    .orderBy(asc(courseSections.position), asc(courseSections.id));
  const lessonRows = await tx
    .select({
      id: lessons.id,
      title: lessons.title,
      kind: lessons.kind,
      sectionId: lessons.sectionId,
    })
    .from(lessons)
    .where(and(eq(lessons.courseId, courseId), isNull(lessons.deletedAt)))
    .orderBy(asc(lessons.position), asc(lessons.id));
  return sectionRows.map((s) => ({
    ...s,
    lessons: lessonRows
      .filter((l) => l.sectionId === s.id)
      .map(({ id, title, kind }) => ({ id, title, kind })),
  }));
}

async function detail(tx: TenantTx, where: SQL): Promise<CourseDetail | null> {
  const [course] = await listCourses(tx, where);
  if (!course) return null;
  return { ...course, sections: await loadOutline(tx, course.id) };
}

/** A published course by slug, with its outline (catalog course page and player). */
export function getPublishedCourse(tenantId: string, slug: string): Promise<CourseDetail | null> {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return Promise.resolve(null);
  return withTenant({ tenantId }, (tx) =>
    detail(tx, and(eq(courses.slug, slug), eq(courses.status, "published"))!),
  );
}

/** Any course by id, with its outline (editor). */
export function getCourseForEditing(
  tenantId: string,
  courseId: string,
): Promise<CourseDetail | null> {
  return withTenant({ tenantId }, (tx) => detail(tx, eq(courses.id, courseId)));
}

export async function loadLesson(
  tx: TenantTx,
  courseId: string,
  lessonId: string,
): Promise<LessonDetail | null> {
  const [row] = await tx
    .select({
      id: lessons.id,
      courseId: lessons.courseId,
      sectionId: lessons.sectionId,
      title: lessons.title,
      kind: lessons.kind,
      body: lessons.body,
      videoUrl: lessons.videoUrl,
      pdfUrl: lessons.pdfUrl,
      quiz: lessons.quiz,
    })
    .from(lessons)
    .where(
      and(eq(lessons.id, lessonId), eq(lessons.courseId, courseId), isNull(lessons.deletedAt)),
    );
  if (!row) return null;
  let quiz: Quiz | null = null;
  if (row.kind === "quiz" && row.quiz) {
    const parsed = quizSchema.safeParse(row.quiz);
    if (parsed.success) quiz = parsed.data;
    else logger.warn({ lessonId: row.id }, "stored quiz is invalid");
  }
  return { ...row, quiz };
}

export function getLessonForEditing(
  tenantId: string,
  courseId: string,
  lessonId: string,
): Promise<LessonDetail | null> {
  return withTenant({ tenantId }, (tx) => loadLesson(tx, courseId, lessonId));
}

export function listCategories(tenantId: string): Promise<string[]> {
  return withTenant({ tenantId }, async (tx) =>
    (
      await tx
        .select({ name: courseCategories.name })
        .from(courseCategories)
        .where(isNull(courseCategories.deletedAt))
        .orderBy(asc(courseCategories.name))
    ).map((r) => r.name),
  );
}
