// Public API of the rbac module. Other modules import only from this file.
export { can, requiresSecondFactor, type Actor, type Resource } from "./can";
export {
  BLOCKED_WHILE_IMPERSONATING,
  PERMISSIONS,
  ROLE_GRANTS,
  ROLES_REQUIRING_2FA,
  type Permission,
} from "./permissions";
