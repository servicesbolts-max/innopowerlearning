import { describe, expect, it } from "vitest";
import { sanitizeNext } from "./safe-next";

const ORIGIN = "https://lsetf.learn.example";

describe("sanitizeNext", () => {
  it.each([
    ["/admin", "/admin"],
    ["/courses?level=1#top", "/courses?level=1#top"],
    ["/account/security?required=1", "/account/security?required=1"],
  ])("keeps the same-origin path %s", (raw, want) => {
    expect(sanitizeNext(raw, ORIGIN)).toBe(want);
  });

  it.each([
    null,
    "",
    "admin",
    "//evil.example",
    "/\t/evil.example",
    "/\n/evil.example",
    "/%09/evil.example".replace("%09", "\t"),
    "/\\evil.example",
    "https://evil.example/",
    "javascript:alert(1)",
    "/ /evil.example",
  ])("refuses %j", (raw) => {
    expect(sanitizeNext(raw, ORIGIN)).toBe("/");
  });
});
