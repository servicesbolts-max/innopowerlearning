import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * P2 acceptance: host-based tenant resolution and a distinct branded shell per tenant.
 * Requires the demo seed (pnpm db:seed). Chromium resolves *.localhost to loopback itself.
 */
const base = new URL(process.env.E2E_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`);
const at = (host: string, path = "/") => `${base.protocol}//${host}:${base.port}${path}`;
const tenantHost = (slug: string) => `${slug}.${base.hostname}`;

const PARTNERS = [
  { slug: "lsetf", name: "LSETF" },
  { slug: "wapsea", name: "WAPSEA AI Training" },
  { slug: "gods-entrepreneurs", name: "God's Entrepreneurs" },
  { slug: "wvstu", name: "William V. S. Tubman University" },
];

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  expect(results.violations).toEqual([]);
}

/** The accent fill the shell is painted with (the monogram's background). */
const accentOf = (page: Page) =>
  page
    .locator("header [aria-hidden]")
    .first()
    .evaluate((el) => getComputedStyle(el).backgroundColor);

test.describe("tenant hosts", () => {
  for (const partner of PARTNERS) {
    test(`${partner.slug} shows its own branded shell`, async ({ page }) => {
      const res = await page.goto(at(tenantHost(partner.slug)));
      expect(res?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1, name: partner.name })).toBeVisible();
      await expect(
        page.getByRole("banner").getByRole("link", { name: partner.name }),
      ).toBeVisible();
      await expect(page.getByRole("contentinfo")).toContainText("Placeholder branding");
      await expectNoAxeViolations(page);
    });
  }

  test("every partner is painted with a different accent", async ({ page }) => {
    const accents: string[] = [];
    for (const partner of PARTNERS) {
      await page.goto(at(tenantHost(partner.slug)));
      accents.push(await accentOf(page));
    }
    await page.goto(at(base.hostname));
    accents.push(await accentOf(page));
    expect(new Set(accents).size).toBe(PARTNERS.length + 1);
  });

  test("tenant pages render inside the shell and pass axe", async ({ page }) => {
    for (const path of ["/courses", "/programs", "/sign-in"]) {
      const res = await page.goto(at(tenantHost("wvstu"), path));
      expect(res?.status(), path).toBe(200);
      await expect(page.getByRole("banner")).toContainText("William V. S. Tubman University");
      await expectNoAxeViolations(page);
    }
  });
});

test.describe("shell keyboard access", () => {
  test("skip link first, then a visible 2 px focus ring and the current page marked", async ({
    page,
  }) => {
    await page.goto(at(tenantHost("lsetf"), "/courses"));
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
    await page.keyboard.press("Tab"); // brand
    await page.keyboard.press("Tab");
    const courses = page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "Courses" });
    await expect(courses).toBeFocused();
    await expect(courses).toHaveAttribute("aria-current", "page");
    expect(await courses.evaluate((el) => getComputedStyle(el).outlineWidth)).toBe("2px");
    await expect(
      page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Programs" }),
    ).not.toHaveAttribute("aria-current");
  });

  test("the skip link moves focus to the main content", async ({ page }) => {
    await page.goto(at(base.hostname, "/partners"));
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await expect(page.locator("main#main")).toBeFocused();
  });
});

test.describe("requests the proxy refuses with a real 404", () => {
  const cases: [string, string, string][] = [
    ["unknown tenant", tenantHost("no-such-partner"), "/"],
    ["reserved label", tenantHost("api"), "/"],
    ["nested subdomain", `a.${tenantHost("lsetf")}`, "/"],
    ["console (until P11)", tenantHost("console"), "/"],
    ["unknown demo theme", base.hostname, "/design/nope"],
    ["hub-only page on a tenant", tenantHost("lsetf"), "/design/innopower"],
    ["hub directory on a tenant", tenantHost("lsetf"), "/partners"],
    ["internal path on a tenant", tenantHost("lsetf"), "/t/wapsea"],
  ];
  for (const [label, host, path] of cases) {
    // Through the browser: Chromium resolves *.localhost itself; Node (APIRequestContext) does not.
    test(label, async ({ page }) => {
      const res = await page.goto(at(host, path));
      expect(res?.status()).toBe(404);
    });
  }

  test("the 404 page is accessible and links to the Hub", async ({ page }) => {
    await page.goto(at(tenantHost("no-such-partner")));
    await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to Innopower Learn" })).toBeVisible();
    await expectNoAxeViolations(page);
  });
});

test.describe("hub", () => {
  test("the partner directory lists the four partners with links to their hosts", async ({
    page,
  }) => {
    await page.goto(at(base.hostname, "/partners"));
    for (const partner of PARTNERS) {
      const link = page.getByRole("link", {
        name: new RegExp(partner.name.replace(/[.]/g, "\\.")),
      });
      // The exact origin, port included: ROOT_DOMAIN must match the host the server answers on.
      await expect(link).toHaveAttribute("href", at(tenantHost(partner.slug)));
    }
    await expectNoAxeViolations(page);
  });

  test("find your organization links to each tenant's sign-in page", async ({ page }) => {
    await page.goto(at(base.hostname, "/sign-in"));
    await expect(page.getByRole("link", { name: "Sign in to LSETF" })).toHaveAttribute(
      "href",
      at(tenantHost("lsetf"), "/sign-in"),
    );
    await expectNoAxeViolations(page);
  });

  test("placeholder pages pass axe", async ({ page }) => {
    for (const path of ["/become-a-partner", "/library", "/legal/privacy", "/legal/terms"]) {
      const res = await page.goto(at(base.hostname, path));
      expect(res?.status(), path).toBe(200);
      await expectNoAxeViolations(page);
    }
  });

  test("the /t/<slug> path fallback serves a tenant outside production", async ({ page }) => {
    const res = await page.goto(at(base.hostname, "/t/lsetf"));
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "LSETF" })).toBeVisible();
  });
});
