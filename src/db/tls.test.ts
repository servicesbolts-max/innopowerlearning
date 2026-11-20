import { describe, expect, it } from "vitest";
import { sslFor } from "./tls";

describe("sslFor", () => {
  it("skips TLS for local Docker in development", () => {
    expect(sslFor("postgres://u:p@localhost:5432/db", "development")).toBeUndefined();
    expect(sslFor("postgres://u:p@127.0.0.1/db", "development")).toBeUndefined();
  });

  it("requires TLS for a hosted dev database", () => {
    expect(sslFor("postgresql://u:p@ep-x.neon.tech/db", "development")).toBe("require");
  });

  it("verifies the certificate in preview, staging and production, even on loopback", () => {
    for (const appEnv of ["preview", "staging", "production"] as const) {
      expect(sslFor("postgresql://u:p@db.example.com/db", appEnv)).toBe("verify-full");
      expect(sslFor("postgres://u:p@localhost/db", appEnv)).toBe("verify-full");
    }
  });
});
