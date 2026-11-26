"use server";

import { z } from "zod";
import { ActionFailure, defineAction } from "@/modules/auth";
import {
  addLesson,
  addSection,
  courseInputSchema,
  courseOwner,
  createCourse,
  lessonInputSchema,
  moveLesson,
  moveSection,
  removeLesson,
  removeSection,
  renameSection,
  setCourseStatus,
  updateCourse,
  updateLesson,
} from "@/modules/courses";

/**
 * Course authoring actions (MVP slice M1). Instructors act on their own courses; tenant admins
 * on any (can() with the course owner). Every change is audited with ids only.
 */
const courseId = z.uuid();
const direction = z.enum(["up", "down"]);
const sectionTitle = z.string().trim().min(1).max(160);
const ownerOf = async (tx: Parameters<typeof courseOwner>[0], input: { courseId: string }) =>
  courseOwner(tx, input.courseId);
const ok = (done: boolean) => {
  if (!done) throw new ActionFailure("invalid_input");
  return null;
};

export const createCourseAction = defineAction(
  {
    schema: courseInputSchema,
    permission: "course.create",
    audit: (_i, r: { id: string }) => ({
      action: "course.created",
      target: { type: "course", id: r.id },
    }),
  },
  async ({ tx, input, actor }) => createCourse(tx, actor.tenantId, actor.userId, input),
);

export const updateCourseAction = defineAction(
  {
    schema: courseInputSchema.extend({ courseId }),
    permission: "course.edit",
    resource: ownerOf,
    audit: (i) => ({ action: "course.updated", target: { type: "course", id: i.courseId } }),
  },
  async ({ tx, input, actor }) => {
    await updateCourse(tx, actor.tenantId, actor.userId, input.courseId, input);
    return null;
  },
);

export const setCourseStatusAction = defineAction(
  {
    schema: z.object({ courseId, status: z.enum(["draft", "published"]) }),
    permission: "course.publish",
    resource: ownerOf,
    audit: (i) => ({
      action: i.status === "published" ? "course.published" : "course.unpublished",
      target: { type: "course", id: i.courseId },
    }),
  },
  async ({ tx, input }) => {
    await setCourseStatus(tx, input.courseId, input.status);
    return null;
  },
);

export const addSectionAction = defineAction(
  {
    schema: z.object({ courseId, title: sectionTitle }),
    permission: "course.edit",
    resource: ownerOf,
    audit: (i, r: { id: string }) => ({
      action: "course.section_added",
      target: { type: "course", id: i.courseId },
      metadata: { sectionId: r.id },
    }),
  },
  async ({ tx, input, actor }) =>
    addSection(tx, actor.tenantId, actor.userId, input.courseId, input.title),
);

export const renameSectionAction = defineAction(
  {
    schema: z.object({ courseId, sectionId: z.uuid(), title: sectionTitle }),
    permission: "course.edit",
    resource: ownerOf,
    audit: (i) => ({
      action: "course.section_renamed",
      target: { type: "course", id: i.courseId },
      metadata: { sectionId: i.sectionId },
    }),
  },
  async ({ tx, input }) =>
    ok(await renameSection(tx, input.courseId, input.sectionId, input.title)),
);

export const removeSectionAction = defineAction(
  {
    schema: z.object({ courseId, sectionId: z.uuid() }),
    permission: "course.edit",
    resource: ownerOf,
    audit: (i) => ({
      action: "course.section_removed",
      target: { type: "course", id: i.courseId },
      metadata: { sectionId: i.sectionId },
    }),
  },
  async ({ tx, input }) => ok(await removeSection(tx, input.courseId, input.sectionId)),
);

export const moveSectionAction = defineAction(
  {
    schema: z.object({ courseId, sectionId: z.uuid(), direction }),
    permission: "course.edit",
    resource: ownerOf,
    audit: (i) => ({
      action: "course.section_moved",
      target: { type: "course", id: i.courseId },
      metadata: { sectionId: i.sectionId, direction: i.direction },
    }),
  },
  async ({ tx, input }) => {
    await moveSection(tx, input.courseId, input.sectionId, input.direction);
    return null;
  },
);

export const addLessonAction = defineAction(
  {
    schema: z.object({
      courseId,
      sectionId: z.uuid(),
      title: z.string().trim().min(1).max(160),
      kind: z.enum(["content", "quiz"]),
    }),
    permission: "course.edit",
    resource: ownerOf,
    audit: (i, r: { id: string }) => ({
      action: "course.lesson_added",
      target: { type: "course", id: i.courseId },
      metadata: { lessonId: r.id },
    }),
  },
  async ({ tx, input, actor }) => {
    // A new quiz lesson starts without questions; the editor adds them before learners see it.
    const lesson = {
      title: input.title,
      kind: input.kind,
      body: "",
      videoUrl: null,
      pdfUrl: null,
      quiz: null,
    };
    const created = await addLesson(
      tx,
      actor.tenantId,
      actor.userId,
      input.courseId,
      input.sectionId,
      lesson,
    );
    if (!created) throw new ActionFailure("invalid_input");
    return created;
  },
);

export const updateLessonAction = defineAction(
  {
    schema: z.intersection(z.object({ courseId, lessonId: z.uuid() }), lessonInputSchema),
    permission: "course.edit",
    resource: ownerOf,
    audit: (i) => ({
      action: "course.lesson_updated",
      target: { type: "course", id: i.courseId },
      metadata: { lessonId: i.lessonId },
    }),
  },
  async ({ tx, input }) => ok(await updateLesson(tx, input.courseId, input.lessonId, input)),
);

export const removeLessonAction = defineAction(
  {
    schema: z.object({ courseId, lessonId: z.uuid() }),
    permission: "course.edit",
    resource: ownerOf,
    audit: (i) => ({
      action: "course.lesson_removed",
      target: { type: "course", id: i.courseId },
      metadata: { lessonId: i.lessonId },
    }),
  },
  async ({ tx, input }) => ok(await removeLesson(tx, input.courseId, input.lessonId)),
);

export const moveLessonAction = defineAction(
  {
    schema: z.object({ courseId, lessonId: z.uuid(), direction }),
    permission: "course.edit",
    resource: ownerOf,
    audit: (i) => ({
      action: "course.lesson_moved",
      target: { type: "course", id: i.courseId },
      metadata: { lessonId: i.lessonId, direction: i.direction },
    }),
  },
  async ({ tx, input }) => {
    await moveLesson(tx, input.courseId, input.lessonId, input.direction);
    return null;
  },
);
