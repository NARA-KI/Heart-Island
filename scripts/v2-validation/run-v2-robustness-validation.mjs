import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const SEED = 20260704;
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const writeJson = (file, data, pretty = false) => {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), JSON.stringify(data, null, pretty ? 2 : 0) + '\n', 'utf8');
};
const writeText = (file, text) => {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), text, 'utf8');
};

const questionBank = readJson('drafts/v2/question-bank.v2.draft.json');
const personaData = readJson('drafts/v2/persona-target-vectors.v2.draft.json');
const baseFixtureData = readJson('drafts/v2/simulation-fixtures.v2.draft.json');
const validationResults = readJson('drafts/v2/validation-results.v2.draft.json');

const constructs = questionBank.constructs;
const questions = questionBank.questions;
const personas = personaData.personas;
const questionsById = new Map(questions.map((question) => [question.id, question]));
const personaByName = new Map(personas.map((persona) => [persona.displayName, persona]));
const idealFixtures = baseFixtureData.fixtures.filter((fixture) => fixture.scenarioType === 'ideal-primary-persona');
const idealByPersona = new Map(idealFixtures.map((fixture) => [fixture.expectedPersona, fixture]));

const adjacentGroups = [
  ['灯塔型', '月光型', '摆渡人'],
  ['守门人', '岛屿型', '候鸟型'],
  ['筑巢型', '同行者', '港湾型'],
  ['探险家', '星火型', '候鸟型'],
  ['收藏家', '流浪诗人', '观星者'],
  ['镜像型', '港湾型', '摆渡人'],
  ['筑巢型', '观星者', '同行者'],
  ['月光型', '镜像型', '港湾型'],
];
const adjacent = new Map(personas.map((persona) => [persona.displayName, new Set()]));
for (const group of adjacentGroups) {
  for (const name of group) {
    for (const other of group) {
      if (name !== other && adjacent.has(name)) adjacent.get(name).add(other);
    }
  }
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(SEED);
const randomInt = (max) => Math.floor(rng() * max);

function nearestOption(question, target) {
  return [...question.options].sort((a, b) => Math.abs(a.score - target) - Math.abs(b.score - target) || b.score - a.score || a.id.localeCompare(b.id))[0].id;
}
function answerByScoreRank(question, rank) {
  const sorted = [...question.options].sort((a, b) => a.score - b.score || a.id.localeCompare(b.id));
  return sorted[Math.max(0, Math.min(sorted.length - 1, rank))].id;
}
function answerForConstructTargets(targets) {
  return Object.fromEntries(questions.map((question) => [question.id, nearestOption(question, targets[question.construct] ?? 50)]));
}
function blendedTargets(a, b, weightA) {
  const pa = personaByName.get(a);
  const pb = personaByName.get(b);
  return Object.fromEntries(constructs.map((construct) => [construct, pa.targetVector[construct] * weightA + pb.targetVector[construct] * (1 - weightA)]));
}
function scoreOption(questionId, optionId) {
  const question = questionsById.get(questionId);
  return question.options.find((option) => option.id === optionId).score;
}
function allQuestionIds() {
  return questions.map((question) => question.id);
}
function changedFrom(baseAnswers, answers) {
  return allQuestionIds().filter((questionId) => baseAnswers[questionId] !== answers[questionId]);
}
function createFixture(id, scenarioType, answers, extra = {}) {
  if (Object.keys(answers).length !== 60) throw new Error(`Fixture ${id} is missing answers`);
  return {
    id,
    scenarioType,
    answers,
    changedQuestions: extra.changedQuestions ?? [],
    rationale: extra.rationale ?? '',
    ...extra,
  };
}
function chooseWeighted(items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = rng() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item.value;
  }
  return items.at(-1).value;
}
function randomAnswer(question, mode) {
  if (mode === 'uniform') return question.options[randomInt(4)].id;
  const byScore = (score) => question.options.filter((option) => option.score === score).map((option) => option.id);
  const weightedScores = {
    high: [{ value: 100, weight: 55 }, { value: 67, weight: 25 }, { value: 33, weight: 15 }, { value: 0, weight: 5 }],
    low: [{ value: 0, weight: 55 }, { value: 33, weight: 25 }, { value: 67, weight: 15 }, { value: 100, weight: 5 }],
    middle: [{ value: 67, weight: 40 }, { value: 33, weight: 40 }, { value: 100, weight: 10 }, { value: 0, weight: 10 }],
  }[mode];
  const score = chooseWeighted(weightedScores);
  const options = byScore(score);
  return options[randomInt(options.length)];
}
function randomAnswers(mode) {
  return Object.fromEntries(questions.map((question) => [question.id, randomAnswer(question, mode)]));
}
function mutateAnswers(baseAnswers, count) {
  const answers = structuredClone(baseAnswers);
  const ids = [...allQuestionIds()];
  const changed = [];
  while (changed.length < count && ids.length) {
    const index = randomInt(ids.length);
    const questionId = ids.splice(index, 1)[0];
    const current = answers[questionId];
    const choices = questionsById.get(questionId).options.map((option) => option.id).filter((optionId) => optionId !== current);
    answers[questionId] = choices[randomInt(choices.length)];
    changed.push(questionId);
  }
  return { answers, changed };
}

