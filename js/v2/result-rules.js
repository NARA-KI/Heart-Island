import {
  CONSTRUCT_LABELS,
  CONSTRUCT_LAYERS,
  CONSTRUCT_LEVEL_THRESHOLDS,
  RESPONSE_QUALITY_THRESHOLDS,
} from './config.js';

export const CONSTRUCT_EXPLANATIONS = {
  SC: '你对关系中的确认感和明确回应的需要。',
  AU: '你在亲密中保留个人节奏和边界的需要。',
  TR: '你判断一段关系是否可信、稳定和值得靠近的方式。',
  CL: '你对情感靠近、被理解和共同感的需要。',
  PA: '你被吸引、启动热情和主动靠近的速度。',
  CM: '你把关系放进长期经营和日常维护中的倾向。',
  SI: '你对精神共鸣、意义感和理想关系的看重。',
  NV: '你对新鲜感、探索和关系可能性的开放程度。',
  RM: '你评估现实条件、节奏和长期可行性的倾向。',
  CS: '你在关系中照顾、支持和接住对方的方式。',
  EC: '你把感受、需要和想法说出来的倾向。',
  CR: '你在冲突后沟通、修复和重新靠近的倾向。',
  ER: '你整理情绪、从波动中恢复的能力倾向。',
  RI: '你愿意把时间、精力和注意力投入关系的程度。',
  MN: '过去经历、共同记忆和情绪痕迹对你的牵引。',
};

export const CONFLICT_RULES = [
  {
    id: 'MN_HIGH_ER_LOW',
    title: '记忆很深，情绪回收较慢',
    evidence: ['MN', 'ER'],
    priority: 10,
    condition: (scores) => high(scores.MN) && low(scores.ER),
    summaryTemplate: '你很容易记住关系里的细节和重量，但情绪未必能同样快地回到当下。',
    detailTemplate: '这会让你比别人更珍惜共同经历，也更容易让旧情绪影响新判断。',
    adviceTags: ['separatePastAndNow', 'nameOneFeeling'],
  },
  {
    id: 'SI_HIGH_RM_LOW',
    title: '理想很高，落地感需要补齐',
    evidence: ['SI', 'RM'],
    priority: 9,
    condition: (scores) => high(scores.SI) && low(scores.RM),
    summaryTemplate: '你会被关系的精神意义打动，但现实节奏和可执行安排可能被放到后面。',
    detailTemplate: '这不是不现实，而是你需要让理想有可以被日常承接的形状。',
    adviceTags: ['makeIdealConcrete', 'checkRealityTogether'],
  },
  {
    id: 'CL_HIGH_AU_HIGH',
    title: '想靠近，也想保有自己',
    evidence: ['CL', 'AU'],
    priority: 8,
    condition: (scores) => high(scores.CL) && high(scores.AU),
    summaryTemplate: '你并不拒绝亲密，但亲密需要给你保留呼吸和选择的空间。',
    detailTemplate: '当对方只看见你的边界时，可能会忽略你其实也有很强的靠近需要。',
    adviceTags: ['stateBoundaryWarmly', 'defineTogetherTime'],
  },
  {
    id: 'RI_HIGH_CL_LOW',
    title: '愿意投入，但不一定容易亲密表达',
    evidence: ['RI', 'CL'],
    priority: 7,
    condition: (scores) => high(scores.RI) && low(scores.CL),
    summaryTemplate: '你可能愿意为关系付出时间和行动，但不总是以柔软亲密的方式表达。',
    detailTemplate: '这会让别人看见你的投入，却未必马上感到被靠近。',
    adviceTags: ['translateActionToCare', 'askForClosenessPace'],
  },
  {
    id: 'EC_HIGH_CR_LOW',
    title: '能说出口，但修复节奏需要更稳',
    evidence: ['EC', 'CR'],
    priority: 7,
    condition: (scores) => high(scores.EC) && low(scores.CR),
    summaryTemplate: '你能表达感受和想法，但冲突后的回到关系中可能需要更多方法。',
    detailTemplate: '表达本身很重要，接下来还需要把表达变成可以一起修复的步骤。',
    adviceTags: ['pauseBeforeRepair', 'makeRepairStep'],
  },
  {
    id: 'SC_HIGH_EC_LOW',
    title: '需要确认，但表达启动偏慢',
    evidence: ['SC', 'EC'],
    priority: 6,
    condition: (scores) => high(scores.SC) && low(scores.EC),
    summaryTemplate: '你需要关系里的明确回应，但不一定会很快把这种需要说出来。',
    detailTemplate: '如果只等待对方理解，你的确认需求可能会被误读成沉默或退后。',
    adviceTags: ['makeSmallRequest', 'sayNeedEarly'],
  },
  {
    id: 'RI_HIGH_AU_LOW',
    title: '投入很强，边界需要被照看',
    evidence: ['RI', 'AU'],
    priority: 6,
    condition: (scores) => high(scores.RI) && low(scores.AU),
    summaryTemplate: '你容易把关系放在很重要的位置，也需要留意自己的空间有没有被压缩。',
    detailTemplate: '投入不是问题，关键是让投入不变成单方面消耗。',
    adviceTags: ['reserveOwnRhythm', 'checkEnergyCost'],
  },
  {
    id: 'NV_HIGH_CM_LOW',
    title: '探索感强，稳定建设较慢',
    evidence: ['NV', 'CM'],
    priority: 5,
    condition: (scores) => high(scores.NV) && low(scores.CM),
    summaryTemplate: '你容易被新的可能性吸引，但长期建设关系的节奏可能启动较慢。',
    detailTemplate: '新鲜感能打开关系，稳定感则需要被有意识地建立。',
    adviceTags: ['turnNoveltyIntoPlan', 'setMaintenanceRitual'],
  },
];

