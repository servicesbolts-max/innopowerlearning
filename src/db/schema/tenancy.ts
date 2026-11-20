import {
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
 * Drizzle mirror of src/db/migrations/0002_tenancy.sql. The SQL migration is the source of truth
 * (constraints, RLS, grants); these definitions type queries. tests/integration/schema-drift.test.ts
 * fails when the two disagree.
 */
const citext = customType<{ data: string }>({ dataType: () => "citext" });

const audit = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};

export const plans = pgTable("plans", {
  id: uuid("id").primaryKey(),
  key: text("key").notNull(),
  name: text("name").notNull(),
  seats: integer("seats").notNull(),
  storageGb: integer("storage_gb").notNull(),
  videoMinutes: integer("video_minutes").notNull(),
  aiCredits: integer("ai_credits").notNull(),
  ...audit,
});

export const TENANT_PRESETS = [
  "training_provider",
  "funded_program",
  "university",
  "community_organization",
] as const;
export type TenantPreset = (typeof TENANT_PRESETS)[number];

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey(),
  slug: citext("slug").notNull(),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["platform", "partner"] }).notNull(),
  preset: text("preset", { enum: ["platform", ...TENANT_PRESETS] }).notNull(),
  status: text("status", { enum: ["active", "suspended", "archived"] }).notNull(),
  listed: boolean("listed").notNull(),
  planId: uuid("plan_id"),
  ...audit,
});

export const tenantDomains = pgTable(
  "tenant_domains",
  {
    tenantId: uuid("tenant_id").notNull(),
    id: uuid("id").notNull(),
    host: citext("host").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    ...audit,
  },
  (t) => [primaryKey({ columns: [t.tenantId, t.id] })],
);

export const tenantThemes = pgTable(
  "tenant_themes",
  {
    tenantId: uuid("tenant_id").notNull(),
    id: uuid("id").notNull(),
    name: text("name").notNull(),
    theme: jsonb("theme").notNull(),
    ...audit,
  },
  (t) => [primaryKey({ columns: [t.tenantId, t.id] })],
);

export const tenantSettings = pgTable(
  "tenant_settings",
  {
    tenantId: uuid("tenant_id").notNull(),
    id: uuid("id").notNull(),
    tagline: text("tagline"),
    logo: jsonb("logo").notNull(),
    locale: text("locale").notNull(),
    timeZone: text("time_zone").notNull(),
    placeholderBranding: boolean("placeholder_branding").notNull(),
    activeThemeId: uuid("active_theme_id"),
    ...audit,
  },
  (t) => [primaryKey({ columns: [t.tenantId, t.id] })],
);

export const featureFlags = pgTable(
  "feature_flags",
  {
    tenantId: uuid("tenant_id").notNull(),
    id: uuid("id").notNull(),
    key: text("key").notNull(),
    enabled: boolean("enabled").notNull(),
    ...audit,
  },
  (t) => [primaryKey({ columns: [t.tenantId, t.id] })],
);
