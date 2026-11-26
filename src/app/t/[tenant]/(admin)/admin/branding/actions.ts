"use server";

import { updateTag } from "next/cache";
import { defineAction, type ActionResult } from "@/modules/auth";
import { brandingSchema, saveBranding } from "@/modules/tenancy";

const save = defineAction(
  {
    schema: brandingSchema,
    permission: "tenant.settings.write",
    audit: (i, r: { tenantId: string }) => ({
      action: "tenant.branding_updated",
      target: { type: "tenant", id: r.tenantId },
      metadata: { accent: i.accent, logo: i.logoUrl !== null },
    }),
  },
  async ({ tx, input, actor }) => {
    await saveBranding(tx, actor.tenantId, input);
    return { tenantId: actor.tenantId };
  },
);

/** Saves branding, then expires this tenant's cached shell and the partner directory. */
export async function saveBrandingAction(raw: unknown): Promise<ActionResult<null>> {
  const result = await save(raw);
  if (!result.ok) return result;
  updateTag(`tenant:${result.data.tenantId}`);
  updateTag(`tenant:${result.data.tenantId}:theme`);
  updateTag("partners");
  return { ok: true, data: null };
}
