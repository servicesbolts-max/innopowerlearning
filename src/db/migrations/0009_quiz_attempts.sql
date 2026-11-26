-- 0009_quiz_attempts: recorded quiz attempts (MVP slice M4).
-- Forward-only: never edit after commit.
--
-- Answers are option ids only (Zod-validated jsonb). Scores are computed on the server from the
-- lesson's answer key, which learners never receive.

CREATE TABLE quiz_attempts (
  tenant_id uuid NOT NULL REFERENCES tenants (id),
  id uuid NOT NULL DEFAULT gen_uuid_v7(),
  enrollment_id uuid NOT NULL,
  lesson_id uuid NOT NULL,
  answers jsonb NOT NULL CHECK (jsonb_typeof(answers) = 'object'),
  score integer NOT NULL CHECK (score BETWEEN 0 AND 100),
  passed boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  deleted_at timestamptz,
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, enrollment_id) REFERENCES enrollments (tenant_id, id),
  FOREIGN KEY (tenant_id, lesson_id) REFERENCES lessons (tenant_id, id)
);
CREATE INDEX quiz_attempts_enrollment ON quiz_attempts (tenant_id, enrollment_id, lesson_id);
CREATE TRIGGER quiz_attempts_updated_at BEFORE UPDATE ON quiz_attempts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts FORCE ROW LEVEL SECURITY;
CREATE POLICY quiz_attempts_tenant ON quiz_attempts
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT ON quiz_attempts TO app_user;
