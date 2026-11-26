import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runMigrations, setRuntimeLoginPassword } from "@/db/migrate";
import { uuidv7 } from "@/lib/ids";
import {
  addLesson,
  addSection,
  completeLesson,
  createCourse,
  enroll,
  findEnrollment,
  listMyLearning,
  loadPlayer,
  getCourseForEditing,
  getPublishedCourse,
  listPublishedCourses,
  moveLesson,
  moveSection,
  removeLesson,
  setCourseStatus,
  updateLesson,
} from "@/modules/courses";
import { attemptSummary, recordAttempt } from "@/modules/assessments";
import { getCertificateByCode, issueCertificate } from "@/modules/credentials";
import { withTenant } from "@/modules/tenancy";
import { appPassword, createTenants, dropTenants, ownerConnection } from "./helpers";

/** Course authoring and catalog reads through withTenant as the runtime login (slice M1/M2). */
const owner = ownerConnection();
const A = uuidv7();
const B = uuidv7();
const USER = uuidv7();
const content = (title: string) => ({
  title,
  kind: "content" as const,
  body: "",
  videoUrl: null,
  pdfUrl: null,
  quiz: null,
});

beforeAll(async () => {
  await runMigrations(owner);
  await setRuntimeLoginPassword(owner, appPassword!);
  await createTenants(owner, [
    { id: A, slug: `crs-a-${A.slice(-6)}` },
    { id: B, slug: `crs-b-${B.slice(-6)}` },
  ]);
  await owner.begin(async (tx) => {
    await tx`set local role app_auth`;
    await tx`insert into users (id, name, email) values (${USER}, 'Author', ${`crs-${USER.slice(-8)}@example.org`})`;
  });
  await owner.begin(async (tx) => {
    await tx`select set_config('app.tenant_id', ${A}, true)`;
    await tx`insert into memberships (tenant_id, user_id, role) values (${A}, ${USER}, 'learner')`;
  });
});

afterAll(async () => {
  await dropTenants(owner, [A, B]);
  await owner.begin(async (tx) => {
    await tx`set local role app_auth`;
    await tx`delete from users where id = ${USER}`;
  });
  await owner.end({ timeout: 5 });
});

describe("course authoring", () => {
  it("builds an outline, reorders it and publishes to the catalog", async () => {
    const { id, slug } = await withTenant({ tenantId: A }, (tx) =>
      createCourse(tx, A, USER, {
        title: "Data Basics",
        summary: "Placeholder summary",
        categoryName: "Data",
        enrollmentMode: "open",
      }),
    );
    expect(slug).toBe("data-basics");
    const second = await withTenant({ tenantId: A }, (tx) =>
      createCourse(tx, A, USER, {
        title: "Data Basics",
        summary: "",
        categoryName: "",
        enrollmentMode: "open",
      }),
    );
    expect(second.slug).toBe("data-basics-2");

    const [s1, s2] = await withTenant({ tenantId: A }, async (tx) => [
      await addSection(tx, A, USER, id, "One"),
      await addSection(tx, A, USER, id, "Two"),
    ]);
    const lessonIds = await withTenant({ tenantId: A }, async (tx) => [
      (await addLesson(tx, A, USER, id, s1!.id, content("L1")))!.id,
      (await addLesson(tx, A, USER, id, s1!.id, content("L2")))!.id,
    ]);
    await withTenant({ tenantId: A }, async (tx) => {
      await moveSection(tx, id, s2!.id, "up");
      await moveLesson(tx, id, lessonIds[1]!, "up");
    });
    const course = await getCourseForEditing(A, id);
    expect(course?.sections.map((s) => s.title)).toEqual(["Two", "One"]);
    expect(course?.sections[1]?.lessons.map((l) => l.title)).toEqual(["L2", "L1"]);

    // Drafts stay out of the catalog.
    expect(await getPublishedCourse(A, slug)).toBeNull();
    await withTenant({ tenantId: A }, (tx) => setCourseStatus(tx, id, "published"));
    expect((await getPublishedCourse(A, slug))?.id).toBe(id);
    expect((await listPublishedCourses(A, "basics")).map((c) => c.id)).toEqual([id]);
    expect(await listPublishedCourses(A, "data")).toHaveLength(1); // category match
    expect(await listPublishedCourses(A, "nothing-like-this")).toEqual([]);
    expect(await listPublishedCourses(A, "%")).toEqual([]);

    // Another tenant sees none of it.
    expect(await getPublishedCourse(B, slug)).toBeNull();
    expect(await listPublishedCourses(B)).toEqual([]);
    expect(await getCourseForEditing(B, id)).toBeNull();

    // Lesson ids from another course are refused.
    const other = await withTenant({ tenantId: A }, (tx) =>
      updateLesson(tx, second.id, lessonIds[0]!, content("Hijack")),
    );
    expect(other).toBe(false);
    expect(
      await withTenant({ tenantId: A }, (tx) => removeLesson(tx, second.id, lessonIds[0]!)),
    ).toBe(false);
    // And a section of another course cannot receive lessons.
    expect(
      await withTenant({ tenantId: A }, (tx) =>
        addLesson(tx, A, USER, second.id, s1!.id, content("X")),
      ),
    ).toBeNull();
  });
});

