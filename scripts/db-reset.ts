import postgres from "postgres";
import { describeError, ownerUrl, scriptEnv } from "./load-env";
import { assertLocalDatabase } from "../src/db/seed-guard";

const e = scriptEnv("db:reset");

try {
  assertLocalDatabase(ownerUrl(e, "db:reset"), process.env);
} catch (error) {
  console.error(`db:reset: ${(error as Error).message}`);
  process.exit(1);
}

const sql = postgres(ownerUrl(e, "db:reset"), { max: 1, onnotice: () => {} });
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
