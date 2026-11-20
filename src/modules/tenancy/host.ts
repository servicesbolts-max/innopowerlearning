import { isPartnerSlug } from "./slugs";

/**
 * Which surface a Host header addresses (Section 3). Pure: no I/O, so the proxy and tests share it.
 *
 * Matching ignores the port, so ROOT_DOMAIN=localhost:3000 also serves `lsetf.localhost:3100`.
 * Production domains carry no port.
 */
export type HostClass =
  | { surface: "hub" }
  | { surface: "console" }
  | { surface: "tenant"; by: "slug"; slug: string }
  | { surface: "tenant"; by: "host"; host: string }
  | { surface: "invalid" };

const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/** Lowercased hostname without port or trailing dot, or null when it is not a DNS name. */
export function normalizeHost(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim().toLowerCase();
  if (value.startsWith("[")) return null; // IPv6 literal: never a tenant or the hub
  const host = value.replace(/:\d{1,5}$/, "").replace(/\.$/, "");
  if (host.length === 0 || host.length > 253) return null;
  const labels = host.split(".");
  if (!labels.every((l) => LABEL.test(l))) return null;
  if (labels.every((l) => /^\d+$/.test(l))) return null; // IPv4 literal
  return host;
}

export function classifyHost(rawHost: string | null | undefined, rootDomain: string): HostClass {
  const host = normalizeHost(rawHost);
  const root = normalizeHost(rootDomain);
  if (!host || !root) return { surface: "invalid" };

  if (host === root || host === `www.${root}`) return { surface: "hub" };
  if (host === `console.${root}`) return { surface: "console" };

  if (host.endsWith(`.${root}`)) {
    const sub = host.slice(0, -(root.length + 1));
    // One label only: a.b.ROOT_DOMAIN is never a tenant.
    if (sub.includes(".") || !isPartnerSlug(sub)) return { surface: "invalid" };
    return { surface: "tenant", by: "slug", slug: sub };
  }

  // A custom domain needs at least two labels (example.org); single-label hosts never resolve.
  if (!host.includes(".")) return { surface: "invalid" };
  return { surface: "tenant", by: "host", host };
}
