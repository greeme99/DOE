import React from 'react';
import { Settings, Plus, Trash2, Play, HelpCircle } from 'lucide-react';
import { INDUSTRY_TEMPLATES } from '../constants';

export default function FactorConfig({
  t,
  industry,
  handleIndustryChange,
  factors,
  addFactor,
  removeFactor,
  updateFactor,
  generateRuns,
  isLoading,
  hasFactorErrors,
  validateFactor
}) {
  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-4">
      {/* 가이드 패널 */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-xl flex items-start gap-3">
        <HelpCircle size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed">
          {t('factorConfig.guide')}
        </p>
      </div>

      <div className="bg-theme-card border border-theme p-5 md:p-8 rounded-2xl shadow-sm transition-colors duration-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-theme-main mb-2 flex items-center gap-2">
              <Settings size={26} className="text-[--color-primary]" /> {t('factorConfig.title')}
            </h2>
            <p className="text-theme-muted">{t('factorConfig.desc')}</p>
          </div>
          <div className="flex items-center gap-2 bg-theme-inset p-1.5 rounded-xl border border-theme">
            <span className="text-xs font-bold text-theme-muted ml-2">{t('factorConfig.template')}:</span>
            <select
              value={industry}
              onChange={e => handleIndustryChange(e.target.value)}
              className="bg-transparent text-sm font-bold text-[--color-primary] outline-none cursor-pointer px-2 py-1"
            >
              {Object.keys(INDUSTRY_TEMPLATES).map(it => (
                <option key={it} value={it}>{it}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {factors.map((f, idx) => {
            const error = validateFactor(f);
            return (
              <div
                key={f.key}
                className={`p-5 rounded-2xl border transition-all duration-200 group relative ${
                  error ? 'border-red-300 bg-red-50 dark:bg-red-900/10' : 'border-theme bg-theme-inset hover:shadow-md'
                }`}
              >
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-black text-theme-muted opacity-50 uppercase tracking-widest">
                    Factor #{idx + 1}
                  </span>
                  <button
                    onClick={() => removeFactor(f.key)}
                    className="text-red-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder={t('factorConfig.factorName')}
                    value={f.name}
                    onChange={e => updateFactor(f.key, 'name', e.target.value)}
                    className="w-full bg-theme-card border border-theme rounded-xl px-4 py-3 text-sm font-bold text-theme-main focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-theme-muted uppercase ml-1">{t('factorConfig.min')}</label>
                      <input
                        type="number"
                        value={f.min}
                        onChange={e => updateFactor(f.key, 'min', e.target.value)}
                        className="w-full bg-theme-card border border-theme rounded-xl px-4 py-3 text-sm font-bold text-theme-main focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-theme-muted uppercase ml-1">{t('factorConfig.max')}</label>
                      <input
                        type="number"
                        value={f.max}
                        onChange={e => updateFactor(f.key, 'max', e.target.value)}
                        className="w-full bg-theme-card border border-theme rounded-xl px-4 py-3 text-sm font-bold text-theme-main focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder={t('factorConfig.unit')}
                    value={f.unit}
                    onChange={e => updateFactor(f.key, 'unit', e.target.value)}
                    className="w-full bg-theme-card border border-theme rounded-xl px-4 py-3 text-sm font-bold text-theme-main focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                {error && <p className="text-[10px] text-red-500 font-bold mt-3 ml-1">⚠ {error}</p>}
              </div>
            );
          })}

          {factors.length < 5 && (
            <button
              onClick={addFactor}
              className="border-2 border-dashed border-theme rounded-2xl flex flex-col items-center justify-center p-8 text-theme-muted hover:text-[--color-primary] hover:border-[--color-primary] hover:bg-blue-50 dark:hover:bg-blue-900/10 transition group"
            >
              <Plus size={32} className="mb-2 group-hover:scale-110 transition" />
              <span className="text-sm font-bold">{t('factorConfig.addFactor')}</span>
            </button>
          )}
        </div>

        <div className="flex justify-center border-t border-theme pt-8">
          <button
            onClick={generateRuns}
            disabled={isLoading || hasFactorErrors}
            className="w-full md:w-auto flex items-center justify-center gap-3 px-14 py-6 bg-[#1e3a8a] text-white rounded-[20px] font-black text-2xl shadow-[0_10px_30px_rgba(30,58,138,0.3)] hover:bg-[#1a3277] active:scale-95 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading ? <Plus className="animate-spin" /> : <Play size={24} fill="currentColor" />}
            {t('factorConfig.generateDesign')}
          </button>
        </div>
      </div>
    </div>
  );
}
