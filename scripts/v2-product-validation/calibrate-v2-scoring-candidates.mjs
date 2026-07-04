import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createSeededRng } from '../../js/v2/utils.js';

const root = process.cwd();
const dataDir = path.join(root, 'reports', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const UNIFORM_COUNT = Number(process.env.V2_CALIBRATION_UNIFORM || 100000);
const MODEL_COUNT = Number(process.env.V2_CALIBRATION_MODEL || 20000);
const ROBUSTNESS_VARIANTS = Number(process.env.V2_CALIBRATION_ROBUSTNESS || 1000);
const NEAR_TIE_RAW = 2.5;
const NEAR_TIE_Z = 0.18;
const LOW_RATE = 0.005;
const HIGH_RATE = 0.18;

const TRAIN_SEED = 'heart-island-v2-alpha-calibration-training-a';
const VALIDATION_SEED = 'heart-island-v2-alpha-calibration-validation-b';
const responseModes = [
  'middle',
  'extreme',
  'highAgreement',
  'lowAgreement',
  'conservative',
  'volatile',
  'constructConsistent',
  'constructConflict',
];
const personaNameById = {
  lighthouse: '灯塔型',
  gatekeeper: '守门人',
  'nest-builder': '筑巢型',
  collector: '收藏家',
  'migratory-bird': '候鸟型',
  islander: '岛屿型',
  explorer: '探险家',
  'wandering-poet': '流浪诗人',
  spark: '星火型',
  moonlight: '月光型',
  mirror: '镜像型',
  stargazer: '观星者',
  companion: '同行者',
  harbor: '港湾型',
  ferryman: '摆渡人',
};

const questionBank = readJson('data/v2/question-bank.v2.json');
const baseline = withProfile(readJson('data/v2/persona-target-vectors.v2.baseline.json'), 'baseline');
const candidateA = withProfile(readJson('data/v2/persona-target-vectors.v2.candidate-a.json'), 'candidate-a');
const reachability = readJson('reports/data/v2-persona-reachability.json');
const constructs = questionBank.constructs;
const questions = questionBank.questions.map((question, index) => ({
  ...question,
  order: index,
  constructIndex: constructs.indexOf(question.construct),
  sortedOptions: [...question.options].sort((a, b) => a.score - b.score || a.id.localeCompare(b.id)),
}));
const reachabilityAnswers = reachability.results.filter((item) => item.reached);

const sourceHashes = {
  questionBank: sha256File('data/v2/question-bank.v2.json'),
  baseline: sha256File('data/v2/persona-target-vectors.v2.baseline.json'),
  candidateA: sha256File('data/v2/persona-target-vectors.v2.candidate-a.json'),
};

const calibrationStats = computeConstructStats(TRAIN_SEED);
const candidateBSearch = searchCandidateB(calibrationStats);
const candidateB = candidateBSearch.selected.personaData;
const candidateC = makeProfileVectorCopy(candidateA, 'candidate-c', 'standardized-distance');
const candidateD = makeProfileVectorCopy(candidateA, 'candidate-d', 'standardized-shape-hybrid');
const candidateDSearch = searchCandidateD(calibrationStats);
const candidateDAlpha = candidateDSearch.selected.alpha;

writeJson('data/v2/persona-target-vectors.v2.candidate-b.json', candidateB);
writeJson('data/v2/persona-target-vectors.v2.candidate-c.json', candidateC);
writeJson('data/v2/persona-target-vectors.v2.candidate-d.json', candidateD);
writeJson('data/v2/scoring-profile.v2.candidate-c.json', {
  schemaVersion: 'v2-scoring-profile-alpha-1',
  id: 'candidate-c',
  method: 'standardized-distance',
  targetVectorFile: 'persona-target-vectors.v2.candidate-c.json',
  sourceProfile: 'candidate-a',
  standardization: calibrationStats.publicData,
  notes: 'Experimental profile only. Public runtime remains candidate-a until manual approval.',
});
writeJson('data/v2/scoring-profile.v2.candidate-d.json', {
  schemaVersion: 'v2-scoring-profile-alpha-1',
  id: 'candidate-d',
  method: 'standardized-shape-hybrid',
  targetVectorFile: 'persona-target-vectors.v2.candidate-d.json',
  sourceProfile: 'candidate-a',
  alpha: candidateDAlpha,
  testedAlphaValues: [0.6, 0.7, 0.8, 0.9],
  standardization: calibrationStats.publicData,
  notes: 'Experimental profile only. Public runtime remains candidate-a until manual approval.',
});

const profiles = [
  makeRawProfile('baseline', baseline),
  makeRawProfile('candidate-a', candidateA),
  makeRawProfile('candidate-b', candidateB),
  makeStandardizedProfile('candidate-c', candidateC, calibrationStats, 1),
  makeStandardizedProfile('candidate-d', candidateD, calibrationStats, candidateDAlpha, true),
];

const training = evaluateDataset('training', TRAIN_SEED, profiles);
const validation = evaluateDataset('validation', VALIDATION_SEED, profiles);
const robustness = evaluateRobustness(profiles);
const semanticDrift = evaluateSemanticDrift(profiles);
const comparison = buildComparison(training, validation, robustness, semanticDrift);
const responseStyle = buildResponseStyleData(training, validation);
const searchLog = {
  generatedAt: new Date().toISOString(),
  sourceHashes,
  trainingSeed: TRAIN_SEED,
  validationSeed: VALIDATION_SEED,
  searchRules: {
    validationSetNotUsedForTuning: true,
    publicRuntimeProfileRemains: 'candidate-a',
    candidateB: 'grid over fixed semantic delta intensity',
    candidateC: 'construct z-score standardization from training uniform set',
    candidateD: 'alpha grid over standardized absolute plus shape distance',
  },
  candidateBSearch,
  candidateDSearch,
};

writeJson('reports/data/v2-calibration-training-set-summary.json', training);
writeJson('reports/data/v2-calibration-validation-set-summary.json', validation);
writeJson('reports/data/v2-calibration-candidate-comparison.json', comparison);
writeJson('reports/data/v2-calibration-semantic-drift.json', semanticDrift);
writeJson('reports/data/v2-calibration-response-style.json', responseStyle);
writeJson('reports/data/v2-calibration-robustness.json', robustness);
writeJson('reports/data/v2-calibration-search-log.json', searchLog);
writeReport(comparison, training, validation, robustness, semanticDrift, responseStyle, searchLog);

console.log(JSON.stringify({
  generatedAt: comparison.generatedAt,
  selectedRecommendation: comparison.recommendation.recommendedCandidate,
  publicRuntimeProfile: 'candidate-a',
  training: comparison.trainingSummary,
  validation: comparison.validationSummary,
}, null, 2));

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function writeText(file, text) {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), text, 'utf8');
}

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function withProfile(data, profile) {
  return { ...data, scoringProfile: profile };
}

