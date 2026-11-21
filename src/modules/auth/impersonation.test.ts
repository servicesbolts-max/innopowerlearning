import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The impersonation guard (P3 security and isolation reviews): a "view as" session may only read
 * itself, sign out or stop, and nothing at all after its deadline.
 */
const session = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("better-auth/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("better-auth/api")>();
  return { ...actual, getSessionFromCtx: vi.fn(async () => session.current) };
});
// The guard module also wires endpoints that import the database; none of that runs here.
vi.mock("@/modules/tenancy", () => ({ withTenant: vi.fn() }));
vi.mock("@/modules/audit", () => ({ audit: vi.fn() }));
vi.mock("./admission", () => ({ requestTenantId: vi.fn() }));

const { impersonationGuard } = await import("./impersonation");

const withCookie = (path: string) => ({
  path,
  headers: new Headers({ cookie: "il.session_token=abc.def" }),
});
const impersonating = (minutesLeft: number) => ({
  user: { id: "u" },
  session: {
    tenantId: "t",
    impersonatedBy: "owner",
    impersonationExpiresAt: new Date(Date.now() + minutesLeft * 60_000),
  },
});

beforeEach(() => {
  session.current = null;
});

describe("impersonationGuard", () => {
  it("lets ordinary sessions and anonymous requests through untouched", async () => {
    await expect(
      impersonationGuard({ path: "/passkey/generate-register-options" }),
    ).resolves.toBeUndefined();
    session.current = { user: { id: "u" }, session: { tenantId: "t" } };
    await expect(impersonationGuard(withCookie("/update-user"))).resolves.toBeUndefined();
  });

  it.each(["/get-session", "/sign-out", "/impersonation/stop"])(
    "allows %s while impersonating",
    async (path) => {
      session.current = impersonating(30);
      await expect(impersonationGuard(withCookie(path))).resolves.toBeUndefined();
    },
  );

  it.each([
    "/passkey/generate-register-options",
    "/passkey/verify-registration",
    "/two-factor/enable",
    "/change-password",
    "/update-user",
    "/list-sessions",
    "/revoke-sessions",
    "/sign-in/email",
  ])("blocks %s while impersonating", async (path) => {
    session.current = impersonating(30);
    await expect(impersonationGuard(withCookie(path))).rejects.toMatchObject({
      body: { code: "blocked_while_impersonating" },
    });
  });

  it("refuses everything, even reading the session, after the deadline", async () => {
    session.current = impersonating(-1);
    await expect(impersonationGuard(withCookie("/get-session"))).rejects.toMatchObject({
      body: { code: "impersonation_expired" },
    });
  });
});
