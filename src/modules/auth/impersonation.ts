import type { BetterAuthPlugin } from "better-auth";
import {
  APIError,
  createAuthEndpoint,
  getSessionFromCtx,
  sessionMiddleware,
} from "better-auth/api";
import { deleteSessionCookie, setSessionCookie } from "better-auth/cookies";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { memberships, type PlatformRole } from "@/db/schema";
import { audit } from "@/modules/audit";
import { can } from "@/modules/rbac";
import { withTenant } from "@/modules/tenancy";
import { requestTenantId } from "./admission";

/**
 * "View as" (Section 6.3): a platform owner (or staff granted it) opens a session as a member of
 * the tenant they are on, with a required reason and a hard time limit. While it lasts, can()
 * blocks password, security and payment changes; the shell shows a banner; start and stop are
 * audited in the tenant. The Console UI to start it arrives in P11b.
 */
export const ADMIN_SESSION_COOKIE = "il.admin_session";

/**
 * Better Auth endpoints an impersonation session may call. Everything else (adding a passkey,
 * changing the profile, listing or revoking the user's sessions, enabling 2FA, signing in again)
 * would act on the real account beyond the time-limited, tenant-scoped "view as".
 */
const ALLOWED_WHILE_IMPERSONATING = new Set(["/get-session", "/sign-out", "/impersonation/stop"]);

type GuardContext = {
  path: string;
  headers?: Headers | undefined;
  request?: Request | undefined;
};

/**
 * Runs before every Better Auth endpoint (src/modules/auth/auth.ts). An impersonation session is
 * refused on any endpoint outside the allow-list, and on every endpoint once its deadline has
 * passed (Better Auth extends expires_at on use, so the deadline is the authority).
 */
export async function impersonationGuard(ctx: GuardContext): Promise<void> {
  const cookie = ctx.headers?.get("cookie") ?? ctx.request?.headers.get("cookie") ?? "";
  if (!cookie.includes("session_token")) return;
  const found = await getSessionFromCtx(ctx as Parameters<typeof getSessionFromCtx>[0]);
  const fields = found?.session as
    (SessionFields & { impersonationExpiresAt?: Date | string | null }) | undefined;
  if (!fields?.impersonatedBy) return;
  const deadline = fields.impersonationExpiresAt ? new Date(fields.impersonationExpiresAt) : null;
  if (!deadline || deadline <= new Date()) {
    throw new APIError("UNAUTHORIZED", {
      message: "impersonation_expired",
      code: "impersonation_expired",
    });
  }
  if (!ALLOWED_WHILE_IMPERSONATING.has(ctx.path)) {
    throw new APIError("FORBIDDEN", {
      message: "blocked_while_impersonating",
      code: "blocked_while_impersonating",
    });
  }
}
export const MAX_IMPERSONATION_MINUTES = 60;

const startBody = z.object({
  userId: z.uuid(),
  reason: z.string().trim().min(10).max(500),
  minutes: z.number().int().min(1).max(MAX_IMPERSONATION_MINUTES),
});

type SessionFields = {
  tenantId: string;
  impersonatedBy?: string | null;
};

