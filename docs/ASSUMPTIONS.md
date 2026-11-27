# Assumptions and decisions

Decisions made while building, so they can be reviewed and reversed. Newest at the bottom of each section.

## Product

- Most learners are in West Africa (for example Nigeria and Liberia) on mid-range Android phones with variable 3G/4G connectivity. Performance budgets, data-saver mode and offline-lite follow from this.
- Seed preset mapping (editable): LSETF `funded_program`, WAPSEA AI Training `training_provider`, God's Entrepreneurs `community_organization`, William V. S. Tubman University `university`.
- Innopower Learn is a working name, defined once in `src/lib/config.ts`.

## P0 (2026-11-19)

- **Runtime:** Node.js 26 (current LTS) and pnpm 12.21, pinned in `.nvmrc` and `packageManager`.
- **TypeScript 6.0**, not 7.0: typescript-eslint 8.x supports `<6.1`. Revisit when typescript-eslint supports 7.
- **Next.js 16.4** with Cache Components and Turbopack, as `create-next-app` generates it. `agentRules: false` keeps `AGENTS.md` a one-line pointer to `CLAUDE.md`; CLAUDE.md tells agents to read `node_modules/next/dist/docs/`.
- **Migrations:** plain numbered SQL files in `src/db/migrations`, applied by our own runner (`src/db/migrate.ts`) with an advisory lock and SHA-256 checksums. Editing an applied migration fails `db:migrate`. drizzle-kit only drafts SQL into `migrations/drafts/` for review.
- **Database roles (revised after the P0 isolation review):** two connections.
  - `DATABASE_OWNER_URL` is the owner/migrator. Only `db:migrate`, `db:seed`, `db:reset` and tests use it.
  - `DATABASE_URL` logs in as `app_login` (`0001_runtime_login.sql`): NOSUPERUSER, NOBYPASSRLS, NOINHERIT, owns nothing. It can only act by switching to `app_user` or `app_platform` (from `0000`). A query outside `withTenant` therefore fails with "permission denied" instead of reading every tenant, and `RESET ROLE` gains nothing.
  - `db:migrate` sets the `app_login` password from `APP_DB_PASSWORD` with `format('%L')`.
  - The first design (app connects as owner) was dropped because superusers skip RLS.
- **Health:** the `system` module owns readiness checks. They call `pingDatabase` from `tenancy`, the only module allowed to import `getSql` (enforced by ESLint).
- **db:reset guard:** requires `APP_ENV=development` set explicitly (not the parsed default), refuses `NODE_ENV=production`, and accepts loopback hosts only (not container names like `postgres`).
- **Guard hooks** fail closed on an unreadable payload. The shell guard blocks `.env` tokens and errs on the side of blocking: quotes are not parsed, so a `;` inside a commit message splits the command. Reword the message if that happens.
- **CI** pins every action to a full commit SHA (version in a comment) and lhci to an exact version. Compose ports bind to `127.0.0.1`.
- **Architecture lint:** `eslint-plugin-boundaries` enforces the layers, and `no-restricted-imports` blocks deep cross-module imports and `src/db` imports from UI code.
- **CI evidence:** no GitHub remote yet, and Claude may not push. The workflow is schema-validated, and each CI command is run locally. The first remote run happens when the owner pushes.
- **Docker images** are pinned by digest in `docker-compose.yml`: pgvector pg17, Redis 7, RustFS 1.0.6, AWS CLI 2.41.2 and Mailpit 1.34.0.
- **Local object storage is RustFS, not MinIO** (ADR 0002). MinIO's images are no longer pullable from Docker Hub or Quay (checked 2026-11-20). The app talks plain S3 through `S3_*` env vars, so the choice is local-only and reversible. Production remains Cloudflare R2.
- **`NODE_ENV` is not in `.env.example`.** Next.js sets it, and a shell-exported `NODE_ENV=development` makes `next build` fail while prerendering `/_global-error`. Found while running the P0 database checks.
- **Lighthouse CI** assertions are `warn` until P14, when they become `error`.
- **P0 acceptance, `/hooks` and `/doctor`:** neither could run. The `claude` CLI is not installed on this machine, and the desktop app has no such dialogs. Substitute evidence (2026-11-20):
  - `.claude/settings.json` registers 4 hooks (PreToolUse ×2, PostToolUse, Stop).
  - Each one fired for real in the session that built P0, and the Stop hook was dry-run in both its passing and failing cases.
  - `CLAUDE.md` is 48 lines (limit 120) and `docs/PROGRESS.md` 26 (limit 120).
  - Run `/hooks` and `/doctor` whenever the CLI is available.
