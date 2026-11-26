import { and, asc, eq, isNull, like, sql } from "drizzle-orm";
import { z } from "zod";
import {
  courseCategories,
  courseSections,
  courses,
  ENROLLMENT_MODES,
  lessons,
  LESSON_KINDS,
} from "@/db/schema";
import { uuidv7 } from "@/lib/ids";
import type { TenantTx } from "@/modules/tenancy";
import { quizSchema, safeHttpsUrl, slugify, videoEmbedUrl } from "./content";

/**
 * Course authoring (MVP slice M1). Every function runs inside the caller's tenant transaction
 * (defineAction), so the change and its audit entry commit together. Ids from the client are
 * always re-checked against the course they claim to belong to.
 */

const optionalUrl = (check: (v: string) => boolean, message: string) =>
  z
    .string()
    .trim()
    .max(500)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .refine((v) => v === null || check(v), { message });

/** A form posts the quiz as a JSON string; an empty or malformed value is null. */
function jsonField(v: unknown): unknown {
  if (typeof v !== "string") return v ?? null;
  if (v.trim() === "") return null;
  try {
    return JSON.parse(v);
  } catch {
    return { invalid: true };
  }
}

export const courseInputSchema = z.object({
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().max(1000).default(""),
  categoryName: z.string().trim().max(80).default(""),
  enrollmentMode: z.enum(ENROLLMENT_MODES).default("open"),
});
export type CourseInput = z.infer<typeof courseInputSchema>;

export const lessonInputSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    kind: z.enum(LESSON_KINDS),
    body: z.string().max(50000).default(""),
    videoUrl: optionalUrl((v) => videoEmbedUrl(v) !== null, "video_url").default(null),
    pdfUrl: optionalUrl((v) => safeHttpsUrl(v) !== null, "pdf_url").default(null),
    quiz: z.preprocess(jsonField, quizSchema.nullable()).default(null),
  })
  .refine((l) => l.kind !== "quiz" || l.quiz !== null, {
    message: "quiz_required",
    path: ["quiz"],
  });
export type LessonInput = z.infer<typeof lessonInputSchema>;

async function categoryIdFor(tx: TenantTx, tenantId: string, name: string, actor: string) {
  if (!name) return null;
  const [existing] = await tx
    .select({ id: courseCategories.id })
    .from(courseCategories)
    .where(eq(courseCategories.name, name));
  if (existing) return existing.id;
  const id = uuidv7();
  await tx.insert(courseCategories).values({ tenantId, id, name, createdBy: actor });
  return id;
}

