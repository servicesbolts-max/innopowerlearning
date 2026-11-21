import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("hub home renders and has no axe violations", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Learning spaces for every partner" }),
  ).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("health endpoint is live", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  expect(await res.json()).toMatchObject({ status: "ok" });
});

test("ready endpoint reports the database", async ({ request }) => {
  const res = await request.get("/api/ready");
  expect([200, 503]).toContain(res.status());
  expect(await res.json()).toHaveProperty("checks.database");
});
