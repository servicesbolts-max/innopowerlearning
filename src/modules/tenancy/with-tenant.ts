import { sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { z } from "zod";
import { getSql } from "@/db/client";
import * as schema from "@/db/schema";

/** Which tenant a unit of work belongs to. Built from host resolution, never from user input. */
export interface TenantContext {
  readonly tenantId: string;
}

type Db = PostgresJsDatabase<typeof schema>;
export type TenantTx = Parameters<Parameters<Db["transaction"]>[0]>[0];

let db: Db | undefined;
function database(): Db {
  db ??= drizzle(getSql(), { schema });
  return db;
}

const tenantIdSchema = z.uuid();

/**
 * The only way to query tenant data (Section 3, layer 2). Opens a transaction, switches to
 * app_user (subject to forced RLS), and sets app.tenant_id with a bind parameter. Both settings
 * are transaction-local, so a pooled connection never carries them into the next request.
 */
export async function withTenant<T>(
  ctx: TenantContext,
  fn: (tx: TenantTx) => Promise<T>,
): Promise<T> {
  const tenantId = tenantIdSchema.parse(ctx.tenantId);
  return database().transaction(async (tx) => {
    await tx.execute(sql`set local role app_user`);
    await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`);
    return fn(tx);
  });
}

/**
 * Pre-tenant work: host resolution and the public partner directory. Runs as app_user with no
 * tenant set, so every tenant table returns nothing; only the SECURITY DEFINER lookup functions
 * (owned by app_resolver, returning a few public columns) answer. Internal to this module.
 */
export async function withoutTenant<T>(fn: (tx: TenantTx) => Promise<T>): Promise<T> {
  return database().transaction(async (tx) => {
    await tx.execute(sql`set local role app_user`);
    return fn(tx);
  });
}
