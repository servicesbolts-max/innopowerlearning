import type { PlatformRole, TenantRole } from "@/db/schema";
import {
  BLOCKED_WHILE_IMPERSONATING,
  PLATFORM_GRANTS,
  ROLE_GRANTS,
  ROLES_REQUIRING_2FA,
  type Permission,
  type Scope,
} from "./permissions";

/**
 * Who is acting. Built from a validated session (src/modules/auth), never from request input.
 * `role` is the actor's active membership role in `tenantId` (null for a guest).
 */
export interface Actor {
  userId: string;
  tenantId: string;
  role: TenantRole | null;
  platformRole: PlatformRole | null;
  /** Set when a platform owner is viewing as this user. */
  impersonatedBy?: string | null;
  /** Platform staff may impersonate only when this grant is given (Section 4). */
  extraGrants?: readonly Permission[];
}

/** What is being acted on. Omit for tenant-wide actions. */
export interface Resource {
  tenantId?: string;
  ownerId?: string | null;
  assigneeIds?: readonly string[];
}

function scopeAllows(scope: Scope | undefined, actor: Actor, resource?: Resource): boolean {
  switch (scope) {
    case "any":
      return true;
    case "own":
      // No owner given (undefined) means a tenant-wide action such as creating something new.
      // A resource whose owner is explicitly null belongs to nobody, so it is not "own".
      return resource?.ownerId === undefined || resource.ownerId === actor.userId;
    case "assigned":
      return !!resource?.assigneeIds?.includes(actor.userId);
    default:
      return false;
  }
}

/**
 * The single permission check (Section 4). Deny by default:
 * - a resource in another tenant is denied, except to platform roles that hold the permission;
 * - while impersonating, password, security, payment and impersonation permissions are denied;
 * - otherwise the tenant role's grant (with its own/assigned scope) or a platform grant decides.
 */
export function can(
  actor: Actor | null | undefined,
  permission: Permission,
  resource?: Resource,
): boolean {
  if (!actor) return permission === "catalog.read";
  if (actor.impersonatedBy && BLOCKED_WHILE_IMPERSONATING.has(permission)) return false;

  const platformScope = actor.platformRole
    ? (PLATFORM_GRANTS[actor.platformRole][permission] ??
      (actor.extraGrants?.includes(permission) ? "any" : undefined))
    : undefined;
  if (platformScope && scopeAllows(platformScope, actor, resource)) return true;

  if (resource?.tenantId && resource.tenantId !== actor.tenantId) return false;
  if (!actor.role) return permission === "catalog.read";
  return scopeAllows(ROLE_GRANTS[actor.role][permission], actor, resource);
}

/** Whether this actor must have a second factor before using privileged areas. */
export function requiresSecondFactor(actor: Pick<Actor, "role" | "platformRole">): boolean {
  return (
    (actor.role !== null && ROLES_REQUIRING_2FA.has(actor.role)) ||
    (actor.platformRole !== null && ROLES_REQUIRING_2FA.has(actor.platformRole))
  );
}
