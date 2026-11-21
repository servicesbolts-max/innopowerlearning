import { env } from "@/lib/env";

/** Which OAuth buttons to show: only providers whose credentials are configured. */
export function oauthProviders(): { google: boolean; microsoft: boolean } {
  try {
    const e = env();
    return {
      google: !!(e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET),
      microsoft: !!(e.MICROSOFT_CLIENT_ID && e.MICROSOFT_CLIENT_SECRET),
    };
  } catch {
    // A build without server settings: no OAuth buttons.
    return { google: false, microsoft: false };
  }
}
