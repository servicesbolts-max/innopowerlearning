import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";
import prettier from "eslint-config-prettier/flat";

/**
 * Architecture rules (docs/MASTER_PROMPT.md Section 13):
 * - Layers: app -> modules | design-system | lib | i18n; modules -> modules | db | lib | i18n;
 *   design-system -> design-system | lib | i18n; db -> db | lib; lib -> lib.
 * - UI (src/app, src/design-system) never imports src/db.
 * - Cross-module imports go through the module's public index.ts only.
 */
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "boundaries/elements": [
        { type: "app", pattern: "src/app" },
        { type: "module", pattern: "src/modules/*", capture: ["module"] },
        { type: "design-system", pattern: "src/design-system" },
        { type: "db", pattern: "src/db" },
        { type: "i18n", pattern: "src/i18n" },
        { type: "lib", pattern: "src/lib" },
      ],
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          policies: [
            {
              from: { element: { type: "app" } },
              allow: {
                to: { element: { types: ["app", "module", "design-system", "lib", "i18n"] } },
              },
            },
            {
              from: { element: { type: "module" } },
              allow: { to: { element: { types: ["module", "db", "lib", "i18n"] } } },
            },
            {
              from: { element: { type: "design-system" } },
              allow: { to: { element: { types: ["design-system", "lib", "i18n"] } } },
            },
            {
              from: { element: { type: "db" } },
              allow: { to: { element: { types: ["db", "lib"] } } },
            },
            {
              from: { element: { type: "i18n" } },
              allow: { to: { element: { types: ["i18n", "lib"] } } },
            },
            {
              from: { element: { type: "lib" } },
              allow: { to: { element: { types: ["lib"] } } },
            },
          ],
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/modules/*/*", "**/modules/*/*"],
              message: "Import a module through its public index.ts (e.g. '@/modules/tenancy').",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/app/**/*.{ts,tsx}", "src/design-system/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/db", "@/db/*", "**/db/*"],
              message: "UI code never queries the database. Call a module's public API instead.",
            },
            {
              group: ["@/modules/*/*", "**/modules/*/*"],
              message: "Import a module through its public index.ts (e.g. '@/modules/tenancy').",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    ".lighthouseci/**",
    "next-env.d.ts",
    "src/db/migrations/meta/**",
  ]),
]);
