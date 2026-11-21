import { auth } from "@/modules/auth";

/**
 * Better Auth's endpoints on every host (/api/auth/*). The proxy has already resolved the host and
 * attached the tenant (x-tenant-id) or refused the request. The auth instance is created on the
 * first request, so builds need no database or auth secrets.
 */
const MAGIC_LINK_VERIFY = "/api/auth/magic-link/verify";

async function handle(request: Request): Promise<Response> {
  const response = await auth().handler(request);
  const url = new URL(request.url);
  // A magic link is opened in the browser: a refusal (admission policy, expired or used token)
  // must land on the sign-in page with a stable code, never on a raw JSON error.
  if (url.pathname === MAGIC_LINK_VERIFY && response.status >= 400) {
    const body = (await response.json().catch(() => null)) as { code?: string } | null;
    const code = body?.code && /^[A-Za-z_]{1,64}$/.test(body.code) ? body.code : "generic";
    return new Response(null, {
      status: 303,
      headers: { location: `/sign-in?error=${encodeURIComponent(code)}` },
    });
  }
  return response;
}

export { handle as GET, handle as POST };
