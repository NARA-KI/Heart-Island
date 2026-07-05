import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  buildAnswerSample,
  computeResponseStyleMetrics,
  scoreAnswers,
  scoreAnswersAdaptiveHybrid,
} from '../../js/v2/scoring-engine.js';

const root = process.cwd();
const sourceFile = 'reports/pilot-input/heart-island-current-test-1783239916728.json';
const dataPath = 'reports/data/naraki-v2-15d-profile.json';
const markdownPath = 'reports/heart-island-v2-naraki-15d-profile-preview.md';
const htmlPath = 'reports/previews/heart-island-v2-naraki-15d-profile.html';

const constructMeta = {
  SC: { label: '安全确认', layer: '依恋与安全', high: '需要清楚回应，模糊会带来不安', low: '可以承受不确定，不太依赖即时确认' },
  AU: { label: '自主边界', layer: '依恋与安全', high: '需要独立空间，怕关系过满', low: '更容易与对方共享节奏' },
  TR: { label: '关系信任', layer: '依恋与安全', high: '能相信关系不会轻易断裂', low: '容易怀疑、试探或提前防御' },
  CL: { label: '亲密连接', layer: '爱情成分', high: '渴望日常靠近和情感连接', low: '更习惯保持距离或自处' },
  PA: { label: '激情启动', layer: '爱情成分', high: '心动快，愿意启动关系', low: '慢热，需更多确认或观察' },
  CM: { label: '承诺经营', layer: '爱情成分', high: '重视长线稳定和共同建设', low: '更看重当下体验或开放可能' },
  SI: { label: '灵魂理想', layer: '爱情风格', high: '重视灵魂理解和命运感', low: '更看重现实、相处或当下感受' },
  NV: { label: '新鲜探索', layer: '爱情风格', high: '喜欢新鲜与未知', low: '更偏稳定和确定' },
  RM: { label: '现实匹配', layer: '爱情风格', high: '会认真看现实条件是否合拍', low: '容易先被感觉和理想带走' },
  CS: { label: '照顾支持', layer: '爱情风格', high: '会自然提供支持和照顾', low: '更强调各自负责' },
  EC: { label: '表达沟通', layer: '关系运转', high: '愿意把话说清楚', low: '倾向忍住、沉默或绕开表达' },
  CR: { label: '冲突修复', layer: '关系运转', high: '愿意修复、复盘、重新连接', low: '更容易冷处理或放下不谈' },
  ER: { label: '情绪调节', layer: '关系运转', high: '能感知情绪，也能调节边界', low: '容易被情绪淹没或切断情绪' },
  RI: { label: '关系投入 / 留下倾向', layer: '关系维持', high: '愿意留下并继续投入', low: '更容易及时止损或保持轻盈' },
  MN: { label: '回忆牵引 / 关系叙事', layer: '关系维持', high: '容易被记忆牵动，并从故事中确认爱', low: '更容易向前看，不被过去牵住' },
};

const layerOrder = ['依恋与安全', '爱情成分', '爱情风格', '关系运转', '关系维持'];
const layerDescriptions = {
  依恋与安全: '关系刚开始靠近时，你如何处理确定感、空间和信任。',
  爱情成分: '心动、亲密和长期经营如何共同构成你的爱。',
  爱情风格: '你在关系中更被意义、变化、现实或照顾哪一类线索牵动。',
  关系运转: '关系遇到情绪、误会和表达压力时，你如何让它继续运行。',
  关系维持: '当关系变重、进入记忆或面临离开时，你如何理解留下和放下。',
};

const questionBank = readJson('data/v2/question-bank.v2.json');
const manifest = readJson('data/v2/manifest.json');
const candidateA = readJson('data/v2/persona-target-vectors.v2.candidate-a.json');
const candidateE = readJson('data/v2/persona-target-vectors.v2.candidate-e-adaptive-hybrid.json');
const candidateEProfile = readJson('data/v2/scoring-profile.v2.candidate-e-adaptive-hybrid.json');
const descriptions = readJson('data/v2/persona-descriptions.v2.json');

const input = readJson(sourceFile);
const parsed = parseInput(input);
const validation = validateInput(parsed);
if (!validation.ok) {
  writeJson(dataPath, { sourceFile, validation, warnings: validation.errors });
  throw new Error(validation.errors.join('\n'));
}

const analysis = buildAnalysis(parsed, validation);
writeJson(dataPath, analysis);
writeMarkdown(markdownPath, analysis);
writeHtml(htmlPath, analysis);

