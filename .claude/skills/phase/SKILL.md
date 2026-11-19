---
name: phase
description: Run one work package end to end (orient, plan, implement, verify, review, close) following Section 1.2 of the master prompt.
argument-hint: <package-id, e.g. P1 or P4a>
disable-model-invocation: true
---

Run work package **$ARGUMENTS**. Do only this package, and never start the next one in this session.

1. **Orient.**
   - Read `docs/PROGRESS.md`.
   - Read the `$ARGUMENTS` row in `docs/PLAN.md`.
   - Read only the spec sections named in its Read column. Grep `docs/MASTER_PROMPT.md` for each heading, then Read just that range. Do not re-read the whole spec.
   - If the gate is red (`pnpm gate`), fix that first.
2. **Plan (plan mode).** Explore with read-only tools. Write a one-page plan:
   - files to add or change
   - tests
   - risks
   - each acceptance check and the evidence it will produce

   Ask at most three questions, and only if the answers change the plan. Wait for approval.

3. **Implement** in vertical slices: schema, then server logic, then UI, then tests, then docs. Keep a task list. After every green slice, commit with a Conventional Commit message. Use the reference skills when one fits: `add-tenant-table`, `add-ds-component`, `add-server-action`, `add-provider`, `add-site-block`. Create a reference skill the first time its package needs it.
4. **Verify with evidence.**
   - Run `pnpm gate` and show the output.
   - Run `pnpm test:integration` and `pnpm e2e` when the package touches data or flows.
   - For every new or changed screen: start the dev server and take screenshots at 390 px and 1280 px, in light and dark. Compare them with spec Section 7, fix the differences, and show the final screenshots.
   - Fix root causes. Never skip tests, loosen assertions, or suppress errors.
5. **Review** with `/review`. Fix every finding that affects correctness, security, tenant isolation, accessibility, or a stated requirement.
6. **Close.**
   - Update `docs/PROGRESS.md` (keep it under 120 lines and collapse older entries to one line each).
   - Tick the box in `docs/PLAN.md`.
   - Record decisions in `docs/ASSUMPTIONS.md`.
   - Commit, then `git tag wp-$ARGUMENTS-done`.
   - Tell the user to run `/clear`, print the exact next command (`/phase <next-id>`), and stop.
