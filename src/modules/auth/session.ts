import { and, count, eq, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import {
  memberships,
  passkeys,
  tenantSettings,
  type PlatformRole,
  type TenantRole,
} from "@/db/schema";
import { requiresSecondFactor, type Actor } from "@/modules/rbac";
import { withTenant } from "@/modules/tenancy";
import { requestTenantId } from "./admission";
import { auth } from "./auth";
import { authDb } from "./db";

export interface TenantSession {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    twoFactorEnabled: boolean;
  };
  actor: Actor;
  impersonation: { by: string; reason: string; expiresAt: Date } | null;
  /** An admin role without TOTP or a passkey: may only reach the security settings page. */
  needsSecondFactor: boolean;
}

/**
 * The signed-in user for this tenant, or null. Rejects sessions bound to another tenant (a
 * cookie replayed on another host), sessions older than the tenant's session length, and
 * impersonations past their deadline. Reads request headers, so callers render dynamically.
 */
export async function getTenantSession(tenantId: string): Promise<TenantSession | null> {
  const h = await headers();
  const result = await auth().api.getSession({ headers: h });
  if (!result) return null;
  const s = result.session as typeof result.session & {
    tenantId: string;
    impersonatedBy?: string | null;
    impersonationReason?: string | null;
    impersonationExpiresAt?: Date | string | null;
  };
  if (s.tenantId !== tenantId) return null;

  const deadline = s.impersonationExpiresAt ? new Date(s.impersonationExpiresAt) : null;
  if (s.impersonatedBy && (!deadline || deadline <= new Date())) {
    await auth()
      .api.revokeSession({ headers: h, body: { token: s.token } })
      .catch(() => {});
    return null;
  }

  const { role, sessionHours, requireAdmin2fa } = await withTenant({ tenantId }, async (tx) => {
    const [m] = await tx
      .select({ role: memberships.role, status: memberships.status })
      .from(memberships)
      .where(and(eq(memberships.userId, result.user.id), isNull(memberships.deletedAt)));
    const [settings] = await tx
      .select({
        sessionHours: tenantSettings.sessionHours,
        requireAdmin2fa: tenantSettings.requireAdmin2fa,
      })
      .from(tenantSettings)
      .limit(1);
    return {
      role: m?.status === "active" ? (m.role as TenantRole) : null,
      sessionHours: settings?.sessionHours ?? 168,
      requireAdmin2fa: settings?.requireAdmin2fa ?? true,
    };
  });
  if (Date.now() - new Date(s.createdAt).getTime() > sessionHours * 3_600_000) return null;

  const platformRole = ((result.user as { platformRole?: PlatformRole | null }).platformRole ??
    null) as PlatformRole | null;
  const actor: Actor = {
    userId: result.user.id,
    tenantId,
    role,
    platformRole,
    impersonatedBy: s.impersonatedBy ?? null,
  };
  const user = result.user as typeof result.user & { twoFactorEnabled?: boolean | null };

  let needsSecondFactor = false;
  const adminRequired =
    platformRole !== null ||
    (requireAdmin2fa && requiresSecondFactor({ role, platformRole: null }));
  if (adminRequired && !user.twoFactorEnabled && !s.impersonatedBy) {
    const [row] = await authDb()
      .select({ n: count() })
      .from(passkeys)
      .where(eq(passkeys.userId, result.user.id));
    needsSecondFactor = (row?.n ?? 0) === 0;
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image ?? null,
      twoFactorEnabled: !!user.twoFactorEnabled,
    },
    actor,
    impersonation:
      s.impersonatedBy && deadline
        ? { by: s.impersonatedBy, reason: s.impersonationReason ?? "", expiresAt: deadline }
        : null,
    needsSecondFactor,
  };
}

/** The tenant of the current request (server actions and route handlers). */
export async function currentTenantId(): Promise<string> {
  const h = await headers();
  return requestTenantId((name) => h.get(name));
}
