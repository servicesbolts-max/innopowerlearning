import { auth } from "@/modules/auth";

/**
 * Better Auth's endpoints on every host (/api/auth/*). The proxy has already resolved the host and
 * attached the tenant (x-tenant-id) or refused the request. The auth instance is created on the
 * first request, so builds need no database or auth secrets.
 */
function handle(request: Request): Promise<Response> {
  return auth().handler(request);
}

export { handle as GET, handle as POST };
