---
name: resume
description: Resume the build after an interrupted session by reading PROGRESS and PLAN, fixing the gate, and continuing the earliest unfinished package.
disable-model-invocation: true
---

1. Read `docs/PROGRESS.md` and `docs/PLAN.md`. Run `git status` and `git log --oneline -n 10` to see uncommitted or partial work.
2. Run `pnpm gate`. If anything is red, fix it first (root causes only) and commit.
3. Find the earliest package in `docs/PLAN.md` whose box is unticked. Continue it by following the `/phase` loop (`.claude/skills/phase/SKILL.md`) from the step PROGRESS says was reached. If PROGRESS is unclear, re-plan the remaining work in plan mode.
4. When that package is closed (tagged, PROGRESS updated), tell the user to run `/clear`, print the exact next command, and stop.
