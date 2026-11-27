# Progress

Current state: **MVP track done, tag `mvp-1`** (docs/PLAN.md, MVP track). Next: run the MVP E2E (below), then pick up the post-MVP roadmap from P4a.

## Log

- **MVP M1-M7: done 2026-11-27, tag `mvp-1`.** Built in one pass with the lighter process the owner asked for.
  - Commits: `8e8e430` (design-system fixes), `2f820a6` (M1 authoring), `829940b` (M2-M5 catalog, enrollment, player, quizzes, certificates), `b1d2a6f` (M6-M7 Partner Admin and Console), `38f6723` (review fixes).
  - Schema: `0007`-`0010` (course_categories, courses, course_sections, lessons, enrollments, lesson_progress, quiz_attempts, certificates), `0011` (tenant rename, app_platform provisioning grants), `0012` (app_platform limited to the tenant being created).
  - Tenant routes: `/courses?q=`, `/courses/[slug]`, `/learn`, `/learn/[slug]/[lessonId]`, `/verify/[code]`, `/admin`, `/admin/people`, `/admin/courses` (+ editor, lesson editor), `/admin/branding`. Console: `console.{ROOT_DOMAIN}` (sign-in, account security, partners, create partner).
  - Seed: one published sample course per tenant (`sample-learning-online`).
  - Evidence:
    - Gate: 1628 unit tests, build green.
    - Integration: 188 passed, 8 skipped. The isolation checks cover every new table; there are also authoring, learning flow, quiz cap, branding, people and provisioning tests.
  - Not run, so unverified:
    - **E2E (`e2e/mvp.spec.ts`, updated `e2e/tenancy.spec.ts`).** This session could not load `.env`/`.env.example` for the Playwright fixtures: a project hook and the shell guard block it. Run it as described below.
    - **Screenshots** of the catalog, player and admin dashboard. They need the same signed-in fixtures.
  - Reviews: isolation found 1 medium and 1 low, both fixed. Security found 1 medium (fixed) and 4 lows: 1 fixed, 3 deferred and listed in ASSUMPTIONS.
- **Run the MVP E2E:**
  1. Load the env and build with `ROOT_DOMAIN=localhost:3100` and a throwaway `BETTER_AUTH_SECRET`.
  2. Start the server with `node node_modules/next/dist/bin/next start --port 3100`. Keep Mailpit running.
  3. Run `E2E_BASE_URL=http://localhost:3100 PORT=3100 pnpm e2e`.

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
- **P3 Auth and RBAC: done 2026-11-21, tag `wp-P3-done`.**
  - Schema: `0004` (role `app_auth`; global identity tables with forced RLS; tenant tables `memberships`, `invitations`, append-only `audit_logs`; registration and 2FA settings), `0005` (impersonation deadline), `0006` (optional names).
  - `src/modules/rbac`: `can()` with the nine Section 4 roles, scopes and the impersonation deny-list. `src/modules/audit`: PII-free metadata.
  - `src/modules/auth`: Better Auth 1.7.18 on its own `app_auth` pool; tenant-bound sessions; admission policy for the five registration modes; Argon2id; email verification; magic link (Mailpit locally); TOTP; passkeys; OAuth when configured; database rate limits; impersonation mechanism; `defineAction`.
  - UI: tenant `/sign-in` (with the 2FA step), `/sign-up`, `/invite/[token]`, `/account/security`, a guarded `/admin` placeholder, account nav and impersonation banner.
  - Seed: demo accounts with one-time printed passwords (`--rotate-demo-passwords`). Skill: `/add-server-action`. ADR 0004.
  - Evidence:
    - Gate: 1572 unit tests, including the full role × permission matrix.
    - Integration: 117 passed, 6 skipped (isolation checks on the new tables, `users` RLS, `app_auth` reach, audit append-only, session binding, invitations, pre-hijacking).
    - E2E: 94 passed, 2 skipped (passkeys need a non-localhost rpID) on `:3100`, including admin 2FA enforcement on both device projects and axe on every new screen.
    - Screenshots: 12 PNGs in `docs/screenshots/p3/` (sign-in, sign-up, invitation × 390/1280 × light/dark).
  - Reviews: isolation (1 high: impersonation escape, fixed), security (8, fixed), a11y (4 medium, 7 low, fixed), code review (6 fixed, 1 documented exception). Deferred items are in ASSUMPTIONS.

## Notes for P4a

- Every state-changing server action goes through `defineAction` (`/add-server-action`): it checks the tenant-bound session, the 2FA gate, Zod and `can()`, and audits inside `withTenant`. Add new permissions to `src/modules/rbac/permissions.ts` and to the literal matrix in `permissions.test.ts`.
- Course tables reference members through `users.id` or `memberships`; follow `/add-tenant-table` and register each table in `tests/integration/tenant-tables.ts`.
- Demo instructors exist per tenant (`instructor.<slug>@demo.test`); rotate passwords with `pnpm db:seed --rotate-demo-passwords`.
- E2E: build and serve with `ROOT_DOMAIN=localhost:3100` and a throwaway `BETTER_AUTH_SECRET` (production refuses the default), start with `node node_modules/next/dist/bin/next start --port 3100`, keep Mailpit running, then `E2E_BASE_URL=http://localhost:3100 pnpm e2e`. Sign-in helpers are in `e2e/auth.spec.ts`, fixtures in `e2e/fixtures/`.
- Still open from P2: when suspension or rename lands (P11), expire `tenant-slug:<slug>` and `tenant:<id>` and clear the proxy host cache; rate-limit custom-domain misses in the proxy.
- Claude does not push. The owner pushes after each package.
