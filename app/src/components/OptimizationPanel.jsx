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
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-3xl shadow-xl flex flex-col items-center justify-center relative overflow-hidden group animate-slide-up">
            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition animate-float"><TrendingUp size={80} className="text-white" /></div>
            <span className="text-[10px] font-black text-blue-100 uppercase tracking-widest mb-2 relative z-10">{t('optimization.predictedYield')}</span>
            <div className="text-6xl font-black text-white relative z-10 drop-shadow-lg">{predictedYield}%</div>
          </div>

          {/* ROI */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 rounded-3xl shadow-xl flex flex-col items-center justify-center relative overflow-hidden group animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition animate-float"><DollarSign size={80} className="text-white" /></div>
            <span className="text-[10px] font-black text-emerald-100 uppercase tracking-widest mb-2 relative z-10">{t('optimization.roi')}</span>
            <div className="text-4xl font-black text-white relative z-10 drop-shadow-lg">₩{roiAmountKRW}</div>
            <span className="text-[10px] text-emerald-100 font-bold mt-2 opacity-80 relative z-10">Estimated Annual Savings</span>
          </div>

          {/* Optimal Conditions */}
          <div className="bg-theme-card p-8 rounded-3xl shadow-xl border-2 border-theme lg:col-span-1 md:col-span-2 animate-slide-up glass" style={{ animationDelay: '0.2s' }}>
            <span className="text-[10px] font-black text-theme-muted uppercase tracking-widest mb-6 block">Optimal Parameters</span>
            <div className="space-y-4">
              {factors.map(f => {
                const isMax = analysisResult.golden_solution[f.key] === 1;
                return (
                  <div key={f.key} className="flex justify-between items-center bg-theme-inset px-5 py-3 rounded-2xl border border-theme card-hover">
                    <span className="text-sm font-black text-theme-main">{f.name}</span>
                    <span className={`text-base font-black ${isMax ? 'text-emerald-500' : 'text-blue-500'}`}>
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

        <div className="flex justify-center mt-12">
          <button
            onClick={() => setCurrentTab(5)}
            className="flex items-center gap-4 px-16 py-6 bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-[24px] font-black text-2xl shadow-2xl shadow-blue-500/30 hover:from-blue-800 hover:to-indigo-900 animate-pulse-soft active:scale-95 transition-all duration-300"
          >
            {t('optimization.goToVerify')} <ArrowRight size={28} />
          </button>
        </div>
      </div>
    </div>
  );
}
