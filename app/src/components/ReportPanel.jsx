import React from 'react';
import { FileText, Download, Share2, Mail, MessageCircle, CheckCircle, DollarSign } from 'lucide-react';

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
  const projectUrl = window.location.href;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(projectUrl)}`;

  const [showQr, setShowQr] = React.useState(false);

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-5xl mx-auto pb-20 animate-slide-up">
      <div className="bg-white dark:bg-gray-900 border-2 border-theme p-10 md:p-16 rounded-[32px] shadow-2xl relative overflow-hidden glass" ref={reportRef}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-32 -mt-32 animate-float"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/5 rounded-full -ml-24 -mb-24 animate-float" style={{ animationDelay: '1s' }}></div>
        
        <div className="flex justify-between items-start mb-16 border-b-2 border-gray-100 dark:border-gray-800 pb-10">
          <div>
            <div className="inline-block bg-[--color-primary] text-white text-[10px] font-black px-3 py-1 rounded-full mb-4 tracking-widest uppercase animate-pulse-soft">Official DOE Report</div>
            <h1 className="text-4xl font-black text-theme-main mb-3 tracking-tight">{t('report.title')}</h1>
            <p className="text-theme-muted font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              {industry} Optimized | {new Date().toLocaleDateString()}
            </p>
          </div>
          <div className="flex flex-col items-end">
            <div className="bg-emerald-100 dark:bg-emerald-900/30 p-4 rounded-3xl border-2 border-emerald-200 dark:border-emerald-800 shadow-inner">
              <CheckCircle size={48} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 mt-3 uppercase tracking-widest">{t('report.approval')}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          <section className="space-y-10">
            <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <h3 className="text-xs font-black text-theme-muted uppercase tracking-widest mb-6 flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs shadow-lg">1</span>
                {t('report.diagnosis')}
              </h3>
              <div className="space-y-4 bg-blue-50/50 dark:bg-blue-900/20 p-6 rounded-3xl border border-blue-100 dark:border-blue-800/50 relative">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-3xl"></div>
                {diagLines.map((line, i) => (
                  <p key={i} className={`text-sm leading-relaxed ${i === 0 ? 'font-black text-blue-900 dark:text-blue-100 text-base' : 'text-theme-muted'}`}>
                    {line}
                  </p>
                ))}
              </div>
            </div>

            <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <h3 className="text-xs font-black text-theme-muted uppercase tracking-widest mb-6 flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs shadow-lg">2</span>
                {t('report.goldenSolution')}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {factors.map(f => {
                  const isMax = analysisResult.golden_solution[f.key] === 1;
                  return (
                    <div key={f.key} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm card-hover">
                      <div className="text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-tighter">{f.name}</div>
                      <div className={`text-base font-black ${isMax ? 'text-emerald-500' : 'text-blue-500'}`}>
                        {isMax ? f.max : f.min} <span className="text-[10px] opacity-60 ml-0.5">{f.unit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="space-y-10">
            <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <h3 className="text-xs font-black text-theme-muted uppercase tracking-widest mb-6 flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs shadow-lg">3</span>
                {t('report.verification')}
              </h3>
              <div className="bg-theme-inset p-8 rounded-3xl border-2 border-theme flex flex-col items-center relative overflow-hidden">
                <div className="flex gap-12 mb-6">
                  <div className="text-center">
                    <div className="text-[10px] font-black text-theme-muted mb-2 uppercase opacity-60">Expected</div>
                    <div className="text-3xl font-black text-theme-main tracking-tighter">{predictedYield}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] font-black text-theme-muted mb-2 uppercase opacity-60">Actual</div>
                    <div className="text-3xl font-black text-blue-600 tracking-tighter">{verifyAvg}%</div>
                  </div>
                </div>
                <div className={`text-[10px] font-black px-6 py-2 rounded-full shadow-sm ${
                  verifyError <= 2 ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                }`}>ERROR: {verifyError}%p ({verifyError <= 2 ? 'VERIFIED' : 'FAILED'})</div>
              </div>
            </div>

            <div className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
              <h3 className="text-xs font-black text-theme-muted uppercase tracking-widest mb-6 flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs shadow-lg">4</span>
                {t('report.roi')}
              </h3>
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 rounded-3xl shadow-xl text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-20 animate-float"><DollarSign size={80} /></div>
                <div className="text-[10px] font-black opacity-80 mb-2 uppercase tracking-widest">Estimated Annual Savings</div>
                <div className="text-4xl font-black drop-shadow-md">₩{roiAmountKRW}</div>
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
        <div className="flex items-center gap-2 bg-theme-card p-2 rounded-2xl border border-theme relative">
          <button className="p-3 hover:bg-theme-inset rounded-xl transition text-theme-main" title={t('report.shareEmail')}><Mail size={20} /></button>
          <button className="p-3 hover:bg-theme-inset rounded-xl transition text-theme-main" title={t('report.shareMsg')}><MessageCircle size={20} /></button>
          <button 
            className={`p-3 hover:bg-theme-inset rounded-xl transition ${showQr ? 'text-blue-500 bg-blue-50' : 'text-theme-main'}`}
            onClick={() => setShowQr(!showQr)}
            title="Project QR"
          >
            <Share2 size={20} className={showQr ? 'animate-pulse' : ''} />
          </button>
          <button className="p-3 hover:bg-theme-inset rounded-xl transition text-theme-main" title="Copy Link"><Share2 size={20} /></button>
          
          {showQr && (
            <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-2xl border-2 border-blue-500 z-50 animate-in fade-in zoom-in duration-200">
              <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2 text-center">Scan to Open Project</div>
              <img src={qrUrl} alt="Project QR" className="w-32 h-32 rounded-lg" />
              <div className="mt-2 text-[8px] text-gray-400 text-center break-all max-w-[128px]">{projectUrl}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