async function uniqueSlug(tx: TenantTx, title: string): Promise<string> {
  const base = slugify(title);
  const rows = await tx
    .select({ slug: courses.slug })
    .from(courses)
    .where(like(courses.slug, `${base}%`));
  const taken = new Set(rows.map((r) => r.slug));
  if (!taken.has(base)) return base;
  for (let n = 2; n < 1000; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
  return `${base}-${uuidv7().slice(-8)}`;
}

export async function createCourse(
  tx: TenantTx,
  tenantId: string,
  actor: string,
  input: CourseInput,
): Promise<{ id: string; slug: string }> {
  const id = uuidv7();
  const slug = await uniqueSlug(tx, input.title);
  await tx.insert(courses).values({
    tenantId,
    id,
    slug,
    title: input.title,
    summary: input.summary,
    categoryId: await categoryIdFor(tx, tenantId, input.categoryName, actor),
    status: "draft",
    enrollmentMode: input.enrollmentMode,
    ownerId: actor,
    createdBy: actor,
  });
  return { id, slug };
}

export async function updateCourse(
  tx: TenantTx,
  tenantId: string,
  actor: string,
  courseId: string,
  input: CourseInput,
) {
  await tx
    .update(courses)
    .set({
      title: input.title,
      summary: input.summary,
      enrollmentMode: input.enrollmentMode,
      categoryId: await categoryIdFor(tx, tenantId, input.categoryName, actor),
    })
    .where(and(eq(courses.id, courseId), isNull(courses.deletedAt)));
}

export async function setCourseStatus(
  tx: TenantTx,
  courseId: string,
  status: "draft" | "published",
) {
  await tx
    .update(courses)
    .set({ status, publishedAt: status === "published" ? new Date() : null })
    .where(and(eq(courses.id, courseId), isNull(courses.deletedAt)));
}

/** Owner of a live course, for can() own-scope checks; null when it does not exist here. */
export async function courseOwner(
  tx: TenantTx,
  courseId: string,
): Promise<{ ownerId: string | null } | null> {
  const [row] = await tx
    .select({ ownerId: courses.ownerId })
    .from(courses)
    .where(and(eq(courses.id, courseId), isNull(courses.deletedAt)));
  return row ?? null;
}

async function nextPosition(
  tx: TenantTx,
  table: typeof courseSections | typeof lessons,
  where: ReturnType<typeof and>,
) {
  const [row] = await tx
    .select({ max: sql<number>`coalesce(max(${table.position}), -1)` })
    .from(table)
    .where(where);
  return Number(row?.max ?? -1) + 1;
}

export async function addSection(
  tx: TenantTx,
  tenantId: string,
  actor: string,
  courseId: string,
  title: string,
) {
  const id = uuidv7();
  const position = await nextPosition(
    tx,
    courseSections,
    and(eq(courseSections.courseId, courseId), isNull(courseSections.deletedAt)),
  );
  await tx
    .insert(courseSections)
    .values({ tenantId, id, courseId, title, position, createdBy: actor });
  return { id };
}

/** A live section of this course, or null (ids from the client are never trusted alone). */
async function sectionInCourse(tx: TenantTx, courseId: string, sectionId: string) {
  const [row] = await tx
    .select({ id: courseSections.id })
    .from(courseSections)
    .where(
      and(
        eq(courseSections.id, sectionId),
        eq(courseSections.courseId, courseId),
        isNull(courseSections.deletedAt),
      ),
    );
  return row ?? null;
}

export async function lessonInCourse(tx: TenantTx, courseId: string, lessonId: string) {
  const [row] = await tx
    .select({ id: lessons.id, sectionId: lessons.sectionId })
    .from(lessons)
    .where(
      and(eq(lessons.id, lessonId), eq(lessons.courseId, courseId), isNull(lessons.deletedAt)),
    );
  return row ?? null;
}

export async function renameSection(
  tx: TenantTx,
  courseId: string,
  sectionId: string,
  title: string,
) {
  if (!(await sectionInCourse(tx, courseId, sectionId))) return false;
  await tx.update(courseSections).set({ title }).where(eq(courseSections.id, sectionId));
  return true;
}

export async function removeSection(tx: TenantTx, courseId: string, sectionId: string) {
  if (!(await sectionInCourse(tx, courseId, sectionId))) return false;
  const now = new Date();
  await tx.update(lessons).set({ deletedAt: now }).where(eq(lessons.sectionId, sectionId));
  await tx.update(courseSections).set({ deletedAt: now }).where(eq(courseSections.id, sectionId));
  return true;
}

/** Swaps an item with its neighbour, then renumbers the list 0..n-1. */
function swapOrder(ids: string[], id: string, direction: "up" | "down"): string[] | null {
  const i = ids.indexOf(id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ids.length) return null;
  const next = [...ids];
  [next[i], next[j]] = [next[j]!, next[i]!];
  return next;
}

export async function moveSection(
  tx: TenantTx,
  courseId: string,
  sectionId: string,
  direction: "up" | "down",
) {
  const rows = await tx
    .select({ id: courseSections.id })
    .from(courseSections)
    .where(and(eq(courseSections.courseId, courseId), isNull(courseSections.deletedAt)))
    .orderBy(asc(courseSections.position), asc(courseSections.id));
  const order = swapOrder(
    rows.map((r) => r.id),
    sectionId,
    direction,
  );
  if (!order) return false;
  for (const [position, id] of order.entries()) {
    await tx.update(courseSections).set({ position }).where(eq(courseSections.id, id));
  }
  return true;
}

export async function addLesson(
  tx: TenantTx,
  tenantId: string,
  actor: string,
  courseId: string,
  sectionId: string,
  input: LessonInput,
) {
  if (!(await sectionInCourse(tx, courseId, sectionId))) return null;
  const id = uuidv7();
  const position = await nextPosition(
    tx,
    lessons,
    and(eq(lessons.sectionId, sectionId), isNull(lessons.deletedAt)),
  );
  await tx.insert(lessons).values({
    tenantId,
    id,
    courseId,
    sectionId,
    position,
    createdBy: actor,
    ...lessonColumns(input),
  });
  return { id };
}

function lessonColumns(input: LessonInput) {
  return {
    title: input.title,
    kind: input.kind,
    body: input.body,
    videoUrl: input.kind === "content" ? input.videoUrl : null,
    pdfUrl: input.kind === "content" ? input.pdfUrl : null,
    quiz: input.kind === "quiz" ? input.quiz : null,
  };
}

export async function updateLesson(
  tx: TenantTx,
  courseId: string,
  lessonId: string,
  input: LessonInput,
) {
  if (!(await lessonInCourse(tx, courseId, lessonId))) return false;
  await tx.update(lessons).set(lessonColumns(input)).where(eq(lessons.id, lessonId));
  return true;
}

export async function removeLesson(tx: TenantTx, courseId: string, lessonId: string) {
  if (!(await lessonInCourse(tx, courseId, lessonId))) return false;
  await tx.update(lessons).set({ deletedAt: new Date() }).where(eq(lessons.id, lessonId));
  return true;
}

export async function moveLesson(
  tx: TenantTx,
  courseId: string,
  lessonId: string,
  direction: "up" | "down",
) {
  const lesson = await lessonInCourse(tx, courseId, lessonId);
  if (!lesson) return false;
  const rows = await tx
    .select({ id: lessons.id })
    .from(lessons)
    .where(and(eq(lessons.sectionId, lesson.sectionId), isNull(lessons.deletedAt)))
    .orderBy(asc(lessons.position), asc(lessons.id));
  const order = swapOrder(
    rows.map((r) => r.id),
    lessonId,
    direction,
  );
  if (!order) return false;
  for (const [position, id] of order.entries()) {
    await tx.update(lessons).set({ position }).where(eq(lessons.id, id));
  }
  return true;
}

export const __test = { swapOrder };
