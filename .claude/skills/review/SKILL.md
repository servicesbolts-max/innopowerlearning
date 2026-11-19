---
name: review
description: Run the reviewer subagents in parallel on the current diff and triage their findings.
argument-hint: "[base ref, default: last wp-*-done tag]"
disable-model-invocation: true
---

1. Find the diff base: `$ARGUMENTS` if given, otherwise the latest `wp-*-done` tag (`git tag --list "wp-*-done" --sort=-creatordate`), otherwise the root commit. Collect `git diff --stat <base>` and the list of changed files.
2. In one message, launch these subagents in parallel, giving each the base ref and the changed files:
   - `tenant-isolation-auditor` (always)
   - `security-reviewer`, when the diff touches auth, files, payments, webhooks, AI, admin, `src/app/api`, or server actions
   - `a11y-design-reviewer`, when the diff touches UI (`src/app`, `src/design-system`)
3. Also run the bundled `/code-review` on the same diff.
4. Triage into a table: finding, file:line, severity (high/medium/low), fix or ignore with a reason.
   - Fix everything that affects correctness, security, tenant isolation, accessibility, or a stated requirement.
   - Ignore style-only findings and speculative abstractions.
5. Apply the fixes, re-run `pnpm gate`, and report: `REVIEW: <n> fixed, <m> ignored, 0 open high/medium`.
