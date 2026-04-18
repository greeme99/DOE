import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  Settings, PenTool, BarChart2, Zap, CheckCircle, FileText, QrCode,
  Sparkles, TrendingUp, Award, Target, HelpCircle, ArrowRight,
  DownloadCloud, UploadCloud, Monitor, Download, Share2, Mail,
  RefreshCw, AlertCircle, Plus, Trash2, Database, FolderOpen,
  Save, X, Clock, ChevronRight,
} from 'lucide-react';
import Plot from 'react-plotly.js';

// ─── API Base URL (환경변수 → 로컬 폴백) ─────────────────────────────────────
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_FACTORS = [
  { key: 'f0', name: '온도',  min: 160, max: 180, unit: '℃'  },
  { key: 'f1', name: '압력',  min: 50,  max: 70,  unit: 'bar' },
  { key: 'f2', name: '시간',  min: 10,  max: 15,  unit: 's'   },
];
const DEFAULT_VERIFY = [{ id: 1, yieldVal: '' }, { id: 2, yieldVal: '' }, { id: 3, yieldVal: '' }];
const RUN_COUNTS = { 2: 12, 3: 20, 4: 22, 5: 22 };

const INDUSTRY_TEMPLATES = {
  '사출성형': [
    { key: 'f0', name: '온도',  min: 160, max: 180, unit: '℃'  },
    { key: 'f1', name: '압력',  min: 50,  max: 70,  unit: 'bar' },
    { key: 'f2', name: '시간',  min: 10,  max: 15,  unit: 's'   },
  ],
  '식각': [
    { key: 'f0', name: '전력',  min: 200, max: 400, unit: 'W'   },
    { key: 'f1', name: '압력',  min: 5,   max: 20,  unit: 'mTorr' },
    { key: 'f2', name: '가스비율', min: 30, max: 70, unit: '%'  },
  ],
  '코팅': [
    { key: 'f0', name: '회전속도', min: 1000, max: 3000, unit: 'rpm' },
    { key: 'f1', name: '온도',   min: 80,   max: 120,  unit: '℃'  },
    { key: 'f2', name: '시간',   min: 30,   max: 60,   unit: 's'   },
  ],
  '합성': [
    { key: 'f0', name: '온도',   min: 60,  max: 90,  unit: '℃'    },
    { key: 'f1', name: '촉매량', min: 1,   max: 5,   unit: 'mol%' },
    { key: 'f2', name: '반응시간', min: 2, max: 6,   unit: 'hr'   },
  ],
  '타정': [
    { key: 'f0', name: '타정압력', min: 5,  max: 15,  unit: 'kN'  },
    { key: 'f1', name: '수분함량', min: 2,  max: 5,   unit: '%'   },
    { key: 'f2', name: '혼합시간', min: 10, max: 20,  unit: 'min' },
  ],
};

// ─── localStorage 유틸 ───────────────────────────────────────────────────────
const LS = { factors:'doe_factors', runs:'doe_runs', result:'doe_result',
             verify:'doe_verify', industry:'doe_industry', tab:'doe_tab',
             projectId:'doe_project_id', projectName:'doe_project_name' };
const loadLS  = (key, fb) => { try { const v=localStorage.getItem(LS[key]); return v!==null?JSON.parse(v):fb; } catch { return fb; } };
const saveLS  = (key, val) => { try { localStorage.setItem(LS[key], JSON.stringify(val)); } catch {} };
const clearLS = () => Object.values(LS).forEach(k => localStorage.removeItem(k));

// ─── Validation ──────────────────────────────────────────────────────────────
const validateYield  = v => { if(v===''||v===undefined) return null; const n=parseFloat(v); if(isNaN(n)) return '숫자를 입력해주세요'; if(n<0||n>100) return '0~100 범위 초과'; return null; };
const validateFactor = f => { const lo=parseFloat(f.min),hi=parseFloat(f.max); if(isNaN(lo)||isNaN(hi)) return '숫자를 입력해주세요'; if(lo>=hi) return 'Min < Max 조건 불충족'; if(!f.name.trim()) return '인자명을 입력해주세요'; return null; };
const isValidYield   = v => v!=='' && !isNaN(parseFloat(v)) && validateYield(v)===null;

// ─── Main Component ──────────────────────────────────────────────────────────

