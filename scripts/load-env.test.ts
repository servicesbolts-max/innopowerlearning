import { describe, expect, it } from "vitest";
import { describeError } from "./load-env";
import { EnvValidationError } from "../src/lib/env";

describe("describeError", () => {
  it("explains a refused connection, including inside an AggregateError", () => {
    const refused = Object.assign(new Error(""), {
      code: "ECONNREFUSED",
      address: "127.0.0.1",
      port: 5432,
    });
    expect(describeError(new AggregateError([refused], ""))).toMatch(
      /cannot reach Postgres at 127\.0\.0\.1:5432.*docker compose up -d/,
    );
  });

  it("points to .env.example for invalid env", () => {
    expect(describeError(new EnvValidationError(["DATABASE_URL: required"]))).toMatch(
      /\.env\.example/,
    );
  });

  it("falls back to the error message", () => {
    expect(describeError(new Error("boom"))).toBe("boom");
  });
});