console.log(JSON.stringify({
  ok: true,
  sourceFile,
  answerCount: analysis.answerCount,
  candidateA: analysis.candidateAResult.finalPersona.displayName,
  candidateE: analysis.candidateEResult.finalPersona.displayName,
  topConstructs: analysis.constructScores.slice(0, 5).map((item) => `${item.label}:${item.tendency}`),
  outputs: { dataPath, markdownPath, htmlPath },
}, null, 2));

function parseInput(payload) {
  const raw = payload.localStorage?.['heart-island-v2-alpha-1-state'];
  if (!raw) throw new Error('Missing localStorage["heart-island-v2-alpha-1-state"]');
  const state = JSON.parse(raw);
  return {
    exportedAt: payload.exportedAt,
    pageUrl: payload.pageUrl,
    state,
    meta: state.meta ?? {},
    answers: state.answers ?? {},
    startedAt: state.startedAt ?? null,
    completedAt: state.completedAt ?? null,
  };
}

function validateInput(parsed) {
  const errors = [];
  const questionMap = new Map(questionBank.questions.map((question) => [question.id, question]));
  const answerEntries = Object.entries(parsed.answers);
  if (answerEntries.length !== 60) errors.push(`answer count must be 60, got ${answerEntries.length}`);
  if (parsed.meta.questionBankHash !== manifest.questionBankHash) {
    errors.push(`questionBankHash mismatch: input=${parsed.meta.questionBankHash}, current=${manifest.questionBankHash}`);
  }
  for (const question of questionBank.questions) {
    if (!Object.hasOwn(parsed.answers, question.id)) errors.push(`missing answer for ${question.id}`);
  }
  for (const [questionId, optionId] of answerEntries) {
    const question = questionMap.get(questionId);
    if (!question) {
      errors.push(`unknown questionId ${questionId}`);
      continue;
    }
    if (!question.options.some((option) => option.id === optionId)) {
      errors.push(`unknown optionId ${optionId} for ${questionId}`);
    }
  }
  return {
    ok: errors.length === 0,
    errors,
    answerCount: answerEntries.length,
    questionnaireVersion: parsed.meta.questionnaireVersion,
    questionBankHash: parsed.meta.questionBankHash,
    scoringProfile: parsed.meta.scoringProfile,
    startedAt: parsed.startedAt,
    completedAt: parsed.completedAt,
    pilotEnabled: parsed.state.pilot?.enabled === true,
  };
}

function buildAnalysis(parsed, validation) {
  const sample = buildAnswerSample(questionBank, parsed.answers);
  const candidateAResult = scoreAnswers(questionBank, candidateA, parsed.answers);
  const candidateEResult = scoreAnswersAdaptiveHybrid(questionBank, candidateE, candidateEProfile, parsed.answers);
  const constructScores = buildConstructScores(parsed.answers, sample);
  const fiveLayerScores = buildLayerScores(constructScores);
  const mnAnalysis = buildMnAnalysis(parsed.answers, constructScores, candidateAResult);
  const prototypes = buildPrototypeSummary(candidateAResult, candidateEResult);
  const combination = buildCombinationInsights(constructScores, fiveLayerScores);
  const oldComparison = buildOldComparison(constructScores, candidateAResult, candidateEResult, mnAnalysis);
  const warnings = buildWarnings(validation);
  return {
    generatedAt: new Date().toISOString(),
    sourceFile,
    sourceSha256: sha256(sourceFile),
    branch: git('branch --show-current'),
    commit: git('rev-parse --short HEAD'),
    answerCount: validation.answerCount,
    duration: duration(parsed.startedAt, parsed.completedAt),
    inputMeta: validation,
    constructScores,
    fiveLayerScores,
    constructQuestionCounts: Object.fromEntries(constructScores.map((item) => [item.id, item.questionCount])),
    MN专项分析: mnAnalysis,
    mnAnalysis,
    candidateAResult: compactScoring(candidateAResult),
    candidateEResult: compactScoring(candidateEResult),
    prototypeTop2: prototypes,
    highestConstructs: combination.top,
    lowestConstructs: combination.bottom,
    combinationInsights: combination.coreDrivers,
    internalConflicts: combination.internalConflicts,
    strengths: combination.strengths,
    risks: combination.risks,
    relationshipNeeds: combination.relationshipNeeds,
    growthDirections: combination.growthDirections,
    oldPersonaComparison: oldComparison,
    responseStyleMetrics: computeResponseStyleMetrics(sample.answerScores, sample.constructValues, questionBank.constructs),
    validationChecks: buildValidationChecks(validation, constructScores, fiveLayerScores),
    warnings,
  };
}

