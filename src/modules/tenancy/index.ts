// Public API of the tenancy module. Other modules import only from this file.
// withTenant(ctx, fn) lands here in P2; it is the only way tenant data is queried.
export { pingDatabase } from "./connection";