function makeProfileVectorCopy(source, profile, method) {
  const data = clone(source);
  data.scoringProfile = profile;
  data.sourceVersion = `${source.sourceVersion}+${profile}`;
  data.generatedAt = new Date().toISOString();
  data.calibration = {
    label: profile,
    method,
    sourceProfile: 'candidate-a',
    publicRuntime: false,
    notes: 'Experimental calibration candidate. It must not replace candidate-a without manual review.',
  };
  return data;
}

function makeRawProfile(id, personaData) {
  return {
    id,
    method: 'raw',
    nearTieGap: NEAR_TIE_RAW,
    personas: personaData.personas.map((persona, order) => ({
      id: persona.id,
      displayName: displayName(persona),
      order,
      vector: vectorArray(persona.targetVector),
      source: persona,
    })),
  };
}

function makeStandardizedProfile(id, personaData, stats, alpha = 1, hybrid = false) {
  return {
    id,
    method: hybrid ? 'standardized-shape-hybrid' : 'standardized-distance',
    alpha,
    nearTieGap: NEAR_TIE_Z,
    means: stats.means,
    stds: stats.stds,
    personas: personaData.personas.map((persona, order) => ({
      id: persona.id,
      displayName: displayName(persona),
      order,
      vector: vectorArray(persona.targetVector),
      zVector: zVector(vectorArray(persona.targetVector), stats.means, stats.stds),
      source: persona,
    })),
  };
}

function vectorArray(vector) {
  return constructs.map((construct) => Number(vector[construct]));
}

function displayName(persona) {
  return personaNameById[persona.id] ?? persona.displayName;
}

function computeConstructStats(seed) {
  const sums = Array(constructs.length).fill(0);
  const squares = Array(constructs.length).fill(0);
  const min = Array(constructs.length).fill(Infinity);
  const max = Array(constructs.length).fill(-Infinity);
  forEachGeneratedConstructScore(seed, 'uniform', UNIFORM_COUNT, (scores) => {
    for (let index = 0; index < constructs.length; index += 1) {
      const value = scores[index];
      sums[index] += value;
      squares[index] += value * value;
      min[index] = Math.min(min[index], value);
      max[index] = Math.max(max[index], value);
    }
  });
  const means = sums.map((sum) => sum / UNIFORM_COUNT);
  const stds = squares.map((sumSq, index) => {
    const variance = Math.max(0, sumSq / UNIFORM_COUNT - means[index] ** 2);
    return Math.max(0.0001, Math.sqrt(variance));
  });
  return {
    means,
    stds,
    min,
    max,
    publicData: {
      source: 'training uniform set only',
      seed,
      sampleCount: UNIFORM_COUNT,
      constructs: Object.fromEntries(constructs.map((construct, index) => [construct, {
        mean: round(means[index]),
        std: round(stds[index]),
        min: round(min[index]),
        max: round(max[index]),
      }])),
    },
  };
}

function searchCandidateB(stats) {
  const intensities = [0.25, 0.5, 0.75, 1];
  const rows = intensities.map((intensity) => {
    const personaData = makeCandidateB(intensity);
    const profile = makeRawProfile(`candidate-b-${intensity}`, personaData);
    const metrics = quickEvaluateProfile(TRAIN_SEED, profile);
    const score = objective(metrics);
    return {
      intensity,
      score,
      metrics,
      eliminated: violatesBasicMetric(metrics),
      personaData,
    };
  });
  const selected = [...rows].sort((a, b) => b.score - a.score)[0];
  return {
    searchSpace: {
      intensity: intensities,
      fixedDeltaRule: 'Focus semantic-preserving movement for migratory-bird, nest-builder, harbor, moonlight, islander, stargazer, ferryman.',
    },
    rows: rows.map(({ personaData, ...row }) => row),
    selected: {
      intensity: selected.intensity,
      score: selected.score,
      metrics: selected.metrics,
      personaData: withProfile(selected.personaData, 'candidate-b'),
    },
  };
}

