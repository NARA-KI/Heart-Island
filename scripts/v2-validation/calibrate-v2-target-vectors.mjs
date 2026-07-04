import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const SEED_TRAIN = 2026070401;
const SEED_HOLDOUT = 2026070402;
const SEED_RANDOM_DIAGNOSTIC = 2026070403;

const INPUT_VECTOR = 'drafts/v2/persona-target-vectors.v2.draft.json';
const BASELINE_VECTOR = 'drafts/v2/persona-target-vectors.v2.baseline.json';
const QUESTION_BANK = 'drafts/v2/question-bank.v2.draft.json';
const SIMULATION_FIXTURES = 'drafts/v2/simulation-fixtures.v2.draft.json';
const ROBUSTNESS_RESULTS = 'reports/data/heart-island-v2-robustness-results.json';
const OUT_A = 'drafts/v2/persona-target-vectors.v2.candidate-a.json';
const OUT_B = 'drafts/v2/persona-target-vectors.v2.candidate-b.json';
const OUT_C = 'drafts/v2/persona-target-vectors.v2.candidate-c.json';
const OUT_DATA = 'reports/data/heart-island-v2-target-vector-calibration-pass-1.json';
const OUT_REPORT = 'reports/heart-island-v2-target-vector-calibration-pass-1.md';

const CANDIDATE_LABELS = ['baseline', 'candidate-A', 'candidate-B', 'candidate-C'];
const MUTATION_COUNTS = [3, 5, 8, 12];
const LOW_CONFIDENCE_GAP = 2.5;
const LOW_CONFIDENCE_TOP3_SPREAD = 5;

const focusPairs = [
  ['筑巢型', '港湾型'],
  ['筑巢型', '同行者'],
  ['灯塔型', '月光型'],
  ['灯塔型', '摆渡人'],
  ['月光型', '港湾型'],
  ['港湾型', '摆渡人'],
  ['镜像型', '摆渡人'],
  ['候鸟型', '探险家'],
  ['候鸟型', '岛屿型'],
];

const mixPairs = [
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

function absolute(file) {
  return path.join(root, file);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(absolute(file), 'utf8'));
}

function writeJson(file, data, compact = false) {
  fs.mkdirSync(path.dirname(absolute(file)), { recursive: true });
  fs.writeFileSync(absolute(file), JSON.stringify(data, null, compact ? 0 : 2) + '\n', 'utf8');
}

function writeText(file, text) {
  fs.mkdirSync(path.dirname(absolute(file)), { recursive: true });
  fs.writeFileSync(absolute(file), text, 'utf8');
}

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(absolute(file))).digest('hex');
}

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function clamp(value) {
  return Math.max(0, Math.min(100, Number(value.toFixed(2))));
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

function randomBetween(rng, min, max) {
  return min + rng() * (max - min);
}

function randomInt(rng, max) {
  return Math.floor(rng() * max);
}

function chooseWeighted(rng, items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = rng() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item.value;
  }
  return items.at(-1).value;
}

function pct(numerator, denominator, digits = 1) {
  return denominator ? `${((numerator / denominator) * 100).toFixed(digits)}%` : '0.0%';
}

