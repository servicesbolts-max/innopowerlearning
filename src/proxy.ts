import { NextResponse, type NextRequest } from "next/server";
import { siteEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import {
  cachedResolver,
  decideRoute,
  resolveTenant,
  TENANT_ID_HEADER,
  TENANT_SLUG_HEADER,
} from "@/modules/tenancy";

/**
 * Host-based tenant resolution (Section 3, isolation layer 1). Decides before anything renders,
 * so unknown hosts and paths get a real 404 instead of a streamed 200 (Cache Components).
 * The decision itself lives in src/modules/tenancy/routing.ts and is unit-tested.
 */
const resolve = cachedResolver(resolveTenant);

// No route exists here, so Next renders the app's not-found page with HTTP 404.
const NOT_FOUND_PATH = "/__not_found";
// Request headers clients must never be able to set: reserved for tenant context.
const RESERVED_HEADERS = /^x-(tenant|innopower)-/i;

export async function proxy(request: NextRequest) {
  // Only the two routing values: the Hub must keep working when database settings are missing
  // (a tenant lookup then fails inside the try below and answers 503). The path fallback needs
  // APP_ENV set explicitly, so an unset value never turns it on.
  const { ROOT_DOMAIN, APP_ENV } = siteEnv();
  const headers = new Headers(request.headers);
  for (const name of [...headers.keys()]) if (RESERVED_HEADERS.test(name)) headers.delete(name);

  let decision;
  try {
    decision = await decideRoute(
      {
        host: request.headers.get("host"),
        pathname: request.nextUrl.pathname,
        rootDomain: ROOT_DOMAIN,
        pathFallback: APP_ENV === "development" || APP_ENV === "preview",
      },
      resolve,
    );
  } catch (error) {
    logger.error({ err: error }, "tenant resolution failed");
    return new NextResponse(null, { status: 503, headers: { "retry-after": "5" } });
  }

  switch (decision.type) {
    case "next":
      return NextResponse.next({ request: { headers } });
    case "api": {
      // Set after stripping, so the values can only come from host resolution.
      headers.set(TENANT_ID_HEADER, decision.tenant.id);
      headers.set(TENANT_SLUG_HEADER, decision.tenant.slug);
      return NextResponse.next({ request: { headers } });
    }
    case "rewrite": {
      // Pages and their server actions learn their tenant from the same trusted headers.
      headers.set(TENANT_ID_HEADER, decision.tenant.id);
      headers.set(TENANT_SLUG_HEADER, decision.tenant.slug);
      const url = request.nextUrl.clone();
      url.pathname = decision.pathname;
      return NextResponse.rewrite(url, { request: { headers } });
    }
    case "not-found": {
      const url = request.nextUrl.clone();
      url.pathname = NOT_FOUND_PATH;
      url.search = "";
      return NextResponse.rewrite(url, { request: { headers } });
    }
  }
}

export const config = {
  // Everything except build assets, the image optimizer and the two health probes (anchored, so
  // a future /api/health-admin still goes through host resolution). Static files are decided in
  // decideRoute, so /t/<x>.png and hub-only paths cannot skip the proxy by their extension.
  matcher: ["/((?!_next/static|_next/image|api/health$|api/ready$|favicon\\.ico$).*)"],
};
