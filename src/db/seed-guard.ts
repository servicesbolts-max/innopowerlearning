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

// Loopback only. Service names such as "postgres" are deliberately excluded: they also exist
// in staging and production container networks.
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * Destructive commands (db:reset) only run against a local development database.
 * Takes the raw environment: APP_ENV must be set explicitly to "development" (the parsed
 * env defaults it, which would let an unset variable pass), and NODE_ENV must not be production.
 */
export function assertLocalDatabase(
  databaseUrl: string,
  raw: { APP_ENV?: string; NODE_ENV?: string },
) {
  const host = new URL(databaseUrl).hostname;
  const ok =
    raw.APP_ENV === "development" && raw.NODE_ENV !== "production" && LOCAL_HOSTS.has(host);
  if (!ok) {
    throw new Error(
      `Refusing a destructive database command: host "${host}", APP_ENV=${raw.APP_ENV ?? "(unset)"}, ` +
        `NODE_ENV=${raw.NODE_ENV ?? "(unset)"}. Only a local development database may be reset, ` +
        `with APP_ENV=development set explicitly.`,
    );
  }
}
