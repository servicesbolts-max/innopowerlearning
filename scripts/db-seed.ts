import { describeError, ownerConnection, scriptEnv } from "./load-env";
import { assertSeedAllowed } from "../src/db/seed-guard";
import { seedDemo } from "./seed/seed-demo";

const e = scriptEnv("db:seed");

try {
  assertSeedAllowed(e);
} catch (error) {
  console.error(`db:seed: ${(error as Error).message}`);
  process.exit(1);
}

const sql = ownerConnection(e, "db:seed");
try {
  const summary = await seedDemo(sql);
  const host = (slug: string) => (slug === "hub" ? e.ROOT_DOMAIN : `${slug}.${e.ROOT_DOMAIN}`);
  console.log(`db:seed: ${summary.plans} plans, ${summary.tenants.length} tenants`);
  for (const t of summary.tenants) {
    console.log(`  ${t.created ? "+" : "="} ${t.slug.padEnd(20)} http://${host(t.slug)}`);
  }
  console.log("db:seed: demo accounts arrive with auth in P3.");
} catch (error) {
  console.error(`db:seed failed: ${describeError(error)} (run pnpm db:migrate first).`);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
