---
name: gate
description: Run the quality gate (lint, typecheck, unit tests, build) and summarize any failures with their root causes.
disable-model-invocation: true
---

Run `pnpm gate` and show the tail of its output. Also run `pnpm test:integration` when Postgres is reachable (`/api/ready` or `docker compose ps`).

If anything fails:

1. Group the failures by step (lint, typecheck, test, build, integration).
2. For each group, give the root cause in one line, with the `file:line`.
3. Propose the fix. Never propose skipping a test, loosening an assertion, adding `eslint-disable`, or using `@ts-ignore` unless the cause really is a tool bug, and then record why in `docs/ASSUMPTIONS.md`.

End with one line: `GATE: PASS` or `GATE: FAIL (<n> issues)`.