export const ADVICE_LIBRARY = {
  separatePastAndNow: { title: '区分旧记忆和当下', text: '当一个细节触动你时，先写下它属于过去经验还是当前事件，再决定要不要回应。' },
  nameOneFeeling: { title: '先说一个感受', text: '不用一次讲完整段故事，先把最核心的一个感受说出来，会更容易被接住。' },
  makeIdealConcrete: { title: '把理想落到一个动作', text: '把“希望被理解”翻译成一个本周可发生的具体相处方式。' },
  checkRealityTogether: { title: '一起校准现实节奏', text: '讨论未来前，先确认时间、精力和距离这些现实条件是否能承接。' },
  stateBoundaryWarmly: { title: '温和说出边界', text: '表达空间需要时，同时告诉对方这不是退开，而是让靠近更稳定。' },
  defineTogetherTime: { title: '约定靠近和独处', text: '把共同时间和独处时间都说清楚，关系会少一些猜测。' },
  translateActionToCare: { title: '把行动翻译成在乎', text: '做了支持对方的事之后，可以补一句“我这样做是因为我在意”。' },
  askForClosenessPace: { title: '询问对方的亲密节奏', text: '不用假设对方懂你的投入方式，直接问什么样的靠近让彼此舒服。' },
  pauseBeforeRepair: { title: '先暂停再修复', text: '冲突里先给彼此一点冷却时间，再约定一个具体的复盘时刻。' },
  makeRepairStep: { title: '把修复拆成一步', text: '不要急着解决全部问题，先确认下一步是道歉、解释还是重新约定。' },
  makeSmallRequest: { title: '提出一个小请求', text: '当你需要确认时，用一句具体请求替代长时间等待。' },
  sayNeedEarly: { title: '提前说出需要', text: '越早说清楚自己的确认需求，越不容易把沉默积累成失望。' },
  reserveOwnRhythm: { title: '保留自己的节奏', text: '投入关系时，也为自己的休息、朋友和兴趣预留固定位置。' },
  checkEnergyCost: { title: '检查投入成本', text: '如果你一直在付出，定期问自己这份投入有没有被回应。' },
  turnNoveltyIntoPlan: { title: '把新鲜感变成计划', text: '被新可能吸引时，顺手约定一个可持续的小安排。' },
  setMaintenanceRitual: { title: '建立维护仪式', text: '用一个简单固定的复盘或约会习惯，让关系不只靠情绪推进。' },
  expressOneNeed: { title: '说出一个真实需要', text: '选择一个最容易开口的需要先说，不必一次解释全部自己。' },
  askBeforeAssuming: { title: '先询问，再判断', text: '在准备下结论前，先问对方一次真实想法，减少误会累积。' },
  keepNonDiagnostic: { title: '把结果当作参考', text: '把这份结果当成观察自己的线索，而不是给关系下定论。' },
};

export function high(value) {
  return Number(value) >= 70;
}

export function low(value) {
  return Number(value) <= 35;
}

export function constructLevel(score) {
  if (score >= CONSTRUCT_LEVEL_THRESHOLDS.veryHigh) return 'veryHigh';
  if (score >= CONSTRUCT_LEVEL_THRESHOLDS.high) return 'high';
  if (score <= CONSTRUCT_LEVEL_THRESHOLDS.veryLow) return 'veryLow';
  if (score <= CONSTRUCT_LEVEL_THRESHOLDS.low) return 'low';
  return 'middle';
}

export function constructLevelText(level) {
  return ({
    veryHigh: '非常明显',
    high: '较明显',
    middle: '中等',
    low: '较低',
    veryLow: '很低',
  })[level] ?? '中等';
}

export function buildConstructRanking(constructScores) {
  return Object.entries(constructScores)
    .map(([code, score]) => ({
      code,
      label: CONSTRUCT_LABELS[code] ?? code,
      layer: CONSTRUCT_LAYERS[code] ?? '其他',
      score,
      level: constructLevel(score),
      levelText: constructLevelText(constructLevel(score)),
      explanation: CONSTRUCT_EXPLANATIONS[code] ?? '',
    }))
    .sort((a, b) => b.score - a.score || a.code.localeCompare(b.code));
}

export function detectConflicts(constructScores) {
  return CONFLICT_RULES
    .filter((rule) => rule.condition(constructScores))
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
    .map((rule) => ({
      id: rule.id,
      title: rule.title,
      evidence: rule.evidence,
      priority: rule.priority,
      summary: rule.summaryTemplate,
      detail: rule.detailTemplate,
      adviceTags: rule.adviceTags,
    }));
}

