import postgres from "postgres";
import { loadEnv } from "./load-env";
import { parseEnv } from "../src/lib/env";
import { runMigrations } from "../src/db/migrate";

loadEnv();
const { DATABASE_URL } = parseEnv(process.env);
const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });

try {
  const { applied, skipped } = await runMigrations(sql);
  console.log(`db:migrate: applied ${applied.length}, already applied ${skipped.length}`);
  for (const name of applied) console.log(`  + ${name}`);
} catch (error) {
  console.error(`db:migrate failed: ${(error as Error).message}`);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
