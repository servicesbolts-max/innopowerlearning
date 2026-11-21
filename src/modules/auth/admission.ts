import { and, eq, isNull } from "drizzle-orm";
import { memberships, tenants, tenantSettings, users } from "@/db/schema";
import { uuidv7 } from "@/lib/ids";
import { recordAudit } from "@/modules/audit";
import { TENANT_ID_HEADER, withTenant } from "@/modules/tenancy";
import { authDb } from "./db";
import { findOpenInvitation, INVITE_COOKIE, readCookie } from "./invitations";
import { decideAdmission, methodForPath, type DenyReason } from "./policy";
import { invitations } from "@/db/schema";

/** A sign-in the tenant's rules refuse. `reason` is a stable code the UI translates. */
export class AdmissionDenied extends Error {
  constructor(public readonly reason: DenyReason) {
    super(reason);
    this.name = "AdmissionDenied";
  }
}

interface RequestLike {
  headers?: Headers | undefined;
  request?: Request | undefined;
  path?: string | undefined;
}

function header(ctx: RequestLike | null, name: string): string | null {
  return ctx?.headers?.get(name) ?? ctx?.request?.headers.get(name) ?? null;
}

/** The platform tenant (Hub and Console): the only tenant with kind = 'platform'. */
export async function platformTenantId(): Promise<string> {
  const [row] = await authDb()
    .select({ id: tenants.id })
    .from(tenants)
    .where(and(eq(tenants.kind, "platform"), isNull(tenants.deletedAt)));
  if (!row) throw new Error("No platform tenant: run pnpm db:seed");
  return row.id;
}

/**
 * The tenant a request belongs to: the proxy's x-tenant-id (set only from host resolution, after
 * stripping any client copy), or the platform tenant on the Hub, which carries none.
 */
export async function requestTenantId(get: (name: string) => string | null): Promise<string> {
  return get(TENANT_ID_HEADER) ?? (await platformTenantId());
}

/**
 * Runs for every new session (Better Auth `session.create.before`). Binds the session to the
 * request's tenant and applies the admission policy, creating memberships and accepting
 * invitations in the same tenant transaction that writes the audit entry. Throws AdmissionDenied
 * when the session must not exist.
 */
export async function admitSession(
  session: { userId: string; impersonatedBy?: unknown; tenantId?: unknown },
  ctx: RequestLike | null,
): Promise<{ tenantId: string }> {
  const tenantId = await requestTenantId((name) => header(ctx, name));

  // Impersonation sessions are created by our own endpoint, which already checked everything
  // (src/modules/auth/impersonation.ts) and passes the tenant explicitly.
  if (session.impersonatedBy && typeof session.tenantId === "string") {
    return { tenantId: session.tenantId };
  }

  const [user] = await authDb()
    .select({ email: users.email, platformRole: users.platformRole, deletedAt: users.deletedAt })
    .from(users)
    .where(eq(users.id, session.userId));
  if (!user || user.deletedAt) throw new AdmissionDenied("membership_suspended");

  const method = methodForPath(ctx?.path);
  const inviteToken = readCookie(header(ctx, "cookie"), INVITE_COOKIE);

  const outcome = await withTenant({ tenantId }, async (tx) => {
    const [tenant] = await tx
      .select({ kind: tenants.kind, status: tenants.status, deletedAt: tenants.deletedAt })
      .from(tenants)
      .where(eq(tenants.id, tenantId));
    if (!tenant || tenant.status !== "active" || tenant.deletedAt) {
      return { allow: false as const, reason: "membership_suspended" as const };
    }
    const [settings] = await tx
      .select({
        registrationMode: tenantSettings.registrationMode,
        allowedEmailDomains: tenantSettings.allowedEmailDomains,
        requireAdmin2fa: tenantSettings.requireAdmin2fa,
      })
      .from(tenantSettings)
      .limit(1);
    const [membership] = await tx
      .select({ role: memberships.role, status: memberships.status })
      .from(memberships)
      .where(and(eq(memberships.userId, session.userId), isNull(memberships.deletedAt)));
    const open = inviteToken ? await findOpenInvitation(tx, inviteToken) : null;
    // The invitation counts only for the address it was sent to.
    const invitation = open && open.email.toLowerCase() === user.email.toLowerCase() ? open : null;

    const decision = decideAdmission({
      method,
      tenant: {
        kind: tenant.kind,
        registrationMode: settings?.registrationMode ?? "invite_only",
        allowedEmailDomains: settings?.allowedEmailDomains ?? [],
        requireAdmin2fa: settings?.requireAdmin2fa ?? true,
      },
      user: { email: user.email, platformRole: user.platformRole },
      membership: membership ?? null,
      invitation: invitation ? { role: invitation.role } : null,
    });

    if (decision.join) {
      await tx.insert(memberships).values({
        tenantId,
        id: uuidv7(),
        userId: session.userId,
        role: decision.join.role,
        status: decision.join.status,
      });
    }
    if (decision.allow && decision.acceptInvitation && invitation) {
      await tx
        .update(invitations)
        .set({ acceptedAt: new Date(), acceptedBy: session.userId })
        .where(eq(invitations.id, invitation.id));
    }
    await recordAudit(tx, tenantId, {
      action: decision.allow ? "auth.session.created" : "auth.session.denied",
      actorUserId: session.userId,
      metadata: {
        method,
        ...(decision.allow ? {} : { reason: decision.reason }),
        ...(decision.join
          ? { joinedAs: decision.join.role, joinStatus: decision.join.status }
          : {}),
        ...(decision.allow && decision.acceptInvitation
          ? { invitation: invitation?.id ?? null }
          : {}),
      },
    });
    return decision;
  });

  if (!outcome.allow) throw new AdmissionDenied(outcome.reason);
  return { tenantId };
}
