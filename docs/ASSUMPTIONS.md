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