- **Pushing:** the owner pushes after each package. The auto-mode safety check would not let Claude loosen its own push guard, even with the owner's go-ahead.
- **Spec conflict for P1:** Section 7.2 `--label-secondary` (light `rgba(60,60,67,.60)`) composites to #8A8A8E on white, which is 3.43:1. That fails WCAG AA (4.5:1) for body text; axe caught it in the P0 smoke test. The hub page uses `--label` for body text. P1 must either restrict the secondary label to large or non-essential text, or darken it until it passes.

## P1 (2026-11-20)

- **Primitives: React Aria Components; motion: CSS springs** (ADR 0003). Motion joins in P4a for drag-to-reorder.
- **`--label-secondary` (resolves the P0 spec conflict):** light alpha is 0.73, not 0.60. It is the lowest two-decimal alpha that gives 4.5:1 on every light surface; a unit test proves both that it passes and that 0.72 fails. Dark 0.60 already passes (5.29:1 at worst). `--label-tertiary` stays as specified, for disabled and decorative text only.
- **Tokens the spec implies but does not list:**
  - `--control-border`: 3:1 input and toggle boundaries (WCAG 1.4.11). `--separator` is about 1.7:1.
  - `--thumb`: white switch and slider thumbs.
  - `--scrim`: 40% black behind modals in light, 60% in dark.
  - `--segment-selected`: #636366 in dark, white in light.
  - Status `-fill`, `-text` and `-tint` tokens generated by the engine. The light destructive fill is #E91C18, because white on #FF3B30 is 3.6:1.
