"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { siteEnv } from "@/lib/env";
import { currentTenantId, getOpenInvitation, INVITE_COOKIE } from "@/modules/auth";

const input = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{20,100}$/),
  next: z.enum(["sign-up", "sign-in"]),
});

/**
 * Pre-authentication step of accepting an invitation: there is no session yet, so there is no
 * actor for can(). It changes no data. It checks the token, keeps it in a short-lived httpOnly
 * cookie, and sends the person to create an account or sign in. The admission hook accepts the
 * invitation (and audits it) only for a session with the invited address (src/modules/auth).
 */
export async function continueInvitation(formData: FormData): Promise<void> {
  const parsed = input.safeParse({ token: formData.get("token"), next: formData.get("next") });
  if (!parsed.success) redirect("/sign-in");
  const { token, next } = parsed.data;

  const tenantId = await currentTenantId();
  const invitation = await getOpenInvitation(tenantId, token);
  if (!invitation) redirect(`/invite/${token}`);

  (await cookies()).set(INVITE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: siteEnv().APP_ENV !== "development",
    path: "/",
    maxAge: 30 * 60,
  });
  redirect(
    next === "sign-up" ? `/sign-up?email=${encodeURIComponent(invitation.email)}` : "/sign-in",
  );
}
