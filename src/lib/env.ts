import { z } from "zod";

/**
 * Server environment schema. Every variable the app reads is declared here and in .env.example.
 * Values are validated once, on first access, and the app fails fast with a readable message.
 */
const booleanString = z
  .enum(["true", "false"])
  .default("false")
  .transform((v) => v === "true");

const postgresUrl = (name: string) =>
  z.url().refine((v) => v.startsWith("postgres://") || v.startsWith("postgresql://"), {
    message: `${name} must be a postgres:// or postgresql:// URL`,
  });

export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_ENV: z.enum(["development", "preview", "staging", "production"]).default("development"),
  ROOT_DOMAIN: z.string().min(1).default("localhost:3000"),
  /** Runtime connection: logs in as app_login (never the owner). */
  DATABASE_URL: postgresUrl("DATABASE_URL"),
  /** Owner/migrator connection: only db:migrate, db:seed, db:reset and tests use it. */
  DATABASE_OWNER_URL: postgresUrl("DATABASE_OWNER_URL").optional(),
  /** Password db:migrate sets for app_login (must match the password in DATABASE_URL). */
  APP_DB_PASSWORD: z.string().min(12, "APP_DB_PASSWORD must be at least 12 characters").optional(),
  REDIS_URL: z.url().optional(),
  S3_ENDPOINT: z.url().optional(),
  S3_REGION: z.string().default("auto"),
  S3_BUCKET: z.string().default("innopower-dev"),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  SMTP_URL: z.string().optional(),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  ALLOW_DEMO_SEED: booleanString,
  /** Signs session cookies and encrypts 2FA secrets. Required in production (32+ characters). */
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters")
    .optional(),
  /** Sender for auth email (magic links, invitations). */
  MAIL_FROM: z.string().min(3).default("Innopower Learn <no-reply@innopower.localhost>"),
  /**
   * The request header that carries the real client IP, set (overwritten) by the edge in front of
   * the app, e.g. cf-connecting-ip or x-real-ip. Used for auth rate limits. Clients can forge any
   * header the edge does not overwrite.
   */
  AUTH_IP_HEADER: z.string().min(1).optional(),
  /** Have I Been Pwned password check: "auto" = on in staging and production. */
  PASSWORD_BREACH_CHECK: z.enum(["auto", "true", "false"]).default("auto"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_TENANT_ID: z.string().default("common"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export class EnvValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Invalid environment configuration:\n  - ${issues.join("\n  - ")}`);
    this.name = "EnvValidationError";
  }
}

/** Parses an env-like object. Exported for tests; app code uses `env()`. */
export function parseEnv(source: Record<string, string | undefined>): ServerEnv {
  // APP_ENV defaults to "development", which turns on dev-only behavior (the /t/<slug> path
  // fallback, http links). A production server must therefore say which deployment it is.
  if (source.NODE_ENV === "production" && !source.APP_ENV) {
    throw new EnvValidationError([
      "APP_ENV: required when NODE_ENV=production (development, preview, staging or production)",
    ]);
  }
  // Better Auth falls back to a well-known secret in development; never on a real deployment.
  const deployed = source.APP_ENV === "staging" || source.APP_ENV === "production";
  if (deployed && !source.BETTER_AUTH_SECRET) {
    throw new EnvValidationError([`BETTER_AUTH_SECRET: required when APP_ENV=${source.APP_ENV}`]);
  }
  // Rate limits key on the client IP: a deployment must name the header its edge overwrites,
  // or clients choose their own IP (spoofable) or share one bucket (appended proxies).
  if (deployed && !source.AUTH_IP_HEADER) {
    throw new EnvValidationError([`AUTH_IP_HEADER: required when APP_ENV=${source.APP_ENV}`]);
  }
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    // Report variable names and problems only, never values.
    throw new EnvValidationError(
      result.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
    );
  }
  return result.data;
}

/**
 * The two values that build public links (Hub ↔ tenant URLs, the 404 page). Read on their own so
 * pages prerendered at build time do not need the database settings (a Docker build has none).
 * APP_ENV is optional here: when unset, links use https, the safe choice for any real host.
 */
const siteEnvSchema = z.object({
  ROOT_DOMAIN: z.string().min(1).default("localhost:3000"),
  APP_ENV: z.enum(["development", "preview", "staging", "production"]).optional(),
});
export type SiteEnv = z.infer<typeof siteEnvSchema>;

export function siteEnv(source: Record<string, string | undefined> = process.env): SiteEnv {
  return siteEnvSchema.parse(source);
}

/** Absolute origin of a host under ROOT_DOMAIN (`sub` omitted for the Hub). */
export function siteOrigin(sub?: string, e: SiteEnv = siteEnv()): string {
  const scheme = e.APP_ENV === "development" ? "http" : "https";
  return `${scheme}://${sub ? `${sub}.` : ""}${e.ROOT_DOMAIN}`;
}

let cached: ServerEnv | undefined;

/** Validated server env. Throws EnvValidationError on first access if misconfigured. */
export function env(): ServerEnv {
  cached ??= parseEnv(process.env);
  return cached;
}