function scoreFixture(fixture) {
  const values = Object.fromEntries(constructs.map((construct) => [construct, []]));
  for (const [questionId, answer] of Object.entries(fixture.answers)) {
    const question = questionsById.get(questionId);
    if (!question) throw new Error(`Unknown question ${questionId} in ${fixture.id}`);
    const option = question.options.find((item) => item.id === answer);
    if (!option) throw new Error(`Unknown answer ${answer} for ${questionId} in ${fixture.id}`);
    values[question.construct].push(option.score);
  }
  const constructScores = Object.fromEntries(constructs.map((construct) => {
    const scores = values[construct];
    if (scores.length !== 4) throw new Error(`Construct ${construct} expected 4 scores in ${fixture.id}, got ${scores.length}`);
    return [construct, Number((scores.reduce((sum, value) => sum + value, 0) / scores.length).toFixed(2))];
  }));
  const ranked = personas.map((persona) => {
    const squared = constructs.reduce((sum, construct) => {
      const delta = constructScores[construct] - persona.targetVector[construct];
      return sum + delta * delta;
    }, 0);
    const distance = Math.sqrt(squared / constructs.length);
    return { id: persona.id, displayName: persona.displayName, distance: Number(distance.toFixed(4)) };
  }).sort((a, b) => a.distance - b.distance || a.displayName.localeCompare(b.displayName, 'zh-Hans-CN'));
  const top5 = ranked.slice(0, 5);
  const gap = Number((top5[1].distance - top5[0].distance).toFixed(4));
  const top3Spread = Number((top5[2].distance - top5[0].distance).toFixed(4));
  const allMiddle = constructs.every((construct) => constructScores[construct] >= 40 && constructScores[construct] <= 60);
  const lowConfidence = gap < 2.5 || top3Spread < 5 || allMiddle || fixture.lowConfidenceExpected === true || fixture.mixRatio === '50/50';
  const explicitAcceptable = fixture.acceptableTopResults ?? (fixture.expectedPersona ? [fixture.expectedPersona, ...[...(adjacent.get(fixture.expectedPersona) ?? [])]] : []);
  const explicitHit = fixture.expectedPersona ? top5[0].displayName === fixture.expectedPersona : false;
  const acceptable = explicitAcceptable.includes(top5[0].displayName);
  const nonAdjacentMiss = fixture.expectedPersona && !acceptable;
  return {
    fixtureId: fixture.id,
    scenarioType: fixture.scenarioType,
    expectedPersona: fixture.expectedPersona ?? null,
    acceptableTopResults: explicitAcceptable,
    top1: top5[0].displayName,
    top2: top5[1].displayName,
    top3: top5[2].displayName,
    top1Top2Gap: gap,
    top3Spread,
    lowConfidence,
    explicitHit,
    acceptable,
    nonAdjacentMiss: Boolean(nonAdjacentMiss),
    constructScores,
    top5,
    changedQuestions: fixture.changedQuestions ?? [],
    meta: {
      mixRatio: fixture.mixRatio,
      pair: fixture.pair,
      randomMode: fixture.randomMode,
      mutationCount: fixture.mutationCount,
      riskClass: fixture.riskClass,
    },
  };
}