function makeCandidateB(intensity) {
  const data = clone(candidateA);
  data.scoringProfile = 'candidate-b';
  data.sourceVersion = `${candidateA.sourceVersion}+candidate-B`;
  data.generatedAt = new Date().toISOString();
  const deltas = {
    'migratory-bird': { AU: 4, NV: 6, CL: -6, CM: -4, RI: -5, CS: -3, TR: -3, MN: -4 },
    'nest-builder': { CM: -6, CL: -4, RI: -4, RM: 2, TR: -2, AU: 4, NV: 4, CS: 3 },
    harbor: { TR: -6, CL: -4, RI: -4, SC: -4, AU: 4, NV: 3, CS: 2, CR: -2 },
    moonlight: { CL: -4, CS: -4, SI: 3, CM: -2, TR: -2 },
    islander: { AU: -5, CL: 4, CS: 4, SC: 4, EC: 4 },
    stargazer: { SI: -5, CM: -4, RM: -4, AU: -2, NV: 2 },
    ferryman: { EC: 3, CR: 2, ER: 2, TR: -2, MN: 2, RI: 1 },
  };
  data.calibration = {
    label: 'candidate-B',
    method: 'targetVector-only',
    intensity,
    sourceProfile: 'candidate-a',
    publicRuntime: false,
    constraints: {
      maxAbsoluteDelta: 6,
      noDistanceAlgorithmChange: true,
      noQuestionOrScoreChange: true,
    },
    changes: [],
  };
  for (const persona of data.personas) {
    const delta = deltas[persona.id];
    if (!delta) continue;
    for (const [construct, value] of Object.entries(delta)) {
      const before = persona.targetVector[construct];
      const after = clamp(before + value * intensity);
      persona.targetVector[construct] = after;
      if (after !== before) {
        data.calibration.changes.push({
          personaId: persona.id,
          persona: displayName(persona),
          construct,
          before,
          after,
          delta: round(after - before),
        });
      }
    }
  }
  return data;
}

function searchCandidateD(stats) {
  const alphas = [0.6, 0.7, 0.8, 0.9];
  const rows = alphas.map((alpha) => {
    const profile = makeStandardizedProfile(`candidate-d-${alpha}`, candidateD, stats, alpha, true);
    const metrics = quickEvaluateProfile(TRAIN_SEED, profile);
    return {
      alpha,
      score: objective(metrics),
      metrics,
      eliminated: violatesBasicMetric(metrics),
    };
  });
  const selected = [...rows].sort((a, b) => b.score - a.score)[0];
  return { searchSpace: { alpha: alphas }, rows, selected };
}

function quickEvaluateProfile(seed, profile) {
  const uniform = evaluateProfileOnGenerated(`${seed}:quick`, 'uniform', 25000, profile);
  const middle = evaluateProfileOnGenerated(`${seed}:quick`, 'middle', 5000, profile);
  const conservative = evaluateProfileOnGenerated(`${seed}:quick`, 'conservative', 5000, profile);
  const highAgreement = evaluateProfileOnGenerated(`${seed}:quick`, 'highAgreement', 5000, profile);
  const lowAgreement = evaluateProfileOnGenerated(`${seed}:quick`, 'lowAgreement', 5000, profile);
  const volatile = evaluateProfileOnGenerated(`${seed}:quick`, 'volatile', 5000, profile);
  return {
    uniform: uniform.summary,
    middle: middle.summary,
    conservative: conservative.summary,
    stylePeak: Math.max(highAgreement.summary.maxTop1.rate, lowAgreement.summary.maxTop1.rate, volatile.summary.maxTop1.rate),
  };
}

function objective(metrics) {
  const uniformMaxPenalty = Math.max(0, metrics.uniform.maxTop1.rate - HIGH_RATE) * 220;
  const uniformMinPenalty = Math.max(0, LOW_RATE - metrics.uniform.minTop1.rate) * 320;
  const middleMinPenalty = Math.max(0, LOW_RATE - metrics.middle.minTop1.rate) * 120;
  const conservativeMinPenalty = Math.max(0, LOW_RATE - metrics.conservative.minTop1.rate) * 120;
  const stylePenalty = Math.max(0, metrics.stylePeak - 0.75) * 120;
  return round(100 - uniformMaxPenalty - uniformMinPenalty - middleMinPenalty - conservativeMinPenalty - stylePenalty);
}

function violatesBasicMetric(metrics) {
  return metrics.uniform.missingPersonas.length > 0 || metrics.stylePeak > 0.95;
}

function evaluateDataset(label, seed, profiles) {
  const datasets = {};
  datasets.uniform = evaluateProfilesOnGenerated(seed, 'uniform', UNIFORM_COUNT, profiles);
  for (const mode of responseModes) {
    datasets[mode] = evaluateProfilesOnGenerated(seed, mode, MODEL_COUNT, profiles);
  }
  return {
    generatedAt: new Date().toISOString(),
    label,
    seed,
    counts: {
      uniform: UNIFORM_COUNT,
      perResponseModel: MODEL_COUNT,
      responseModelTotal: MODEL_COUNT * responseModes.length,
    },
    constructStandardization: label === 'training' ? calibrationStats.publicData : { source: 'uses training standardization', trainingSeed: TRAIN_SEED },
    datasets,
  };
}