export default function App() {
  const [currentTab, setCurrentTab] = useState(() => {
    const t=loadLS('tab',1), r=loadLS('runs',[]), res=loadLS('result',null);
    if(t>=3&&!res) return r.length>0?2:1;
    if(t>=2&&r.length===0) return 1;
    return t;
  });
  const [runs,           setRuns]           = useState(() => loadLS('runs', []));
  const [verifyRuns,     setVerifyRuns]     = useState(() => loadLS('verify', DEFAULT_VERIFY));
  const [analysisResult, setAnalysisResult] = useState(() => loadLS('result', null));
  const [isLoading,      setIsLoading]      = useState(false);
  const [theme,          setTheme]          = useState('light-gray-blue');
  const [industry,       setIndustry]       = useState(() => loadLS('industry','사출성형'));
  const [factors,        setFactors]        = useState(() => loadLS('factors', DEFAULT_FACTORS));
  const [lastSaved,      setLastSaved]      = useState(null);
  const [pdfLoading,     setPdfLoading]     = useState(false);

  // ─ DB / Project 관련 state ────────────────────────────────────────────────
  const [projectId,        setProjectId]        = useState(() => loadLS('projectId', null));
  const [projectName,      setProjectName]      = useState(() => loadLS('projectName', ''));
  const [showProjectPanel, setShowProjectPanel] = useState(false);
  const [projectList,      setProjectList]      = useState([]);
  const [dbLoading,        setDbLoading]        = useState(false);
  const [dbMsg,            setDbMsg]            = useState('');

  const excelRef       = useRef(null);
  const verifyExcelRef = useRef(null);
  const reportRef      = useRef(null);

  // ─ Effects ────────────────────────────────────────────────────────────────
  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);
  useEffect(() => { saveLS('factors', factors); saveLS('industry', industry); }, [factors, industry]);
  useEffect(() => { saveLS('runs', runs); if(runs.length>0) setLastSaved(new Date()); }, [runs]);
  useEffect(() => { if(analysisResult){ saveLS('result', analysisResult); setLastSaved(new Date()); } }, [analysisResult]);
  useEffect(() => { saveLS('verify', verifyRuns); }, [verifyRuns]);
  useEffect(() => { saveLS('tab', currentTab); }, [currentTab]);
  useEffect(() => { saveLS('projectId', projectId); }, [projectId]);
  useEffect(() => { saveLS('projectName', projectName); }, [projectName]);
  useEffect(() => { if(dbMsg) { const t=setTimeout(()=>setDbMsg(''),4000); return()=>clearTimeout(t); } }, [dbMsg]);

  // ─ Industry template change ───────────────────────────────────────────────
  const handleIndustryChange = (ind) => {
    setIndustry(ind);
    const tmpl = INDUSTRY_TEMPLATES[ind];
    if (tmpl) { setFactors(tmpl); setRuns([]); setAnalysisResult(null); }
  };

  // ─ Factor CRUD ───────────────────────────────────────────────────────────
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
    setFactors(factors.map(f => f.key===key ? {...f, [field]: val} : f));
    if(field==='min'||field==='max') { setRuns([]); setAnalysisResult(null); }
  };

  // ─ API calls ─────────────────────────────────────────────────────────────
  const generateRuns = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/api/design/generate`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ factors }),
      });
      if (res.ok) { const d=await res.json(); setRuns(d.runs); setCurrentTab(2); }
      else alert('백엔드 서버(FastAPI)를 먼저 실행해주세요.\nuvicorn main:app --reload');
    } catch { alert('백엔드 연결 오류. 터미널에서 uvicorn main:app --reload 실행하세요.'); }
    setIsLoading(false);
  };

  const runAnalysis = async () => {
    setIsLoading(true);
    try {
      const payload = {
        runs: runs.map(r => ({ ...r, yieldVal: parseFloat(r.yieldVal) })),
        factors,
      };
      const res = await fetch(`${API}/api/analyze`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload),
      });
      if (res.ok) { const d=await res.json(); setAnalysisResult(d); setCurrentTab(3); }
      else alert('분석 오류 — 백엔드 로그를 확인해주세요.');
    } catch { alert('백엔드 연결 오류 (analyze).'); }
    setIsLoading(false);
  };

  // ─ Input handlers ─────────────────────────────────────────────────────────
  const updateYield       = (id, val) => setRuns(runs.map(r => r.id===id ? {...r, yieldVal:val} : r));
  const updateVerifyYield = (id, val) => setVerifyRuns(verifyRuns.map(r => r.id===id ? {...r, yieldVal:val} : r));

  // ─ Excel ─────────────────────────────────────────────────────────────────
  const downloadExcel = () => {
    if (!runs.length) { alert('실험표를 먼저 생성해주세요.'); return; }
    const headers = ['Run#', ...factors.map(f=>`${f.name}(${f.unit})`), '수율(%)'];
    const wsData  = [headers, ...runs.map(r => [
      r.runOrder,
      ...factors.map(f => r.factor_values[f.key] ?? ''),
      r.yieldVal!==''?parseFloat(r.yieldVal):'',
    ])];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = headers.map(() => ({wch:12}));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DOE실험');
    XLSX.writeFile(wb, `DOE_Template_${industry}.xlsx`);
  };

  const downloadVerifyExcel = () => {
    const g = analysisResult?.golden_solution || {};
    const headers = ['Verify#', ...factors.map(f=>`${f.name}(${f.unit})`), '수율(%)'];
    const wsData  = [headers, ...verifyRuns.map((r,i) => [
      i+1,
      ...factors.map(f => g[f.key]===1 ? f.max : f.min),
      r.yieldVal!==''?parseFloat(r.yieldVal):'',
    ])];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = headers.map(() => ({wch:12}));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '재현실험');
    XLSX.writeFile(wb, 'DOE_Verify_Template.xlsx');
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const wb = XLSX.read(evt.target.result, {type:'binary'});
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, {header:1});
        const yieldColIdx = factors.length + 1; // Run# + factors + yield
        setRuns(runs.map((r,i) => {
          const row = data[i+1];
          const rv  = row ? row[yieldColIdx] : undefined;
          return {...r, yieldVal: (rv!==undefined&&rv!=='') ? String(rv) : r.yieldVal};
        }));
      } catch(err) { alert('엑셀 읽기 오류: ' + err.message); }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleVerifyUpload = (e) => {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const wb = XLSX.read(evt.target.result, {type:'binary'});
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, {header:1});
        const yieldColIdx = factors.length + 1;
        setVerifyRuns(verifyRuns.map((r,i) => {
          const row = data[i+1];
          const rv  = row ? row[yieldColIdx] : undefined;
          return {...r, yieldVal: (rv!==undefined&&rv!=='') ? String(rv) : r.yieldVal};
        }));
      } catch(err) { alert('엑셀 읽기 오류: ' + err.message); }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // ─ PDF 실제 생성 (jsPDF + html2canvas) ───────────────────────────────────
  const generatePDF = async () => {
    if (!reportRef.current) { alert('보고서 섹션을 찾을 수 없습니다.'); return; }
    setPdfLoading(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);
      const el     = reportRef.current;
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
      const imgData   = canvas.toDataURL('image/png');
      const pdf       = new jsPDF('p', 'mm', 'a4');
      const pageW     = pdf.internal.pageSize.getWidth();
      const pageH     = pdf.internal.pageSize.getHeight();
      const imgH      = (canvas.height * pageW) / canvas.width;
      const margin    = 5;
      const usableW   = pageW - margin * 2;
      const usableH   = pageH - margin * 2;

      if (imgH <= usableH) {
        pdf.addImage(imgData, 'PNG', margin, margin, usableW, imgH);
      } else {
        // 여러 페이지
        let y = 0;
        while (y < canvas.height) {
          if (y > 0) pdf.addPage();
          const sliceH = Math.min(canvas.height - y, (canvas.width * usableH) / usableW);
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width  = canvas.width;
          sliceCanvas.height = sliceH;
          sliceCanvas.getContext('2d').drawImage(canvas, 0, y, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
          pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', margin, margin, usableW, (sliceH * usableW) / canvas.width);
          y += sliceH;
        }
      }
      const dateStr = new Date().toLocaleDateString('ko-KR').replace(/\. /g,'-').replace('.','-');
      pdf.save(`DOE_Report_${industry}_${dateStr}.pdf`);
    } catch (err) {
      alert('PDF 생성 오류: ' + err.message + '\n\n터미널: npm install jspdf html2canvas');
    }
    setPdfLoading(false);
  };

  // ─ Reset ──────────────────────────────────────────────────────────────────
  const handleReset = () => {
    if (!window.confirm('모든 실험 데이터를 초기화하시겠습니까?')) return;
    clearLS();
    setRuns([]); setVerifyRuns(DEFAULT_VERIFY); setAnalysisResult(null);
    setFactors(DEFAULT_FACTORS); setIndustry('사출성형'); setCurrentTab(1);
    setLastSaved(null); setProjectId(null); setProjectName('');
  };

  // ─ DB: 프로젝트 저장 ──────────────────────────────────────────────────────
  const saveProject = async () => {
    const name = projectName.trim() || `${industry} 실험 ${new Date().toLocaleDateString('ko-KR')}`;
    setDbLoading(true);
    try {
      const payload = { name, industry, factors, runs, analysis_result: analysisResult, verify_runs: verifyRuns };
      const isNew = !projectId;
      const url    = isNew ? `${API}/api/projects` : `${API}/api/projects/${projectId}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'DB 오류');
      }
      const data = await res.json();
      if (isNew) setProjectId(data.id);
      setProjectName(name);
      setDbMsg(`✓ DB 저장 완료 — "${name}"`);
    } catch (e) {
      setDbMsg(`✗ ${e.message}`);
    }
    setDbLoading(false);
  };

  // ─ DB: 프로젝트 목록 조회 ─────────────────────────────────────────────────
  const loadProjectList = async () => {
    setDbLoading(true);
    try {
      const res = await fetch(`${API}/api/projects`);
      if (!res.ok) throw new Error('목록 조회 실패');
      const data = await res.json();
      setProjectList(data.projects || []);
    } catch (e) {
      setDbMsg(`✗ ${e.message}`);
    }
    setDbLoading(false);
  };

  // ─ DB: 프로젝트 불러오기 ──────────────────────────────────────────────────
  const loadProject = async (id, name) => {
    setDbLoading(true);
    try {
      const res = await fetch(`${API}/api/projects/${id}`);
      if (!res.ok) throw new Error('불러오기 실패');
      const data = await res.json();
      setProjectId(id);
      setProjectName(name);
      setIndustry(data.project.industry || '사출성형');
      if (data.factors?.length)       setFactors(data.factors);
      if (data.runs?.length)          setRuns(data.runs);
      if (data.analysis_result)       setAnalysisResult(data.analysis_result);
      if (data.verify_runs?.length)   setVerifyRuns(data.verify_runs);
      setCurrentTab(data.runs?.length ? (data.analysis_result ? 3 : 2) : 1);
      setShowProjectPanel(false);
      setDbMsg(`✓ "${name}" 불러오기 완료`);
    } catch (e) {
      setDbMsg(`✗ ${e.message}`);
    }
    setDbLoading(false);
  };

  // ─ DB: 프로젝트 삭제 ──────────────────────────────────────────────────────
  const deleteProject = async (id, name) => {
    if (!window.confirm(`"${name}"을 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`${API}/api/projects/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('삭제 실패');
      setProjectList(prev => prev.filter(p => p.id !== id));
      if (projectId === id) { setProjectId(null); setProjectName(''); }
      setDbMsg(`✓ "${name}" 삭제 완료`);
    } catch (e) {
      setDbMsg(`✗ ${e.message}`);
    }
  };

  // ─ AI Diagnosis (frontend) ────────────────────────────────────────────────
  const getAIDiagnosisLines = () => {
    if (!analysisResult) return [];
    // backend가 이미 생성한 문장 사용 (한글 인자명 적용됨)
    const diag = analysisResult.ai_diagnosis || '';
    return diag.split(' | ').filter(Boolean);
  };

  // ─ Derived state ──────────────────────────────────────────────────────────
  const hasFactorErrors = factors.some(f => validateFactor(f) !== null);
  const completedCount  = runs.filter(r => isValidYield(r.yieldVal)).length;
  const hasYieldErrors  = runs.some(r => validateYield(r.yieldVal) !== null);
  const totalRuns       = RUN_COUNTS[factors.length] ?? 20;
  const canAnalyze      = completedCount === totalRuns && !hasYieldErrors && !isLoading;
  const verifyFilled    = verifyRuns.filter(r => r.yieldVal !== '').length;
  const verifyAvg       = verifyFilled===3
    ? (verifyRuns.reduce((s,r)=>s+parseFloat(r.yieldVal||0),0)/3).toFixed(1)
    : null;
  const predictedYield  = analysisResult?.optimal_yield_pred?.toFixed(1) ?? '--';
  const verifyError     = (verifyAvg && analysisResult)
    ? Math.abs(parseFloat(verifyAvg) - analysisResult.optimal_yield_pred).toFixed(1)
    : null;
  const roiAmount    = analysisResult?.roi_amount ?? 0;
  const roiAmountKRW = roiAmount > 0 ? (roiAmount/1e8).toFixed(1) : '--';

  // ─ Tab render ─────────────────────────────────────────────────────────────

  const renderTabContent = () => {

    // ──────────────────────────── TAB 1 ─────────────────────────────────────
    if (currentTab === 1) {
      return (
        <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">

          {/* 산업 템플릿 */}
          <div className="bg-theme-card p-5 md:p-6 rounded-xl shadow-sm border border-theme">
            <h2 className="text-lg md:text-xl font-bold text-[--color-primary] mb-4 flex items-center gap-2">
              <Settings size={24} /> 공정 템플릿
            </h2>
            <select value={industry} onChange={e => handleIndustryChange(e.target.value)}
              className="w-full md:max-w-md p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-medium focus:ring-2 focus:ring-blue-500 outline-none">
              {Object.keys(INDUSTRY_TEMPLATES).map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>

          {/* 인자 설정 (동적) */}
          <div className="bg-theme-card p-5 md:p-6 rounded-xl shadow-sm border border-theme">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-bold text-[--color-primary]">
                제어 인자 (Factors) — {factors.length}개 / 런 {RUN_COUNTS[factors.length] ?? '?'}개
              </h2>
              <div className="flex gap-2">
                {factors.length < 5 && (
                  <button onClick={addFactor}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition">
                    <Plus size={13} /> 인자 추가
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {factors.map((f, idx) => {
                const fErr = validateFactor(f);
                return (
                  <div key={f.key} className={`bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border ${fErr ? 'border-red-300' : 'border-gray-100 dark:border-gray-700'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">인자 {idx+1}</span>
                      {factors.length > 2 && (
                        <button onClick={() => removeFactor(f.key)}
                          className="text-red-400 hover:text-red-600 transition p-0.5 rounded">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <span className="text-xs text-gray-500 mb-1 block">인자명</span>
                        <input type="text" value={f.name} onChange={e => updateFactor(f.key,'name',e.target.value)}
                          placeholder="예: 온도"
                          className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 dark:text-white" />
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 mb-1 block">단위</span>
                        <input type="text" value={f.unit} onChange={e => updateFactor(f.key,'unit',e.target.value)}
                          placeholder="예: ℃"
                          className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 dark:text-white" />
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <div className="flex-1">
                        <span className="text-xs text-gray-500 mb-1 block">Min</span>
                        <input type="number" value={f.min} onChange={e => updateFactor(f.key,'min',e.target.value)}
                          className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 dark:text-white" />
                      </div>
                      <span className="text-gray-400 mt-4">-</span>
                      <div className="flex-1">
                        <span className="text-xs text-gray-500 mb-1 block">Max</span>
                        <input type="number" value={f.max} onChange={e => updateFactor(f.key,'max',e.target.value)}
                          className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 dark:text-white" />
                      </div>
                    </div>
                    {fErr && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><AlertCircle size={11}/>{fErr}</p>}
                  </div>
                );
              })}
            </div>

            {factors.length < 5 && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                인자 추가 가능 ({factors.length}/5) — 인자 수에 따라 런 수 자동 결정: 2인자→12런, 3인자→20런, 4인자→22런, 5인자→22런
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-center">
            <button onClick={generateRuns} disabled={isLoading || hasFactorErrors}
              className="w-[90%] md:w-full md:max-w-md mx-auto block btn-theme-primary font-bold py-4 px-6 rounded-[12px] shadow-sm transition active:scale-95 text-lg text-center disabled:opacity-50">
              {isLoading ? '설계표 생성 중...'
                : hasFactorErrors ? '인자 설정 오류를 수정해주세요'
                : `${totalRuns}런 실험표 자동 생성`}
            </button>
          </div>
        </div>
      );
    }

    // ──────────────────────────── TAB 2 ─────────────────────────────────────
    if (currentTab === 2) {
      if (!runs.length) return (
        <div className="p-8 text-center flex flex-col items-center mt-16">
          <Settings size={60} className="opacity-20 mb-4 text-theme-muted" />
          <h2 className="text-xl font-bold text-theme-main mb-2">실험표가 없습니다</h2>
          <button onClick={() => setCurrentTab(1)} className="mt-4 px-8 py-3 bg-blue-100 text-[--color-primary] rounded-xl font-bold">설계 탭으로</button>
        </div>
      );

      return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-4">
          {/* Sticky header */}
          <div className="bg-theme-card p-4 rounded-xl shadow-sm border border-theme flex flex-col md:flex-row md:items-center justify-between sticky top-4 z-10 gap-3">
            <div className="flex-1 flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-[--color-primary]">입력 진행률</span>
                  <span className="text-sm font-bold text-theme-muted">{completedCount}/{totalRuns}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div className="bg-[--color-success] h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${(completedCount/totalRuns)*100}%` }} />
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              <button onClick={downloadExcel}
                className="flex items-center gap-1.5 border border-gray-300 dark:border-gray-600 text-theme-main px-3 py-2 rounded-lg font-bold hover:bg-gray-100 dark:hover:bg-gray-800 text-sm transition">
                <DownloadCloud size={16}/><span className="hidden sm:inline">템플릿 다운</span>
              </button>
              <button onClick={() => excelRef.current?.click()}
                className="flex items-center gap-1.5 bg-green-50 text-green-700 dark:bg-green-900 border border-green-200 dark:border-green-800 dark:text-green-300 px-3 py-2 rounded-lg font-bold hover:bg-green-100 text-sm transition">
                <UploadCloud size={16}/><span className="hidden sm:inline">엑셀 업로드</span>
              </button>
              <button className="flex items-center gap-1.5 border border-theme bg-theme-inset text-theme-main px-3 py-2 rounded-lg font-bold text-sm">
                <QrCode size={16}/><span className="hidden sm:inline">QR 스캔</span>
              </button>
            </div>
          </div>

          {/* Run cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {runs.map(r => {
              const yErr    = validateYield(r.yieldVal);
              const isFilled = isValidYield(r.yieldVal);
              return (
                <div key={r.id} className={`bg-theme-card p-4 rounded-xl shadow-sm border-l-4 transition-colors border border-theme
                  ${isFilled ? 'border-l-[--color-success] bg-green-50/10 dark:bg-[#064e3b]/20'
                  : yErr     ? 'border-l-red-400'
                  : 'border-l-gray-300 dark:border-l-gray-600'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-theme-main">Run #{r.runOrder}</span>
                    {isFilled ? <CheckCircle size={18} className="text-[--color-success]"/>
                              : yErr ? <AlertCircle size={18} className="text-red-400"/> : null}
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-xs text-theme-muted mb-3 bg-theme-inset border border-theme p-2 rounded-lg">
                    {factors.map((f, fi) => (
                      <span key={f.key} className="whitespace-nowrap">
                        {f.name}: <strong className="text-theme-main">{r.factor_values?.[f.key] ?? '?'}</strong>
                        {fi < factors.length-1 && <span className="opacity-30 ml-1">|</span>}
                      </span>
                    ))}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <input type="number" placeholder="수율 입력" value={r.yieldVal}
                        onChange={e => updateYield(r.id, e.target.value)}
                        className={`flex-1 p-2.5 border rounded-lg bg-theme-input text-right font-bold text-base text-theme-main outline-none transition
                          ${yErr ? 'border-red-400 focus:ring-2 focus:ring-red-300' : 'border-theme focus:ring-2 focus:ring-blue-500'}`}
                      />
                      <span className="text-theme-muted font-bold">%</span>
                    </div>
                    {yErr && <p className="text-red-500 text-xs mt-1 text-right flex items-center justify-end gap-1"><AlertCircle size={10}/>{yErr}</p>}
                  </div>
                </div>
              );
            })}
          </div>

          {hasYieldErrors && (
            <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
              <AlertCircle size={16} className="flex-shrink-0"/>
              입력 오류가 있습니다. 수율은 0~100 사이 숫자로 입력해주세요.
            </div>
          )}

          <div className="pt-2 flex justify-center">
            <button onClick={runAnalysis} disabled={!canAnalyze}
              className={`w-full md:max-w-md py-4 flex items-center justify-center rounded-[12px] font-bold text-lg shadow-md transition
                ${canAnalyze ? 'bg-[--color-success] text-white active:scale-95 hover:bg-green-600' : 'bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed'}`}>
              {isLoading ? 'AI 통계 분석 중...'
                : hasYieldErrors ? '입력 오류 수정 후 분석 가능'
                : canAnalyze ? '결과 분석 실행하기'
                : `데이터 입력 중 (${completedCount}/${totalRuns})`}
            </button>
          </div>
        </div>
      );
    }

    // ──────────────────────────── TAB 3 ─────────────────────────────────────
    if (currentTab === 3) {
      if (!analysisResult) return (
        <div className="p-8 text-center flex flex-col items-center mt-16">
          <BarChart2 size={60} className="opacity-20 mb-4 text-theme-muted"/>
          <h2 className="text-xl font-bold text-theme-main mb-2">분석 데이터 없음</h2>
          <button onClick={() => setCurrentTab(2)} className="mt-4 px-8 py-3 bg-blue-100 text-[--color-primary] rounded-xl font-bold">입력 탭으로</button>
        </div>
      );

      const { tvalues, norm_plot_x, norm_plot_y, interaction_data, r_squared, params_raw, params } = analysisResult;
      const r_sq_display = (r_squared * 100).toFixed(1);
      const paretoData = Object.entries(tvalues)
        .map(([k,v]) => ({k, v: Math.abs(v)}))
        .sort((a,b) => a.v - b.v);

      const normRefLine = (() => {
        if (!norm_plot_x?.length) return {x:[-2,2], y:[-2,2]};
        const n=norm_plot_x.length, xm=norm_plot_x.reduce((a,b)=>a+b,0)/n, ym=norm_plot_y.reduce((a,b)=>a+b,0)/n;
        const num=norm_plot_x.reduce((s,x,i)=>s+(x-xm)*(norm_plot_y[i]-ym),0);
        const den=norm_plot_x.reduce((s,x)=>s+(x-xm)**2,0);
        const sl=den!==0?num/den:1, bi=ym-sl*xm;
        const xMin=Math.min(...norm_plot_x), xMax=Math.max(...norm_plot_x);
        return {x:[xMin,xMax], y:[xMin*sl+bi, xMax*sl+bi]};
      })();

      // Cube plot (k=3のみ)
      const cubeData = (() => {
        if (factors.length !== 3 || !analysisResult.params_raw) return [];
        const p = analysisResult; const pr = p.params_raw || {};
        const fks = p.factor_keys || factors.map(f=>f.key);
        const fns = p.factor_names || Object.fromEntries(factors.map(f=>[f.key,f.name]));
        const corners8 = [[-1,-1,-1],[1,-1,-1],[-1,1,-1],[1,1,-1],[-1,-1,1],[1,-1,1],[-1,1,1],[1,1,1]];
        return corners8.map(([c0,c1,c2]) => {
          const [k0,k1,k2] = fks;
          const pred = p.intercept
            + (pr[k0]||0)*c0 + (pr[k1]||0)*c1 + (pr[k2]||0)*c2
            + (pr[`${k0}*${k1}`]||0)*c0*c1 + (pr[`${k0}*${k2}`]||0)*c0*c2
            + (pr[`${k1}*${k2}`]||0)*c1*c2;
          const f0 = factors[0], f1 = factors[1], f2 = factors[2];
          return {
            x: c0===1?f0.max:f0.min, y: c1===1?f1.max:f1.min,
            z: c2===1?f2.max:f2.min, pred: parseFloat(pred.toFixed(1))
          };
        });
      })();

      const diagLines = getAIDiagnosisLines();
      const f0 = factors[0], f1 = factors[1];

      return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-4">

          {/* ③ AI 진단 (동적) */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-100 dark:border-blue-800 p-5 md:p-6 rounded-xl shadow-sm relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-10"><Sparkles size={120}/></div>
            <h2 className="text-lg md:text-xl font-bold text-[--color-primary] dark:text-blue-400 mb-3 flex items-center gap-2">
              <Sparkles size={22} className="text-blue-500"/>
              AI 공정 진단 보고서 — R-Sq {r_sq_display}%
            </h2>
            <div className="space-y-2 relative z-10">
              {diagLines.length > 0 ? diagLines.map((line, i) => (
                <p key={i} className={`text-theme-main leading-relaxed ${i===0?'font-semibold md:text-lg':'text-sm md:text-base text-theme-muted'}`}>
                  {i===0 && <span className="inline-block bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold px-2 py-0.5 rounded mr-2 align-middle">핵심</span>}
                  {line}
                </p>
              )) : (
                <p className="text-theme-main font-medium">분석 완료 — 최적 조건 도출을 위해 최적화 탭으로 이동하세요.</p>
              )}
            </div>
          </div>

          {/* 2×2 Chart Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Pareto */}
            <div className="bg-theme-card p-4 md:p-6 rounded-xl shadow-sm border border-theme">
              <h3 className="text-base font-bold text-theme-main mb-1 flex items-center gap-2">
                <BarChart2 size={18} className="text-[--color-primary]"/> Pareto 차트 (t-value)
              </h3>
              <p className="text-xs text-theme-muted mb-3">유의 기준선 2.1 초과(빨강) = 통계적으로 유의함</p>
              <div className="h-64 md:h-72 w-full">
                <Plot data={[{
                  type:'bar', x:paretoData.map(d=>d.v), y:paretoData.map(d=>d.k), orientation:'h',
                  marker:{ color:paretoData.map(d=>d.v>=2.1?'#EF4444':'#9CA3AF') }
                }]}
                  layout={{
                    autosize:true, margin:{l:90,r:20,t:10,b:40},
                    xaxis:{title:'|t-value|'},
                    shapes:[{type:'line',x0:2.1,x1:2.1,y0:-0.5,y1:paretoData.length-0.5,line:{color:'red',dash:'dash',width:2}}],
                    paper_bgcolor:'transparent', plot_bgcolor:'transparent'
                  }}
                  useResizeHandler style={{width:'100%',height:'100%'}} config={{displayModeBar:false}}/>
              </div>
            </div>

            {/* Main Effect — first factor */}
            <div className="bg-theme-card p-4 md:p-6 rounded-xl shadow-sm border border-theme">
              <h3 className="text-base font-bold text-theme-main mb-1 flex items-center gap-2">
                <TrendingUp size={18} className="text-[--color-primary]"/> 주효과도 ({f0?.name})
              </h3>
              <p className="text-xs text-theme-muted mb-3">핵심 인자 변화에 따른 예상 수율 추세</p>
              <div className="h-64 md:h-72 w-full">
                <Plot data={[{
                  type:'scatter', mode:'lines+markers',
                  x:[f0?.min, f0?.max],
                  y:(() => {
                    const k0 = factors[0]?.key || 'f0';
                    const pv = analysisResult.params_raw || {};
                    const ic = analysisResult.intercept;
                    return [ic - (pv[k0]||0), ic + (pv[k0]||0)];
                  })(),
                  line:{color:'#10B981',width:3}, marker:{size:10}
                }]}
                  layout={{
                    autosize:true, margin:{l:40,r:20,t:10,b:40},
                    xaxis:{title:`${f0?.name} (${f0?.unit})`}, yaxis:{title:'예상 수율 (%)'},
                    paper_bgcolor:'transparent', plot_bgcolor:'transparent'
                  }}
                  useResizeHandler style={{width:'100%',height:'100%'}} config={{displayModeBar:false}}/>
              </div>
            </div>

            {/* Interaction */}
            <div className="bg-theme-card p-4 md:p-6 rounded-xl shadow-sm border border-theme">
              <h3 className="text-base font-bold text-theme-main mb-1 flex items-center gap-2">
                <Zap size={18} className="text-[--color-primary]"/> 교호작용도
                <span className="text-xs text-theme-muted font-normal">({interaction_data?.factor_x} × {interaction_data?.factor_b})</span>
              </h3>
              <p className="text-xs text-theme-muted mb-3">두 선 교차 = 유의한 교호작용 존재</p>
              <div className="h-64 md:h-72 w-full">
                <Plot data={[
                  { type:'scatter', mode:'lines+markers', name:`${interaction_data?.factor_b} 하단(−)`,
                    x:[f0?.min, f0?.max], y:interaction_data?.y_b_low||[80,85],
                    line:{color:'#3B82F6',width:2.5,dash:'dash'}, marker:{size:9,symbol:'circle'} },
                  { type:'scatter', mode:'lines+markers', name:`${interaction_data?.factor_b} 상단(+)`,
                    x:[f0?.min, f0?.max], y:interaction_data?.y_b_high||[88,96],
                    line:{color:'#10B981',width:2.5}, marker:{size:9,symbol:'square'} },
                ]}
                  layout={{
                    autosize:true, margin:{l:40,r:20,t:10,b:50},
                    xaxis:{title:`${f0?.name} (${f0?.unit})`}, yaxis:{title:'예상 수율 (%)'},
                    legend:{orientation:'h',y:-0.28,x:0.5,xanchor:'center'},
                    paper_bgcolor:'transparent', plot_bgcolor:'transparent'
                  }}
                  useResizeHandler style={{width:'100%',height:'100%'}} config={{displayModeBar:false}}/>
              </div>
            </div>

            {/* Normal Probability Plot */}
            <div className="bg-theme-card p-4 md:p-6 rounded-xl shadow-sm border border-theme">
              <h3 className="text-base font-bold text-theme-main mb-1 flex items-center gap-2">
                <Award size={18} className="text-[--color-primary]"/> 정규 확률도
              </h3>
              <p className="text-xs text-theme-muted mb-3">잔차가 기준선에 가까울수록 모형 가정 성립</p>
              <div className="h-64 md:h-72 w-full">
                <Plot data={[
                  { type:'scatter', mode:'markers', name:'잔차',
                    x:norm_plot_x||[], y:norm_plot_y||[],
                    marker:{color:'#1E3A8A',size:8} },
                  { type:'scatter', mode:'lines', name:'기준선',
                    x:normRefLine.x, y:normRefLine.y,
                    line:{color:'#EF4444',dash:'dash',width:1.5} },
                ]}
                  layout={{
                    autosize:true, margin:{l:50,r:20,t:10,b:40},
                    xaxis:{title:'이론적 분위수'}, yaxis:{title:'잔차'},
                    legend:{orientation:'h',y:-0.28,x:0.5,xanchor:'center'},
                    paper_bgcolor:'transparent', plot_bgcolor:'transparent'
                  }}
                  useResizeHandler style={{width:'100%',height:'100%'}} config={{displayModeBar:false}}/>
              </div>
            </div>
          </div>

          {/* Cube Plot — k=3만 */}
          {factors.length === 3 && cubeData.length > 0 && (
            <div className="bg-theme-card p-4 md:p-6 rounded-xl shadow-sm border border-theme">
              <h3 className="text-base font-bold text-theme-main mb-1 flex items-center gap-2">
                <Target size={18} className="text-[--color-primary]"/> 큐브 플롯 (3D 예측 수율 — 드래그 회전 가능)
              </h3>
              <div className="h-80 md:h-96 w-full">
                <Plot data={[{
                  type:'scatter3d', mode:'markers+text',
                  x:cubeData.map(d=>d.x), y:cubeData.map(d=>d.y), z:cubeData.map(d=>d.z),
                  text:cubeData.map(d=>`${d.pred}%`), textposition:'top center',
                  hovertemplate:`${factors[0].name}: %{x}<br>${factors[1].name}: %{y}<br>${factors[2].name}: %{z}<br>예측: %{text}<extra></extra>`,
                  marker:{ size:12, color:cubeData.map(d=>d.pred), colorscale:'RdYlGn', showscale:true,
                    colorbar:{title:'수율(%)',thickness:14,len:0.7}, line:{color:'rgba(0,0,0,0.3)',width:1} }
                }]}
                  layout={{
                    autosize:true, margin:{l:0,r:0,t:20,b:0},
                    scene:{ xaxis:{title:`${factors[0].name}(${factors[0].unit})`},
                            yaxis:{title:`${factors[1].name}(${factors[1].unit})`},
                            zaxis:{title:`${factors[2].name}(${factors[2].unit})`},
                            camera:{eye:{x:1.6,y:1.6,z:1.2}} },
                    paper_bgcolor:'transparent'
                  }}
                  useResizeHandler style={{width:'100%',height:'100%'}} config={{displayModeBar:true,displaylogo:false}}/>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button onClick={() => setCurrentTab(4)}
              className="w-full md:w-auto px-10 py-4 bg-[--color-success] text-white rounded-[12px] font-bold text-lg shadow-md hover:bg-green-600 active:scale-95 transition">
              최적해 도출하기 (Optimize)
            </button>
          </div>
        </div>
      );
    }

    // ──────────────────────────── TAB 4 ─────────────────────────────────────
    if (currentTab === 4) {
      const g  = analysisResult?.golden_solution || {};
      const pr = analysisResult?.params_raw || {};
      const ic = analysisResult?.intercept || 0;

      // 회귀식 문자열
      const eqParts = factors.map(f => {
        const v = pr[f.key]||0;
        return `${v>=0?'+':''} ${v.toFixed(3)}(${f.name})`;
      });
      const eq_str = `Ŷ = ${ic.toFixed(3)} ${eqParts.join(' ')}`;

      return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-4">
          <div className="bg-gradient-to-br from-yellow-50 to-amber-100 border border-yellow-200 p-6 md:p-8 rounded-xl shadow-sm relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-10 transform translate-x-4 -translate-y-4"><Award size={160}/></div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-8">
              <div className="flex-1">
                <h2 className="text-xl md:text-2xl font-bold text-amber-600 mb-2 flex items-center gap-2">
                  <Award size={26}/> Golden Solution (AI 회귀 최적해)
                </h2>
                <p className="text-gray-700 md:text-lg mb-5">다중 반응 최적화를 통해 산출된 <strong>최적 공정 조건</strong>입니다.</p>

                <div className={`grid gap-3 md:gap-4`} style={{gridTemplateColumns:`repeat(${factors.length},minmax(0,1fr))`}}>
                  {factors.map(f => {
                    const lv = g[f.key] ?? 1;
                    const val = lv===1 ? f.max : f.min;
                    return (
                      <div key={f.key} className="bg-white/80 p-3 md:p-4 rounded-xl text-center backdrop-blur-sm border border-yellow-300 shadow-sm">
                        <div className="text-xs text-gray-500 font-bold mb-1">{f.name}</div>
                        <div className="text-lg md:text-2xl font-black text-gray-800">
                          {val}<span className="text-xs md:text-sm text-gray-500 ml-1">{f.unit}</span>
                        </div>
                        <div className={`text-[10px] mt-1 font-bold ${lv===1?'text-green-600':'text-blue-600'}`}>
                          {lv===1 ? '+ 상단 조건' : '− 하단 조건'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ROI 카드 */}
              <div className="bg-white p-6 rounded-2xl shadow-lg border-2 border-yellow-400 w-full md:w-64 text-center">
                <div className="text-gray-500 font-bold mb-1 text-sm">연간 비용 절감 (ROI)</div>
                <div className="text-3xl font-black text-[--color-success] mb-1">₩ {roiAmountKRW}억</div>
                <div className="text-xs text-gray-400 bg-gray-100 rounded px-2 py-1 mb-2">
                  예측 수율: {predictedYield}%
                </div>
                {analysisResult?.current_avg_yield && (
                  <div className="text-xs text-gray-400 mb-2">
                    현재 {analysisResult.current_avg_yield.toFixed(1)}% → +{analysisResult.yield_gain.toFixed(1)}%p
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-theme-card p-6 border border-theme shadow-sm rounded-xl">
            <h3 className="text-lg font-bold text-theme-main mb-3 flex items-center gap-2">
              <TrendingUp size={18} className="text-[--color-primary]"/> 회귀 모델 수식
            </h3>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto border border-gray-200 dark:border-gray-700">
              <code className="text-sm text-blue-800 dark:text-blue-300 font-mono whitespace-nowrap">{eq_str}</code>
            </div>
            <p className="text-sm text-theme-muted mt-2">R-Sq = {(analysisResult.r_squared*100).toFixed(1)}%</p>
          </div>

          <div className="flex justify-end">
            <button onClick={() => setCurrentTab(5)}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-10 py-4 bg-[--color-primary] text-white rounded-[12px] font-bold text-lg shadow-md hover:bg-blue-800 active:scale-95 transition">
              현장 재현 실험하러 가기 <ArrowRight size={20}/>
            </button>
          </div>
        </div>
      );
    }

    // ──────────────────────────── TAB 5 ─────────────────────────────────────
    if (currentTab === 5) {
      const g = analysisResult?.golden_solution || {};
      return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-4">
          <div className="bg-theme-card border border-theme p-6 rounded-xl shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-[--color-primary] mb-2 flex items-center gap-2">
                  <Target size={26}/> 재현 실험 (Confirmation Runs)
                </h2>
                <p className="text-theme-muted max-w-xl">예측 수율 <strong>{predictedYield}%</strong>이 현장에서도 유효한지 3회 재현으로 검증합니다.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={downloadVerifyExcel}
                  className="flex items-center gap-1.5 border border-gray-300 dark:border-gray-600 text-theme-main px-3 py-2 rounded-lg font-bold text-sm hover:bg-gray-100 transition">
                  <DownloadCloud size={16}/><span className="hidden sm:inline">템플릿 다운</span>
                </button>
                <button onClick={() => verifyExcelRef.current?.click()}
                  className="flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 dark:bg-green-900 dark:border-green-800 dark:text-green-300 px-3 py-2 rounded-lg font-bold text-sm hover:bg-green-100 transition">
                  <UploadCloud size={16}/><span className="hidden sm:inline">엑셀 업로드</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {verifyRuns.map((r, idx) => (
                <div key={r.id} className="bg-theme-inset p-4 rounded-xl border border-theme flex flex-col md:flex-row md:items-center gap-3">
                  <div className="font-bold text-theme-main w-24 flex items-center gap-2">
                    Verify #{idx+1} {r.yieldVal!=='' && <CheckCircle size={14} className="text-[--color-success]"/>}
                  </div>
                  <div className="flex-1 flex gap-2 text-sm text-theme-main bg-theme-input p-2 rounded-lg border border-theme">
                    {factors.map((f, fi) => (
                      <div key={f.key} className={`flex-1 text-center ${fi<factors.length-1?'border-r border-theme':''}`}>
                        <span className="text-xs opacity-60 block">{f.name}</span>
                        <span className="font-bold">{g[f.key]===1?f.max:f.min}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <input type="number" placeholder="수율 입력" value={r.yieldVal}
                      onChange={e => updateVerifyYield(r.id, e.target.value)}
                      className="flex-1 md:w-28 p-3 border border-theme rounded-lg bg-theme-input text-right font-bold focus:ring-2 focus:ring-blue-500 outline-none text-theme-main"/>
                    <span className="text-theme-muted font-bold">%</span>
                  </div>
                </div>
              ))}
            </div>

            {verifyAvg && (
              <div className="mt-5 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 flex items-center gap-3">
                <CheckCircle size={20} className="text-[--color-success] flex-shrink-0"/>
                <div className="text-sm text-green-900 dark:text-green-200">
                  <strong>재현 평균: {verifyAvg}%</strong> | 예측: {predictedYield}% | 오차: {verifyError}%p
                  {parseFloat(verifyError)<=2 ? ' ✓ 신뢰구간 내 진입' : ' — 추가 검토 필요'}
                </div>
              </div>
            )}

            <div className="mt-5 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-start gap-3 border border-blue-100 dark:border-blue-800">
              <HelpCircle size={20} className="text-blue-500 flex-shrink-0 mt-0.5"/>
              <p className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed">
                <strong>검증 가이드:</strong> 재현 평균이 예측 수율({predictedYield}%) 대비 95% 신뢰구간 내에 들어오면 최적 조건을 최종 승인할 수 있습니다.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={() => setCurrentTab(6)} disabled={verifyFilled<3}
              className={`w-full md:w-auto px-10 py-4 font-bold text-lg rounded-[12px] shadow-md transition
                ${verifyFilled===3 ? 'bg-[--color-success] text-white hover:bg-green-600 active:scale-95' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
              {verifyFilled===3 ? '최종 보고서 생성 (Report)' : '3회 재현 검증 입력 필요'}
            </button>
          </div>
        </div>
      );
    }

    // ──────────────────────────── TAB 6 ─────────────────────────────────────
    if (currentTab === 6) {
      const g = analysisResult?.golden_solution || {};
      const topFactor = analysisResult
        ? Object.entries(analysisResult.tvalues||{}).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]))[0]?.[0]
        : factors[0]?.name;

      return (
        <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto pb-4">
          {/* 보고서 본문 — PDF 캡처 대상 */}
          <div ref={reportRef} className="bg-white border border-gray-200 p-6 md:p-10 rounded-xl shadow-lg">

            <div className="border-b border-gray-200 pb-6 mb-6">
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                <div>
                  <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-1">DOE 공정 최적화 결과 보고서</h2>
                  <p className="text-gray-500">생성: {new Date().toLocaleDateString('ko-KR')} | 공정: {industry} | 인자: {factors.length}개</p>
                </div>
                <div className="bg-[#10B981] text-white px-5 py-2 rounded-lg font-black text-lg self-start">최종 승인 (Pass)</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3 border-l-4 border-[#1E3A8A] pl-3">1. 핵심 진단</h3>
                  <div className="bg-blue-50 p-5 rounded-lg text-[15px] text-gray-800 leading-relaxed border border-blue-100">
                    • 가장 중요한 인자: <strong>{topFactor}</strong><br/>
                    • 최적 수율 <strong>{predictedYield}%</strong> 달성 조건 확보<br/>
                    {getAIDiagnosisLines()[0] && <span className="text-sm text-blue-700 mt-1 block">• {getAIDiagnosisLines()[0]}</span>}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3 border-l-4 border-amber-500 pl-3">2. Golden Solution</h3>
                  <div className="bg-amber-50 p-5 rounded-lg border border-amber-100">
                    <div className="flex justify-between">
                      {factors.map(f => (
                        <div key={f.key} className="text-center">
                          <div className="text-xs text-gray-500 mb-1">{f.name}</div>
                          <div className="font-bold text-xl text-gray-800">{g[f.key]===1?f.max:f.min}</div>
                          <div className="text-xs text-gray-400">{f.unit}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3 border-l-4 border-[#10B981] pl-3">3. 재현 검증</h3>
                  <div className="bg-green-50 p-5 rounded-lg text-[15px] text-gray-800 leading-relaxed border border-green-100">
                    • AI 예측: <strong>{predictedYield}%</strong><br/>
                    • 재현 평균: <strong>{verifyAvg ?? '-'}%</strong><br/>
                    • 오차: {verifyError ? `${verifyError}%p ${parseFloat(verifyError)<=2?'(신뢰구간 내 ✓)':''}` : '검증 데이터 필요'}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3 border-l-4 border-purple-500 pl-3">4. 비즈니스 ROI</h3>
                  <div className="bg-purple-50 p-5 rounded-lg text-center border border-purple-100">
                    <div className="text-sm text-gray-500 mb-1">연간 예상 절감액</div>
                    <div className="font-black text-3xl text-purple-700">₩ {roiAmountKRW}억</div>
                    {analysisResult?.yield_gain > 0 &&
                      <div className="text-xs text-gray-400 mt-1">수율 {analysisResult.yield_gain.toFixed(1)}%p 개선 기반</div>
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={generatePDF}
              disabled={pdfLoading}
              className="flex flex-1 items-center justify-center gap-2 px-6 py-4 bg-white text-gray-800 border border-gray-300 rounded-xl font-bold hover:bg-gray-50 transition shadow-sm text-lg disabled:opacity-60">
              <Download size={20} className="text-gray-600"/>
              {pdfLoading ? 'PDF 생성 중...' : 'PDF 다운로드 (실제 생성)'}
            </button>
            <button onClick={() => alert('이메일 공유 기능은 Phase 3에서 SMTP API 연동 예정입니다.')}
              className="flex flex-1 items-center justify-center gap-2 px-6 py-4 bg-theme-background border border-theme text-theme-main rounded-xl font-bold hover:opacity-80 transition shadow-sm text-lg">
              <Mail size={20}/> 이메일 공유
            </button>
            <button onClick={() => alert('메신저 공유 기능은 Phase 3에서 연동 예정입니다.')}
              className="flex flex-1 items-center justify-center gap-2 px-6 py-4 bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 rounded-xl font-bold border border-green-200 dark:border-green-800 hover:opacity-80 transition shadow-sm text-lg">
              <Share2 size={20}/> 메신저 공유
            </button>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-sm text-blue-800 dark:text-blue-200 border border-blue-100 dark:border-blue-800">
            PDF 버튼을 처음 누르면 jsPDF + html2canvas 패키지를 로드합니다.
            오류 발생 시 터미널에서 <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">npm install jspdf html2canvas</code> 실행 후 재시도해주세요.
          </div>
        </div>
      );
    }
    return null;
  };

  // ─ Tabs ───────────────────────────────────────────────────────────────────
  const tabs = [
    {id:1, label:'설계',  icon:Settings},
    {id:2, label:'입력',  icon:PenTool},
    {id:3, label:'분석',  icon:BarChart2},
    {id:4, label:'최적화',icon:Zap},
    {id:5, label:'검증',  icon:CheckCircle},
    {id:6, label:'보고서',icon:FileText},
  ];

  // ─ Main JSX ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-theme-main font-sans transition-colors duration-300">

      {/* Sidebar */}
      <div className="md:w-64 md:flex-shrink-0 bg-[var(--color-sidebar-bg)] text-white shadow-xl flex flex-col z-20">
        <header className="p-4 md:p-6 sticky md:static top-0 bg-[var(--color-header-bg)] text-[var(--color-header-text)] shadow-md border-b border-black/5 md:border-none md:shadow-none flex items-center justify-between md:flex-col md:items-start md:gap-4 transition-colors duration-300">
          <div className="flex-1">
            <h1 className="text-lg md:text-2xl font-bold tracking-wider flex items-center gap-2 text-black md:text-[var(--color-header-text)]">
              <Zap size={24} className="text-yellow-500 md:text-yellow-400" fill="currentColor"/>
              DOE Auto
            </h1>
            <p className="hidden md:block text-sm text-blue-200 opacity-90 mt-1">현장 밀착형 스마트 실험계획법</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="md:hidden bg-[#152e6e] px-2 py-1.5 rounded-lg text-xs font-bold border border-blue-800 text-white">
              STEP {currentTab}/6
            </div>
            <div className="flex items-center bg-black/5 md:bg-black/20 rounded-lg p-1">
              <Monitor size={13} className="mx-1 opacity-60 hidden sm:block text-black md:text-white"/>
              <select value={theme} onChange={e => setTheme(e.target.value)}
                className="bg-transparent text-xs font-medium outline-none cursor-pointer appearance-none px-1 text-black md:text-white">
                <option value="light-gray-blue" className="text-black">Gray+Blue</option>
                <option value="white"           className="text-black">White</option>
                <option value="black"           className="text-black">Dark</option>
              </select>
            </div>
          </div>
        </header>

        <nav className="hidden md:flex flex-col flex-1 p-4 gap-2 border-t border-black/10">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-2">WorkFlow</div>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setCurrentTab(tab.id)}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all w-full text-left ${isActive ? 'sidebar-tab-active font-extrabold text-[1.125rem]' : 'sidebar-tab-idle font-medium text-[0.95rem]'}`}>
                <Icon size={isActive?22:20} strokeWidth={isActive?2.5:2}/>
                <span>{tab.label}</span>
                {isActive && <div className="ml-auto w-2 h-2 rounded-full bg-[--color-success]"/>}
              </button>
            );
          })}

          <div className="mt-auto pt-4 border-t border-white/10 space-y-1">

            {/* DB 메시지 */}
            {dbMsg && (
              <div className={`px-2 py-1.5 text-xs rounded-lg mx-1 leading-snug ${
                dbMsg.startsWith('✓') ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'
              }`}>{dbMsg}</div>
            )}

            {/* 현재 프로젝트 표시 */}
            {projectId && (
              <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-blue-300 opacity-80">
                <Database size={11}/>
                <span className="truncate">{projectName || '저장된 프로젝트'}</span>
              </div>
            )}

            {/* DB 저장 버튼 */}
            <button
              onClick={saveProject}
              disabled={dbLoading || runs.length === 0}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-blue-200 hover:bg-blue-900/40 transition disabled:opacity-40"
            >
              <Save size={12}/>
              {dbLoading ? '저장 중...' : projectId ? 'DB 업데이트' : 'DB에 저장'}
            </button>

            {/* 프로젝트 목록 버튼 */}
            <button
              onClick={() => { setShowProjectPanel(true); loadProjectList(); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-blue-200 hover:bg-blue-900/40 transition"
            >
              <FolderOpen size={12}/> 프로젝트 목록
            </button>

            {/* 자동 저장 타임스탬프 */}
            {lastSaved && (
              <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-blue-300 opacity-50">
                <Clock size={10}/>
                로컬 저장 {lastSaved.toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
              </div>
            )}

            {/* 초기화 */}
            <button onClick={handleReset}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-300 hover:bg-red-900/30 transition">
              <RefreshCw size={11}/> 데이터 초기화
            </button>
          </div>
        </nav>
      </div>

      {/* Main */}
      <main className="flex-1 overflow-y-auto pb-24 md:pb-0 h-screen relative bg-theme-main transition-colors duration-300">
        <div className="hidden md:block absolute top-0 right-0 p-6 opacity-5 pointer-events-none"><Settings size={200}/></div>
        <div className="relative z-10 w-full">{renderTabContent()}</div>
      </main>

      {/* Mobile bottom bar */}
      <nav className="md:hidden bg-theme-card border-t border-theme fixed bottom-0 w-full flex justify-between px-1 py-1.5 shadow-[0_-4px_15px_rgba(0,0,0,0.05)] z-30 transition-colors duration-300">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setCurrentTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center p-2 rounded-xl transition-all ${isActive?'text-blue-600 bg-blue-50 dark:bg-blue-900/30 font-bold':'text-sky-400 font-medium'}`}>
              <Icon size={22} strokeWidth={isActive?2.5:2} className={isActive?'mb-1':'mb-1 opacity-70'}/>
              <span className="text-[10px]">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Hidden file inputs */}
      <input ref={excelRef}       type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} style={{display:'none'}}/>
      <input ref={verifyExcelRef} type="file" accept=".xlsx,.xls" onChange={handleVerifyUpload} style={{display:'none'}}/>

      {/* ── 프로젝트 패널 오버레이 ─────────────────────────────────────────── */}
      {showProjectPanel && (
        <div
          onClick={e => { if(e.target===e.currentTarget) setShowProjectPanel(false); }}
          style={{
            position:'absolute', inset:0, background:'rgba(0,0,0,0.45)',
            zIndex:50, display:'flex', alignItems:'flex-start', justifyContent:'flex-end',
          }}
        >
          <div className="h-full bg-theme-card shadow-2xl flex flex-col"
            style={{width:'min(420px,100vw)', borderLeft:'.5px solid var(--color-border-tertiary)'}}>

            {/* 패널 헤더 */}
            <div className="flex items-center justify-between p-5 border-b border-theme flex-shrink-0">
              <div className="flex items-center gap-2">
                <Database size={18} className="text-[--color-primary]"/>
                <span className="font-bold text-theme-main text-base">프로젝트 관리</span>
              </div>
              <button onClick={() => setShowProjectPanel(false)}
                className="text-theme-muted hover:text-theme-main p-1 rounded-lg hover:bg-theme-inset transition">
                <X size={18}/>
              </button>
            </div>

            {/* 새 프로젝트 저장 섹션 */}
            <div className="p-4 border-b border-theme flex-shrink-0">
              <p className="text-xs text-theme-muted mb-2 font-medium">현재 작업을 DB에 저장</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  placeholder={`${industry} 실험 ${new Date().toLocaleDateString('ko-KR')}`}
                  className="flex-1 px-3 py-2 text-sm border border-theme rounded-lg bg-theme-input text-theme-main focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                  onClick={saveProject}
                  disabled={dbLoading || runs.length === 0}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[--color-primary] text-white rounded-lg text-sm font-bold hover:bg-blue-800 transition disabled:opacity-50 flex-shrink-0"
                >
                  <Save size={14}/>
                  {dbLoading ? '저장 중...' : (projectId ? '업데이트' : '저장')}
                </button>
              </div>
              {runs.length === 0 && (
                <p className="text-xs text-theme-muted mt-2">실험표를 먼저 생성해야 저장할 수 있습니다.</p>
              )}
              {projectId && (
                <p className="text-xs text-[--color-success] mt-2 flex items-center gap-1">
                  <CheckCircle size={11}/> 현재 DB 연결됨 — "{projectName}"
                </p>
              )}
            </div>

            {/* 프로젝트 목록 */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-theme-muted">저장된 프로젝트</p>
                <button
                  onClick={loadProjectList}
                  disabled={dbLoading}
                  className="text-xs text-[--color-primary] hover:underline disabled:opacity-50"
                >
                  {dbLoading ? '로딩...' : '새로고침'}
                </button>
              </div>

              {dbLoading && projectList.length === 0 && (
                <div className="text-center py-8 text-sm text-theme-muted">목록 불러오는 중...</div>
              )}

              {!dbLoading && projectList.length === 0 && (
                <div className="text-center py-10">
                  <Database size={36} className="text-theme-muted opacity-20 mx-auto mb-3"/>
                  <p className="text-sm text-theme-muted">저장된 프로젝트가 없습니다.</p>
                  <p className="text-xs text-theme-muted mt-1">위에서 현재 작업을 저장해보세요.</p>
                </div>
              )}

              <div className="space-y-2">
                {projectList.map(proj => {
                  const isActive = proj.id === projectId;
                  const updatedAt = new Date(proj.updated_at);
                  const dateStr   = updatedAt.toLocaleDateString('ko-KR', {month:'2-digit', day:'2-digit'});
                  const timeStr   = updatedAt.toLocaleTimeString('ko-KR', {hour:'2-digit', minute:'2-digit'});
                  return (
                    <div key={proj.id}
                      className={`p-3 rounded-xl border transition ${
                        isActive
                          ? 'border-[--color-primary] bg-blue-50 dark:bg-blue-900/20'
                          : 'border-theme bg-theme-card hover:bg-theme-inset'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            {isActive && <div className="w-1.5 h-1.5 rounded-full bg-[--color-primary] flex-shrink-0"/>}
                            <p className="text-sm font-medium text-theme-main truncate">{proj.name}</p>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-theme-muted">
                            <span>{proj.industry}</span>
                            <span className="opacity-40">·</span>
                            <span>{dateStr} {timeStr}</span>
                          </div>
                          <div className="mt-1">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              proj.status === 'completed'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            }`}>
                              {proj.status === 'completed' ? '완료' : '진행중'}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => loadProject(proj.id, proj.name)}
                            disabled={dbLoading}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200 transition disabled:opacity-50"
                          >
                            <ChevronRight size={12}/> 불러오기
                          </button>
                          <button
                            onClick={() => deleteProject(proj.id, proj.name)}
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition"
                          >
                            <Trash2 size={13}/>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 패널 하단 안내 */}
            <div className="p-4 border-t border-theme flex-shrink-0">
              <p className="text-xs text-theme-muted leading-relaxed">
                DB 기능은 <code className="bg-theme-inset px-1 rounded">SUPABASE_URL</code> 환경변수가 설정된 경우에만 활성화됩니다.
                설정 방법은 README를 참고하세요.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