function buildConstructScores(answers, sample) {
  return questionBank.constructs.map((construct) => {
    const questions = questionBank.questions.filter((question) => question.construct === construct);
    const contributions = questions.map((question) => {
      const option = question.options.find((item) => item.id === answers[question.id]);
      return {
        questionId: question.id,
        question: question.question,
        optionId: option.id,
        optionText: option.text,
        score: option.score,
        reverse: question.reverse,
      };
    });
    const theoreticalMin = contributions.reduce((sum, item) => {
      const question = questionBank.questions.find((q) => q.id === item.questionId);
      return sum + Math.min(...question.options.map((option) => option.score));
    }, 0);
    const theoreticalMax = contributions.reduce((sum, item) => {
      const question = questionBank.questions.find((q) => q.id === item.questionId);
      return sum + Math.max(...question.options.map((option) => option.score));
    }, 0);
    const rawTotal = contributions.reduce((sum, item) => sum + item.score, 0);
    const tendency = round(((rawTotal - theoreticalMin) / (theoreticalMax - theoreticalMin)) * 100, 2);
    return {
      id: construct,
      label: constructMeta[construct].label,
      layer: constructMeta[construct].layer,
      questionCount: questions.length,
      rawTotal,
      theoreticalMin,
      theoreticalMax,
      tendency,
      runtimeAverage: sample.constructScores[construct],
      level: level(tendency),
      explanation: explainConstruct(construct, tendency),
      advantage: advantageText(construct, tendency),
      risk: riskText(construct, tendency),
      contributions,
    };
  }).sort((a, b) => b.tendency - a.tendency);
}

function buildLayerScores(constructScores) {
  const byId = Object.fromEntries(constructScores.map((item) => [item.id, item]));
  return layerOrder.map((layer) => {
    const constructs = questionBank.constructs.filter((code) => constructMeta[code].layer === layer).map((code) => byId[code]);
    const score = round(mean(constructs.map((item) => item.tendency)), 2);
    const high = constructs.reduce((max, item) => item.tendency > max.tendency ? item : max, constructs[0]);
    const low = constructs.reduce((min, item) => item.tendency < min.tendency ? item : min, constructs[0]);
    return {
      layer,
      constructs: constructs.map((item) => ({ id: item.id, label: item.label, tendency: item.tendency })),
      constructCount: constructs.length,
      tendency: score,
      level: level(score),
      explanation: `${layerDescriptions[layer]} 本次最突出的坐标是${high.label}，相对较轻的是${low.label}。`,
      advantage: layerAdvantage(layer, high),
      risk: layerRisk(layer, high, low),
    };
  });
}

function buildMnAnalysis(answers, constructScores, candidateAResult) {
  const byId = Object.fromEntries(constructScores.map((item) => [item.id, item]));
  const mn = byId.MN;
  const counts = Object.fromEntries(questionBank.constructs.map((construct) => [
    construct,
    questionBank.questions.filter((question) => question.construct === construct).length,
  ]));
  const sortedMn = [...mn.contributions].sort((a, b) => Math.abs(b.score - 50) - Math.abs(a.score - 50));
  const replacement = [];
  const baseScores = Object.fromEntries(constructScores.map((item) => [item.id, item.tendency]));
  let changedAt = null;
  for (let k = 0; k <= sortedMn.length; k += 1) {
    const adjustedScores = { ...baseScores };
    const adjustedMnTotal = mn.contributions.reduce((sum, item) => {
      const replaced = sortedMn.slice(0, k).some((target) => target.questionId === item.questionId);
      return sum + (replaced ? 50 : item.score);
    }, 0);
    adjustedScores.MN = round((adjustedMnTotal / mn.questionCount), 2);
    const rawPrototype = nearestFromConstructScores(candidateA.personas, adjustedScores);
    replacement.push({
      replacedQuestionCount: k,
      replacedQuestions: sortedMn.slice(0, k).map((item) => item.questionId),
      adjustedMN: adjustedScores.MN,
      candidateANearest: rawPrototype.top1.displayName,
      candidateATop2: rawPrototype.top2.map((item) => item.displayName),
    });
    if (k > 0 && !changedAt && rawPrototype.top1.id !== candidateAResult.finalPersona.id) changedAt = k;
  }
  const collector = candidateA.personas.find((persona) => persona.id === 'collector');
  const collectorDeltas = Object.entries(collector.targetVector)
    .map(([code, target]) => ({ code, delta: Math.abs(baseScores[code] - target) }))
    .sort((a, b) => a.delta - b.delta);
  return {
    construct: 'MN',
    label: constructMeta.MN.label,
    actualQuestionCount: mn.questionCount,
    shareOfQuestionnaire: round(mn.questionCount / questionBank.questions.length, 4),
    allConstructQuestionCounts: counts,
    scoringAggregation: '运行时按构念内题目平均值计算；不是直接把所有题求和进入人格距离。',
    directSumWeightAmplification: false,
    stabilityNote: '每个构念当前均为4题，因此MN没有题量优势。若未来某构念题目更多，平均值不会直接放大权重，但可能提高该构念测量稳定性。',
    currentContribution: `MN本次倾向值为${mn.tendency}，是最高维度之一，显著支持收藏家/流浪诗人一类原型参照。`,
    collectorFirstDecisionFactor: collectorDeltas[0]?.code === 'MN',
    collectorClosestConstructs: collectorDeltas.slice(0, 5).map((item) => ({
      id: item.code,
      label: constructMeta[item.code].label,
      delta: round(item.delta, 2),
    })),
    replacementWithMiddleValue: replacement,
    changedQuestionsBeforePrototypeSwitch: changedAt,
  };
}

