// Public API of the tenancy module. Other modules import only from this file.
// withTenant(ctx, fn) is the only way tenant data is queried.
export { pingDatabase } from "./connection";
export { withTenant, type TenantContext, type TenantTx } from "./with-tenant";
export { classifyHost, normalizeHost, type HostClass } from "./host";
export { isPartnerSlug, RESERVED_SLUGS, SLUG_PATTERN } from "./slugs";
export {
  resolveTenant,
  listPublicPartners,
  type ResolvedTenant,
  type PublicPartner,
} from "./lookup";
export {
  activeTenantIdForSlug,
  loadTenantShell,
  loadTenantShellById,
  tenantLogoSchema,
  type TenantLogo,
  type TenantShell,
} from "./shell";
export { featureFlagKey, flagsForPreset, PRESET_FLAGS, type FeatureFlagKey } from "./presets";
export {
  cachedResolver,
  CONSOLE_PREFIX,
  decideRoute,
  TENANT_ID_HEADER,
  TENANT_PREFIX,
  TENANT_SLUG_HEADER,
  type RouteDecision,
  type RouteInput,
  type TenantResolver,
} from "./routing";
export {
  brandingSchema,
  getBranding,
  monogramText,
  saveBranding,
  type Branding,
  type BrandingInput,
} from "./branding";
export {
  listAllPartners,
  listPartners,
  provisionSchema,
  provisionTenant,
  type PartnerRow,
  type ProvisionInput,
} from "./provision";
