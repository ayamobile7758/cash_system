ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS chk_notification_type;

ALTER TABLE notifications
  ADD CONSTRAINT chk_notification_type CHECK (
    type IN (
      'debt_limit_exceeded',
      'large_discount',
      'retroactive_edit',
      'reconciliation_difference',
      'low_stock',
      'invoice_cancelled',
      'daily_snapshot',
      'debt_due_reminder',
      'debt_overdue',
      'maintenance_ready',
      'portability_event'
    )
  );

CREATE TABLE IF NOT EXISTS export_packages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_type  VARCHAR(10)  NOT NULL,
  scope         VARCHAR(30)  NOT NULL,
  status        VARCHAR(20)  NOT NULL DEFAULT 'ready',
  filters       JSONB        NOT NULL DEFAULT '{}'::jsonb,
  file_name     VARCHAR(200) NOT NULL,
  row_count     INTEGER      NOT NULL DEFAULT 0,
  content_json  JSONB,
  content_text  TEXT         NOT NULL,
  expires_at    TIMESTAMPTZ  NOT NULL,
  revoked_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  created_by    UUID         NOT NULL REFERENCES profiles(id),
  CONSTRAINT chk_export_packages_type CHECK (package_type IN ('json', 'csv')),
  CONSTRAINT chk_export_packages_scope CHECK (scope IN ('products', 'reports', 'customers', 'backup')),
  CONSTRAINT chk_export_packages_status CHECK (status IN ('ready', 'revoked', 'expired')),
  CONSTRAINT chk_export_packages_row_count CHECK (row_count >= 0),
  CONSTRAINT chk_export_packages_backup_json CHECK (scope <> 'backup' OR package_type = 'json')
);

CREATE INDEX IF NOT EXISTS idx_export_packages_scope_created
  ON export_packages(scope, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_export_packages_status_expires
  ON export_packages(status, expires_at);

DROP TRIGGER IF EXISTS trg_export_packages_updated_at ON export_packages;
CREATE TRIGGER trg_export_packages_updated_at
  BEFORE UPDATE ON export_packages
  FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

ALTER TABLE export_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS export_packages_no_select ON export_packages;
CREATE POLICY export_packages_no_select
ON export_packages FOR SELECT TO authenticated, anon USING (false);

DROP POLICY IF EXISTS export_packages_no_insert ON export_packages;
CREATE POLICY export_packages_no_insert
ON export_packages FOR INSERT TO authenticated, anon WITH CHECK (false);

DROP POLICY IF EXISTS export_packages_no_update ON export_packages;
CREATE POLICY export_packages_no_update
ON export_packages FOR UPDATE TO authenticated, anon USING (false);

DROP POLICY IF EXISTS export_packages_no_delete ON export_packages;
CREATE POLICY export_packages_no_delete
ON export_packages FOR DELETE TO authenticated, anon USING (false);

REVOKE ALL ON TABLE export_packages FROM PUBLIC, authenticated, anon;

CREATE TABLE IF NOT EXISTS import_jobs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name         VARCHAR(200) NOT NULL,
  source_format     VARCHAR(10)  NOT NULL,
  status            VARCHAR(30)  NOT NULL,
  rows_total        INTEGER      NOT NULL DEFAULT 0,
  rows_valid        INTEGER      NOT NULL DEFAULT 0,
  rows_invalid      INTEGER      NOT NULL DEFAULT 0,
  rows_committed    INTEGER      NOT NULL DEFAULT 0,
  source_rows       JSONB        NOT NULL DEFAULT '[]'::jsonb,
  validation_errors JSONB        NOT NULL DEFAULT '[]'::jsonb,
  committed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  created_by        UUID         NOT NULL REFERENCES profiles(id),
  CONSTRAINT chk_import_jobs_source_format CHECK (source_format IN ('json', 'csv')),
  CONSTRAINT chk_import_jobs_status CHECK (status IN ('dry_run_ready', 'dry_run_failed', 'committed')),
  CONSTRAINT chk_import_jobs_counts CHECK (
    rows_total >= 0 AND rows_valid >= 0 AND rows_invalid >= 0 AND rows_committed >= 0
  )
);

CREATE INDEX IF NOT EXISTS idx_import_jobs_status_created
  ON import_jobs(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_import_jobs_created_by
  ON import_jobs(created_by, created_at DESC);

DROP TRIGGER IF EXISTS trg_import_jobs_updated_at ON import_jobs;
CREATE TRIGGER trg_import_jobs_updated_at
  BEFORE UPDATE ON import_jobs
  FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS import_jobs_no_select ON import_jobs;
CREATE POLICY import_jobs_no_select
ON import_jobs FOR SELECT TO authenticated, anon USING (false);

DROP POLICY IF EXISTS import_jobs_no_insert ON import_jobs;
CREATE POLICY import_jobs_no_insert
ON import_jobs FOR INSERT TO authenticated, anon WITH CHECK (false);

DROP POLICY IF EXISTS import_jobs_no_update ON import_jobs;
CREATE POLICY import_jobs_no_update
ON import_jobs FOR UPDATE TO authenticated, anon USING (false);

DROP POLICY IF EXISTS import_jobs_no_delete ON import_jobs;
CREATE POLICY import_jobs_no_delete
ON import_jobs FOR DELETE TO authenticated, anon USING (false);

REVOKE ALL ON TABLE import_jobs FROM PUBLIC, authenticated, anon;

CREATE TABLE IF NOT EXISTS restore_drills (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  export_package_id UUID         NOT NULL REFERENCES export_packages(id) ON DELETE RESTRICT,
  target_env        VARCHAR(30)  NOT NULL,
  status            VARCHAR(20)  NOT NULL DEFAULT 'started',
  idempotency_key   UUID         NOT NULL UNIQUE,
  drift_count       INTEGER,
  rto_seconds       INTEGER,
  result_summary    JSONB,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  created_by        UUID         NOT NULL REFERENCES profiles(id),
  CONSTRAINT chk_restore_drills_target_env CHECK (target_env IN ('isolated-drill')),
  CONSTRAINT chk_restore_drills_status CHECK (status IN ('started', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_restore_drills_created
  ON restore_drills(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_restore_drills_package
  ON restore_drills(export_package_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_restore_drills_updated_at ON restore_drills;
CREATE TRIGGER trg_restore_drills_updated_at
  BEFORE UPDATE ON restore_drills
  FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

ALTER TABLE restore_drills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS restore_drills_no_select ON restore_drills;
CREATE POLICY restore_drills_no_select
ON restore_drills FOR SELECT TO authenticated, anon USING (false);

DROP POLICY IF EXISTS restore_drills_no_insert ON restore_drills;
CREATE POLICY restore_drills_no_insert
ON restore_drills FOR INSERT TO authenticated, anon WITH CHECK (false);

DROP POLICY IF EXISTS restore_drills_no_update ON restore_drills;
CREATE POLICY restore_drills_no_update
ON restore_drills FOR UPDATE TO authenticated, anon USING (false);

DROP POLICY IF EXISTS restore_drills_no_delete ON restore_drills;
CREATE POLICY restore_drills_no_delete
ON restore_drills FOR DELETE TO authenticated, anon USING (false);

REVOKE ALL ON TABLE restore_drills FROM PUBLIC, authenticated, anon;