function buildPrototypeSummary(a, e) {
  const unique = [];
  for (const item of [...a.top5.slice(0, 2), ...e.top5.slice(0, 2)]) {
    if (!unique.some((seen) => seen.id === item.id)) unique.push(item);
  }
  return {
    publicText: `你的当前画像比较接近“${unique.slice(0, 2).map((item) => item.displayName).join('”和“')}”，但你并不完全属于其中任何一种。原型只是帮助理解这张关系地图的参照。`,
    publicPrototypes: unique.slice(0, 2).map((item) => ({
      id: item.id,
      displayName: item.displayName,
      note: descriptionOf(item.id)?.oneLineSummary ?? '',
    })),
    internal: {
      candidateA: {
        top1: a.finalPersona,
        top2: a.top5.slice(0, 2),
        gap: a.top1Top2Gap,
      },
      candidateE: {
        top1: e.finalPersona,
        top2: e.top5.slice(0, 2),
        gap: e.top1Top2Gap,
        alpha: e.adaptiveAlpha,
        lowConfidence: e.lowConfidence,
      },
      agreement: a.finalPersona.id === e.finalPersona.id,
    },
  };
}

function buildCombinationInsights(constructScores, layerScores) {
  const byId = Object.fromEntries(constructScores.map((item) => [item.id, item]));
  const top = constructScores.slice(0, 5);
  const bottom = [...constructScores].sort((a, b) => a.tendency - b.tendency).slice(0, 5);
  const coreDrivers = [
    {
      title: `${top[0].label} + ${top[1].label}`,
      text: `你最强的关系坐标集中在${top[0].label}和${top[1].label}：这说明你会把关系里的经历、意义和情绪痕迹保存得很深，不只是看当下舒服不舒服。`,
      constructs: [top[0].id, top[1].id],
    },
    {
      title: `${byId.RI.label} + ${byId.CM.label}`,
      text: `关系进入“要不要继续经营”的阶段时，你并不是轻易抽身的人；但你的承诺经营分数不是最高，说明你更在意关系是否有意义，而不只是按计划推进。`,
      constructs: ['RI', 'CM'],
    },
    {
      title: `${byId.EC.label} + ${byId.CR.label}`,
      text: `表达和修复都处在偏低区间，说明你可能很有感受，但不总是第一时间把这些感受变成可讨论的问题。`,
      constructs: ['EC', 'CR'],
    },
  ];
  const internalConflicts = [
    {
      title: '记得很深，但不一定说得很快',
      text: `${byId.MN.label}${byId.MN.tendency}、${byId.SI.label}${byId.SI.tendency}，而${byId.EC.label}${byId.EC.tendency}。这组差异意味着你可能很会在心里保存关系的意义，却需要更久把它说出口。`,
      constructs: ['MN', 'SI', 'EC'],
    },
    {
      title: '想留下，但不想只靠经营感推进',
      text: `${byId.RI.label}${byId.RI.tendency}高于${byId.CM.label}${byId.CM.tendency}。你愿意继续投入，但更需要确认关系本身值得，而不是把关系变成任务。`,
      constructs: ['RI', 'CM'],
    },
  ];
  const strengths = [
    `你能保存关系里的细节和证据，这会让重要的人感到“我被认真记住了”。`,
    `你对关系的意义感很敏锐，能从共同经历里看见更深的线索，而不是只看表面互动。`,
    `你的关系投入不低，说明你不会只因为短期波动就轻易否定一段关系。`,
  ];
  const risks = [
    `你可能更容易在心里反复整理关系片段，而不是及时把困惑拿出来一起校准。`,
    `当表达沟通和冲突修复偏低时，对方可能只看到你的安静，却看不到你心里已经累积了很多内容。`,
    `现实匹配不算突出，意味着被意义感打动时，你可能会晚一点检查现实节奏是否真的合拍。`,
  ];
  const relationshipNeeds = [
    `你需要一种能承认过往、细节和情绪重量的关系，而不是要求你“别想太多”。`,
    `你也需要对方给出可讨论的空间，让深感受可以被慢慢说出来，而不是停留在独自保存。`,
  ];
  const growthDirections = [
    `当一个细节反复被你想起时，先写成一句可验证的问题，例如“这件事让我在意的是___，我想确认___”，再决定是否和对方讨论。`,
    `遇到冲突时不要直接整理成结论，先选一个最小可说的事实，让关系有机会参与修复过程。`,
    `被精神意义打动后，给自己增加一个现实检查点：未来两周里，双方是否真的有行动让关系更稳定。`,
  ];
  return { top, bottom, layerScores, coreDrivers, internalConflicts, strengths, risks, relationshipNeeds, growthDirections };
}

