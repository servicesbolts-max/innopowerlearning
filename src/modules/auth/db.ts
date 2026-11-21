import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@/db/schema";
import { sslFor } from "@/db/tls";
import { env } from "@/lib/env";

/**
 * Better Auth's own connection pool. It logs in as app_login like the rest of the app but runs as
 * app_auth (set at connection start), which can reach only the identity tables (0004). Better
 * Auth's adapter has no per-query hook, so the role is fixed per connection instead of per
 * transaction. Needs a direct or session-mode connection: transaction-mode poolers drop startup
 * options. Only this file may open it (ESLint).
 */
let sql: postgres.Sql | undefined;
let db: PostgresJsDatabase<typeof schema> | undefined;

export function authDb(): PostgresJsDatabase<typeof schema> {
  if (!db) {
    const e = env();
    const ssl = sslFor(e.DATABASE_URL, e.APP_ENV);
    sql = postgres(e.DATABASE_URL, {
      ...(ssl ? { ssl } : {}),
      max: 5,
      idle_timeout: 20,
      connect_timeout: 5,
      prepare: false,
      connection: { options: "-c role=app_auth", application_name: "innopower-auth" },
      onnotice: () => {},
    });
    db = drizzle(sql, { schema });
  }
  return db;
}

export async function closeAuthDb(): Promise<void> {
  await sql?.end({ timeout: 5 });
  sql = undefined;
  db = undefined;
}
