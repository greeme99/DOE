try:
    from dotenv import load_dotenv; load_dotenv()
except ImportError:
    pass
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
import itertools, random, os
import pandas as pd
import numpy as np
import statsmodels.api as sm
from scipy import stats

app = FastAPI(title="DOE Auto API", version="2.0")
auth_scheme = HTTPBearer()

def _require_db():
    if sb is None:
        raise HTTPException(status_code=503, detail="Database not configured")

async def get_current_user(token: HTTPAuthorizationCredentials = Depends(auth_scheme)):
    _require_db()
    try:
        user_res = sb.auth.get_user(token.credentials)
        if not user_res.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_res.user
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Auth error: {str(e)}")

# ─── CORS (보안 강화를 위해 특정 오리진만 허용) ─────────────────────────────
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Supabase 클라이언트 (env 없으면 None — 기존 API는 그대로 동작) ──────────
_sb_url = os.getenv("SUPABASE_URL", "")
_sb_key = os.getenv("SUPABASE_SERVICE_KEY", "")
sb = None
if _sb_url and _sb_key:
    try:
        from supabase import create_client
        sb = create_client(_sb_url, _sb_key)
        print(f"[Supabase] connected → {_sb_url[:40]}...")
    except Exception as e:
        print(f"[Supabase] 연결 실패 (supabase 패키지 설치 여부 확인): {e}")
else:
    print("[Supabase] 환경변수 없음 — DB 기능 비활성화 (로컬 모드)")

# ─── Pydantic Models (Strict Validation) ──────────────────────────────────────

class FactorItem(BaseModel):
    key: str
    name: str
    min: float
    max: float
    unit: str

class FactorsRequest(BaseModel):
    factors: List[FactorItem]

class RunItem(BaseModel):
    id: Optional[int] = None
    runOrder: int
    factor_values: Dict[str, float]
    yieldVal: Any # Empty string or float

class AnalyzeRequest(BaseModel):
    runs: List[RunItem]
    factors: List[FactorItem]

class AnalysisResultModel(BaseModel):
    r_squared: float
    intercept: float
    params_raw: Dict[str, float]
    tvalues: Dict[str, float]
    pvalues: Dict[str, float]
    factor_keys: List[str]
    factor_names: Dict[str, str]
    golden_solution: Dict[str, float]
    optimal_yield_pred: float
    current_avg_yield: float
    yield_gain: float
    roi_amount: int
    ai_diagnosis: str
    norm_plot_x: List[float]
    norm_plot_y: List[float]
    interaction_data: Dict[str, Any]

class VerifyRunItem(BaseModel):
    id: int
    yieldVal: Any # Empty string or float

class ProjectSaveRequest(BaseModel):
    name: str
    industry: str = "사출성형"
    factors: List[FactorItem] = []
    runs: List[RunItem] = []
    analysis_result: Optional[AnalysisResultModel] = None
    verify_runs: List[VerifyRunItem] = []

class ProjectUpdateRequest(ProjectSaveRequest):
    status: str = "completed"

# ─── ROI Constants ────────────────────────────────────────────────────────────
ROI_BASE_REVENUE = 5_000_000_000  # 50억 (기본값)
ROI_IMPROVEMENT_RATIO = 0.05      # 5% (기본값)

# ─── Design generation ────────────────────────────────────────────────────────

def get_design_matrix(k: int):
    if k == 2:
        return list(itertools.product([-1, 1], repeat=2)), 2, 4   # 12 runs
    elif k == 3:
        return list(itertools.product([-1, 1], repeat=3)), 2, 4   # 20 runs
    elif k == 4:
        return list(itertools.product([-1, 1], repeat=4)), 1, 6   # 22 runs
    else:  # k=5: 2^(5-1) half-fraction Resolution V
        full4 = list(itertools.product([-1, 1], repeat=4))
        corners = [r + (r[0]*r[1]*r[2]*r[3],) for r in full4]
        return corners, 1, 6                                        # 22 runs

