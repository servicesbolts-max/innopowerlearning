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
  const summary = await seedDemo(sql, {
    rotateDemoPasswords: process.argv.includes("--rotate-demo-passwords"),
  });
  const host = (slug: string) => (slug === "hub" ? e.ROOT_DOMAIN : `${slug}.${e.ROOT_DOMAIN}`);
  console.log(`db:seed: ${summary.plans} plans, ${summary.tenants.length} tenants`);
  for (const t of summary.tenants) {
    console.log(`  ${t.created ? "+" : "="} ${t.slug.padEnd(20)} http://${host(t.slug)}`);
  }
  if (summary.newAccounts.length > 0) {
    console.log(
      "db:seed: new demo accounts (passwords are shown only now; admins must set up 2FA):",
    );
    for (const a of summary.newAccounts) {
      console.log(
        `  ${a.where.padEnd(20)} ${a.role.padEnd(16)} ${a.email.padEnd(34)} ${a.password}`,
      );
    }
  } else {
    console.log(
      "db:seed: demo accounts already exist. Run pnpm db:seed --rotate-demo-passwords for new passwords.",
    );
  }
} catch (error) {
  console.error(`db:seed failed: ${describeError(error)} (run pnpm db:migrate first).`);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