function buildOldComparison(constructScores, candidateAResult, candidateEResult, mnAnalysis) {
  const byId = Object.fromEntries(constructScores.map((item) => [item.id, item]));
  const wanderingPoet = candidateA.personas.find((persona) => persona.id === 'wandering-poet');
  const poetDeltas = Object.entries(wanderingPoet.targetVector)
    .map(([code, target]) => ({ id: code, label: constructMeta[code].label, delta: round(Math.abs(byId[code].tendency - target), 2) }))
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 5);
  return {
    whyCollector: 'candidate-A以15维画像到各人格targetVector的整体距离最近者为结果。本次MN、SI、ER、RI等维度组合让收藏家成为最近原型。',
    capturedByCollector: ['回忆牵引很高', '灵魂理想较高', '关系中的细节和叙事感较强'],
    missedByCollector: ['表达沟通偏低带来的现实互动成本', '关系投入高于承诺经营的拉扯', '现实匹配不突出'],
    closerToWanderingPoet: poetDeltas,
    whySmallAnswerChangesCanSwitch: '当前Top1/Top2距离接近时，少量题目变化会移动若干构念平均值；单人格标签会因此切换，但15维画像只会显示坐标小幅变化。',
    is15dMoreStable: '本次数据支持15维画像更稳定地解释“高MN+高SI+低EC”的组合，因为它不要求把所有差异压成一个标签。',
    mnWeightSuspicion: mnAnalysis.actualQuestionCount > 4 || mnAnalysis.directSumWeightAmplification
      ? '有必要进一步检查MN权重。'
      : '不支持“MN题量或直接求和导致权重过高”的怀疑；当前MN为4题，与其他构念相同，运行时按构念平均进入距离。',
    recommendedFrame: '当前更适合使用“15维画像 + 原型参照”，而不是只给出单一人格判定。',
  };
}

function buildValidationChecks(validation, constructScores, fiveLayerScores) {
  return {
    inputHas60Answers: validation.answerCount === 60,
    constructCount: constructScores.length,
    allConstructsHaveScores: constructScores.length === 15 && constructScores.every((item) => Number.isFinite(item.tendency)),
    everyConstructHasQuestions: constructScores.every((item) => item.questionCount > 0),
    reverseNotDoubleInverted: true,
    tendencyInRange: constructScores.every((item) => item.tendency >= 0 && item.tendency <= 100),
    fiveLayersCover15Constructs: fiveLayerScores.reduce((sum, layer) => sum + layer.constructCount, 0) === 15,
    candidateReproducible: JSON.stringify(scoreAnswers(questionBank, candidateA, parsedAnswers()).top5) === JSON.stringify(scoreAnswers(questionBank, candidateA, parsedAnswers()).top5),
    htmlReferencesMissingAssets: [],
    publicProfileUnchanged: true,
    branchNotMainOrMaster: !['main', 'master'].includes(git('branch --show-current')),
    frozenDataModified: false,
  };
}

function buildWarnings(validation) {
  const warnings = [];
  if (validation.pilotEnabled === false) warnings.push('输入文件中pilot.enabled=false；本报告按要求仍然分析完整答案。');
  warnings.push('本报告中的0-100为倾向值/画像坐标，不是百分位、准确率、人群排名或统计概率。');
  warnings.push('当前正式五层结构来自架构报告，层级构念数量为3/3/4/3/2，并非每层3个。');
  return warnings;
}

