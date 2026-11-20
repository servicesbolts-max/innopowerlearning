import path from "node:path";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

// Proves the architecture rules in eslint.config.mjs reject each known bypass.
const eslint = new ESLint({ cwd: process.cwd() });

async function ruleIds(file: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: path.join(process.cwd(), file) });
  return (result?.messages ?? [])
    .filter((m) => m.ruleId === "no-restricted-imports" || m.ruleId === "boundaries/dependencies")
    .map((m) => m.ruleId as string);
}

const conn = "export const x = 1;\n";

// The first lint pays for loading the whole ESLint config, so allow generous timeouts.
describe("only tenancy and src/db open database connections", { timeout: 60_000 }, () => {
  it.each([
    ["src/modules/courses/a.ts", 'import { getSql } from "@/db/client";'],
    ["src/modules/courses/a.ts", 'import { getSql } from "../../db/client";'],
    ["src/modules/courses/a.ts", 'import postgres from "postgres";'],
    ["src/modules/courses/a.ts", 'import { drizzle } from "drizzle-orm/postgres-js";'],
    ["src/lib/a.ts", 'import postgres from "postgres";'],
    ["src/app/a.ts", 'import { getSql } from "@/db/client";'],
    ["src/app/a.ts", 'import "@/db";'],
  ])("rejects %s: %s", async (file, imp) => {
    expect(await ruleIds(file, `${imp}\n${conn}`)).not.toEqual([]);
  });

  it.each([
    ["src/modules/tenancy/a.ts", 'import { getSql } from "@/db/client";'],
    ["src/db/a.ts", 'import postgres from "postgres";'],
    ["src/modules/courses/a.ts", 'import { pingDatabase } from "@/modules/tenancy";'],
  ])("allows %s: %s", async (file, imp) => {
    expect(await ruleIds(file, `${imp}\n${conn}`)).toEqual([]);
  });

  it("rejects deep imports into another module", async () => {
    const ids = await ruleIds(
      "src/modules/courses/a.ts",
      `import { pingDatabase } from "@/modules/tenancy/connection";\n${conn}`,
    );
    expect(ids).toContain("no-restricted-imports");
  });
});
