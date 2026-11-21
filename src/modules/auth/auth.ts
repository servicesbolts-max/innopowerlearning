import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { haveIBeenPwned, magicLink, twoFactor } from "better-auth/plugins";
import {
  accounts,
  authRateLimits,
  passkeys,
  sessions,
  twoFactors,
  users,
  verifications,
} from "@/db/schema";
import { PRODUCT_NAME } from "@/lib/config";
import { env, siteEnv } from "@/lib/env";
import { uuidv7 } from "@/lib/ids";
import { admitSession, AdmissionDenied } from "./admission";
import { authDb } from "./db";
import { sendMagicLinkEmail } from "./emails";
import { impersonation } from "./impersonation";
import { passkeyOrigins, rememberPasskeyOrigin } from "./passkey-origins";
import { hashPassword, verifyPassword } from "./password";

/**
 * Better Auth (ADR 0004): identity, credentials, sessions, 2FA, passkeys, magic links and OAuth.
 * Memberships, invitations and roles stay in our RLS tenant tables (src/modules/auth/admission.ts).
 *
 * Multi-host: the base URL is the request's own host (the proxy has already refused unknown
 * hosts), cookies are host-only, and every session is bound to the tenant of the host it was
 * created on.
 */
function createAuth() {
  const e = env();
  const site = siteEnv();
  const rootHost = site.ROOT_DOMAIN.replace(/:\d+$/, "");
  const breachCheck =
    e.PASSWORD_BREACH_CHECK === "true" ||
    (e.PASSWORD_BREACH_CHECK === "auto" && (e.APP_ENV === "staging" || e.APP_ENV === "production"));

  const socialProviders = {
    ...(e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET
      ? { google: { clientId: e.GOOGLE_CLIENT_ID, clientSecret: e.GOOGLE_CLIENT_SECRET } }
      : {}),
    ...(e.MICROSOFT_CLIENT_ID && e.MICROSOFT_CLIENT_SECRET
      ? {
          microsoft: {
            clientId: e.MICROSOFT_CLIENT_ID,
            clientSecret: e.MICROSOFT_CLIENT_SECRET,
            tenantId: e.MICROSOFT_TENANT_ID,
          },
        }
      : {}),
  };

  return betterAuth({
    appName: PRODUCT_NAME,
    ...(e.BETTER_AUTH_SECRET ? { secret: e.BETTER_AUTH_SECRET } : {}),
    baseURL: {
      // Every host the proxy lets through is valid: the hub, console and active tenants.
      allowedHosts: ["*"],
      protocol: e.APP_ENV === "development" ? "http" : "https",
    },
    // Same-origin only: a tenant's pages may call its own auth API, never another tenant's.
    trustedOrigins: (request) => (request ? [new URL(request.url).origin] : []),
    database: drizzleAdapter(authDb(), {
      provider: "pg",
      schema: {
        user: users,
        session: sessions,
        account: accounts,
        verification: verifications,
        twoFactor: twoFactors,
        passkey: passkeys,
        rateLimit: authRateLimits,
      },
    }),
    advanced: {
      cookiePrefix: "il",
      database: { generateId: () => uuidv7() },
      ipAddress: { ipAddressHeaders: [e.AUTH_IP_HEADER] },
    },
    user: {
      additionalFields: {
        platformRole: { type: "string", required: false, input: false },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      additionalFields: {
        tenantId: { type: "string", required: true, input: false },
        impersonatedBy: { type: "string", required: false, input: false },
        impersonationReason: { type: "string", required: false, input: false },
        impersonationExpiresAt: { type: "date", required: false, input: false },
      },
    },
    account: { accountLinking: { enabled: false } },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      autoSignIn: true,
      password: { hash: hashPassword, verify: verifyPassword },
    },
    socialProviders,
    rateLimit: {
      enabled: true,
      storage: "database",
      modelName: "rateLimit",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 10 },
        "/sign-up/email": { window: 60, max: 10 },
        "/sign-in/magic-link": { window: 300, max: 5 },
        "/two-factor/verify-totp": { window: 60, max: 10 },
        "/two-factor/verify-backup-code": { window: 60, max: 5 },
      },
    },
    hooks: {
      // Each passkey ceremony may come from any accepted host (see passkey-origins.ts).
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path.startsWith("/passkey/")) {
          const host = ctx.headers?.get("host") ?? ctx.request?.headers.get("host") ?? null;
          rememberPasskeyOrigin(host, e.APP_ENV === "development" ? "http" : "https");
        }
      }),
    },
    databaseHooks: {
      user: {
        create: {
          // Magic-link and OAuth sign-ups can lack a name: show the email's local part instead.
          before: async (user) => ({
            data: {
              ...user,
              name: user.name?.trim() || user.email.slice(0, user.email.indexOf("@")).slice(0, 200),
            },
          }),
        },
      },
      session: {
        create: {
          before: async (session, ctx) => {
            try {
              const { tenantId } = await admitSession(session, ctx);
              return { data: { ...session, tenantId } };
            } catch (error) {
              if (error instanceof AdmissionDenied) {
                throw new APIError("FORBIDDEN", { message: error.reason, code: error.reason });
              }
              throw error;
            }
          },
        },
      },
    },
    plugins: [
      ...(breachCheck ? [haveIBeenPwned()] : []),
      twoFactor({ issuer: PRODUCT_NAME, backupCodeOptions: { amount: 10, length: 10 } }),
      magicLink({ expiresIn: 600, sendMagicLink: sendMagicLinkEmail }),
      // Passkeys are scoped to the root domain, so they work on the hub and every subdomain
      // tenant. Custom domains are a different registrable domain: not supported yet (ADR 0004).
      passkey({ rpID: rootHost, rpName: PRODUCT_NAME, origin: passkeyOrigins }),
      impersonation(),
      nextCookies(), // must stay last
    ],
  });
}

let instance: ReturnType<typeof createAuth> | undefined;

/** The Better Auth instance, created on first use (env and the database are read lazily). */
export function auth(): ReturnType<typeof createAuth> {
  instance ??= createAuth();
  return instance;
}