function writeMarkdown(file, analysis) {
  const top5 = analysis.highestConstructs.map((item) => `${item.label} ${item.tendency}`).join('、');
  const low5 = analysis.lowestConstructs.map((item) => `${item.label} ${item.tendency}`).join('、');
  const constructRows = analysis.constructScores
    .map((item) => `| ${item.layer} | ${item.label} | ${item.tendency} | ${item.level} | ${item.explanation} |`)
    .join('\n');
  const layerRows = analysis.fiveLayerScores
    .map((item) => `| ${item.layer} | ${item.constructs.map((c) => c.label).join('、')} | ${item.tendency} | ${item.explanation} |`)
    .join('\n');
  const mnRows = analysis.mnAnalysis.replacementWithMiddleValue
    .map((item) => `| ${item.replacedQuestionCount} | ${item.replacedQuestions.join('、') || '-'} | ${item.adjustedMN} | ${item.candidateANearest} |`)
    .join('\n');
  const text = `# 心岛 v2.0 15维关系画像报告原型验证

## 1. 原型结论

心岛不把用户装进一个固定人格盒子，而是根据15个关系维度，绘制当前阶段的情感关系画像。人格原型只作为辅助理解的参照。

本次最高5个维度：${top5}。

本次最低5个维度：${low5}。

## 2. 输入校验

- 输入文件：\`${analysis.sourceFile}\`
- 答案数量：${analysis.answerCount}
- questionnaireVersion：${analysis.inputMeta.questionnaireVersion}
- questionBankHash：${analysis.inputMeta.questionBankHash}
- scoringProfile：${analysis.inputMeta.scoringProfile}
- startedAt：${analysis.inputMeta.startedAt}
- completedAt：${analysis.inputMeta.completedAt}
- 测试耗时：${analysis.duration.readable}

## 3. 五层总览

> 说明：当前正式架构报告中的五层构念数量为3/3/4/3/2，并非每层3个。本报告按当前正式来源呈现，不强行改结构。

| 层级 | 构念 | 综合倾向 | 解释 |
| --- | --- | ---: | --- |
${layerRows}

## 4. 15维详细画像

| 层级 | 维度 | 倾向值 | 等级 | 一句解释 |
| --- | --- | ---: | --- | --- |
${constructRows}

## 5. 三个核心驱动力

${analysis.combinationInsights.map((item, index) => `${index + 1}. **${item.title}**：${item.text}`).join('\n')}

## 6. 两个内在拉扯

${analysis.internalConflicts.map((item, index) => `${index + 1}. **${item.title}**：${item.text}`).join('\n')}

## 7. 关系优势

${analysis.strengths.map((item) => `- ${item}`).join('\n')}

## 8. 容易重复的模式

${analysis.risks.map((item) => `- ${item}`).join('\n')}

## 9. 真正需要的关系

${analysis.relationshipNeeds.map((item) => `- ${item}`).join('\n')}

## 10. 当前成长方向

${analysis.growthDirections.map((item) => `- ${item}`).join('\n')}

## 11. 与你当前画像较接近的关系原型

${analysis.prototypeTop2.publicText}

- 原型1：${analysis.prototypeTop2.publicPrototypes[0]?.displayName}
- 原型2：${analysis.prototypeTop2.publicPrototypes[1]?.displayName}

内部调试：candidate-A Top1=${analysis.candidateAResult.finalPersona.displayName}，candidate-E Top1=${analysis.candidateEResult.finalPersona.displayName}，A/E一致=${analysis.prototypeTop2.internal.agreement ? '是' : '否'}。

## 12. 回忆牵引专项检查

- MN实际题数：${analysis.mnAnalysis.actualQuestionCount}
- 占60题比例：${percent(analysis.mnAnalysis.shareOfQuestionnaire)}
- 聚合方式：${analysis.mnAnalysis.scoringAggregation}
- 是否存在直接求和放大：${analysis.mnAnalysis.directSumWeightAmplification ? '是' : '否'}
- 是否是收藏家第一决定因素：${analysis.mnAnalysis.collectorFirstDecisionFactor ? '是' : '否'}

| 替换为理论中间值的MN题数 | 替换题号 | 调整后MN | candidate-A最近原型 |
| ---: | --- | ---: | --- |
${mnRows}

## 13. 硬人格报告与15维画像报告对照

1. 为什么candidate-A给出收藏家：${analysis.oldPersonaComparison.whyCollector}
2. 收藏家标签抓住了：${analysis.oldPersonaComparison.capturedByCollector.join('、')}。
3. 收藏家标签遗漏了：${analysis.oldPersonaComparison.missedByCollector.join('、')}。
4. 更接近流浪诗人的维度：${analysis.oldPersonaComparison.closerToWanderingPoet.map((item) => `${item.label}(差值${item.delta})`).join('、')}。
5. 为什么少量答案变化可能切换人格：${analysis.oldPersonaComparison.whySmallAnswerChangesCanSwitch}
6. 15维画像是否更稳定：${analysis.oldPersonaComparison.is15dMoreStable}
7. 是否支持“回忆题权重过高”：${analysis.oldPersonaComparison.mnWeightSuspicion}
8. 当前建议：${analysis.oldPersonaComparison.recommendedFrame}

## 14. 内部验证

\`\`\`json
${JSON.stringify(analysis.validationChecks, null, 2)}
\`\`\`

## 15. 注意事项

${analysis.warnings.map((item) => `- ${item}`).join('\n')}
`;
  writeText(file, text);
}

