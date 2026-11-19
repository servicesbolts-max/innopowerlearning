import pino from "pino";

/**
 * Structured JSON logger. Every request-scoped log carries `request_id` and, from P2, `tenant_id`.
 * Sensitive fields are redacted up to three levels deep and in request/response headers.
 * Never log learner PII on purpose (docs/SECURITY.md); redaction is the safety net.
 */
const SENSITIVE_KEYS = [
  "password",
  "passwordHash",
  "token",
  "accessToken",
  "refreshToken",
  "idToken",
  "apiKey",
  "secret",
  "clientSecret",
  "secretAccessKey",
  "authorization",
  "cookie",
  "email",
  "phone",
  "DATABASE_URL",
  "DATABASE_OWNER_URL",
  "APP_DB_PASSWORD",
  "S3_SECRET_ACCESS_KEY",
];

export const REDACT_PATHS = [
  ...SENSITIVE_KEYS.flatMap((k) => [k, `*.${k}`, `*.*.${k}`]),
  "req.headers.authorization",
  "req.headers.cookie",
  'req.headers["x-api-key"]',
  'res.headers["set-cookie"]',
  "headers.authorization",
  "headers.cookie",
];

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: "innopower-learn" },
  redact: { paths: REDACT_PATHS, censor: "[redacted]" },
});

export function requestLogger(requestId: string, tenantId?: string) {
  return logger.child({ request_id: requestId, ...(tenantId ? { tenant_id: tenantId } : {}) });
}
