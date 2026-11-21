import { audit } from "@/modules/audit";

/**
 * Small Better Auth hooks that close account-level gaps (P3 security review):
 * - an unverified password set by someone else must not survive the real owner's magic link;
 * - security changes made through Better Auth's own endpoints land in the tenant's audit log.
 */
type AdapterUser = { id: string; emailVerified?: boolean | null };
type AdapterAccount = { id: string; providerId: string };

interface HookContext {
  path: string;
  query?: Record<string, unknown> | undefined;
  context: {
    internalAdapter: {
      findVerificationValue(identifier: string): Promise<{ value: string } | null>;
      findUserByEmail(
        email: string,
        options?: { includeAccounts: boolean },
      ): Promise<{ user: AdapterUser; accounts: AdapterAccount[] } | null>;
      deleteAccount(id: string): Promise<void>;
    };
    returned?: unknown;
    session?: { user: { id: string }; session: { tenantId?: string } } | null;
    newSession?: { user: { id: string }; session: { tenantId?: string } } | null;
  };
}

/**
 * Account pre-hijacking defence. Before a magic link signs someone in, an account whose email was
 * never verified loses any password: whoever set it never proved they own the address. The real
 * owner can set a new password afterwards.
 */
export async function stripUnverifiedPassword(raw: { path: string }): Promise<void> {
  const ctx = raw as unknown as HookContext;
  if (ctx.path !== "/magic-link/verify") return;
  const token = typeof ctx.query?.token === "string" ? ctx.query.token : null;
  if (!token) return;
  const stored = await ctx.context.internalAdapter.findVerificationValue(`magic-link:${token}`);
  if (!stored) return;
  let email: string | undefined;
  try {
    email = (JSON.parse(stored.value) as { email?: string }).email;
  } catch {
    return;
  }
  if (!email) return;
  const found = await ctx.context.internalAdapter.findUserByEmail(email, { includeAccounts: true });
  if (!found || found.user.emailVerified) return;
  for (const account of found.accounts) {
    if (account.providerId === "credential")
      await ctx.context.internalAdapter.deleteAccount(account.id);
  }
}

/** Better Auth endpoints that change account security, and the audit action for each. */
const SECURITY_CHANGES: Record<string, string> = {
  "/two-factor/enable": "account.two_factor_enabled",
  "/two-factor/disable": "account.two_factor_disabled",
  "/two-factor/generate-backup-codes": "account.backup_codes_regenerated",
  "/passkey/verify-registration": "account.passkey_added",
  "/passkey/delete-passkey": "account.passkey_removed",
  "/change-password": "account.password_changed",
  "/set-password": "account.password_set",
  "/revoke-session": "account.session_revoked",
  "/revoke-sessions": "account.sessions_revoked",
  "/revoke-other-sessions": "account.sessions_revoked",
  "/change-email": "account.email_change_requested",
  "/update-user": "account.profile_updated",
};

export async function auditSecurityChange(raw: { path: string }): Promise<void> {
  const ctx = raw as unknown as HookContext;
  const action = SECURITY_CHANGES[ctx.path];
  if (!action) return;
  const returned = ctx.context.returned as { status?: number; statusCode?: number } | undefined;
  if (returned && ((returned.status ?? 200) >= 400 || (returned.statusCode ?? 200) >= 400)) return;
  const session = ctx.context.session ?? ctx.context.newSession;
  const tenantId = session?.session.tenantId;
  if (!session || !tenantId) return;
  await audit(
    { tenantId },
    { action, actorUserId: session.user.id, target: { type: "user", id: session.user.id } },
  );
}
