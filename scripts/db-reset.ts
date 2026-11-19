import postgres from "postgres";
import { loadEnv } from "./load-env";
import { parseEnv } from "../src/lib/env";
import { assertLocalDatabase } from "../src/db/seed-guard";

loadEnv();
const e = parseEnv(process.env);

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
} finally {
  await sql.end({ timeout: 5 });
}
