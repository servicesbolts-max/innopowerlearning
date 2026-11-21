# Progress

Current package: **P3 Auth and RBAC** (not started). Start it in a fresh session with `/phase P3`.

## Log

- **P0 Foundation: done 2026-11-20, tag `wp-P0-done`.** Next.js 16.4, TS 6, Tailwind 4.3, Postgres 17 with RLS roles (`app_login`), checksummed migrations, CI, hooks and skills.
- **P1 Design system: done 2026-11-20, tag `wp-P1-done`.** Theme engine with WCAG contrast correction, 68 DS exports on React Aria, Storybook, the `/design/[theme]` showcase, and skill `/add-ds-component`.
- **P2 Tenancy and data: done 2026-11-21, tag `wp-P2-done`.**
  - Schema:
    - `0002_tenancy`: `plans`, `tenants` (RLS on `id`), and the tenant tables `tenant_domains`, `tenant_themes`, `tenant_settings` and `feature_flags`. RLS is enabled and forced, policies have no `TO` clause, and grants are least-privilege.
    - `app_resolver` owns three `SECURITY DEFINER` pre-tenant lookups.
    - `0003`: hosts are unique per tenant, with one verified owner per host.
    - `gen_uuid_v7()` and `src/lib/ids.ts`.
  - `src/modules/tenancy`:
    - `withTenant(ctx, fn)` on Drizzle.
    - `classifyHost`, `resolveTenant`, `loadTenantShellById`.
    - `decideRoute` and a cached resolver.
    - Presets and flags, slug rules.
  - `src/proxy.ts`:
    - Rewrites active tenant hosts from `/x` to `/t/<slug>/x`.
    - Real 404s before rendering, which fixes the P1 `/design/<unknown>` streamed 200.
    - `/t/<slug>` fallback in dev and preview only.
    - Requires `APP_ENV` in production.
  - UI:
    - Hub: `/`, `/partners`, `/sign-in` (find your organization), and placeholder pages.
    - `/t/[tenant]`: per-tenant theme CSS, monogram header, current-page nav, skip link, `ToastProvider key={tenantId}`, tenant time zone.
    - An app-wide 404 page.
    - New DS component: `Monogram`.
  - Seed: idempotent; the Hub plus 4 partners with presets and placeholder branding. CI seeds before the build.
  - Skill: `/add-tenant-table`.
  - Evidence:
    - Gate: 593 unit tests.
    - Integration: 72 passed, 3 skipped (check 5 on tables without a composite FK). The 7 isolation checks run on every tenant table, plus a catalog test.
    - E2E: 76/76 on `:3100`, with axe on every host and screen, light and dark, plus keyboard tests.
    - Screenshots: 44 PNGs in `docs/screenshots/p2/` (5 hosts and 6 secondary screens × 390/1280 × light/dark).
  - Reviews:
    - Isolation: 2 medium findings fixed (domain squatting, slug-keyed cache) and 2 low fixed. The `app_platform` role switch is deferred to P11.
    - Security: 2 medium fixed (domain squatting, `APP_ENV` fail-open) and 3 low fixed.
    - a11y: 1 high fixed (the focus ring was hidden on plain links), 3 medium and 6 low fixed.
    - Code review: 4 fixed, 3 deferred and documented in ASSUMPTIONS.

## Notes for P3

- Identity tables (`users`, `memberships`, `profiles`, `roles`, `sessions`, `accounts`) and demo accounts belong to P3 (owner decision). Follow `/add-tenant-table` for each tenant table, and register it in `tests/integration/tenant-tables.ts`. `users` is global: give it a policy that shows only users with a membership in the current tenant.
- Sessions are scoped to the tenant host. The tenant's `/sign-in` page is a placeholder at `src/app/t/[tenant]/(tenant-public)/sign-in`.
- Seed the demo accounts in `scripts/seed/seed-demo.ts` (idempotent; write with `app.tenant_id` set; print generated passwords once).
- Rate limits: add one for custom-domain misses in the proxy too.
- When suspension or rename lands (P11), expire `tenant-slug:<slug>` and `tenant:<id>` and clear the proxy host cache.
- E2E: another `next dev` often runs in this folder. Build and serve with `ROOT_DOMAIN=localhost:3100` (Hub links to tenants are absolute, baked in at build, and the E2E checks the full origin): `ROOT_DOMAIN=localhost:3100 pnpm build`, start on port 3100 with the same `ROOT_DOMAIN`, then `E2E_BASE_URL=http://localhost:3100 pnpm e2e`. `TaskStop` on `pnpm start` can leave the node child running; start the server with `node node_modules/next/dist/bin/next start --port 3100`.
- Claude does not push. The owner runs `git push` after each package.
