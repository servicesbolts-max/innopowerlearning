# Progress

Current package: **P2 Tenancy and data** (not started). Start it in a fresh session with `/phase P2`.

## Log

- **P0 Foundation and Claude Code setup: done 2026-11-20, tag `wp-P0-done`.** Next.js 16.4, TS 6, Tailwind 4.3, Postgres 17 with RLS roles (`app_login`), checksummed migrations, CI green, hooks and skills. Gate 138 unit, integration 13/13, E2E 6/6.
- **P1 Design system: done 2026-11-20, tag `wp-P1-done`.**
  - Theme engine (`src/lib/theme`):
    - OKLCH and WCAG math. It moves the accent, status and material values until every text pair reaches 4.5:1 and borders reach 3:1, in light and dark.
    - The CSS is rendered on the server and checked against strict patterns.
    - `safeBuildTheme` falls back to the default theme when stored data is invalid.
    - Three demo themes: innopower, emerald, sunset.
  - Tokens: the spec's `--label-secondary` conflict is resolved (light alpha 0.73). A few implied tokens are added. Every deviation is listed in `docs/DESIGN_SYSTEM.md`.
  - Components: 68 exports in `src/design-system`, built on React Aria Components (ADR 0003). They cover 41 of the 45 items in Section 7.4; the command palette, rich-text skin, video skin and certificate preview are deferred.
  - Docs and tooling:
    - Storybook 10 with a theme × scheme matrix and the a11y addon. CI runs `build-storybook`.
    - `/design/[theme]` showcase.
    - Skill `/add-ds-component`.
  - Evidence:
    - Gate: 513 unit tests, including component axe tests and 200 sampled accents.
    - E2E: 34/34, with axe (WCAG 2.2 AA) on 3 themes × light and dark; keyboard tests for the sheet and menu; reflow at 200%; the pinned bar.
    - `build-storybook` passes.
    - Screenshots: 12 acceptance PNGs (3 themes × 390/1280 × light/dark) plus 5 state captures in `docs/screenshots/p1/`.
  - Reviews:
    - Isolation and security: the security review found no defects. The isolation review found 3 issues (global toast queue, root selector, theme fallback), all fixed.
    - a11y/design: 16 findings. All high and medium ones are fixed. The low ones are fixed or documented (radius naming, sheet swipe).
    - Code review: 8 findings, 6 fixed and 2 documented.

## Notes for P2

- Tenant theme: in the root layout, call `safeBuildTheme(tenant.theme)` and `themeToCss(built)`, cached per tenant (`"use cache"` + `cacheTag("tenant:<id>:theme")`). Validate with `tenantThemeSchema` in the save action.
- Mount `<ToastProvider key={tenantId}>` and `<ToastRegion />` in the tenant shell.
- Keep `/design` on the hub host. Reject unknown paths in the proxy: the first request for an unprerendered dynamic param streams with HTTP 200 under Cache Components.
- E2E: another `next dev` often runs in this folder. Use `pnpm build && pnpm start --port 3100`, then `E2E_BASE_URL=http://localhost:3100 pnpm e2e`.
- Claude does not push. The owner runs `git push` after each package.