@app.post("/api/design/generate")
def generate_design(req: FactorsRequest):
    k = len(req.factors)
    if k < 2 or k > 5:
        return {"error": "인자 수는 2~5개여야 합니다."}

    corners, replicates, n_center = get_design_matrix(k)
    matrix = [c for _ in range(replicates) for c in corners]
    matrix += [tuple([0]*k) for _ in range(n_center)]
    random.shuffle(matrix)

    runs = []
    for idx, coded in enumerate(matrix):
        fv = {}
        for fi, f in enumerate(req.factors):
            c = coded[fi]
            fv[f.key] = round(
                f.min if c == -1 else f.max if c == 1 else (f.min + f.max) / 2, 4
            )
        runs.append({"id": idx+1, "runOrder": idx+1, "factor_values": fv, "yieldVal": ""})

    return {"runs": runs, "run_count": len(runs), "k": k}

# ─── AI Diagnosis ─────────────────────────────────────────────────────────────

def gen_diagnosis(tvalues, pvalues, params, yield_gain, opt_yield, cur_avg, name_map):
    main_keys = [k for k in tvalues if '*' not in k]
    if not main_keys:
        return "분석 결과가 부족합니다. 데이터를 확인해주세요."
    top       = max(main_keys, key=lambda k: abs(tvalues.get(k, 0)))
    t_abs     = abs(tvalues[top])
    p_val     = pvalues.get(top, 1.0)
    p_str     = "p<0.001" if p_val < 0.001 else f"p={p_val:.3f}"
    direction = "높이면" if params.get(top, 0) > 0 else "낮추면"
    top_name  = name_map.get(top, top)
    inter_sig = [k for k, p in pvalues.items() if '*' in k and p < 0.05]
    sig_main  = [k for k in main_keys if pvalues.get(k, 1.0) < 0.05]
    sig_quad  = [k for k, p in pvalues.items() if '^2' in k and p < 0.05]

    parts = [
        f"{top_name}(t={t_abs:.1f}, {p_str})이(가) 수율에 가장 큰 영향 — {direction} 수율↑.",
        f"최적 조건 적용 시 {cur_avg:.1f}% → {opt_yield:.1f}%(+{yield_gain:.1f}%p) 달성 예상."
    ]
    if inter_sig:
        names = [' × '.join(name_map.get(p, p) for p in k.split('*')) for k in inter_sig]
        parts.append(f"교호작용({', '.join(names)}) 유의 — 단순 선형 모델로는 한계.")
    if sig_quad:
        q_names = [name_map.get(k.replace('^2',''), k.replace('^2','')) for k in sig_quad]
        parts.append(f"곡선 관계(Curvature, {', '.join(q_names)}) 감지 — 중심점 부근에서 극대/극소점 존재 가능성.")
    if not sig_main:
        parts.append("유의 주효과 없음 — 실험 범위·측정 정밀도 재검토 권장.")
    return " | ".join(parts)

# ─── Analysis ────────────────────────────────────────────────────────────────

