import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import * as OTPAuth from "otpauth";
import type { AuthFixtures, ProjectFixtures } from "./fixtures/auth-fixtures";

/**
 * P3 acceptance and the core auth flows, on real tenant hosts:
 * admin 2FA enforcement (E2E), sign-up per registration mode, invitations, magic links,
 * rate limits, host-bound sessions, passkeys. Needs Mailpit (docker compose) for email.
 */
const base = new URL(process.env.E2E_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`);
const at = (host: string, path = "/") => `${base.protocol}//${host}:${base.port}${path}`;
const tenantHost = (slug: string) => `${slug}.${base.hostname}`;
const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8025";

// Auth flows hash passwords (Argon2id, 19 MiB each): running them one after another per project
// keeps a local production server responsive, so timings reflect the app rather than the box.
test.describe.configure({ mode: "default" });

const all = (): AuthFixtures => JSON.parse(process.env.E2E_AUTH_FIXTURES ?? "null");
const mine = (info: TestInfo): ProjectFixtures => all().projects[info.project.name]!;

/** Each test gets its own client IP, so per-IP rate limits never leak between tests. */
test.beforeEach(async ({ page }, info) => {
  const n = (info.workerIndex * 1000 + info.repeatEachIndex * 100 + (Date.now() % 97)) % 250;
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `10.${info.workerIndex % 250}.${n}.${(Date.now() % 250) + 1}`,
  });
});

async function signIn(page: Page, host: string, who: { email: string; password: string }) {
  await page.goto(at(host, "/sign-in"));
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password", { exact: true }).fill(who.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

async function expectSignedIn(page: Page, name: string) {
  await expect(page.getByRole("link", { name: `Account: ${name}` })).toBeVisible({
    timeout: 15_000,
  });
}

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
}

/** A TOTP code for the next 30-second window, so a code is never reused within its window. */
async function freshTotp(secret: string, after?: string): Promise<string> {
  const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secret) });
  let code = totp.generate();
  while (code === after) {
    await new Promise((r) => setTimeout(r, 1000));
    code = totp.generate();
  }
  return code;
}

