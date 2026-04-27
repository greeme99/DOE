export const DEFAULT_FACTORS = [
  { key: 'f0', name: '온도',  min: 160, max: 180, unit: '℃'  },
  { key: 'f1', name: '압력',  min: 50,  max: 70,  unit: 'bar' },
  { key: 'f2', name: '시간',  min: 10,  max: 15,  unit: 's'   },
];

export const DEFAULT_VERIFY = [{ id: 1, yieldVal: '' }, { id: 2, yieldVal: '' }, { id: 3, yieldVal: '' }];

export const RUN_COUNTS = { 2: 12, 3: 20, 4: 22, 5: 22 };

export const INDUSTRY_TEMPLATES = {
  '사출성형': [
    { key: 'f0', name: '온도',  min: 160, max: 180, unit: '℃'  },
    { key: 'f1', name: '압력',  min: 50,  max: 70,  unit: 'bar' },
    { key: 'f2', name: '시간',  min: 10,  max: 15,  unit: 's'   },
  ],
  '식각': [
    { key: 'f0', name: '전력',  min: 200, max: 400, unit: 'W'   },
    { key: 'f1', name: '압력',  min: 5,   max: 20,  unit: 'mTorr' },
    { key: 'f2', name: '가스비율', min: 30, max: 70, unit: '%'  },
  ],
  '코팅': [
    { key: 'f0', name: '회전속도', min: 1000, max: 3000, unit: 'rpm' },
    { key: 'f1', name: '온도',   min: 80,   max: 120,  unit: '℃'  },
    { key: 'f2', name: '시간',   min: 30,   max: 60,   unit: 's'   },
  ],
  '합성': [
    { key: 'f0', name: '온도',   min: 60,  max: 90,  unit: '℃'    },
    { key: 'f1', name: '촉매량', min: 1,   max: 5,   unit: 'mol%' },
    { key: 'f2', name: '반응시간', min: 2, max: 6,   unit: 'hr'   },
  ],
  '타정': [
    { key: 'f0', name: '타정압력', min: 5,  max: 15,  unit: 'kN'  },
    { key: 'f1', name: '수분함량', min: 2,  max: 5,   unit: '%'   },
    { key: 'f2', name: '혼합시간', min: 10, max: 20,  unit: 'min' },
  ],
};