function evaluateProfilesOnGenerated(seed, mode, count, profiles) {
  const evaluators = Object.fromEntries(profiles.map((profile) => [profile.id, createEvaluator(profile)]));
  forEachGeneratedConstructScore(`${seed}:${mode}`, mode, count, (scores) => {
    for (const profile of profiles) addEvaluation(evaluators[profile.id], scoreConstructs(profile, scores));
  });
  return Object.fromEntries(profiles.map((profile) => [profile.id, finalizeEvaluator(evaluators[profile.id], count)]));
}

function evaluateProfileOnGenerated(seed, mode, count, profile) {
  const evaluator = createEvaluator(profile);
  forEachGeneratedConstructScore(`${seed}:${mode}`, mode, count, (scores) => {
    addEvaluation(evaluator, scoreConstructs(profile, scores));
  });
  return finalizeEvaluator(evaluator, count);
}

function forEachGeneratedConstructScore(seed, mode, count, visit) {
  const rng = createSeededRng(seed);
  for (let sample = 0; sample < count; sample += 1) {
    const sums = Array(constructs.length).fill(0);
    const constructTargets = mode === 'constructConsistent' || mode === 'constructConflict'
      ? buildConstructTargets(rng, mode, sample)
      : null;
    for (const question of questions) {
      const option = pickOption(question, mode, rng, sample, constructTargets?.[question.construct]);
      sums[question.constructIndex] += option.score;
    }
    visit(sums.map((sum) => sum / 4));
  }
}

function buildConstructTargets(rng, mode, sample) {
  const targets = {};
  for (let index = 0; index < constructs.length; index += 1) {
  if (mode === 'constructConsistent') {
      targets[constructs[index]] = [0, 33, 67, 100][Math.floor(rng() * 4)];
    } else {
      targets[constructs[index]] = (index + sample) % 2 === 0 ? 82 : 18;
    }
  }
  return targets;
}

function pickOption(question, mode, rng, sample, constructTarget) {
  if (constructTarget != null) return closestOption(question, constructTarget);
  if (mode === 'uniform') return question.options[Math.floor(rng() * question.options.length)];
  if (mode === 'middle') return weightedPick(question.options, (option) => 1 / (1 + Math.abs(option.score - 50)), rng);
  if (mode === 'extreme') return weightedPick(question.options, (option) => 1 + Math.abs(option.score - 50), rng);
  if (mode === 'highAgreement') return weightedPick(question.options, (option) => 1 + option.score, rng);
  if (mode === 'lowAgreement') return weightedPick(question.options, (option) => 101 - option.score, rng);
  if (mode === 'conservative') return weightedPick(question.options, (option) => [33, 67].includes(option.score) ? 5 : 1, rng);
  if (mode === 'volatile') {
    return weightedPick(question.options, (option) => (question.order % 2 === 0 ? option.score + 1 : 101 - option.score), rng);
  }
  throw new Error(`Unknown response mode ${mode}`);
}

function closestOption(question, target) {
  return [...question.options].sort((a, b) => Math.abs(a.score - target) - Math.abs(b.score - target) || a.id.localeCompare(b.id))[0];
}

function weightedPick(options, weightFn, rng) {
  const weights = options.map((option) => Math.max(0.0001, weightFn(option)));
  const total = weights.reduce((sum, value) => sum + value, 0);
  let point = rng() * total;
  for (let index = 0; index < options.length; index += 1) {
    point -= weights[index];
    if (point <= 0) return options[index];
  }
  return options.at(-1);
}

function scoreConstructs(profile, scores) {
  let user = scores;
  if (profile.method !== 'raw') user = zVector(scores, profile.means, profile.stds);
  const userShape = profile.method === 'standardized-shape-hybrid' ? centered(user) : null;
  const personaScores = profile.personas.map((persona) => {
    let distance;
    if (profile.method === 'raw') {
      distance = vectorDistance(scores, persona.vector);
    } else if (profile.method === 'standardized-distance') {
      distance = vectorDistance(user, persona.zVector);
    } else {
      const absoluteDistance = vectorDistance(user, persona.zVector);
      const shapeDistance = vectorDistance(userShape, centered(persona.zVector));
      distance = profile.alpha * absoluteDistance + (1 - profile.alpha) * shapeDistance;
    }
    return {
      id: persona.id,
      displayName: persona.displayName,
      distance,
      order: persona.order,
    };
  }).sort((a, b) => a.distance - b.distance || a.order - b.order);
  return {
    top5: personaScores.slice(0, 5),
    personaScores,
    top1Top2Gap: personaScores[1].distance - personaScores[0].distance,
  };
}

function zVector(values, means, stds) {
  return values.map((value, index) => (value - means[index]) / stds[index]);
}

function centered(values) {
  const avg = mean(values);
  return values.map((value) => value - avg);
}

function vectorDistance(a, b) {
  return Math.sqrt(a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0) / a.length);
}

function createEvaluator(profile) {
  return {
    profile,
    byId: Object.fromEntries(profile.personas.map((persona) => [persona.id, {
      id: persona.id,
      displayName: persona.displayName,
      top1Count: 0,
      top2Count: 0,
      rankSum: 0,
      gapsWhenTop1: [],
      nearTieWhenTop1: 0,
    }])),
    gaps: [],
  };
}

