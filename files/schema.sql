-- ============================================================
-- DOE Auto — Supabase 스키마
-- Supabase 대시보드 > SQL Editor > 붙여넣기 후 실행
-- ============================================================

-- UUID 확장 (Supabase 기본 활성화되어 있음)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 1. projects ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  industry    TEXT        NOT NULL DEFAULT '사출성형',
  status      TEXT        NOT NULL DEFAULT 'in_progress',
  -- in_progress | completed
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. factors ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS factors (
  id          UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID  NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  key         TEXT  NOT NULL,
  name        TEXT  NOT NULL,
  min         FLOAT NOT NULL,
  max         FLOAT NOT NULL,
  unit        TEXT  NOT NULL DEFAULT '',
  sort_order  INT   NOT NULL DEFAULT 0
);

-- ── 3. runs ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS runs (
  id             UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID  NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  run_order      INT   NOT NULL,
  factor_values  JSONB NOT NULL DEFAULT '{}',
  yield_val      FLOAT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 4. results ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS results (
  id                  UUID   PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID   UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  r_squared           FLOAT,
  intercept           FLOAT,
  params_raw          JSONB  DEFAULT '{}',
  tvalues             JSONB  DEFAULT '{}',
  pvalues             JSONB  DEFAULT '{}',
  factor_keys         JSONB  DEFAULT '[]',
  factor_names        JSONB  DEFAULT '{}',
  golden_solution     JSONB  DEFAULT '{}',
  optimal_yield_pred  FLOAT,
  current_avg_yield   FLOAT,
  yield_gain          FLOAT,
  roi_amount          BIGINT,
  ai_diagnosis        TEXT,
  norm_plot_x         JSONB  DEFAULT '[]',
  norm_plot_y         JSONB  DEFAULT '[]',
  interaction_data    JSONB  DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 5. verify_runs ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS verify_runs (
  id          UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID  NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  run_order   INT   NOT NULL,
  yield_val   FLOAT
);

-- ── 인덱스 ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_factors_project  ON factors(project_id);
CREATE INDEX IF NOT EXISTS idx_runs_project     ON runs(project_id, run_order);
CREATE INDEX IF NOT EXISTS idx_verify_project   ON verify_runs(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_created ON projects(created_at DESC);

-- ── updated_at 자동 갱신 트리거 ──────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_projects_updated ON projects;
CREATE TRIGGER trg_projects_updated
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS 비활성화 (서버사이드 service key 사용, 프론트 직접 접근 없음) ──
ALTER TABLE projects    DISABLE ROW LEVEL SECURITY;
ALTER TABLE factors     DISABLE ROW LEVEL SECURITY;
ALTER TABLE runs        DISABLE ROW LEVEL SECURITY;
ALTER TABLE results     DISABLE ROW LEVEL SECURITY;
ALTER TABLE verify_runs DISABLE ROW LEVEL SECURITY;

-- ── 확인용 조회 ──────────────────────────────────────────────
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
