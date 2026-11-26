import { notFound, redirect } from "next/navigation";
import { getTenantSession, type TenantSession } from "@/modules/auth";
import { can, type Permission } from "@/modules/rbac";
import type { TenantShell } from "@/modules/tenancy";
import { getTenantShell } from "./tenancy";

/**
 * Page guards, decided before anything renders so refusals are real redirects and 404s (not a
 * streamed 200). The server action behind every form checks again (defineAction).
 */
export async function tenantPage(slug: string): Promise<TenantShell> {
  const shell = await getTenantShell(slug);
  if (!shell) notFound();
  return shell;
}

/** A signed-in member of this tenant (any role), or a redirect to sign in. */
export async function signedInPage(
  slug: string,
  next: string,
): Promise<{ shell: TenantShell; session: TenantSession }> {
  const shell = await tenantPage(slug);
  const session = await getTenantSession(shell.id);
  if (!session) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  if (session.needsSecondFactor) redirect("/account/security?required=1");
  return { shell, session };
}

/** A signed-in actor holding `permission` (any scope), or a 404. */
export async function staffPage(
  slug: string,
  permission: Permission,
  next: string,
): Promise<{ shell: TenantShell; session: TenantSession }> {
  const ctx = await signedInPage(slug, next);
  if (!can(ctx.session.actor, permission)) notFound();
  return ctx;
}
