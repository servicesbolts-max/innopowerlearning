import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { invitations, type TenantRole } from "@/db/schema";
import { uuidv7 } from "@/lib/ids";
import type { TenantTx } from "@/modules/tenancy";

/**
 * Invitations (Section 3: invite-only tenants; Section 6.1). The raw token only ever travels in
 * the invitation link and a short-lived httpOnly cookie; the database stores its SHA-256 hash.
 * Accepting needs both the token and a session for the invited email address.
 */
export const INVITE_COOKIE = "il.invite";
export const INVITE_TTL_DAYS = 7;

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Creates an invitation inside the caller's tenant transaction; returns the raw token once. */
export async function createInvitation(
  tx: TenantTx,
  input: { tenantId: string; email: string; role: TenantRole; invitedBy: string },
): Promise<{ id: string; token: string }> {
  const token = randomBytes(32).toString("base64url");
  const id = uuidv7();
  await tx.insert(invitations).values({
    tenantId: input.tenantId,
    id,
    email: input.email.trim().toLowerCase(),
    role: input.role,
    tokenHash: hashInviteToken(token),
    expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000),
    createdBy: input.invitedBy,
  });
  return { id, token };
}

/** An open (unaccepted, unexpired, not withdrawn) invitation for this token, in this tenant. */
export async function findOpenInvitation(tx: TenantTx, token: string) {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  const [row] = await tx
    .select({ id: invitations.id, email: invitations.email, role: invitations.role })
    .from(invitations)
    .where(
      and(
        eq(invitations.tokenHash, hashInviteToken(token)),
        isNull(invitations.acceptedAt),
        isNull(invitations.deletedAt),
        gt(invitations.expiresAt, new Date()),
      ),
    );
  return row ?? null;
}

/** Reads one cookie from a Cookie header without trusting anything else in it. */
export function readCookie(header: string | null | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) {
      try {
        return decodeURIComponent(part.slice(i + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}
