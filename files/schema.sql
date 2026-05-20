-- ============================================================
-- DOE Auto — Supabase 스키마
-- Supabase 대시보드 > SQL Editor > 붙여넣기 후 실행
-- ============================================================

-- UUID 확장 (Supabase 기본 활성화되어 있음)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 1. projects ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL, -- Supabase Auth의 user.id와 연동
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
  curvature_pvalue    FLOAT DEFAULT 1.0,
  norm_plot_x         JSONB  DEFAULT '[]',
  norm_plot_y         JSONB  DEFAULT '[]',
  interaction_data    JSONB  DEFAULT '{}',
  residuals           JSONB  DEFAULT '[]',
  fitted_values       JSONB  DEFAULT '[]',
  actual_values       JSONB  DEFAULT '[]',
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
CREATE INDEX IF NOT EXISTS idx_projects_user    ON projects(user_id);

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

-- ── RLS (행 수준 보안) 설정 ──────────────────────────────────
-- 서비스 키를 사용하는 백엔드에서 접근하므로 RLS를 비활성화하거나,
-- 보안을 위해 활성화 후 정책을 설정할 수 있습니다. 
-- 여기서는 기본적으로 활성화하고, 본인 데이터만 접근 가능한 정책을 예시로 둡니다.

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 본인의 프로젝트만 조회/수정/삭제 가능
DROP POLICY IF EXISTS "Users can manage their own projects" ON projects;
CREATE POLICY "Users can manage their own projects" ON projects
  FOR ALL USING (auth.uid() = user_id);

-- 하위 테이블들은 projects와 JOIN하여 권한 확인 (또는 간소화를 위해 DISABLE 선언 가능)
ALTER TABLE factors     DISABLE ROW LEVEL SECURITY;
ALTER TABLE runs        DISABLE ROW LEVEL SECURITY;
ALTER TABLE results     DISABLE ROW LEVEL SECURITY;
ALTER TABLE verify_runs DISABLE ROW LEVEL SECURITY;

-- ── 확인용 조회 ──────────────────────────────────────────────
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
