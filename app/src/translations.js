export const translations = {
  ko: {
    title: 'DOE Auto',
    subtitle: '현장 밀착형 스마트 실험계획법',
    workflow: '작업 흐름',
    step: '단계',
    save: '저장',
    dbSave: 'DB에 저장',
    dbUpdate: 'DB 업데이트',
    projectList: '프로젝트 목록',
    reset: '데이터 초기화',
    localSaveTime: '로컬 저장',

    auth: {
      loginBtn: '로그인',
      signupBtn: '회원가입',
      loginDesc: '스마트 실험계획법 클라우드에 접속하세요',
      signupDesc: '새로운 계정을 생성하고 프로젝트를 관리하세요',
      noAccount: '계정이 없으신가요? 회원가입',
      hasAccount: '이미 계정이 있으신가요? 로그인',
      signupSuccess: '회원가입 성공!',
      signupSuccessDesc: '입력하신 이메일로 인증 링크를 보냈습니다. 링크를 클릭하여 가입을 완료해 주세요.',
      emailVerificationRequired: '이메일 인증이 완료되지 않았습니다. 메일함을 확인해 주세요.',
      logout: '로그아웃'
    },
    
    tabs: {
      1: '설계',
      2: '입력',
      3: '분석',
      4: '최적화',
      5: '검증',
      6: '보고서',
      7: '히스토리'
    },
    history: {
      comparisonTitle: '프로젝트 성과 비교 분석',
      comparisonDesc: '선택된 프로젝트들의 주요 지표를 비교합니다.',
      compareSelectMore: '비교를 위해 2개 이상의 프로젝트를 선택해주세요.'
    },

    factorConfig: {
      title: '실험 설계 (Design of Experiments)',
      desc: '실험할 인자와 범위를 설정합니다. 산업군 템플릿을 선택하여 빠르게 시작할 수 있습니다.',
      template: '산업군 템플릿 선택',
      addFactor: '인자 추가',
      generateDesign: '실험표 생성 (L8/L16/L22)',
      factorName: '인자명',
      min: '최소(Min)',
      max: '최대(Max)',
      unit: '단위',
      guide: '도움말: 인자는 2~5개까지 설정 가능하며, 생성 버튼을 누르면 통계적으로 최적화된 실험 순서가 생성됩니다.'
    },

    experimentTable: {
      title: '실험 데이터 입력',
      desc: '생성된 실험 순서에 따라 현장에서 실험을 진행하고 수율(%) 데이터를 입력하세요.',
      downloadExcel: '엑셀 템플릿',
      uploadExcel: '엑셀 업로드',
      runAnalysis: '데이터 분석 실행 (OLS)',
      completed: '입력 완료',
      total: '전체',
      guide: '도움말: 모든 수율 데이터가 입력되어야 분석이 가능합니다. 엑셀을 통해 일괄 입력할 수 있습니다.'
    },

    analysisDashboard: {
      title: 'AI 공정 진단 보고서',
      pareto: 'Pareto 차트 (t-value)',
      mainEffect: '주효과도',
      interaction: '교호작용도',
      normalProb: '정규 확률도',
      contour: 'RSM 등고선도',
      cube: '큐브 플롯',
      simulator: 'What-If 시뮬레이터',
      optimize: '최적해 도출하기 (Optimize)',
      residualVsFitted: '잔차 vs 적합값 (검정)',
      predictedVsActual: '예측 vs 실제값 (정확도)',
      guide: '도움말: Pareto 차트에서 기준선(2.1)을 넘는 인자가 통계적으로 유의미한 핵심 인자입니다.'
    },

    optimization: {
      title: 'Golden Solution (AI 회귀 최적해)',
      desc: '다중 반응 최적화를 통해 산출된 최적 공정 조건입니다.',
      predictedYield: '예측 수율',
      roi: '연간 비용 절감 (ROI)',
      regressionEq: '회귀 모델 수식',
      goToVerify: '현장 재현 실험하러 가기',
      guide: '도움말: 산출된 최적 조건을 현장에 적용하기 전, 재현 실험을 통해 반드시 검증해야 합니다.'
    },

    verification: {
      title: '재현 실험 (Confirmation Runs)',
      desc: '최적 조건이 현장에서도 유효한지 3회 재현으로 검증합니다.',
      avg: '재현 평균',
      error: '오차',
      finalReport: '최종 보고서 생성',
      guide: '도움말: 재현 평균이 예측 수율과 유사하면(오차 2%p 이내) 최적 조건이 유효한 것으로 판단합니다.'
    },

    report: {
      title: 'DOE 공정 최적화 결과 보고서',
      approval: '최종 승인 (Pass)',
      diagnosis: '1. 핵심 진단',
      goldenSolution: '2. Golden Solution',
      verification: '3. 재현 검증',
      roi: '4. 비즈니스 ROI',
      downloadReport: '보고서 다운로드 (Excel)',
      shareEmail: '이메일 공유',
      shareMsg: '메신저 공유'
    },
    excelSheets: {
      raw: '실험 데이터',
      analysis: '분석 요약',
      optimize: '최적 조건',
      verify: '검증 실험'
    }
  },
  en: {
    title: 'DOE Auto',
    subtitle: 'Smart Design of Experiments',
    workflow: 'WORKFLOW',
    step: 'Step',
    save: 'Save',
    dbSave: 'Save to DB',
    dbUpdate: 'Update DB',
    projectList: 'Projects',
    reset: 'Reset Data',
    localSaveTime: 'Local Save',
    
    auth: {
      loginBtn: 'Login',
      signupBtn: 'Sign Up',
      loginDesc: 'Access your DOE Cloud Workspace',
      signupDesc: 'Create a new account and manage your projects',
      noAccount: "Don't have an account? Sign Up",
      hasAccount: 'Already have an account? Sign In',
      signupSuccess: 'Sign up successful!',
      signupSuccessDesc: "We've sent a verification link to your email. Please click it to complete registration.",
      emailVerificationRequired: 'Email verification is not complete. Please check your inbox.',
      logout: 'Logout'
    },

    tabs: {
      1: 'Design',
      2: 'Inputs',
      3: 'Analysis',
      4: 'Optimize',
      5: 'Verify',
      6: 'Report',
      7: 'History'
    },
    history: {
      comparisonTitle: 'Project Comparison Analysis',
      comparisonDesc: 'Compare key metrics across selected projects.',
      compareSelectMore: 'Please select 2 or more projects to compare.'
    },

    factorConfig: {
      title: 'Design of Experiments (DOE)',
      desc: 'Set factors and ranges. Use industry templates to get started quickly.',
      template: 'Select Industry Template',
      addFactor: 'Add Factor',
      generateDesign: 'Generate Design (L8/L16/L22)',
      factorName: 'Factor Name',
      min: 'Min',
      max: 'Max',
      unit: 'Unit',
      guide: 'Help: You can set 2-5 factors. Clicking generate creates a statistically optimized run order.'
    },

    experimentTable: {
      title: 'Experiment Data Input',
      desc: 'Perform experiments in the field according to the generated order and enter yield(%) data.',
      downloadExcel: 'Excel Template',
      uploadExcel: 'Upload Excel',
      runAnalysis: 'Run Analysis (OLS)',
      completed: 'Completed',
      total: 'Total',
      guide: 'Help: All yield data must be entered for analysis. You can use Excel for bulk updates.'
    },

    analysisDashboard: {
      title: 'AI Diagnosis Report',
      pareto: 'Pareto Chart (t-value)',
      mainEffect: 'Main Effects',
      interaction: 'Interaction Plot',
      normalProb: 'Normal Prob Plot',
      contour: 'RSM Contour Plot',
      cube: 'Cube Plot',
      simulator: 'What-If Simulator',
      optimize: 'Derive Optimal Solution',
      residualVsFitted: 'Residuals vs Fitted',
      predictedVsActual: 'Predicted vs Actual',
      guide: 'Help: Factors exceeding the baseline (2.1) in the Pareto chart are statistically significant.'
    },

    optimization: {
      title: 'Golden Solution (AI Optimized)',
      desc: 'Optimized process conditions derived through multi-response optimization.',
      predictedYield: 'Predicted Yield',
      roi: 'Annual ROI (Savings)',
      regressionEq: 'Regression Equation',
      goToVerify: 'Go to Confirmation Runs',
      guide: 'Help: Before applying the optimal conditions to the field, you must verify them through confirmation runs.'
    },

    verification: {
      title: 'Confirmation Runs',
      desc: 'Verify the optimal conditions in the field with 3 confirmation runs.',
      avg: 'Verify Avg',
      error: 'Error',
      finalReport: 'Generate Final Report',
      guide: 'Help: If the verify average is close to the predicted yield (within 2%p error), the optimal condition is valid.'
    },

    report: {
      title: 'DOE Optimization Report',
      approval: 'Final Approval (Pass)',
      diagnosis: '1. Key Diagnosis',
      goldenSolution: '2. Golden Solution',
      verification: '3. Verification',
      roi: '4. Business ROI',
      downloadReport: 'Download Report (Excel)',
      shareEmail: 'Email Share',
      shareMsg: 'Messenger'
    },
    excelSheets: {
      raw: 'Raw Data',
      analysis: 'Analysis Summary',
      optimize: 'Optimization',
      verify: 'Verification'
    }
  }
};