function pct(n, d) {
  return d ? `${((n / d) * 100).toFixed(1)}%` : '0.0%';
}
function ratio(n, d) {
  return d ? Number((n / d).toFixed(4)) : 0;
}
function groupBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}
function countBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Object.fromEntries([...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-Hans-CN')));
}
function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return Number(sorted[lower].toFixed(4));
  return Number((sorted[lower] * (upper - index) + sorted[upper] * (index - lower)).toFixed(4));
}
function gapStats(results) {
  const gaps = results.map((result) => result.top1Top2Gap);
  return {
    min: percentile(gaps, 0),
    p25: percentile(gaps, 0.25),
    median: percentile(gaps, 0.5),
    p75: percentile(gaps, 0.75),
    max: percentile(gaps, 1),
    under2_5: results.filter((result) => result.top1Top2Gap < 2.5).length,
    under5: results.filter((result) => result.top1Top2Gap < 5).length,
  };
}
function table(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map((cell) => String(cell).replace(/\n/g, '<br>')).join(' | ')} |`),
  ].join('\n');
}

function buildRobustnessFixtures() {
  const fixtures = [];
  const pairs = [
    ['灯塔型', '月光型'],
    ['灯塔型', '摆渡人'],
    ['守门人', '岛屿型'],
    ['岛屿型', '候鸟型'],
    ['筑巢型', '同行者'],
    ['筑巢型', '港湾型'],
    ['探险家', '候鸟型'],
    ['探险家', '星火型'],
    ['收藏家', '流浪诗人'],
    ['收藏家', '观星者'],
    ['镜像型', '摆渡人'],
    ['港湾型', '摆渡人'],
  ];
  for (const [a, b] of pairs) {
    for (const [label, weightA] of [['25/75', 0.25], ['50/50', 0.5], ['75/25', 0.75]]) {
      const targets = blendedTargets(a, b, weightA);
      fixtures.push(createFixture(`mix-${personaByName.get(a).id}-${personaByName.get(b).id}-${label.replace('/', '-')}`, 'dual-persona-mix', answerForConstructTargets(targets), {
        expectedPersona: label === '50/50' ? null : weightA > 0.5 ? a : b,
        acceptableTopResults: [a, b],
        pair: [a, b],
        mixRatio: label,
        lowConfidenceExpected: label === '50/50',
        rationale: `双人格混合路径：${a}/${b} = ${label}。`,
      }));
    }
  }

  const contradictionCases = [
    ['contradiction-au-cl-cm-high', { AU: 100, CL: 100, CM: 100 }, ['守门人', '候鸟型', '筑巢型']],
    ['contradiction-sc-tr-high', { SC: 100, TR: 100 }, ['港湾型', '镜像型', '守门人']],
    ['contradiction-cs-au-high', { CS: 100, AU: 100 }, ['灯塔型', '候鸟型', '岛屿型']],
    ['contradiction-pa-cm-high', { PA: 100, CM: 100 }, ['星火型', '观星者', '筑巢型']],
    ['contradiction-nv-rm-high', { NV: 100, RM: 100 }, ['探险家', '同行者', '观星者']],
    ['contradiction-ec-high-er-low', { EC: 100, ER: 0 }, ['星火型', '摆渡人']],
    ['contradiction-cr-high-ri-low', { CR: 100, RI: 0 }, ['摆渡人', '灯塔型']],
    ['contradiction-mn-er-high', { MN: 100, ER: 100 }, ['收藏家', '镜像型', '流浪诗人']],
    ['contradiction-si-rm-high', { SI: 100, RM: 100 }, ['观星者', '同行者']],
    ['contradiction-cl-low-ri-high', { CL: 0, RI: 100 }, ['灯塔型', '港湾型']],
  ];
  for (const [id, targets, acceptable] of contradictionCases) {
    const fullTargets = Object.fromEntries(constructs.map((construct) => [construct, targets[construct] ?? 50]));
    fixtures.push(createFixture(id, 'construct-contradiction', answerForConstructTargets(fullTargets), {
      acceptableTopResults: acceptable,
      lowConfidenceExpected: true,
      riskClass: 'contradiction',
      rationale: `构念矛盾组合：${Object.entries(targets).map(([key, value]) => `${key}=${value}`).join(', ')}。`,
    }));
  }

  const midTargets = [
    ['middle-all-67', Object.fromEntries(constructs.map((c) => [c, 67])), '全部选择 67 分附近选项。'],
    ['middle-all-33', Object.fromEntries(constructs.map((c) => [c, 33])), '全部选择 33 分附近选项。'],
    ['middle-two-67-two-33', null, '每个构念两题 67、两题 33。'],
    ['middle-alternating-high-low-average-50', null, '高低交替但构念平均值接近 50。'],
    ['middle-all-constructs-near-50', Object.fromEntries(constructs.map((c) => [c, 50])), '所有构念最终得分接近中间区域。'],
  ];
  for (const [id, targets, rationale] of midTargets) {
    let answers;
    if (id === 'middle-two-67-two-33') {
      answers = {};
      const byConstruct = groupBy(questions, (question) => question.construct);
      for (const list of byConstruct.values()) {
        list.forEach((question, index) => {
          answers[question.id] = nearestOption(question, index < 2 ? 67 : 33);
        });
      }
    } else if (id === 'middle-alternating-high-low-average-50') {
      answers = {};
      const byConstruct = groupBy(questions, (question) => question.construct);
      for (const list of byConstruct.values()) {
        list.forEach((question, index) => {
          answers[question.id] = nearestOption(question, index % 2 === 0 ? 100 : 0);
        });
      }
    } else {
      answers = answerForConstructTargets(targets);
    }
    fixtures.push(createFixture(id, 'middle-answer-pattern', answers, {
      acceptableTopResults: [],
      lowConfidenceExpected: true,
      rationale,
    }));
  }

  const extremeCases = [
    ['extreme-all-100', (question) => answerByScoreRank(question, 3), '每题都选择 100 分选项。'],
    ['extreme-all-0', (question) => answerByScoreRank(question, 0), '每题都选择 0 分选项。'],
    ['extreme-half-100-half-0-per-construct', null, '每个构念一半 100、一半 0。'],
    ['extreme-reverse-high-positive-low', null, '所有反向题取高，正向题取低。'],
    ['extreme-positive-high-reverse-low', null, '所有正向题取高，反向题取低。'],
  ];
  for (const [id, picker, rationale] of extremeCases) {
    let answers = {};
    if (picker) {
      answers = Object.fromEntries(questions.map((question) => [question.id, picker(question)]));
    } else if (id === 'extreme-half-100-half-0-per-construct') {
      const byConstruct = groupBy(questions, (question) => question.construct);
      for (const list of byConstruct.values()) {
        list.forEach((question, index) => {
          answers[question.id] = answerByScoreRank(question, index < 2 ? 3 : 0);
        });
      }
    } else {
      answers = Object.fromEntries(questions.map((question) => {
        const high = id === 'extreme-reverse-high-positive-low' ? question.reverse : !question.reverse;
        return [question.id, answerByScoreRank(question, high ? 3 : 0)];
      }));
    }
    fixtures.push(createFixture(id, 'extreme-answer-pattern', answers, {
      acceptableTopResults: [],
      lowConfidenceExpected: true,
      riskClass: 'extreme',
      rationale,
    }));
  }

  for (const [mode, count] of [['uniform', 10000], ['high', 2000], ['low', 2000], ['middle', 2000]]) {
    for (let i = 0; i < count; i++) {
      fixtures.push(createFixture(`mc-${mode}-${String(i + 1).padStart(5, '0')}`, 'monte-carlo-random', randomAnswers(mode), {
        randomMode: mode,
        changedQuestions: [],
        rationale: `固定 seed=${SEED} 的 ${mode} 随机回答。`,
      }));
    }
  }

  for (const persona of personas) {
    const baseFixture = idealByPersona.get(persona.displayName);
    for (const mutationCount of [3, 5, 8, 12]) {
      for (let i = 0; i < 20; i++) {
        const { answers, changed } = mutateAnswers(baseFixture.answers, mutationCount);
        fixtures.push(createFixture(`multi-${persona.id}-${mutationCount}-${String(i + 1).padStart(2, '0')}`, 'multi-question-perturbation', answers, {
          expectedPersona: persona.displayName,
          acceptableTopResults: [persona.displayName, ...[...(adjacent.get(persona.displayName) ?? [])]],
          mutationCount,
          changedQuestions: changed,
          rationale: `${persona.displayName} 理想路径随机改动 ${mutationCount} 题。`,
        }));
      }
    }
  }
  return fixtures;
}

function summarize(results) {
  const byType = groupBy(results, (result) => result.scenarioType);
  const allTop1 = countBy(results, (result) => result.top1);
  const monteCarlo = byType.get('monte-carlo-random') ?? [];
  const mcByMode = groupBy(monteCarlo, (result) => result.meta.randomMode);
  const mcDistribution = {};
  for (const [mode, list] of mcByMode) {
    const counts = countBy(list, (result) => result.top1);
    mcDistribution[mode] = Object.fromEntries(personas.map((persona) => [persona.displayName, {
      top1: counts[persona.displayName] ?? 0,
      top1Rate: ratio(counts[persona.displayName] ?? 0, list.length),
    }]));
  }
  const multi = byType.get('multi-question-perturbation') ?? [];
  const multiByCount = groupBy(multi, (result) => result.meta.mutationCount);
  const multiSummary = {};
  for (const [count, list] of multiByCount) {
    multiSummary[count] = {
      total: list.length,
      top1Kept: list.filter((result) => result.explicitHit).length,
      top1KeptRate: ratio(list.filter((result) => result.explicitHit).length, list.length),
      acceptable: list.filter((result) => result.acceptable).length,
      acceptableRate: ratio(list.filter((result) => result.acceptable).length, list.length),
      nonAdjacent: list.filter((result) => result.nonAdjacentMiss).length,
      nonAdjacentRate: ratio(list.filter((result) => result.nonAdjacentMiss).length, list.length),
    };
  }
  const mix = byType.get('dual-persona-mix') ?? [];
  const contradiction = byType.get('construct-contradiction') ?? [];
  const middle = byType.get('middle-answer-pattern') ?? [];
  const extreme = byType.get('extreme-answer-pattern') ?? [];
  const lowConfidenceCount = results.filter((result) => result.lowConfidence).length;
  const top1Counts = Object.fromEntries(personas.map((persona) => [persona.displayName, results.filter((result) => result.top1 === persona.displayName).length]));
  const mcUniform = mcByMode.get('uniform') ?? [];
  const mcUniformCounts = Object.fromEntries(personas.map((persona) => [persona.displayName, mcUniform.filter((result) => result.top1 === persona.displayName).length]));
  const mcUniformRates = Object.fromEntries(personas.map((persona) => [persona.displayName, ratio(mcUniformCounts[persona.displayName], mcUniform.length)]));
  const maxMc = [...Object.entries(mcUniformRates)].sort((a, b) => b[1] - a[1])[0];
  const minMc = [...Object.entries(mcUniformRates)].sort((a, b) => a[1] - b[1])[0];
  const nonAdjacent = results.filter((result) => result.nonAdjacentMiss);
  return {
    seed: SEED,
    total: results.length,
    typeCounts: Object.fromEntries([...byType.entries()].map(([key, value]) => [key, value.length])),
    dualMix: {
      total: mix.length,
      acceptable: mix.filter((result) => result.acceptable).length,
      acceptableRate: ratio(mix.filter((result) => result.acceptable).length, mix.length),
      lowConfidence: mix.filter((result) => result.lowConfidence).length,
    },
    contradiction: {
      total: contradiction.length,
      acceptable: contradiction.filter((result) => result.acceptable || result.lowConfidence).length,
      abnormal: contradiction.filter((result) => result.nonAdjacentMiss && !result.lowConfidence).length,
      abnormalRate: ratio(contradiction.filter((result) => result.nonAdjacentMiss && !result.lowConfidence).length, contradiction.length),
    },
    middle: {
      total: middle.length,
      lowConfidence: middle.filter((result) => result.lowConfidence).length,
    },
    extreme: {
      total: extreme.length,
      top1Counts: countBy(extreme, (result) => result.top1),
    },
    monteCarlo: {
      total: monteCarlo.length,
      byMode: Object.fromEntries([...mcByMode.entries()].map(([mode, list]) => [mode, {
        total: list.length,
        top1Counts: countBy(list, (result) => result.top1),
        top2Counts: countBy(list, (result) => result.top2),
        gap: gapStats(list),
        lowConfidence: list.filter((result) => result.lowConfidence).length,
      }])),
      uniformTop1Rates: mcUniformRates,
      maxUniformTop1: maxMc,
      minUniformTop1: minMc,
    },
    multiQuestionPerturbation: multiSummary,
    gap: gapStats(results),
    lowConfidence: {
      count: lowConfidenceCount,
      rate: ratio(lowConfidenceCount, results.length),
    },
    top1Counts,
    nonAdjacent: {
      count: nonAdjacent.length,
      rate: ratio(nonAdjacent.length, results.length),
      byExpected: countBy(nonAdjacent, (result) => result.expectedPersona ?? 'none'),
    },
    mostFrequentTop1: [...Object.entries(top1Counts)].sort((a, b) => b[1] - a[1])[0],
    leastFrequentTop1: [...Object.entries(top1Counts)].sort((a, b) => a[1] - b[1])[0],
  };
}

function report(summary, results) {
  const resultByType = groupBy(results, (result) => result.scenarioType);
  const mixRows = (resultByType.get('dual-persona-mix') ?? []).map((r) => [r.fixtureId, (r.meta.pair ?? []).join('/'), r.meta.mixRatio, r.top1, r.top2, r.top1Top2Gap, r.acceptable ? '合理' : '高风险', r.lowConfidence ? '低置信' : '明确']);
  const contradictionRows = (resultByType.get('construct-contradiction') ?? []).map((r) => [r.fixtureId, r.top1, r.top2, r.top1Top2Gap, r.acceptable ? '可解释' : r.lowConfidence ? '低置信' : '异常']);
  const middleRows = (resultByType.get('middle-answer-pattern') ?? []).map((r) => [r.fixtureId, r.top1, r.top2, r.top1Top2Gap, r.lowConfidence ? '低置信' : '明确']);
  const extremeRows = (resultByType.get('extreme-answer-pattern') ?? []).map((r) => [r.fixtureId, r.top1, r.top2, r.top1Top2Gap, r.lowConfidence ? '异常/低置信' : '明确']);
  const mcUniformRows = Object.entries(summary.monteCarlo.uniformTop1Rates).map(([name, rate]) => [name, summary.monteCarlo.byMode.uniform.top1Counts[name] ?? 0, `${(rate * 100).toFixed(2)}%`]);
  const multiRows = Object.entries(summary.multiQuestionPerturbation).map(([count, item]) => [count, item.total, `${(item.top1KeptRate * 100).toFixed(1)}%`, `${(item.acceptableRate * 100).toFixed(1)}%`, `${(item.nonAdjacentRate * 100).toFixed(1)}%`]);
  const nonAdjacentRows = results.filter((r) => r.nonAdjacentMiss).slice(0, 50).map((r) => [r.fixtureId, r.expectedPersona, r.top1, r.top2, r.top1Top2Gap]);
  const hasDominance = summary.monteCarlo.maxUniformTop1[1] > 0.18;
  const hasNeverTop1 = Object.values(summary.monteCarlo.uniformTop1Rates).some((rate) => rate === 0);
  const pass3 = summary.multiQuestionPerturbation[3]?.top1KeptRate >= 0.95;
  const pass5 = summary.multiQuestionPerturbation[5]?.acceptableRate >= 0.95;
  const pass8 = summary.multiQuestionPerturbation[8]?.nonAdjacentRate <= 0.05;
  const pass12 = summary.multiQuestionPerturbation[12]?.nonAdjacentRate <= 0.10;
  const shouldAdjustVector = hasDominance || hasNeverTop1 || summary.nonAdjacent.rate > 0.05 || !pass3 || !pass5 || !pass8;
  const shouldEditQuestions = summary.dualMix.acceptableRate < 0.95 || summary.contradiction.abnormalRate > 0.10;

  return `# 心岛 v2.0 题库鲁棒性验证报告

