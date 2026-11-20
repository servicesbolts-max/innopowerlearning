import { describeError, ownerConnection, ownerUrl, scriptEnv } from "./load-env";
import { assertLocalDatabase } from "../src/db/seed-guard";

const e = scriptEnv("db:reset");

try {
  assertLocalDatabase(ownerUrl(e, "db:reset"), process.env);
} catch (error) {
  console.error(`db:reset: ${(error as Error).message}`);
  process.exit(1);
}

const sql = ownerConnection(e, "db:reset");
try {
  // Local development only (guarded above): recreate the public schema.
  // Recreate it as a fresh database has it (owner pg_database_owner, USAGE for PUBLIC);
  // migration 0001 then revokes CREATE. Without the USAGE grant, app_login would see
  // "relation does not exist" where a fresh database says "permission denied".
  await sql.unsafe(
    `drop schema if exists public cascade;
     create schema public authorization pg_database_owner;
     grant usage on schema public to public;`,
  );
  console.log("db:reset: local public schema recreated.");
} catch (error) {
  console.error(`db:reset failed: ${describeError(error)}`);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
