import { siteOrigin } from "@/lib/env";

/**
 * The origins WebAuthn ceremonies may come from. Better Auth's passkey plugin needs an explicit
 * list once the base URL is dynamic, but tenants are added without a redeploy (Section 0), so
 * the list grows at runtime: every passkey request adds its own origin before the plugin runs.
 *
 * Safe because only hosts the proxy accepted (the hub, the console, active tenants) ever reach
 * /api/auth; anything else got a 404 first. The array is only appended to (never replaced), so
 * concurrent requests cannot drop each other's origin, and it is capped.
 */
const MAX_ORIGINS = 10_000;

export const passkeyOrigins: string[] = [siteOrigin()];

export function rememberPasskeyOrigin(host: string | null, protocol: "http" | "https"): void {
  if (!host || !/^[a-z0-9.-]+(?::\d{1,5})?$/i.test(host)) return;
  const origin = `${protocol}://${host.toLowerCase()}`;
  if (!passkeyOrigins.includes(origin) && passkeyOrigins.length < MAX_ORIGINS) {
    passkeyOrigins.push(origin);
  }
}
