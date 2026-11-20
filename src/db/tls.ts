import type { ServerEnv } from "@/lib/env";

const LOOPBACK = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * TLS mode for a Postgres connection (postgres.js `ssl` option).
 * - Loopback (local Docker): no TLS.
 * - Preview, staging, production: verify-full (encrypted, certificate and hostname checked).
 * - Any other non-local host (e.g. a hosted dev database): require (encrypted).
 */
export function sslFor(
  databaseUrl: string,
  appEnv: ServerEnv["APP_ENV"],
): "verify-full" | "require" | undefined {
  if (appEnv === "preview" || appEnv === "staging" || appEnv === "production") {
    return "verify-full";
  }
  return LOOPBACK.has(new URL(databaseUrl).hostname) ? undefined : "require";
}
