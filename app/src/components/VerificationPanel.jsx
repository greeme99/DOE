import React from 'react';
import { ClipboardCheck, DownloadCloud, FileText, HelpCircle } from 'lucide-react';

export default function VerificationPanel({
  t,
  analysisResult,
  factors,
  verifyRuns,
  verifyFilled,
  verifyAvg,
  verifyError,
  predictedYield,
  downloadVerifyExcel,
  updateVerifyYield,
  setCurrentTab
}) {
  if (!analysisResult) return null;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-4">
      {/* 가이드 패널 */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-xl flex items-start gap-3">
        <HelpCircle size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed">
          {t('verification.guide')}
        </p>
      </div>

      <div className="bg-theme-card border border-theme p-5 md:p-8 rounded-2xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-theme-main mb-2 flex items-center gap-2">
              <ClipboardCheck size={26} className="text-[--color-primary]" /> {t('verification.title')}
            </h2>
            <p className="text-theme-muted">{t('verification.desc')}</p>
          </div>
          <button
            onClick={downloadVerifyExcel}
            className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 text-theme-main px-5 py-3 rounded-xl font-bold text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <DownloadCloud size={18} /> {t('experimentTable.downloadExcel')}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-theme shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-theme-inset text-theme-muted text-[11px] font-black uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-4 w-20">No</th>
                    {factors.map(f => (
                      <th key={f.key} className="px-5 py-4">{f.name}</th>
                    ))}
                    <th className="px-5 py-4 text-right">Yield (%)</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {verifyRuns.map((r, idx) => (
                    <tr key={r.id} className="border-t border-theme">
                      <td className="px-5 py-4 font-black text-theme-muted">#{idx + 1}</td>
                      {factors.map(f => (
                        <td key={f.key} className="px-5 py-4 font-bold text-theme-main">
                          {analysisResult.golden_solution[f.key] === 1 ? f.max : f.min}
                        </td>
                      ))}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <input
                            type="number"
                            placeholder="0~100"
                            value={r.yieldVal}
                            onChange={e => updateVerifyYield(r.id, e.target.value)}
                            className="w-20 p-2 text-right border border-theme rounded-lg bg-theme-card font-black text-theme-main focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-8 bg-theme-inset rounded-2xl border border-theme relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-1 ${verifyError <= 2 ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <div className="text-sm font-bold text-theme-muted mb-6 uppercase tracking-widest">Verification Result</div>
            
            <div className="grid grid-cols-2 gap-8 w-full max-w-sm mb-8">
              <div className="text-center">
                <div className="text-xs font-bold text-theme-muted mb-1">{t('optimization.predictedYield')}</div>
                <div className="text-2xl font-black text-theme-main">{predictedYield}%</div>
              </div>
              <div className="text-center">
                <div className="text-xs font-bold text-theme-muted mb-1">{t('verification.avg')}</div>
                <div className="text-2xl font-black text-[--color-primary]">{verifyAvg}%</div>
              </div>
            </div>

            {verifyFilled && (
              <div className={`px-6 py-3 rounded-full font-black text-lg shadow-sm border ${
                verifyError <= 2 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                {t('verification.error')}: {verifyError}%p {verifyError <= 2 ? '— Valid ✓' : '— Invalid ✗'}
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 flex justify-center border-t border-theme pt-8">
          <button
            onClick={() => setCurrentTab(6)}
            disabled={!verifyFilled}
            className="w-full md:w-auto flex items-center justify-center gap-3 px-12 py-5 bg-[--color-primary] text-white rounded-[16px] font-black text-xl shadow-xl hover:bg-blue-800 disabled:opacity-40 transition"
          >
            <FileText size={24} /> {t('verification.finalReport')}
          </button>
        </div>
      </div>
    </div>
  );
}
