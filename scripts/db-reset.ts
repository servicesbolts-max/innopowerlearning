import postgres from "postgres";
import { describeError, scriptEnv } from "./load-env";
import { assertLocalDatabase } from "../src/db/seed-guard";

const e = scriptEnv("db:reset");

try {
  assertLocalDatabase(e.DATABASE_URL, e.APP_ENV);
} catch (error) {
  console.error(`db:reset: ${(error as Error).message}`);
  process.exit(1);
}

const sql = postgres(e.DATABASE_URL, { max: 1, onnotice: () => {} });
try {
  // Local development only (guarded above): recreate the public schema.
  await sql.unsafe(`drop schema if exists public cascade; create schema public;`);
  console.log("db:reset: local public schema recreated.");
} catch (error) {
  console.error(`db:reset failed: ${describeError(error)}`);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
