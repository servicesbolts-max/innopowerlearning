import { describe, expect, it } from "vitest";
import { assertLocalDatabase, assertSeedAllowed } from "./seed-guard";

describe("assertSeedAllowed", () => {
  it("allows development", () => {
    expect(() =>
      assertSeedAllowed({
        APP_ENV: "development",
        NODE_ENV: "development",
        ALLOW_DEMO_SEED: false,
      }),
    ).not.toThrow();
  });

  it("refuses production without ALLOW_DEMO_SEED", () => {
    expect(() =>
      assertSeedAllowed({ APP_ENV: "production", NODE_ENV: "production", ALLOW_DEMO_SEED: false }),
    ).toThrow(/Refusing/);
  });

  it("allows production with ALLOW_DEMO_SEED=true", () => {
    expect(() =>
      assertSeedAllowed({ APP_ENV: "production", NODE_ENV: "production", ALLOW_DEMO_SEED: true }),
    ).not.toThrow();
  });
});

describe("assertLocalDatabase", () => {
  it("allows localhost in development", () => {
    expect(() =>
      assertLocalDatabase("postgres://u:p@localhost:5432/db", "development"),
    ).not.toThrow();
  });

  it("refuses a hosted database", () => {
    expect(() => assertLocalDatabase("postgresql://u:p@ep-x.neon.tech/db", "development")).toThrow(
      /Refusing/,
    );
  });

  it("refuses localhost outside development", () => {
    expect(() => assertLocalDatabase("postgres://u:p@localhost/db", "staging")).toThrow(/Refusing/);
  });
});