async function latestEmailText(to: string): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
    const list = (await res.json()) as { messages?: { ID: string }[] };
    const id = list.messages?.[0]?.ID;
    if (id) {
      const message = (await (await fetch(`${MAILPIT}/api/v1/message/${id}`)).json()) as {
        Text: string;
      };
      return message.Text;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No email for ${to}`);
}

test.describe("admin two-step verification (P3 acceptance)", () => {
  test("an admin must set up TOTP before reaching /admin, then signs in with a code", async ({
    page,
  }, info) => {
    test.setTimeout(120_000);
    const { admin } = mine(info);
    const host = tenantHost("lsetf");

    await signIn(page, host, admin);
    await expectSignedIn(page, "E2E Admin");

    // Without a second factor, /admin sends the admin to account security.
    await page.goto(at(host, "/admin"));
    await expect(page).toHaveURL(/\/account\/security/);
    await expect(page.getByText("Your role requires two-step verification")).toBeVisible();
    await expectNoAxeViolations(page);

    await page.getByRole("button", { name: "Turn on two-step verification" }).click();
    await page.getByLabel("Confirm your password to continue").fill(admin.password);
    await page.getByRole("button", { name: "Turn on two-step verification" }).click();
    const secret = (await page.getByTestId("totp-secret").textContent())!.trim();
    const first = await freshTotp(secret);
    await page.getByLabel("Verification code").fill(first);
    await page.getByRole("button", { name: "Confirm and turn on" }).click();
    await expect(page.getByRole("heading", { name: "Your backup codes" })).toBeVisible({
      timeout: 15_000,
    });

    await page.goto(at(host, "/admin"));
    await expect(page.getByRole("heading", { level: 1, name: "LSETF admin" })).toBeVisible();
    await expectNoAxeViolations(page);

    // Next sign-in asks for a code after the password.
    await page.context().clearCookies();
    await signIn(page, host, admin);
    await expect(page.getByRole("heading", { name: "Enter your verification code" })).toBeVisible();
    await page.getByLabel("Verification code").fill(await freshTotp(secret, first));
    await page.getByRole("button", { name: "Verify" }).click();
    await expectSignedIn(page, "E2E Admin");
    await page.goto(at(host, "/admin"));
    await expect(page.getByRole("heading", { level: 1, name: "LSETF admin" })).toBeVisible();
  });

  test("a learner cannot open /admin", async ({ page }, info) => {
    await signIn(page, tenantHost("lsetf"), mine(info).learner);
    await expectSignedIn(page, "E2E Learner");
    // The tenant layout's static shell streams first (partial prerendering), so the refusal is the
    // not-found page, not a 404 status. The point: no admin content ever renders.
    await page.goto(at(tenantHost("lsetf"), "/admin"));
    await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "LSETF admin" })).toHaveCount(0);
  });

  test("an admin may not sign in by magic link", async ({ page }, info) => {
    const { admin } = mine(info);
    await page.goto(at(tenantHost("lsetf"), "/sign-in"));
    await page.getByLabel("Email").fill(admin.email);
    await page.getByRole("button", { name: "Email me a sign-in link" }).click();
    await expect(page.getByText("Check your email")).toBeVisible({ timeout: 15_000 });
    const link = (await latestEmailText(admin.email)).match(/https?:\/\/\S+/)![0];
    await page.goto(link);
    await expect(page).toHaveURL(/\/sign-in\?error=method_not_allowed_for_admins/);
    await expect(
      page.getByRole("alert").filter({ hasText: "Admins sign in with a password" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /^Account:/ })).toHaveCount(0);
  });
});

test.describe("sign-up and registration modes", () => {
  test("anyone can create an account on an open tenant, and the pages pass axe", async ({
    page,
  }, info) => {
    const host = tenantHost("lsetf");
    await page.goto(at(host, "/sign-up"));
    await expectNoAxeViolations(page);
    await page.getByLabel("Full name").fill("New Learner");
    await page.getByLabel("Email").fill(`new-${info.project.name}-${all().runId}@e2e.test`);
    await page.getByLabel("Password").fill(`Pw-${Date.now()}-long`);
    await page.getByRole("button", { name: "Create account" }).click();
    await expectSignedIn(page, "New Learner");
    await page.goto(at(host, "/sign-in"));
    await expectNoAxeViolations(page);
  });

  test("an invite-only tenant refuses sign-ups without an invitation", async ({ page }, info) => {
    const host = tenantHost(all().inviteTenantSlug);
    await page.goto(at(host, "/sign-up"));
    await expect(page.getByText("is invite-only")).toBeVisible();
    await page.getByLabel("Full name").fill("Uninvited");
    await page.getByLabel("Email").fill(`uninvited-${info.project.name}-${all().runId}@e2e.test`);
    await page.getByLabel("Password").fill(`Pw-${Date.now()}-long`);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "is invite-only" })).toBeVisible();
  });

  test("an invitation link lets the invited address join with the invited role", async ({
    page,
  }, info) => {
    const { invite } = mine(info);
    const host = tenantHost(all().inviteTenantSlug);
    await page.goto(at(host, `/invite/${invite.token}`));
    await expect(
      page.getByText(`This invitation is for ${invite.email}, as instructor.`),
    ).toBeVisible();
    await expectNoAxeViolations(page);
    await page.getByRole("button", { name: "Accept and create an account" }).click();
    await expect(page.getByLabel("Email")).toHaveValue(invite.email);
    await page.getByLabel("Full name").fill("Invited Instructor");
    await page.getByLabel("Password").fill(`Pw-${Date.now()}-long`);
    await page.getByRole("button", { name: "Create account" }).click();
    await expectSignedIn(page, "Invited Instructor");

    // The invitation is single-use.
    await page.goto(at(host, `/invite/${invite.token}`));
    await expect(page.getByRole("heading", { name: "This invitation is not valid" })).toBeVisible();
  });
});

test.describe("sign-in methods", () => {
  test("a learner signs in with a magic link from email", async ({ page }, info) => {
    const { learner } = mine(info);
    await page.goto(at(tenantHost("lsetf"), "/sign-in"));
    await page.getByLabel("Email").fill(learner.email);
    await page.getByRole("button", { name: "Email me a sign-in link" }).click();
    await expect(page.getByText("Check your email")).toBeVisible({ timeout: 15_000 });
    const link = (await latestEmailText(learner.email)).match(/https?:\/\/\S+/)![0];
    expect(new URL(link).host).toBe(`${tenantHost("lsetf")}:${base.port}`);
    await page.goto(link);
    await expectSignedIn(page, "E2E Learner");
  });

  test("repeated wrong passwords are rate-limited", async ({ page }) => {
    await page.goto(at(tenantHost("lsetf"), "/sign-in"));
    const statuses = await page.evaluate(async () => {
      const out: number[] = [];
      for (let i = 0; i < 12; i++) {
        const res = await fetch("/api/auth/sign-in/email", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: "nobody@e2e.test", password: "wrong-password-123" }),
        });
        out.push(res.status);
      }
      return out;
    });
    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });

  test("a passkey added on account security signs the learner in", async ({
    page,
    browserName,
  }, info) => {
    test.skip(browserName !== "chromium", "virtual authenticators need Chromium");
    // WebAuthn needs a registrable domain as the relying party: browsers refuse "localhost" for
    // pages on *.localhost. Run with ROOT_DOMAIN=lvh.me (or a real domain) to cover passkeys.
    test.skip(
      base.hostname === "localhost",
      "passkeys need a registrable root domain, not localhost",
    );
    const { wapseaLearner } = mine(info);
    const host = tenantHost("wapsea");
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("WebAuthn.enable");
    await cdp.send("WebAuthn.addVirtualAuthenticator", {
      options: {
        protocol: "ctap2",
        transport: "internal",
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
        automaticPresenceSimulation: true,
      },
    });
    await signIn(page, host, wapseaLearner);
    await expectSignedIn(page, "E2E Wapsea Learner");
    await page.goto(at(host, "/account/security"));
    await page.getByRole("button", { name: "Add a passkey" }).click();
    await expect(page.getByText("Passkey added.")).toBeVisible();

    await page.context().clearCookies();
    await page.goto(at(host, "/sign-in"));
    await page.getByRole("button", { name: "Sign in with a passkey" }).click();
    await expectSignedIn(page, "E2E Wapsea Learner");
  });
});

test.describe("sessions belong to one tenant host", () => {
  test("signing in on one tenant does not sign you in on another", async ({ page }, info) => {
    await signIn(page, tenantHost("lsetf"), mine(info).learner);
    await expectSignedIn(page, "E2E Learner");
    await page.goto(at(tenantHost("wapsea"), "/account/security"));
    await expect(page).toHaveURL(/\/sign-in\?next=/);
  });
});
