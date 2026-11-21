# Runbook

## Health

- `GET /api/health` (liveness): 200 while the process is up.
- `GET /api/ready` (readiness): 200 when the database answers, otherwise 503 with `checks.database: "fail"`.

## Database

- Apply migrations: `pnpm db:migrate` (idempotent, advisory-locked, checksum-verified).
- Reset (local development only, refuses other hosts): `pnpm db:reset`.
- A `MigrationChecksumError` means a committed migration was edited: revert it and add a new migration.
- Demo data: `pnpm db:seed` (idempotent; refused in production unless `ALLOW_DEMO_SEED=true`). It prints each tenant's URL.

## Accounts and sign-in (local)

- `pnpm db:seed` creates demo accounts and prints their passwords once: `owner@demo.test` (platform owner, Hub), and `admin.`, `instructor.` and `learner.<slug>@demo.test` for each partner, plus `sponsor.lsetf@demo.test`. `pnpm db:seed --rotate-demo-passwords` prints new ones.
- Admins must set up two-step verification on first sign-in (`/account/security`). Any authenticator app works.
- Emails (magic links, invitations) go to Mailpit: http://localhost:8025.
- `next start` (production mode) needs `BETTER_AUTH_SECRET` (32+ characters) in the environment; `pnpm dev` warns and uses a development default. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
- Passkeys need a registrable root domain: browsers refuse `localhost` for `*.localhost` pages. Use `ROOT_DOMAIN=lvh.me:3000` to try them locally.
- Behind a proxy or CDN, set `AUTH_IP_HEADER` to the client-IP header it overwrites (`cf-connecting-ip`, `x-real-ip`), or rate limits can be dodged.
- E2E: `ROOT_DOMAIN=localhost:3100 pnpm build`, start on port 3100 with the same `ROOT_DOMAIN` and a `BETTER_AUTH_SECRET`, keep Mailpit running, then `E2E_BASE_URL=http://localhost:3100 pnpm e2e`.

## Tenant hosts (local)

- The Hub is `http://localhost:3000`. Tenants are `http://{slug}.localhost:3000`: `lsetf`, `wapsea`, `gods-entrepreneurs` and `wvstu`. Chrome, Edge and Firefox resolve `*.localhost` to loopback without any setup.
- If a tool or browser does not resolve `*.localhost`, set `ROOT_DOMAIN=lvh.me:3000` and use `http://{slug}.lvh.me:3000` (public DNS that points at 127.0.0.1).
- Host matching ignores the port, so a production server on `:3100` serves `lsetf.localhost:3100` unchanged. Hub links to tenants use `ROOT_DOMAIN` as written, so set it to the serving host and port (`localhost:3100`) before building if you will click through.
- Production servers refuse to start without an explicit `APP_ENV` (`development`, `preview`, `staging` or `production`). Set it in the deployment, not only in `.env`.
- Without subdomains, `http://localhost:3000/t/{slug}` serves a tenant while `APP_ENV` is `development` or `preview`. Links inside it point back to the Hub.
- Unknown hosts, suspended tenants and `console.` (until P11) answer 404. A tenant change can take up to 30 s to reach the proxy (host cache).
- After moving or renaming a route, `tsc` can fail on stale `.next/dev/types`. Start `pnpm dev` once to regenerate them.

## Backups and restore drill

To be written in P14 (daily backups, point-in-time recovery, object-storage versioning, drill steps).
