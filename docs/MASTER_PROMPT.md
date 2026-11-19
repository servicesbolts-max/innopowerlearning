# Innopower Learn: Claude Code Master Build Prompt

*A complete start-to-finish build prompt for Claude Code: a multi-tenant learning platform for Innopower AI and its partners (LSETF, WAPSEA AI Training, God's Entrepreneurs, William V. S. Tubman University). Version 1.0, 10 November 2026.*

## Quick start

1. **Prerequisites.** Claude Code installed and signed in (terminal, desktop app, VS Code, or web), Git, Node.js LTS with pnpm, and either Docker Desktop or a free hosted Postgres for development (Neon or Supabase). P0 supports both through `DATABASE_URL`.
2. **Set up the repo.** Create an empty Git repository, open Claude Code in it, download this document as Markdown, and save it as `docs/MASTER_PROMPT.md`. That file is the spec every session reads.
3. **Kick off.** Paste the Kickoff prompt below. Claude Code plans P0 in plan mode, you approve, and it builds the project plus its own Claude Code setup (CLAUDE.md, rules, skills, subagents, hooks, MCP).
4. **One work package per session.** After each package, run `/clear`, then `/phase <id>` (for example `/phase P1`). The 25 work packages (P0 to P14, with sub-packages) are in Section 15. If a session ends early, paste the Resume prompt.
5. **Models.** Use your strongest model for P0 to P3, security-critical packages, and reviews. A faster model is fine for routine UI and CRUD packages.
6. **Decisions already made for you** (edit before saving the file if you disagree): one codebase and one database serving every partner with strict isolation (multi-tenant); Next.js, TypeScript, and PostgreSQL; Paystack, Flutterwave, and Stripe for payments; an installable mobile-first web app (PWA) instead of native apps; a visual Site Builder to satisfy the edit-the-frontend requirement; Innopower Learn as a working name.

### Kickoff prompt (paste once, in the empty repo)

```text
Read docs/MASTER_PROMPT.md in full. It is the spec for a long, multi-session build, and Section 1 explains how we work.

Do work package P0 only:
1. Use plan mode and show me a one-page plan for P0: repository scaffold, tooling, CI, docs skeleton, the development database, and the Claude Code environment from Sections 1.5 and 1.6. Ask me at most three questions, and only if the answers would change the plan. (If you cannot enter plan mode yourself, I will press Shift+Tab until the status bar shows it.)
2. After I approve, build it. Run the quality gate, show me the evidence, commit, and update docs/PROGRESS.md.
3. Stop. Tell me to run /clear and give me the exact command for the next work package.
```

### Per-package prompt (after P0)

```text
/phase P1
```

Use the next package id each time (P1, P2, P3, P4a, and so on). If `/phase` is not available, paste this instead:

```text
Run work package P1: follow Section 1.2 of docs/MASTER_PROMPT.md and the P1 row of docs/PLAN.md.
```

### Unattended variant (optional)

A goal keeps Claude working until the package is verifiably done. It needs a recent Claude Code and works best in auto mode or with the allowlist from Section 1.5.

```text
/goal Work package P1 is complete following Section 1.2 of docs/MASTER_PROMPT.md: the quality gate (pnpm lint, typecheck, test, build) exits 0 with the output shown, every acceptance check for P1 in docs/PLAN.md passes with evidence shown, the reviewer subagents report no high or medium findings, docs/PROGRESS.md is updated, and the work is committed. Stop after 60 turns.
```

### Resume prompt (if a session ends midway)

```text
Read docs/PROGRESS.md and docs/PLAN.md. Run the quality gate and fix anything red first. Then continue the earliest unfinished work package, following Section 1.2 of docs/MASTER_PROMPT.md. Stop when it is done and tell me the next command.
```

### If you cannot save a file first

Paste this whole document as your first message and add: Save this message verbatim as docs/MASTER\_PROMPT.md, then follow the Kickoff prompt.

---

## Master spec

## 0. Role and mission

You are a principal full-stack engineer, product designer, and DevOps lead working in an empty Git repository. Build, test, document, and prepare for deployment a production-grade, multi-tenant learning platform for Innopower AI. Working product name: Innopower Learn (keep it in one config constant so it can be renamed in one line).

Innopower AI is the platform owner. From one codebase it runs separate, fully branded learning platforms for its partners:

1. LSETF
2. WAPSEA AI Training
3. God's Entrepreneurs
4. William V. S. Tubman University

Innopower AI must be able to add more partners later with no code changes and no redeploy: a super admin creates a new partner space with a wizard and invites that partner's admins, who then manage only their own space. Every partner space has its own site, branding, domain, users, courses, cohorts, certificates, settings, and reports, and is fully isolated from every other partner.

Two admin surfaces are required: a Partner Admin panel (each partner's staff manage their own space) and a Super Admin Console (Innopower staff manage all partners). Both include a visual Site Builder so the frontend (pages, navigation, theme, media) and every setting can be edited without developers.

The whole product, including the admin panels, follows Apple's design language (Human Interface Guidelines, including Liquid Glass-style translucent materials for navigation layers). Assume most learners are in West Africa (for example Nigeria and Liberia) on mid-range Android phones with variable connectivity, and record that assumption in `docs/ASSUMPTIONS.md`. Everything in this spec is a requirement unless marked optional.

## 1. How Claude Code works on this project

Context is the scarce resource in a build this size. These rules keep every session small, verified, and resumable.

### 1.1 Principles

- One work package per session. Run `/clear` (or start a new session named after the package, for example with `/rename P4a-course-authoring`) before each one.
- Evidence over assertion. Done means command output, test results, or screenshots shown in the session, never a claim.
- Guardrails live in hooks and permissions, not in prose. Prose is advice; hooks enforce.
- Ask while planning, decide while building. Questions are allowed at plan approval. During execution choose the most conventional, secure, reversible option and record it in `docs/ASSUMPTIONS.md`.
- Keep always-loaded context small: `CLAUDE.md` under 120 lines and `docs/PROGRESS.md` under 120 lines. Everything else is read on demand.

### 1.2 The loop for every work package (what `/phase <id>` runs)

1. **Orient.** Read `docs/PROGRESS.md`, the package's row in `docs/PLAN.md`, and only the sections of `docs/MASTER_PROMPT.md` named in that row (Grep for the heading, then Read that range). Do not re-read the whole master prompt after P0.
2. **Plan (plan mode).** Explore with read-only tools, then write a one-page plan: files to add or change, tests, risks, and each acceptance check with the evidence it will produce. Ask at most three questions, only if the answers change the plan. Wait for approval.
3. **Implement** in vertical slices (schema, server logic, UI, tests, docs). Keep a task list. After every green slice, commit with a Conventional Commit message.
4. **Verify with evidence.** Run the quality gate. For every new or changed screen, start the dev server, open it with the browser tool (Playwright MCP or Claude in Chrome), take screenshots at 390 px and 1280 px in light and dark, compare them with Section 7, fix the differences, and show the final screenshots. Fix root causes; never suppress errors, skip tests, or loosen assertions.
5. **Review in fresh contexts.** In parallel, run `tenant-isolation-auditor` (always), `security-reviewer` (auth, files, payments, webhooks, AI, admin work), and `a11y-design-reviewer` (UI work) on the diff, plus the bundled `/code-review`. Fix every finding that affects correctness, security, tenant isolation, accessibility, or a stated requirement. Ignore style-only findings and do not add speculative abstractions.
6. **Close.** Update `docs/PROGRESS.md` (collapse older entries to one line each), tick the boxes in `docs/PLAN.md`, tag `wp-<id>-done`, print the exact command for the next package, and stop. Never start the next package in the same session.

### 1.3 Context hygiene

- Watch usage with `/context` or a status line. If a package approaches the limit, run `/compact` with a focus note (current package id, changed files, failing tests, open decisions). Better: split the package in `docs/PLAN.md` and record the split.
- If you have corrected the same problem twice, run `/clear` and restart with a sharper prompt.
- Use subagents for wide reads and audits so the main session stays clean. Do not use them for tightly coupled implementation.
- Read narrowly (Grep, then Read with offset and limit). Prefer `@path` imports inside skills over copying text.
- `/rewind` undoes mistakes inside a session, but git is the real undo, so commit often.

### 1.4 Safety

- Never read or write `.env*` files or real credentials. Use test or sandbox keys from env vars.
- Never push, force-push, rewrite history, bypass hooks (`--no-verify`), or edit a migration that is already committed (write a new migration).
- Run destructive database commands only against the local development database.
- These rules are enforced by the permissions and hooks below, not only by this text.

### 1.5 Claude Code environment to create

Use the current Claude Code docs for file formats; do not guess syntax. P0 creates the items marked P0; the rest are created when first needed.

- **`CLAUDE.md`** (P0, under 120 lines): a two-line project summary; the stack; commands (install, dev, db:migrate, db:seed, lint, typecheck, test, e2e, build, gate); the loop in 1.2 in five lines; pointers to `docs/*`; a compaction note (preserve the current package id, changed files, failing tests, open decisions). Put these non-negotiables under one IMPORTANT heading: every tenant table has `tenant_id` and RLS; all database access goes through `withTenant`; every server action checks `can()`, validates with Zod, and writes an audit log entry when it changes state; UI uses design tokens only (no raw colors or spacing); partner admins never inject raw HTML or JavaScript; all strings are externalized; no secrets in code. Run `/context` to confirm it loads and `/doctor` to prune it. `AGENTS.md` is a single line pointing to `CLAUDE.md` for other tools.
- **Path-scoped rules** in `.claude/rules/` with `paths` frontmatter so they load only when matching files are in play. `db.md` (`src/db/**`, `src/modules/**`): tenant\_id, composite foreign keys, forced RLS policies, tenant-leading indexes, forward-only migrations, how to write an isolation test. `design-system.md` (`src/design-system/**`, `src/app/**`): tokens only, Apple patterns from Section 7, reduced motion and transparency, 44 px targets. `security.md` (`src/modules/auth/**`, `src/app/api/**`): authorization, validation, rate limits, and the upload and webhook rules from Section 10. `testing.md` (`**/*.test.ts`, `e2e/**`): conventions from Section 12. Create `db.md` and `design-system.md` in P0 and the rest when first needed.
- **Action skills** (P0, each with `disable-model-invocation: true`): `/phase <id>` runs 1.2 for the package in `$ARGUMENTS`; `/gate` runs the quality gate and summarizes failures with root causes; `/review` runs the reviewers in parallel and triages findings; `/resume` reads PROGRESS and PLAN, runs the gate, and continues the earliest unfinished package.
- **Reference skills** (created when first needed): `add-tenant-table` (P2: schema, SQL migration with RLS and composite foreign keys, data-access functions, isolation test, seed), `add-ds-component` (P1: component, tokens, story, axe test, light and dark, reduced motion), `add-server-action` (P3: permission check, Zod, `withTenant`, audit log, test), `add-provider` (P4b: interface, adapter, fake, contract tests), `add-site-block` (P10c: Zod schema, editor panel, renderer, defaults, story, tests, registry entry).
- **Subagents** in `.claude/agents/` (P0): `tenant-isolation-auditor`, `security-reviewer`, and `a11y-design-reviewer` are read-only (tools: Read, Grep, Glob, Bash) and use the strongest available model; `qa-engineer` may write tests. Their checklists are in 1.7.
- **`.claude/settings.json`** (P0): an allowlist for the project's pnpm scripts, docker compose, Playwright, and git status, diff, log, add, commit, tag, branch, and switch; deny rules for reading `.env*`, git push, hard reset, force flags, `rm -rf`, and piping downloads into a shell; and the hooks in 1.6. Commit `.claude/` to git and gitignore `CLAUDE.local.md` and `.claude/settings.local.json`.
- **`.mcp.json`** (P0): Playwright MCP for browser verification and Context7 for current library docs. No database MCP; use `psql` against the local development database.

### 1.6 Hooks (deterministic guardrails; ask Claude to write them and confirm with `/hooks`)

- After Edit or Write: format the changed file with Prettier and run ESLint with fix on it, returning remaining errors to Claude.
- Before Edit or Write: block writes to `.env*` and to any migration file that already exists in git HEAD.
- Before Bash: block `git push`, force flags, `git reset --hard`, `--no-verify`, `rm -rf` outside build directories, and any DROP DATABASE or DROP SCHEMA command.
- Optional Stop hook: run `pnpm typecheck` and keep the turn open while it fails (Claude Code ends the turn anyway after 8 consecutive blocks).

### 1.7 Reviewer checklists (put these in the agent files)

- **tenant-isolation-auditor:** for every new or changed table: `tenant_id` not null, composite foreign keys, RLS enabled and forced with a policy on `app.tenant_id`, indexes that lead with `tenant_id`. No query outside `withTenant`. Cache keys, CDN tags, storage keys, search indexes, jobs, and webhooks carry the tenant. An isolation test proves wrong-tenant reads return nothing and writes fail.
- **security-reviewer:** server-side `can()` on every action and route; Zod validation; CSRF; rate limits; upload type, size, and signed-URL checks; webhook signature and idempotency; SSRF; HTML sanitization; secrets handling; audit logging; impersonation limits; no PII in logs or AI prompts.
- **a11y-design-reviewer:** tokens only (no hard-coded colors, radii, or spacing); light and dark; contrast; visible focus; keyboard operation; touch targets; reduced motion and transparency; Apple patterns (inset grouped lists, sheets, large titles); screenshots at 390 px and 1280 px actually checked.
- **All reviewers:** report only gaps that affect correctness or a stated requirement, cite file and line, and suggest a fix.

### 1.8 Optional: unattended runs and parallel tracks

- **Unattended:** use `/goal` with a measurable condition (template in the Quick start), in auto mode or with the allowlist from 1.5. Always include a turn cap.
- **Parallel:** after P4d, independent packages (the P5, P7, and P9 families) can run in separate git worktrees, one Claude Code session each, merged one at a time. Each session writes `docs/progress/<id>.md` and the integrator folds it into `docs/PROGRESS.md`. Rebase migrations by timestamp before merging. Never run two sessions in one working directory.

## 2. Stack (use unless you record a better choice in an ADR)

| Layer | Choice |
| --- | --- |
| Language and runtime | TypeScript (strict), Node.js LTS, pnpm |
| App framework | Next.js App Router (latest stable), React Server Components, Server Actions for mutations, Route Handlers for the public API and webhooks. One modular monolith, not microservices |
| UI | Tailwind CSS with CSS-variable design tokens, Radix UI or React Aria primitives wrapped in our own Apple-style components, Motion for spring animation, Lucide icons |
| Database | PostgreSQL 16+, Drizzle ORM, committed SQL migrations, Row-Level Security on every tenant table, pgvector for AI search |
| Auth | Better Auth (organizations and memberships, passkeys, TOTP 2FA, magic link, OAuth), mapping its organization tables to tenants rather than duplicating them; use Auth.js instead only if an ADR shows Better Auth cannot meet a requirement |
| Validation and forms | Zod everywhere (env, forms, actions, API, page-block schemas), React Hook Form, TanStack Table, dnd-kit, TipTap (sanitized output) |
| Background work | Inngest or Trigger.dev for emails, certificates, reports, video webhooks, AI jobs, and scheduled tasks (BullMQ with Redis as the self-host fallback) |
| Storage and video | S3-compatible storage (Cloudflare R2 in production, MinIO locally) with signed URLs; a `VideoProvider` interface with Mux as default, a Cloudflare Stream adapter, and YouTube and Vimeo embeds |
| Email and messaging | Resend with React Email (SMTP fallback, Mailpit locally); a `MessagingProvider` interface for SMS and WhatsApp (for example Termii, Twilio, or Meta WhatsApp Cloud API) |
| Payments | A `PaymentProvider` interface with Paystack, Flutterwave, Stripe, and manual bank transfer with proof upload |
| Cache, limits, search | Redis (Upstash or self-hosted) for caching and rate limits; Postgres full-text search plus pg\_trgm behind a `SearchProvider` interface |
| i18n and PWA | next-intl (English first, locale-ready), Serwist for the service worker |
| Quality | Vitest, Testing Library, Playwright with axe-core, Storybook, ESLint (flat config), Prettier, Husky, lint-staged, commitlint |
| Operations | Docker Compose (Postgres, Redis, MinIO, Mailpit), GitHub Actions, Sentry, pino logs, OpenTelemetry |

## 3. Multi-tenancy (the core architectural decision)

- **Model:** one codebase, one Postgres database, shared schema. Every tenant-owned row has `tenant_id`. Isolation is enforced in three layers: (1) host-based tenant resolution in middleware; (2) a data-access layer that cannot run a query without a `TenantContext`; (3) Postgres Row-Level Security with `FORCE ROW LEVEL SECURITY`. All database access goes through one helper, `withTenant(ctx, fn)`, which opens a transaction, sets `app.tenant_id` with `SET LOCAL`, and runs the callback. The application database role is not a superuser and does not have BYPASSRLS. A separate, narrowly scoped platform role is used only by Super Admin code paths, and every use is audit-logged.
- **Tenant resolution:** by Host header through `tenant_domains` (a `{slug}.{ROOT_DOMAIN}` subdomain plus verified custom domains). `ROOT_DOMAIN` is an env var (default `localhost:3000` in development; the production domain will be supplied later). Local development uses `{slug}.localhost:3000` (document `lvh.me` as an alternative). Preview deployments use a `/t/{slug}` path fallback. The root domain serves the Innopower Hub (public site, partner directory, 'find your organization' sign-in, 'Become a partner' application). The Super Admin Console lives at `console.{ROOT_DOMAIN}`.
- **Identity:** a global `users` table (unique email) plus per-tenant `memberships(user_id, tenant_id, role, status)` and per-tenant profile data. Sessions are scoped to the tenant host. One person can belong to several partners with one set of credentials but never sees another partner's data. A tenant can require SSO, restrict sign-up to email domains, or be invite-only.
- **Tenant presets** pre-configure feature flags, default profile fields, and a starter homepage: `training_provider`, `funded_program` (agency or sponsor-funded training with sponsors and reporting), `university` (terms, departments, course codes, credits, GPA, transcripts), and `community_organization`. Seed mapping (an assumption: record it and keep it editable): LSETF as `funded_program`, WAPSEA AI Training as `training_provider`, God's Entrepreneurs as `community_organization`, William V. S. Tubman University as `university`.
- **Everything is tenant-aware:** cache keys and CDN tags include the tenant id; storage keys use `t/{tenant_id}/...`; background jobs and webhooks carry `tenant_id` and run inside a tenant context; rate limits are per tenant to avoid noisy neighbours; composite foreign keys `(tenant_id, id)` prevent cross-tenant references.
- **Limits and flags:** `plans` (seats, storage GB, video minutes, AI credits) and per-tenant `feature_flags`, enforced on the server and visible in both admin panels.
- **Lifecycle:** tenants can be suspended, archived, exported, and deleted after a grace period.
- **Future-proofing:** keep all data access behind the tenant-aware layer so a very large tenant can later move to its own database.
- Document the request flow with a Mermaid diagram in `docs/ARCHITECTURE.md`.

## 4. Roles and permissions

| Role | Scope | Can do |
| --- | --- | --- |
| `platform_owner` | All tenants | Everything, including provisioning partners, plans, and audited impersonation |
| `platform_staff` | All tenants | Support tools and read-only tenant data; impersonation only if granted; no secrets or billing |
| `tenant_admin` | One tenant | Everything inside the tenant, including settings and the Site Builder |
| `program_manager` | One tenant | Cohorts, applications, enrollments, reports, announcements |
| `instructor` | Own courses | Author, grade, message cohorts, view analytics |
| `teaching_assistant` | Assigned courses | Grade, answer Q&A, moderate |
| `learner` | Own data | Learn, submit, discuss, earn credentials |
| `sponsor_viewer` | Assigned programs | Read-only aggregated reports (funders) |
| `guest` | Public | Public pages and the catalog |

Rules: permissions are strings such as `course.create`, `grade.write`, `site.publish`, and `tenant.provision`; roles are bundles of permissions; one `can(actor, permission, resource)` function is used by both UI and server; deny by default; tenant admins can later define custom roles; every sensitive action writes to an append-only audit log; unit-test the full role by permission matrix.

## 5. Feature requirements

### 5.1 Learner experience

- Sign-up and sign-in follow each tenant's policy (open, invite-only, application and approval, SSO-only, or email-domain restricted): email and password with a breached-password check, magic link, Google, Microsoft, and passkeys.
- Today screen: continue learning, due soon, upcoming live sessions, announcements, and streak (if gamification is on).
- Catalog: search, filters (category, level, format, language, duration, price, cohort), sorting, featured courses, learning paths, wishlist.
- Course page: outline, instructors, outcomes, prerequisites, preview lessons, FAQ, ratings (optional), enroll or buy button.
- Course player: distraction-free layout, outline sidebar, auto-resume, next and previous, keyboard shortcuts; video with speed, captions, transcript, quality, and picture-in-picture; text, PDF and slides, audio, downloads, notes, bookmarks, lesson discussion, and reading preferences (text size, contrast, dyslexia-friendly font).
- Calendar of live sessions, deadlines, and cohort schedule with ICS and Google or Outlook add-to-calendar.
- Notification center with per-channel preferences; profile with avatar, custom fields, language, timezone, privacy controls, data export, and account deletion.
- Mobile-first, installable PWA; offline-lite (cached text lessons and downloads, queued progress sync); data-saver mode (no autoplay, lower video quality, lighter images).

### 5.2 Course authoring

- Course, sections, lessons, blocks. Lesson types: video, rich text, PDF or slides, audio, embed, live session, quiz, assignment, survey, discussion. SCORM and xAPI packages and H5P are optional.
- Course settings: title, slug, summary, outcomes, level, language, categories and tags, thumbnail and promo video, prerequisites, enrollment rule (open, approval, invite, code, cohort, paid), capacity, dates, self-paced or scheduled with drip release, completion rules (all lessons, percentage, required quizzes, minimum score), and certificate template.
- Draft, review, and publish workflow with versions, change notes, and rollback; duplicate; import and export (JSON plus media); drag-and-drop ordering; autosave; preview as learner.
- Per-tenant question banks and content library. An Innopower Library of shared courses and templates that partners can clone or license, with optional update propagation.
- Resumable direct-to-storage uploads, transcoding through the video provider, and auto-captions through a provider interface.

### 5.3 Assessment and grading

- Quiz engine: single and multiple choice, true or false, short answer, numeric, fill in the blank, matching, ordering, essay (manual grade), file upload; question banks with random draws; shuffling; time limits; attempt limits; pass mark; per-answer feedback; answer-reveal policy; autosave and resume; per-learner time extensions.
- Assignments: text, file, or link submissions; due dates; late policy; rubrics; inline comments; resubmission; optional peer review; plagiarism-check provider interface.
- Gradebook per course and cohort: weights, categories, grading schemes (percent, letter, GPA, pass or fail), audited overrides, CSV export.
- Optional anti-cheat basics (randomization, one question at a time, tab-visibility log). Never claim proctoring.

### 5.4 Credentials and gamification

- Certificate designer with merge fields, logos, signatures, and QR code; automatic issue on completion; PDF generation as a background job; public verification page at `/verify/{code}`; revocation; expiry and renewal; share to LinkedIn and WhatsApp; Open Badges export (optional).
- Gamification, per-tenant toggle: XP ledger, levels, badges, streaks, and cohort leaderboards with learner opt-out.
- University preset: official transcripts (PDF with verification code), term and cumulative GPA, credit hours.

### 5.5 Community and communication

- Announcements at course, cohort, and tenant level; per-course discussion and Q&A with threads, upvotes, accepted answers, reporting, moderation tools, and spam filtering; optional direct messages and cohort chat; optional mentorship (mentor profiles, matching, session notes).
- Live sessions: scheduling with Zoom, Google Meet, Microsoft Teams, Jitsi, or a manual link; attendance (automatic where the provider allows, otherwise manual); recordings attached to the course.
- Notification engine: in-app, email, web push, and SMS or WhatsApp through the provider interface; user preferences, digest mode, quiet hours in the user's timezone; tenant-editable templates with merge fields.

### 5.6 Programs, cohorts, applications

- Programs (multi-course pathways) and cohorts (dated groups with capacity, instructors, schedule, sponsor tags).
- Applications and admissions: form builder (text, select, file, conditional logic, eligibility rules), submissions inbox, review workflow with scoring and notes, bulk approve, reject, or waitlist, automatic enrollment into a cohort, and templated emails.
- Bulk onboarding by CSV or XLSX with validation preview, dry run, error report, and invite emails; bulk enroll, unenroll, and transfer.
- Attendance, learner status pipeline (applied, enrolled, active, at risk, completed, dropped), and inactivity alerts.
- Custom profile fields per tenant (for example state, gender, age band, business stage, faculty, matriculation number) with field-level privacy and consent flags, usable in filters and reports.
- Sponsor and funder reporting: scheduled aggregated reports for the `sponsor_viewer` role, with no personal data without consent.
- University mode: academic terms, faculties and departments, course codes, credits, sections, add and drop windows, grade submission and approval, transcripts.

### 5.7 Commerce (optional per tenant)

- Free, paid, subscription, bundles, sponsored seats, vouchers, and coupons; multi-currency per tenant (for example NGN, USD, LRD) with amounts stored in minor units plus ISO currency; optional VAT; invoices and receipts as PDF; refunds; manual bank transfer with proof upload and admin approval; signed, idempotent webhooks; subscription retries.

### 5.8 Reports and analytics

- Dashboards for learner, course, cohort, program, tenant, and platform; funnel (visit, apply, enroll, complete); engagement (active days, time on task); drop-off per lesson; assessment item analysis; instructor and revenue views; CSV, XLSX, and PDF export; scheduled email reports; saved views. Filters respect permissions and privacy. Every metric is defined once in documented SQL views (`docs/analytics.md`).

### 5.9 AI features (behind tenant flags, credit limits, and a global kill switch)

- A provider-agnostic `AIProvider` interface configured by env.
- Study assistant: answers only from the tenant's own course content (RAG on pgvector, strict per-tenant isolation, lesson citations, refuses out-of-scope questions).
- Authoring assistant: drafts outlines, summaries, quiz questions, and alt text as editable drafts that always need human approval.
- Instructor insights: at-risk summaries and study-plan suggestions, with no automated adverse decisions about learners.
- Safeguards: moderation, PII redaction in prompts, per-user and per-tenant rate limits and monthly caps, usage metering, audit log, and learner consent text.

### 5.10 Integrations and API

- Versioned REST API at `/api/v1` with an OpenAPI 3.1 spec generated from Zod schemas, per-tenant API keys with scopes, and rate limits.
- Outgoing webhooks (`enrollment.created`, `course.completed`, `certificate.issued`, `payment.succeeded`, and more) with HMAC signatures, retries, and a delivery log.
- Optional: LTI 1.3, SCORM and xAPI import, SAML or OIDC SSO for universities. Also: ICS feeds, and a custom SMTP and sender domain per tenant with SPF and DKIM guidance in the UI.

### 5.11 Out of scope for v1

Native iOS and Android apps (keep the API complete so they can follow), self-hosted video transcoding, live proctoring, blockchain credentials, and billing partners for platform usage (usage is metered and exportable for manual invoicing).

## 6. Admin panels

### 6.1 Partner Admin panel (tenant scope, at `/admin`)

Left sidebar (macOS-style) with Dashboard, People, Programs and Cohorts, Courses, Applications, Commerce, Credentials, Communications, Reports, Site Builder, and Settings. A Cmd/Ctrl+K command palette searches people, courses, pages, and settings. Settings use inset grouped lists like iOS Settings:

- **General:** name, legal name, contact, timezone, default language and currency, support email.
- **Branding:** logos, favicon, PWA icons, link to the theme editor.
- **Domain:** subdomain, custom domain with DNS verification and status.
- **Access and registration:** registration mode, email-domain allowlist, required fields, age gate, terms acceptance.
- **Security:** required 2FA for admins, password policy, session length, SSO configuration, optional IP allowlist.
- **Email and notifications:** sender, templates, channels, quiet hours.
- **Payments:** providers, currencies, tax.
- **Learning defaults:** grading scheme, completion rules, gamification, certificate defaults, AI toggles.
- **Integrations:** video, live sessions, calendar, webhooks, API keys.
- **Legal and privacy:** Terms, Privacy Policy, cookie banner, retention periods, consent text.
- **Localization:** languages and UI string overrides.
- **Data:** import, export, deletion requests, tenant offboarding.
- **Audit log** (searchable and exportable) and **Plan and usage** (read-only limits and consumption).

### 6.2 Site Builder (edit the frontend without code)

- **Pages:** create, duplicate, and delete from templates (Home, About, Programs, Contact, FAQ, Help Center, custom). Block-based editor with live preview, desktop, tablet, and phone toggle, drag-and-drop ordering, inline text editing, undo and redo, autosave drafts, version history with diff and rollback, scheduled publishing, tokenized preview links, per-page SEO (title, description, Open Graph image, canonical), visibility (public or learners only), and per-language versions.
- **Blocks** are typed, Zod-validated JSON, never raw HTML: Hero (image, video, or gradient), Feature grid, Course grid or carousel (from the catalog), Program list, Stats counters, Testimonials, Partner and sponsor logos, Instructor cards, Rich text, Image gallery, Video, FAQ accordion, Timeline, Pricing table, CTA banner, Form (from the Form Builder), Newsletter signup, Announcement bar, Embed (allow-listed hosts only), Footer columns. Block styling is limited to design tokens (spacing, alignment, background style) so every page stays on-system.
- **Theme editor:** accent color (auto-generates accessible light and dark steps and the on-accent text color, and blocks combinations that fail WCAG AA), optional secondary color, surface style, corner-radius scale, font choice (system stack by default), light and dark logos, favicon, hero defaults, default color scheme, live preview, and Reset to Apple default.
- **Navigation:** header, footer, learner sidebar, and mobile tab bar items (show, hide, reorder, rename); announcement banner.
- **Media library:** upload, folders, tags, required alt text before publish, focal-point cropping, automatic AVIF and WebP and responsive sizes, usage tracking, delete protection.
- **Form Builder, email template editor, certificate designer:** share the same editor primitives and versioning.
- **Safety:** partner admins cannot inject arbitrary HTML or JavaScript. Sanitized, tenant-scoped custom CSS limited to token variables is available to `platform_owner` only. Analytics IDs (Plausible, GA, PostHog) are plain settings.
- **Publishing:** draft to published with tenant-tag cache invalidation, one-click rollback, and audit logging.

### 6.3 Super Admin Console (Innopower staff, at `console.{ROOT_DOMAIN}`)

- **Dashboard:** tenants, active users, completions, storage, video minutes, AI usage, error rates, job queue health, revenue by tenant.
- **Tenants:** list, search, filter. **Partner Provisioning Wizard:** name, slug, preset, country, timezone, currency, brand basics, subdomain or custom domain, plan and limits, feature flags, first admin invite, optional starter content, and a final checklist. A public 'Become a partner' form on the Hub feeds an approval queue that launches the same wizard. Also: suspend, reactivate, archive, clone configuration from another tenant, export data, and scheduled deletion with a grace period.
- **Impersonation (View as):** needs a reason, is time-limited, shows a persistent banner, is fully audited, and is blocked for password, payment, and security changes.
- **Plans, limits, flags:** seats, storage, video minutes, AI credits, per-tenant feature flags, usage metering.
- **Innopower Library:** publish courses, page templates, certificate templates, and tenant presets for partners to clone or license.
- **Support:** cross-tenant user search (metadata only unless impersonating), resend invites, lock and unlock accounts, data-request tooling.
- **System settings:** email, storage, payment, video, and AI providers; security policies; rate limits; maintenance mode; platform announcements; the Hub site (same Site Builder); legal templates.
- **Audit and security:** global audit log, anomaly flags (brute force, impossible travel), and a one-click tenant-isolation self-test that runs cross-tenant canary queries.

## 7. Apple design system

**Principles:** clarity, deference, depth. Content first, generous whitespace, hierarchy through size and weight instead of boxes and borders, one accent color, restrained decoration, identical behavior across every partner. This is an HIG-inspired visual language, not an affiliation with Apple: never use Apple logos, SF Symbols, product imagery, or other Apple trademarks, and never bundle or hotlink SF Pro.

### 7.1 Typography

- Stack: `-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', Inter, 'Segoe UI', Roboto, system-ui, sans-serif`. Self-host Inter (variable, subsetted, `font-display: swap`) as the cross-platform fallback because most learners will be on Android and Windows.
- Scale in rem (px at 100%): Large Title 34/41 bold, Title 1 28/34 bold, Title 2 22/28 semibold, Title 3 20/25 semibold, Headline 17/22 semibold, Body 17/22 regular, Callout 16/21, Subheadline 15/20, Footnote 13/18, Caption 12/16, Caption 2 11/13. Marketing display sizes 48 to 80 with 1.05 to 1.1 line height and -0.02em to -0.03em tracking. Dense admin tables may use 15 and 13.

### 7.2 Color tokens (CSS variables, semantic names, light and dark)

| Token | Light | Dark |
| --- | --- | --- |
| `--bg` | #FFFFFF | #000000 |
| `--bg-secondary` | #F2F2F7 | #1C1C1E |
| `--bg-tertiary` | #FFFFFF | #2C2C2E |
| `--bg-grouped` / `--bg-grouped-row` | #F2F2F7 / #FFFFFF | #000000 / #1C1C1E |
| `--label` | #000000 | #FFFFFF |
| `--label-secondary` | rgba(60,60,67,.60) | rgba(235,235,245,.60) |
| `--label-tertiary` | rgba(60,60,67,.30) | rgba(235,235,245,.30) |
| `--separator` | rgba(60,60,67,.29) | rgba(84,84,88,.60) |
| `--fill` | rgba(120,120,128,.20) | rgba(120,120,128,.36) |
| `--accent-fill` (buttons) | #0071E3 | #0071E3 |
| `--accent-text` (links) | #0066CC | #2997FF |
| `--green` | #34C759 | #30D158 |
| `--red` | #FF3B30 | #FF453A |
| `--orange` | #FF9500 | #FF9F0A |
| `--yellow` | #FFCC00 | #FFD60A |
| `--indigo` | #5856D6 | #5E5CE6 |
| `--purple` | #AF52DE | #BF5AF2 |

Note: raw iOS blue (#007AFF) gives only about 4:1 against white, so filled buttons and links use the AA-safe steps above. Every tenant accent must produce an `--accent-fill` with at least 4.5:1 contrast against its on-accent text and an `--accent-text` with at least 4.5:1 on `--bg` and `--bg-secondary`; the theme engine darkens or lightens the accent until it passes. Status colors are never the only signal.

### 7.3 Shape, depth, motion

- 4px base grid (8px rhythm). Widths: reading 680, app 1200, marketing up to 1280. Touch targets at least 44px (dense admin controls at least 32px).
- Radii: controls 10 to 12, cards 16 to 20, sheets and modals 20 to 28, pill buttons for marketing CTAs. Use `corner-shape: squircle` as a progressive enhancement behind `@supports`.
- Elevation: prefer separators and tonal surfaces; shadows are soft and low (`0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.08)`); dark mode uses lighter surfaces instead of shadows.
- Materials: navigation bars, tab bars, sidebars, and sheets use translucency (`background: color-mix(in srgb, var(--bg) 72%, transparent); backdrop-filter: saturate(180%) blur(20px)` plus a 0.5px separator), falling back to opaque when `prefers-reduced-transparency: reduce` or when unsupported. Never place text on blur without a contrast check.
- Motion: spring physics (stiffness 300 to 400, damping about 30) for sheets, toggles, and list reordering; 200 to 350 ms for standard transitions; View Transitions API for navigation where supported; replace motion with fades or instant changes under `prefers-reduced-motion`.
- Icons: Lucide at 1.75 stroke, sizes 16, 20, and 24.

### 7.4 Components (build in `src/design-system`, document in Storybook, axe-test each)

Button (filled, tinted, gray, plain; small, medium, large; destructive; loading), Link, Switch (iOS proportions), Segmented control, Text field, Search field with tokens, Text area, Select and picker, Date and time pickers, Stepper, Slider, Checkbox, Radio, Progress bar and ring, Badge, Chip, Avatar and avatar stack, Inset grouped List and Row with disclosure chevrons, Data table (sortable, filterable, column visibility, bulk actions, sticky header), Card, Sheet (bottom sheet with grabber on mobile, centered on desktop), Alert dialog with stacked buttons, Menu, Context menu, Popover, Action sheet, Tooltip, Toast and banner, Tabs, Tab bar (mobile bottom navigation), Collapsible sidebar, Navigation bar with collapsing large title, Breadcrumb, Pagination, Disclosure group, Empty state, Skeleton, Wizard stepper, Command palette, Toolbar, Split view (list and detail), Calendar, Rich-text editor skin, Video player skin, Certificate preview.

### 7.5 Tenant theming

Only these vary per tenant: accent color, optional secondary accent, logo set, radius scale (compact, standard, rounded), default color scheme, hero imagery, and font choice. Everything else stays on-system. The theme engine generates accessible accent scales (OKLCH steps), validates contrast, and emits CSS variables on the server for each tenant so there is no flash of the default theme; the output is cached by tenant tag.

### 7.6 Interaction patterns and voice

- Large titles that collapse on scroll; inset grouped lists for settings; sheets for create and edit flows; skeleton loading; optimistic updates where safe; undo toasts instead of confirm dialogs for reversible actions, with clear confirmation for destructive ones; one clear action per empty state.
- Sentence-case labels, verbs on buttons, calm and concise microcopy, and errors that say what happened and how to fix it.
- Accessibility is part of the system: WCAG 2.2 AA, a visible focus ring (2px accent outline with 2px offset), full keyboard operation, screen-reader names and roles, forced-colors support, and 200% zoom and user text-size preferences without broken layouts.

## 8. Routes and information architecture

- **Hub (root domain):** `/`, `/partners`, `/become-a-partner`, `/library`, `/sign-in` (find your organization), `/legal/*`.
- **Tenant public:** `/`, `/courses`, `/courses/[slug]`, `/programs`, `/p/[page-slug]`, `/apply/[form-slug]`, `/verify/[code]`, `/sign-in`, `/sign-up`, `/invite/[token]`.
- **Learner:** `/learn`, `/learn/courses/[slug]/[lesson]`, `/learn/calendar`, `/learn/grades`, `/learn/certificates`, `/learn/community`, `/learn/notifications`, `/account`.
- **Teaching:** `/teach`, `/teach/courses/[id]/edit`, `/teach/grading`, `/teach/cohorts`.
- **Admin:** `/admin/*` per Section 6.1. **Super Admin:** `/console/*` per Section 6.3.
- **API:** `/api/v1/*`, `/api/webhooks/[provider]`, `/api/health`, `/api/ready`.

## 9. Data model

Conventions: UUIDv7 primary keys; `tenant_id uuid not null` on every tenant-owned table, first in every index and unique constraint; composite foreign keys `(tenant_id, id)`; `created_at`, `updated_at`, `created_by`, and soft delete `deleted_at`; timestamps as `timestamptz` in UTC; money as integer minor units plus ISO currency; JSONB only for validated configuration and page blocks; forward-only SQL migrations using expand and contract for zero downtime.

Core tables (design the full schema from Section 5): `tenants`, `tenant_domains`, `tenant_settings`, `tenant_themes`, `feature_flags`, `plans`, `users`, `sessions`, `accounts`, `memberships`, `roles`, `permissions`, `profiles`, `custom_field_definitions`, `custom_field_values`, `programs`, `cohorts`, `terms`, `departments`, `categories`, `courses`, `course_versions`, `sections`, `lessons`, `lesson_blocks`, `media_assets`, `enrollments`, `progress_events`, `quizzes`, `question_banks`, `questions`, `quiz_attempts`, `attempt_answers`, `assignments`, `submissions`, `rubrics`, `grades`, `gradebook_entries`, `discussion_threads`, `posts`, `announcements`, `notifications`, `notification_preferences`, `live_sessions`, `attendance`, `certificate_templates`, `certificates`, `badges`, `xp_ledger`, `pages`, `page_versions`, `navigation_items`, `forms`, `form_submissions`, `applications`, `orders`, `payments`, `coupons`, `invoices`, `webhooks`, `webhook_deliveries`, `api_keys`, `audit_logs`, `ai_usage`, `library_items`, `jobs_log`.

## 10. Non-functional requirements

- **Security:** treat OWASP ASVS Level 2 as the checklist (`docs/SECURITY.md`). Strict CSP with nonces, CSRF protection on mutations, rate limiting on auth, API, and AI endpoints, Argon2id password hashing, session rotation, mandatory 2FA for admin roles, safe file uploads (type sniffing, size limits, optional ClamAV), short-lived signed URLs, SSRF-safe fetchers, provider keys and secrets encrypted at rest, an append-only audit log, dependency audit and secret scanning in CI, and a documented backup and restore drill.
- **Privacy:** align with the Nigeria Data Protection Act 2023 and GDPR-style rights (access, export, correction, deletion), consent records, data minimization, per-tenant retention policies, extra care for minors when an age gate is on, and no learner PII in logs, analytics, or AI prompts. Provide editable legal templates (not legal advice).
- **Performance** (primary users are on mid-range Android phones over 3G or 4G): LCP of 2.5 s or better and INP of 200 ms or better on throttled mid-tier 4G; at most 170 KB gzip of JavaScript on first load of public pages; AVIF and WebP with responsive sizes; server components and streaming; tenant-tagged ISR and edge caching; indexes and N+1 prevention; pagination everywhere; adaptive-bitrate video with data-saver mode; Lighthouse CI budgets (Performance 90, Accessibility 95, SEO 95 on public pages).
- **Accessibility:** WCAG 2.2 AA, axe in CI, and a manual keyboard and screen-reader checklist for core flows.
- **Reliability:** health and readiness endpoints; graceful degradation when a provider is down (queue, retry, visible banner); idempotent jobs; job status visible in the Console.
- **Internationalization:** next-intl with ICU messages, all strings externalized, tenant locale for dates, numbers, and currency, CSS logical properties, and per-tenant string overrides.

## 11. Seed and demo data

`pnpm db:seed` is idempotent and refuses to run in production unless `ALLOW_DEMO_SEED=true`. It creates the Hub (the platform tenant) and four partner tenants with the slugs `lsetf`, `wapsea`, `gods-entrepreneurs`, and `wvstu`. Each tenant gets its preset, neutral placeholder branding (a distinct accent color and a monogram SVG logo, all clearly marked as placeholder), a homepage built from blocks, navigation, one sample course with three sections, a quiz, an assignment, a certificate template, a cohort, and an announcement.

- LSETF (`funded_program`): sample course 'Digital Skills for Work', an application form, a cohort, and a `sponsor_viewer` account with aggregated reports.
- WAPSEA AI Training (`training_provider`): sample course 'AI Fundamentals', one free and one paid example, AI study assistant enabled.
- God's Entrepreneurs (`community_organization`): sample course 'Business Foundations', community discussions, optional mentorship enabled.
- William V. S. Tubman University (`university`): academic terms, departments, and a sample course 'Introduction to Computer Science' (CSC 101) with credits and a GPA grading scheme.

All sample copy is generic placeholder text. Do not invent claims, statistics, logos, or testimonials about real organizations. Demo accounts (a platform owner, plus a tenant admin, instructor, and learner per tenant) are for development only; passwords are generated and printed once by the seed script and never hard-coded.

## 12. Testing strategy

- **Unit (Vitest):** permission matrix, grading, completion rules, theme contrast engine, money math, importers.
- **Integration (real Postgres):** migrations; RLS (for every tenant table, queries from the wrong tenant context return zero rows and writes are rejected); the data-access layer; jobs; webhook signatures and idempotency.
- **E2E (Playwright, per-tenant hosts):** (1) learner journey: register, enroll, complete lessons, pass a quiz, submit an assignment, receive a certificate, verify it publicly; (2) tenant isolation by URL, API, cache, file, and search; (3) Site Builder: edit, preview, publish, see the public page change, roll back; (4) provision a new partner through the wizard, invite its first admin, and confirm the new space works; (5) application, approval, enrollment; (6) paid enrollment against provider mocks or sandboxes; (7) admin 2FA enforcement; (8) PWA and offline-lite basics.
- **Accessibility:** axe on every top-level route in light and dark; keyboard-only runs of core flows.
- **Visual:** Storybook stories for every component in light, dark, and three tenant themes. During development, use Playwright MCP or Claude in Chrome to screenshot every new or changed screen at 390 px and 1280 px in light and dark, and compare it with Section 7 before committing.
- **Load smoke (k6):** catalog, progress writes, and quiz submission at 500 concurrent users on a dev-sized instance, with p95 under 500 ms for reads.
- **Security:** authorization fuzzing of every server action and route (role by tenant by resource), CSRF, upload abuse, rate limits.
- Coverage target: at least 80% of lines in domain modules (permissions, grading, billing, tenancy).

## 13. Repository layout and DevOps

```text
CLAUDE.md  AGENTS.md  README.md  docker-compose.yml  Dockerfile  .env.example  .mcp.json
.claude/     settings.json  rules/  skills/  agents/
docs/        MASTER_PROMPT PLAN PROGRESS ARCHITECTURE ASSUMPTIONS SECURITY RUNBOOK ADMIN_GUIDE PARTNER_ONBOARDING DESIGN_SYSTEM HANDOFF adr/ progress/
src/app/     (hub) (tenant-public) (learn) (teach) (admin) (console) api/
src/design-system/   tokens, components, themes, stories
src/modules/ tenancy auth rbac courses assessments credentials community programs commerce reports ai cms notifications files integrations
src/db/      schema, sql migrations, rls policies, seeds
src/lib/     env, logging, jobs, providers (video payment messaging ai search storage email)
src/i18n/    e2e/   tests/   scripts/   .github/workflows/
```

- Modules expose a public API through `index.ts`; no deep imports across modules (enforce with ESLint boundaries); UI code never queries the database directly.
- Development database: support both Docker Compose and a hosted development Postgres through `DATABASE_URL`, and document both in the README.
- A clean clone must work with `pnpm i && docker compose up -d && pnpm db:migrate && pnpm db:seed && pnpm dev`, documented in the README.
- CI (required to merge): lint, typecheck, unit, integration with service containers, build, Playwright, axe, Lighthouse CI, dependency audit.
- Environments: development, per-PR preview, staging, production. Migrations run in the deploy pipeline using expand and contract. Feature flags live in the database.
- Provide two deployment guides: (a) Vercel with a wildcard domain and the Domains API for custom domains, managed Postgres (Neon or Supabase), Cloudflare R2, and Upstash; (b) Docker Compose on a VPS behind Caddy with automatic TLS, using an on-demand certificate `ask` endpoint that only approves verified tenant domains.
- Custom-domain flow: the admin enters the domain, the UI shows the DNS records, a job verifies them, and the platform issues the certificate.
- Backups: daily Postgres backups with point-in-time recovery, object-storage versioning, and a restore drill described in `docs/RUNBOOK.md`.
- Observability: Sentry, structured logs carrying `tenant_id` and `request_id`, and a list of alerts to configure.

## 14. Documentation deliverables

`README`, `CLAUDE.md`, `ARCHITECTURE` (with Mermaid diagrams), ADRs, `SECURITY`, `RUNBOOK`, `ADMIN_GUIDE` (how a partner admin edits the site, creates courses, and runs a cohort), `PARTNER_ONBOARDING` (how to add partner number five in under 10 minutes), the OpenAPI spec, `DESIGN_SYSTEM` (tokens and usage), `CONTRIBUTING`, and `HANDOFF`.

## 15. Work packages

Run the packages in order, one per session (Section 1.2). `docs/PLAN.md` mirrors this table as checkboxes, including the Read and Acceptance columns. Each package ends with the quality gate, the reviews in 1.2, a commit, the tag `wp-<id>-done`, and a `docs/PROGRESS.md` update. Acceptance means evidence shown in the session: command output, test results, or screenshots.

| Package | Scope | Read | Acceptance |
| --- | --- | --- | --- |
| P0 Foundation and Claude Code setup | Scaffold, tooling, CI, env validation, health endpoints, docs skeleton, development database (Docker or hosted), the Claude Code environment from 1.5 and 1.6 | 1, 2, 12, 13, 14 | Clean clone runs; CI green; `/hooks` lists the hooks; `/doctor` finds nothing to cut; an edit to a committed migration is blocked |
| P1 Design system | Tokens, typography, theme engine with contrast checks, 30+ components, Storybook, `/design` showcase, skill `add-ds-component` | 7, 12 | axe clean; showcase screenshots at 390 and 1280 px, light and dark, in three tenant themes |
| P2 Tenancy and data | Core schema, host resolution, `withTenant`, RLS on every table, seed of 5 tenants, Hub skeleton, skill `add-tenant-table` | 3, 4, 9, 11 | Isolation tests pass for every table; each tenant host shows a distinct branded shell (screenshots) |
| P3 Auth and RBAC | Sign-in methods, registration modes, invites, 2FA, `can()`, audit log, impersonation, skill `add-server-action` | 4, 10 | Permission matrix tests pass; admin 2FA enforced (E2E) |
| P4a Course schema and authoring | Categories, courses, sections, lessons, blocks, authoring UI, drag-and-drop, autosave | 5.2, 9 | E2E: an instructor builds a course with video, text, and quiz lessons |
| P4b Media, video, versions | Uploads, `VideoProvider`, versioning, publish and rollback, skill `add-provider` | 2, 5.2 | E2E: publish v1, edit, publish v2, roll back |
| P4c Catalog and enrollment | Catalog, search, course page, every enrollment mode | 5.1, 5.2 | E2E: a learner finds a course and enrolls through each mode |
| P4d Learner player and progress | Player, resume, notes, bookmarks, data saver, offline-lite PWA | 5.1, 10 | E2E: a learner completes lessons; offline-lite check passes |
| P5a Quizzes | Engine, banks, attempts, feedback | 5.3 | Unit and E2E: attempt, autosave, resume, grade |
| P5b Assignments and gradebook | Submissions, rubrics, gradebook, exports | 5.3 | E2E: submit, grade with a rubric, export |
| P6 Credentials | Certificates, verification page, badges and XP, transcripts | 5.4 | E2E: certificate PDF issued and verified publicly |
| P7a Community | Announcements, discussions, Q&A, moderation | 5.5 | E2E: post, answer, accept, report |
| P7b Notifications and live sessions | Notification engine and channels, live sessions, calendar, ICS | 5.5 | Preferences honored in tests; ICS file validates |
| P8a Programs and applications | Programs, cohorts, form builder, applications, approval to enrollment | 5.6 | E2E: apply, approve, enrolled |
| P8b Imports and reporting | CSV import, attendance, sponsor reports, university mode | 5.6 | CSV dry run and import tests; sponsor report shows aggregates only |
| P9 Commerce | Payment providers, coupons, sponsored seats, invoices, manual transfers | 5.7 | Webhook idempotency tests; paid-enrollment E2E on mocks |
| P10a Partner Admin shell and settings | Sidebar, command palette, every Section 6.1 setting | 6.1 | E2E: change settings; audit log entries recorded |
| P10b Theme, navigation, media | Theme editor, navigation editor, media library | 6.2, 7.5 | Theme editor blocks failing contrast; screenshots of three partner themes |
| P10c Page builder | Pages, blocks, live preview, versions, scheduled publish, skill `add-site-block` | 6.2 | E2E: edit, publish, public page updates, roll back |
| P10d Forms, templates, domains | Form builder, email and certificate template editors, custom-domain flow | 6.2, 13 | E2E: build and publish a form; domain verification job tested |
| P11a Super Admin: provisioning | Dashboard, Partner Provisioning Wizard, Become a partner flow | 6.3 | E2E: provision partner number five with no code change |
| P11b Super Admin: governance | Plans, limits, flags, Library, impersonation, system settings, isolation self-test | 6.3 | E2E: impersonate with audit trail; self-test passes and catches a seeded leak |
| P12 Reports | Dashboards, exports, scheduled reports | 5.8 | Metrics match the documented SQL views |
| P13 AI | Study assistant, authoring assistant, metering, kill switch | 5.9 | Tenant-isolated retrieval test; limits enforced |
| P14 Hardening and release | Security review, budgets, accessibility audit, i18n pass, load smoke, restore drill, docs | 10, 12, 13, 16 | All gates green; Lighthouse budgets met; `v1.0.0` tag |

## 16. Definition of done (every feature)

1. Works for every tenant preset, in light and dark, at phone, tablet, and desktop widths.
2. Permission-checked on the server and covered by an authorization test.
3. Tenant-scoped (`tenant_id` plus RLS) and covered by an isolation test wherever it stores data.
4. Loading, empty, error, and offline states designed.
5. Accessible (keyboard, screen reader, contrast, reduced motion) and axe-clean.
6. Strings externalized; dates, numbers, and currency localized.
7. Audit-logged if it changes settings, permissions, money, grades, or publish state.
8. Tested, documented, and recorded in `docs/PROGRESS.md`.
9. Reviewed by the reviewer subagents with no open high or medium findings, with the evidence shown in the session.

## 17. Final deliverables

1. A repository that passes the full quality gate from a clean clone.
2. A local environment with five seeded tenants.
3. Every document listed in Section 14.
4. `docs/PARTNER_ONBOARDING.md`, proven by the P11a E2E test.
5. `docs/HANDOFF.md`: what is done, known gaps, accounts and keys I must supply, expected provider costs, and recommended next steps.
6. The Claude Code environment (`CLAUDE.md`, `.claude/`, `.mcp.json`) committed and documented, so a new contributor can continue the build with `/resume`.
