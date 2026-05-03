import React from 'react';
import { BarChart2, TrendingUp, Zap, Award, Target, HelpCircle } from 'lucide-react';
import PlotlyComponent from 'react-plotly.js';
import Simulator from './Simulator';

// Vite/ESM 환경에서 Plot 컴포넌트가 객체로 넘어오는 경우 대응
const Plot = PlotlyComponent.default || PlotlyComponent;

export default function AnalysisDashboard({
  t,
  analysisResult,
  factors,
  getAIDiagnosisLines,
  setCurrentTab
}) {
  if (!analysisResult) {
    return (
      <div className="p-8 text-center flex flex-col items-center mt-16">
        <BarChart2 size={60} className="opacity-20 mb-4 text-theme-muted" />
        <h2 className="text-xl font-bold text-theme-main mb-2">분석 데이터 없음</h2>
        <button
          onClick={() => setCurrentTab(2)}
          className="mt-4 px-8 py-3 bg-blue-100 text-[--color-primary] rounded-xl font-bold"
        >
          입력 탭으로
        </button>
      </div>
    );
  }

  const { 
    tvalues, norm_plot_x, norm_plot_y, interaction_data, r_squared,
    residuals, fitted_values, actual_values 
  } = analysisResult;
  const r_sq_display = (r_squared * 100).toFixed(1);
  const paretoData = Object.entries(tvalues)
    .map(([k, v]) => ({ k, v: Math.abs(v) }))
    .sort((a, b) => a.v - b.v);

  const normRefLine = (() => {
    if (!norm_plot_x?.length) return { x: [-2, 2], y: [-2, 2] };
    const n = norm_plot_x.length,
      xm = norm_plot_x.reduce((a, b) => a + b, 0) / n,
      ym = norm_plot_y.reduce((a, b) => a + b, 0) / n;
    const num = norm_plot_x.reduce((s, x, i) => s + (x - xm) * (norm_plot_y[i] - ym), 0);
    const den = norm_plot_x.reduce((s, x) => s + (x - xm) ** 2, 0);
    const sl = den !== 0 ? num / den : 1,
      bi = ym - sl * xm;
    const xMin = Math.min(...norm_plot_x),
      xMax = Math.max(...norm_plot_x);
    return { x: [xMin, xMax], y: [xMin * sl + bi, xMax * sl + bi] };
  })();

  const cubeData = (() => {
    if (factors.length !== 3 || !analysisResult.params_raw) return [];
    const p = analysisResult;
    const pr = p.params_raw || {};
    const fks = p.factor_keys || factors.map(f => f.key);
    const corners8 = [
      [-1, -1, -1], [1, -1, -1], [-1, 1, -1], [1, 1, -1],
      [-1, -1, 1], [1, -1, 1], [-1, 1, 1], [1, 1, 1]
    ];
    return corners8.map(([c0, c1, c2]) => {
      const [k0, k1, k2] = fks;
      const pred = p.intercept + (pr[k0] || 0) * c0 + (pr[k1] || 0) * c1 + (pr[k2] || 0) * c2 +
        (pr[`${k0}*${k1}`] || 0) * c0 * c1 + (pr[`${k0}*${k2}`] || 0) * c0 * c2 + (pr[`${k1}*${k2}`] || 0) * c1 * c2;
      const f0 = factors[0], f1 = factors[1], f2 = factors[2];
      return {
        x: c0 === 1 ? f0.max : f0.min,
        y: c1 === 1 ? f1.max : f1.min,
        z: c2 === 1 ? f2.max : f2.min,
        pred: parseFloat(pred.toFixed(1))
      };
    });
  })();

  const diagLines = getAIDiagnosisLines();
  const f0 = factors[0];

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-4">
      {/* 가이드 패널 */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-xl flex items-start gap-3">
        <HelpCircle size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed">
          {t('analysisDashboard.guide')}
        </p>
      </div>

      {/* AI 진단 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/40 dark:to-indigo-900/40 border border-blue-100 dark:border-blue-800 p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden animate-slide-up glass">
        <div className="absolute -right-4 -top-4 opacity-20 animate-float"><Zap size={160} className="text-blue-400" /></div>
        <h2 className="text-lg md:text-xl font-bold text-[--color-primary] dark:text-blue-400 mb-3 flex items-center gap-2">
          <Zap size={22} className="text-blue-500" />
          {t('analysisDashboard.title')} — R-Sq {r_sq_display}%
        </h2>
        <div className="space-y-2 relative z-10">
          {diagLines.map((line, i) => (
            <p key={i} className={`text-theme-main leading-relaxed ${i === 0 ? 'font-semibold md:text-lg' : 'text-sm md:text-base text-theme-muted'}`}>
              {i === 0 && <span className="inline-block bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold px-2 py-0.5 rounded mr-2 align-middle">핵심</span>}
              {line}
            </p>
          ))}
        </div>
      </div>

      {/* Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-theme-card p-4 md:p-6 rounded-2xl shadow-sm border border-theme card-hover animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <h3 className="text-base font-bold text-theme-main mb-1 flex items-center gap-2">
            <BarChart2 size={18} className="text-[--color-primary]" /> {t('analysisDashboard.pareto')}
          </h3>
          <p className="text-xs text-theme-muted mb-3">유의 기준선 2.1 초과(빨강) = 통계적으로 유의함</p>
          <div className="h-64 md:h-72 w-full">
            <Plot
              data={[{ type: 'bar', x: paretoData.map(d => d.v), y: paretoData.map(d => d.k), orientation: 'h', marker: { color: paretoData.map(d => d.v >= 2.1 ? '#EF4444' : '#9CA3AF') } }]}
              layout={{ autosize: true, margin: { l: 90, r: 20, t: 10, b: 40 }, xaxis: { title: '|t-value|' }, shapes: [{ type: 'line', x0: 2.1, x1: 2.1, y0: -0.5, y1: paretoData.length - 0.5, line: { color: 'red', dash: 'dash', width: 2 } }], paper_bgcolor: 'transparent', plot_bgcolor: 'transparent' }}
              useResizeHandler style={{ width: '100%', height: '100%' }} config={{ displayModeBar: false }}
            />
          </div>
        </div>

        <div className="bg-theme-card p-4 md:p-6 rounded-2xl shadow-sm border border-theme card-hover animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <h3 className="text-base font-bold text-theme-main mb-1 flex items-center gap-2">
            <TrendingUp size={18} className="text-[--color-primary]" /> {t('analysisDashboard.mainEffect')} ({f0?.name})
          </h3>
          <p className="text-xs text-theme-muted mb-3">핵심 인자 변화에 따른 예상 수율 추세</p>
          <div className="h-64 md:h-72 w-full">
            <Plot
              data={[{ type: 'scatter', mode: 'lines+markers', x: [f0?.min, f0?.max], y: [analysisResult.intercept - (analysisResult.params_raw[f0.key] || 0), analysisResult.intercept + (analysisResult.params_raw[f0.key] || 0)], line: { color: '#10B981', width: 3 }, marker: { size: 10 } }]}
              layout={{ autosize: true, margin: { l: 40, r: 20, t: 10, b: 40 }, xaxis: { title: `${f0?.name} (${f0?.unit})` }, yaxis: { title: '예상 수율 (%)' }, paper_bgcolor: 'transparent', plot_bgcolor: 'transparent' }}
              useResizeHandler style={{ width: '100%', height: '100%' }} config={{ displayModeBar: false }}
            />
          </div>
        </div>

        <div className="bg-theme-card p-4 md:p-6 rounded-2xl shadow-sm border border-theme card-hover animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <h3 className="text-base font-bold text-theme-main mb-1 flex items-center gap-2">
            <Zap size={18} className="text-[--color-primary]" /> {t('analysisDashboard.interaction')}
            <span className="text-xs text-theme-muted font-normal">({interaction_data?.factor_x} × {interaction_data?.factor_b})</span>
          </h3>
          <p className="text-xs text-theme-muted mb-3">두 선 교차 = 유의한 교호작용 존재</p>
          <div className="h-64 md:h-72 w-full">
            <Plot
              data={[
                { type: 'scatter', mode: 'lines+markers', name: `${interaction_data?.factor_b} 하단(−)`, x: [f0?.min, f0?.max], y: interaction_data?.y_b_low || [], line: { color: '#3B82F6', width: 2.5, dash: 'dash' }, marker: { size: 9 } },
                { type: 'scatter', mode: 'lines+markers', name: `${interaction_data?.factor_b} 상단(+)`, x: [f0?.min, f0?.max], y: interaction_data?.y_b_high || [], line: { color: '#10B981', width: 2.5 }, marker: { size: 9 } }
              ]}
              layout={{ autosize: true, margin: { l: 40, r: 20, t: 10, b: 50 }, xaxis: { title: `${f0?.name} (${f0?.unit})` }, yaxis: { title: '예상 수율 (%)' }, legend: { orientation: 'h', y: -0.28, x: 0.5, xanchor: 'center' }, paper_bgcolor: 'transparent', plot_bgcolor: 'transparent' }}
              useResizeHandler style={{ width: '100%', height: '100%' }} config={{ displayModeBar: false }}
            />
          </div>
        </div>

        <div className="bg-theme-card p-4 md:p-6 rounded-2xl shadow-sm border border-theme card-hover animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <h3 className="text-base font-bold text-theme-main mb-1 flex items-center gap-2">
            <Award size={18} className="text-[--color-primary]" /> {t('analysisDashboard.normalProb')}
          </h3>
          <p className="text-xs text-theme-muted mb-3">잔차가 기준선에 가까울수록 모형 가정 성립</p>
          <div className="h-64 md:h-72 w-full">
            <Plot
              data={[
                { type: 'scatter', mode: 'markers', name: '잔차', x: norm_plot_x || [], y: norm_plot_y || [], marker: { color: '#1E3A8A', size: 8 } },
                { type: 'scatter', mode: 'lines', name: '기준선', x: normRefLine.x, y: normRefLine.y, line: { color: '#EF4444', dash: 'dash', width: 1.5 } }
              ]}
              layout={{ autosize: true, margin: { l: 50, r: 20, t: 10, b: 40 }, xaxis: { title: '이론적 분위수' }, yaxis: { title: '잔차' }, legend: { orientation: 'h', y: -0.28, x: 0.5, xanchor: 'center' }, paper_bgcolor: 'transparent', plot_bgcolor: 'transparent' }}
              useResizeHandler style={{ width: '100%', height: '100%' }} config={{ displayModeBar: false }}
            />
          </div>
        </div>

        {/* 잔차 vs 적합값 (Diagnostic 1) */}
        <div className="bg-theme-card p-4 md:p-6 rounded-2xl shadow-sm border border-theme card-hover animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <h3 className="text-base font-bold text-theme-main mb-1 flex items-center gap-2">
            <BarChart2 size={18} className="text-indigo-500" /> {t('analysisDashboard.residualVsFitted')}
          </h3>
          <p className="text-xs text-theme-muted mb-3">무작위 분포일수록 좋은 모델 (등분산성)</p>
          <div className="h-64 md:h-72 w-full">
            <Plot
              data={[
                { type: 'scatter', mode: 'markers', x: fitted_values || [], y: residuals || [], marker: { color: '#6366F1', size: 8 } }
              ]}
              layout={{ 
                autosize: true, margin: { l: 50, r: 20, t: 10, b: 40 }, 
                xaxis: { title: '적합값 (Fitted)' }, yaxis: { title: '잔차 (Residuals)' }, 
                shapes: [{ type: 'line', x0: Math.min(...(fitted_values || [0])), x1: Math.max(...(fitted_values || [1])), y0: 0, y1: 0, line: { color: '#94A3B8', width: 1 } }],
                paper_bgcolor: 'transparent', plot_bgcolor: 'transparent' 
              }}
              useResizeHandler style={{ width: '100%', height: '100%' }} config={{ displayModeBar: false }}
            />
          </div>
        </div>

        {/* 예측 vs 실제 (Diagnostic 2) */}
        <div className="bg-theme-card p-4 md:p-6 rounded-2xl shadow-sm border border-theme card-hover animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <h3 className="text-base font-bold text-theme-main mb-1 flex items-center gap-2">
            <Target size={18} className="text-green-500" /> {t('analysisDashboard.predictedVsActual')}
          </h3>
          <p className="text-xs text-theme-muted mb-3">대각선에 가까울수록 정확도가 높음</p>
          <div className="h-64 md:h-72 w-full">
            <Plot
              data={[
                { type: 'scatter', mode: 'markers', x: actual_values || [], y: fitted_values || [], marker: { color: '#10B981', size: 8 } },
                { type: 'scatter', mode: 'lines', x: [Math.min(...(actual_values || [0])), Math.max(...(actual_values || [1]))], y: [Math.min(...(actual_values || [0])), Math.max(...(actual_values || [1]))], line: { color: '#EF4444', dash: 'dash', width: 1 } }
              ]}
              layout={{ autosize: true, margin: { l: 50, r: 20, t: 10, b: 40 }, xaxis: { title: '실제값 (Actual)' }, yaxis: { title: '예측값 (Predicted)' }, showlegend: false, paper_bgcolor: 'transparent', plot_bgcolor: 'transparent' }}
              useResizeHandler style={{ width: '100%', height: '100%' }} config={{ displayModeBar: false }}
            />
          </div>
        </div>
      </div>

      {/* Simulator Section */}
      <Simulator t={t} analysisResult={analysisResult} factors={factors} />

      {/* RSM Contour Plot */}
      {factors.length >= 2 && (
        <div className="bg-theme-card p-4 md:p-6 rounded-xl shadow-sm border border-theme">
          <h3 className="text-base font-bold text-theme-main mb-1 flex items-center gap-2">
            <TrendingUp size={18} className="text-[--color-primary]" /> {t('analysisDashboard.contour')}
          </h3>
          <p className="text-xs text-theme-muted mb-3">
            {factors[0].name}와 {factors[1].name}의 최적 조합 탐색
          </p>
          <div className="h-80 md:h-[400px] w-full">
            <Plot
              data={[
                (() => {
                  const f0 = factors[0], f1 = factors[1];
                  const pr = analysisResult.params_raw || {};
                  const ic = analysisResult.intercept;
                  const steps = 20;
                  const xValues = Array.from({length: steps}, (_, i) => f0.min + (f0.max - f0.min) * (i / (steps-1)));
                  const yValues = Array.from({length: steps}, (_, i) => f1.min + (f1.max - f1.min) * (i / (steps-1)));
                  const zValues = yValues.map(y => {
                    const c1 = -1 + 2 * (y - f1.min) / (f1.max - f1.min);
                    return xValues.map(x => {
                      const c0 = -1 + 2 * (x - f0.min) / (f0.max - f0.min);
                      let pred = ic;
                      pred += (pr[f0.key] || 0) * c0 + (pr[f0.key + '^2'] || 0) * (c0**2);
                      pred += (pr[f1.key] || 0) * c1 + (pr[f1.key + '^2'] || 0) * (c1**2);
                      pred += (pr[`${f0.key}*${f1.key}`] || 0) * c0 * c1;
                      return parseFloat(pred.toFixed(2));
                    });
                  });
                  return { z: zValues, x: xValues, y: yValues, type: 'contour', colorscale: 'RdYlGn', contours: { showlabels: true } };
                })()
              ]}
              layout={{ autosize: true, margin: { l: 60, r: 40, t: 20, b: 60 }, xaxis: { title: `${f0.name} (${f0.unit})` }, yaxis: { title: `${factors[1].name} (${factors[1].unit})` }, paper_bgcolor: 'transparent' }}
              useResizeHandler style={{ width: '100%', height: '100%' }} config={{ displayModeBar: false }}
            />
          </div>
        </div>
      )}

      {/* Cube Plot */}
      {factors.length === 3 && cubeData.length > 0 && (
        <div className="bg-theme-card p-4 md:p-6 rounded-xl shadow-sm border border-theme">
          <h3 className="text-base font-bold text-theme-main mb-1 flex items-center gap-2">
            <Target size={18} className="text-[--color-primary]" /> {t('analysisDashboard.cube')}
          </h3>
          <div className="h-80 md:h-96 w-full">
            <Plot
              data={[{ type: 'scatter3d', mode: 'markers+text', x: cubeData.map(d => d.x), y: cubeData.map(d => d.y), z: cubeData.map(d => d.z), text: cubeData.map(d => `${d.pred}%`), marker: { size: 12, color: cubeData.map(d => d.pred), colorscale: 'RdYlGn', showscale: true } }]}
              layout={{ autosize: true, margin: { l: 0, r: 0, t: 20, b: 0 }, scene: { xaxis: { title: factors[0].name }, yaxis: { title: factors[1].name }, zaxis: { title: factors[2].name } }, paper_bgcolor: 'transparent' }}
              useResizeHandler style={{ width: '100%', height: '100%' }} config={{ displayModeBar: true }}
            />
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => setCurrentTab(4)}
          className="w-full md:w-auto px-10 py-4 bg-[--color-success] text-white rounded-[12px] font-bold text-lg shadow-md hover:bg-green-600 transition"
        >
          {t('analysisDashboard.optimize')}
        </button>
      </div>
    </div>
  );
}
