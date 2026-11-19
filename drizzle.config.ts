import { defineConfig } from "drizzle-kit";

// drizzle-kit is used to draft SQL from src/db/schema; review every generated file, add RLS,
// and commit it as the next numbered migration. scripts/db-migrate.ts applies migrations.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema",
  out: "./src/db/migrations/drafts",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  strict: true,
});
