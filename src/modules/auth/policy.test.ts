import { describe, expect, it } from "vitest";
import { decideAdmission, methodForPath, type AdmissionInput } from "./policy";

const base = (over: Partial<AdmissionInput> = {}): AdmissionInput => ({
  method: "password",
  tenant: {
    kind: "partner",
    registrationMode: "open",
    allowedEmailDomains: [],
    requireAdmin2fa: true,
  },
  user: { email: "ada@school.edu", platformRole: null },
  membership: null,
  invitation: null,
  ...over,
});
const mode = (registrationMode: AdmissionInput["tenant"]["registrationMode"], extra = {}) =>
  base({ tenant: { ...base().tenant, registrationMode, ...extra } });

describe("methodForPath", () => {
  it.each([
    ["/sign-in/email", "password"],
    ["/sign-up/email", "password"],
    ["/two-factor/verify-totp", "password"],
    ["/magic-link/verify", "magic-link"],
    ["/callback/google", "oauth"],
    ["/passkey/verify-authentication", "passkey"],
    ["/sign-in/social", "oauth"],
    ["/verify-email", "password"],
    [undefined, "other"],
  ])("%s → %s", (path, method) => expect(methodForPath(path)).toBe(method));
});

describe("registration modes (no membership yet)", () => {
  it("open: joins as an active learner", () => {
    expect(decideAdmission(mode("open"))).toEqual({
      allow: true,
      join: { role: "learner", status: "active" },
    });
  });

  it("invite_only: refuses without an invitation, joins with the invited role", () => {
    expect(decideAdmission(mode("invite_only"))).toEqual({
      allow: false,
      reason: "invite_required",
    });
    expect(decideAdmission({ ...mode("invite_only"), invitation: { role: "instructor" } })).toEqual(
      { allow: true, join: { role: "instructor", status: "active" }, acceptInvitation: true },
    );
  });

  it("email_domain: joins only from an allowed domain, case-insensitively", () => {
    expect(
      decideAdmission(mode("email_domain", { allowedEmailDomains: ["School.edu"] })).allow,
    ).toBe(true);
    expect(decideAdmission(mode("email_domain", { allowedEmailDomains: ["other.org"] }))).toEqual({
      allow: false,
      reason: "domain_not_allowed",
    });
  });

  it("application: records a pending membership and refuses the session", () => {
    expect(decideAdmission(mode("application"))).toEqual({
      allow: false,
      reason: "pending_approval",
      join: { role: "learner", status: "pending" },
    });
  });

  it("sso_only: only OAuth sign-ins get in", () => {
    expect(decideAdmission(mode("sso_only"))).toEqual({ allow: false, reason: "sso_required" });
    expect(decideAdmission({ ...mode("sso_only"), method: "oauth" }).allow).toBe(true);
  });
});

describe("existing members", () => {
  it("lets active members in and keeps suspended and pending ones out", () => {
    expect(decideAdmission(base({ membership: { role: "learner", status: "active" } }))).toEqual({
      allow: true,
    });
    expect(decideAdmission(base({ membership: { role: "learner", status: "suspended" } }))).toEqual(
      {
        allow: false,
        reason: "membership_suspended",
      },
    );
    expect(decideAdmission(base({ membership: { role: "learner", status: "pending" } }))).toEqual({
      allow: false,
      reason: "pending_approval",
    });
  });

  it("does not let an invite-only tenant lock out its own members", () => {
    expect(
      decideAdmission({
        ...mode("invite_only"),
        membership: { role: "learner", status: "active" },
      }),
    ).toEqual({ allow: true });
  });
});

describe("admins must use a second factor", () => {
  const admin = { role: "tenant_admin" as const, status: "active" as const };

  it("refuses magic links and OAuth for admin roles", () => {
    for (const method of ["magic-link", "oauth"] as const) {
      expect(decideAdmission(base({ method, membership: admin }))).toEqual({
        allow: false,
        reason: "method_not_allowed_for_admins",
      });
    }
  });

  it("refuses unknown sign-in paths for admins and platform staff", () => {
    expect(decideAdmission(base({ method: "other", membership: admin }))).toEqual({
      allow: false,
      reason: "method_not_allowed_for_admins",
    });
    expect(
      decideAdmission(
        base({ method: "other", user: { email: "o@x.test", platformRole: "platform_owner" } }),
      ),
    ).toEqual({ allow: false, reason: "method_not_allowed_for_admins" });
  });

  it("allows password (then TOTP) and passkeys for admin roles", () => {
    expect(decideAdmission(base({ method: "password", membership: admin })).allow).toBe(true);
    expect(decideAdmission(base({ method: "passkey", membership: admin })).allow).toBe(true);
  });

  it("allows OAuth for admins on SSO-only tenants (the identity provider owns MFA)", () => {
    expect(decideAdmission({ ...mode("sso_only"), method: "oauth", membership: admin }).allow).toBe(
      true,
    );
  });

  it("respects a tenant that turned off required admin 2FA", () => {
    expect(
      decideAdmission({
        ...base({ method: "magic-link", membership: admin }),
        tenant: { ...base().tenant, requireAdmin2fa: false },
      }).allow,
    ).toBe(true);
  });

  it("applies the same rule to an invitation for an admin role", () => {
    expect(
      decideAdmission({
        ...mode("invite_only"),
        method: "magic-link",
        invitation: { role: "tenant_admin" },
      }),
    ).toEqual({ allow: false, reason: "method_not_allowed_for_admins" });
  });
});

describe("hub, console and platform staff", () => {
  const owner = { email: "owner@innopower.example", platformRole: "platform_owner" as const };
  const hub = { ...base().tenant, kind: "platform" as const };

  it("admits only platform staff on the platform tenant", () => {
    expect(decideAdmission(base({ tenant: hub }))).toEqual({
      allow: false,
      reason: "not_a_platform_user",
    });
    expect(decideAdmission(base({ tenant: hub, user: owner }))).toEqual({ allow: true });
  });

  it("lets platform staff into partner hosts without a membership, never by email link", () => {
    expect(decideAdmission(base({ user: owner }))).toEqual({ allow: true });
    expect(decideAdmission(base({ user: owner, method: "magic-link" }))).toEqual({
      allow: false,
      reason: "method_not_allowed_for_admins",
    });
  });
});
