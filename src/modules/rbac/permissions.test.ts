import { describe, expect, it } from "vitest";
import { TENANT_ROLES, type TenantRole } from "@/db/schema";
import { can, requiresSecondFactor, type Actor, type Resource } from "./can";
import { BLOCKED_WHILE_IMPERSONATING, PERMISSIONS, type Permission } from "./permissions";

/**
 * The full role × permission matrix (Section 4, P3 acceptance). This table is the contract,
 * written out on purpose rather than derived from ROLE_GRANTS: changing a grant must change it.
 * "any" = everywhere in the tenant, "own" = resources the actor owns, "assigned" = resources the
 * actor is assigned to. Anything not listed is denied.
 */
const EXPECTED: Record<TenantRole, Partial<Record<Permission, "any" | "own" | "assigned">>> = {
  learner: {
    "catalog.read": "any",
    "course.learn": "any",
    "submission.write": "own",
    "discussion.post": "any",
    "payment.make": "any",
    "account.password.change": "any",
    "account.2fa.manage": "any",
    "account.passkey.manage": "any",
  },
  sponsor_viewer: {
    "catalog.read": "any",
    "report.aggregate.read": "assigned",
    "account.password.change": "any",
    "account.2fa.manage": "any",
    "account.passkey.manage": "any",
  },
  teaching_assistant: {
    "catalog.read": "any",
    "course.learn": "any",
    "submission.write": "own",
    "discussion.post": "any",
    "payment.make": "any",
    "account.password.change": "any",
    "account.2fa.manage": "any",
    "account.passkey.manage": "any",
    "grade.write": "assigned",
    "qa.answer": "assigned",
    "discussion.moderate": "assigned",
  },
  instructor: {
    "catalog.read": "any",
    "course.learn": "any",
    "submission.write": "own",
    "discussion.post": "any",
    "payment.make": "any",
    "account.password.change": "any",
    "account.2fa.manage": "any",
    "account.passkey.manage": "any",
    "course.create": "any",
    "course.edit": "own",
    "course.publish": "own",
    "grade.write": "own",
    "qa.answer": "own",
    "discussion.moderate": "own",
    "cohort.message": "own",
    "analytics.read": "own",
  },
  program_manager: {
    "catalog.read": "any",
    "course.learn": "any",
    "submission.write": "own",
    "discussion.post": "any",
    "payment.make": "any",
    "account.password.change": "any",
    "account.2fa.manage": "any",
    "account.passkey.manage": "any",
    "cohort.manage": "any",
    "cohort.message": "any",
    "application.review": "any",
    "enrollment.manage": "any",
    "announcement.post": "any",
    "member.read": "any",
    "member.invite": "any",
    "report.read": "any",
    "report.aggregate.read": "any",
    "analytics.read": "any",
  },
  tenant_admin: {
    "catalog.read": "any",
    "course.learn": "any",
    "submission.write": "own",
    "discussion.post": "any",
    "payment.make": "any",
    "account.password.change": "any",
    "account.2fa.manage": "any",
    "account.passkey.manage": "any",
    "course.create": "any",
    "course.edit": "any",
    "course.publish": "any",
    "grade.write": "any",
    "qa.answer": "any",
    "discussion.moderate": "any",
    "cohort.message": "any",
    "analytics.read": "any",
    "cohort.manage": "any",
    "application.review": "any",
    "enrollment.manage": "any",
    "announcement.post": "any",
    "member.read": "any",
    "member.invite": "any",
    "member.manage": "any",
    "report.read": "any",
    "report.aggregate.read": "any",
    "tenant.settings.write": "any",
    "site.edit": "any",
    "site.publish": "any",
    "audit.read": "any",
    "billing.manage": "any",
  },
};

const ME = "0190a1b2-0000-7000-8000-0000000000aa";
const OTHER = "0190a1b2-0000-7000-8000-0000000000bb";
const T1 = "0190a1b2-0000-7000-8000-000000000001";
const T2 = "0190a1b2-0000-7000-8000-000000000002";

const actor = (role: TenantRole | null, extra: Partial<Actor> = {}): Actor => ({
  userId: ME,
  tenantId: T1,
  role,
  platformRole: null,
  ...extra,
});

