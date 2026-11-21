import {
  bigint,
  boolean,
  customType,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Drizzle mirror of src/db/migrations/0004_identity_rbac_audit.sql.
 *
 * Identity tables: property names are Better Auth's field names (its Drizzle adapter maps by
 * them), columns are snake_case. Only src/modules/auth writes these, as app_auth.
 */
const citext = customType<{ data: string }>({ dataType: () => "citext" });
const ts = (name: string) => timestamp(name, { withTimezone: true });

export const PLATFORM_ROLES = ["platform_owner", "platform_staff"] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const TENANT_ROLES = [
  "tenant_admin",
  "program_manager",
  "instructor",
  "teaching_assistant",
  "learner",
  "sponsor_viewer",
] as const;
export type TenantRole = (typeof TENANT_ROLES)[number];

export const REGISTRATION_MODES = [
  "open",
  "invite_only",
  "application",
  "sso_only",
  "email_domain",
] as const;
export type RegistrationMode = (typeof REGISTRATION_MODES)[number];

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  email: citext("email").notNull(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  twoFactorEnabled: boolean("two_factor_enabled").notNull(),
  platformRole: text("platform_role", { enum: PLATFORM_ROLES }),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
  deletedAt: ts("deleted_at"),
});

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: ts("access_token_expires_at"),
  refreshTokenExpiresAt: ts("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  tenantId: uuid("tenant_id").notNull(),
  token: text("token").notNull(),
  expiresAt: ts("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  impersonatedBy: uuid("impersonated_by"),
  impersonationReason: text("impersonation_reason"),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const verifications = pgTable("verifications", {
  id: uuid("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: ts("expires_at").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const twoFactors = pgTable("two_factors", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  secret: text("secret").notNull(),
  backupCodes: text("backup_codes").notNull(),
  verified: boolean("verified"),
  failedVerificationCount: integer("failed_verification_count"),
  lockedUntil: ts("locked_until"),
});

export const passkeys = pgTable("passkeys", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  name: text("name"),
  publicKey: text("public_key").notNull(),
  credentialID: text("credential_id").notNull(),
  counter: integer("counter").notNull(),
  deviceType: text("device_type").notNull(),
  backedUp: boolean("backed_up").notNull(),
  transports: text("transports"),
  aaguid: text("aaguid"),
  createdAt: ts("created_at").defaultNow(),
});

export const authRateLimits = pgTable("auth_rate_limits", {
  id: uuid("id").primaryKey(),
  key: text("key").notNull(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

// ---------------------------------------------------------------------------------------------
// Tenant tables (withTenant, forced RLS).

export const memberships = pgTable(
  "memberships",
  {
    tenantId: uuid("tenant_id").notNull(),
    id: uuid("id").notNull(),
    userId: uuid("user_id").notNull(),
    role: text("role", { enum: TENANT_ROLES }).notNull(),
    status: text("status", { enum: ["active", "pending", "suspended"] }).notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
    createdBy: uuid("created_by"),
    deletedAt: ts("deleted_at"),
  },
  (t) => [primaryKey({ columns: [t.tenantId, t.id] })],
);

export const invitations = pgTable(
  "invitations",
  {
    tenantId: uuid("tenant_id").notNull(),
    id: uuid("id").notNull(),
    email: citext("email").notNull(),
    role: text("role", { enum: TENANT_ROLES }).notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: ts("expires_at").notNull(),
    acceptedAt: ts("accepted_at"),
    acceptedBy: uuid("accepted_by"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
    createdBy: uuid("created_by"),
    deletedAt: ts("deleted_at"),
  },
  (t) => [primaryKey({ columns: [t.tenantId, t.id] })],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    tenantId: uuid("tenant_id").notNull(),
    id: uuid("id").notNull(),
    actorUserId: uuid("actor_user_id"),
    impersonatorUserId: uuid("impersonator_user_id"),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    metadata: jsonb("metadata").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.tenantId, t.id] })],
);
