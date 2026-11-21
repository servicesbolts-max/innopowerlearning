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
  | { type: "next"; tenant?: ResolvedTenant }
  | { type: "rewrite"; pathname: string; tenant: ResolvedTenant }
  /** A tenant-host API request: served by the root route handler, with the tenant attached. */
  | { type: "api"; tenant: ResolvedTenant }
  | { type: "not-found" };

/**
 * Request headers the proxy sets for tenant-host API requests. Clients can never send them:
 * the proxy strips every incoming x-tenant-* header first.
 */
export const TENANT_ID_HEADER = "x-tenant-id";
export const TENANT_SLUG_HEADER = "x-tenant-slug";

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

/** A file in public/ at the site root, such as /icon.png. Never a path under /t. */
const PUBLIC_FILE = /^\/[\w.-]+\.(?:png|jpe?g|svg|ico|webp|avif|woff2)$/;

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
        // Same trusted tenant headers as a tenant host, so actions and pages agree.
        return tenant?.status === "active" ? { type: "next", tenant } : NOT_FOUND;
      }
      return NEXT;
    }

    case "tenant": {
      // Root-level public files (icons, fonts) are served as they are on every host.
      if (PUBLIC_FILE.test(pathname)) return NEXT;
      if (under(pathname, TENANT_PREFIX) || HUB_ONLY_ON_TENANT.some((p) => under(pathname, p))) {
        return NOT_FOUND;
      }
      const tenant = await resolve(target);
      if (!tenant || tenant.status !== "active") return NOT_FOUND;
      // API routes live at the app root (Section 8: /api/v1, /api/webhooks), not under /t.
      if (under(pathname, "/api")) return { type: "api", tenant };
      const rest = pathname === "/" ? "" : pathname;
      return { type: "rewrite", pathname: `${TENANT_PREFIX}/${tenant.slug}${rest}`, tenant };
    }
  }
}

/**
 * Wraps a resolver with a small in-process TTL cache keyed by the lookup (not by request), so a
 * burst of requests for one host costs one query. Misses live in their own, smaller cache with a
 * shorter TTL: random Host headers (custom-domain probes) can churn that one, but never evict the
 * entries of real tenants. Per process; a shared cache (Redis) can replace it later.
 */
export function cachedResolver(
  resolve: TenantResolver,
  {
    ttlMs = 30_000,
    negativeTtlMs = 5_000,
    max = 1_000,
    negativeMax = 200,
    now = () => Date.now(),
  } = {},
): TenantResolver {
  type Entry = { value: ResolvedTenant | null; expires: number };
  const hits = new Map<string, Entry>();
  const misses = new Map<string, Entry>();

  const put = (cache: Map<string, Entry>, limit: number, key: string, entry: Entry) => {
    cache.delete(key); // a refreshed key moves to the back and never evicts another entry
    if (cache.size >= limit) cache.delete(cache.keys().next().value as string);
    cache.set(key, entry);
  };

  return async (target) => {
    const key = target.by === "slug" ? `slug:${target.slug}` : `host:${target.host}`;
    const cached = hits.get(key) ?? misses.get(key);
    if (cached && cached.expires > now()) return cached.value;
    const value = await resolve(target);
    if (value) {
      misses.delete(key);
      put(hits, max, key, { value, expires: now() + ttlMs });
    } else {
      hits.delete(key);
      put(misses, negativeMax, key, { value, expires: now() + negativeTtlMs });
    }
    return value;
  };
}
