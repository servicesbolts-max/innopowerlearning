import { isDemoTheme } from "@/lib/theme";
import { classifyHost, type HostClass } from "./host";
import type { ResolvedTenant } from "./lookup";
import { isPartnerSlug } from "./slugs";

/**
 * Request routing by host (Section 3, isolation layer 1), as a pure decision so it can be
 * unit-tested. src/proxy.ts applies it.
 *
 * - Hub host: served as is. `/design/<demo>` only for the three demo themes; `/t/<slug>` (the
 *   preview path fallback) only when enabled and only for an active tenant.
 * - Tenant host (subdomain or verified custom domain): `/x` is rewritten to `/t/<slug>/x` for an
 *   active tenant. Hub-only paths are refused.
 * - Everything else (unknown or inactive tenant, console until P11, malformed host): not found,
 *   decided here before rendering, so it is a real 404 and never a streamed 200.
 */
export type RouteDecision =
  | { type: "next" }
  | { type: "rewrite"; pathname: string; tenant: ResolvedTenant }
  | { type: "not-found" };

export interface RouteInput {
  host: string | null;
  pathname: string;
  rootDomain: string;
  /** `/t/<slug>` on the hub host (preview deployments). */
  pathFallback: boolean;
}

export type TenantResolver = (
  target: Extract<HostClass, { surface: "tenant" }>,
) => Promise<ResolvedTenant | null>;

/** Internal prefix of tenant routes (src/app/t/[tenant]). */
export const TENANT_PREFIX = "/t";

/** Hub pages a tenant host must not serve (tenants have their own `/` and `/sign-in`). */
const HUB_ONLY_ON_TENANT = ["/design", "/partners", "/become-a-partner", "/library", "/legal"];

const under = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

const NOT_FOUND = { type: "not-found" } as const;
const NEXT = { type: "next" } as const;

export async function decideRoute(
  input: RouteInput,
  resolve: TenantResolver,
): Promise<RouteDecision> {
  const target = classifyHost(input.host, input.rootDomain);
  const { pathname } = input;

  switch (target.surface) {
    case "invalid":
    case "console": // the Super Admin Console arrives in P11
      return NOT_FOUND;

    case "hub": {
      if (under(pathname, "/design")) {
        const [, , theme, ...rest] = pathname.split("/");
        return theme && isDemoTheme(theme) && rest.every((s) => s === "") ? NEXT : NOT_FOUND;
      }
      if (under(pathname, TENANT_PREFIX)) {
        if (!input.pathFallback) return NOT_FOUND;
        const slug = pathname.split("/")[2] ?? "";
        if (!isPartnerSlug(slug)) return NOT_FOUND;
        const tenant = await resolve({ surface: "tenant", by: "slug", slug });
        return tenant?.status === "active" ? NEXT : NOT_FOUND;
      }
      return NEXT;
    }

    case "tenant": {
      if (under(pathname, TENANT_PREFIX) || HUB_ONLY_ON_TENANT.some((p) => under(pathname, p))) {
        return NOT_FOUND;
      }
      const tenant = await resolve(target);
      if (!tenant || tenant.status !== "active") return NOT_FOUND;
      const rest = pathname === "/" ? "" : pathname;
      return { type: "rewrite", pathname: `${TENANT_PREFIX}/${tenant.slug}${rest}`, tenant };
    }
  }
}

/**
 * Wraps a resolver with a small in-process TTL cache keyed by the lookup (not by request), so
 * a burst of requests for one host costs one query. Negative results are cached too, briefly.
 * Per process; a shared cache (Redis) can replace it later without changing callers.
 */
export function cachedResolver(
  resolve: TenantResolver,
  { ttlMs = 30_000, negativeTtlMs = 5_000, max = 1_000, now = () => Date.now() } = {},
): TenantResolver {
  const cache = new Map<string, { value: ResolvedTenant | null; expires: number }>();
  return async (target) => {
    const key = target.by === "slug" ? `slug:${target.slug}` : `host:${target.host}`;
    const hit = cache.get(key);
    if (hit && hit.expires > now()) return hit.value;
    const value = await resolve(target);
    if (cache.size >= max) cache.delete(cache.keys().next().value as string);
    cache.set(key, { value, expires: now() + (value ? ttlMs : negativeTtlMs) });
    return value;
  };
}
