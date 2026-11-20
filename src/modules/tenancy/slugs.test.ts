import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { flagsForPreset, PRESET_FLAGS } from "./presets";
import { isPartnerSlug, RESERVED_SLUGS } from "./slugs";

describe("tenant slugs", () => {
  it("match the reserved list in the 0002 migration", () => {
    const sqlText = readFileSync(
      path.join(process.cwd(), "src/db/migrations/0002_tenancy.sql"),
      "utf8",
    );
    const list = sqlText.match(/slug NOT IN \(([^)]*)\)/)?.[1] ?? "";
    const fromSql = [...list.matchAll(/'([a-z]+)'/g)].map((m) => m[1]).sort();
    expect(fromSql).toEqual([...RESERVED_SLUGS].sort());
  });

  it.each(["lsetf", "gods-entrepreneurs", "wvstu", "a1"])("accepts %s", (s) =>
    expect(isPartnerSlug(s)).toBe(true),
  );
  it.each(["hub", "console", "-x", "x-", "A", "a_b", "a".repeat(41)])("rejects %s", (s) =>
    expect(isPartnerSlug(s)).toBe(false),
  );
});

describe("presets", () => {
  it("turn on the preset flags and nothing else", () => {
    const flags = flagsForPreset("university");
    expect(
      Object.entries(flags)
        .filter(([, on]) => on)
        .map(([k]) => k)
        .sort(),
    ).toEqual([...PRESET_FLAGS.university].sort());
    expect(flags.commerce).toBe(false);
  });

  it("add explicit extras", () => {
    expect(flagsForPreset("training_provider", ["ai_study_assistant"]).ai_study_assistant).toBe(
      true,
    );
  });
});
