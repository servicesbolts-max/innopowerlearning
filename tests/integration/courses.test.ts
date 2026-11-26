import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runMigrations, setRuntimeLoginPassword } from "@/db/migrate";
import { uuidv7 } from "@/lib/ids";
import {
  addLesson,
  addSection,
  createCourse,
  getCourseForEditing,
  getPublishedCourse,
  listPublishedCourses,
  moveLesson,
  moveSection,
  removeLesson,
  setCourseStatus,
  updateLesson,
} from "@/modules/courses";
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
