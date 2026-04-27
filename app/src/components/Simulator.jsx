import React, { useState, useMemo } from 'react';
import { Zap, Activity } from 'lucide-react';

export default function Simulator({ t, analysisResult, factors }) {
  // 초기값 계산 함수
  const getInitialValues = () => {
    if (!analysisResult || factors.length === 0) return {};
    const initial = {};
    const golden = analysisResult.golden_solution || {};
    factors.forEach(f => {
      if (golden[f.key] !== undefined) {
        initial[f.key] = golden[f.key] === 1 ? f.max : f.min;
      } else {
        initial[f.key] = (f.min + f.max) / 2;
      }
    });
    return initial;
  };

  const [sliderValues, setSliderValues] = useState(getInitialValues);

  // 예측 계산 (useMemo 사용으로 useEffect/setState 제거)
  const prediction = useMemo(() => {
    if (!analysisResult || Object.keys(sliderValues).length === 0) return 0;

    const { intercept, params_raw: pr } = analysisResult;
    
    // 1. Coded values로 변환 (-1 ~ 1)
    const coded = {};
    factors.forEach(f => {
      const val = sliderValues[f.key];
      coded[f.key] = -1 + 2 * (val - f.min) / (f.max - f.min);
    });

    // 2. 예측식 적용
    let pred = intercept;
    
    // 주효과 & 제곱항 (Quadratic)
    factors.forEach(f => {
      // 주효과
      pred += (pr[f.key] || 0) * coded[f.key];
      // 제곱항 추가
      const sqKey = `${f.key}^2`;
      if (pr[sqKey]) {
        pred += pr[sqKey] * (coded[f.key] ** 2);
      }
    });

    // 교호작용 (2-way)
    for (let i = 0; i < factors.length; i++) {
      for (let j = i + 1; j < factors.length; j++) {
        const ki = factors[i].key;
        const kj = factors[j].key;
        const interactionKey = `${ki}*${kj}`;
        if (pr[interactionKey]) {
          pred += pr[interactionKey] * coded[ki] * coded[kj];
        }
      }
    }

    return Math.max(0, Math.min(100, pred));
  }, [sliderValues, analysisResult, factors]);

  const handleSliderChange = (key, val) => {
    setSliderValues(prev => ({ ...prev, [key]: parseFloat(val) }));
  };

  if (!analysisResult) return null;

  return (
    <div className="bg-theme-card p-6 rounded-xl shadow-sm border border-theme mt-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-theme-main flex items-center gap-2">
          <Zap size={20} className="text-yellow-500" />
          {t('analysisDashboard.simulator')}
        </h3>
        <div className="bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full text-xs font-bold text-blue-600 dark:text-blue-400">
          Live Mode
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* 슬라이더 영역 */}
        <div className="space-y-6">
          {factors.map(f => (
            <div key={f.key} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-theme-main">{f.name}</span>
                <span className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">
                  {sliderValues[f.key]?.toFixed(1)} {f.unit}
                </span>
              </div>
              <input
                type="range"
                min={f.min}
                max={f.max}
                step={(f.max - f.min) / 100}
                value={sliderValues[f.key] !== undefined ? sliderValues[f.key] : (f.min + f.max) / 2}
                onChange={e => handleSliderChange(f.key, e.target.value)}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-theme-muted">
                <span>Min: {f.min}</span>
                <span>Max: {f.max}</span>
              </div>
            </div>
          ))}
        </div>

        {/* 결과 영역 */}
        <div className="flex flex-col items-center justify-center p-8 bg-theme-inset rounded-2xl border border-theme relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-green-500"></div>
          <Activity size={40} className="text-blue-500 mb-4 opacity-20" />
          <div className="text-sm font-bold text-theme-muted mb-2 uppercase tracking-widest">{t('optimization.predictedYield')}</div>
          <div className="text-6xl font-black text-theme-main mb-2">
            {prediction.toFixed(1)}<span className="text-2xl ml-1">%</span>
          </div>
          <div className="w-full max-w-xs bg-gray-200 dark:bg-gray-700 h-3 rounded-full overflow-hidden mt-4">
            <div 
              className={`h-full transition-all duration-300 ${prediction > 90 ? 'bg-green-500' : prediction > 80 ? 'bg-blue-500' : 'bg-yellow-500'}`}
              style={{ width: `${prediction}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