describe("learning flow", () => {
  it("enrolls, tracks progress, grades a quiz and issues a verifiable certificate", async () => {
    const { id: courseId, slug } = await withTenant({ tenantId: A }, (tx) =>
      createCourse(tx, A, USER, {
        title: "Flow Course",
        summary: "",
        categoryName: "",
        enrollmentMode: "open",
      }),
    );
    const quiz = {
      passMark: 100,
      questions: [
        {
          id: "q1",
          prompt: "Pick a",
          kind: "single" as const,
          options: [
            { id: "a", text: "A" },
            { id: "b", text: "B" },
          ],
          correct: ["a"],
        },
      ],
    };
    const { lessonId, quizId } = await withTenant({ tenantId: A }, async (tx) => {
      const s = await addSection(tx, A, USER, courseId, "Only");
      const l = await addLesson(tx, A, USER, courseId, s.id, content("Read"));
      const q = await addLesson(tx, A, USER, courseId, s.id, {
        ...content("Check"),
        kind: "quiz",
        quiz,
      });
      await setCourseStatus(tx, courseId, "published");
      return { lessonId: l!.id, quizId: q!.id };
    });
    const course = (await getPublishedCourse(A, slug))!;

    const first = await withTenant({ tenantId: A }, (tx) => enroll(tx, A, courseId, USER, USER));
    const again = await withTenant({ tenantId: A }, (tx) => enroll(tx, A, courseId, USER, USER));
    expect(first.created).toBe(true);
    expect(again).toEqual({ id: first.id, created: false });

    let state = await loadPlayer(A, USER, course, null);
    expect(state?.percent).toBe(0);
    expect(state?.resumeLessonId).toBe(lessonId);

    const done = await withTenant({ tenantId: A }, async (tx) => {
      const enrollment = (await findEnrollment(tx, courseId, USER))!;
      return completeLesson(tx, A, enrollment, lessonId, USER);
    });
    expect(done.courseCompleted).toBe(false);
    state = await loadPlayer(A, USER, course, null);
    expect(state?.percent).toBe(50);
    expect(state?.resumeLessonId).toBe(quizId);

    // A failed attempt is recorded and does not complete the lesson.
    const failed = await withTenant({ tenantId: A }, async (tx) => {
      const enrollment = (await findEnrollment(tx, courseId, USER))!;
      return recordAttempt(tx, A, {
        enrollmentId: enrollment.id,
        lessonId: quizId,
        userId: USER,
        quiz,
        answers: { q1: ["b"], q9: ["a"] },
      });
    });
    expect(failed).toMatchObject({ score: 0, passed: false });
    const passed = await withTenant({ tenantId: A }, async (tx) => {
      const enrollment = (await findEnrollment(tx, courseId, USER))!;
      const attempt = await recordAttempt(tx, A, {
        enrollmentId: enrollment.id,
        lessonId: quizId,
        userId: USER,
        quiz,
        answers: { q1: ["a", "b"] }, // single choice keeps the first answer only
      });
      const progress = await completeLesson(tx, A, enrollment, quizId, USER);
      const cert = progress.courseCompleted
        ? await issueCertificate(tx, A, {
            enrollmentId: enrollment.id,
            courseId,
            userId: USER,
            courseTitle: "Flow Course",
          })
        : null;
      return { attempt, progress, cert };
    });
    expect(passed.attempt.passed).toBe(true);
    expect(passed.progress.courseCompleted).toBe(true);
    const enrollment = await withTenant({ tenantId: A }, (tx) =>
      findEnrollment(tx, courseId, USER),
    );
    expect(await attemptSummary(A, enrollment!.id, quizId)).toMatchObject({
      attempts: 2,
      bestScore: 100,
      passed: true,
    });
    state = await loadPlayer(A, USER, course, null);
    expect(state?.percent).toBe(100);
    expect(state?.enrollment.status).toBe("completed");

    // Certificates verify on the issuing tenant only, and are issued once.
    const code = passed.cert!.code;
    expect(code).toMatch(/^[A-Z2-7]{12}$/);
    expect((await getCertificateByCode(A, code))?.recipientName).toBe("Author");
    expect(await getCertificateByCode(B, code)).toBeNull();
    const twice = await withTenant({ tenantId: A }, (tx) =>
      issueCertificate(tx, A, {
        enrollmentId: enrollment!.id,
        courseId,
        userId: USER,
        courseTitle: "Flow Course",
      }),
    );
    expect(twice.code).toBe(code);
    expect((await listMyLearning(A, USER)).find((i) => i.courseId === courseId)?.percent).toBe(100);
    expect(await listMyLearning(B, USER)).toEqual([]);
  });
});

describe("quiz attempts", () => {
  it("cannot reference another tenant's enrollment or lesson", async () => {
    const other = await withTenant({ tenantId: B }, async (tx) => {
      const c = await createCourse(tx, B, USER, {
        title: "Other",
        summary: "",
        categoryName: "",
        enrollmentMode: "open",
      });
      const s = await addSection(tx, B, USER, c.id, "S");
      const l = await addLesson(tx, B, USER, c.id, s.id, content("L"));
      return { lessonId: l!.id };
    });
    const quiz = {
      passMark: 0,
      questions: [
        {
          id: "q",
          prompt: "P",
          kind: "single" as const,
          options: [
            { id: "a", text: "A" },
            { id: "b", text: "B" },
          ],
          correct: ["a"],
        },
      ],
    };
    const mine = await withTenant({ tenantId: A }, async (tx) => {
      const c = await createCourse(tx, A, USER, {
        title: "Mine",
        summary: "",
        categoryName: "",
        enrollmentMode: "open",
      });
      return enroll(tx, A, c.id, USER, USER);
    });
    await expect(
      withTenant({ tenantId: A }, (tx) =>
        recordAttempt(tx, A, {
          enrollmentId: mine.id,
          lessonId: other.lessonId,
          userId: USER,
          quiz,
          answers: {},
        }),
      ),
    ).rejects.toThrow();
  });
});
