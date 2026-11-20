import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { env } from "@/lib/env";
import { sslFor } from "./tls";

/**
 * Low-level connection. From P2, application code never uses this directly: all tenant data
 * access goes through `withTenant(ctx, fn)` (src/modules/tenancy), which sets `app.tenant_id`.
 */
let sql: postgres.Sql | undefined;

export function getSql(): postgres.Sql {
  const e = env();
  const ssl = sslFor(e.DATABASE_URL, e.APP_ENV);
  sql ??= postgres(e.DATABASE_URL, {
    ...(ssl ? { ssl } : {}),
    max: 10,
    idle_timeout: 20,
    connect_timeout: 5,
    prepare: false, // compatible with transaction-mode poolers (Neon, Supabase pooler)
    onnotice: () => {},
  });
  return sql;
}

export function getDb() {
  return drizzle(getSql());
}

export async function closeDb(): Promise<void> {
  await sql?.end({ timeout: 5 });
  sql = undefined;
}
