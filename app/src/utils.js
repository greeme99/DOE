export const validateYield = v => {
  if (v === '' || v === undefined) return null;
  const n = parseFloat(v);
  if (isNaN(n)) return '숫자를 입력해주세요';
  if (n < 0 || n > 100) return '0~100 범위 초과';
  return null;
};

export const validateFactor = f => {
  const lo = parseFloat(f.min),
    hi = parseFloat(f.max);
  if (isNaN(lo) || isNaN(hi)) return '숫자를 입력해주세요';
  if (lo >= hi) return 'Min < Max 조건 불충족';
  if (!f.name.trim()) return '인자명을 입력해주세요';
  return null;
};

export const isValidYield = v => v !== '' && !isNaN(parseFloat(v)) && validateYield(v) === null;
