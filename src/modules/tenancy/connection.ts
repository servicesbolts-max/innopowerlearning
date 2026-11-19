import { getSql } from "@/db";

/**
 * Connectivity check for readiness probes. Runs as app_login with no role switch and touches no
 * table, so it needs no tenant context. withTenant (P2) is the only other user of getSql.
 */
export async function pingDatabase(): Promise<void> {
  await getSql()`select 1`;
}
