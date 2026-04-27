import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  PenTool, BarChart2, Zap, CheckCircle, FileText,
  Monitor, RefreshCw, Database, FolderOpen,
  Save, X, Clock, Settings, LogOut, User
} from 'lucide-react';
import { supabase } from './supabaseClient';

// ─── Components ───────────────────────────────────────────────────────────
import FactorConfig from './components/FactorConfig';
import ExperimentTable from './components/ExperimentTable';
import AnalysisDashboard from './components/AnalysisDashboard';
import OptimizationPanel from './components/OptimizationPanel';
import VerificationPanel from './components/VerificationPanel';
import ReportPanel from './components/ReportPanel';
import ProjectVault from './components/ProjectVault';
import ComparisonPanel from './components/ComparisonPanel';
import Auth from './components/Auth';

// ─── Constants & Utils ────────────────────────────────────────────────────
import { DEFAULT_FACTORS, DEFAULT_VERIFY, INDUSTRY_TEMPLATES, RUN_COUNTS } from './constants';
import { validateYield, validateFactor, isValidYield } from './utils';
import { translations } from './translations';

// ─── API Base URL ──────────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ─── localStorage 유틸 ───────────────────────────────────────────────────────
const LS = {
  factors: 'doe_factors', runs: 'doe_runs', result: 'doe_result',
  verify: 'doe_verify', industry: 'doe_industry', tab: 'doe_tab',
  projectId: 'doe_project_id', projectName: 'doe_project_name',
  lang: 'doe_lang'
};
const loadLS = (key, fb) => { try { const v = localStorage.getItem(LS[key]); return v !== null ? JSON.parse(v) : fb; } catch { return fb; } };
const saveLS = (key, val) => { try { localStorage.setItem(LS[key], JSON.stringify(val)); } catch { console.error('LocalStorage Save Error:'); } };
const clearLS = () => Object.values(LS).forEach(k => localStorage.removeItem(k));

