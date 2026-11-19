import postgres from "postgres";
import { loadEnv } from "./load-env";
import { parseEnv } from "../src/lib/env";
import { assertSeedAllowed } from "../src/db/seed-guard";

loadEnv();
const e = parseEnv(process.env);

try {
  assertSeedAllowed(e);
} catch (error) {
  console.error(`db:seed: ${(error as Error).message}`);
  process.exit(1);
}

const sql = postgres(e.DATABASE_URL, { max: 1, onnotice: () => {} });
try {
  // P0 stub: verify the schema is migrated. P2 adds the idempotent five-tenant seed (Section 11).
  const [{ count }] = await sql<
    { count: number }[]
  >`select count(*)::int as count from _migrations`;
  console.log(
    `db:seed: database has ${count} migration(s) applied; no demo data yet (added in P2).`,
  );
} catch (error) {
  console.error(`db:seed failed: ${(error as Error).message}. Run pnpm db:migrate first.`);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
