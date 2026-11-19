import { EnvValidationError, parseEnv, type ServerEnv } from "../src/lib/env";

/** Loads .env into process.env for CLI scripts (Next.js loads it itself for the app). */
export function loadEnv(): void {
  try {
    process.loadEnvFile(".env");
  } catch {
    // No .env file: rely on the real environment (CI, hosted platforms).
  }
}

/** Loads and validates env for a CLI script, exiting with a readable message on failure. */
export function scriptEnv(script: string): ServerEnv {
  loadEnv();
  try {
    return parseEnv(process.env);
  } catch (error) {
    console.error(`${script}: ${describeError(error)}`);
    process.exit(1);
  }
}

/** The owner/migrator URL. Scripts that change schema or data need it; the app never does. */
export function ownerUrl(e: ServerEnv, script: string): string {
  if (!e.DATABASE_OWNER_URL) {
    console.error(
      `${script}: DATABASE_OWNER_URL is not set. It is the owner/migrator connection ` +
        `(see .env.example); DATABASE_URL is the restricted runtime login.`,
    );
    process.exit(1);
  }
  return e.DATABASE_OWNER_URL;
}

/** Turns driver and validation errors into one actionable line (never prints secrets). */
export function describeError(error: unknown): string {
  if (error instanceof EnvValidationError) {
    return `${error.message}\nCopy .env.example to .env (or export DATABASE_URL) and try again.`;
  }
  const first = error instanceof AggregateError && error.errors.length ? error.errors[0] : error;
  const e = first as { code?: string; message?: string; address?: string; port?: number };
  if (e?.code === "ECONNREFUSED") {
    const where = e.address ? `${e.address}:${e.port}` : "the configured host";
    return `cannot reach Postgres at ${where}. Start it with "docker compose up -d", or check DATABASE_URL.`;
  }
  if (e?.code === "ENOTFOUND") return "database host not found. Check DATABASE_URL.";
  if (e?.code === "28P01") return "database authentication failed. Check DATABASE_URL credentials.";
  return e?.message || String(error);
}
