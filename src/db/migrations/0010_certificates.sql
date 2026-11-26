-- 0010_certificates: certificates issued on course completion (MVP slice M5).
-- Forward-only: never edit after commit.
--
-- The recipient name and course title are snapshots taken at issue time, so a certificate reads
-- the same later. Verification is public by code on the issuing tenant's host only.

CREATE TABLE certificates (
  tenant_id uuid NOT NULL REFERENCES tenants (id),
  id uuid NOT NULL DEFAULT gen_uuid_v7(),
  enrollment_id uuid NOT NULL,
  course_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES users (id),
  code text NOT NULL CHECK (code ~ '^[A-Z2-7]{12}$'),
  recipient_name text NOT NULL CHECK (length(recipient_name) BETWEEN 1 AND 200),
  course_title text NOT NULL CHECK (length(course_title) BETWEEN 1 AND 160),
  issued_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  deleted_at timestamptz,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, code),
  UNIQUE (tenant_id, enrollment_id),
  FOREIGN KEY (tenant_id, enrollment_id) REFERENCES enrollments (tenant_id, id),
  FOREIGN KEY (tenant_id, course_id) REFERENCES courses (tenant_id, id)
);
CREATE INDEX certificates_user ON certificates (tenant_id, user_id);
CREATE TRIGGER certificates_updated_at BEFORE UPDATE ON certificates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates FORCE ROW LEVEL SECURITY;
CREATE POLICY certificates_tenant ON certificates
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE ON certificates TO app_user;
