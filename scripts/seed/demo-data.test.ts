import { describe, expect, it } from "vitest";
import { buildTheme } from "../../src/lib/theme";
import { isPartnerSlug } from "../../src/modules/tenancy";
import { DEMO_TENANTS } from "./demo-data";

describe("demo seed data", () => {
  const partners = DEMO_TENANTS.filter((t) => t.kind === "partner");

  it("has the Hub plus the four partners from Section 11", () => {
    expect(DEMO_TENANTS.map((t) => t.slug)).toEqual([
      "hub",
      "lsetf",
      "wapsea",
      "gods-entrepreneurs",
      "wvstu",
    ]);
    for (const t of partners) expect(isPartnerSlug(t.slug), t.slug).toBe(true);
  });

  it("maps the presets recorded in docs/ASSUMPTIONS.md", () => {
    expect(Object.fromEntries(partners.map((t) => [t.slug, t.preset]))).toEqual({
      lsetf: "funded_program",
      wapsea: "training_provider",
      "gods-entrepreneurs": "community_organization",
      wvstu: "university",
    });
  });

  it("gives every tenant a distinct accent that passes every contrast check", () => {
    const accents = DEMO_TENANTS.map((t) => t.theme.accent.toUpperCase());
    expect(new Set(accents).size).toBe(accents.length);
    for (const t of DEMO_TENANTS) {
      expect(
        buildTheme(t.theme).report.filter((c) => !c.pass),
        t.slug,
      ).toEqual([]);
    }
  });

  it("turns on the Section 11 extras", () => {
    const by = Object.fromEntries(DEMO_TENANTS.map((t) => [t.slug, t.flags]));
    expect(by.wapsea?.ai_study_assistant).toBe(true);
    expect(by["gods-entrepreneurs"]?.mentorship).toBe(true);
    expect(by.lsetf?.sponsor_reports).toBe(true);
    expect(by.wvstu?.academic_records).toBe(true);
  });

  it("marks partner copy as placeholder", () => {
    for (const t of partners) expect(t.tagline, t.slug).toMatch(/^Placeholder copy:/);
  });
});

describe("sample course", () => {
  it("has valid quizzes and lesson text without markup", async () => {
    const { quizSchema } = await import("../../src/modules/courses");
    const { DEMO_COURSE } = await import("./demo-data");
    for (const section of DEMO_COURSE.sections) {
      for (const lesson of section.lessons) {
        expect(lesson.body).not.toMatch(/[<>]/);
        if ("quiz" in lesson) expect(quizSchema.safeParse(lesson.quiz).success).toBe(true);
      }
    }
  });
});
