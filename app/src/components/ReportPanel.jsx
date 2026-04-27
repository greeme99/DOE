import React from 'react';
import { FileText, Download, Share2, Mail, MessageCircle, CheckCircle } from 'lucide-react';

export default function ReportPanel({
  t,
  reportRef,
  industry,
  factors,
  analysisResult,
  predictedYield,
  verifyAvg,
  verifyError,
  roiAmountKRW,
  getAIDiagnosisLines,
  exportFullReport,
  exportLoading
}) {
  if (!analysisResult) return null;
  const diagLines = getAIDiagnosisLines();

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-5xl mx-auto pb-20">
      <div className="bg-white dark:bg-gray-900 border-2 border-theme p-10 md:p-16 rounded-[24px] shadow-2xl relative overflow-hidden" ref={reportRef}>
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full -mr-24 -mt-24"></div>
        <div className="flex justify-between items-start mb-12 border-b-2 border-gray-100 dark:border-gray-800 pb-8">
          <div>
            <div className="inline-block bg-[--color-primary] text-white text-[10px] font-black px-2 py-1 rounded mb-3 tracking-widest uppercase">Official DOE Report</div>
            <h1 className="text-3xl font-black text-theme-main mb-2">{t('report.title')}</h1>
            <p className="text-theme-muted font-bold">{industry} Optimized | {new Date().toLocaleDateString()}</p>
          </div>
          <div className="flex flex-col items-end">
            <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-2xl border-2 border-green-200 dark:border-green-800">
              <CheckCircle size={40} className="text-green-600 dark:text-green-400" />
            </div>
            <span className="text-xs font-black text-green-600 dark:text-green-400 mt-2 uppercase tracking-widest">{t('report.approval')}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <section className="space-y-6">
            <div>
              <h3 className="text-sm font-black text-theme-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center text-[10px]">1</span>
                {t('report.diagnosis')}
              </h3>
              <div className="space-y-3 bg-gray-50 dark:bg-gray-800/50 p-5 rounded-2xl border border-gray-100 dark:border-gray-800">
                {diagLines.map((line, i) => (
                  <p key={i} className={`text-sm leading-relaxed ${i === 0 ? 'font-bold text-theme-main' : 'text-theme-muted'}`}>
                    {line}
                  </p>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-black text-theme-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center text-[10px]">2</span>
                {t('report.goldenSolution')}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {factors.map(f => {
                  const isMax = analysisResult.golden_solution[f.key] === 1;
                  return (
                    <div key={f.key} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                      <div className="text-[10px] font-bold text-gray-400 mb-1">{f.name}</div>
                      <div className={`text-sm font-black ${isMax ? 'text-green-500' : 'text-blue-500'}`}>
                        {isMax ? f.max : f.min} <span className="text-[10px] opacity-60 ml-0.5">{f.unit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div>
              <h3 className="text-sm font-black text-theme-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center text-[10px]">3</span>
                {t('report.verification')}
              </h3>
              <div className="bg-theme-inset p-6 rounded-2xl border border-theme flex flex-col items-center">
                <div className="flex gap-8 mb-4">
                  <div className="text-center">
                    <div className="text-[10px] font-bold text-theme-muted mb-1">Expected</div>
                    <div className="text-xl font-black text-theme-main">{predictedYield}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] font-bold text-theme-muted mb-1">Actual</div>
                    <div className="text-xl font-black text-[--color-primary]">{verifyAvg}%</div>
                  </div>
                </div>
                <div className={`text-xs font-black px-4 py-1.5 rounded-full ${
                  verifyError <= 2 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>Error: {verifyError}%p ({verifyError <= 2 ? 'PASSED' : 'FAILED'})</div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-black text-theme-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center text-[10px]">4</span>
                {t('report.roi')}
              </h3>
              <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-2xl shadow-lg text-white">
                <div className="text-xs font-bold opacity-80 mb-1">Estimated Annual Savings</div>
                <div className="text-3xl font-black">₩{roiAmountKRW}</div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <button
          onClick={exportFullReport}
          disabled={exportLoading}
          className="flex items-center gap-2 px-8 py-4 bg-gray-900 text-white rounded-2xl font-bold shadow-xl hover:bg-black transition active:scale-95 disabled:opacity-50"
        >
          {exportLoading ? <Download className="animate-spin" /> : <Download size={20} />}
          {t('report.downloadReport')}
        </button>
        <div className="flex items-center gap-2 bg-theme-card p-2 rounded-2xl border border-theme">
          <button className="p-3 hover:bg-theme-inset rounded-xl transition text-theme-main" title={t('report.shareEmail')}><Mail size={20} /></button>
          <button className="p-3 hover:bg-theme-inset rounded-xl transition text-theme-main" title={t('report.shareMsg')}><MessageCircle size={20} /></button>
          <button className="p-3 hover:bg-theme-inset rounded-xl transition text-theme-main" title="Copy Link"><Share2 size={20} /></button>
        </div>
      </div>
    </div>
  );
}
