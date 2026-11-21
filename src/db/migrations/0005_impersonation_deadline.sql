-- 0005_impersonation_deadline: a hard end for impersonation sessions (Section 6.3: time-limited).
-- Forward-only: never edit after commit.
--
-- Better Auth extends sessions.expires_at when a session is used, so it cannot carry the
-- impersonation limit. The deadline lives in its own column, checked on every request.

ALTER TABLE sessions
  ADD COLUMN impersonation_expires_at timestamptz,
  ADD CONSTRAINT sessions_impersonation_deadline
    CHECK ((impersonated_by IS NULL) = (impersonation_expires_at IS NULL));