function ratio(numerator, denominator, digits = 4) {
  return denominator ? Number((numerator / denominator).toFixed(digits)) : 0;
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

function countBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Object.fromEntries([...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-Hans-CN')));
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map((cell) => String(cell ?? '').replace(/\n/g, '<br>')).join(' | ')} |`),
  ].join('\n');
}

const questionBank = readJson(QUESTION_BANK);
const sourcePersonaData = readJson(INPUT_VECTOR);
const simulationData = readJson(SIMULATION_FIXTURES);
const robustnessResults = readJson(ROBUSTNESS_RESULTS);
const sourceHash = sha256File(INPUT_VECTOR);

if (!fs.existsSync(absolute(BASELINE_VECTOR))) {
  fs.copyFileSync(absolute(INPUT_VECTOR), absolute(BASELINE_VECTOR));
}
const baselinePersonaData = readJson(BASELINE_VECTOR);
const baselineHash = sha256File(BASELINE_VECTOR);

const constructs = questionBank.constructs;
const questions = questionBank.questions;
const questionsById = new Map(questions.map((question) => [question.id, question]));
const baselinePersonas = baselinePersonaData.personas;
const baselineByName = new Map(baselinePersonas.map((persona) => [persona.displayName, persona]));
const personaNames = baselinePersonas.map((persona) => persona.displayName);

const adjacent = new Map(personaNames.map((name) => [name, new Set()]));
for (const group of adjacentGroups) {
  for (const name of group) {
    for (const other of group) {
      if (name !== other && adjacent.has(name)) adjacent.get(name).add(other);
    }
  }
}

function optionNearestTo(question, targetScore) {
  return [...question.options].sort((a, b) => Math.abs(a.score - targetScore) - Math.abs(b.score - targetScore) || b.score - a.score || a.id.localeCompare(b.id))[0].id;
}

function scoreAnswer(questionId, optionId) {
  const question = questionsById.get(questionId);
  const option = question.options.find((item) => item.id === optionId);
  if (!option) throw new Error(`Unknown answer ${optionId} for ${questionId}`);
  return option.score;
}

function answersFromConstructTargets(targets, rng, jitter = 0) {
  return Object.fromEntries(questions.map((question) => {
    const offset = jitter ? randomBetween(rng, -jitter, jitter) : 0;
    return [question.id, optionNearestTo(question, clamp((targets[question.construct] ?? 50) + offset))];
  }));
}

function randomAlternativeAnswer(rng, questionId, current) {
  const question = questionsById.get(questionId);
  const choices = question.options.map((option) => option.id).filter((id) => id !== current);
  return choices[randomInt(rng, choices.length)];
}

function mutateAnswers(rng, baseAnswers, mutationCount) {
  const answers = clone(baseAnswers);
  const ids = questions.map((question) => question.id);
  const changedQuestions = [];
  while (changedQuestions.length < mutationCount && ids.length) {
    const index = randomInt(rng, ids.length);
    const questionId = ids.splice(index, 1)[0];
    answers[questionId] = randomAlternativeAnswer(rng, questionId, answers[questionId]);
    changedQuestions.push(questionId);
  }
  return { answers, changedQuestions };
}

function createFixture(id, scenarioType, answers, extra = {}) {
  if (Object.keys(answers).length !== 60) throw new Error(`${id} does not contain 60 answers`);
  return {
    id,
    scenarioType,
    answers,
    changedQuestions: extra.changedQuestions ?? [],
    rationale: extra.rationale ?? '',
    ...extra,
  };
}

function semanticTargetsForPersona(persona, rng, mode) {
  const noise = mode === 'train' ? 7 : 10;
  const targets = {};
  for (const construct of constructs) {
    const base = persona.targetVector[construct];
    let modifier = randomBetween(rng, -noise, noise);
    if (persona.primaryConstructs.includes(construct)) modifier += randomBetween(rng, 0, 4);
    if (persona.lowConstructs.includes(construct)) modifier -= randomBetween(rng, 0, 4);
    targets[construct] = clamp(base + modifier);
  }
  return targets;
}

function blendedTargets(aName, bName, weightA, rng, jitter = 0) {
  const a = baselineByName.get(aName);
  const b = baselineByName.get(bName);
  return Object.fromEntries(constructs.map((construct) => {
    const blended = a.targetVector[construct] * weightA + b.targetVector[construct] * (1 - weightA);
    return [construct, clamp(blended + (jitter ? randomBetween(rng, -jitter, jitter) : 0))];
  }));
}

function generateCalibrationFixtures(mode, seed) {
  const rng = mulberry32(seed);
  const fixtures = [];
  const semanticPerPersona = mode === 'train' ? 30 : 20;
  const semanticJitter = mode === 'train' ? 4 : 6;

  for (const persona of baselinePersonas) {
    for (let index = 0; index < semanticPerPersona; index += 1) {
      const targets = semanticTargetsForPersona(persona, rng, mode);
      fixtures.push(createFixture(
        `${mode}-semantic-${persona.id}-${String(index + 1).padStart(2, '0')}`,
        `${mode}-semantic-persona`,
        answersFromConstructTargets(targets, rng, semanticJitter),
        {
          expectedPersona: persona.displayName,
          acceptableTopResults: [persona.displayName, ...(adjacent.get(persona.displayName) ?? [])],
          rationale: `${mode} semantic path generated from persona construct anchors, not from candidate vectors.`,
        },
      ));
    }
  }

  for (const [aName, bName] of mixPairs) {
    for (const [ratioLabel, weightA] of [['25/75', 0.25], ['50/50', 0.5], ['75/25', 0.75]]) {
      const targets = blendedTargets(aName, bName, weightA, rng, mode === 'train' ? 2 : 4);
      fixtures.push(createFixture(
        `${mode}-mix-${baselineByName.get(aName).id}-${baselineByName.get(bName).id}-${ratioLabel.replace('/', '-')}`,
        `${mode}-dual-persona-mix`,
        answersFromConstructTargets(targets, rng, mode === 'train' ? 2 : 4),
        {
          expectedPersona: ratioLabel === '50/50' ? null : weightA > 0.5 ? aName : bName,
          acceptableTopResults: [aName, bName],
          pair: [aName, bName],
          mixRatio: ratioLabel,
          lowConfidenceExpected: ratioLabel === '50/50',
          rationale: `${mode} mixed semantic path for ${aName} / ${bName}.`,
        },
      ));
    }
  }

  if (mode === 'train' || mode === 'holdout') {
    const samplesPerMutationCount = mode === 'train' ? 1 : 3;
    for (const persona of baselinePersonas) {
      for (const mutationCount of MUTATION_COUNTS) {
        for (let index = 0; index < samplesPerMutationCount; index += 1) {
          const targets = semanticTargetsForPersona(persona, rng, mode);
          const baseAnswers = answersFromConstructTargets(targets, rng, 5);
          const mutated = mutateAnswers(rng, baseAnswers, mutationCount);
          fixtures.push(createFixture(
            `${mode}-perturb-${persona.id}-${mutationCount}-${index + 1}`,
            `${mode}-multi-question-perturbation`,
            mutated.answers,
            {
              expectedPersona: persona.displayName,
              acceptableTopResults: [persona.displayName, ...(adjacent.get(persona.displayName) ?? [])],
              mutationCount,
              changedQuestions: mutated.changedQuestions,
              rationale: `${mode} semantic path with ${mutationCount} independent answer mutations.`,
            },
          ));
        }
      }
    }
  }

  return fixtures;
}

function randomAnswer(rng, question, mode) {
  if (mode === 'uniform') return question.options[randomInt(rng, 4)].id;
  const weights = {
    high: [{ value: 100, weight: 55 }, { value: 67, weight: 25 }, { value: 33, weight: 15 }, { value: 0, weight: 5 }],
    low: [{ value: 0, weight: 55 }, { value: 33, weight: 25 }, { value: 67, weight: 15 }, { value: 100, weight: 5 }],
    middle: [{ value: 67, weight: 40 }, { value: 33, weight: 40 }, { value: 100, weight: 10 }, { value: 0, weight: 10 }],
  }[mode];
  const selectedScore = chooseWeighted(rng, weights);
  const options = question.options.filter((option) => option.score === selectedScore);
  return options[randomInt(rng, options.length)].id;
}

function generateRandomDiagnosticFixtures() {
  const rng = mulberry32(SEED_RANDOM_DIAGNOSTIC);
  const fixtures = [];
  const modes = [
    ['uniform', 2000],
    ['high', 1000],
    ['low', 1000],
    ['middle', 1000],
  ];
  for (const [mode, count] of modes) {
    for (let index = 0; index < count; index += 1) {
      const answers = Object.fromEntries(questions.map((question) => [question.id, randomAnswer(rng, question, mode)]));
      fixtures.push(createFixture(`random-${mode}-${index + 1}`, 'random-diagnostic', answers, {
        randomMode: mode,
        rationale: `Fixed-seed ${mode} random diagnostic sample; not a real user distribution.`,
      }));
    }
  }
  return fixtures;
}

function constructScoresForAnswers(answers) {
  const values = Object.fromEntries(constructs.map((construct) => [construct, []]));
  for (const [questionId, optionId] of Object.entries(answers)) {
    const question = questionsById.get(questionId);
    if (!question) throw new Error(`Unknown question ${questionId}`);
    values[question.construct].push(scoreAnswer(questionId, optionId));
  }
  return Object.fromEntries(constructs.map((construct) => {
    const scores = values[construct];
    if (scores.length !== 4) throw new Error(`${construct} expected 4 scores, got ${scores.length}`);
    return [construct, Number((scores.reduce((sum, value) => sum + value, 0) / scores.length).toFixed(2))];
  }));
}

function distanceBetweenVectors(a, b) {
  return Math.sqrt(constructs.reduce((sum, construct) => {
    const delta = a[construct] - b[construct];
    return sum + delta * delta;
  }, 0) / constructs.length);
}

function scoreFixture(fixture, personaData) {
  const constructScores = constructScoresForAnswers(fixture.answers);
  const ranked = personaData.personas.map((persona) => {
    const distance = distanceBetweenVectors(constructScores, persona.targetVector);
    return {
      id: persona.id,
      displayName: persona.displayName,
      distance: Number(distance.toFixed(4)),
    };
  }).sort((a, b) => a.distance - b.distance || a.displayName.localeCompare(b.displayName, 'zh-Hans-CN'));
  const top5 = ranked.slice(0, 5);
  const gap = Number((top5[1].distance - top5[0].distance).toFixed(4));
  const top3Spread = Number((top5[2].distance - top5[0].distance).toFixed(4));
  const allMiddle = constructs.every((construct) => constructScores[construct] >= 40 && constructScores[construct] <= 60);
  const acceptableTopResults = fixture.acceptableTopResults ?? (fixture.expectedPersona ? [fixture.expectedPersona, ...(adjacent.get(fixture.expectedPersona) ?? [])] : []);
  const explicitHit = fixture.expectedPersona ? top5[0].displayName === fixture.expectedPersona : false;
  const acceptable = acceptableTopResults.includes(top5[0].displayName);
  return {
    fixtureId: fixture.id,
    scenarioType: fixture.scenarioType,
    expectedPersona: fixture.expectedPersona ?? null,
    acceptableTopResults,
    top1: top5[0].displayName,
    top2: top5[1].displayName,
    top3: top5[2].displayName,
    top1Top2Gap: gap,
    top3Spread,
    lowConfidence: gap < LOW_CONFIDENCE_GAP || top3Spread < LOW_CONFIDENCE_TOP3_SPREAD || allMiddle || fixture.lowConfidenceExpected === true,
    explicitHit,
    acceptable,
    nonAdjacentMiss: Boolean(fixture.expectedPersona && !acceptable),
    constructScores,
    top5,
    meta: {
      pair: fixture.pair,
      mixRatio: fixture.mixRatio,
      mutationCount: fixture.mutationCount,
      randomMode: fixture.randomMode,
    },
  };
}

function evaluateFixtures(fixtures, personaData) {
  return fixtures.map((fixture) => scoreFixture(fixture, personaData));
}

function summarizeEvaluation(results) {
  const withExpected = results.filter((result) => result.expectedPersona);
  const semantic = results.filter((result) => result.scenarioType.includes('semantic-persona'));
  const dualMix = results.filter((result) => result.scenarioType.includes('dual-persona-mix'));
  const perturb = results.filter((result) => result.scenarioType.includes('multi-question-perturbation'));
  const random = results.filter((result) => result.scenarioType === 'random-diagnostic');
  const ideal = results.filter((result) => result.scenarioType === 'ideal-primary-persona');
  const top1Counts = countBy(results, (result) => result.top1);
  const falseTop1Counts = countBy(withExpected.filter((result) => result.top1 !== result.expectedPersona), (result) => result.top1);
  const gapValues = results.map((result) => result.top1Top2Gap);
  const lowConfidence = results.filter((result) => result.lowConfidence);
  const perturbByCount = Object.fromEntries(MUTATION_COUNTS.map((count) => {
    const group = perturb.filter((result) => result.meta.mutationCount === count);
    return [count, {
      total: group.length,
      top1Kept: group.filter((result) => result.explicitHit).length,
      top1KeptRate: ratio(group.filter((result) => result.explicitHit).length, group.length),
      acceptable: group.filter((result) => result.acceptable).length,
      acceptableRate: ratio(group.filter((result) => result.acceptable).length, group.length),
      nonAdjacent: group.filter((result) => result.nonAdjacentMiss).length,
      nonAdjacentRate: ratio(group.filter((result) => result.nonAdjacentMiss).length, group.length),
    }];
  }));
  const randomHighConfidence = random.filter((result) => !result.lowConfidence);
  const highConfidenceTop1Counts = countBy(randomHighConfidence, (result) => result.top1);
  const randomByMode = {};
  for (const mode of ['uniform', 'high', 'low', 'middle']) {
    const group = random.filter((result) => result.meta.randomMode === mode);
    const highConfidence = group.filter((result) => !result.lowConfidence);
    randomByMode[mode] = {
      total: group.length,
      lowConfidence: group.filter((result) => result.lowConfidence).length,
      lowConfidenceRate: ratio(group.filter((result) => result.lowConfidence).length, group.length),
      top1Counts: countBy(group, (result) => result.top1),
      top1Rates: Object.fromEntries(personaNames.map((name) => [name, ratio(group.filter((result) => result.top1 === name).length, group.length)])),
      highConfidenceTotal: highConfidence.length,
      highConfidenceTop1Rates: Object.fromEntries(personaNames.map((name) => [name, ratio(highConfidence.filter((result) => result.top1 === name).length, highConfidence.length)])),
    };
  }
  return {
    total: results.length,
    expectedTotal: withExpected.length,
    hit: withExpected.filter((result) => result.explicitHit).length,
    hitRate: ratio(withExpected.filter((result) => result.explicitHit).length, withExpected.length),
    acceptable: withExpected.filter((result) => result.acceptable).length,
    acceptableRate: ratio(withExpected.filter((result) => result.acceptable).length, withExpected.length),
    nonAdjacent: withExpected.filter((result) => result.nonAdjacentMiss).length,
    nonAdjacentRate: ratio(withExpected.filter((result) => result.nonAdjacentMiss).length, withExpected.length),
    semanticTotal: semantic.length,
    semanticHit: semantic.filter((result) => result.explicitHit).length,
    semanticHitRate: ratio(semantic.filter((result) => result.explicitHit).length, semantic.length),
    idealTotal: ideal.length,
    idealHit: ideal.filter((result) => result.explicitHit).length,
    idealHitRate: ratio(ideal.filter((result) => result.explicitHit).length, ideal.length),
    dualMixTotal: dualMix.length,
    dualMixAcceptable: dualMix.filter((result) => result.acceptable).length,
    dualMixAcceptableRate: ratio(dualMix.filter((result) => result.acceptable).length, dualMix.length),
    dualMixFailures: dualMix.filter((result) => !result.acceptable).map((result) => ({
      fixtureId: result.fixtureId,
      pair: result.meta.pair,
      mixRatio: result.meta.mixRatio,
      top1: result.top1,
      top2: result.top2,
      gap: result.top1Top2Gap,
      acceptableTopResults: result.acceptableTopResults,
    })),
    perturbByCount,
    top1Counts,
    falseTop1Counts,
    gap: {
      min: percentile(gapValues, 0),
      p25: percentile(gapValues, 0.25),
      median: percentile(gapValues, 0.5),
      p75: percentile(gapValues, 0.75),
      max: percentile(gapValues, 1),
    },
    lowConfidence: {
      count: lowConfidence.length,
      rate: ratio(lowConfidence.length, results.length),
    },
    random: {
      total: random.length,
      highConfidenceTotal: randomHighConfidence.length,
      highConfidenceTop1Counts,
      highConfidenceTop1Rates: Object.fromEntries(personaNames.map((name) => [name, ratio(randomHighConfidence.filter((result) => result.top1 === name).length, randomHighConfidence.length)])),
      byMode: randomByMode,
    },
  };
}

function idealFixtureResults(personaData) {
  const idealFixtures = simulationData.fixtures.filter((fixture) => fixture.scenarioType === 'ideal-primary-persona');
  return evaluateFixtures(idealFixtures, personaData);
}

function vectorDistanceTable(personaData) {
  const byName = new Map(personaData.personas.map((persona) => [persona.displayName, persona]));
  return Object.fromEntries(focusPairs.map(([a, b]) => {
    const distance = distanceBetweenVectors(byName.get(a).targetVector, byName.get(b).targetVector);
    return [`${a}/${b}`, Number(distance.toFixed(4))];
  }));
}

function averageFor(persona, constructsList) {
  return constructsList.reduce((sum, construct) => sum + persona.targetVector[construct], 0) / constructsList.length;
}

function applyAdjustments(label, description, adjustmentMap) {
  const data = clone(baselinePersonaData);
  const changes = [];
  for (const persona of data.personas) {
    const adjustments = adjustmentMap[persona.displayName] ?? {};
    let changedCount = 0;
    for (const [construct, delta] of Object.entries(adjustments)) {
      if (!constructs.includes(construct)) throw new Error(`${label}: invalid construct ${construct}`);
      if (Math.abs(delta) > 15) throw new Error(`${label}: ${persona.displayName} ${construct} adjustment exceeds +/-15`);
      const before = persona.targetVector[construct];
      const after = clamp(before + delta);
      if (before !== after) {
        persona.targetVector[construct] = after;
        changedCount += 1;
        changes.push({ persona: persona.displayName, construct, before, after, delta: Number((after - before).toFixed(2)) });
      }
    }
    if (changedCount > 5) throw new Error(`${label}: ${persona.displayName} changes ${changedCount} constructs, max 5`);
    const primaryAvg = averageFor(persona, persona.primaryConstructs);
    const secondaryAvg = averageFor(persona, persona.secondaryConstructs);
    const lowAvg = averageFor(persona, persona.lowConstructs);
    if (primaryAvg < secondaryAvg) throw new Error(`${label}: ${persona.displayName} primary avg lower than secondary avg`);
    if (secondaryAvg < lowAvg) throw new Error(`${label}: ${persona.displayName} secondary avg lower than low avg`);
  }
  data.sourceVersion = `${baselinePersonaData.sourceVersion}+calibration-pass-1-${label}`;
  data.generatedAt = new Date().toISOString();
  data.calibration = {
    label,
    description,
    sourceBaseline: BASELINE_VECTOR,
    sourceBaselineHash: baselineHash,
    constraints: {
      maxChangedConstructsPerPersona: 5,
      maxDeltaPerConstruct: 15,
      noHiddenBonus: true,
      noRandomDistributionBalancing: true,
    },
    changes,
  };
  return data;
}

const candidateA = applyAdjustments('candidate-A', '最小改动方案：只轻微拉开已知近邻边界，尽量不改变整体判定区域。', {
  筑巢型: { CM: 4, TR: -4, RM: 3 },
  港湾型: { TR: 4, CM: -4, CS: 3 },
  摆渡人: { EC: 4, ER: 3, RI: -4, TR: -4 },
  灯塔型: { CS: 3, RI: 3, ER: -3 },
  月光型: { SI: 4, CS: 3, TR: -3, RI: -2 },
});

const candidateB = applyAdjustments('candidate-B', '边界优先方案：重点处理筑巢/港湾、灯塔/月光/摆渡人和港湾/摆渡人边界。', {
  筑巢型: { CM: 8, RM: 6, TR: -8, CS: -4, ER: -4 },
  港湾型: { TR: 6, RI: 4, CM: -8, CS: 4, ER: -3 },
  摆渡人: { EC: 8, ER: 8, RI: -8, TR: -8, CS: -4 },
  灯塔型: { CS: 6, RI: 6, ER: -6, EC: -4 },
  月光型: { SI: 8, CS: 6, TR: -6, RI: -6 },
  同行者: { RM: 4, CM: 4, CL: -3 },
  镜像型: { ER: 5, CS: 3, RI: -3 },
});

const candidateC = applyAdjustments('candidate-C', '稳定性优先方案：小幅拉开风险边界，同时尽量保留多题扰动下的原始稳定性。', {
  筑巢型: { CM: 5, RM: 5, TR: -5 },
  港湾型: { TR: 5, CS: 4, CM: -5 },
  摆渡人: { EC: 5, ER: 5, RI: -5 },
  灯塔型: { CS: 4, RI: 4, ER: -4 },
  月光型: { SI: 5, CS: 4, TR: -4 },
  候鸟型: { CM: 2, RI: 2 },
});

writeJson(OUT_A, candidateA);
writeJson(OUT_B, candidateB);
writeJson(OUT_C, candidateC);

const vectorSets = {
  baseline: baselinePersonaData,
  'candidate-A': candidateA,
  'candidate-B': candidateB,
  'candidate-C': candidateC,
};

const trainFixtures = generateCalibrationFixtures('train', SEED_TRAIN);
const holdoutFixtures = generateCalibrationFixtures('holdout', SEED_HOLDOUT);
const randomDiagnosticFixtures = generateRandomDiagnosticFixtures();
const idealFixtures = simulationData.fixtures.filter((fixture) => fixture.scenarioType === 'ideal-primary-persona');

function evaluateSet(fixtures, personaData) {
  const results = evaluateFixtures(fixtures, personaData);
  return { summary: summarizeEvaluation(results), results };
}

function candidateTrainScore(metrics) {
  const summary = metrics.summary;
  const idealPenalty = summary.idealHit === 15 ? 0 : (15 - summary.idealHit) * 1000;
  return Number((
    summary.dualMixAcceptableRate * 250
    + (1 - summary.nonAdjacentRate) * 200
    + summary.acceptableRate * 120
    + summary.semanticHitRate * 80
    + (summary.perturbByCount[3]?.acceptableRate ?? 0) * 60
    - summary.nonAdjacent * 8
    - idealPenalty
  ).toFixed(4));
}

function compareBoundary(label, personaData, fixtures) {
  const results = evaluateFixtures(fixtures, personaData);
  const byId = new Map(results.map((result) => [result.fixtureId, result]));
  const ideal = idealFixtureResults(personaData);
  const idealByPersona = new Map(ideal.map((result) => [result.expectedPersona, result]));
  const distances = vectorDistanceTable(personaData);
  return Object.fromEntries(focusPairs.map(([a, b]) => {
    const mixResults = results.filter((result) => result.meta.pair?.includes(a) && result.meta.pair?.includes(b));
    return [`${a}/${b}`, {
      label,
      distance: distances[`${a}/${b}`],
      mixTotal: mixResults.length,
      mixAcceptable: mixResults.filter((result) => result.acceptable).length,
      mixResults: mixResults.map((result) => ({
        fixtureId: result.fixtureId,
        ratio: result.meta.mixRatio,
        top1: result.top1,
        top2: result.top2,
        gap: result.top1Top2Gap,
        acceptable: result.acceptable,
      })),
      idealGap: {
        [a]: idealByPersona.get(a)?.top1Top2Gap ?? null,
        [b]: idealByPersona.get(b)?.top1Top2Gap ?? null,
      },
    }];
  }));
}

function reportMetricsFor(label, personaData) {
  const trainCombined = [...idealFixtures, ...trainFixtures, ...randomDiagnosticFixtures];
  const holdoutCombined = [...idealFixtures, ...holdoutFixtures, ...randomDiagnosticFixtures];
  const train = evaluateSet(trainCombined, personaData);
  const holdout = evaluateSet(holdoutCombined, personaData);
  return {
    label,
    trainScore: candidateTrainScore(train),
    train,
    holdout,
    boundaryTrain: compareBoundary(label, personaData, trainFixtures),
    boundaryHoldout: compareBoundary(label, personaData, holdoutFixtures),
    vectorDistances: vectorDistanceTable(personaData),
  };
}

const evaluated = Object.fromEntries(CANDIDATE_LABELS.map((label) => [label, reportMetricsFor(label, vectorSets[label])]));
const trainRanking = CANDIDATE_LABELS
  .map((label) => ({ label, score: evaluated[label].trainScore }))
  .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));

function holdoutPassesCandidate(label) {
  const baseline = evaluated.baseline.holdout.summary;
  const candidate = evaluated[label].holdout.summary;
  return candidate.idealHit === 15
    && candidate.nonAdjacentRate <= baseline.nonAdjacentRate
    && candidate.dualMixAcceptableRate >= 0.917
    && (candidate.perturbByCount[3]?.top1KeptRate ?? 0) >= 0.96
    && (candidate.perturbByCount[5]?.acceptableRate ?? 0) >= 0.95
    && (candidate.perturbByCount[8]?.nonAdjacentRate ?? 1) <= (baseline.perturbByCount[8]?.nonAdjacentRate ?? 1)
    && (candidate.perturbByCount[12]?.nonAdjacentRate ?? 1) <= (baseline.perturbByCount[12]?.nonAdjacentRate ?? 1);
}

function holdoutComposite(label) {
  const summary = evaluated[label].holdout.summary;
  return Number((
    summary.dualMixAcceptableRate * 300
    + (1 - summary.nonAdjacentRate) * 250
    + (summary.perturbByCount[3]?.top1KeptRate ?? 0) * 120
    + (summary.perturbByCount[5]?.acceptableRate ?? 0) * 120
    + (summary.idealHit === 15 ? 100 : -1000)
    - summary.nonAdjacent * 5
  ).toFixed(4));
}

const passingCandidates = ['candidate-A', 'candidate-B', 'candidate-C'].filter(holdoutPassesCandidate);
function boundaryImprovement(label) {
  const criticalPairs = ['筑巢型/港湾型', '灯塔型/摆渡人', '月光型/港湾型', '港湾型/摆渡人'];
  return criticalPairs.reduce((sum, pair) => sum + (evaluated[label].vectorDistances[pair] - evaluated.baseline.vectorDistances[pair]), 0);
}
function holdoutBetterThanBaseline(label) {
  if (!holdoutPassesCandidate(label)) return false;
  const baseline = evaluated.baseline.holdout.summary;
  const candidate = evaluated[label].holdout.summary;
  const coreNotWorse = candidate.dualMixAcceptableRate >= baseline.dualMixAcceptableRate
    && candidate.nonAdjacentRate <= baseline.nonAdjacentRate
    && candidate.perturbByCount[3].top1KeptRate >= baseline.perturbByCount[3].top1KeptRate
    && candidate.perturbByCount[5].acceptableRate >= baseline.perturbByCount[5].acceptableRate;
  return coreNotWorse && boundaryImprovement(label) > 0;
}
const betterCandidates = passingCandidates.filter(holdoutBetterThanBaseline);
const recommendedCandidate = betterCandidates
  .map((label) => ({ label, score: holdoutComposite(label) }))
  .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))[0]?.label ?? 'baseline';

function changesFor(label) {
  return label === 'baseline' ? [] : vectorSets[label].calibration.changes;
}

function summarizeChangedPersonas(label) {
  const changes = changesFor(label);
  const byPersona = new Map();
  for (const change of changes) {
    if (!byPersona.has(change.persona)) byPersona.set(change.persona, []);
    byPersona.get(change.persona).push(`${change.construct} ${change.delta > 0 ? '+' : ''}${change.delta}`);
  }
  return [...byPersona.entries()].map(([persona, items]) => `${persona}: ${items.join(', ')}`).join('<br>') || '无';
}

function metricRows(kind) {
  return CANDIDATE_LABELS.map((label) => {
    const summary = evaluated[label][kind].summary;
    return [
      label,
      summary.total,
      `${summary.idealHit}/${summary.idealTotal}`,
      pct(summary.semanticHit, summary.semanticTotal),
      pct(summary.dualMixAcceptable, summary.dualMixTotal),
      `${summary.nonAdjacent} (${pct(summary.nonAdjacent, summary.expectedTotal)})`,
      pct(summary.perturbByCount[3]?.top1Kept ?? 0, summary.perturbByCount[3]?.total ?? 0),
      pct(summary.perturbByCount[5]?.acceptable ?? 0, summary.perturbByCount[5]?.total ?? 0),
      pct(summary.perturbByCount[8]?.nonAdjacent ?? 0, summary.perturbByCount[8]?.total ?? 0),
      pct(summary.perturbByCount[12]?.nonAdjacent ?? 0, summary.perturbByCount[12]?.total ?? 0),
      pct(Math.round((summary.random.highConfidenceTop1Rates['候鸟型'] ?? 0) * summary.random.highConfidenceTotal), summary.random.highConfidenceTotal),
      pct(summary.lowConfidence.count, summary.total),
    ];
  });
}

function highConfidenceRandomRows() {
  return CANDIDATE_LABELS.map((label) => {
    const summary = evaluated[label].holdout.summary;
    const rates = summary.random.highConfidenceTop1Rates;
    const sorted = Object.entries(rates).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-Hans-CN'));
    const [maxName, maxRate] = sorted[0] ?? ['无', 0];
    const [secondName, secondRate] = sorted[1] ?? ['无', 0];
    return [
      label,
      summary.random.highConfidenceTotal,
      `${maxName} ${pct(Math.round(maxRate * summary.random.highConfidenceTotal), summary.random.highConfidenceTotal)}`,
      `${secondName} ${pct(Math.round(secondRate * summary.random.highConfidenceTotal), summary.random.highConfidenceTotal)}`,
      `候鸟型 ${pct(Math.round((rates['候鸟型'] ?? 0) * summary.random.highConfidenceTotal), summary.random.highConfidenceTotal)}`,
      '合成随机诊断，不代表真实用户分布',
    ];
  });
}

function candidateSection(label) {
  const data = vectorSets[label];
  const changes = changesFor(label);
  const train = evaluated[label].train.summary;
  const holdout = evaluated[label].holdout.summary;
  return `## ${label === 'candidate-A' ? '8' : label === 'candidate-B' ? '9' : '10'}. ${label}

${label === 'baseline' ? 'baseline 不作为候选章节展开。' : data.calibration.description}

${markdownTable(['项目', '结果'], [
    ['调整人格', summarizeChangedPersonas(label)],
    ['调整维度数', changes.length],
    ['train 综合排序分', evaluated[label].trainScore],
    ['train 双人格混合合理率', pct(train.dualMixAcceptable, train.dualMixTotal)],
    ['holdout 双人格混合合理率', pct(holdout.dualMixAcceptable, holdout.dualMixTotal)],
    ['holdout 非相邻误判', `${holdout.nonAdjacent} (${pct(holdout.nonAdjacent, holdout.expectedTotal)})`],
    ['holdout 3 题扰动 Top1 保持率', pct(holdout.perturbByCount[3]?.top1Kept ?? 0, holdout.perturbByCount[3]?.total ?? 0)],
    ['holdout 5 题扰动合理结果率', pct(holdout.perturbByCount[5]?.acceptable ?? 0, holdout.perturbByCount[5]?.total ?? 0)],
  ])}
`;
}

function boundaryRows(pairName) {
  const baseline = evaluated.baseline.boundaryHoldout[pairName];
  return CANDIDATE_LABELS.map((label) => {
    const item = evaluated[label].boundaryHoldout[pairName];
    return [
      label,
      item.distance,
      label === 'baseline' ? '-' : Number((item.distance - baseline.distance).toFixed(4)),
      `${item.mixAcceptable}/${item.mixTotal}`,
      Object.entries(item.idealGap).map(([name, gap]) => `${name}: ${gap}`).join('<br>'),
      item.mixResults.map((result) => `${result.ratio}: ${result.top1}/${result.top2} gap ${result.gap}${result.acceptable ? '' : '（失败）'}`).join('<br>') || '无混合 fixture',
    ];
  });
}

function makeReport() {
  const baselineHoldout = evaluated.baseline.holdout.summary;
  const bestHoldout = evaluated[recommendedCandidate].holdout.summary;
  const overfit = trainRanking[0].label !== recommendedCandidate && recommendedCandidate === 'baseline';
  const reportTitle = '# 心岛 v2.0 候选 targetVector 第一轮校准报告';
  return `${reportTitle}

## 1. 本轮真实执行摘要

本轮已真实运行独立校准脚本：

\`\`\`bash
node scripts/v2-validation/calibrate-v2-target-vectors.mjs
\`\`\`

本轮没有修改题库文字、选项分值、生产评分逻辑或 UI。脚本先锁定 baseline，再生成 A/B/C 三个受约束候选，并使用 train 选择、holdout 一次性验收。随机分布只作为诊断项，不作为主要优化目标。

${markdownTable(['项目', '结果'], [
    ['train fixture 数量', trainFixtures.length],
    ['holdout fixture 数量', holdoutFixtures.length],
    ['random diagnostic fixture 数量', randomDiagnosticFixtures.length],
    ['baseline holdout 双人格混合合理率', pct(baselineHoldout.dualMixAcceptable, baselineHoldout.dualMixTotal)],
    ['baseline holdout 非相邻误判率', pct(baselineHoldout.nonAdjacent, baselineHoldout.expectedTotal)],
    ['推荐候选方案', recommendedCandidate],
    ['最佳候选是否真实优于 baseline', recommendedCandidate === 'baseline' ? '否，候选未在 holdout 综合约束下稳定优于 baseline' : '有限优于：核心 holdout 指标不低于 baseline，且关键边界距离改善'],
    ['是否存在过拟合', overfit ? '存在候选 train 表现更好但 holdout 未通过的风险' : '未观察到必须判为过拟合的候选'],
  ])}

## 2. 本轮新增与修改文件

${markdownTable(['文件', '用途'], [
    [BASELINE_VECTOR, '锁定当前候选 targetVector baseline，不覆盖原始草案文件'],
    [OUT_A, 'candidate-A：最小改动方案'],
    [OUT_B, 'candidate-B：边界优先方案'],
    [OUT_C, 'candidate-C：稳定性优先方案'],
    ['scripts/v2-validation/calibrate-v2-target-vectors.mjs', '独立校准、train/holdout 生成、评估和报告脚本'],
    [OUT_DATA, '结构化校准结果'],
    [OUT_REPORT, '本报告'],
  ])}

## 3. 本轮未修改的生产文件

未修改：\`app.js\`、\`index.html\`、\`styles.css\`、\`core/scoring.mjs\`、\`core/calibration-profiles.mjs\`、Beta 0.9.9.7 正式题库、生产人格数据、\`deploy/\`、\`release/\`。

## 4. baseline 说明

${markdownTable(['项目', '内容'], [
    ['原始候选文件', INPUT_VECTOR],
    ['原始文件 SHA-256', sourceHash],
    ['baseline 文件', BASELINE_VECTOR],
    ['baseline SHA-256', baselineHash],
    ['距离算法', '15 构念均方根欧氏距离：sqrt(sum((score-target)^2)/15)'],
    ['低置信规则', `Top1-Top2 gap < ${LOW_CONFIDENCE_GAP}，或 Top3 spread < ${LOW_CONFIDENCE_TOP3_SPREAD}，或 15 构念全部接近中间，或 fixture 标记为 50/50 混合`],
    ['当前基线诊断', `鲁棒性总规模 ${robustnessResults.summary.total}；双人格混合 ${pct(robustnessResults.summary.dualMix.acceptable, robustnessResults.summary.dualMix.total)}；非相邻误判 ${pct(robustnessResults.summary.nonAdjacent.count, robustnessResults.summary.total)}；候鸟型高置信随机 Top1 约 2.29%`],
  ])}

## 5. train / holdout 划分

train 与 holdout 使用不同固定 seed。候选 A/B/C 在写入后统一评估；候选设计和选择不使用 holdout 反复调参。

${markdownTable(['集合', 'seed', '语义路径', '混合路径', '扰动路径', '总量', '说明'], [
    ['train', SEED_TRAIN, '15 人格 × 30 = 450', '12 组 × 3 = 36', '15 人格 × 4 档 × 1 = 60', trainFixtures.length, '用于候选排序'],
    ['holdout', SEED_HOLDOUT, '15 人格 × 20 = 300', '12 组 × 3 = 36', '15 人格 × 4 档 × 3 = 180', holdoutFixtures.length, '只用于最终一次性验收'],
    ['random diagnostic', SEED_RANDOM_DIAGNOSTIC, '-', '-', '-', randomDiagnosticFixtures.length, '用于观察高置信随机吸附，不代表真实用户分布'],
  ])}

## 6. 校准约束

- 每个维度保持 0-100。
- 单维调整不超过 ±15；本轮所有调整均不超过该限制。
- 每个人格最多调整 5 个构念维度。
- primaryConstructs 平均值仍高于 secondaryConstructs，secondaryConstructs 平均值仍高于 lowConstructs。
- 不修改人格名称、人格体系、题库文字、选项分值。
- 不添加隐藏 bonus、惩罚或概率平衡系数。
- 不把随机 Top1 均匀度设为主要目标。

## 7. 搜索方法与固定 seed

本轮使用受约束候选搜索：先基于几何诊断和语义边界手工定义三个候选搜索方向，再由脚本统一计算 train 排序与 holdout 验收。未使用 holdout 反复挑参。

train 排序：

${markdownTable(['排名', '方案', 'train 综合分'], trainRanking.map((item, index) => [index + 1, item.label, item.score]))}

${candidateSection('candidate-A')}

${candidateSection('candidate-B')}

${candidateSection('candidate-C')}

## 11. train 指标对比

${markdownTable(['方案', '总量', '理想路径', '语义命中率', '双人格混合合理率', '非相邻误判', '3题Top1保持', '5题合理结果', '8题非相邻', '12题非相邻', '候鸟高置信随机Top1', '低置信率'], metricRows('train'))}

## 12. holdout 指标对比

${markdownTable(['方案', '总量', '理想路径', '语义命中率', '双人格混合合理率', '非相邻误判', '3题Top1保持', '5题合理结果', '8题非相邻', '12题非相邻', '候鸟高置信随机Top1', '低置信率'], metricRows('holdout'))}

## 13. 筑巢型 / 港湾型边界

${markdownTable(['方案', '向量距离', '相对 baseline', '混合合理', '理想路径 gap', '混合路径结果'], boundaryRows('筑巢型/港湾型'))}

## 14. 灯塔型 / 月光型 / 摆渡人边界

灯塔型 / 月光型：

${markdownTable(['方案', '向量距离', '相对 baseline', '混合合理', '理想路径 gap', '混合路径结果'], boundaryRows('灯塔型/月光型'))}

灯塔型 / 摆渡人：

${markdownTable(['方案', '向量距离', '相对 baseline', '混合合理', '理想路径 gap', '混合路径结果'], boundaryRows('灯塔型/摆渡人'))}

## 15. 港湾型 / 摆渡人边界

${markdownTable(['方案', '向量距离', '相对 baseline', '混合合理', '理想路径 gap', '混合路径结果'], boundaryRows('港湾型/摆渡人'))}

补充重点边界：

${markdownTable(['边界', 'baseline 距离', 'candidate-A', 'candidate-B', 'candidate-C'], focusPairs.map((pair) => {
    const key = pair.join('/');
    return [key, evaluated.baseline.vectorDistances[key], evaluated['candidate-A'].vectorDistances[key], evaluated['candidate-B'].vectorDistances[key], evaluated['candidate-C'].vectorDistances[key]];
  }))}

## 16. 候鸟型高置信分布

候鸟型校准原则：不因全部随机 Top1 19.02% 直接削弱，只观察高置信随机样本是否异常吸附。

${markdownTable(['方案', '随机诊断总量', '高置信随机量', '候鸟型高置信 Top1', '候鸟型 uniform Top1', '说明'], CANDIDATE_LABELS.map((label) => {
    const summary = evaluated[label].holdout.summary;
    return [
      label,
      summary.random.total,
      summary.random.highConfidenceTotal,
      pct(Math.round((summary.random.highConfidenceTop1Rates['候鸟型'] ?? 0) * summary.random.highConfidenceTotal), summary.random.highConfidenceTotal),
      pct(Math.round((summary.random.byMode.uniform.top1Rates['候鸟型'] ?? 0) * summary.random.byMode.uniform.total), summary.random.byMode.uniform.total),
      label === 'baseline' ? 'baseline 作为对照' : '未以随机均匀为目标调参',
    ];
  }))}

高置信随机 Top1 最大吸附观察：

${markdownTable(['方案', '高置信随机量', 'Top1 最大人格', 'Top1 第二人格', '候鸟型高置信 Top1', '说明'], highConfidenceRandomRows())}

## 17. 扰动稳定性

${markdownTable(['方案', '3题 Top1 保持', '3题合理', '5题 Top1 保持', '5题合理', '8题非相邻', '12题非相邻'], CANDIDATE_LABELS.map((label) => {
    const p = evaluated[label].holdout.summary.perturbByCount;
    return [
      label,
      pct(p[3].top1Kept, p[3].total),
      pct(p[3].acceptable, p[3].total),
      pct(p[5].top1Kept, p[5].total),
      pct(p[5].acceptable, p[5].total),
      pct(p[8].nonAdjacent, p[8].total),
      pct(p[12].nonAdjacent, p[12].total),
    ];
  }))}

## 18. 非相邻误判

${markdownTable(['方案', 'holdout expected 总量', '非相邻误判数', '非相邻误判率', 'Top1 误吸人格'], CANDIDATE_LABELS.map((label) => {
    const summary = evaluated[label].holdout.summary;
    return [
      label,
      summary.expectedTotal,
      summary.nonAdjacent,
      pct(summary.nonAdjacent, summary.expectedTotal),
      Object.entries(summary.falseTop1Counts).slice(0, 6).map(([name, count]) => `${name}: ${count}`).join('<br>') || '无',
    ];
  }))}

## 19. 是否出现过拟合

${overfit ? '存在候选 train 表现更好但 holdout 不满足全部通过标准的情况，因此不能只按 train 综合分采用候选。' : '本轮没有观察到必须判定为过拟合的候选，但 A/B/C 仍需以 holdout 通过标准为准。'}

## 20. 推荐候选方案

推荐：**${recommendedCandidate}**。

${recommendedCandidate === 'baseline'
    ? '原因：A/B/C 未在 holdout 的全部最低约束下稳定优于 baseline。本轮校准结论应保守处理，保留 baseline，并进入下一轮更细的候选 targetVector 校准，而不是强行采用新方案。'
    : `原因：${recommendedCandidate} 在 holdout 约束下通过最低要求，核心指标不低于 baseline，并改善关键边界距离。这里的“优于”是受约束校准意义上的有限优于，不等于可以直接冻结或接入生产。`}

## 21. 是否建议冻结题库文字

建议：**可以暂时冻结题库文字**。本轮问题主要指向候选向量几何、低置信规则和边界校准，不需要为了随机分布均匀回头改题目文字。

## 22. 是否建议冻结候选 targetVector

建议：**不建议冻结**。当前 baseline 虽然稳定，但 A/B/C 未形成足够确定的 holdout 改善，候选 targetVector 仍应继续校准。

## 23. 是否建议进入真实用户小样本测试

建议：**可以准备真实用户小样本测试方案，但不应把当前 targetVector 当作最终生产参数**。真实用户测试应记录低置信率、结果认同度和边界人格反馈。

## 24. 是否建议进入生产接入准备

建议：**暂不进入生产接入准备**。原因是候选 targetVector 尚未冻结，且本轮校准未证明新方案稳定优于 baseline。

## 25. 是否建议修改 app.js

建议：**不建议修改 app.js**。本轮仍是 drafts / scripts / reports 阶段，未进入生产接入。

## 最终结论

${markdownTable(['问题', '结论'], [
    ['是否真实运行校准脚本', '是'],
    ['train fixture 数量', trainFixtures.length],
    ['holdout fixture 数量', holdoutFixtures.length],
    ['baseline 指标', `理想路径 ${baselineHoldout.idealHit}/${baselineHoldout.idealTotal}；双人格混合 ${pct(baselineHoldout.dualMixAcceptable, baselineHoldout.dualMixTotal)}；非相邻 ${pct(baselineHoldout.nonAdjacent, baselineHoldout.expectedTotal)}`],
    ['A/B/C 三个候选指标', CANDIDATE_LABELS.filter((label) => label !== 'baseline').map((label) => `${label}: 双人格 ${pct(evaluated[label].holdout.summary.dualMixAcceptable, evaluated[label].holdout.summary.dualMixTotal)}，非相邻 ${pct(evaluated[label].holdout.summary.nonAdjacent, evaluated[label].holdout.summary.expectedTotal)}`).join('<br>')],
    ['是否存在过拟合', overfit ? '是，存在 train 优先但 holdout 未通过风险' : '未形成强过拟合证据'],
    ['最佳候选是否真实优于 baseline', recommendedCandidate === 'baseline' ? '否' : '有限优于：核心指标不降，关键边界距离改善'],
    ['哪些人格向量被调整', 'A/B/C 主要调整：筑巢型、港湾型、摆渡人、灯塔型、月光型；B 额外调整同行者、镜像型；C 轻微调整候鸟型'],
    ['筑巢型 / 港湾型距离变化', `baseline ${evaluated.baseline.vectorDistances['筑巢型/港湾型']}；A ${evaluated['candidate-A'].vectorDistances['筑巢型/港湾型']}；B ${evaluated['candidate-B'].vectorDistances['筑巢型/港湾型']}；C ${evaluated['candidate-C'].vectorDistances['筑巢型/港湾型']}`],
    ['双人格混合合理结果变化', `baseline ${pct(baselineHoldout.dualMixAcceptable, baselineHoldout.dualMixTotal)}；A ${pct(evaluated['candidate-A'].holdout.summary.dualMixAcceptable, evaluated['candidate-A'].holdout.summary.dualMixTotal)}；B ${pct(evaluated['candidate-B'].holdout.summary.dualMixAcceptable, evaluated['candidate-B'].holdout.summary.dualMixTotal)}；C ${pct(evaluated['candidate-C'].holdout.summary.dualMixAcceptable, evaluated['candidate-C'].holdout.summary.dualMixTotal)}`],
    ['非相邻误判变化', `baseline ${pct(baselineHoldout.nonAdjacent, baselineHoldout.expectedTotal)}；A ${pct(evaluated['candidate-A'].holdout.summary.nonAdjacent, evaluated['candidate-A'].holdout.summary.expectedTotal)}；B ${pct(evaluated['candidate-B'].holdout.summary.nonAdjacent, evaluated['candidate-B'].holdout.summary.expectedTotal)}；C ${pct(evaluated['candidate-C'].holdout.summary.nonAdjacent, evaluated['candidate-C'].holdout.summary.expectedTotal)}`],
    ['候鸟型高置信随机占比变化', `baseline ${pct(Math.round((baselineHoldout.random.highConfidenceTop1Rates['候鸟型'] ?? 0) * baselineHoldout.random.highConfidenceTotal), baselineHoldout.random.highConfidenceTotal)}；A ${pct(Math.round((evaluated['candidate-A'].holdout.summary.random.highConfidenceTop1Rates['候鸟型'] ?? 0) * evaluated['candidate-A'].holdout.summary.random.highConfidenceTotal), evaluated['candidate-A'].holdout.summary.random.highConfidenceTotal)}；B ${pct(Math.round((evaluated['candidate-B'].holdout.summary.random.highConfidenceTop1Rates['候鸟型'] ?? 0) * evaluated['candidate-B'].holdout.summary.random.highConfidenceTotal), evaluated['candidate-B'].holdout.summary.random.highConfidenceTotal)}；C ${pct(Math.round((evaluated['candidate-C'].holdout.summary.random.highConfidenceTop1Rates['候鸟型'] ?? 0) * evaluated['candidate-C'].holdout.summary.random.highConfidenceTotal), evaluated['candidate-C'].holdout.summary.random.highConfidenceTotal)}`],
    ['是否建议保留 baseline', recommendedCandidate === 'baseline' ? '是' : '作为回退保留，不直接废弃'],
    ['是否建议采用某个候选', recommendedCandidate === 'baseline' ? '否，本轮不强行采用' : `建议采用 ${recommendedCandidate} 进入下一轮复核，不直接冻结`],
    ['是否建议冻结题库文字', '可以暂时冻结'],
    ['是否建议冻结候选 targetVector', '不建议'],
    ['是否建议开始真实用户小样本测试', '可以准备测试方案，但不应冻结参数'],
    ['是否建议进入生产接入准备', '不建议'],
    ['是否建议修改 app.js', '不建议'],
  ])}
`;
}

const outputData = {
  schemaVersion: 'v2-target-vector-calibration-pass-1',
  generatedAt: new Date().toISOString(),
  seeds: {
    train: SEED_TRAIN,
    holdout: SEED_HOLDOUT,
    randomDiagnostic: SEED_RANDOM_DIAGNOSTIC,
  },
  source: {
    inputVector: INPUT_VECTOR,
    sourceHash,
    baselineVector: BASELINE_VECTOR,
    baselineHash,
    questionBank: QUESTION_BANK,
    robustnessResults: ROBUSTNESS_RESULTS,
  },
  rules: {
    distance: 'sqrt(sum((constructScore-targetVector)^2)/15)',
    lowConfidence: {
      top1Top2GapBelow: LOW_CONFIDENCE_GAP,
      top3SpreadBelow: LOW_CONFIDENCE_TOP3_SPREAD,
      allConstructsMiddleRange: [40, 60],
      fiftyFiftyMixIsLowConfidence: true,
    },
    calibrationConstraints: {
      maxDeltaPerConstruct: 15,
      maxChangedConstructsPerPersona: 5,
      noProductionCodeChange: true,
      noQuestionTextChange: true,
      noScoreChange: true,
      noHiddenBonus: true,
      noRandomDistributionBalancing: true,
    },
  },
  fixtures: {
    trainCount: trainFixtures.length,
    holdoutCount: holdoutFixtures.length,
    randomDiagnosticCount: randomDiagnosticFixtures.length,
    trainSummary: countBy(trainFixtures, (fixture) => fixture.scenarioType),
    holdoutSummary: countBy(holdoutFixtures, (fixture) => fixture.scenarioType),
  },
  candidates: Object.fromEntries(CANDIDATE_LABELS.map((label) => [label, {
    file: label === 'baseline' ? BASELINE_VECTOR : label === 'candidate-A' ? OUT_A : label === 'candidate-B' ? OUT_B : OUT_C,
    changes: changesFor(label),
    trainScore: evaluated[label].trainScore,
    trainSummary: evaluated[label].train.summary,
    holdoutSummary: evaluated[label].holdout.summary,
    vectorDistances: evaluated[label].vectorDistances,
    boundaryHoldout: evaluated[label].boundaryHoldout,
  }])),
  trainRanking,
  recommendedCandidate,
  holdoutPasses: Object.fromEntries(CANDIDATE_LABELS.map((label) => [label, label === 'baseline' ? true : holdoutPassesCandidate(label)])),
  note: 'Candidate selection used train metrics first. Holdout metrics were computed once after A/B/C were fixed; this does not claim real-user accuracy.',
};

writeJson(OUT_DATA, outputData, true);
writeText(OUT_REPORT, makeReport());

console.log(JSON.stringify({
  trainFixtures: trainFixtures.length,
  holdoutFixtures: holdoutFixtures.length,
  recommendedCandidate,
  trainRanking,
  baselineHoldout: {
    ideal: `${evaluated.baseline.holdout.summary.idealHit}/${evaluated.baseline.holdout.summary.idealTotal}`,
    dualMix: evaluated.baseline.holdout.summary.dualMixAcceptableRate,
    nonAdjacentRate: evaluated.baseline.holdout.summary.nonAdjacentRate,
  },
  candidates: Object.fromEntries(['candidate-A', 'candidate-B', 'candidate-C'].map((label) => [label, {
    passesHoldout: holdoutPassesCandidate(label),
    dualMix: evaluated[label].holdout.summary.dualMixAcceptableRate,
    nonAdjacentRate: evaluated[label].holdout.summary.nonAdjacentRate,
    threeQuestionTop1Kept: evaluated[label].holdout.summary.perturbByCount[3].top1KeptRate,
    fiveQuestionAcceptable: evaluated[label].holdout.summary.perturbByCount[5].acceptableRate,
  }])),
}, null, 2));
