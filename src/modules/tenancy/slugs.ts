/**
 * Tenant slug rules. Keep in sync with the CHECK constraints on tenants.slug in
 * src/db/migrations/0002_tenancy.sql (a unit test compares the reserved lists).
 */
export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

/** Host labels the platform uses itself; no partner may take one. */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  "admin",
  "api",
  "app",
  "assets",
  "auth",
  "cdn",
  "console",
  "docs",
  "help",
  "hub",
  "mail",
  "static",
  "status",
  "support",
  "t",
  "www",
]);

export function isPartnerSlug(value: string): boolean {
  return SLUG_PATTERN.test(value) && !RESERVED_SLUGS.has(value);
}
