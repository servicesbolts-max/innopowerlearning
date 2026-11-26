import AxeBuilder from "@axe-core/playwright";
import * as OTPAuth from "otpauth";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import type { AuthFixtures, ProjectFixtures } from "./fixtures/auth-fixtures";

/**
 * MVP happy paths (docs/PLAN.md, MVP track): authoring, catalog and enrollment, the player with
 * progress, a quiz, a certificate with public verification, the Partner Admin and the Console.
 * Runs against a server on E2E_BASE_URL (see docs/PROGRESS.md), with the seeded sample course.
 */
const base = new URL(process.env.E2E_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`);
const at = (host: string, path = "/") => `${base.protocol}//${host}:${base.port}${path}`;
const tenantHost = (slug: string) => `${slug}.${base.hostname}`;
const LSETF = tenantHost("lsetf");

// Sign-ins hash with Argon2: run these one at a time per device project, like auth.spec.ts.
test.describe.configure({ mode: "serial" });

const all = (): AuthFixtures => JSON.parse(process.env.E2E_AUTH_FIXTURES ?? "null");
const mine = (info: TestInfo): ProjectFixtures => all().projects[info.project.name]!;

async function signIn(page: Page, host: string, who: { email: string; password: string }) {
  await page.goto(at(host, "/sign-in"));
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password", { exact: true }).fill(who.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("link", { name: /^Account: / })).toBeVisible({ timeout: 15_000 });
}

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
}

test.describe("learner", () => {
  test("finds the sample course, completes it, passes the quiz and verifies the certificate", async ({
    page,
  }, info) => {
    test.setTimeout(90_000);
    await signIn(page, LSETF, mine(info).learner);

    await page.goto(at(LSETF, "/courses?q=sample"));
    await expect(page.getByRole("status")).toContainText("1 course matches");
    await expectNoAxeViolations(page);
    await page.getByRole("link", { name: /Sample course: Learning online/ }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Sample course: Learning online" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Enroll" }).click();

    // The player opens on the first lesson.
    await expect(
      page.getByRole("heading", { level: 1, name: "How this course works" }),
    ).toBeVisible({
      timeout: 15_000,
    });
    await expectNoAxeViolations(page);
    await page.getByRole("button", { name: "Mark as complete" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Study habits" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("progressbar", { name: "Progress" })).toHaveAttribute(
      "aria-valuenow",
      "33",
    );

    // Resume: My learning continues at the next lesson to do.
    await page.goto(at(LSETF, "/learn"));
    await page.getByRole("link", { name: "Continue learning" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Study habits" })).toBeVisible();
    await page.getByRole("button", { name: "Mark as complete" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Quick quiz" })).toBeVisible({
      timeout: 15_000,
    });

    // A wrong answer is recorded and fails; the right answers pass and complete the course.
    await page.getByRole("radio", { name: "Close the browser" }).check();
    await page.getByRole("button", { name: "Submit answers" }).click();
    await expect(page.getByText("You scored 0%.")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("radio", { name: "Select Mark as complete" }).check();
    await page.getByRole("checkbox", { name: "A regular time" }).check();
    await page.getByRole("checkbox", { name: "Short notes" }).check();
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByText("You scored 100%. Passed")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Course complete. Your certificate is ready.")).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("link", { name: "View certificate" }).first().click();
    await expect(page.getByRole("heading", { name: "Certificate of completion" })).toBeVisible();
    await expect(page.getByText("E2E Learner")).toBeVisible();
    await expectNoAxeViolations(page);
    const code = new URL(page.url()).pathname.split("/").pop()!;

    // Public verification works signed out, on the issuing tenant only.
    const visitor = await page.context().browser()!.newContext();
    const anon = await visitor.newPage();
    await anon.goto(at(LSETF, `/verify/${code}`));
    await expect(anon.getByRole("status")).toContainText("Verified certificate");
    await anon.goto(at(tenantHost("wapsea"), `/verify/${code}`));
    await expect(anon.getByRole("heading", { name: "Certificate not found" })).toBeVisible();
    await visitor.close();
  });
});

test.describe("instructor", () => {
  test("builds, reorders and publishes a course that then appears in the catalog", async ({
    page,
  }, info) => {
    test.setTimeout(90_000);
    const title = `E2E course ${info.project.name} ${Date.now().toString(36)}`;
    await signIn(page, LSETF, mine(info).instructor);
    await page.goto(at(LSETF, "/admin/courses"));
    await page.getByLabel("Title").fill(title);
    await page.getByRole("button", { name: "Create course" }).click();
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible({
      timeout: 15_000,
    });

    for (const name of ["First section", "Second section"]) {
      await page.getByLabel("Section title").last().fill(name);
      await page.getByRole("button", { name: "Add section" }).click();
      await expect(page.locator(`input[value="${name}"]`)).toBeVisible({ timeout: 15_000 });
    }
    await page.getByRole("button", { name: "Move Second section up" }).click();
    await expect(page.getByLabel("Section title").first()).toHaveValue("Second section", {
      timeout: 15_000,
    });

    await page.getByLabel("Lesson title").first().fill("Intro lesson");
    await page.getByRole("button", { name: "Add lesson" }).first().click();
    await page.getByRole("link", { name: /Intro lesson/ }).click();
    await page.getByLabel("Text").fill("## Hello\n\nSome **bold** text.");
    await page.getByLabel("Video URL").fill("https://youtu.be/dQw4w9WgXcQ");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saved")).toBeVisible({ timeout: 15_000 });

    await page.getByRole("link", { name: `Back to ${title}` }).click();
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText("Published. Learners can find this course")).toBeVisible({
      timeout: 15_000,
    });
    await page.goto(at(LSETF, `/courses?q=${encodeURIComponent(title)}`));
    await expect(page.getByRole("link", { name: new RegExp(title) })).toBeVisible();
  });

  test("cannot open the people admin", async ({ page }, info) => {
    await signIn(page, LSETF, mine(info).instructor);
    await page.goto(at(LSETF, "/admin/people"));
    // Refusals render the not-found page (see docs/ASSUMPTIONS.md: status 200 under PPR).
    await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
    await expect(page.getByLabel("Email address")).toHaveCount(0);
  });
});

/** Turns on TOTP for the signed-in user from the account security page. */
async function setUpTotp(page: Page, password: string): Promise<void> {
  await page.getByRole("button", { name: "Turn on two-step verification" }).click();
  await page.getByLabel("Confirm your password to continue").fill(password);
  await page.getByRole("button", { name: "Turn on two-step verification" }).click();
  const secret = (await page.getByTestId("totp-secret").textContent())!.trim();
  const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secret) });
  await page.getByLabel("Verification code").fill(totp.generate());
  await page.getByRole("button", { name: "Confirm and turn on" }).click();
  await expect(page.getByRole("heading", { name: "Your backup codes" })).toBeVisible({
    timeout: 15_000,
  });
}

