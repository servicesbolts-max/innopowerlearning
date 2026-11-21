import type { PlatformRole, RegistrationMode, TenantRole } from "@/db/schema";
import { requiresSecondFactor } from "@/modules/rbac";

/**
 * Who may get a session on which host, decided once per new session (Better Auth's
 * `session.create.before` hook). Pure: no I/O, so every rule is unit-tested.
 *
 * Sections 3, 5.1, 6.1 and 10: sessions are scoped to the tenant host; sign-up and sign-in follow
 * the tenant's registration mode; admin roles must use a second factor, so passwordless email
 * (magic link) and, outside SSO-only tenants, OAuth are refused for them.
 */
export type SignInMethod = "password" | "magic-link" | "oauth" | "passkey" | "other";

export type AdmissionInput = {
  method: SignInMethod;
  tenant: {
    kind: "platform" | "partner";
    registrationMode: RegistrationMode;
    allowedEmailDomains: readonly string[];
    requireAdmin2fa: boolean;
  };
  user: { email: string; platformRole: PlatformRole | null };
  membership: { role: TenantRole; status: "active" | "pending" | "suspended" } | null;
  /** A valid, unexpired invitation for this email, proven by the invite token. */
  invitation: { role: TenantRole } | null;
};

export type DenyReason =
  | "not_a_platform_user"
  | "membership_suspended"
  | "pending_approval"
  | "invite_required"
  | "domain_not_allowed"
  | "sso_required"
  | "method_not_allowed_for_admins";

export type Admission =
  | { allow: true; join?: { role: TenantRole; status: "active" }; acceptInvitation?: boolean }
  | { allow: false; reason: DenyReason; join?: { role: TenantRole; status: "pending" } };

/** Maps a Better Auth endpoint path to the sign-in method that created the session. */
export function methodForPath(path: string | undefined): SignInMethod {
  if (!path) return "other";
  if (path.startsWith("/sign-in/email") || path.startsWith("/sign-up/email")) return "password";
  // Confirming the email after a password sign-up completes that sign-up.
  if (path.startsWith("/verify-email")) return "password";
  // A TOTP or backup-code verification completes a password sign-in.
  if (path.startsWith("/two-factor/")) return "password";
  if (path.startsWith("/magic-link")) return "magic-link";
  if (
    path.startsWith("/callback/") ||
    path.startsWith("/oauth2/callback") ||
    path.startsWith("/sign-in/social")
  ) {
    return "oauth";
  }
  if (path.startsWith("/passkey/")) return "passkey";
  return "other";
}

export function emailDomain(email: string): string {
  return email.slice(email.lastIndexOf("@") + 1).toLowerCase();
}

function methodAllowed(input: AdmissionInput, role: TenantRole | null): DenyReason | null {
  const { method, tenant, user } = input;
  if (user.platformRole) {
    // Platform staff hold every tenant's data: always a second factor, never an unknown path.
    return method === "password" || method === "passkey" ? null : "method_not_allowed_for_admins";
  }
  if (tenant.registrationMode === "sso_only" && method !== "oauth") return "sso_required";
  const admin = role !== null && requiresSecondFactor({ role, platformRole: null });
  if (admin && tenant.requireAdmin2fa) {
    if (method === "magic-link" || method === "other") return "method_not_allowed_for_admins";
    if (method === "oauth" && tenant.registrationMode !== "sso_only") {
      return "method_not_allowed_for_admins";
    }
  }
  return null;
}

export function decideAdmission(input: AdmissionInput): Admission {
  const { tenant, user, membership, invitation } = input;

  // Hub and Console: platform staff only. Everyone else signs in on their organization's host.
  if (tenant.kind === "platform") {
    if (!user.platformRole) return { allow: false, reason: "not_a_platform_user" };
    const denied = methodAllowed(input, null);
    return denied ? { allow: false, reason: denied } : { allow: true };
  }

  // Platform staff may enter any partner host without a membership.
  if (user.platformRole && !membership) {
    const denied = methodAllowed(input, null);
    return denied ? { allow: false, reason: denied } : { allow: true };
  }

  if (membership) {
    if (membership.status === "suspended") return { allow: false, reason: "membership_suspended" };
    if (membership.status === "pending") return { allow: false, reason: "pending_approval" };
    const denied = methodAllowed(input, membership.role);
    return denied ? { allow: false, reason: denied } : { allow: true };
  }

  // Not a member yet: an invitation decides, then the tenant's registration mode.
  if (invitation) {
    const denied = methodAllowed(input, invitation.role);
    if (denied) return { allow: false, reason: denied };
    return {
      allow: true,
      join: { role: invitation.role, status: "active" },
      acceptInvitation: true,
    };
  }

  const denied = methodAllowed(input, "learner");
  if (denied) return { allow: false, reason: denied };
  switch (tenant.registrationMode) {
    case "open":
    case "sso_only":
      return { allow: true, join: { role: "learner", status: "active" } };
    case "email_domain":
      return tenant.allowedEmailDomains
        .map((d) => d.toLowerCase())
        .includes(emailDomain(user.email))
        ? { allow: true, join: { role: "learner", status: "active" } }
        : { allow: false, reason: "domain_not_allowed" };
    case "application":
      return {
        allow: false,
        reason: "pending_approval",
        join: { role: "learner", status: "pending" },
      };
    case "invite_only":
      return { allow: false, reason: "invite_required" };
  }
}
