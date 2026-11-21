import type { PlatformRole, TenantRole } from "@/db/schema";

/**
 * Permission strings (Section 4). Roles are bundles of these; `can()` is the only check, used by
 * UI and server alike. Add a permission here, grant it in ROLE_GRANTS, and extend the expected
 * matrix in permissions.test.ts in the same change.
 */
export const PERMISSIONS = [
  // Public and learning
  "catalog.read",
  "course.learn",
  "submission.write",
  "discussion.post",
  // Teaching
  "course.create",
  "course.edit",
  "course.publish",
  "grade.write",
  "qa.answer",
  "discussion.moderate",
  "cohort.message",
  "analytics.read",
  // Programs and people
  "cohort.manage",
  "application.review",
  "enrollment.manage",
  "announcement.post",
  "member.read",
  "member.invite",
  "member.manage",
  // Reports
  "report.read",
  "report.aggregate.read",
  // Tenant administration
  "tenant.settings.write",
  "site.edit",
  "site.publish",
  "audit.read",
  "billing.manage",
  // Own account (blocked while impersonating)
  "account.password.change",
  "account.2fa.manage",
  "account.passkey.manage",
  "payment.make",
  // Platform (Super Admin)
  "tenant.provision",
  "tenant.suspend",
  "plan.manage",
  "platform.support.read",
  "platform.settings.write",
  "platform.impersonate",
  "library.manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** Grants that only hold for resources the actor owns or is assigned to. */
export type Scope = "any" | "own" | "assigned";
type Grants = Partial<Record<Permission, Scope>>;

const SELF: Grants = {
  "catalog.read": "any",
  "account.password.change": "any",
  "account.2fa.manage": "any",
  "account.passkey.manage": "any",
};

const LEARNER: Grants = {
  ...SELF,
  "course.learn": "any",
  "submission.write": "own",
  "discussion.post": "any",
  "payment.make": "any",
};

export const ROLE_GRANTS: Record<TenantRole, Grants> = {
  learner: LEARNER,
  // Funders: read-only aggregated reports for the programs they are assigned to.
  sponsor_viewer: { ...SELF, "report.aggregate.read": "assigned" },
  teaching_assistant: {
    ...LEARNER,
    "grade.write": "assigned",
    "qa.answer": "assigned",
    "discussion.moderate": "assigned",
  },
  instructor: {
    ...LEARNER,
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
    ...LEARNER,
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
  // Everything inside the tenant, including settings and the Site Builder.
  tenant_admin: {
    ...LEARNER,
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

/** Platform staff: support tools and read-only tenant data; no secrets or billing (Section 4). */
const PLATFORM_STAFF: Grants = {
  ...SELF,
  "member.read": "any",
  "report.read": "any",
  "report.aggregate.read": "any",
  "analytics.read": "any",
  "audit.read": "any",
  "platform.support.read": "any",
};

export const PLATFORM_GRANTS: Record<PlatformRole, Grants> = {
  // Everything, in every tenant.
  platform_owner: Object.fromEntries(PERMISSIONS.map((p) => [p, "any"])) as Grants,
  platform_staff: PLATFORM_STAFF,
};

/** Roles whose members must use a second factor (Section 10: mandatory 2FA for admin roles). */
export const ROLES_REQUIRING_2FA: ReadonlySet<TenantRole | PlatformRole> = new Set([
  "tenant_admin",
  "program_manager",
  "platform_owner",
  "platform_staff",
]);

/** Never allowed while impersonating (Section 6.3): password, security and payment changes. */
export const BLOCKED_WHILE_IMPERSONATING: ReadonlySet<Permission> = new Set([
  "account.password.change",
  "account.2fa.manage",
  "account.passkey.manage",
  "payment.make",
  "billing.manage",
  "platform.impersonate",
  "platform.settings.write",
]);
