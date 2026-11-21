# Runbook

## Health

- `GET /api/health` (liveness): 200 while the process is up.
- `GET /api/ready` (readiness): 200 when the database answers, otherwise 503 with `checks.database: "fail"`.

## Database

- Apply migrations: `pnpm db:migrate` (idempotent, advisory-locked, checksum-verified).
- Reset (local development only, refuses other hosts): `pnpm db:reset`.
- A `MigrationChecksumError` means a committed migration was edited: revert it and add a new migration.
- Demo data: `pnpm db:seed` (idempotent; refused in production unless `ALLOW_DEMO_SEED=true`). It prints each tenant's URL.

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
