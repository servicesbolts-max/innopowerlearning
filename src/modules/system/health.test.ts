import { describe, expect, it } from "vitest";
import { checkReadiness } from "./health";

describe("checkReadiness", () => {
  it("reports ok when the database responds", async () => {
    await expect(checkReadiness(async () => {})).resolves.toEqual({
      status: "ok",
      checks: { database: "ok" },
    });
  });

  it("reports fail without leaking error details when the database is down", async () => {
    const report = await checkReadiness(async () => {
      throw new Error("connect ECONNREFUSED password=hunter2");
    });
    expect(report).toEqual({ status: "fail", checks: { database: "fail" } });
    expect(JSON.stringify(report)).not.toContain("hunter2");
  });
});
