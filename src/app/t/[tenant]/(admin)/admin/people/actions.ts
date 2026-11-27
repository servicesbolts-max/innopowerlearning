"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { logger } from "@/lib/logger";
import {
  ActionFailure,
  createInvitation,
  defineAction,
  sendInvitationEmail,
  type ActionResult,
} from "@/modules/auth";
import { can } from "@/modules/rbac";
import { TENANT_SLUG_HEADER } from "@/modules/tenancy";
import { tenantUrl } from "../../../../../_lib/tenancy";

const INVITABLE = [
  "learner",
  "instructor",
  "teaching_assistant",
  "program_manager",
  "tenant_admin",
] as const;

const invite = defineAction(
  {
    schema: z.object({ email: z.email().max(320), role: z.enum(INVITABLE) }),
    permission: "member.invite",
    audit: (i, r: { id: string; token: string; email: string; tenantId: string }) => ({
      action: "invitation.created",
      target: { type: "invitation", id: r.id },
      metadata: { role: i.role },
    }),
  },
  async ({ tx, input, actor }) => {
    // Handing out the admin role needs member.manage, not only member.invite.
    if (input.role === "tenant_admin" && !can(actor, "member.manage")) {
      throw new ActionFailure("forbidden");
    }
    // Granting roles is a privilege change: never while a platform owner views as this person.
    if (actor.impersonatedBy) throw new ActionFailure("forbidden");
    const created = await createInvitation(tx, {
      tenantId: actor.tenantId,
      email: input.email,
      role: input.role,
      invitedBy: actor.userId,
    });
    return { ...created, email: input.email, tenantId: actor.tenantId };
  },
);

/** Invites someone by email (MVP slice M6). The email is sent after the invitation commits. */
export async function inviteMemberAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const result = await invite(raw);
  if (!result.ok) return result;
  const { id, token, email, tenantId } = result.data;
  const slug = (await headers()).get(TENANT_SLUG_HEADER);
  if (slug) {
    await sendInvitationEmail({ email, tenantId, url: tenantUrl(slug, `/invite/${token}`) }).catch(
      (err: unknown) =>
        logger.error({ err, tenantId, invitationId: id }, "invitation email failed"),
    );
  }
  return { ok: true, data: { id } };
}