/** The four situations every grant is checked in. */
const SITUATIONS: {
  name: string;
  resource?: Resource;
  allowedBy: ("any" | "own" | "assigned")[];
}[] = [
  { name: "tenant-wide", resource: undefined, allowedBy: ["any", "own"] },
  { name: "own resource", resource: { tenantId: T1, ownerId: ME }, allowedBy: ["any", "own"] },
  {
    name: "someone else's, assigned to me",
    resource: { tenantId: T1, ownerId: OTHER, assigneeIds: [ME] },
    allowedBy: ["any", "assigned"],
  },
  { name: "someone else's", resource: { tenantId: T1, ownerId: OTHER }, allowedBy: ["any"] },
];

describe("can(): tenant role × permission matrix", () => {
  for (const role of TENANT_ROLES) {
    for (const permission of PERMISSIONS) {
      for (const s of SITUATIONS) {
        const scope = EXPECTED[role][permission];
        const want = scope !== undefined && s.allowedBy.includes(scope);
        it(`${role} ${want ? "may" : "may not"} ${permission} (${s.name})`, () => {
          expect(can(actor(role), permission, s.resource)).toBe(want);
        });
      }
    }
  }
});

describe("can(): ownership edge cases", () => {
  it("never treats a resource with no owner (null) as the actor's own", () => {
    expect(can(actor("instructor"), "course.edit", { tenantId: T1, ownerId: null })).toBe(false);
    expect(can(actor("tenant_admin"), "course.edit", { tenantId: T1, ownerId: null })).toBe(true);
  });

  it("lets an own-scoped grant create new things in the tenant", () => {
    expect(can(actor("instructor"), "course.edit", { tenantId: T1 })).toBe(true);
  });
});

describe("can(): tenant boundaries", () => {
  it("denies every permission on another tenant's resources to tenant roles", () => {
    for (const role of TENANT_ROLES) {
      for (const permission of PERMISSIONS) {
        expect(
          can(actor(role), permission, { tenantId: T2, ownerId: ME }),
          `${role} ${permission}`,
        ).toBe(false);
      }
    }
  });

  it("lets guests (no actor, or no membership) only read the catalog", () => {
    for (const permission of PERMISSIONS) {
      const want = permission === "catalog.read";
      expect(can(null, permission)).toBe(want);
      expect(can(actor(null), permission)).toBe(want);
    }
  });
});

describe("can(): platform roles", () => {
  it("gives the platform owner everything, in every tenant", () => {
    const owner = actor(null, { platformRole: "platform_owner" });
    for (const permission of PERMISSIONS) {
      expect(can(owner, permission, { tenantId: T2, ownerId: OTHER })).toBe(true);
    }
  });

  it("gives platform staff read-only support access and no secrets, billing or impersonation", () => {
    const staff = actor(null, { platformRole: "platform_staff" });
    const allowed = PERMISSIONS.filter((p) => can(staff, p, { tenantId: T2 }));
    expect(allowed.sort()).toEqual(
      [
        "account.2fa.manage",
        "account.passkey.manage",
        "account.password.change",
        "analytics.read",
        "audit.read",
        "catalog.read",
        "member.read",
        "platform.support.read",
        "report.aggregate.read",
        "report.read",
      ].sort(),
    );
  });

  it("lets platform staff impersonate only when granted", () => {
    const staff = actor(null, { platformRole: "platform_staff" });
    expect(can(staff, "platform.impersonate")).toBe(false);
    expect(can({ ...staff, extraGrants: ["platform.impersonate"] }, "platform.impersonate")).toBe(
      true,
    );
  });
});

describe("can(): while impersonating", () => {
  it("blocks password, security and payment changes even for the platform owner", () => {
    for (const a of [
      actor("tenant_admin", { impersonatedBy: OTHER }),
      actor(null, { platformRole: "platform_owner", impersonatedBy: OTHER }),
    ]) {
      for (const permission of BLOCKED_WHILE_IMPERSONATING) {
        expect(can(a, permission), permission).toBe(false);
      }
    }
  });

  it("keeps the impersonated user's other permissions", () => {
    expect(can(actor("tenant_admin", { impersonatedBy: OTHER }), "member.read")).toBe(true);
  });
});

describe("requiresSecondFactor", () => {
  it("requires 2FA for admin roles only", () => {
    expect(
      TENANT_ROLES.filter((r) => requiresSecondFactor({ role: r, platformRole: null })),
    ).toEqual(["tenant_admin", "program_manager"]);
    expect(requiresSecondFactor({ role: null, platformRole: "platform_staff" })).toBe(true);
    expect(requiresSecondFactor({ role: "learner", platformRole: null })).toBe(false);
  });
});
