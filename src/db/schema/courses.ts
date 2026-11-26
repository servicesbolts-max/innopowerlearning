import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/** Drizzle mirror of src/db/migrations/0007_courses.sql and later learning tables. */
const ts = (name: string) => timestamp(name, { withTimezone: true });
const audit = {
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
  createdBy: uuid("created_by"),
  deletedAt: ts("deleted_at"),
};

export const COURSE_STATUSES = ["draft", "published"] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];
export const ENROLLMENT_MODES = ["open", "invite_only"] as const;
export type EnrollmentMode = (typeof ENROLLMENT_MODES)[number];
export const LESSON_KINDS = ["content", "quiz"] as const;
export type LessonKind = (typeof LESSON_KINDS)[number];

export const courseCategories = pgTable(
  "course_categories",
  {
    tenantId: uuid("tenant_id").notNull(),
    id: uuid("id").notNull(),
    name: text("name").notNull(),
    ...audit,
  },
  (t) => [primaryKey({ columns: [t.tenantId, t.id] })],
);

export const courses = pgTable(
  "courses",
  {
    tenantId: uuid("tenant_id").notNull(),
    id: uuid("id").notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    categoryId: uuid("category_id"),
    status: text("status", { enum: COURSE_STATUSES }).notNull(),
    enrollmentMode: text("enrollment_mode", { enum: ENROLLMENT_MODES }).notNull(),
    ownerId: uuid("owner_id"),
    publishedAt: ts("published_at"),
    ...audit,
  },
  (t) => [primaryKey({ columns: [t.tenantId, t.id] })],
);

export const courseSections = pgTable(
  "course_sections",
  {
    tenantId: uuid("tenant_id").notNull(),
    id: uuid("id").notNull(),
    courseId: uuid("course_id").notNull(),
    title: text("title").notNull(),
    position: integer("position").notNull(),
    ...audit,
  },
  (t) => [primaryKey({ columns: [t.tenantId, t.id] })],
);

export const lessons = pgTable(
  "lessons",
  {
    tenantId: uuid("tenant_id").notNull(),
    id: uuid("id").notNull(),
    courseId: uuid("course_id").notNull(),
    sectionId: uuid("section_id").notNull(),
    title: text("title").notNull(),
    kind: text("kind", { enum: LESSON_KINDS }).notNull(),
    body: text("body").notNull(),
    videoUrl: text("video_url"),
    pdfUrl: text("pdf_url"),
    quiz: jsonb("quiz"),
    position: integer("position").notNull(),
    ...audit,
  },
  (t) => [primaryKey({ columns: [t.tenantId, t.id] })],
);

export const enrollments = pgTable(
  "enrollments",
  {
    tenantId: uuid("tenant_id").notNull(),
    id: uuid("id").notNull(),
    courseId: uuid("course_id").notNull(),
    userId: uuid("user_id").notNull(),
    status: text("status", { enum: ["active", "completed"] }).notNull(),
    lastLessonId: uuid("last_lesson_id"),
    completedAt: ts("completed_at"),
    ...audit,
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.id] }),
    unique().on(t.tenantId, t.courseId, t.userId),
  ],
);

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    tenantId: uuid("tenant_id").notNull(),
    id: uuid("id").notNull(),
    enrollmentId: uuid("enrollment_id").notNull(),
    lessonId: uuid("lesson_id").notNull(),
    completedAt: ts("completed_at").notNull().defaultNow(),
    ...audit,
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.id] }),
    unique().on(t.tenantId, t.enrollmentId, t.lessonId),
  ],
);

export const quizAttempts = pgTable(
  "quiz_attempts",
  {
    tenantId: uuid("tenant_id").notNull(),
    id: uuid("id").notNull(),
    enrollmentId: uuid("enrollment_id").notNull(),
    lessonId: uuid("lesson_id").notNull(),
    answers: jsonb("answers").notNull(),
    score: integer("score").notNull(),
    passed: boolean("passed").notNull(),
    ...audit,
  },
  (t) => [primaryKey({ columns: [t.tenantId, t.id] })],
);

export const certificates = pgTable(
  "certificates",
  {
    tenantId: uuid("tenant_id").notNull(),
    id: uuid("id").notNull(),
    enrollmentId: uuid("enrollment_id").notNull(),
    courseId: uuid("course_id").notNull(),
    userId: uuid("user_id").notNull(),
    code: text("code").notNull(),
    recipientName: text("recipient_name").notNull(),
    courseTitle: text("course_title").notNull(),
    issuedAt: ts("issued_at").notNull().defaultNow(),
    revokedAt: ts("revoked_at"),
    ...audit,
  },
  (t) => [primaryKey({ columns: [t.tenantId, t.id] }), unique().on(t.tenantId, t.enrollmentId)],
);