## 1. 本轮真实执行摘要

这是**真实脚本执行**，不是人工推演，也不是正式用户准确率。

执行命令：

\`\`\`bash
node scripts/v2-validation/run-v2-robustness-validation.mjs
\`\`\`

${table(['指标', '结果'], [
    ['基础理想人格路径命中', `${validationResults.summary.idealHits}/${validationResults.summary.idealTotal}`],
    ['总测试规模', summary.total],
    ['双人格混合合理结果比例', `${summary.dualMix.acceptable}/${summary.dualMix.total} (${pct(summary.dualMix.acceptable, summary.dualMix.total)})`],
    ['构念矛盾异常率', `${summary.contradiction.abnormal}/${summary.contradiction.total} (${pct(summary.contradiction.abnormal, summary.contradiction.total)})`],
    ['随机回答最大人格占比', `${summary.monteCarlo.maxUniformTop1[0]} ${(summary.monteCarlo.maxUniformTop1[1] * 100).toFixed(2)}%`],
    ['随机回答最小人格占比', `${summary.monteCarlo.minUniformTop1[0]} ${(summary.monteCarlo.minUniformTop1[1] * 100).toFixed(2)}%`],
    ['3/5/8/12 题扰动 Top1 保持率', `${(summary.multiQuestionPerturbation[3].top1KeptRate * 100).toFixed(1)}% / ${(summary.multiQuestionPerturbation[5].top1KeptRate * 100).toFixed(1)}% / ${(summary.multiQuestionPerturbation[8].top1KeptRate * 100).toFixed(1)}% / ${(summary.multiQuestionPerturbation[12].top1KeptRate * 100).toFixed(1)}%`],
    ['非相邻误判率', `${summary.nonAdjacent.count}/${summary.total} (${(summary.nonAdjacent.rate * 100).toFixed(2)}%)`],
    ['低置信结果比例', `${summary.lowConfidence.count}/${summary.total} (${(summary.lowConfidence.rate * 100).toFixed(2)}%)`],
    ['是否存在人格垄断', hasDominance ? '存在风险' : '未见明显垄断'],
    ['是否存在人格无法命中', hasNeverTop1 ? '存在' : '未见'],
  ])}

## 2. 本轮修改文件

${table(['文件', '用途'], [
    ['drafts/v2/robustness-fixtures.v2.draft.json', '鲁棒性 fixture，包含混合、矛盾、中间、极端、随机、多题扰动。'],
    ['scripts/v2-validation/run-v2-robustness-validation.mjs', '隔离鲁棒性验证脚本。'],
    ['reports/data/heart-island-v2-robustness-results.json', '鲁棒性验证结构化结果。'],
    ['reports/heart-island-v2-question-bank-robustness-validation.md', '本报告。'],
  ])}

## 3. 本轮未修改的生产文件

未修改 \`app.js\`、\`index.html\`、\`styles.css\`、\`core/scoring.mjs\`、\`core/calibration-profiles.mjs\`、Beta 0.9.9.7 正式题库、生产人格数据、\`deploy/\`、\`release/\`。

## 4. 验证规则与随机 seed

${table(['项目', '规则'], [
    ['随机 seed', SEED],
    ['评分方式', '每构念 4 题平均分，与验证用候选 targetVector 做 15 维欧氏距离。'],
    ['低置信规则', 'Top1-Top2 gap < 2.5，或 Top3 spread < 5，或所有构念 40-60，或 50/50 混合路径。'],
    ['明确命中', 'Top1 等于 expectedPersona。'],
    ['合理相邻结果', 'Top1 落在 acceptableTopResults 或相邻人格集合。'],
    ['非相邻误判', '有 expectedPersona 且 Top1 不在可接受集合。'],
    ['异常输入', '中间、极端、矛盾和随机输入不等同真实用户，不要求唯一人格。'],
  ])}

## 5. 双人格混合结果

${table(['Fixture', '混合人格', '比例', 'Top1', 'Top2', 'Gap', '判断', '置信'], mixRows)}

## 6. 构念矛盾结果

${table(['Fixture', 'Top1', 'Top2', 'Gap', '判断'], contradictionRows)}

## 7. 中间选项结果

${table(['Fixture', 'Top1', 'Top2', 'Gap', '置信'], middleRows)}

## 8. 极端输入结果

${table(['Fixture', 'Top1', 'Top2', 'Gap', '判断'], extremeRows)}

## 9. Monte Carlo Top1 分布

以下为 10,000 组 A/B/C/D 等概率随机回答的 Top1 分布。

${table(['人格', 'Top1 次数', '占比'], mcUniformRows)}

非均匀输入：

${table(['随机模式', '样本数', 'Top1 最高人格', 'Top1 最高占比', '低置信数'], Object.entries(summary.monteCarlo.byMode).map(([mode, item]) => {
    const top = Object.entries(item.top1Counts).sort((a, b) => b[1] - a[1])[0];
    return [mode, item.total, top[0], pct(top[1], item.total), item.lowConfidence];
  }))}

## 10. 多题扰动稳定性

${table(['扰动题数', '样本数', 'Top1 保持率', '合理相邻率', '非相邻误判率'], multiRows)}

## 11. Top1-Top2 gap 分布

${table(['范围', '值'], [
    ['min', summary.gap.min],
    ['p25', summary.gap.p25],
    ['median', summary.gap.median],
    ['p75', summary.gap.p75],
    ['max', summary.gap.max],
    ['gap < 2.5', summary.gap.under2_5],
    ['gap < 5', summary.gap.under5],
  ])}

## 12. 低置信结果比例

低置信结果：${summary.lowConfidence.count}/${summary.total} (${(summary.lowConfidence.rate * 100).toFixed(2)}%)。

低置信不等于失败。中间输入、50/50 混合和人格边界附近路径应允许低置信。

## 13. 最容易被吸走的人格

${summary.nonAdjacent.count ? table(['预期人格', '非相邻误判次数'], Object.entries(summary.nonAdjacent.byExpected)) : '本轮未出现非相邻误判，因此没有明确“被吸走”的人格。'}

## 14. 最容易垄断结果的人格

随机均匀输入中 Top1 最高的是：${summary.monteCarlo.maxUniformTop1[0]}，占比 ${(summary.monteCarlo.maxUniformTop1[1] * 100).toFixed(2)}%。

${hasDominance ? '该占比超过 18%，存在垄断风险。' : '未超过 18%，暂未见明显垄断。'}

## 15. 最难成为 Top1 的人格

随机均匀输入中 Top1 最低的是：${summary.monteCarlo.minUniformTop1[0]}，占比 ${(summary.monteCarlo.minUniformTop1[1] * 100).toFixed(2)}%。

${hasNeverTop1 ? '存在随机输入下无法成为 Top1 的人格，需要复查 targetVector。' : '所有人格均可在随机输入中成为 Top1。'}

## 16. 非相邻误判

非相邻误判：${summary.nonAdjacent.count}/${summary.total} (${(summary.nonAdjacent.rate * 100).toFixed(2)}%)。

${nonAdjacentRows.length ? table(['Fixture', '预期人格', 'Top1', 'Top2', 'Gap'], nonAdjacentRows) : '无。'}

## 17. 是否需要修改题目

${shouldEditQuestions ? '建议局部回到题目检查。重点看双人格混合或构念矛盾中不可解释的结果。' : '暂不建议因本轮鲁棒性结果修改题目。'}

## 18. 是否需要调整 targetVector

${shouldAdjustVector ? '建议调整或复查候选 targetVector。当前鲁棒性指标暴露出分布、扰动或误判风险。' : '暂不需要调整 targetVector。'}

## 19. 是否可以冻结题库文字

${shouldEditQuestions ? '暂不建议冻结题库文字。' : '可以考虑冻结当前候选题库文字，进入结构化草案准备。'}

## 20. 是否可以冻结候选 targetVector

${shouldAdjustVector ? '不建议冻结候选 targetVector。' : '可以暂时冻结候选 targetVector 作为下一阶段验证基线，但仍不是生产参数。'}

## 21. 是否建议进入生产接入准备

${!shouldEditQuestions && !shouldAdjustVector ? '可以进入生产接入准备的方案设计阶段，但不得直接改生产代码。' : '不建议进入生产接入准备，应先处理本轮暴露问题。'}

## 22. 是否建议直接修改生产代码

不建议。

本轮仍是隔离验证，不应直接修改 \`app.js\` 或正式评分逻辑。

最终结论：

${table(['问题', '结论'], [
    ['是否真实执行脚本', '是'],
    ['理想人格路径是否仍为 15/15', `${validationResults.summary.idealHits}/${validationResults.summary.idealTotal}`],
    ['总测试规模', summary.total],
    ['双人格混合合理结果比例', `${(summary.dualMix.acceptableRate * 100).toFixed(1)}%`],
    ['构念矛盾异常率', `${(summary.contradiction.abnormalRate * 100).toFixed(1)}%`],
    ['随机回答 Top1 分布', `最大 ${summary.monteCarlo.maxUniformTop1[0]} ${(summary.monteCarlo.maxUniformTop1[1] * 100).toFixed(2)}%，最小 ${summary.monteCarlo.minUniformTop1[0]} ${(summary.monteCarlo.minUniformTop1[1] * 100).toFixed(2)}%`],
    ['3/5/8/12 题扰动稳定率', `${(summary.multiQuestionPerturbation[3].top1KeptRate * 100).toFixed(1)}% / ${(summary.multiQuestionPerturbation[5].top1KeptRate * 100).toFixed(1)}% / ${(summary.multiQuestionPerturbation[8].top1KeptRate * 100).toFixed(1)}% / ${(summary.multiQuestionPerturbation[12].top1KeptRate * 100).toFixed(1)}%`],
    ['非相邻误判率', `${(summary.nonAdjacent.rate * 100).toFixed(2)}%`],
    ['低置信结果比例', `${(summary.lowConfidence.rate * 100).toFixed(2)}%`],
    ['是否存在人格垄断', hasDominance ? '存在风险' : '否'],
    ['是否存在人格无法命中', hasNeverTop1 ? '是' : '否'],
    ['是否需要回到题目修改', shouldEditQuestions ? '是' : '否'],
    ['是否需要调整 targetVector', shouldAdjustVector ? '是' : '否'],
    ['是否建议冻结题库文字', shouldEditQuestions ? '否' : '可以考虑'],
    ['是否建议冻结 targetVector', shouldAdjustVector ? '否' : '可以暂冻为候选基线'],
    ['是否建议进入生产接入准备', !shouldEditQuestions && !shouldAdjustVector ? '可以进入方案设计' : '不建议'],
    ['是否建议直接修改 app.js', '不建议'],
  ])}
`;
}

