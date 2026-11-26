"use server";

import { updateTag } from "next/cache";
import { logger } from "@/lib/logger";
import { recordAudit } from "@/modules/audit";
import {
  ActionFailure,
  createInvitation,
  defineAction,
  sendInvitationEmail,
  type ActionResult,
} from "@/modules/auth";
import { inTenantAsPlatform, provisionSchema, provisionTenant } from "@/modules/tenancy";
import { tenantUrl } from "../../_lib/tenancy";

type Created = { id: string; slug: string; invitationId: string; token: string; email: string };

/**
 * Creates a partner (MVP slice M7): the tenant, its theme, settings and preset flags, and an
 * invitation for its first admin. Platform owners only (tenant.provision). Audited in the
 * platform tenant and in the new tenant; the invitation email goes out after commit.
 */
const create = defineAction(
  {
    schema: provisionSchema,
    permission: "tenant.provision",
    audit: (i, r: Created) => ({
      action: "tenant.provisioned",
      target: { type: "tenant", id: r.id },
      metadata: { slug: i.slug, preset: i.preset },
    }),
  },
  async ({ tx, input, actor }): Promise<Created> => {
    const result = await provisionTenant(tx, actor.tenantId, input, actor.userId);
    if ("conflict" in result) throw new ActionFailure("conflict");
    const invitation = await inTenantAsPlatform(tx, actor.tenantId, result.id, async () => {
      const inv = await createInvitation(tx, {
        tenantId: result.id,
        email: input.adminEmail,
        role: "tenant_admin",
        invitedBy: actor.userId,
      });
      await recordAudit(tx, result.id, {
        action: "tenant.provisioned",
        target: { type: "invitation", id: inv.id },
        metadata: { role: "tenant_admin" },
        actorUserId: actor.userId,
        impersonatorUserId: null,
      });
      return inv;
    });
    return {
      id: result.id,
      slug: input.slug,
      invitationId: invitation.id,
      token: invitation.token,
      email: input.adminEmail,
    };
  },
);

export async function createPartnerAction(
  raw: unknown,
): Promise<ActionResult<{ id: string; slug: string }>> {
  const result = await create(raw);
  if (!result.ok) return result;
  const { id, slug, token, email, invitationId } = result.data;
  updateTag("partners");
  await sendInvitationEmail({
    email,
    tenantId: id,
    url: tenantUrl(slug, `/invite/${token}`),
  }).catch((err: unknown) =>
    logger.error({ err, tenantId: id, invitationId }, "invitation email failed"),
  );
  return { ok: true, data: { id, slug } };
}
