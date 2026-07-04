export const V2_PRODUCT_VERSION = 'Heart Island v2.0 Alpha 1';
export const V2_SCORING_PROFILE = 'candidate-a';
export const V2_STORAGE_KEY = 'heart-island-v2-alpha-1-state';
export const V2_DATA_BASE = './data/v2/';

export const V2_DATA_PATHS = {
  manifest: `${V2_DATA_BASE}manifest.json`,
  questionBank: `${V2_DATA_BASE}question-bank.v2.json`,
  candidateA: `${V2_DATA_BASE}persona-target-vectors.v2.candidate-a.json`,
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
