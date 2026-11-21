import { cacheLife, cacheTag } from "next/cache";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import {
  listPublicPartners,
  loadTenantShell,
  type PublicPartner,
  type TenantShell,
} from "@/modules/tenancy";

/**
 * Cached reads for the Hub and tenant shells. Cache entries are keyed by their arguments and
 * tagged by tenant (`tenant:<id>`, `tenant:<id>:theme`), so a settings or theme save can expire
 * exactly one tenant with updateTag (P10b).
 */
export async function getTenantShell(slug: string): Promise<TenantShell | null> {
  "use cache";
  const shell = await loadTenantShell(slug);
  if (shell) {
    cacheLife("hours");
    cacheTag(`tenant:${shell.id}`, `tenant:${shell.id}:theme`);
  } else {
    cacheLife("seconds"); // an unknown slug may be provisioned at any time
  }
  return shell;
}

export async function getPublicPartners(): Promise<PublicPartner[]> {
  "use cache";
  cacheTag("partners");
  try {
    const partners = await listPublicPartners();
    cacheLife("minutes");
    return partners;
  } catch (error) {
    // No database (for example a CI build without one): render an empty directory, retry soon.
    logger.warn({ err: error }, "partner directory unavailable");
    cacheLife("seconds");
    return [];
  }
}

/** Absolute URL of a page on a tenant's subdomain. */
export function tenantUrl(slug: string, path = "/"): string {
  const { ROOT_DOMAIN, APP_ENV } = env();
  const scheme = APP_ENV === "development" ? "http" : "https";
  return `${scheme}://${slug}.${ROOT_DOMAIN}${path}`;
}