@app.post("/api/analyze")
def analyze_data(req: AnalyzeRequest):
    fkeys  = [f.key  for f in req.factors]
    fnames = {f.key: f.name for f in req.factors}

    records = [{**{k: r.factor_values.get(k, 0.0) for k in fkeys}, "yieldVal": r.yieldVal}
               for r in req.runs]
    df = pd.DataFrame(records)

    def scale(col):
        lo, hi = col.min(), col.max()
        return col * 0 if lo == hi else -1 + 2*(col - lo)/(hi - lo)

    coded = pd.DataFrame({k: scale(df[k]) for k in fkeys})

    # 주효과 + 2-way 교호작용 + 제곱항(Quadratic) 컬럼 생성
    effect_cols = list(fkeys)
    # 제곱항 추가 (RSM)
    for k in fkeys:
        nm_sq = f"{k}^2"
        coded[nm_sq] = coded[k] ** 2
        effect_cols.append(nm_sq)

    # 교호작용 추가
    for i, ki in enumerate(fkeys):
        for j, kj in enumerate(fkeys):
            if j > i:
                nm = f"{ki}*{kj}"
                coded[nm] = coded[ki] * coded[kj]
                effect_cols.append(nm)

    X = sm.add_constant(coded[effect_cols])
    Y = df["yieldVal"]
    model = sm.OLS(Y, X).fit()

    tvalues, pvalues, params = {}, {}, {}
    for i, col in enumerate(effect_cols):
        tv = model.tvalues.iloc[i+1]
        if not np.isnan(tv):
            tvalues[col] = round(float(tv), 4)
            pvalues[col] = round(float(model.pvalues.iloc[i+1]), 4)
            params[col]  = round(float(model.params.iloc[i+1]), 4)

    r_sq      = float(model.rsquared) if not np.isnan(model.rsquared) else 0.0
    intercept = float(model.params.iloc[0]) if not np.isnan(model.params.iloc[0]) else 0.0

    # Golden solution (RSM에서는 단순 부호 판별이 아니라 최적점 탐색이 필요하지만, 여기선 기본 구현 유지 후 프론트에서 시뮬레이션 지원)
    golden = {k: (1 if params.get(k, 0) > 0 else -1) for k in fkeys}

    def predict_coded(cv):
        pred = intercept
        # 주효과
        for k in fkeys:
            pred += params.get(k, 0) * cv.get(k, 0)
        # 제곱항
        for k in fkeys:
            pred += params.get(f"{k}^2", 0) * (cv.get(k, 0) ** 2)
        # 교호작용
        for i, ki in enumerate(fkeys):
            for j, kj in enumerate(fkeys):
                if j > i:
                    pred += params.get(f"{ki}*{kj}", 0) * cv.get(ki, 0) * cv.get(kj, 0)
        return pred

    opt_yield  = predict_coded(golden)
    cur_avg    = float(df["yieldVal"].mean())
    yield_gain = max(0.0, opt_yield - cur_avg)
    roi_amount = int(ROI_BASE_REVENUE * ROI_IMPROVEMENT_RATIO * (yield_gain / 100))

    # Normal probability plot
    resids = sorted(model.resid.tolist())
    n      = len(resids)
    norm_x = [round(float(stats.norm.ppf((i+0.5)/n)), 4) for i in range(n)]

    # Interaction plot (첫 두 인자)
    interact = {}
    if len(fkeys) >= 2:
        k0, k1 = fkeys[0], fkeys[1]
        def pi(c0, c1):
            cv = {k: 0 for k in fkeys}; cv[k0], cv[k1] = c0, c1
            return round(predict_coded(cv), 4)
        interact = {
            "x1_coded": [-1, 1],
            "y_b_low":  [pi(-1,-1), pi(1,-1)],
            "y_b_high": [pi(-1, 1), pi(1, 1)],
            "factor_x": fnames.get(k0, k0),
            "factor_b": fnames.get(k1, k1),
        }

    # 한글 표시명 변환
    def disp(col):
        if '^2' in col:
            base = col.replace('^2', '')
            return f"{fnames.get(base, base)}²"
        if '*' in col:
            return ' × '.join(fnames.get(p, p) for p in col.split('*'))
        return fnames.get(col, col)

    ai_diag = gen_diagnosis(
        tvalues, pvalues, params,
        round(yield_gain, 2), round(opt_yield, 2), round(cur_avg, 2), fnames
    )

    return {
        "r_squared":          round(r_sq, 4),
        "intercept":          round(intercept, 4),
        "tvalues":            {disp(k): v for k, v in tvalues.items()},
        "tvalues_raw":        tvalues,
        "pvalues":            {disp(k): v for k, v in pvalues.items()},
        "params":             {disp(k): v for k, v in params.items()},
        "params_raw":         params,
        "factor_keys":        fkeys,
        "factor_names":       fnames,
        "golden_solution":    golden,
        "norm_plot_x":        norm_x,
        "norm_plot_y":        [round(r, 4) for r in resids],
        "interaction_data":   interact,
        "optimal_yield_pred": round(opt_yield, 2),
        "current_avg_yield":  round(cur_avg, 2),
        "yield_gain":         round(yield_gain, 2),
        "roi_amount":         roi_amount,
        "ai_diagnosis":       ai_diag,
        # 진단용 차트 데이터 추가
        "residuals":          [round(float(r), 4) for r in model.resid.tolist()],
        "fitted_values":      [round(float(v), 4) for v in model.fittedvalues.tolist()],
        "actual_values":      [round(float(v), 4) for v in Y.tolist()],
        "std_residuals":      [round(float(r), 4) for r in (model.resid / (np.std(model.resid) or 1.0)).tolist()]
    }

