import React from 'react';
import { BarChart2, TrendingUp, DollarSign, Activity, ChevronRight, Projector } from 'lucide-react';
import PlotlyComponent from 'react-plotly.js';
const Plot = PlotlyComponent.default || PlotlyComponent;

export default function ComparisonPanel({ t, projectList, compareIds }) {
  const selectedProjects = projectList.filter(p => compareIds.includes(p.id));

  if (selectedProjects.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-theme-muted">
        <Activity size={48} className="mb-4 opacity-20" />
        <p>{t('history.compareSelectMore') || '비교를 위해 2개 이상의 프로젝트를 선택해주세요.'}</p>
      </div>
    );
  }

  // 데이터 가공
  const chartData = [
    {
      x: selectedProjects.map(p => p.name),
      y: selectedProjects.map(p => p.analysis_result?.r_squared * 100 || 0),
      name: 'R-Squared (%)',
      type: 'bar',
      marker: { color: '#3b82f6' }
    },
    {
      x: selectedProjects.map(p => p.name),
      y: selectedProjects.map(p => p.analysis_result?.optimal_yield_pred || 0),
      name: 'Opt. Yield (%)',
      type: 'bar',
      marker: { color: '#10b981' }
    }
  ];

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-theme-main flex items-center gap-2">
            <BarChart2 size={28} className="text-[--color-primary]" /> {t('history.comparisonTitle') || '프로젝트 성과 비교 분석'}
          </h2>
          <p className="text-theme-muted">{t('history.comparisonDesc') || '선택된 프로젝트들의 주요 지표를 비교합니다.'}</p>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-theme-card p-6 rounded-2xl border border-theme shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
              <Activity size={20} />
            </div>
            <span className="font-bold text-theme-main">평균 신뢰도 (R²)</span>
          </div>
          <div className="text-3xl font-black text-theme-main">
            {(selectedProjects.reduce((acc, p) => acc + (p.analysis_result?.r_squared || 0), 0) / selectedProjects.length * 100).toFixed(1)}%
          </div>
        </div>
        <div className="bg-theme-card p-6 rounded-2xl border border-theme shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600">
              <TrendingUp size={20} />
            </div>
            <span className="font-bold text-theme-main">최고 기대 수율</span>
          </div>
          <div className="text-3xl font-black text-theme-main">
            {Math.max(...selectedProjects.map(p => p.analysis_result?.optimal_yield_pred || 0)).toFixed(1)}%
          </div>
        </div>
        <div className="bg-theme-card p-6 rounded-2xl border border-theme shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600">
              <DollarSign size={20} />
            </div>
            <span className="font-bold text-theme-main">총 예상 절감액 (ROI)</span>
          </div>
          <div className="text-3xl font-black text-theme-main">
            ₩{(selectedProjects.reduce((acc, p) => acc + (p.analysis_result?.roi_amount || 0), 0) / 1e8).toFixed(1)}억
          </div>
        </div>
      </div>

      {/* 차트 섹션 */}
      <div className="bg-theme-card p-6 rounded-2xl border border-theme shadow-sm">
        <h3 className="text-lg font-bold text-theme-main mb-6">주요 지표 비교 차트</h3>
        <div className="w-full overflow-hidden">
          <Plot
            data={chartData}
            layout={{
              autosize: true,
              height: 400,
              margin: { l: 50, r: 30, t: 30, b: 50 },
              paper_bgcolor: 'rgba(0,0,0,0)',
              plot_bgcolor: 'rgba(0,0,0,0)',
              font: { family: 'Noto Sans KR', color: '#888' },
              barmode: 'group',
              xaxis: { gridcolor: '#eee', zeroline: false },
              yaxis: { gridcolor: '#eee', zeroline: false },
              legend: { orientation: 'h', y: -0.2 }
            }}
            config={{ responsive: true, displayModeBar: false }}
            className="w-full"
          />
        </div>
      </div>

      {/* 상세 비교 표 */}
      <div className="bg-theme-card border border-theme rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-theme-inset text-theme-muted text-[11px] font-black uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">프로젝트명</th>
              <th className="px-6 py-4">산업군</th>
              <th className="px-6 py-4">R-Squared</th>
              <th className="px-6 py-4">최적 수율</th>
              <th className="px-6 py-4">개선량</th>
              <th className="px-6 py-4">연간 ROI</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {selectedProjects.map(proj => (
              <tr key={proj.id} className="border-t border-theme hover:bg-theme-inset transition">
                <td className="px-6 py-4 font-bold text-theme-main">{proj.name}</td>
                <td className="px-6 py-4 text-theme-muted">{proj.industry}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                    (proj.analysis_result?.r_squared || 0) > 0.8 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {(proj.analysis_result?.r_squared * 100 || 0).toFixed(1)}%
                  </span>
                </td>
                <td className="px-6 py-4 font-black text-theme-main">
                  {proj.analysis_result?.optimal_yield_pred?.toFixed(1) || '--'}%
                </td>
                <td className="px-6 py-4 text-blue-600 font-bold">
                  +{proj.analysis_result?.yield_gain?.toFixed(1) || '0'}%p
                </td>
                <td className="px-6 py-4 text-theme-main font-black">
                  ₩{(proj.analysis_result?.roi_amount / 1e8 || 0).toFixed(1)}억
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
