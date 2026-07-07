export const V2_PRODUCT_VERSION = 'Heart Island v2.0 Alpha 1';
export const V2_PUBLIC_PRODUCT_NAME = '心岛计划';
export const V2_PUBLIC_PRODUCT_LABEL = 'Heart Island';
export const V2_SCORING_PROFILE = 'candidate-a';
export const V2_STORAGE_KEY = 'heart-island-v2-alpha-1-state';
export const V2_DATA_BASE = './data/v2/';
export const V2_RESULT_SCHEMA_VERSION = 'v2-trusted-beta-result-facts-1';
export const V2_REPORT_SCHEMA_VERSION = 'v2-trusted-beta-result-report-1';
export const V2_AI_REPORT_PROMPT_VERSION_PREVIOUS = 'v2-controlled-ai-report-prompt-1';
export const V2_AI_REPORT_PROMPT_VERSION = 'v2-controlled-ai-report-prompt-2';
export const V2_AI_REPORT_CONFIG_PATH = './ai-report-config.json';
export const V2_AI_REPORT_DEFAULT_ENDPOINT = '/api/v2/ai-report';
export const V2_FEEDBACK_CONFIG_PATH = './feedback-config.json';
export const V2_FEEDBACK_CLICKED_STORAGE_KEY = 'heart-island-v2-feedback-clicked';

// Existing distribution audit uses gap <= 2.5 as the near-tie threshold.
// Keep this as a "close result" flag only; it must not alter the final persona.
export const V2_CLOSE_MATCH_GAP_THRESHOLD = 2.5;

export const V2_DATA_PATHS = {
  manifest: `${V2_DATA_BASE}manifest.json`,
  questionBank: `${V2_DATA_BASE}question-bank.v2.json`,
  candidateA: `${V2_DATA_BASE}persona-target-vectors.v2.candidate-a.json`,
  candidateE: `${V2_DATA_BASE}persona-target-vectors.v2.candidate-e-adaptive-hybrid.json`,
  candidateEScoringProfile: `${V2_DATA_BASE}scoring-profile.v2.candidate-e-adaptive-hybrid.json`,
  baseline: `${V2_DATA_BASE}persona-target-vectors.v2.baseline.json`,
  descriptions: `${V2_DATA_BASE}persona-descriptions.v2.json`,
};

export const CANONICAL_PERSONA_NAMES = [
  '灯塔型',
  '守门人',
  '筑巢型',
  '收藏家',
  '候鸟型',
  '岛屿型',
  '探险家',
  '流浪诗人',
  '星火型',
  '月光型',
  '镜像型',
  '观星者',
  '同行者',
  '港湾型',
  '摆渡人',
];

export const CANONICAL_PERSONA_IDS = [
  'lighthouse',
  'gatekeeper',
  'nest-builder',
  'collector',
  'migratory-bird',
  'islander',
  'explorer',
  'wandering-poet',
  'spark',
  'moonlight',
  'mirror',
  'stargazer',
  'companion',
  'harbor',
  'ferryman',
];

export const CONSTRUCT_LABELS = {
  SC: '安全确认',
  AU: '自主边界',
  TR: '关系信任',
  CL: '亲密连接',
  PA: '激情启动',
  CM: '承诺经营',
  SI: '灵魂理想',
  NV: '新鲜探索',
  RM: '现实匹配',
  CS: '照顾支持',
  EC: '表达沟通',
  CR: '冲突修复',
  ER: '情绪调节',
  RI: '关系投入',
  MN: '回忆牵引',
};

export const V2_EXPECTED_CONSTRUCTS = Object.keys(CONSTRUCT_LABELS);

export const CONSTRUCT_LAYERS = {
  SC: '安全与信任',
  AU: '安全与信任',
  TR: '安全与信任',
  CL: '亲密与投入',
  PA: '亲密与投入',
  CM: '亲密与投入',
  SI: '理想与现实',
  NV: '理想与现实',
  RM: '理想与现实',
  CS: '支持与沟通',
  EC: '支持与沟通',
  CR: '支持与沟通',
  ER: '情绪与记忆',
  RI: '情绪与记忆',
  MN: '情绪与记忆',
};

export const CONSTRUCT_LAYER_ORDER = [...new Set(Object.values(CONSTRUCT_LAYERS))];

export const CONSTRUCT_LEVEL_THRESHOLDS = {
  veryHigh: 82,
  high: 66,
  low: 35,
  veryLow: 18,
};

export const RESPONSE_QUALITY_THRESHOLDS = {
  lowVariance: 12,
  highUniformity: 0.72,
  maxSameScoreRun: 12,
  maxSameOptionShare: 0.9,
  maxSameOptionRun: 20,
};
