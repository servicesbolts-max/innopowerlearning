import { cacheLife, cacheTag } from "next/cache";
import { siteOrigin } from "@/lib/env";
import { logger } from "@/lib/logger";
import {
  activeTenantIdForSlug,
  isPartnerSlug,
  listPublicPartners,
  loadTenantShellById,
  type PublicPartner,
  type TenantShell,
} from "@/modules/tenancy";

/**
 * Cached reads for the Hub and tenant shells.
 *
 * - Tenant data is cached by tenant id and tagged `tenant:<id>` and `tenant:<id>:theme`, so a
 *   settings or theme save expires exactly one tenant with updateTag (P10b).
 * - Only the slug → id step is cached by slug, briefly and tagged `tenant-slug:<slug>`: a
 *   rename, reassignment or suspension (P11) expires it, and it lapses within minutes anyway.
 *   A reassigned slug can therefore never serve the previous tenant's cached shell or id.
 * - Strings that are not valid partner slugs never reach a cache (no cache-filling by junk).
 */
export async function getTenantShell(slug: string): Promise<TenantShell | null> {
  if (!isPartnerSlug(slug)) return null;
  const id = await activeTenantId(slug);
  return id ? shellById(id) : null;
}

async function activeTenantId(slug: string): Promise<string | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`tenant-slug:${slug}`);
  return activeTenantIdForSlug(slug);
}

async function shellById(id: string): Promise<TenantShell | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(`tenant:${id}`, `tenant:${id}:theme`);
  return loadTenantShellById(id);
}

export async function getPublicPartners(): Promise<PublicPartner[]> {
  "use cache";
  cacheTag("partners");
  try {
    const partners = await listPublicPartners();
    cacheLife("minutes");
    return partners;
  } catch (error) {
    // No database (for example a Docker build without one): render an empty directory and retry
    // within minutes. Not "seconds": Next will not prerender entries that short, so the build
    // would fail instead of falling back.
    logger.warn({ err: error }, "partner directory unavailable");
    cacheLife("minutes");
    return [];
  }
}

/**
 * Absolute URL of a page on a tenant's subdomain. ROOT_DOMAIN must name the host and port the
 * site is served on (for example localhost:3100 for the E2E server); the proxy ignores ports,
 * links cannot. Needs no database settings, so it also works while prerendering in a build.
 */
export function tenantUrl(slug: string, path = "/"): string {
  return `${siteOrigin(slug)}${path}`;
}
