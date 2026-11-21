import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing (Argon2id)", () => {
  it("produces an Argon2id PHC string with the OWASP parameters", async () => {
    const stored = await hashPassword("correct horse battery staple");
    expect(stored).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
  });

  it("verifies the right password and rejects others", async () => {
    const stored = await hashPassword("correct horse battery staple");
    expect(await verifyPassword({ hash: stored, password: "correct horse battery staple" })).toBe(
      true,
    );
    expect(await verifyPassword({ hash: stored, password: "Correct horse battery staple" })).toBe(
      false,
    );
  });

  it("fails closed on anything that is not an Argon2id hash", async () => {
    expect(await verifyPassword({ hash: "", password: "x" })).toBe(false);
    expect(await verifyPassword({ hash: "salt:deadbeef", password: "x" })).toBe(false);
    expect(await verifyPassword({ hash: "$argon2id$broken", password: "x" })).toBe(false);
  });

  it("salts every hash", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });
});