export function detectResponseQuality(scoring, answers, questionBank) {
  const validQuestionIds = new Set(questionBank.questions.map((question) => question.id));
  const flags = [];
  const answerDebug = scoring.debug?.answerDebug ?? [];
  const missingCount = questionBank.questions.filter((question) => !answers[question.id]).length;
  const invalidCount = Object.keys(answers).filter((id) => !validQuestionIds.has(id)).length;
  if (missingCount > 0) flags.push('INCOMPLETE');
  if (invalidCount > 0) flags.push('INVALID_OPTION');

  const scores = answerDebug.map((item) => item.normalizedScore);
  const avg = scores.reduce((sum, value) => sum + value, 0) / Math.max(1, scores.length);
  const variance = scores.reduce((sum, value) => sum + (value - avg) ** 2, 0) / Math.max(1, scores.length);
  const std = Math.sqrt(variance);
  const counts = scores.reduce((map, value) => {
    map[value] = (map[value] ?? 0) + 1;
    return map;
  }, {});
  const optionIds = answerDebug.map((item) => item.optionId);
  const optionCounts = optionIds.reduce((map, value) => {
    map[value] = (map[value] ?? 0) + 1;
    return map;
  }, {});
  const maxSameScoreShare = Math.max(...Object.values(counts), 0) / Math.max(1, scores.length);
  const maxSameOptionShare = Math.max(...Object.values(optionCounts), 0) / Math.max(1, optionIds.length);
  let maxSameScoreRun = 0;
  let currentRun = 0;
  let previous = null;
  for (const score of scores) {
    currentRun = score === previous ? currentRun + 1 : 1;
    previous = score;
    maxSameScoreRun = Math.max(maxSameScoreRun, currentRun);
  }
  let maxSameOptionRun = 0;
  let currentOptionRun = 0;
  let previousOption = null;
  for (const optionId of optionIds) {
    currentOptionRun = optionId === previousOption ? currentOptionRun + 1 : 1;
    previousOption = optionId;
    maxSameOptionRun = Math.max(maxSameOptionRun, currentOptionRun);
  }
  const uniqueScoreCount = Object.keys(counts).length;

  if (scores.length && std <= RESPONSE_QUALITY_THRESHOLDS.lowVariance) flags.push('LOW_VARIANCE');
  if (scores.length && maxSameScoreShare >= RESPONSE_QUALITY_THRESHOLDS.highUniformity) flags.push('HIGH_UNIFORMITY');
  if (scores.length && maxSameScoreRun >= RESPONSE_QUALITY_THRESHOLDS.maxSameScoreRun) flags.push('HIGHLY_REPETITIVE');
  if (optionIds.length && maxSameOptionShare >= RESPONSE_QUALITY_THRESHOLDS.maxSameOptionShare) flags.push('HIGH_OPTION_UNIFORMITY');
  if (optionIds.length && maxSameOptionRun >= RESPONSE_QUALITY_THRESHOLDS.maxSameOptionRun) flags.push('HIGHLY_REPETITIVE');
  if (!flags.length) flags.push('NORMAL');

  const abnormal = flags.some((flag) => flag !== 'NORMAL');
  return {
    level: abnormal ? 'review' : 'normal',
    flags,
    metrics: {
      answeredCount: scores.length,
      missingCount,
      invalidCount,
      meanScore: round(avg),
      scoreStd: round(std),
      uniqueScoreCount,
      maxSameScoreShare: round(maxSameScoreShare),
      maxSameScoreRun,
      maxSameOptionShare: round(maxSameOptionShare),
      maxSameOptionRun,
    },
    userMessage: abnormal
      ? '你这次的选择比较集中，结果可以先作为参考；之后也可以在不同状态下重新测试。'
      : '',
  };
}

export function buildNeedsStrengthsRisks({ description, topConstructs, bottomConstructs, conflicts }) {
  const needs = [
    description?.relationshipNeeds,
    ...topConstructs.slice(0, 2).map((item) => `关系中需要${item.label}被认真对待`),
  ].filter(Boolean);
  const strengths = [
    ...(description?.strengths ?? []),
    ...topConstructs.slice(0, 2).map((item) => `${item.label}较突出，容易成为你的关系辨识点`),
  ];
  const riskPatterns = [
    ...(description?.blindSpots ?? []),
    ...conflicts.slice(0, 2).map((item) => item.title),
    ...bottomConstructs.slice(0, 1).map((item) => `${item.label}较低时，相关需要可能不容易被看见`),
  ];
  const adviceTags = [
    ...conflicts.flatMap((item) => item.adviceTags),
    'expressOneNeed',
    'askBeforeAssuming',
    'keepNonDiagnostic',
  ];
  return {
    needs: unique(needs).slice(0, 3),
    strengths: unique(strengths).slice(0, 3),
    riskPatterns: unique(riskPatterns).slice(0, 2),
    adviceTags: unique(adviceTags).slice(0, 5),
  };
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function round(value, digits = 4) {
  return Number(Number(value || 0).toFixed(digits));
}