function addEvaluation(evaluator, result) {
  result.personaScores.forEach((persona, index) => {
    evaluator.byId[persona.id].rankSum += index + 1;
  });
  const top1 = result.top5[0];
  const top2 = result.top5[1];
  evaluator.byId[top1.id].top1Count += 1;
  evaluator.byId[top1.id].gapsWhenTop1.push(result.top1Top2Gap);
  evaluator.gaps.push(result.top1Top2Gap);
  if (result.top1Top2Gap <= evaluator.profile.nearTieGap) evaluator.byId[top1.id].nearTieWhenTop1 += 1;
  evaluator.byId[top2.id].top2Count += 1;
}

function finalizeEvaluator(evaluator, total) {
  const rows = Object.values(evaluator.byId).map((item) => ({
    id: item.id,
    displayName: item.displayName,
    top1Count: item.top1Count,
    top1Rate: round(item.top1Count / total),
    top2Count: item.top2Count,
    top2Rate: round(item.top2Count / total),
    averageRank: round(item.rankSum / total),
    averageGapWhenTop1: item.gapsWhenTop1.length ? round(mean(item.gapsWhenTop1)) : null,
    medianGapWhenTop1: item.gapsWhenTop1.length ? round(percentile(item.gapsWhenTop1, 0.5)) : null,
    nearTieRateWhenTop1: item.top1Count ? round(item.nearTieWhenTop1 / item.top1Count) : null,
  }));
  return {
    profile: evaluator.profile.id,
    method: evaluator.profile.method,
    nearTieGap: evaluator.profile.nearTieGap,
    rows,
    summary: summarizeRows(rows),
    gapDistribution: {
      mean: round(mean(evaluator.gaps)),
      p10: round(percentile(evaluator.gaps, 0.1)),
      p25: round(percentile(evaluator.gaps, 0.25)),
      p50: round(percentile(evaluator.gaps, 0.5)),
      p75: round(percentile(evaluator.gaps, 0.75)),
      p90: round(percentile(evaluator.gaps, 0.9)),
      nearTieRate: round(evaluator.gaps.filter((gap) => gap <= evaluator.profile.nearTieGap).length / total),
    },
  };
}

function summarizeRows(rows) {
  const maxTop1 = rows.reduce((a, b) => a.top1Rate > b.top1Rate ? a : b);
  const minTop1 = rows.reduce((a, b) => a.top1Rate < b.top1Rate ? a : b);
  return {
    maxTop1: pickSummary(maxTop1),
    minTop1: pickSummary(minTop1),
    missingPersonas: rows.filter((row) => row.top1Count === 0).map((row) => row.displayName),
    lowFrequencyPersonas: rows.filter((row) => row.top1Rate > 0 && row.top1Rate < LOW_RATE).map((row) => row.displayName),
    overConcentratedPersonas: rows.filter((row) => row.top1Rate > HIGH_RATE).map((row) => row.displayName),
  };
}

function pickSummary(row) {
  return { id: row.id, displayName: row.displayName, rate: row.top1Rate, count: row.top1Count };
}

function evaluateRobustness(profiles) {
  const levels = [1, 3, 5, 10, 15];
  const rows = [];
  for (const profile of profiles) {
    for (const item of reachabilityAnswers) {
      const originalScores = constructScoresFromAnswers(item.answers);
      const original = scoreConstructs(profile, originalScores);
      for (const level of levels) {
        const rng = createSeededRng(`${VALIDATION_SEED}:robustness:${profile.id}:${item.id}:${level}`);
        let retainTop1 = 0;
        let originalTop2 = 0;
        let outTop3 = 0;
        const substitutes = {};
        const gaps = [];
        for (let index = 0; index < ROBUSTNESS_VARIANTS; index += 1) {
          const answers = mutateAnswers(item.answers, level, rng);
          const result = scoreConstructs(profile, constructScoresFromAnswers(answers));
          if (result.top5[0].id === item.id) retainTop1 += 1;
          else substitutes[result.top5[0].displayName] = (substitutes[result.top5[0].displayName] ?? 0) + 1;
          if (result.top5[1]?.id === item.id) originalTop2 += 1;
          if (!result.top5.slice(0, 3).some((persona) => persona.id === item.id)) outTop3 += 1;
          gaps.push(result.top1Top2Gap);
        }
        rows.push({
          profile: profile.id,
          personaId: item.id,
          displayName: personaNameById[item.id] ?? item.displayName,
          originalTop1: original.top5[0].displayName,
          originalGap: round(original.top1Top2Gap),
          perturbationQuestions: level,
          variants: ROBUSTNESS_VARIANTS,
          top1RetainRate: round(retainTop1 / ROBUSTNESS_VARIANTS),
          originalAsTop2Rate: round(originalTop2 / ROBUSTNESS_VARIANTS),
          outOfTop3Rate: round(outTop3 / ROBUSTNESS_VARIANTS),
          mostCommonSubstitute: topSubstitute(substitutes),
          averageGap: round(mean(gaps)),
        });
      }
    }
  }
  const summary = Object.fromEntries(profiles.map((profile) => {
    const profileRows = rows.filter((row) => row.profile === profile.id);
    return [profile.id, Object.fromEntries(levels.map((level) => {
      const levelRows = profileRows.filter((row) => row.perturbationQuestions === level);
      const min = levelRows.reduce((a, b) => a.top1RetainRate < b.top1RetainRate ? a : b);
      return [level, {
        averageTop1RetainRate: round(mean(levelRows.map((row) => row.top1RetainRate))),
        minTop1RetainRate: min.top1RetainRate,
        minPersona: min.displayName,
      }];
    }))];
  }));
  return { generatedAt: new Date().toISOString(), variantsPerLevel: ROBUSTNESS_VARIANTS, rows, summary };
}