export function impersonation() {
  return {
    id: "impersonation",
    endpoints: {
      startImpersonation: createAuthEndpoint(
        "/impersonation/start",
        { method: "POST", body: startBody, use: [sessionMiddleware] },
        async (ctx) => {
          const current = ctx.context.session;
          const fields = current.session as typeof current.session & SessionFields;
          if (fields.impersonatedBy) {
            throw new APIError("FORBIDDEN", { message: "already_impersonating" });
          }
          const platformRole = (current.user as { platformRole?: PlatformRole | null })
            .platformRole;
          const actor = {
            userId: current.user.id,
            tenantId: fields.tenantId,
            role: null,
            platformRole: platformRole ?? null,
          };
          if (!can(actor, "platform.impersonate")) {
            throw new APIError("FORBIDDEN", { message: "forbidden" });
          }
          const hostTenant = await requestTenantId(
            (name) => ctx.headers?.get(name) ?? ctx.request?.headers.get(name) ?? null,
          );
          if (fields.tenantId !== hostTenant) {
            throw new APIError("FORBIDDEN", { message: "wrong_tenant" });
          }
          const hasTotp = !!(current.user as { twoFactorEnabled?: boolean | null })
            .twoFactorEnabled;
          const passkeys = hasTotp
            ? []
            : await ctx.context.adapter.findMany({
                model: "passkey",
                where: [{ field: "userId", value: current.user.id }],
                limit: 1,
              });
          if (!hasTotp && passkeys.length === 0) {
            throw new APIError("FORBIDDEN", { message: "second_factor_required" });
          }
          const { userId, reason, minutes } = ctx.body;
          if (userId === current.user.id) throw new APIError("BAD_REQUEST", { message: "self" });

          const target = await ctx.context.internalAdapter.findUserById(userId);
          if (!target || (target as { platformRole?: string | null }).platformRole) {
            // Platform staff are never impersonated (Section 6.3 limits).
            throw new APIError("FORBIDDEN", { message: "target_not_allowed" });
          }
          const member = await withTenant({ tenantId: fields.tenantId }, async (tx) => {
            const [row] = await tx
              .select({ status: memberships.status })
              .from(memberships)
              .where(and(eq(memberships.userId, userId), isNull(memberships.deletedAt)));
            return row;
          });
          if (member?.status !== "active") {
            throw new APIError("FORBIDDEN", { message: "target_not_a_member" });
          }

          const deadline = new Date(Date.now() + minutes * 60_000);
          // Audited first: if the entry cannot be written, no impersonation session exists. The
          // free-text reason stays on the session row (it may name people), not in the audit log.
          await audit(
            { tenantId: fields.tenantId },
            {
              action: "impersonation.started",
              actorUserId: current.user.id,
              target: { type: "user", id: userId },
              metadata: { minutes },
            },
          );
          const session = await ctx.context.internalAdapter.createSession(userId, true, {
            tenantId: fields.tenantId,
            impersonatedBy: current.user.id,
            impersonationReason: reason,
            impersonationExpiresAt: deadline,
            expiresAt: deadline,
          });
          await ctx.setSignedCookie(
            ADMIN_SESSION_COOKIE,
            current.session.token,
            ctx.context.secret,
            {
              httpOnly: true,
              sameSite: "lax",
              secure: ctx.context.authCookies.sessionToken.attributes.secure,
              path: "/",
              maxAge: minutes * 60,
            },
          );
          await setSessionCookie(ctx, { session, user: target }, true);
          return ctx.json({ ok: true, expiresAt: deadline.toISOString() });
        },
      ),

      stopImpersonation: createAuthEndpoint(
        "/impersonation/stop",
        { method: "POST", use: [sessionMiddleware] },
        async (ctx) => {
          const current = ctx.context.session;
          const fields = current.session as typeof current.session & SessionFields;
          if (!fields.impersonatedBy)
            throw new APIError("BAD_REQUEST", { message: "not_impersonating" });

          await ctx.context.internalAdapter.deleteSession(current.session.token);
          const adminToken = await ctx.getSignedCookie(ADMIN_SESSION_COOKIE, ctx.context.secret);
          const admin = adminToken
            ? await ctx.context.internalAdapter.findSession(adminToken)
            : null;
          ctx.setCookie(ADMIN_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
          if (admin && admin.session.expiresAt > new Date()) {
            await setSessionCookie(ctx, admin);
          } else {
            deleteSessionCookie(ctx);
          }
          await audit(
            { tenantId: fields.tenantId },
            {
              action: "impersonation.stopped",
              actorUserId: fields.impersonatedBy,
              target: { type: "user", id: current.user.id },
            },
          );
          return ctx.json({ ok: true });
        },
      ),
    },
  } satisfies BetterAuthPlugin;
}
