import postgres from "postgres";
import { expect } from "vitest";

// Requires a running Postgres (docker compose up -d, or the CI service container).
try {
  process.loadEnvFile(".env");
} catch {
  // CI provides the variables directly.
}

export const ownerUrl = process.env.DATABASE_OWNER_URL;
export const runtimeUrl = process.env.DATABASE_URL;
export const appPassword = process.env.APP_DB_PASSWORD;
if (!ownerUrl || !runtimeUrl || !appPassword) {
  throw new Error("DATABASE_OWNER_URL, DATABASE_URL and APP_DB_PASSWORD are required");
}

export function ownerConnection() {
  return postgres(ownerUrl!, { max: 1, onnotice: () => {} });
}

/** The runtime login (app_login), the role the app uses. Isolation is proven here only. */
export function runtimeConnection() {
  return postgres(runtimeUrl!, { max: 1, onnotice: () => {} });
}

export interface FixtureTenant {
  id: string;
  slug: string;
  name?: string;
  status?: "active" | "suspended" | "archived";
  listed?: boolean;
  preset?: string;
}

/**
 * Creates partner tenants as the owner. Each insert sets app.tenant_id first, so this also
 * works where the owner is not a superuser and is bound by forced RLS.
 */
export async function createTenants(owner: postgres.Sql, list: FixtureTenant[]) {
  for (const t of list) {
    await owner.begin(async (tx) => {
      await tx`select set_config('app.tenant_id', ${t.id}, true)`;
      await tx`
        insert into tenants (id, slug, name, kind, preset, status, listed)
        values (${t.id}, ${t.slug}, ${t.name ?? t.slug}, 'partner',
                ${t.preset ?? "training_provider"}, ${t.status ?? "active"}, ${t.listed ?? true})`;
    });
  }
}

const CHILD_TABLES = ["tenant_settings", "feature_flags", "tenant_themes", "tenant_domains"];

/** Removes fixture tenants and every row they own (child tables first). */
export async function dropTenants(owner: postgres.Sql, ids: string[]) {
  for (const id of ids) {
    await owner.begin(async (tx) => {
      await tx`select set_config('app.tenant_id', ${id}, true)`;
      for (const table of CHILD_TABLES) await tx`delete from ${tx(table)} where tenant_id = ${id}`;
      await tx`delete from tenants where id = ${id}`;
    });
  }
}

/** Drizzle wraps driver errors; match the message of the error or its cause. */
export async function expectDbError(promise: Promise<unknown>, pattern: RegExp) {
  let caught: unknown;
  try {
    await promise;
  } catch (error) {
    caught = error;
  }
  expect(caught, `expected a database error matching ${pattern}`).toBeDefined();
  const e = caught as { message?: string; cause?: { message?: string } };
  expect(`${e.message ?? ""} | ${e.cause?.message ?? ""}`).toMatch(pattern);
}
