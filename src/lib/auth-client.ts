"use client";

import { passkeyClient } from "@better-auth/passkey/client";
import { magicLinkClient, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/**
 * Browser side of Better Auth. It talks to /api/auth on the current host, so every call stays
 * on the tenant the user is visiting (sessions are bound to it). Server code uses
 * src/modules/auth instead; this file never touches the database.
 */
export const authClient = createAuthClient({
  plugins: [twoFactorClient(), magicLinkClient(), passkeyClient()],
});

/** The stable error code of a failed Better Auth call, for messages.auth.errors. */
export function authErrorCode(error: { code?: string; message?: string } | null | undefined) {
  return error?.code ?? error?.message ?? "generic";
}
