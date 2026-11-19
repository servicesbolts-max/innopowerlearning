import postgres from "postgres";
import { describeError, scriptEnv } from "./load-env";
import { runMigrations } from "../src/db/migrate";

const { DATABASE_URL } = scriptEnv("db:migrate");
const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });

try {
  const { applied, skipped } = await runMigrations(sql);
  console.log(`db:migrate: applied ${applied.length}, already applied ${skipped.length}`);
  for (const name of applied) console.log(`  + ${name}`);
} catch (error) {
  console.error(`db:migrate failed: ${describeError(error)}`);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
