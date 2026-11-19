import { Writable } from "node:stream";
import pino from "pino";
import { describe, expect, it } from "vitest";
import { REDACT_PATHS } from "./logger";

function capture() {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _enc, cb) {
      lines.push(chunk.toString());
      cb();
    },
  });
  const log = pino({ redact: { paths: REDACT_PATHS, censor: "[redacted]" } }, stream);
  return { log, output: () => lines.join("") };
}

describe("logger redaction", () => {
  it("redacts nested secrets, PII and request headers", () => {
    const { log, output } = capture();
    log.info({
      password: "p-top",
      user: { email: "learner@example.com", profile: { phone: "+2348000000000" } },
      auth: { accessToken: "at-123", refreshToken: "rt-456" },
      config: { DATABASE_URL: "postgres://app_login:pw@db/x" },
      req: { headers: { authorization: "Bearer abc", cookie: "session=xyz" } },
      res: { headers: { "set-cookie": "session=xyz" } },
    });
    const out = output();
    for (const secret of [
      "p-top",
      "learner@example.com",
      "+2348000000000",
      "at-123",
      "rt-456",
      "postgres://",
      "Bearer abc",
      "session=xyz",
    ]) {
      expect(out).not.toContain(secret);
    }
    expect(out).toContain("[redacted]");
  });

  it("keeps non-sensitive fields", () => {
    const { log, output } = capture();
    log.info({ request_id: "r1", tenant_id: "t1", route: "/api/ready" });
    expect(output()).toContain('"route":"/api/ready"');
  });
});