function mutateAnswers(baseAnswers, mutationCount, rng) {
  const answers = { ...baseAnswers };
  const ids = [...Object.keys(answers)];
  for (let count = 0; count < mutationCount && ids.length; count += 1) {
    const index = Math.floor(rng() * ids.length);
    const questionId = ids.splice(index, 1)[0];
    const question = questions.find((item) => item.id === questionId);
    const choices = question.options.map((option) => option.id).filter((id) => id !== answers[questionId]);
    answers[questionId] = choices[Math.floor(rng() * choices.length)];
  }
  return answers;
}

function constructScoresFromAnswers(answers) {
  const sums = Array(constructs.length).fill(0);
  for (const question of questions) {
    const optionId = answers[question.id];
    const option = question.options.find((item) => item.id === optionId);
    sums[question.constructIndex] += option.score;
  }
  return sums.map((sum) => sum / 4);
}

function topSubstitute(counts) {
  const entries = Object.entries(counts);
  if (!entries.length) return null;
  const [displayName, count] = entries.sort((a, b) => b[1] - a[1])[0];
  return { displayName, count, rate: round(count / ROBUSTNESS_VARIANTS) };
}

function evaluateSemanticDrift(profiles) {
  const candidateAProfile = makeRawProfile('candidate-a-reference', candidateA);
  const baselineRows = semanticRows(candidateAProfile);
  return {
    generatedAt: new Date().toISOString(),
    rules: {
      top3HighOverlapMinimum: 2,
      top3LowOverlapMinimum: 2,
      nearestNeighborDistanceMustNotCollapseBelow: 6,
      manualReviewRequired: true,
    },
    rows: profiles.filter((profile) => profile.id !== 'baseline').flatMap((profile) => {
      const rows = semanticRows(profile);
      return rows.map((row) => {
        const base = baselineRows.find((item) => item.id === row.id);
        const highOverlap = overlap(base.topHighConstructs, row.topHighConstructs);
        const lowOverlap = overlap(base.topLowConstructs, row.topLowConstructs);
        return {
          profile: profile.id,
          id: row.id,
          displayName: row.displayName,
          totalShiftFromCandidateA: round(vectorDistance(base.vector, row.vector)),
          originalNearestNeighbor: base.nearestNeighbor,
          newNearestNeighbor: row.nearestNeighbor,
          originalNearestDistance: base.nearestNeighborDistance,
          newNearestDistance: row.nearestNeighborDistance,
          originalTopHighConstructs: base.topHighConstructs,
          newTopHighConstructs: row.topHighConstructs,
          originalTopLowConstructs: base.topLowConstructs,
          newTopLowConstructs: row.topLowConstructs,
          topHighOverlap: highOverlap,
          topLowOverlap: lowOverlap,
          autoConstraintStatus: highOverlap >= 2 && lowOverlap >= 2 && row.nearestNeighborDistance >= 6 ? 'pass-needs-human-review' : 'fail',
        };
      });
    }),
  };
}

function semanticRows(profile) {
  return profile.personas.map((persona) => {
    const nearest = profile.personas
      .filter((item) => item.id !== persona.id)
      .map((item) => ({ displayName: item.displayName, distance: vectorDistance(persona.vector, item.vector) }))
      .sort((a, b) => a.distance - b.distance)[0];
    const values = constructs.map((construct, index) => ({ construct, value: persona.vector[index] }));
    return {
      id: persona.id,
      displayName: persona.displayName,
      vector: persona.vector,
      nearestNeighbor: nearest.displayName,
      nearestNeighborDistance: round(nearest.distance),
      topHighConstructs: [...values].sort((a, b) => b.value - a.value).slice(0, 3).map((item) => item.construct),
      topLowConstructs: [...values].sort((a, b) => a.value - b.value).slice(0, 3).map((item) => item.construct),
    };
  });
}

