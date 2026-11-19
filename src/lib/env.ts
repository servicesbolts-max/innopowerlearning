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
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    // Report variable names and problems only, never values.
    throw new EnvValidationError(
      result.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
    );
  }
  return result.data;
}

let cached: ServerEnv | undefined;

/** Validated server env. Throws EnvValidationError on first access if misconfigured. */
export function env(): ServerEnv {
  cached ??= parseEnv(process.env);
  return cached;
}