- **Material opacity:** the engine raises the spec's 72% until bar text (label, secondary label, accent text) keeps 4.5:1 over the worst content scrolling underneath, which is black in light and white in dark. The demo themes get 95% in light and 83% in dark. Sheets, toasts and popovers are opaque, so their text never sits on blur. The spec lists sheets as translucent; this deviation is deliberate.
- **Sheet grabber** is a visual affordance only. Swipe-to-dismiss is not implemented; Escape, the close button and tapping the scrim dismiss the sheet.
- **Tints:** 15% of the accent fill in light and 24% in dark, because 15% was too faint on black. Text on a tint uses `*-text-on-tint`, which the engine checks against the tint over every surface.
- **Demo themes** (`innopower` #0071E3 standard, `emerald` #0F9D7A compact with Inter, `sunset` #F25C2A rounded with a #7A4CE0 secondary) are placeholders until P2 seeds the real partner brands.
- **`/design/[theme]`** is public and `noindex`, prerendered for the three demo themes.
  - Cache Components forbids `dynamicParams`, so other names call `notFound()`.
  - The first request for an unprerendered name streams the shell with HTTP 200 before the 404 UI; later requests return 404. P2's host proxy should reject unknown paths before rendering, and keep `/design` on the hub host only.
- **Time-dependent components** (Calendar, DatePicker, TimeField) render after hydration and show a skeleton until then. React Aria reads the clock, which Cache Components rejects during prerender, and prerendered HTML would otherwise bake in a stale "today".
- **Toasts:** one queue per `ToastProvider`, not a module singleton, so the server never shares toasts between requests and a tenant switch drops the previous tenant's toasts. A toast with an action (Undo) never auto-dismisses (WCAG 2.2.1). Informational timeouts are at least 5 s. React Aria's toast API is still `UNSTABLE_`, so it is wrapped in one file.
- **Theme engine safety for P2:**
  - `themeToCss` accepts only `:root` or a single `[data-…="slug"]` root selector.
  - `safeBuildTheme` falls back to the default theme (and reports the error) when stored tenant data no longer validates.
  - Validate strictly on save; use `safeBuildTheme` on read; cache the CSS per tenant with `cacheTag("tenant:<id>:theme")`.
- **Touch targets:** a few controls stay visually compact, keeping the iOS look while extending the hit area to 44 px with the `touch-target` utility. These are chips, segments, toast and banner buttons, search token remove, stepper and calendar buttons. Admin-only controls may use `size="small"` (32 px).
- **Forced colors:** states that rely on an accent fill use `forced-selected` (Highlight/HighlightText). These are selected calendar days, the current page, focused menu, list and date segments, and selected list rows.
- **i18n:** next-intl with English only and no locale routing yet. The time zone is pinned to UTC until P2 picks one per tenant. Showcase copy and component labels are in `messages/en.json`; the contrast report translates stable `kind`/`subject` ids.
- **Inter** is the latin subset only, a 48 KB variable woff2 committed with its OFL licence. Latin Extended glyphs (for example Yoruba ẹ, ọ, ṣ) fall back to the next font in the stack per glyph. Add the latin-ext file if partners need Inter for them.
- **Storybook** is not part of `pnpm gate`, to keep it fast. CI runs `pnpm build-storybook`. Tailwind scans explicit `@source` paths because Storybook's Vite root differs from Next's.
- **E2E port:** another session's `next dev` often runs in this folder, and Next 16 allows only one dev server per directory. Run E2E against a production server: `pnpm build && pnpm start --port 3100`, then `E2E_BASE_URL=http://localhost:3100 pnpm e2e`.
- **Deferred components** (Section 7.4):
  - command palette: P10a
  - rich-text editor skin: P4a
  - video player skin: P4b
  - certificate preview: P6

## P2 (2026-11-21)

- **Scope (owner decisions):** identity tables (users, memberships, profiles, roles, sessions, accounts) and demo accounts move to P3, whose auth library decides their shape. The seed covers tenancy only; each later package adds its content to the same idempotent seed.
- **Tables:** `plans` (global catalog), `tenants` (the tenant root, RLS on `id`), and the tenant tables `tenant_domains`, `tenant_themes`, `tenant_settings` and `feature_flags`. The Hub is the platform tenant (`kind = 'platform'`, slug `hub`, unlisted). Enumerations are `text` with CHECK constraints rather than Postgres enums, so they can grow with expand-only migrations.
- **UUIDv7:** `gen_uuid_v7()` in SQL (Postgres 17 has no built-in) and `uuidv7()` in `src/lib/ids.ts`.
- **Policies have no `TO` clause** (as in the rule template), so they also bind a non-superuser owner under forced RLS. The seed and test fixtures therefore write with `app.tenant_id` set, which works on hosted Postgres too.
- **Subdomains resolve by `tenants.slug`; `tenant_domains` holds custom domains only.** Changing `ROOT_DOMAIN` needs no data change. A tenant may list a host once (`unique (tenant_id, host)`), and only one verified, live row per host may exist across tenants: a partial unique index on `host`, the documented exception to "tenant_id first" (`0003`). 0002 had made `host` globally unique; the review showed that let a tenant squat another organization's domain and probe which hosts others hold. Tenants cannot set `verified_at` (column grants); verification is a platform job (P10d).
- **Pre-tenant lookups** (host resolution, the partner directory) use three `SECURITY DEFINER` functions owned by `app_resolver`. That role cannot log in or bypass RLS, and can read only a few columns of `tenants` and `tenant_domains` (column grants, plus `TO app_resolver` select policies). Execute is granted to `app_user` only. The functions return public fields, so they have no tenant filter: the deliberate exception to the definer rule. Owning them by `app_resolver` (not the migrator) keeps them working where the migrator is bound by forced RLS.
- **Feature flags and tenants are read-only to `app_user`.** Super Admin manages them through `app_platform` in P11.
- **Logos are typed data** (`{"kind":"monogram","text":"LS"}`), never stored SVG or markup. The `Monogram` DS component draws them on the tenant's accent fill.
- **Routing:** the proxy (`src/proxy.ts`, logic in `src/modules/tenancy/routing.ts`) rewrites a tenant host's `/x` to `/t/<slug>/x` for active tenants only. Anything it refuses is rewritten to a path with no route, so Next renders the app's not-found page with a real 404 before anything streams. This resolves the P1 note on `/design/<unknown>`.
  - Host matching ignores the port, so `lsetf.localhost:3100` works with `ROOT_DOMAIN=localhost:3000`.
  - Reserved labels (`api`, `www`, `console`, ...) are refused for partners and enforced by a CHECK constraint that a unit test keeps in sync.
  - The console host returns 404 until P11.
  - Incoming `x-tenant-*` and `x-innopower-*` request headers are stripped.
- **Host cache:** in-process TTL caches in front of the resolver: hits for 30 s (1000 entries), misses for 5 s in a separate 200-entry cache, so random Host headers cannot evict real tenants. A suspension can therefore take up to 30 s to reach every request; the tenant layout also re-checks status. Redis can replace the cache later without changing callers.
- **Path fallback** (`/t/<slug>` on the hub host) is on only when `APP_ENV` is `development` or `preview`. Known limitation: links inside the tenant shell are host-relative, so following one from the fallback goes to the Hub. Revisit when preview deployments exist (P14).
- **Prerendering (owner decision):** `generateStaticParams` for `/t/[tenant]` lists active partners from the database. Without a database (for example a CI build), it falls back to a placeholder param, and tenants render on demand. CI now seeds before `pnpm build`.
- **Caching:** tenant data is cached by tenant id (`cacheLife("hours")`, tags `tenant:<id>` and `tenant:<id>:theme`). Only the slug → id step is cached by slug: `cacheLife("minutes")`, tag `tenant-slug:<slug>`. A renamed or reassigned slug can therefore never serve another tenant's shell or id. Strings that are not valid partner slugs never reach a cache. Rename and suspension (P11) must expire `tenant-slug:<slug>` and `tenant:<id>`, and clear the proxy's host cache. The partner directory uses the `partners` tag and `cacheLife("minutes")`. Save actions (P10) call `updateTag` with these tags.
- **Locale and time zone** are stored per tenant in `tenant_settings`. The tenant layout nests `NextIntlClientProvider timeZone={…}`; everything is English for now.
- **Demo branding** (placeholder; the footer says so): LSETF #0B6E4F, WAPSEA #3A5BD9 compact with Inter, God's Entrepreneurs #B5432B rounded, WVSTU #7B2D8E with a #C9A227 secondary. All pass the engine's contrast report, which a unit test checks.
- **`db:reset`** now recreates `public` with the stock grants (owner `pg_database_owner`, `USAGE` for PUBLIC). Without them, app_login saw "relation does not exist" where a fresh database says "permission denied".
- **Stale dev types:** `.next/dev/types` is written only by `next dev` (`next typegen` writes `.next/types`). After moving a route, start the dev server once, or `tsc` fails on the old path.
- **Review outcomes (2026-11-21):**
  - **APP_ENV is required when `NODE_ENV=production`.** The parsed default is `development`, which enables the path fallback and `http` links, so a production server that forgot it would fail open. Deployments (the Dockerfile, the hosting platform) must set it.
  - **Tenant-host `/api/*`** is served by the root route handlers (Section 8). The proxy passes it through with `x-tenant-id` and `x-tenant-slug` set from host resolution, after stripping any client-sent `x-tenant-*` headers. Hub-host `/api` carries no tenant. Unknown or suspended tenant hosts get a 404.
  - **Proxy matcher:** only `_next/static`, `_next/image`, `favicon.ico` and the exact `/api/health` and `/api/ready` skip the proxy. Root-level public files (`/icon.png`) are passed through by `decideRoute`, so an extension can never smuggle `/t/...` or a hub page past the checks.
  - **Focus ring:** the `focus-ring` utility now also styles `:focus-visible` on elements that are not React Aria (`:not([data-rac])`). Before, it hid the focus outline on plain links. Tailwind drops later items of a selector list inside `@utility`, so each selector has its own block.
  - **Current page:** the shell nav uses `useSelectedLayoutSegments` (the route tree), not `usePathname`, because proxy rewrites make the browser URL differ from the prerendered path.
  - **ROOT_DOMAIN must include the port the site is served on** (`localhost:3100` for a production server on 3100). Hub links to tenants are absolute, and are baked in at build for prerendered pages. Host matching itself ignores the port.
  - **Link origins come from `siteEnv()`**, which reads only `ROOT_DOMAIN` and an optional `APP_ENV`, and uses https when `APP_ENV` is unset. A build with no database settings (the Docker build) succeeds: the partner directory falls back to empty for minutes (not seconds, which Next will not prerender), and tenants render on demand. The E2E checks full link origins, so build and serve E2E with `ROOT_DOMAIN=localhost:3100`.
  - **Deferred:**
    - `app_login` can `set role app_platform` from inside any transaction. P11 must scope platform policies `TO app_platform`, and allow that role switch only in the audited module (lint or test).
    - Rate-limiting custom-domain misses per client comes with the P3 rate limits.

## P3 (2026-11-21)

- **Auth architecture (owner decision, ADR 0004):** Better Auth handles identity only, through the `app_auth` role and its own pool. Memberships, invitations and the audit log are RLS tenant tables. The organization plugin is not used.
- **Scope (owner decisions):** all sign-in methods in P3: password, magic link, TOTP, passkeys, and Google/Microsoft OAuth when credentials are set. Impersonation is a mechanism only; the Console UI to start it is P11b.
- **Better Auth 1.7.18, not 1.7.27:** 1.7.27 was a day old, inside pnpm's minimum-release-age window, and pnpm had silently added exemptions for it. The exemptions were reverted and the lockfile rebuilt.
- **Roles:**
  - Platform roles live on `users.platform_role`; tenant roles live on `memberships.role`.
  - Roles are code-defined bundles of permission strings with `any`, `own` or `assigned` scopes (`src/modules/rbac`). Tenant-defined custom roles come later.
  - An explicitly null owner never counts as "own". An undefined owner means a tenant-wide action, such as creating something new.
- **Admission rules** (`src/modules/auth/policy.ts`):
  - Hub and Console admit platform staff only. Platform staff may enter any partner host without a membership.
  - `application` mode records a pending membership and refuses the session until approval (P8a).
  - Suspended and pending members are refused.
  - An invitation needs both its token (a 30-minute httpOnly cookie set from the invitation page) and a session for the invited address.
- **Admin two-step verification:** required for tenant admins and program managers (per tenant, `require_admin_2fa`, default on) and always for platform staff.
  - Accepted second factors: TOTP, or a passkey.
  - Magic links are refused for these roles; so is OAuth, except on SSO-only tenants, where the identity provider owns MFA.
  - Admin pages redirect to account security until a factor exists.
- **Impersonation:**
  - Platform owner (or staff with an explicit grant), members of the current tenant only, never platform staff, a reason of at least 10 characters, at most 60 minutes.
  - The deadline is stored separately (0005), because Better Auth extends `expires_at` on use. The admin's own session is kept in a signed cookie and restored on stop.
- **Sessions:**
  - 7 days, refreshed daily, capped by the tenant's `session_hours`, and bound to `tenant_id`. Cookies are host-only, with prefix `il`.
  - Trusted origins: the request's own origin only.
- **Rate limits:** database store; sign-in and sign-up 10 per minute, magic-link requests 5 per 5 minutes, TOTP 10 per minute, backup codes 5 per minute. Keyed by `AUTH_IP_HEADER`, which is required on staging and production (a header the edge overwrites, such as `cf-connecting-ip` or `x-real-ip`) and defaults to `x-forwarded-for` only in development and tests.
- **Breached-password check (Have I Been Pwned):** on in staging and production, off in development and tests (`PASSWORD_BREACH_CHECK=auto`). Only a 5-character hash prefix leaves the server.
- **Secrets:** `BETTER_AUTH_SECRET` is required in staging and production. Development falls back to Better Auth's default with a warning, and `next start` refuses the default. E2E servers use a throwaway secret; CI has a CI-only value.
- **Magic links:** a refused verification (admission policy, expired token) is converted by the `/api/auth` route into a 303 redirect to `/sign-in?error=<code>`, never raw JSON. Better Auth keeps the error status, so its own redirect was not followed by browsers.
- **Email verification:** password sign-ups get no session until the address is confirmed by the emailed link (24 hours). Confirming signs the person in, and admission still applies (an uninvited address on an invite-only tenant lands on `/sign-in?error=invite_required`).
- **Account pre-hijacking:** when a magic link proves an address whose account was never verified, any password set on it is dropped before the session is created, so a password registered by someone else cannot open the account (`src/modules/auth/hardening.ts`).
- **Impersonation guard:** a "view as" session may only read itself, sign out and stop. Every other auth endpoint (passkeys, 2FA, password, profile, sessions, sign-in) is refused, and nothing at all is served after the deadline. Starting checks the target is an active member of this host's tenant and that the platform user has TOTP or a passkey. The audit entry is written before the session exists, and holds the duration only (the reason text could contain personal data).
- **Admins and unknown sign-in paths:** a method the policy cannot classify is refused for admin roles and platform staff (fail closed).
- **Security changes are audited:** password change and reset, 2FA enable and disable, backup-code regeneration, passkey add and remove, and session revocation write an audit entry after Better Auth succeeds.
- **Redirect targets** (`next`, `callbackURL`) are sanitized to same-origin paths (`src/lib/safe-next.ts`).
- **`continueInvitation` has no `can()` check:** it runs before any account exists and only sets the invitation cookie after validating the token. It is the one documented exception to "every server action checks `can()`".
- **Deferred:**
  - Per-email rate limits (now per IP only).
  - Account security as an inset grouped list, and field-level form errors (P10a polish).
  - Signed-in screenshots of account security and `/admin` (the E2E covers both screens with axe).
- **Users without names:** magic-link and OAuth sign-ups get the email's local part (0006 relaxed the name check).
- **Forms:** auth inputs are disabled until hydration, because React Aria resets values typed earlier, and they POST if submitted before hydration, so a password never lands in a URL.
- **Authorization refusals on tenant pages** render the not-found page with HTTP 200, not 404. The tenant layout's static shell streams first under partial prerendering. No protected content renders; tests assert content, not status.
- **Passkeys:** the relying party is the ROOT_DOMAIN host, and accepted origins are added at runtime from proxy-validated hosts. Not on custom domains yet. Not testable on `*.localhost` (browsers refuse `localhost` as a relying party), so that E2E skips there; use `ROOT_DOMAIN=lvh.me:3000` to try passkeys locally.
- **E2E:** auth tests run sequentially within each device project (Argon2 work would otherwise starve a local server). Fixtures are created in the database by Playwright's global setup and removed afterwards. Mailpit serves magic links and invitations. CI runs Mailpit as a service.
- **Demo accounts:** `owner@demo.test`, plus `admin.`, `instructor.` and `learner.<slug>@demo.test`, and `sponsor.lsetf@demo.test`. Passwords are printed only when an account is created. `pnpm db:seed --rotate-demo-passwords` prints new ones; the seed guard still refuses production.

## MVP track (2026-11-26)

- **Process:** the owner asked for a working platform in one pass. Slices M1 to M7 replace the per-package loop for now (docs/PLAN.md, MVP track). The full package plan stays as the roadmap; P4a, P4c, P4d, P5a, P6, P10a and P11a start from what the MVP built.
- **Lesson text** is a small Markdown subset (`##`, `###`, `-`, `1.`, `**bold**`, `*italic*`, `[text](https://…)`) parsed into typed nodes and rendered by React. No HTML is stored or rendered, so no sanitizer library is needed; anything else stays literal text. A block editor replaces it in P4a.
- **Videos** are YouTube or Vimeo links only, turned into `youtube-nocookie.com` or `player.vimeo.com` embed URLs at render time. **PDFs** are https links (no uploads until P4b).
- **Quizzes** live on the lesson as Zod-validated jsonb (the answer key). Learners receive a copy without it; grading is server-side and all-or-nothing per question; every attempt is stored (`quiz_attempts` is append-only: no UPDATE or DELETE grant). Passing completes the lesson. Question banks, partial credit and timers wait for P5a.
- **Progress and resume:** a lesson is complete when marked (content) or passed (quiz). Resume opens the first incomplete lesson after the last one completed, so viewing a page writes nothing. Removing a lesson later does not reopen completed enrollments.
- **Enrollment modes:** open (the learner enrolls) and invite-only (course staff enroll an existing member by email from the course editor, with `course.edit` on that course). Other modes wait for P4c.
- **Certificates** are issued once per completed enrollment with a random 12-character base32 code (60 bits). The recipient name and course title are snapshots. `/verify/[code]` is public, `noindex`, and only answers on the issuing tenant's host. Printing uses the browser; PDF generation waits for P6.
- **Branding:** tenant admins may rename their tenant (column grant `UPDATE (name)` on `tenants`; slug, status and plan stay platform-only). The accent goes through the theme engine; the logo is an optional https image URL on the monogram logo (`imageUrl`), rendered as a plain `img` with `referrerPolicy="no-referrer"`. Saving expires `tenant:<id>`, `tenant:<id>:theme` and `partners`.
- **Console** is served on `console.{ROOT_DOMAIN}`: the proxy rewrites it to `/console/*` without tenant headers, so its sessions belong to the platform tenant; the hub host 404s `/console`. Signing in needs a platform role and a second factor.
- **Provisioning** runs inside the audited action transaction and switches to `app_platform` with `app.tenant_id` set to the new tenant (0011 grants `app_platform` SELECT on a few `tenants` columns, INSERT on `tenants`, `tenant_themes`, `tenant_settings`, `feature_flags`, `invitations` and `audit_logs`). The existing tenant policies still apply, so `app_platform` cannot read tenant data or write into a tenant it is not creating; it then switches back to `app_user` in the platform tenant for the audit entry. New partners start invite-only with the preset's flags; the first admin gets an invitation email after commit.
- **Admin access:** `/admin` needs `member.read` (tenant admins, program managers); instructors land on `/admin/courses` and see only their own courses. Admin roles still need a second factor first.
- **Seed:** each tenant gets one published, open sample course (`sample-learning-online`) with placeholder copy, created once by slug and never overwritten. No video in the seed, to avoid pointing at third-party content.
- **MVP review fixes:** 0012 limits `app_platform` inserts to a tenant created in the current transaction and removes its SELECT on tenant provisioning tables; `provisionTenant` runs the first-admin step through a callback that only receives the new id; `createPartnerAction` refuses unless the request is on the console host. Quizzes allow 5 attempts per learner (`QUIZ_MAX_ATTEMPTS`), and attempt results return the score only. Invitations are refused while impersonating.
- **Deferred from the MVP security review (low):**
  - Staff enrollment by email tells an instructor whether an address is a member (it needs `course.edit` on the course only).
  - Logo image URLs are fetched by visitors' browsers from the partner's chosen host; self-hosted logos (P4b uploads) and a CSP with `img-src` and `frame-src` limits come with P14 hardening.
  - Invitation sending has no per-tenant rate limit yet.
  - Branding changes are allowed while impersonating a tenant admin.
