import type { ServerEnv } from "@/lib/env";

/** Demo seed never runs in production unless ALLOW_DEMO_SEED=true (Section 11). */
export function assertSeedAllowed(e: Pick<ServerEnv, "APP_ENV" | "NODE_ENV" | "ALLOW_DEMO_SEED">) {
  const isProduction = e.APP_ENV === "production" || e.NODE_ENV === "production";
  if (isProduction && !e.ALLOW_DEMO_SEED) {
    throw new Error(
      "Refusing to seed demo data in production. Set ALLOW_DEMO_SEED=true to override.",
    );
  }
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "postgres"]);

/** Destructive commands (db:reset) only run against a local development database. */
export function assertLocalDatabase(databaseUrl: string, appEnv: ServerEnv["APP_ENV"]) {
  const host = new URL(databaseUrl).hostname;
  if (appEnv !== "development" || !LOCAL_HOSTS.has(host)) {
    throw new Error(
      `Refusing a destructive database command: host "${host}" with APP_ENV=${appEnv}. ` +
        `Only a local development database may be reset.`,
    );
  }
}
