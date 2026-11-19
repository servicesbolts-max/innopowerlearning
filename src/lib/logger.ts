import pino from "pino";

/**
 * Structured JSON logger. Every request-scoped log carries `request_id` and, from P2, `tenant_id`.
 * Sensitive fields are redacted; never log learner PII (docs/SECURITY.md).
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: "innopower-learn" },
  redact: {
    paths: [
      "password",
      "*.password",
      "token",
      "*.token",
      "secret",
      "*.secret",
      "authorization",
      "*.authorization",
      "headers.cookie",
      "email",
      "*.email",
      "phone",
      "*.phone",
    ],
    censor: "[redacted]",
  },
});

export function requestLogger(requestId: string, tenantId?: string) {
  return logger.child({ request_id: requestId, ...(tenantId ? { tenant_id: tenantId } : {}) });
}