function buildComparison(training, validation, robustness, semanticDrift) {
  const profiles = ['baseline', 'candidate-a', 'candidate-b', 'candidate-c', 'candidate-d'];
  const rows = profiles.map((profile) => {
    const trainUniform = training.datasets.uniform[profile];
    const validUniform = validation.datasets.uniform[profile];
    const stylePeakTrain = maxStylePeak(training, profile);
    const stylePeakValidation = maxStylePeak(validation, profile);
    const robust10 = robustness.summary[profile]?.[10]?.averageTop1RetainRate ?? null;
    const semanticFailures = semanticDrift.rows.filter((row) => row.profile === profile && row.autoConstraintStatus === 'fail').length;
    return {
      profile,
      method: trainUniform.method,
      trainingUniformMaxTop1: trainUniform.summary.maxTop1,
      trainingUniformMinTop1: trainUniform.summary.minTop1,
      validationUniformMaxTop1: validUniform.summary.maxTop1,
      validationUniformMinTop1: validUniform.summary.minTop1,
      trainingStylePeak: stylePeakTrain,
      validationStylePeak: stylePeakValidation,
      validationNearTieRate: validUniform.gapDistribution.nearTieRate,
      robustness10AverageTop1RetainRate: robust10,
      semanticFailures,
      score: candidateScore({ trainUniform, validUniform, stylePeakValidation, robust10, semanticFailures }),
      requiresRuntimeScoringChange: ['candidate-c', 'candidate-d'].includes(profile),
    };
  });
  const recommended = [...rows].filter((row) => row.profile !== 'baseline').sort((a, b) => b.score - a.score)[0];
  return {
    generatedAt: new Date().toISOString(),
    sourceHashes,
    profiles: rows,
    trainingSummary: summarizeComparisonRows(rows, 'training'),
    validationSummary: summarizeComparisonRows(rows, 'validation'),
    recommendation: {
      recommendedCandidate: recommended.profile,
      score: recommended.score,
      replaceCandidateA: recommended.profile !== 'candidate-a' && recommended.score > rows.find((row) => row.profile === 'candidate-a').score,
      note: 'Recommendation only. Public runtime remains candidate-a until manual approval.',
    },
  };
}

function maxStylePeak(dataset, profile) {
  const styleModes = ['highAgreement', 'lowAgreement', 'volatile'];
  return styleModes.reduce((max, mode) => {
    const summary = dataset.datasets[mode][profile].summary.maxTop1;
    return summary.rate > max.rate ? { mode, ...summary } : max;
  }, { mode: null, rate: -1 });
}

function candidateScore({ trainUniform, validUniform, stylePeakValidation, robust10, semanticFailures }) {
  const minRatePenalty = Math.max(0, LOW_RATE - validUniform.summary.minTop1.rate) * 260;
  const maxRatePenalty = Math.max(0, validUniform.summary.maxTop1.rate - HIGH_RATE) * 220;
  const stylePenalty = Math.max(0, stylePeakValidation.rate - 0.75) * 160;
  const robustnessPenalty = Math.max(0, 0.9 - (robust10 ?? 0)) * 120;
  const semanticPenalty = semanticFailures * 6;
  const nearTiePenalty = Math.max(0, validUniform.gapDistribution.nearTieRate - trainUniform.gapDistribution.nearTieRate - 0.1) * 50;
  return round(100 - minRatePenalty - maxRatePenalty - stylePenalty - robustnessPenalty - semanticPenalty - nearTiePenalty);
}

function summarizeComparisonRows(rows, label) {
  return {
    label,
    bestUniformMax: [...rows].sort((a, b) => (label === 'training' ? a.trainingUniformMaxTop1.rate - b.trainingUniformMaxTop1.rate : a.validationUniformMaxTop1.rate - b.validationUniformMaxTop1.rate))[0].profile,
    bestUniformMin: [...rows].sort((a, b) => (label === 'training' ? b.trainingUniformMinTop1.rate - a.trainingUniformMinTop1.rate : b.validationUniformMinTop1.rate - a.validationUniformMinTop1.rate))[0].profile,
  };
}

function buildResponseStyleData(training, validation) {
  return {
    generatedAt: new Date().toISOString(),
    modes: responseModes,
    training: styleRows(training),
    validation: styleRows(validation),
  };
}

function styleRows(dataset) {
  return Object.fromEntries(responseModes.map((mode) => [mode, Object.fromEntries(
    Object.entries(dataset.datasets[mode]).map(([profile, result]) => [profile, result.summary]),
  )]));
}

function overlap(a, b) {
  return a.filter((item) => b.includes(item)).length;
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const low = Math.floor(index);
  const high = Math.ceil(index);
  if (low === high) return sorted[low];
  return sorted[low] * (high - index) + sorted[high] * (index - low);
}

function clamp(value) {
  return Math.max(0, Math.min(100, round(value)));
}

function round(value) {
  return Number(Number(value).toFixed(4));
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '--').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

