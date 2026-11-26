-- 0008_enrollments: enrollments and lesson progress (MVP slices M2 and M3).
-- Forward-only: never edit after commit.

CREATE TABLE enrollments (
  tenant_id uuid NOT NULL REFERENCES tenants (id),
  id uuid NOT NULL DEFAULT gen_uuid_v7(),
  course_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES users (id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  last_lesson_id uuid,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  deleted_at timestamptz,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, course_id, user_id),
  FOREIGN KEY (tenant_id, course_id) REFERENCES courses (tenant_id, id),
  FOREIGN KEY (tenant_id, last_lesson_id) REFERENCES lessons (tenant_id, id)
);
CREATE INDEX enrollments_user ON enrollments (tenant_id, user_id);
CREATE TRIGGER enrollments_updated_at BEFORE UPDATE ON enrollments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments FORCE ROW LEVEL SECURITY;
CREATE POLICY enrollments_tenant ON enrollments
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON enrollments TO app_user;

CREATE TABLE lesson_progress (
  tenant_id uuid NOT NULL REFERENCES tenants (id),
  id uuid NOT NULL DEFAULT gen_uuid_v7(),
  enrollment_id uuid NOT NULL,
  lesson_id uuid NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  deleted_at timestamptz,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, enrollment_id, lesson_id),
  FOREIGN KEY (tenant_id, enrollment_id) REFERENCES enrollments (tenant_id, id),
  FOREIGN KEY (tenant_id, lesson_id) REFERENCES lessons (tenant_id, id)
);
CREATE TRIGGER lesson_progress_updated_at BEFORE UPDATE ON lesson_progress
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress FORCE ROW LEVEL SECURITY;
CREATE POLICY lesson_progress_tenant ON lesson_progress
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON lesson_progress TO app_user;
