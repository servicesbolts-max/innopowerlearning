import { z } from "zod";
import { recordAudit } from "@/modules/audit";
import { can, type Actor, type Permission, type Resource } from "@/modules/rbac";
import { withTenant, type TenantTx } from "@/modules/tenancy";
import { currentTenantId, getTenantSession, type TenantSession } from "./session";

/**
 * The one way to write a server action (CLAUDE.md non-negotiables; skill: add-server-action):
 *   1. resolve the tenant from the request and the session bound to it;
 *   2. refuse admin work until a second factor is set up;
 *   3. validate input with Zod;
 *   4. check can(actor, permission, resource);
 *   5. run the change inside withTenant, and write the audit entry in the same transaction.
 * Returns a serializable result; never throws for expected failures.
 */
export type ActionError =
  "unauthenticated" | "second_factor_required" | "invalid_input" | "forbidden" | "conflict";

export type ActionResult<T> =
  { ok: true; data: T } | { ok: false; error: ActionError; issues?: Record<string, string[]> };

type AuditSpec<I, R> = (
  input: I,
  result: R,
) => {
  action: string;
  target?: { type: string; id: string };
  metadata?: Record<string, string | number | boolean | null>;
} | null;

export interface ActionConfig<S extends z.ZodType, R> {
  schema: S;
  permission: Permission;
  /** The thing acted on, for own/assigned checks. Loaded inside the tenant transaction. */
  resource?: (tx: TenantTx, input: z.output<S>, actor: Actor) => Promise<Resource | null>;
  /** The audit entry to write; return null only for reads. */
  audit: AuditSpec<z.output<S>, R>;
}

/** Thrown inside a handler to return a specific failure without writing anything. */
export class ActionFailure extends Error {
  constructor(public readonly code: ActionError) {
    super(code);
  }
}

export function defineAction<S extends z.ZodType, R>(
  config: ActionConfig<S, R>,
  handler: (ctx: {
    tx: TenantTx;
    input: z.output<S>;
    actor: Actor;
    session: TenantSession;
  }) => Promise<R>,
): (raw: unknown) => Promise<ActionResult<R>> {
  return async (raw) => {
    const tenantId = await currentTenantId();
    const session = await getTenantSession(tenantId);
    if (!session) return { ok: false, error: "unauthenticated" };
    if (session.needsSecondFactor) return { ok: false, error: "second_factor_required" };

    const parsed = config.schema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: "invalid_input",
        issues: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
      };
    }
    const input = parsed.data;
    const { actor } = session;

    try {
      const data = await withTenant({ tenantId }, async (tx) => {
        const resource = config.resource ? await config.resource(tx, input, actor) : undefined;
        if (config.resource && !resource) throw new ActionFailure("forbidden");
        if (!can(actor, config.permission, resource ?? undefined))
          throw new ActionFailure("forbidden");
        const result = await handler({ tx, input, actor, session });
        const entry = config.audit(input, result);
        if (entry) {
          await recordAudit(tx, tenantId, {
            ...entry,
            actorUserId: actor.userId,
            impersonatorUserId: actor.impersonatedBy ?? null,
          });
        }
        return result;
      });
      return { ok: true, data };
    } catch (error) {
      if (error instanceof ActionFailure) return { ok: false, error: error.code };
      throw error;
    }
  };
}
