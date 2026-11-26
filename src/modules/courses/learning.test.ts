import { describe, expect, it } from "vitest";
import { newCertificateCode } from "@/modules/credentials";
import { resumeLesson } from "./learning";

const outline = [
  {
    id: "s1",
    title: "S1",
    lessons: [
      { id: "a", title: "A", kind: "content" as const },
      { id: "b", title: "B", kind: "content" as const },
    ],
  },
  { id: "s2", title: "S2", lessons: [{ id: "c", title: "C", kind: "quiz" as const }] },
];

describe("resume", () => {
  it("starts at the first lesson", () => {
    expect(resumeLesson(outline, new Set(), null)).toBe("a");
  });
  it("continues after the last completed lesson", () => {
    expect(resumeLesson(outline, new Set(["a"]), "a")).toBe("b");
    expect(resumeLesson(outline, new Set(["b"]), "b")).toBe("c");
  });
  it("wraps to an earlier lesson that was skipped", () => {
    expect(resumeLesson(outline, new Set(["b", "c"]), "c")).toBe("a");
  });
  it("returns the last lesson when everything is done, and null for an empty course", () => {
    expect(resumeLesson(outline, new Set(["a", "b", "c"]), "c")).toBe("c");
    expect(resumeLesson([], new Set(), null)).toBeNull();
  });
});

describe("certificate codes", () => {
  it("are 12 base32 characters and do not repeat", () => {
    const codes = new Set(Array.from({ length: 500 }, newCertificateCode));
    expect(codes.size).toBe(500);
    for (const c of codes) expect(c).toMatch(/^[A-Z2-7]{12}$/);
  });
});
