-- 0007_courses: categories, courses, sections and lessons (MVP slice M1).
-- Forward-only: never edit after commit.
--
-- Lesson bodies are a restricted Markdown subset parsed into typed nodes and rendered by React
-- (never stored or rendered as HTML). Videos are YouTube or Vimeo URLs, validated by Zod and
-- turned into embed URLs at render time. Quiz content is Zod-validated jsonb on the lesson.

CREATE TABLE course_categories (
  tenant_id uuid NOT NULL REFERENCES tenants (id),
  id uuid NOT NULL DEFAULT gen_uuid_v7(),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  deleted_at timestamptz,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, name)
);
CREATE TRIGGER course_categories_updated_at BEFORE UPDATE ON course_categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
ALTER TABLE course_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_categories FORCE ROW LEVEL SECURITY;
CREATE POLICY course_categories_tenant ON course_categories
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON course_categories TO app_user;

CREATE TABLE courses (
  tenant_id uuid NOT NULL REFERENCES tenants (id),
  id uuid NOT NULL DEFAULT gen_uuid_v7(),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$'),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
  summary text NOT NULL DEFAULT '' CHECK (length(summary) <= 1000),
  category_id uuid,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  enrollment_mode text NOT NULL DEFAULT 'open' CHECK (enrollment_mode IN ('open', 'invite_only')),
  owner_id uuid REFERENCES users (id),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  deleted_at timestamptz,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, slug),
  FOREIGN KEY (tenant_id, category_id) REFERENCES course_categories (tenant_id, id)
);
CREATE INDEX courses_category ON courses (tenant_id, category_id);
CREATE INDEX courses_status ON courses (tenant_id, status);
CREATE TRIGGER courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses FORCE ROW LEVEL SECURITY;
CREATE POLICY courses_tenant ON courses
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON courses TO app_user;

CREATE TABLE course_sections (
  tenant_id uuid NOT NULL REFERENCES tenants (id),
  id uuid NOT NULL DEFAULT gen_uuid_v7(),
  course_id uuid NOT NULL,
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  deleted_at timestamptz,
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, course_id) REFERENCES courses (tenant_id, id)
);
CREATE INDEX course_sections_course ON course_sections (tenant_id, course_id, position);
CREATE TRIGGER course_sections_updated_at BEFORE UPDATE ON course_sections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
ALTER TABLE course_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_sections FORCE ROW LEVEL SECURITY;
CREATE POLICY course_sections_tenant ON course_sections
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON course_sections TO app_user;

CREATE TABLE lessons (
  tenant_id uuid NOT NULL REFERENCES tenants (id),
  id uuid NOT NULL DEFAULT gen_uuid_v7(),
  course_id uuid NOT NULL,
  section_id uuid NOT NULL,
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
  kind text NOT NULL DEFAULT 'content' CHECK (kind IN ('content', 'quiz')),
  body text NOT NULL DEFAULT '' CHECK (length(body) <= 50000),
  video_url text CHECK (length(video_url) <= 500),
  pdf_url text CHECK (length(pdf_url) <= 500),
  quiz jsonb CHECK (quiz IS NULL OR jsonb_typeof(quiz) = 'object'),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  deleted_at timestamptz,
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, course_id) REFERENCES courses (tenant_id, id),
  FOREIGN KEY (tenant_id, section_id) REFERENCES course_sections (tenant_id, id)
);
CREATE INDEX lessons_section ON lessons (tenant_id, section_id, position);
CREATE INDEX lessons_course ON lessons (tenant_id, course_id);
CREATE TRIGGER lessons_updated_at BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons FORCE ROW LEVEL SECURITY;
CREATE POLICY lessons_tenant ON lessons
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON lessons TO app_user;
