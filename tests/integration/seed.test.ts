import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runMigrations } from "@/db/migrate";
import { closeDb } from "@/db/client";
import { listPublicPartners, loadTenantShell } from "@/modules/tenancy";
import { seedDemo } from "../../scripts/seed/seed-demo";
import { ownerConnection } from "./helpers";

const owner = ownerConnection();

async function counts() {
  await owner`set role app_resolver`;
  const [t] = await owner<{ n: number }[]>`select count(*)::int as n from tenants`;
  await owner`reset role`;
  return { tenants: t!.n };
}

beforeAll(async () => {
  await runMigrations(owner);
});

afterAll(async () => {
  await closeDb();
  await owner.end({ timeout: 5 });
});

describe("pnpm db:seed", () => {
  it("is idempotent: a second run creates nothing and keeps the ids", async () => {
    const first = await seedDemo(owner);
    const before = await counts();
    const second = await seedDemo(owner);
    expect(second.tenants.every((t) => !t.created)).toBe(true);
    expect(second.tenants.map((t) => t.id)).toEqual(first.tenants.map((t) => t.id));
    expect(await counts()).toEqual(before);
  });

  it("lists the four partners in the Hub directory, but not the Hub itself", async () => {
    const slugs = (await listPublicPartners()).map((p) => p.slug);
    expect(slugs).toEqual(
      expect.arrayContaining(["lsetf", "wapsea", "gods-entrepreneurs", "wvstu"]),
    );
    expect(slugs).not.toContain("hub");
  });

  it("gives each partner a distinct branded shell", async () => {
    const shells = await Promise.all(
      ["lsetf", "wapsea", "gods-entrepreneurs", "wvstu"].map((s) => loadTenantShell(s)),
    );
    expect(shells.map((s) => s?.placeholderBranding)).toEqual([true, true, true, true]);
    expect(new Set(shells.map((s) => s?.themeCss)).size).toBe(4);
    expect(shells.map((s) => s?.logo.text)).toEqual(["LS", "WA", "GE", "TU"]);
  });
});
