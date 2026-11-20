# ADR 0002: Local object storage is RustFS instead of MinIO

- Status: accepted
- Date: 2026-11-20

## Context

Section 2 of `docs/MASTER_PROMPT.md` names MinIO for local S3-compatible storage. On 2026-11-20, `docker compose up -d` failed: `minio/minio` returns "pull access denied" on Docker Hub, and `quay.io/minio/minio` and `minio/mc` are also unavailable. A clean clone must start with one `docker compose up -d`.

## Decision

Run RustFS 1.0.6 (`rustfs/rustfs`, Apache-2.0, S3-compatible) as the `storage` service. It uses the same ports (API 9000, console 9001) and the same access-key and secret-key login. A one-shot `storage-init` service (`amazon/aws-cli`) creates the `innopower-dev` bucket idempotently. Both images are pinned by digest.

Verified locally: the health check returns 200; anonymous requests get 403; a wrong secret is rejected (`SignatureDoesNotMatch`); the correct keys create and list the bucket; and re-running the init is a no-op.

## Consequences

- The application only uses the S3 API through `S3_ENDPOINT`, `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY`, so nothing in the app depends on RustFS. Production storage stays Cloudflare R2.
- If RustFS proves unsuitable, SeaweedFS (`chrislusf/seaweedfs`) is the fallback; it was also pullable on 2026-11-20.
- P4b's storage contract tests should run against this service.