function writeReport(comparison, training, validation, robustness, semanticDrift, responseStyle, searchLog) {
  const rows = comparison.profiles;
  const candidateArow = rows.find((row) => row.profile === 'candidate-a');
  const recommended = rows.find((row) => row.profile === comparison.recommendation.recommendedCandidate);
  const table = markdownTable(
    ['候选', '方法', '验证集最高Top1', '验证集最低Top1', '风格峰值', '10题扰动保持', '语义失败', '综合分'],
    rows.map((row) => [
      row.profile,
      row.method,
      `${row.validationUniformMaxTop1.displayName} ${(row.validationUniformMaxTop1.rate * 100).toFixed(2)}%`,
      `${row.validationUniformMinTop1.displayName} ${(row.validationUniformMinTop1.rate * 100).toFixed(2)}%`,
      `${row.validationStylePeak.mode}:${row.validationStylePeak.displayName} ${(row.validationStylePeak.rate * 100).toFixed(2)}%`,
      row.robustness10AverageTop1RetainRate == null ? '-' : `${(row.robustness10AverageTop1RetainRate * 100).toFixed(2)}%`,
      row.semanticFailures,
      row.score,
    ]),
  );
  const styleTable = markdownTable(
    ['模型', 'candidate-A峰值', `${recommended.profile}峰值`],
    ['highAgreement', 'lowAgreement', 'volatile', 'middle', 'conservative', 'constructConsistent'].map((mode) => {
      const a = validation.datasets[mode]['candidate-a'].summary.maxTop1;
      const b = validation.datasets[mode][recommended.profile].summary.maxTop1;
      return [mode, `${a.displayName} ${(a.rate * 100).toFixed(2)}%`, `${b.displayName} ${(b.rate * 100).toFixed(2)}%`];
    }),
  );
  const robustTable = markdownTable(
    ['候选', '1题', '3题', '5题', '10题', '15题'],
    rows.map((row) => {
      const summary = robustness.summary[row.profile] ?? {};
      return [row.profile, 1, 3, 5, 10, 15].map((key, index) => {
        if (index === 0) return key;
        const item = summary[key];
        return item ? `${(item.averageTop1RetainRate * 100).toFixed(2)}%` : '-';
      });
    }),
  );
  const md = `# 心岛计划 v2.0 Alpha 1 阶段 1.7 评分参数校准与候选方案对照报告

## 1. 总结结论

本轮建立了独立校准集与验证集，并生成 baseline、candidate-A、candidate-B、candidate-C、candidate-D 的可复现对照。公开运行配置仍保持 candidate-A，未切换 \`V2_SCORING_PROFILE\`。

综合结果推荐候选：\`${recommended.profile}\`。该推荐只用于人工评审，不自动替换 candidate-A。candidate-A 综合分为 ${candidateArow.score}，推荐候选综合分为 ${recommended.score}。

## 2. 本轮是否修改冻结数据

没有。60题题干、选项文字、选项得分、reverse、构念绑定、baseline、candidate-A、15人格名称和结果文案均未修改。

## 3. 候选方案说明

- candidate-B：仅调整 targetVector。通过固定语义 delta 和强度网格搜索，尝试缩小候鸟型区域，并扩大筑巢型、港湾型的合理区域。
- candidate-C：不改向量，使用校准集 uniform 计算构念均值和标准差，对用户分数和 targetVector 使用同一 z-score 变换后计算距离。
- candidate-D：不改向量，使用标准化后的绝对距离与去均值结构形状距离混合，alpha 网格为 ${searchLog.candidateDSearch.searchSpace.alpha.join(' / ')}，选中 alpha=${searchLog.candidateDSearch.selected.alpha}。

## 4. 校准集与验证集

- 校准集 seed：\`${TRAIN_SEED}\`
- 验证集 seed：\`${VALIDATION_SEED}\`
- 每套 uniform：${UNIFORM_COUNT.toLocaleString()} 组
- 每套 8 类作答模型：每类 ${MODEL_COUNT.toLocaleString()} 组
- 每个人格扰动：1 / 3 / 5 / 10 / 15 题，每层 ${ROBUSTNESS_VARIANTS.toLocaleString()} 组

参数搜索只读取校准集；验证集仅用于最终对照。

## 5. 候选综合对照

${table}

## 6. 作答风格鲁棒性

${styleTable}

## 7. 路径稳健性

${robustTable}

## 8. 人格语义漂移

语义漂移已输出到 \`reports/data/v2-calibration-semantic-drift.json\`。自动规则只用于筛查，不代表最终语义通过；所有候选仍需人工复核人格构念变化。

## 9. 必须回答的问题

1. candidate-B/C/D分别修改了什么：见第3节。
2. 主要改善候鸟型的方法：以验证集 uniform 和 middle/conservative 峰值为准，推荐候选为 \`${recommended.profile}\`。
3. 主要改善筑巢型和港湾型的方法：见 \`v2-calibration-candidate-comparison.json\` 中各候选最低频人格和频率。
4. 最能减少高同意/低同意/高波动偏置的方法：以第6节验证集风格峰值为准。
5. 是否出现新的高频或低频人格：见第5节和机器数据；如候选仍有低于0.5%或高于18%的筛查项，应进入人工权衡。
6. 校准集改善是否在验证集复现：报告同时列出两套数据，推荐只基于验证集未明显回退的候选。
7. 语义漂移最小：通常是 candidate-C/D，因为不改 targetVector；candidate-B 需重点人工复核。
8. 区分度最好：参考验证集 gap 和近并列率，详见训练/验证 summary JSON。
9. 路径稳定性最好：见第7节。
10. 综合表现最好：\`${recommended.profile}\`。
11. 是否建议替换candidate-A：${comparison.recommendation.replaceCandidateA ? `建议进入人工评审后考虑替换为 ${recommended.profile}` : '暂不建议替换 candidate-A'}。
12. 推荐候选的已知代价：${recommended.requiresRuntimeScoringChange ? '需要修改运行时评分代码以支持新距离规则。' : '不需要修改运行时距离算法，但需要人工确认向量语义。'}
13. 是否需要人工审查人格构念变化：需要。
14. 是否建议进入小规模真人试测：仅在人工确认推荐候选后建议。
15. 是否建议进入阶段二：不建议直接进入阶段二；应先人工选择候选，并决定是否进行小规模真人试测。

## 10. 测试与运行要求

本报告由 \`npm run v2:calibrate\` 生成。基础回归命令结果需在最终提交说明中记录。
`;
  writeText('reports/heart-island-v2-alpha-calibration-candidates.md', md);
}
