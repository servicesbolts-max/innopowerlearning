import postgres from "postgres";
import { describeError, ownerUrl, scriptEnv } from "./load-env";
import { runMigrations, setRuntimeLoginPassword } from "../src/db/migrate";

const e = scriptEnv("db:migrate");
const sql = postgres(ownerUrl(e, "db:migrate"), { max: 1, onnotice: () => {} });

try {
  const { applied, skipped } = await runMigrations(sql);
  console.log(`db:migrate: applied ${applied.length}, already applied ${skipped.length}`);
  for (const name of applied) console.log(`  + ${name}`);
  if (e.APP_DB_PASSWORD) {
    await setRuntimeLoginPassword(sql, e.APP_DB_PASSWORD);
    console.log("db:migrate: app_login password set from APP_DB_PASSWORD");
  } else {
    console.log("db:migrate: APP_DB_PASSWORD not set; app_login password left unchanged");
  }
} catch (error) {
  console.error(`db:migrate failed: ${describeError(error)}`);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
