import { describe, expect, it } from "vitest";
import { auditEntrySchema } from "./audit";

const ACTOR = "0190a1b2-0000-7000-8000-0000000000aa";

describe("audit entries", () => {
  it("accepts ids, codes and small primitives", () => {
    expect(
      auditEntrySchema.parse({
        action: "member.invited",
        actorUserId: ACTOR,
        target: { type: "invitation", id: "0190a1b2-0000-7000-8000-000000000001" },
        metadata: { role: "learner", expiresInDays: 7 },
      }).action,
    ).toBe("member.invited");
  });

  it.each(["email", "password", "fullName", "resetToken", "otpCode"])(
    "rejects metadata key %s (no PII or secrets in the audit log)",
    (key) => {
      expect(() =>
        auditEntrySchema.parse({ action: "x.y", actorUserId: ACTOR, metadata: { [key]: "v" } }),
      ).toThrow();
    },
  );

  it("rejects nested metadata and malformed actions", () => {
    expect(() =>
      auditEntrySchema.parse({
        action: "x.y",
        actorUserId: ACTOR,
        metadata: { nested: { a: 1 } as unknown as string },
      }),
    ).toThrow();
    expect(() => auditEntrySchema.parse({ action: "Bad Action", actorUserId: ACTOR })).toThrow();
  });
});
