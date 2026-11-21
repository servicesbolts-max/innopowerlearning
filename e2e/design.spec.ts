import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const THEMES = ["innopower", "emerald", "sunset"] as const;
const SCHEMES = ["light", "dark"] as const;
const AA = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

// The showcase renders every design-system component; axe here covers real color contrast,
// which the jsdom component tests cannot measure.
for (const theme of THEMES) {
  for (const scheme of SCHEMES) {
    test(`/design/${theme} has no axe violations in ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
      await page.goto(`/design/${theme}`);
      await expect(page.getByRole("heading", { level: 1, name: "Design system" })).toBeVisible();
      // Date fields render after hydration; wait for them so axe sees the final page.
      await expect(page.getByRole("group", { name: "Start date" })).toBeVisible();
      const results = await new AxeBuilder({ page }).withTags(AA).analyze();
      expect(
        results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" | ")}`),
      ).toEqual([]);
    });
  }
}

test("the contrast report shows no failures", async ({ page }) => {
  await page.goto("/design/sunset");
  const report = page.getByRole("grid", { name: "Contrast report" });
  await expect(report).toBeVisible();
  await expect(report.getByText("Fail")).toHaveCount(0);
});

// Since P2 the proxy refuses unknown theme names before rendering, so even the first request is
// a real 404 (Cache Components would otherwise stream the shell with HTTP 200).
test("unknown themes show the not-found page with HTTP 404", async ({ page }) => {
  const res = await page.goto(`/design/unknown-${Date.now()}`);
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Design system" })).toHaveCount(0);
});

test("sheet: opens from the keyboard, traps focus, closes with Escape and restores focus", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/design/innopower");
  const trigger = page.getByRole("button", { name: "Open sheet" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "New course" });
  await expect(dialog).toBeVisible();
  const axe = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(AA).analyze();
  expect(axe.violations).toEqual([]);
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("menu: arrow keys move between items and Escape closes it", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/design/innopower");
  const trigger = page.getByRole("button", { name: "Actions", exact: true });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Edit" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Duplicate" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("scheme override switches to dark without reloading", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/design/emerald");
  await page.getByRole("radio", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-scheme", "dark");
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe("rgb(0, 0, 0)");
});

test("scheme override and its control stay in sync across theme navigation", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/design/innopower");
  await page.getByRole("radio", { name: "Dark" }).click();
  await page.getByRole("link", { name: "Emerald" }).click();
  await expect(page).toHaveURL(/\/design\/emerald$/);
  const forced = await page.locator("html").getAttribute("data-scheme");
  const darkChecked = await page.getByRole("radio", { name: "Dark" }).isChecked();
  // Either the override survives and the control shows it, or both reset to System.
  expect(forced === "dark").toBe(darkChecked);
});

// 1280 px at 200% zoom lays out like a 640 px viewport (WCAG 1.4.10 reflow).
test("showcase reflows at 200% zoom without horizontal scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 900 });
  await page.goto("/design/sunset");
  await expect(page.getByRole("group", { name: "Start date" })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("navigation bar stays pinned and shows the inline title after scrolling", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/design/innopower");
  const inlineTitle = page.locator("header p[aria-hidden]");
  await expect(inlineTitle).toHaveCSS("opacity", "0");
  await page.mouse.wheel(0, 1600);
  await expect(inlineTitle).toHaveCSS("opacity", "1");
  const top = await inlineTitle.evaluate((el) => el.getBoundingClientRect().top);
  expect(top).toBeGreaterThanOrEqual(0);
  expect(top).toBeLessThan(44);
});
