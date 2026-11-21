import { describe, expect, it } from "vitest";
import { EnvValidationError, parseEnv, siteEnv, siteOrigin } from "./env";

const valid = { DATABASE_URL: "postgres://u:p@localhost:5432/db" };

describe("parseEnv", () => {
  it("applies defaults for optional values", () => {
    const e = parseEnv(valid);
    expect(e.ROOT_DOMAIN).toBe("localhost:3000");
    expect(e.APP_ENV).toBe("development");
    expect(e.ALLOW_DEMO_SEED).toBe(false);
  });

  it("parses ALLOW_DEMO_SEED as a boolean", () => {
    expect(parseEnv({ ...valid, ALLOW_DEMO_SEED: "true" }).ALLOW_DEMO_SEED).toBe(true);
  });

  it("requires an explicit APP_ENV on a production server (no dev defaults in prod)", () => {
    expect(() => parseEnv({ ...valid, NODE_ENV: "production" })).toThrow(/APP_ENV/);
    const secret = "s".repeat(32);
    expect(
      parseEnv({ ...valid, NODE_ENV: "production", APP_ENV: "staging", BETTER_AUTH_SECRET: secret })
        .APP_ENV,
    ).toBe("staging");
  });

  it("builds link origins without database settings, defaulting to https", () => {
    expect(
      siteOrigin("lsetf", siteEnv({ ROOT_DOMAIN: "localhost:3100", APP_ENV: "development" })),
    ).toBe("http://lsetf.localhost:3100");
    expect(siteOrigin(undefined, siteEnv({ ROOT_DOMAIN: "learn.example.org" }))).toBe(
      "https://learn.example.org",
    );
  });

  it("requires BETTER_AUTH_SECRET on staging and production, never in development", () => {
    expect(() => parseEnv({ ...valid, APP_ENV: "production" })).toThrow(/BETTER_AUTH_SECRET/);
    expect(() => parseEnv({ ...valid, APP_ENV: "staging" })).toThrow(/BETTER_AUTH_SECRET/);
    expect(parseEnv({ ...valid, APP_ENV: "development" }).BETTER_AUTH_SECRET).toBeUndefined();
    expect(() =>
      parseEnv({ ...valid, APP_ENV: "production", BETTER_AUTH_SECRET: "too-short" }),
    ).toThrow(/32 characters/);
  });

  it("fails fast when DATABASE_URL is missing", () => {
    expect(() => parseEnv({})).toThrow(EnvValidationError);
  });

  it("rejects a non-postgres DATABASE_URL", () => {
    expect(() => parseEnv({ DATABASE_URL: "mysql://u:p@localhost/db" })).toThrow(/postgres/);
  });

  it("never echoes secret values in the error message", () => {
    const secret = "postgres-but-not-a-url-s3cr3t";
    try {
      parseEnv({ DATABASE_URL: secret });
      expect.unreachable();
    } catch (error) {
      expect((error as Error).message).not.toContain(secret);
      expect((error as Error).message).toContain("DATABASE_URL");
    }
  });
});