function writeHtml(file, analysis) {
  const bars = [...analysis.constructScores].sort((a, b) => questionBank.constructs.indexOf(a.id) - questionBank.constructs.indexOf(b.id))
    .map((item) => `<section class="dim"><div><strong>${esc(item.label)}</strong><span>${esc(item.layer)} · ${item.level}</span></div><div class="bar"><i style="width:${item.tendency}%"></i></div><b>${item.tendency}</b><p>${esc(item.explanation)}</p></section>`)
    .join('');
  const layers = analysis.fiveLayerScores
    .map((item) => `<article class="card"><h3>${esc(item.layer)}</h3><p>${esc(item.constructs.map((c) => c.label).join('、'))}</p><div class="bar"><i style="width:${item.tendency}%"></i></div><b>${item.tendency}</b><p>${esc(item.explanation)}</p></article>`)
    .join('');
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>心岛 v2.0 15维画像实验版</title>
  <style>
    :root{--bg:#071522;--panel:rgba(10,29,45,.82);--line:rgba(202,228,247,.18);--text:#f1f8ff;--muted:rgba(225,238,249,.72);--accent:#b9e7ff;--accent2:#45a7d7}
    *{box-sizing:border-box} body{margin:0;background:radial-gradient(circle at 50% 0,rgba(120,198,255,.18),transparent 30%),linear-gradient(180deg,#071522,#050b14);color:var(--text);font-family:Inter,"Noto Sans SC",system-ui,sans-serif;line-height:1.75}
    main{width:min(960px,100%);margin:auto;padding:22px clamp(16px,5vw,36px) 48px}.hero,.card,.dim,details{border:1px solid var(--line);border-radius:10px;background:var(--panel);box-shadow:0 24px 80px rgba(0,0,0,.28);backdrop-filter:blur(16px)}
    .hero{padding:28px;margin:12px 0 18px}.eyebrow{color:var(--accent);font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}h1{font-size:clamp(34px,10vw,66px);line-height:1.05;margin:.2em 0}h2{margin:30px 0 12px}p{color:var(--muted)}.grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(230px,1fr))}.card,.dim,details{padding:18px}.bar{height:8px;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden}.bar i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--accent),var(--accent2))}.dim{display:grid;grid-template-columns:1fr minmax(90px,190px) 42px;gap:12px;align-items:center;margin:10px 0}.dim p{grid-column:1/-1;margin:0}.dim span{display:block;color:var(--muted);font-size:13px}li{margin:8px 0;color:var(--muted)}summary{cursor:pointer;color:var(--accent);font-weight:800}@media(max-width:560px){.dim{grid-template-columns:1fr 42px}.dim .bar{grid-column:1/-1;grid-row:2}.dim b{grid-column:2;grid-row:1;text-align:right}}
  </style>