# ─── API Endpoints — Project CRUD ────────────────────────────────────────────

# ─── POST /api/projects — 새 프로젝트 저장 ───────────────────────────────────

@app.post("/api/projects")
async def save_project(
    req: ProjectSaveRequest, 
    token: HTTPAuthorizationCredentials = Depends(auth_scheme),
    user: dict = Depends(get_current_user)
):
    _require_db()
    # 사용자의 토큰을 DB 클라이언트에 연동하여 RLS 통과
    sb.postgrest.auth(token.credentials)
    
    try:
        # 1. Project 저장
        proj_data = {
            "name": req.name,
            "industry": req.industry,
            "status": "completed",
            "user_id": user.id
        }
        res = sb.table("projects").insert(proj_data).execute()
        project_id = res.data[0]["id"]

        # 2. factors 저장
        if req.factors:
            fac_rows = [
                {"project_id": project_id, "key": f.key, "name": f.name,
                 "min": f.min, "max": f.max,
                 "unit": f.unit, "sort_order": i}
                for i, f in enumerate(req.factors)
            ]
            sb.table("factors").insert(fac_rows).execute()

        # 3. runs 저장
        if req.runs:
            run_rows = [
                {"project_id": project_id, "run_order": r.runOrder,
                 "factor_values": r.factor_values,
                 "yield_val": float(r.yieldVal) if r.yieldVal not in ("", None) else None}
                for i, r in enumerate(req.runs)
            ]
            sb.table("runs").insert(run_rows).execute()

        # 4. analysis_result 저장
        if req.analysis_result:
            ar_data = req.analysis_result.dict()
            sb.table("results").upsert({
                "project_id": project_id,
                **ar_data
            }).execute()

        # 5. verify_runs 저장
        if req.verify_runs:
            vr_rows = [
                {"project_id": project_id, "run_order": v.id,
                 "yield_val": float(v.yieldVal) if v.yieldVal not in ("", None) else None}
                for v in req.verify_runs
            ]
            sb.table("verify_runs").insert(vr_rows).execute()

        return {"id": project_id, "message": "프로젝트 저장 완료"}

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"SAVE ERROR DETAIL:\n{error_detail}")
        raise HTTPException(status_code=500, detail=f"Database save error: {str(e)}")


# ─── PUT /api/projects/{id} — 기존 프로젝트 업데이트 ─────────────────────────

