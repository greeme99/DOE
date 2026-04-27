import React from 'react';
import { Target, TrendingUp, DollarSign, ArrowRight, Activity, HelpCircle } from 'lucide-react';

export default function OptimizationPanel({
  t,
  analysisResult,
  factors,
  roiAmountKRW,
  predictedYield,
  setCurrentTab
}) {
  if (!analysisResult) return null;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-4">
      {/* 가이드 패널 */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-xl flex items-start gap-3">
        <HelpCircle size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed">
          {t('optimization.guide')}
        </p>
      </div>

      <div className="bg-theme-card border border-theme p-6 md:p-10 rounded-2xl shadow-sm">
        <h2 className="text-2xl font-bold text-theme-main mb-2 flex items-center gap-2">
          <Target size={28} className="text-[--color-success]" /> {t('optimization.title')}
        </h2>
        <p className="text-theme-muted mb-10">{t('optimization.desc')}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {/* Predicted Yield */}
          <div className="bg-theme-inset p-6 rounded-2xl border border-theme flex flex-col items-center justify-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition"><TrendingUp size={60} /></div>
            <span className="text-xs font-bold text-theme-muted uppercase tracking-widest mb-2">{t('optimization.predictedYield')}</span>
            <div className="text-5xl font-black text-[--color-primary]">{predictedYield}%</div>
          </div>

          {/* ROI */}
          <div className="bg-theme-inset p-6 rounded-2xl border border-theme flex flex-col items-center justify-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition"><DollarSign size={60} /></div>
            <span className="text-xs font-bold text-theme-muted uppercase tracking-widest mb-2">{t('optimization.roi')}</span>
            <div className="text-3xl font-black text-[--color-success]">₩{roiAmountKRW}</div>
            <span className="text-[10px] text-theme-muted mt-1">Estimated Annual Savings</span>
          </div>

          {/* Optimal Conditions */}
          <div className="bg-theme-inset p-6 rounded-2xl border border-theme lg:col-span-1 md:col-span-2">
            <span className="text-xs font-bold text-theme-muted uppercase tracking-widest mb-4 block">Optimal Conditions</span>
            <div className="space-y-3">
              {factors.map(f => {
                const isMax = analysisResult.golden_solution[f.key] === 1;
                return (
                  <div key={f.key} className="flex justify-between items-center bg-theme-card px-4 py-2 rounded-lg border border-theme">
                    <span className="text-sm font-bold text-theme-main">{f.name}</span>
                    <span className={`text-sm font-black ${isMax ? 'text-green-500' : 'text-blue-500'}`}>
                      {isMax ? f.max : f.min} <span className="text-[10px] opacity-60 ml-0.5">{f.unit}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Regression Formula */}
        <div className="bg-theme-inset p-6 rounded-2xl border border-theme mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={18} className="text-theme-muted" />
            <span className="text-xs font-bold text-theme-muted uppercase tracking-widest">{t('optimization.regressionEq')} (Coded)</span>
          </div>
          <div className="font-mono text-sm text-theme-main overflow-x-auto whitespace-nowrap py-2">
            Y = {analysisResult.intercept.toFixed(2)} 
            {Object.entries(analysisResult.params_raw || {}).map(([k, v]) => (
              <span key={k} className="ml-1">
                {v >= 0 ? '+' : '-'} {Math.abs(v).toFixed(2)}×({k})
              </span>
            ))}
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => setCurrentTab(5)}
            className="flex items-center gap-3 px-12 py-5 bg-[--color-primary] text-white rounded-[16px] font-black text-xl shadow-xl hover:bg-blue-800 active:scale-95 transition"
          >
            {t('optimization.goToVerify')} <ArrowRight size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}