test.describe("partner admin", () => {
  test("sees the dashboard, invites a person and saves branding", async ({ page }, info) => {
    test.setTimeout(120_000);
    const { mvpAdmin, runId } = { ...mine(info), runId: all().runId };
    await signIn(page, LSETF, mvpAdmin);
    await page.goto(at(LSETF, "/admin"));
    await expect(page).toHaveURL(/\/account\/security/);
    await setUpTotp(page, mvpAdmin.password);

    await page.goto(at(LSETF, "/admin"));
    await expect(page.getByRole("heading", { level: 1, name: "LSETF admin" })).toBeVisible();
    await expect(page.getByText("Published courses")).toBeVisible();
    await expectNoAxeViolations(page);

    await page.getByRole("link", { name: "People" }).click();
    const invitee = `invitee-${info.project.name}-${runId}@e2e.test`;
    await page.getByLabel("Email address").fill(invitee);
    await page.getByRole("button", { name: "Send invitation" }).click();
    await expect(page.getByText("Invitation sent")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(invitee)).toBeVisible();

    await page.getByRole("link", { name: "Branding" }).click();
    await expect(page.getByLabel("Organization name")).toHaveValue("LSETF");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Branding saved")).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("super admin console", () => {
  test("lists partners and creates a new one", async ({ page }, info) => {
    test.setTimeout(120_000);
    const { owner } = mine(info);
    const CONSOLE = tenantHost("console");
    await page.goto(at(CONSOLE, "/"));
    await expect(page).toHaveURL(/\/sign-in/);
    await signIn(page, CONSOLE, owner);
    await page.goto(at(CONSOLE, "/"));
    await expect(page).toHaveURL(/\/account\/security/);
    await setUpTotp(page, owner.password);

    await page.goto(at(CONSOLE, "/"));
    await expect(page.getByRole("heading", { level: 1, name: "Partners" })).toBeVisible();
    await expect(page.getByRole("link", { name: /LSETF/ })).toBeVisible();
    await expectNoAxeViolations(page);

    const slug = `e2e-new-${all().runId}-${info.project.name.slice(0, 1)}`;
    await page.getByLabel("Name").fill(`E2E Partner ${info.project.name}`);
    await page.getByLabel("Subdomain").fill(slug);
    await page.getByLabel("First admin's email address").fill(`first-${slug}@e2e.test`);
    await page.getByRole("button", { name: "Create partner" }).click();
    await expect(page.getByText("Partner created.")).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole("link", { name: new RegExp(`E2E Partner ${info.project.name}`) }),
    ).toBeVisible();

    // The new partner's space is live at once.
    await page.goto(at(tenantHost(slug), "/"));
    await expect(
      page.getByRole("heading", { level: 1, name: `E2E Partner ${info.project.name}` }),
    ).toBeVisible({
      timeout: 15_000,
    });
  });
});