@app.put("/api/projects/{id}")
async def update_project(
    id: int, 
    req: ProjectUpdateRequest, 
    token: HTTPAuthorizationCredentials = Depends(auth_scheme),
    user: dict = Depends(get_current_user)
):
    _require_db()
    sb.postgrest.auth(token.credentials)
    try:
        # 존재 확인 및 소유권 검증
        existing = sb.table("projects").select("id").eq("id", id).eq("user_id", user.id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없거나 권한이 없습니다.")

        # projects 메타 업데이트
        sb.table("projects").update({
            "name": req.name, "industry": req.industry, "status": req.status
        }).eq("id", id).execute()

        # 기존 하위 데이터 삭제 후 재삽입
        sb.table("factors").delete().eq("project_id", id).execute()
        sb.table("runs").delete().eq("project_id", id).execute()
        sb.table("verify_runs").delete().eq("project_id", id).execute()

        if req.factors:
            sb.table("factors").insert([
                {"project_id": id, "key": f.key, "name": f.name,
                 "min": f.min, "max": f.max,
                 "unit": f.unit, "sort_order": i}
                for i, f in enumerate(req.factors)
            ]).execute()

        if req.runs:
            sb.table("runs").insert([
                {"project_id": id, "run_order": r.runOrder,
                 "factor_values": r.factor_values,
                 "yield_val": float(r.yieldVal) if r.yieldVal not in ("", None) else None}
                for i, r in enumerate(req.runs)
            ]).execute()

        if req.analysis_result:
            ar_data = req.analysis_result.dict()
            sb.table("results").upsert({
                "project_id": id,
                **ar_data
            }).execute()

        if req.verify_runs:
            sb.table("verify_runs").insert([
                {"project_id": id, "run_order": i+1,
                 "yield_val": float(v.yieldVal) if v.yieldVal not in ("", None) else None}
                for i, v in enumerate(req.verify_runs)
            ]).execute()

        return {"id": id, "message": "프로젝트 업데이트 완료"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"DB 업데이트 오류: {e}")
        raise HTTPException(status_code=500, detail="프로젝트를 업데이트하는 중 오류가 발생했습니다.")


# ─── GET /api/projects — 프로젝트 목록 ───────────────────────────────────────

@app.get("/api/projects")
async def list_projects(
    token: HTTPAuthorizationCredentials = Depends(auth_scheme),
    user: dict = Depends(get_current_user)
):
    _require_db()
    sb.postgrest.auth(token.credentials)
    try:
        res = sb.table("projects").select("*").eq("user_id", user.id).order("created_at", desc=True).execute()
        return {"projects": res.data}
    except Exception as e:
        print(f"목록 조회 오류: {e}")
        raise HTTPException(status_code=500, detail="프로젝트 목록을 불러오는 중 오류가 발생했습니다.")


# ─── GET /api/projects/{id} — 프로젝트 상세 (전체 데이터) ────────────────────

@app.get("/api/projects/{id}")
async def get_project(
    id: str, 
    token: HTTPAuthorizationCredentials = Depends(auth_scheme),
    user: dict = Depends(get_current_user)
):
    _require_db()
    sb.postgrest.auth(token.credentials)
    try:
        proj = sb.table("projects").select("*").eq("id", id).eq("user_id", user.id).execute()
        if not proj.data:
            raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없거나 권한이 없습니다.")

        factors_res = sb.table("factors")\
            .select("key, name, min, max, unit, sort_order")\
            .eq("project_id", id)\
            .order("sort_order")\
            .execute()

        runs_res = sb.table("runs")\
            .select("run_order, factor_values, yield_val")\
            .eq("project_id", id)\
            .order("run_order")\
            .execute()

        results_res = sb.table("results")\
            .select("*")\
            .eq("project_id", id)\
            .limit(1)\
            .execute()

        verify_res = sb.table("verify_runs")\
            .select("run_order, yield_val")\
            .eq("project_id", id)\
            .order("run_order")\
            .execute()

        # runs를 프론트 형식으로 변환
        runs_formatted = [
            {
                "id": r["run_order"],
                "runOrder": r["run_order"],
                "factor_values": r["factor_values"],
                "yieldVal": str(r["yield_val"]) if r["yield_val"] is not None else "",
            }
            for r in runs_res.data
        ]

        # verify_runs를 프론트 형식으로 변환
        verify_formatted = [
            {"id": v["run_order"], "yieldVal": str(v["yield_val"]) if v["yield_val"] is not None else ""}
            for v in verify_res.data
        ] or [{"id": 1, "yieldVal": ""}, {"id": 2, "yieldVal": ""}, {"id": 3, "yieldVal": ""}]

        return {
            "project": proj.data[0],
            "factors": factors_res.data,
            "runs": runs_formatted,
            "analysis_result": results_res.data[0] if results_res.data else None,
            "verify_runs": verify_formatted,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"상세 조회 오류: {e}")
        raise HTTPException(status_code=500, detail="프로젝트 상세 정보를 불러오는 중 오류가 발생했습니다.")


# ─── DELETE /api/projects/{id} ────────────────────────────────────────────────

@app.delete("/api/projects/{id}")
async def delete_project(
    id: str, 
    token: HTTPAuthorizationCredentials = Depends(auth_scheme),
    user: dict = Depends(get_current_user)
):
    _require_db()
    sb.postgrest.auth(token.credentials)
    try:
        existing = sb.table("projects").select("id").eq("id", id).eq("user_id", user.id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없거나 권한이 없습니다.")
        # CASCADE 설정으로 하위 데이터 자동 삭제
        sb.table("projects").delete().eq("id", id).execute()
        return {"message": "삭제 완료"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"삭제 오류: {e}")
        raise HTTPException(status_code=500, detail="프로젝트를 삭제하는 중 오류가 발생했습니다.")


# ─── GET /api/health — 헬스체크 ──────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok", "db_connected": sb is not None}
