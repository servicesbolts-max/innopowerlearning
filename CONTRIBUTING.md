# Contributing

- **Branching:** short-lived branches off `main`. CI must pass before merging.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`), enforced by commitlint in the `commit-msg` hook. lint-staged formats and lints staged files on `pre-commit`.
- **Migrations:** forward-only. Never edit a committed migration: add the next numbered file in `src/db/migrations`. Every tenant table needs `tenant_id`, composite foreign keys, forced RLS and an isolation test (`.claude/rules/db.md`).
- **Architecture:** import other modules only through their `index.ts`. UI never imports `src/db`. ESLint enforces both.
- **Done** means the Definition of Done in `docs/MASTER_PROMPT.md` Section 16, with evidence.
- **With Claude Code:** one work package per session (`/phase <id>`), with reviewers run through `/review`. Hooks in `.claude/settings.json` enforce the safety rules. Don't bypass them.
