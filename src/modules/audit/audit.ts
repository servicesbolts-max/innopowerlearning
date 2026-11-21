import { z } from "zod";
import { auditLogs } from "@/db/schema";
import { uuidv7 } from "@/lib/ids";
import { withTenant, type TenantContext, type TenantTx } from "@/modules/tenancy";

/**
 * Append-only audit trail (Section 4, Section 10). Every state-changing server action writes one
 * entry. Metadata holds ids and short codes only: no names, emails, free text or secrets (no PII
 * in logs). The table rejects updates and deletes from the app.
 */
const metadataValue = z.union([z.string().max(200), z.number(), z.boolean(), z.null()]);
const FORBIDDEN_KEY = /pass|secret|token|email|phone|name|address|code/i;

export const auditEntrySchema = z.strictObject({
  action: z.string().regex(/^[a-z][a-z0-9_.]{2,63}$/),
  actorUserId: z.uuid().nullable(),
  impersonatorUserId: z.uuid().nullish(),
  target: z
    .strictObject({ type: z.string().min(1).max(64), id: z.string().min(1).max(128) })
    .optional(),
  metadata: z
    .record(z.string().max(64), metadataValue)
    .refine((m) => Object.keys(m).length <= 20, "at most 20 metadata keys")
    .refine((m) => !Object.keys(m).some((k) => FORBIDDEN_KEY.test(k)), {
      message: "metadata may not carry personal data or secrets",
    })
    .optional(),
});
export type AuditEntry = z.input<typeof auditEntrySchema>;

/** Writes an entry inside an open tenant transaction (so it commits with the change itself). */
export async function recordAudit(tx: TenantTx, tenantId: string, input: AuditEntry) {
  const entry = auditEntrySchema.parse(input);
  await tx.insert(auditLogs).values({
    tenantId,
    id: uuidv7(),
    action: entry.action,
    actorUserId: entry.actorUserId,
    impersonatorUserId: entry.impersonatorUserId ?? null,
    targetType: entry.target?.type ?? null,
    targetId: entry.target?.id ?? null,
    metadata: entry.metadata ?? {},
  });
}

/** Writes an entry in its own tenant transaction (for events not tied to another write). */
export function audit(ctx: TenantContext, entry: AuditEntry) {
  return withTenant(ctx, (tx) => recordAudit(tx, ctx.tenantId, entry));
}