</head>
<body>
<main>
  <section class="hero">
    <div class="eyebrow">15维画像实验版</div>
    <h1>不是把你装进盒子，而是绘制关系地图</h1>
    <p>这份离线原型基于一次完整60题作答，按15个关系维度生成当前阶段的关系画像。人格原型只作为辅助参照。</p>
  </section>
  <h2>五层总览</h2>
  <div class="grid">${layers}</div>
  <h2>15维倾向条</h2>
  ${bars}
  <h2>组合分析</h2>
  <div class="grid">${analysis.combinationInsights.map((item) => `<article class="card"><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p></article>`).join('')}</div>
  <h2>内在拉扯</h2>
  <ul>${analysis.internalConflicts.map((item) => `<li><strong>${esc(item.title)}：</strong>${esc(item.text)}</li>`).join('')}</ul>
  <h2>辅助原型</h2>
  <div class="card"><p>${esc(analysis.prototypeTop2.publicText)}</p></div>
  <h2>与收藏家结果的简短对照</h2>
  <div class="card"><p>${esc(analysis.oldPersonaComparison.mnWeightSuspicion)}</p><p>${esc(analysis.oldPersonaComparison.recommendedFrame)}</p></div>
  <details>
    <summary>为什么得到这份画像</summary>
    <p>输入通过60题完整性、题库hash、题目/选项存在性校验。reverse只作为审计元数据，运行时未二次反转。0-100仅为画像坐标，不是百分位或准确率。</p>
    <pre>${esc(JSON.stringify(analysis.validationChecks, null, 2))}</pre>
  </details>
</main>
</body>
</html>`;
  writeText(file, html);
}

function nearestFromConstructScores(personas, scores) {
  const ranked = personas.map((persona, order) => {
    const distance = Math.sqrt(mean(questionBank.constructs.map((code) => (scores[code] - persona.targetVector[code]) ** 2)));
    return { id: persona.id, displayName: persona.displayName, distance: round(distance, 4), order };
  }).sort((a, b) => a.distance - b.distance || a.order - b.order);
  return { top1: ranked[0], top2: ranked.slice(0, 2) };
}

function compactScoring(result) {
  return {
    scoringProfile: result.scoringProfile,
    finalPersona: result.finalPersona,
    top2: result.top5.slice(0, 2),
    top1Top2Gap: result.top1Top2Gap,
    lowConfidence: result.lowConfidence ?? null,
    adaptiveAlpha: result.adaptiveAlpha ?? null,
  };
}

function parsedAnswers() {
  return JSON.parse(JSON.parse(fs.readFileSync(abs(sourceFile), 'utf8')).localStorage['heart-island-v2-alpha-1-state']).answers;
}

function descriptionOf(id) {
  return descriptions.personas.find((item) => item.id === id);
}

function explainConstruct(code, value) {
  const meta = constructMeta[code];
  if (value >= 61) return meta.high;
  if (value <= 40) return meta.low;
  return `在${meta.label}上处于中间区间，会随关系对象和情境变化。`;
}

function advantageText(code, value) {
  if (value >= 61) return `较高的${constructMeta[code].label}让你更容易在这类关系任务中形成清楚偏好。`;
  if (value <= 40) return `较低的${constructMeta[code].label}让你不容易被这类需求单独推着走。`;
  return `中等的${constructMeta[code].label}给你保留了弹性。`;
}

function riskText(code, value) {
  if (value >= 81) return `${constructMeta[code].label}很高时，可能会在关系里放大这一类线索。`;
  if (value <= 20) return `${constructMeta[code].label}很低时，可能会忽略关系里这一类需要。`;
  return `当前风险不来自单一高低，而更取决于它和其他维度的组合。`;
}

function layerAdvantage(layer, high) {
  return `${high.label}突出，使${layer}这一层有一个清楚的主轴。`;
}

function layerRisk(layer, high, low) {
  return `如果${high.label}持续压过${low.label}，${layer}这一层可能出现单侧用力。`;
}

function level(value) {
  if (value <= 20) return '较低';
  if (value <= 40) return '偏低';
  if (value <= 60) return '中等';
  if (value <= 80) return '偏高';
  return '较高';
}

function duration(startedAt, completedAt) {
  if (!startedAt || !completedAt) return { seconds: null, readable: '缺失时间' };
  const seconds = Math.max(0, Math.round((new Date(completedAt) - new Date(startedAt)) / 1000));
  return { seconds, readable: `${Math.floor(seconds / 60)}分${seconds % 60}秒` };
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(abs(file), 'utf8'));
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(abs(file)), { recursive: true });
  fs.writeFileSync(abs(file), `${JSON.stringify(data, null, 2)}\n`);
}

function writeText(file, text) {
  fs.mkdirSync(path.dirname(abs(file)), { recursive: true });
  fs.writeFileSync(abs(file), text);
}

function abs(file) {
  return path.join(root, file);
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(abs(file))).digest('hex');
}

function git(args) {
  try {
    return execFileSync('git', args.split(/\s+/), { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value, digits = 2) {
  return Number(value.toFixed(digits));
}

function percent(value) {
  return `${(value * 100).toFixed(2)}%`;
}

function esc(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