export default function App() {
  const [lang, setLang] = useState(() => loadLS('lang', 'ko'));
  const t = (path) => {
    const keys = path.split('.');
    let obj = translations[lang];
    for (const key of keys) {
      if (!obj || !obj[key]) return path;
      obj = obj[key];
    }
    return obj;
  };

  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // API Call Wrapper with Auth
  const apiCall = async (endpoint, method = 'GET', body = null) => {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);

    const resp = await fetch(API + endpoint, config);
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.detail || 'API Error');
    }
    return resp.json();
  };

  const [currentTab, setCurrentTab] = useState(() => {
    const tabLS = loadLS('tab', 1), r = loadLS('runs', []), res = loadLS('result', null);
    if (tabLS >= 3 && !res) return r.length > 0 ? 2 : 1;
    if (tabLS >= 2 && r.length === 0) return 1;
    return tabLS;
  });
  const [runs, setRuns] = useState(() => loadLS('runs', []));
  const [verifyRuns, setVerifyRuns] = useState(() => loadLS('verify', DEFAULT_VERIFY));
  const [analysisResult, setAnalysisResult] = useState(() => loadLS('result', null));
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState('light-gray-blue');
  const [industry, setIndustry] = useState(() => loadLS('industry', '사출성형'));
  const [factors, setFactors] = useState(() => loadLS('factors', DEFAULT_FACTORS));
  const [lastSaved, setLastSaved] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);

  const [projectId, setProjectId] = useState(() => loadLS('projectId', null));
  const [projectName, setProjectName] = useState(() => loadLS('projectName', ''));
  const [showProjectPanel, setShowProjectPanel] = useState(false);
  const [projectList, setProjectList] = useState([]);
  const [compareIds, setCompareIds] = useState([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbMsg, setDbMsg] = useState('');

  const toggleCompare = (id) => {
    setCompareIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const excelRef = useRef(null);
  const verifyExcelRef = useRef(null);
  const reportRef = useRef(null);

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);
  useEffect(() => { saveLS('factors', factors); saveLS('industry', industry); }, [factors, industry]);
  useEffect(() => { saveLS('runs', runs); }, [runs]);
  useEffect(() => { if (analysisResult) { saveLS('result', analysisResult); } }, [analysisResult]);
  useEffect(() => { saveLS('verify', verifyRuns); }, [verifyRuns]);
  useEffect(() => { saveLS('tab', currentTab); }, [currentTab]);
  useEffect(() => { saveLS('projectId', projectId); }, [projectId]);
  useEffect(() => { saveLS('projectName', projectName); }, [projectName]);
  useEffect(() => { saveLS('lang', lang); }, [lang]);
  useEffect(() => { if (dbMsg) { const t = setTimeout(() => setDbMsg(''), 4000); return () => clearTimeout(t); } }, [dbMsg]);

  const handleIndustryChange = (ind) => {
    setIndustry(ind);
    const tmpl = INDUSTRY_TEMPLATES[ind];
    if (tmpl) { setFactors(tmpl); setRuns([]); setAnalysisResult(null); }
  };

  const addFactor = () => {
    if (factors.length >= 5) return;
    const newKey = 'f' + Date.now();
    setFactors([...factors, { key: newKey, name: '', min: 0, max: 100, unit: '' }]);
    setRuns([]); setAnalysisResult(null);
  };
  const removeFactor = (key) => {
    if (factors.length <= 2) return;
    setFactors(factors.filter(f => f.key !== key));
    setRuns([]); setAnalysisResult(null);
  };
  const updateFactor = (key, field, val) => {
    setFactors(factors.map(f => f.key === key ? { ...f, [field]: val } : f));
    if (field === 'min' || field === 'max') { setRuns([]); setAnalysisResult(null); }
  };

  const generateRuns = async () => {
    setIsLoading(true);
    try {
      const d = await apiCall('/api/design/generate', 'POST', { factors });
      setRuns(d.runs);
      setCurrentTab(2);
    } catch {
      alert(t('error.backend') || '백엔드 서버 오류');
    }
    setIsLoading(false);
  };

  const runAnalysis = async () => {
    setIsLoading(true);
    try {
      const payload = {
        runs: runs.map(r => ({ ...r, yieldVal: parseFloat(r.yieldVal) })),
        factors,
      };
      const d = await apiCall('/api/analyze', 'POST', payload);
      setAnalysisResult(d);
      setCurrentTab(3);
    } catch {
      alert(t('error.analysis') || '분석 중 오류가 발생했습니다.');
    }
    setIsLoading(false);
  };

  const updateYield = (id, val) => setRuns(runs.map(r => r.id === id ? { ...r, yieldVal: val } : r));
  const updateVerifyYield = (id, val) => setVerifyRuns(verifyRuns.map(r => r.id === id ? { ...r, yieldVal: val } : r));

  const exportFullReport = () => {
    setExportLoading(true);
    if (!runs.length) { alert('실험표를 먼저 생성해주세요.'); setExportLoading(false); return; }
    const wb = XLSX.utils.book_new();

    // Sheet 1: Raw Data
    const rawHeaders = ['Run#', ...factors.map(f => `${f.name}(${f.unit})`), '수율(%)'];
    const rawData = [
      ['DOE Raw Experiment Data'],
      [`Project: ${projectName || industry}`],
      [`Date: ${new Date().toLocaleDateString()}`],
      [],
      rawHeaders,
      ...runs.map(r => [
        r.runOrder,
        ...factors.map(f => r.factor_values[f.key] ?? ''),
        r.yieldVal !== '' ? parseFloat(r.yieldVal) : '',
      ])
    ];
    const wsRaw = XLSX.utils.aoa_to_sheet(rawData);
    XLSX.utils.book_append_sheet(wb, wsRaw, t('excelSheets.raw'));

    // Sheet 2: AI Analysis & Diagnosis
    if (analysisResult) {
      const diagLines = getAIDiagnosisLines();
      const analysisData = [
        ['AI 공정 진단 보고서 요약'],
        [],
        ['[1. 핵심 진단 지표]'],
        ['모델 정확도 (R-Squared)', (analysisResult.r_squared * 100).toFixed(2) + '%'],
        ['공정 안정성 (p-value)', analysisResult.intercept_pvalue < 0.05 ? '안정' : '유의 요망'],
        [],
        ['[2. AI 진단 메시지]'],
        ...diagLines.map(line => [line]),
        [],
        ['[3. 인자별 영향도 (Pareto)]'],
        ['인자명', 't-value', 'p-value', '유의성'],
        ...Object.entries(analysisResult.tvalues).map(([k, v]) => [
          k, 
          v.toFixed(4), 
          (analysisResult.pvalues[analysisResult.factor_names[k]] || 1).toFixed(4),
          (analysisResult.pvalues[analysisResult.factor_names[k]] || 1) < 0.05 ? '핵심인자' : '일반'
        ])
      ];
      const wsAnalysis = XLSX.utils.aoa_to_sheet(analysisData);
      XLSX.utils.book_append_sheet(wb, wsAnalysis, t('excelSheets.analysis'));

      // Sheet 3: Golden Solution & ROI
      const g = analysisResult.golden_solution || {};
      const optData = [
        ['Golden Solution - AI 최적 공정 조건'],
        [],
        ['[최적 조건 설정값]'],
        ['인자명', '최적값', '단위', '수준(Coded)'],
        ...factors.map(f => [
          f.name, 
          g[f.key] === 1 ? f.max : f.min, 
          f.unit,
          g[f.key] === 1 ? '+1 (High)' : '-1 (Low)'
        ]),
        [],
        ['[기대 성과 분석]'],
        ['예측 최대 수율', analysisResult.optimal_yield_pred.toFixed(2) + '%'],
        ['현재 평균 수율', analysisResult.current_avg_yield.toFixed(2) + '%'],
        ['수율 개선 기대량', analysisResult.yield_gain.toFixed(2) + '%p'],
        ['예상 연간 절감액 (ROI)', '₩' + analysisResult.roi_amount.toLocaleString()],
      ];
      const wsOpt = XLSX.utils.aoa_to_sheet(optData);
      XLSX.utils.book_append_sheet(wb, wsOpt, t('excelSheets.optimize'));

      // Sheet 4: Verification Results
      const verifyFilled = verifyRuns.filter(r => r.yieldVal !== '').length;
      if (verifyFilled > 0) {
        const pred = analysisResult?.optimal_yield_pred || 0;
        const vAvg = verifyFilled === 3 ? (verifyRuns.reduce((s, r) => s + parseFloat(r.yieldVal || 0), 0) / 3) : 0;
        const vErr = Math.abs(vAvg - pred);
        
        const verifyData = [
          ['현장 재현 실험 검증 결과'],
          [],
          ['검증 지표', '값'],
          ['모델 예측 수율', pred.toFixed(2) + '%'],
          ['현장 재현 평균', (vAvg || 0).toFixed(2) + '%'],
          ['오차 범위 (Error)', vErr.toFixed(2) + '%p'],
          ['최종 판정', vErr <= 2 ? 'PASS (유효함)' : 'FAIL (오차큼)'],
          [],
          ['[재현 실험 상세]'],
          ['실험회차', '실측 수율(%)'],
          ...verifyRuns.map((r, i) => [i + 1, r.yieldVal || '-'])
        ];
        const wsVerify = XLSX.utils.aoa_to_sheet(verifyData);
        XLSX.utils.book_append_sheet(wb, wsVerify, t('excelSheets.verify'));
      }
    }

    const fileName = `DOE_Report_${projectName || industry}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    setExportLoading(false);
  };


  const handleExcelUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const yieldColIdx = factors.length + 1;
        setRuns(runs.map((r, i) => {
          const row = data[i + 1];
          const rv = row ? row[yieldColIdx] : undefined;
          return { ...r, yieldVal: (rv !== undefined && rv !== '') ? String(rv) : r.yieldVal };
        }));
      } catch (err) { alert('엑셀 읽기 오류: ' + err.message); }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleVerifyUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const yieldColIdx = factors.length + 1;
        setVerifyRuns(verifyRuns.map((r, i) => {
          const row = data[i + 1];
          const rv = row ? row[yieldColIdx] : undefined;
          return { ...r, yieldVal: (rv !== undefined && rv !== '') ? String(rv) : r.yieldVal };
        }));
      } catch (err) { alert('엑셀 읽기 오류: ' + err.message); }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const generatePDF = async () => {
    if (!reportRef.current) { alert('보고서 섹션을 찾을 수 없습니다.'); return; }
    // 브라우저 프린트 기능을 호출하여 PDF로 저장 유도 (oklab 에러 완벽 해결)
    window.print();
  };

  const handleReset = () => {
    if (!window.confirm('모든 실험 데이터를 초기화하시겠습니까?')) return;
    clearLS();
    setRuns([]); setVerifyRuns(DEFAULT_VERIFY); setAnalysisResult(null);
    setFactors(DEFAULT_FACTORS); setIndustry('사출성형'); setCurrentTab(1);
    setLastSaved(null); setProjectId(null); setProjectName('');
  };

  const saveProject = async () => {
    setDbLoading(true);
    setDbMsg('Saving...');
    try {
      // 데이터 정제: 백엔드 모델(VerifyRunItem) 규격에 맞게 변환
      const sanitizedVerifyRuns = verifyRuns.map(v => ({
        id: Number(v.id),
        yieldVal: v.yieldVal !== null && v.yieldVal !== undefined ? String(v.yieldVal) : ""
      }));

      // JSON 직렬화 시 오류 유발 가능한 값(NaN, Infinity)을 null로 치환하는 Deep Clean
      const cleanPayload = JSON.parse(JSON.stringify({
        name: projectName || `${industry}_${new Date().toLocaleDateString()}`,
        industry,
        factors,
        runs,
        analysis_result: analysisResult,
        verify_runs: sanitizedVerifyRuns
      }, (key, value) => {
        if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) return null;
        return value;
      }));

      const url = projectId ? `/api/projects/${projectId}` : '/api/projects';
      const method = projectId ? 'PUT' : 'POST';
      const res = await apiCall(url, method, cleanPayload);
      
      if (!projectId) {
        setProjectId(res.id);
        saveLS('projectId', res.id);
        setProjectName(payload.name);
        saveLS('projectName', payload.name);
      }
      setDbMsg('✓ Saved to Cloud');
    } catch (err) {
      console.error('Save Project Error:', err);
      setDbMsg(`✗ Save failed: ${err.message}`);
    }
    setDbLoading(false);
  };

  const loadProjectList = async () => {
    setDbLoading(true);
    try {
      const res = await apiCall('/api/projects');
      setProjectList(res.projects);
    } catch {
      setDbMsg('✗ Load List failed');
    }
    setDbLoading(false);
  };

  const loadProjectDetail = async (id) => {
    setDbLoading(true);
    try {
      const res = await apiCall(`/api/projects/${id}`);
      const { project, factors, runs, analysis_result, verify_runs } = res;
      setProjectId(project.id);
      setProjectName(project.name);
      setIndustry(project.industry);
      setFactors(factors);
      setRuns(runs);
      setAnalysisResult(analysis_result);
      setVerifyRuns(verify_runs || DEFAULT_VERIFY);
      setShowProjectPanel(false);
      setDbMsg(`✓ "${project.name}" 불러오기 완료`);
    } catch {
      setDbMsg('✗ Load Detail failed');
    }
    setDbLoading(false);
  };

  const deleteProject = async (id, name) => {
    if (!window.confirm(`"${name}"을 삭제하시겠습니까?`)) return;
    try {
      await apiCall(`/api/projects/${id}`, 'DELETE');
      loadProjectList();
      if (projectId === id) handleReset();
      setDbMsg(`✓ "${name}" 삭제 완료`);
    } catch {
      setDbMsg('✗ Delete failed');
    }
  };

  const getAIDiagnosisLines = () => {
    if (!analysisResult) return [];
    const diag = analysisResult.ai_diagnosis || '';
    return diag.split(' | ').filter(Boolean);
  };

  const completedCount = runs.filter(r => isValidYield(r.yieldVal)).length;
  const hasFactorErrors = factors.some(f => validateFactor(f) !== null);
  const hasYieldErrors = runs.some(r => validateYield(r.yieldVal) !== null);
  const totalRuns = RUN_COUNTS[factors.length] ?? 20;
  const canAnalyze = completedCount === totalRuns && !hasYieldErrors && !isLoading;
  const verifyFilled = verifyRuns.filter(r => r.yieldVal !== '').length;
  const verifyAvg = verifyFilled === 3
    ? (verifyRuns.reduce((s, r) => s + parseFloat(r.yieldVal || 0), 0) / 3).toFixed(1)
    : null;
  const predictedYield = analysisResult?.optimal_yield_pred?.toFixed(1) ?? '--';
  const verifyError = (verifyAvg && analysisResult)
    ? Math.abs(parseFloat(verifyAvg) - analysisResult.optimal_yield_pred).toFixed(1)
    : null;
  const roiAmount = analysisResult?.roi_amount ?? 0;
  const roiAmountKRW = roiAmount > 0 ? (roiAmount / 1e8).toFixed(1) : '--';

  const renderTabContent = () => {
    switch (currentTab) {
      case 1:
        return <FactorConfig
          t={t}
          industry={industry} handleIndustryChange={handleIndustryChange}
          factors={factors} addFactor={addFactor} removeFactor={removeFactor} updateFactor={updateFactor}
          generateRuns={generateRuns} isLoading={isLoading} hasFactorErrors={hasFactorErrors}
          validateFactor={validateFactor}
        />;
      case 2:
        return <ExperimentTable
          t={t}
          runs={runs} factors={factors} completedCount={completedCount} totalRuns={totalRuns}
          downloadExcel={exportFullReport} excelRef={excelRef}
          updateYield={updateYield} runAnalysis={runAnalysis} isLoading={isLoading}
          canAnalyze={canAnalyze} hasYieldErrors={hasYieldErrors}
          validateYield={validateYield} isValidYield={isValidYield}
        />;
      case 3:
        return <AnalysisDashboard
          t={t}
          analysisResult={analysisResult} factors={factors}
          getAIDiagnosisLines={getAIDiagnosisLines} setCurrentTab={setCurrentTab}
        />;
      case 4:
        return <OptimizationPanel
          t={t}
          analysisResult={analysisResult} factors={factors}
          roiAmountKRW={roiAmountKRW} predictedYield={predictedYield} setCurrentTab={setCurrentTab}
        />;
      case 5:
        return <VerificationPanel
          t={t}
          analysisResult={analysisResult} factors={factors} verifyRuns={verifyRuns}
          verifyFilled={verifyFilled} verifyAvg={verifyAvg} verifyError={verifyError}
          predictedYield={predictedYield} downloadVerifyExcel={exportFullReport}
          verifyExcelRef={verifyExcelRef}
          updateVerifyYield={updateVerifyYield} setCurrentTab={setCurrentTab}
        />;
      case 6:
        return <ReportPanel
          t={t}
          reportRef={reportRef} industry={industry} factors={factors}
          analysisResult={analysisResult} predictedYield={predictedYield}
          verifyAvg={verifyAvg} verifyError={verifyError} roiAmountKRW={roiAmountKRW}
          getAIDiagnosisLines={getAIDiagnosisLines} exportFullReport={exportFullReport} exportLoading={exportLoading}
        />;
      case 7:
        return <ComparisonPanel
          t={t}
          projectList={projectList}
          compareIds={compareIds}
        />;
      default: return null;
    }
  };

  const tabs = [
    { id: 1, label: '설계', icon: Settings },
    { id: 2, label: '입력', icon: PenTool },
    { id: 3, label: '분석', icon: BarChart2 },
    { id: 4, label: '최적화', icon: Zap },
    { id: 5, label: '검증', icon: CheckCircle },
    { id: 6, label: '보고서', icon: FileText },
    { id: 7, label: '히스토리', icon: Database },
  ];

  if (!session) {
    return <Auth t={t} lang={lang} />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-theme-main font-sans transition-colors duration-300">
      <div className="md:w-64 md:flex-shrink-0 bg-[var(--color-sidebar-bg)] text-white shadow-xl flex flex-col z-20">
        <header className="p-4 md:p-6 sticky md:static top-0 bg-[var(--color-header-bg)] text-[var(--color-header-text)] shadow-md border-b border-black/5 md:border-none md:shadow-none flex items-center justify-between md:flex-col md:items-start md:gap-4 transition-colors duration-300">
          <div className="flex-1">
            <h1 className="text-lg md:text-2xl font-bold tracking-wider flex items-center gap-2 text-black md:text-[var(--color-header-text)]">
              <Zap size={24} className="text-yellow-500 md:text-yellow-400" fill="currentColor" />
              DOE Auto
            </h1>
            <p className="hidden md:block text-sm text-blue-200 opacity-90 mt-1">현장 밀착형 스마트 실험계획법</p>
          </div>
          <div className="flex flex-col gap-3 w-full">
            <div className="hidden md:flex flex-col items-start gap-1">
              <span className="text-[10px] opacity-60 flex items-center gap-1"><User size={10}/> {user?.email}</span>
              <button onClick={() => supabase.auth.signOut()} className="text-[10px] font-bold text-red-200 hover:text-red-100 flex items-center gap-1">
                <LogOut size={10} /> {t('auth.logout') || 'Logout'}
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center bg-black/20 rounded-lg p-1">
                <button
                  onClick={() => setLang('ko')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${lang === 'ko' ? 'bg-white text-blue-900' : 'text-blue-200 opacity-60'}`}
                >
                  KO
                </button>
                <button
                  onClick={() => setLang('en')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${lang === 'en' ? 'bg-white text-blue-900' : 'text-blue-200 opacity-60'}`}
                >
                  EN
                </button>
              </div>

              <div className="flex items-center bg-black/5 md:bg-black/20 rounded-lg p-1">
                <Monitor size={12} className="mx-1 opacity-60 hidden sm:block text-black md:text-white" />
                <select value={theme} onChange={e => setTheme(e.target.value)}
                  className="bg-transparent text-[10px] font-bold outline-none cursor-pointer appearance-none px-1 text-black md:text-white">
                  <option value="light-gray-blue" className="text-black">Gray+Blue</option>
                  <option value="white" className="text-black">White</option>
                  <option value="black" className="text-black">Dark</option>
                </select>
              </div>
            </div>

            <div className="md:hidden bg-[#152e6e] px-2 py-1.5 rounded-lg text-xs font-bold border border-blue-800 text-white self-end">
              {t('step')} {currentTab}/7
            </div>
          </div>
        </header>

        <nav className="hidden md:flex flex-col flex-1 p-4 gap-2 border-t border-black/10">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-2">{t('workflow')}</div>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setCurrentTab(tab.id)}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all w-full text-left ${isActive ? 'sidebar-tab-active font-extrabold text-[1.125rem]' : 'sidebar-tab-idle font-medium text-[0.95rem]'}`}>
                <Icon size={isActive ? 22 : 20} strokeWidth={isActive ? 2.5 : 2} />
                <span>{t(`tabs.${tab.id}`)}</span>
                {isActive && <div className="ml-auto w-2 h-2 rounded-full bg-[--color-success]" />}
              </button>
            );
          })}

          <div className="mt-auto pt-4 border-t border-white/10 space-y-1">
            {dbMsg && (
              <div className={`px-2 py-1.5 text-xs rounded-lg mx-1 leading-snug ${dbMsg.startsWith('✓') ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'
                }`}>{dbMsg}</div>
            )}
            {projectId && (
              <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-blue-300 opacity-80">
                <Database size={11} />
                <span className="truncate">{projectName || t('projectList')}</span>
              </div>
            )}
            <button onClick={saveProject} disabled={dbLoading || runs.length === 0}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-blue-200 hover:bg-blue-900/40 transition disabled:opacity-40">
              <Save size={12} /> {dbLoading ? t('save') : projectId ? t('dbUpdate') : t('dbSave')}
            </button>
            <button onClick={() => { setShowProjectPanel(true); loadProjectList(); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-blue-200 hover:bg-blue-900/40 transition">
              <FolderOpen size={12} /> {t('projectList')}
            </button>
            {lastSaved && (
              <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-blue-300 opacity-50">
                <Clock size={10} />
                {t('localSaveTime')} {lastSaved.toLocaleTimeString(lang === 'ko' ? 'ko-KR' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            )}
            <button onClick={handleReset}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-300 hover:bg-red-900/30 transition">
              <RefreshCw size={11} /> {t('reset')}
            </button>
          </div>
        </nav>
      </div>

      <main className="flex-1 overflow-y-auto pb-24 md:pb-0 h-screen relative bg-theme-main transition-colors duration-300">
        <div className="hidden md:block absolute top-0 right-0 p-6 opacity-5 pointer-events-none"><Settings size={200} /></div>
        <div className="relative z-10 w-full">{renderTabContent()}</div>
      </main>

      <nav className="md:hidden bg-theme-card border-t border-theme fixed bottom-0 w-full flex justify-between px-1 py-1.5 shadow-[0_-4px_15px_rgba(0,0,0,0.05)] z-30 transition-colors duration-300">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setCurrentTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center p-2 rounded-xl transition-all ${isActive ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 font-bold' : 'text-sky-400 font-medium'}`}>
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'mb-1' : 'mb-1 opacity-70'} />
              <span className="text-[10px]">{t(`tabs.${tab.id}`)}</span>
            </button>
          );
        })}
      </nav>

      <input ref={excelRef} type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} style={{ display: 'none' }} />
      <input ref={verifyExcelRef} type="file" accept=".xlsx,.xls" onChange={handleVerifyUpload} style={{ display: 'none' }} />

      <ProjectVault
        showProjectPanel={showProjectPanel} setShowProjectPanel={setShowProjectPanel}
        projectName={projectName} setProjectName={setProjectName}
        saveProject={saveProject} dbLoading={dbLoading} runs={runs}
        projectId={projectId} industry={industry} loadProjectList={loadProjectList}
        projectList={projectList} loadProjectDetail={loadProjectDetail}
        deleteProject={deleteProject}
        compareIds={compareIds}
        toggleCompare={toggleCompare}
        setCurrentTab={setCurrentTab}
      />
    </div>
  );
}
