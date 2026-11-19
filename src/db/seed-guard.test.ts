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
  const dev = { APP_ENV: "development" };
  const local = "postgres://u:p@localhost:5432/db";

  it("allows localhost with APP_ENV=development set explicitly", () => {
    expect(() => assertLocalDatabase(local, dev)).not.toThrow();
    expect(() => assertLocalDatabase("postgres://u:p@127.0.0.1/db", dev)).not.toThrow();
  });

  it("refuses when APP_ENV is unset (the parsed default must not count)", () => {
    expect(() => assertLocalDatabase(local, {})).toThrow(/APP_ENV=\(unset\)/);
  });

  it("refuses NODE_ENV=production even with APP_ENV=development", () => {
    expect(() => assertLocalDatabase(local, { ...dev, NODE_ENV: "production" })).toThrow(
      /Refusing/,
    );
  });

  it("refuses hosted databases and container service names", () => {
    for (const url of [
      "postgresql://u:p@ep-x.neon.tech/db",
      "postgres://u:p@postgres:5432/db",
      "postgres://u:p@db.internal/db",
    ]) {
      expect(() => assertLocalDatabase(url, dev)).toThrow(/Refusing/);
    }
  });

  it("refuses localhost outside development", () => {
    expect(() => assertLocalDatabase(local, { APP_ENV: "staging" })).toThrow(/Refusing/);
  });
});
