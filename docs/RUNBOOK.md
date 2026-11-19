# Runbook

## Health

- `GET /api/health` (liveness): 200 while the process is up.
- `GET /api/ready` (readiness): 200 when the database answers, otherwise 503 with `checks.database: "fail"`.

## Database

- Apply migrations: `pnpm db:migrate` (idempotent, advisory-locked, checksum-verified).
- Reset (local development only, refuses other hosts): `pnpm db:reset`.
- A `MigrationChecksumError` means a committed migration was edited: revert it and add a new migration.

## Backups and restore drill

To be written in P14 (daily backups, point-in-time recovery, object-storage versioning, drill steps).
