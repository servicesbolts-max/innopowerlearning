import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type postgres from "postgres";

export const MIGRATIONS_DIR = path.join(process.cwd(), "src", "db", "migrations");
const MIGRATION_FILE = /^\d{4}_[a-z0-9_]+\.sql$/;
const LOCK_KEY = 727_001; // advisory lock id for migrations

export interface MigrationResult {
  applied: string[];
  skipped: string[];
}

export class MigrationChecksumError extends Error {
  constructor(name: string) {
    super(
      `Migration ${name} was changed after it was applied. Migrations are forward-only: ` +
        `revert the edit and write a new migration instead.`,
    );
    this.name = "MigrationChecksumError";
  }
}

export function checksum(content: string): string {
  return createHash("sha256").update(content.replace(/\r\n/g, "\n")).digest("hex");
}

export async function listMigrationFiles(dir = MIGRATIONS_DIR): Promise<string[]> {
  return (await readdir(dir)).filter((f) => MIGRATION_FILE.test(f)).sort();
}

/**
 * Applies pending SQL migrations in filename order, each in its own transaction, under an
 * advisory lock. Already-applied migrations are verified by checksum and never re-run.
 */
export async function runMigrations(
  sql: postgres.Sql,
  dir = MIGRATIONS_DIR,
): Promise<MigrationResult> {
  const result: MigrationResult = { applied: [], skipped: [] };
  await sql`select pg_advisory_lock(${LOCK_KEY})`;
  try {
    await sql`
      create table if not exists _migrations (
        name text primary key,
        checksum text not null,
        applied_at timestamptz not null default now()
      )`;
    const rows = await sql<{ name: string; checksum: string }[]>`
      select name, checksum from _migrations`;
    const applied = new Map(rows.map((r) => [r.name, r.checksum]));

    for (const file of await listMigrationFiles(dir)) {
      const content = await readFile(path.join(dir, file), "utf8");
      const sum = checksum(content);
      const existing = applied.get(file);
      if (existing !== undefined) {
        if (existing !== sum) throw new MigrationChecksumError(file);
        result.skipped.push(file);
        continue;
      }
      await sql.begin(async (tx) => {
        await tx.unsafe(content);
        await tx`insert into _migrations (name, checksum) values (${file}, ${sum})`;
      });
      result.applied.push(file);
    }
  } finally {
    await sql`select pg_advisory_unlock(${LOCK_KEY})`;
  }
  return result;
}