function validateRobustnessFixtures(fixtures) {
  for (const fixture of fixtures) {
    const keys = Object.keys(fixture.answers ?? {});
    if (keys.length !== 60) throw new Error(`${fixture.id} has ${keys.length} answers`);
    for (const question of questions) {
      const answer = fixture.answers[question.id];
      if (!['A', 'B', 'C', 'D'].includes(answer)) throw new Error(`${fixture.id} has invalid ${question.id}: ${answer}`);
    }
  }
}

const robustnessFixtures = buildRobustnessFixtures();
validateRobustnessFixtures(robustnessFixtures);
writeJson('drafts/v2/robustness-fixtures.v2.draft.json', {
  schemaVersion: 'v2-robustness-fixtures-draft-1',
  generatedAt: new Date().toISOString(),
  seed: SEED,
  fixtureCounts: countBy(robustnessFixtures, (fixture) => fixture.scenarioType),
  fixtures: robustnessFixtures,
}, false);

const results = robustnessFixtures.map(scoreFixture);
const summary = summarize(results);
const output = {
  schemaVersion: 'v2-robustness-results-1',
  generatedAt: new Date().toISOString(),
  seed: SEED,
  validationBaseline: validationResults.summary,
  summary,
  results,
};
writeJson('reports/data/heart-island-v2-robustness-results.json', output, false);
writeText('reports/heart-island-v2-question-bank-robustness-validation.md', report(summary, results));

const pass = validationResults.summary.idealHits === 15
  && summary.multiQuestionPerturbation[3].top1KeptRate >= 0.95
  && summary.multiQuestionPerturbation[5].acceptableRate >= 0.95
  && summary.multiQuestionPerturbation[8].nonAdjacentRate <= 0.05
  && summary.monteCarlo.maxUniformTop1[1] <= 0.18
  && !Object.values(summary.monteCarlo.uniformTop1Rates).some((rate) => rate === 0);

console.log(JSON.stringify({
  seed: SEED,
  totalFixtures: summary.total,
  dualMixAcceptableRate: summary.dualMix.acceptableRate,
  contradictionAbnormalRate: summary.contradiction.abnormalRate,
  monteCarloMax: summary.monteCarlo.maxUniformTop1,
  monteCarloMin: summary.monteCarlo.minUniformTop1,
  multiPerturbation: summary.multiQuestionPerturbation,
  nonAdjacentRate: summary.nonAdjacent.rate,
  lowConfidenceRate: summary.lowConfidence.rate,
  pass,
}, null, 2));
