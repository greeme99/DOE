import React from 'react';
import { PenTool, DownloadCloud, UploadCloud, BarChart2, CheckCircle, HelpCircle } from 'lucide-react';

export default function ExperimentTable({
  t,
  runs,
  factors,
  completedCount,
  totalRuns,
  downloadExcel,
  excelRef,
  updateYield,
  runAnalysis,
  isLoading,
  canAnalyze,
  hasYieldErrors,
  validateYield,
  isValidYield
}) {
  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-4">
      {/* 가이드 패널 */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-xl flex items-start gap-3">
        <HelpCircle size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed">
          {t('experimentTable.guide')}
        </p>
      </div>

      <div className="bg-theme-card border border-theme p-5 md:p-8 rounded-2xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-theme-main mb-2 flex items-center gap-2">
              <PenTool size={26} className="text-[--color-primary]" /> {t('experimentTable.title')}
            </h2>
            <p className="text-theme-muted">{t('experimentTable.desc')}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={downloadExcel}
              className="flex items-center gap-1.5 border border-gray-300 dark:border-gray-600 text-theme-main px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition shadow-sm"
            >
              <DownloadCloud size={18} /> {t('experimentTable.downloadExcel')}
            </button>
            <button
              onClick={() => excelRef.current?.click()}
              className="flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-green-100 transition shadow-sm"
            >
              <UploadCloud size={18} /> {t('experimentTable.uploadExcel')}
            </button>
          </div>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="text-sm font-bold text-theme-main">
              {t('experimentTable.completed')}: <span className="text-[--color-primary]">{completedCount}</span> / {totalRuns}
            </div>
            <div className="w-32 h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-[--color-primary] transition-all duration-500"
                style={{ width: `${(completedCount / totalRuns) * 100}%` }}
              ></div>
            </div>
          </div>
          {completedCount === totalRuns && !hasYieldErrors && (
            <div className="flex items-center gap-1.5 text-[--color-success] font-bold text-sm animate-pulse">
              <CheckCircle size={16} /> Ready to Analyze
            </div>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-theme shadow-sm">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="bg-theme-inset text-theme-muted text-[11px] font-black uppercase tracking-wider">
              <tr>
                <th className="px-5 py-4 w-20">Run#</th>
                {factors.map(f => (
                  <th key={f.key} className="px-5 py-4 min-w-[120px]">
                    {f.name} <span className="normal-case opacity-60">({f.unit})</span>
                  </th>
                ))}
                <th className="px-5 py-4 w-40 text-right">수율(Yield %)</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {runs.map(r => (
                <tr
                  key={r.id}
                  className={`border-t border-theme transition group hover:bg-theme-inset ${
                    isValidYield(r.yieldVal) ? 'opacity-100' : 'opacity-80'
                  }`}
                >
                  <td className="px-5 py-4 font-black text-theme-muted">#{r.runOrder}</td>
                  {factors.map(f => (
                    <td key={f.key} className="px-5 py-4">
                      <span
                        className={`inline-block px-2 py-1 rounded-md font-bold text-xs ${
                          r.factor_values[f.key] === f.max
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            : r.factor_values[f.key] === f.min
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        {r.factor_values[f.key]}
                      </span>
                    </td>
                  ))}
                  <td className="px-5 py-4">
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="0~100"
                          value={r.yieldVal}
                          onChange={e => updateYield(r.id, e.target.value)}
                          className={`w-24 p-2 text-right border rounded-lg bg-theme-card font-black text-theme-main focus:ring-2 focus:ring-blue-500 outline-none transition ${
                            validateYield(r.yieldVal) ? 'border-red-400' : 'border-theme group-hover:border-gray-400'
                          }`}
                        />
                        <span className="font-bold text-theme-muted text-xs">%</span>
                      </div>
                      {validateYield(r.yieldVal) && (
                        <span className="text-[10px] text-red-500 font-bold">{validateYield(r.yieldVal)}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-10 flex justify-center border-t border-theme pt-8">
          <button
            onClick={runAnalysis}
            disabled={!canAnalyze}
            className={`w-full md:w-auto flex items-center justify-center gap-3 px-12 py-5 rounded-[16px] font-black text-xl shadow-xl transition-all duration-300 ${
              canAnalyze
                ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white hover:scale-105 hover:shadow-blue-500/20 active:scale-95'
                : 'bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed'
            }`}
          >
            {isLoading ? <BarChart2 className="animate-spin" /> : <BarChart2 size={24} />}
            {t('experimentTable.runAnalysis')}
          </button>
        </div>
      </div>
    </div>
  );
}
