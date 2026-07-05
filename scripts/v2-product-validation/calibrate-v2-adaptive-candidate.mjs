import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createSeededRng } from '../../js/v2/utils.js';

const root = process.cwd();
const UNIFORM_COUNT = Number(process.env.V2_ADAPTIVE_UNIFORM || 100000);
const MODEL_COUNT = Number(process.env.V2_ADAPTIVE_MODEL || 20000);
const ROBUSTNESS_VARIANTS = Number(process.env.V2_ADAPTIVE_ROBUSTNESS || 1000);
const SEARCH_UNIFORM_COUNT = Number(process.env.V2_ADAPTIVE_SEARCH_UNIFORM || 25000);
const SEARCH_MODEL_COUNT = Number(process.env.V2_ADAPTIVE_SEARCH_MODEL || 5000);
const TRAIN_SEED = 'heart-island-v2-alpha-adaptive-training-a';
const VALIDATION_SEED = 'heart-island-v2-alpha-adaptive-validation-b';
const CANDIDATE_E_ID = 'candidate-e-adaptive-hybrid';
const NEAR_TIE_RAW = 2.5;
const NEAR_TIE_Z = 0.18;
const responseModes = ['middle', 'extreme', 'highAgreement', 'lowAgreement', 'conservative', 'volatile', 'constructConsistent', 'constructConflict'];
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
const baseline = readJson('data/v2/persona-target-vectors.v2.baseline.json');
const candidateA = readJson('data/v2/persona-target-vectors.v2.candidate-a.json');
const candidateB = readJson('data/v2/persona-target-vectors.v2.candidate-b.json');
const candidateC = readJson('data/v2/persona-target-vectors.v2.candidate-c.json');
const candidateD = readJson('data/v2/persona-target-vectors.v2.candidate-d.json');
const candidateCProfile = readJson('data/v2/scoring-profile.v2.candidate-c.json');
const candidateDProfile = readJson('data/v2/scoring-profile.v2.candidate-d.json');
const previousComparison = readJson('reports/data/v2-calibration-candidate-comparison.json');
const previousRobustness = readJson('reports/data/v2-calibration-robustness.json');
const previousSemantic = readJson('reports/data/v2-calibration-semantic-drift.json');
const descriptions = readJson('data/v2/persona-descriptions.v2.json');
const reachability = readJson('reports/data/v2-persona-reachability.json');

const constructs = questionBank.constructs;
const questions = questionBank.questions.map((question, order) => ({
  ...question,
  order,
  constructIndex: constructs.indexOf(question.construct),
}));
const stats = statsFromProfile(candidateCProfile.standardization.constructs);
const sourceHashes = {
  questionBank: sha256File('data/v2/question-bank.v2.json'),
  baseline: sha256File('data/v2/persona-target-vectors.v2.baseline.json'),
  candidateA: sha256File('data/v2/persona-target-vectors.v2.candidate-a.json'),
  candidateB: sha256File('data/v2/persona-target-vectors.v2.candidate-b.json'),
  candidateC: sha256File('data/v2/persona-target-vectors.v2.candidate-c.json'),
  candidateD: sha256File('data/v2/persona-target-vectors.v2.candidate-d.json'),
};

const baseProfiles = [
  makeRawProfile('baseline', baseline),
  makeRawProfile('candidate-a', candidateA),
  makeRawProfile('candidate-b', candidateB),
  makeStandardizedProfile('candidate-c', candidateC, 1, false),
  makeStandardizedProfile('candidate-d', candidateD, candidateDProfile.alpha, true),
];

const volatilityDiagnosis = diagnoseCandidateDVolatility();
const adaptiveSearch = searchAdaptiveCandidate();
const candidateE = makeCandidateE(adaptiveSearch.selected.params);
writeJson('data/v2/persona-target-vectors.v2.candidate-e-adaptive-hybrid.json', candidateE);
writeJson('data/v2/scoring-profile.v2.candidate-e-adaptive-hybrid.json', {
  schemaVersion: 'v2-scoring-profile-alpha-1',
  id: CANDIDATE_E_ID,
  method: 'adaptive-standardized-shape-hybrid',
  targetVectorFile: 'persona-target-vectors.v2.candidate-e-adaptive-hybrid.json',
  sourceProfile: 'candidate-a',
  standardization: candidateCProfile.standardization,
  adaptiveAlpha: adaptiveSearch.selected.params,
  styleMetrics: styleMetricDefinitions(),
  publicRuntime: false,
  notes: 'Experimental profile only. Public runtime remains candidate-a until manual approval.',
});

const profiles = [
  ...baseProfiles,
  makeAdaptiveProfile(CANDIDATE_E_ID, candidateE, adaptiveSearch.selected.params),
];
const training = evaluateDataset('training', TRAIN_SEED, profiles);
const validation = evaluateDataset('validation', VALIDATION_SEED, profiles);
const robustness = evaluateRobustness(profiles);
const comparison = buildAdaptiveComparison(training, validation, robustness);
const responseStyle = buildResponseStyle(training, validation);
const scoreSensitivity = buildScoreSensitivity(comparison, robustness);
const semanticReview = buildSemanticReview(validation, robustness);

writeJson('reports/data/v2-candidate-d-volatility-diagnosis.json', volatilityDiagnosis);
writeJson('reports/data/v2-adaptive-calibration-search.json', adaptiveSearch.publicData);
writeJson('reports/data/v2-adaptive-candidate-comparison.json', comparison);
writeJson('reports/data/v2-adaptive-response-style.json', responseStyle);
writeJson('reports/data/v2-calibration-score-sensitivity.json', scoreSensitivity);
writeJson('reports/data/v2-adaptive-robustness.json', robustness);
writeReport(comparison, responseStyle, robustness, scoreSensitivity, volatilityDiagnosis, adaptiveSearch);
writeSemanticReview(semanticReview);

console.log(JSON.stringify({
  generatedAt: comparison.generatedAt,
  candidateE: comparison.profiles.find((profile) => profile.profile === CANDIDATE_E_ID),
  publicRuntimeProfile: 'candidate-a',
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

function statsFromProfile(profileConstructs) {
  return {
    means: constructs.map((construct) => profileConstructs[construct].mean),
    stds: constructs.map((construct) => Math.max(0.0001, profileConstructs[construct].std)),
  };
}

function makeCandidateE(params) {
  const data = clone(candidateA);
  data.scoringProfile = CANDIDATE_E_ID;
  data.sourceVersion = `${candidateA.sourceVersion}+${CANDIDATE_E_ID}`;
  data.generatedAt = new Date().toISOString();
  data.calibration = {
    label: CANDIDATE_E_ID,
    method: 'adaptive-standardized-shape-hybrid',
    sourceProfile: 'candidate-a',
    publicRuntime: false,
    targetVectorChanges: [],
    adaptiveAlpha: params,
    notes: 'No targetVector changes. Candidate-E changes distance weighting only.',
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
      displayName: nameOf(persona),
      order,
      vector: vectorArray(persona.targetVector),
    })),
  };
}

function makeStandardizedProfile(id, personaData, alpha = 1, hybrid = false) {
  return {
    id,
    method: hybrid ? 'standardized-shape-hybrid' : 'standardized-distance',
    nearTieGap: NEAR_TIE_Z,
    alpha,
    personas: personaData.personas.map((persona, order) => ({
      id: persona.id,
      displayName: nameOf(persona),
      order,
      vector: vectorArray(persona.targetVector),
      zVector: zVector(vectorArray(persona.targetVector)),
    })),
  };
}

function makeAdaptiveProfile(id, personaData, params) {
  return {
    id,
    method: 'adaptive-standardized-shape-hybrid',
    nearTieGap: NEAR_TIE_Z,
    params,
    personas: personaData.personas.map((persona, order) => ({
      id: persona.id,
      displayName: nameOf(persona),
      order,
      vector: vectorArray(persona.targetVector),
      zVector: zVector(vectorArray(persona.targetVector)),
    })),
  };
}

function nameOf(persona) {
  return personaNameById[persona.id] ?? persona.displayName;
}

function vectorArray(vector) {
  return constructs.map((construct) => Number(vector[construct]));
}

function evaluateDataset(label, seed, profilesToRun) {
  const datasets = {};
  datasets.uniform = evaluateProfiles(seed, 'uniform', UNIFORM_COUNT, profilesToRun);
  for (const mode of responseModes) datasets[mode] = evaluateProfiles(seed, mode, MODEL_COUNT, profilesToRun);
  return {
    generatedAt: new Date().toISOString(),
    label,
    seed,
    counts: { uniform: UNIFORM_COUNT, perResponseModel: MODEL_COUNT },
    datasets,
  };
}

function evaluateProfiles(seed, mode, count, profilesToRun) {
  const evaluators = Object.fromEntries(profilesToRun.map((profile) => [profile.id, createEvaluator(profile)]));
  forEachGeneratedSample(`${seed}:${mode}`, mode, count, (sample) => {
    for (const profile of profilesToRun) addEvaluation(evaluators[profile.id], scoreSample(profile, sample));
  });
  return Object.fromEntries(profilesToRun.map((profile) => [profile.id, finalizeEvaluator(evaluators[profile.id], count)]));
}

function evaluateOneProfile(seed, mode, count, profile) {
  const evaluator = createEvaluator(profile);
  forEachGeneratedSample(`${seed}:${mode}`, mode, count, (sample) => addEvaluation(evaluator, scoreSample(profile, sample)));
  return finalizeEvaluator(evaluator, count);
}

function forEachGeneratedSample(seed, mode, count, visit) {
  const rng = createSeededRng(seed);
  for (let sampleIndex = 0; sampleIndex < count; sampleIndex += 1) {
    const constructTargets = mode === 'constructConsistent' || mode === 'constructConflict'
      ? buildConstructTargets(rng, mode, sampleIndex)
      : null;
    const answerScores = [];
    const constructValues = Object.fromEntries(constructs.map((construct) => [construct, []]));
    for (const question of questions) {
      const option = pickOption(question, mode, rng, sampleIndex, constructTargets?.[question.construct]);
      answerScores.push(option.score);
      constructValues[question.construct].push(option.score);
    }
    const scores = constructs.map((construct) => mean(constructValues[construct]));
    const metrics = computeStyleMetrics(answerScores, constructValues, scores);
    visit({ answerScores, constructValues, scores, metrics });
  }
}

function buildConstructTargets(rng, mode, sampleIndex) {
  const targets = {};
  for (let index = 0; index < constructs.length; index += 1) {
    targets[constructs[index]] = mode === 'constructConsistent'
      ? [0, 33, 67, 100][Math.floor(rng() * 4)]
      : ((index + sampleIndex) % 2 === 0 ? 82 : 18);
  }
  return targets;
}

function pickOption(question, mode, rng, sampleIndex, constructTarget) {
  if (constructTarget != null) {
    const target = mode === 'constructConflict' && question.order % 2 === 1 ? 100 - constructTarget : constructTarget;
    return closestOption(question, target);
  }
  if (mode === 'uniform') return question.options[Math.floor(rng() * question.options.length)];
  if (mode === 'middle') return weightedPick(question.options, (option) => 1 / (1 + Math.abs(option.score - 50)), rng);
  if (mode === 'extreme') return weightedPick(question.options, (option) => 1 + Math.abs(option.score - 50), rng);
  if (mode === 'highAgreement') return weightedPick(question.options, (option) => 1 + option.score, rng);
  if (mode === 'lowAgreement') return weightedPick(question.options, (option) => 101 - option.score, rng);
  if (mode === 'conservative') return weightedPick(question.options, (option) => [33, 67].includes(option.score) ? 5 : 1, rng);
  if (mode === 'volatile') return weightedPick(question.options, (option) => (question.order % 2 === 0 ? option.score + 1 : 101 - option.score), rng);
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

function computeStyleMetrics(answerScores, constructValues, constructScores) {
  const globalMean = mean(answerScores) / 100;
  const extremity = answerScores.filter((score) => score === 0 || score === 100).length / answerScores.length;
  const constructStd = constructs.map((construct) => std(constructValues[construct]));
  const constructReliability = constructStd.map((value) => clamp01(1 - value / 50));
  const constructInternalConsistency = mean(constructReliability);
  const globalVolatility = mean(answerScores.slice(1).map((score, index) => Math.abs(score - answerScores[index]))) / 100;
  const constructSpread = std(constructScores) / 50;
  const structuralConfidence = clamp01(0.42 * constructInternalConsistency + 0.34 * (1 - globalVolatility) + 0.24 * clamp01(constructSpread));
  const agreementBias = Math.abs(globalMean - 0.5) * 2;
  return {
    globalMean: round(globalMean),
    agreementBias: round(agreementBias),
    extremity: round(extremity),
    constructInternalConsistency: round(constructInternalConsistency),
    globalVolatility: round(globalVolatility),
    constructSpread: round(constructSpread),
    structuralConfidence: round(structuralConfidence),
    constructReliability: constructReliability.map(round),
  };
}

function scoreSample(profile, sample) {
  const zScores = zVector(sample.scores);
  const userShape = centered(zScores);
  const alpha = profile.method === 'adaptive-standardized-shape-hybrid' ? adaptiveAlpha(sample.metrics, profile.params) : profile.alpha;
  const weights = profile.method === 'adaptive-standardized-shape-hybrid' ? adaptiveWeights(sample.metrics) : null;
  const personaScores = profile.personas.map((persona) => {
    let distance;
    let absoluteDistance = null;
    let shapeDistance = null;
    if (profile.method === 'raw') {
      distance = vectorDistance(sample.scores, persona.vector);
    } else if (profile.method === 'standardized-distance') {
      distance = vectorDistance(zScores, persona.zVector);
    } else {
      absoluteDistance = weightedVectorDistance(zScores, persona.zVector, weights);
      shapeDistance = weightedVectorDistance(userShape, centered(persona.zVector), weights);
      distance = alpha * absoluteDistance + (1 - alpha) * shapeDistance;
    }
    return {
      id: persona.id,
      displayName: persona.displayName,
      distance,
      order: persona.order,
      alpha,
      absoluteDistance,
      shapeDistance,
    };
  }).sort((a, b) => a.distance - b.distance || a.order - b.order);
  return {
    top5: personaScores.slice(0, 5),
    personaScores,
    top1Top2Gap: personaScores[1].distance - personaScores[0].distance,
    alpha: personaScores[0].alpha,
    top1AbsoluteDistance: personaScores[0].absoluteDistance,
    top1ShapeDistance: personaScores[0].shapeDistance,
    metrics: sample.metrics,
    scores: sample.scores,
  };
}

function adaptiveAlpha(metrics, params) {
  let alpha = params.defaultAlpha;
  if (metrics.globalVolatility >= params.volatilityThreshold || metrics.structuralConfidence < params.consistencyThreshold) {
    alpha = params.maxAlpha;
  } else if (metrics.agreementBias >= params.agreementThreshold && metrics.structuralConfidence >= params.consistencyThreshold) {
    alpha = params.minAlpha;
  } else {
    const confidenceOffset = (0.58 - metrics.structuralConfidence) * 0.18;
    alpha += confidenceOffset;
  }
  return round(Math.max(params.minAlpha, Math.min(params.maxAlpha, alpha)));
}

function adaptiveWeights(metrics) {
  if (metrics.globalVolatility < 0.48 && metrics.structuralConfidence > 0.5) return null;
  return metrics.constructReliability.map((value) => 0.2 + 0.8 * value);
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
    alphas: [],
  };
}

function addEvaluation(evaluator, result) {
  result.personaScores.forEach((persona, index) => {
    evaluator.byId[persona.id].rankSum += index + 1;
  });
  const top1 = result.top5[0];
  const top2 = result.top5[1];
  evaluator.byId[top1.id].top1Count += 1;
  evaluator.byId[top2.id].top2Count += 1;
  evaluator.byId[top1.id].gapsWhenTop1.push(result.top1Top2Gap);
  if (result.top1Top2Gap <= evaluator.profile.nearTieGap) evaluator.byId[top1.id].nearTieWhenTop1 += 1;
  evaluator.gaps.push(result.top1Top2Gap);
  if (result.alpha != null) evaluator.alphas.push(result.alpha);
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
    summary: summarizeRows(rows),
    rows,
    gapDistribution: {
      mean: round(mean(evaluator.gaps)),
      p50: round(percentile(evaluator.gaps, 0.5)),
      p90: round(percentile(evaluator.gaps, 0.9)),
      nearTieRate: round(evaluator.gaps.filter((gap) => gap <= evaluator.profile.nearTieGap).length / total),
    },
    alphaDistribution: evaluator.alphas.length ? {
      mean: round(mean(evaluator.alphas)),
      p10: round(percentile(evaluator.alphas, 0.1)),
      p50: round(percentile(evaluator.alphas, 0.5)),
      p90: round(percentile(evaluator.alphas, 0.9)),
    } : null,
  };
}

function summarizeRows(rows) {
  const maxTop1 = rows.reduce((a, b) => a.top1Rate > b.top1Rate ? a : b);
  const minTop1 = rows.reduce((a, b) => a.top1Rate < b.top1Rate ? a : b);
  return {
    maxTop1: pickSummary(maxTop1),
    minTop1: pickSummary(minTop1),
    missingPersonas: rows.filter((row) => row.top1Count === 0).map((row) => row.displayName),
    lowFrequencyPersonas: rows.filter((row) => row.top1Rate > 0 && row.top1Rate < 0.005).map((row) => row.displayName),
    overConcentratedPersonas: rows.filter((row) => row.top1Rate > 0.18).map((row) => row.displayName),
  };
}

function pickSummary(row) {
  return { id: row.id, displayName: row.displayName, rate: row.top1Rate, count: row.top1Count };
}

function searchAdaptiveCandidate() {
  const grid = [];
  for (const minAlpha of [0.6, 0.65, 0.7]) {
    for (const maxAlpha of [0.85, 0.9, 0.95]) {
      for (const consistencyThreshold of [0.45, 0.55]) {
        for (const volatilityThreshold of [0.45, 0.55]) {
          for (const agreementThreshold of [0.25, 0.35]) {
            grid.push({ minAlpha, maxAlpha, defaultAlpha: 0.7, consistencyThreshold, volatilityThreshold, agreementThreshold });
          }
        }
      }
    }
  }
  const rows = grid.map((params) => {
    const profile = makeAdaptiveProfile(CANDIDATE_E_ID, candidateA, params);
    const uniform = evaluateOneProfile(`${TRAIN_SEED}:search`, 'uniform', SEARCH_UNIFORM_COUNT, profile);
    const highAgreement = evaluateOneProfile(`${TRAIN_SEED}:search`, 'highAgreement', SEARCH_MODEL_COUNT, profile);
    const lowAgreement = evaluateOneProfile(`${TRAIN_SEED}:search`, 'lowAgreement', SEARCH_MODEL_COUNT, profile);
    const volatile = evaluateOneProfile(`${TRAIN_SEED}:search`, 'volatile', SEARCH_MODEL_COUNT, profile);
    const middle = evaluateOneProfile(`${TRAIN_SEED}:search`, 'middle', SEARCH_MODEL_COUNT, profile);
    const conservative = evaluateOneProfile(`${TRAIN_SEED}:search`, 'conservative', SEARCH_MODEL_COUNT, profile);
    return {
      params,
      metrics: { uniform: uniform.summary, highAgreement: highAgreement.summary, lowAgreement: lowAgreement.summary, volatile: volatile.summary, middle: middle.summary, conservative: conservative.summary },
      stylePeak: Math.max(highAgreement.summary.maxTop1.rate, lowAgreement.summary.maxTop1.rate, volatile.summary.maxTop1.rate),
      score: adaptiveObjective(uniform, highAgreement, lowAgreement, volatile, middle, conservative),
    };
  });
  const selected = [...rows].sort((a, b) => b.score - a.score)[0];
  return {
    publicData: {
      generatedAt: new Date().toISOString(),
      seed: TRAIN_SEED,
      sourceHashes,
      searchSpace: {
        minAlpha: [0.6, 0.65, 0.7],
        maxAlpha: [0.85, 0.9, 0.95],
        consistencyThreshold: [0.45, 0.55],
        volatilityThreshold: [0.45, 0.55],
        agreementThreshold: [0.25, 0.35],
      },
      rows,
      selected: { params: selected.params, score: selected.score, metrics: selected.metrics, stylePeak: selected.stylePeak },
      validationSetUsedForSearch: false,
    },
    selected,
  };
}

function adaptiveObjective(uniform, highAgreement, lowAgreement, volatile, middle, conservative) {
  const maxPenalty = Math.max(0, uniform.summary.maxTop1.rate - 0.18) * 190;
  const minPenalty = Math.max(0, 0.005 - uniform.summary.minTop1.rate) * 260;
  const highPenalty = Math.max(0, highAgreement.summary.maxTop1.rate - 0.75) * 120;
  const lowPenalty = Math.max(0, lowAgreement.summary.maxTop1.rate - 0.75) * 150;
  const volatilePenalty = Math.max(0, volatile.summary.maxTop1.rate - 0.8207) * 180;
  const middlePenalty = Math.max(0, middle.summary.maxTop1.rate - 0.2502) * 80;
  const conservativePenalty = Math.max(0, conservative.summary.maxTop1.rate - 0.2904) * 80;
  return round(100 - maxPenalty - minPenalty - highPenalty - lowPenalty - volatilePenalty - middlePenalty - conservativePenalty);
}

function diagnoseCandidateDVolatility() {
  const profileA = baseProfiles.find((profile) => profile.id === 'candidate-a');
  const alphaRows = [0.6, 0.7, 0.8, 0.9].map((alpha) => {
    const profile = makeStandardizedProfile(`candidate-d-alpha-${alpha}`, candidateD, alpha, true);
    return {
      alpha,
      volatile: evaluateOneProfile(`${VALIDATION_SEED}:diagnosis`, 'volatile', MODEL_COUNT, profile).summary.maxTop1,
      highAgreement: evaluateOneProfile(`${VALIDATION_SEED}:diagnosis`, 'highAgreement', MODEL_COUNT, profile).summary.maxTop1,
      lowAgreement: evaluateOneProfile(`${VALIDATION_SEED}:diagnosis`, 'lowAgreement', MODEL_COUNT, profile).summary.maxTop1,
    };
  });
  const profileD = baseProfiles.find((profile) => profile.id === 'candidate-d');
  const volatileStats = collectModeDiagnostics('volatile', profileA, profileD);
  const consistentStats = collectModeDiagnostics('constructConsistent', profileA, profileD);
  return {
    generatedAt: new Date().toISOString(),
    mode: 'volatile',
    constructStats: volatileStats.constructStats,
    topConstructCorrelations: volatileStats.topConstructCorrelations,
    stargazerTop1: volatileStats.stargazerTop1,
    contribution: volatileStats.contribution,
    amplifiedConstructsAfterCentering: volatileStats.amplifiedConstructsAfterCentering,
    comparisonToConstructConsistent: {
      volatile: volatileStats.modeSummary,
      constructConsistent: consistentStats.modeSummary,
    },
    alphaSweep: alphaRows,
    conclusion: 'candidate-D fixed alpha improves level-bias modes but lets volatile samples rely too much on centered shape; adaptive alpha should reduce shape weight when structural confidence is low.',
  };
}

function collectModeDiagnostics(mode, profileA, profileD) {
  const constructValues = Object.fromEntries(constructs.map((construct) => [construct, []]));
  const stargazerA = [];
  const stargazerD = [];
  const contributionAll = [];
  const centeredAll = [];
  forEachGeneratedSample(`${VALIDATION_SEED}:diagnosis:${mode}`, mode, MODEL_COUNT, (sample) => {
    sample.scores.forEach((score, index) => constructValues[constructs[index]].push(score));
    const resultA = scoreSample(profileA, sample);
    const resultD = scoreSample(profileD, sample);
    if (resultA.top5[0].id === 'stargazer') stargazerA.push(sample.scores);
    if (resultD.top5[0].id === 'stargazer') stargazerD.push(sample.scores);
    if (resultD.top1AbsoluteDistance != null && resultD.top1ShapeDistance != null) {
      const finalDistance = profileD.alpha * resultD.top1AbsoluteDistance + (1 - profileD.alpha) * resultD.top1ShapeDistance;
      contributionAll.push({
        absoluteContribution: (profileD.alpha * resultD.top1AbsoluteDistance) / finalDistance,
        shapeContribution: ((1 - profileD.alpha) * resultD.top1ShapeDistance) / finalDistance,
      });
    }
    const centeredScores = centered(zVector(sample.scores));
    centeredScores.forEach((value, index) => {
      if (!centeredAll[index]) centeredAll[index] = [];
      centeredAll[index].push(Math.abs(value));
    });
  });
  return {
    constructStats: Object.fromEntries(constructs.map((construct) => [construct, statsOf(constructValues[construct])])),
    topConstructCorrelations: constructCorrelations(constructValues).slice(0, 12),
    stargazerTop1: {
      candidateA: summarizeScoreVectors(stargazerA),
      candidateD: summarizeScoreVectors(stargazerD),
    },
    contribution: {
      absoluteContributionMean: round(mean(contributionAll.map((item) => item.absoluteContribution))),
      shapeContributionMean: round(mean(contributionAll.map((item) => item.shapeContribution))),
    },
    amplifiedConstructsAfterCentering: constructs.map((construct, index) => ({
      construct,
      meanCenteredAbsZ: round(mean(centeredAll[index])),
    })).sort((a, b) => b.meanCenteredAbsZ - a.meanCenteredAbsZ).slice(0, 8),
    modeSummary: {
      sampleCount: MODEL_COUNT,
      averageVolatility: null,
      constructMeanRange: round(Math.max(...constructs.map((c) => mean(constructValues[c]))) - Math.min(...constructs.map((c) => mean(constructValues[c])))),
    },
  };
}

function buildAdaptiveComparison(training, validation, robustness) {
  const profiles = ['baseline', 'candidate-a', 'candidate-b', 'candidate-c', 'candidate-d', CANDIDATE_E_ID];
  const rows = profiles.map((profile) => {
    const validUniform = validation.datasets.uniform[profile];
    const trainUniform = training.datasets.uniform[profile];
    const stylePeak = maxStylePeak(validation, profile);
    const robust10 = robustness.summary[profile]?.[10]?.averageTop1RetainRate ?? null;
    return {
      profile,
      method: validUniform.method,
      validationUniformMaxTop1: validUniform.summary.maxTop1,
      validationUniformMinTop1: validUniform.summary.minTop1,
      trainingUniformMaxTop1: trainUniform.summary.maxTop1,
      trainingUniformMinTop1: trainUniform.summary.minTop1,
      validationStylePeak: stylePeak,
      validationNearTieRate: validUniform.gapDistribution.nearTieRate,
      robustness10AverageTop1RetainRate: robust10,
      score: round(100
        - Math.max(0, validUniform.summary.maxTop1.rate - 0.18) * 190
        - Math.max(0, 0.005 - validUniform.summary.minTop1.rate) * 260
        - Math.max(0, stylePeak.rate - 0.75) * 160
        - Math.max(0, 0.93 - (robust10 ?? 0)) * 120),
      requiresRuntimeScoringChange: ['candidate-c', 'candidate-d', CANDIDATE_E_ID].includes(profile),
    };
  });
  return {
    generatedAt: new Date().toISOString(),
    sourceHashes,
    profiles: rows,
    recommendation: {
      recommendedCandidate: [...rows].filter((row) => row.profile !== 'baseline').sort((a, b) => b.score - a.score)[0].profile,
      publicRuntimeProfileRemains: 'candidate-a',
    },
  };
}

function maxStylePeak(dataset, profile) {
  return ['highAgreement', 'lowAgreement', 'volatile'].reduce((max, mode) => {
    const item = dataset.datasets[mode][profile].summary.maxTop1;
    return item.rate > max.rate ? { mode, ...item } : max;
  }, { mode: null, rate: -1 });
}

function buildResponseStyle(training, validation) {
  return {
    generatedAt: new Date().toISOString(),
    training: Object.fromEntries(responseModes.map((mode) => [mode, compactMode(training.datasets[mode])])),
    validation: Object.fromEntries(responseModes.map((mode) => [mode, compactMode(validation.datasets[mode])])),
  };
}

function compactMode(modeData) {
  return Object.fromEntries(Object.entries(modeData).map(([profile, result]) => [profile, {
    maxTop1: result.summary.maxTop1,
    minTop1: result.summary.minTop1,
    missingPersonas: result.summary.missingPersonas,
    lowFrequencyPersonas: result.summary.lowFrequencyPersonas,
    alphaDistribution: result.alphaDistribution,
  }]));
}

function evaluateRobustness(profilesToRun) {
  const levels = [1, 3, 5, 10, 15];
  const rows = [];
  const reached = reachability.results.filter((item) => item.reached);
  for (const profile of profilesToRun) {
    for (const item of reached) {
      const baseSample = sampleFromAnswers(item.answers);
      const original = scoreSample(profile, baseSample);
      for (const level of levels) {
        const rng = createSeededRng(`${VALIDATION_SEED}:adaptive-robustness:${profile.id}:${item.id}:${level}`);
        let retainTop1 = 0;
        let outTop3 = 0;
        const substitutes = {};
        for (let index = 0; index < ROBUSTNESS_VARIANTS; index += 1) {
          const sample = sampleFromAnswers(mutateAnswers(item.answers, level, rng));
          const result = scoreSample(profile, sample);
          if (result.top5[0].id === item.id) retainTop1 += 1;
          else substitutes[result.top5[0].displayName] = (substitutes[result.top5[0].displayName] ?? 0) + 1;
          if (!result.top5.slice(0, 3).some((persona) => persona.id === item.id)) outTop3 += 1;
        }
        rows.push({
          profile: profile.id,
          personaId: item.id,
          displayName: personaNameById[item.id],
          originalTop1: original.top5[0].displayName,
          perturbationQuestions: level,
          variants: ROBUSTNESS_VARIANTS,
          top1RetainRate: round(retainTop1 / ROBUSTNESS_VARIANTS),
          outOfTop3Rate: round(outTop3 / ROBUSTNESS_VARIANTS),
          mostCommonSubstitute: topSubstitute(substitutes),
        });
      }
    }
  }
  return {
    generatedAt: new Date().toISOString(),
    rows,
    summary: Object.fromEntries(profilesToRun.map((profile) => [profile.id, Object.fromEntries(levels.map((level) => {
      const group = rows.filter((row) => row.profile === profile.id && row.perturbationQuestions === level);
      const min = group.reduce((a, b) => a.top1RetainRate < b.top1RetainRate ? a : b);
      return [level, { averageTop1RetainRate: round(mean(group.map((row) => row.top1RetainRate))), minPersona: min.displayName, minTop1RetainRate: min.top1RetainRate }];
    }))])),
  };
}

function sampleFromAnswers(answers) {
  const answerScores = [];
  const constructValues = Object.fromEntries(constructs.map((construct) => [construct, []]));
  for (const question of questions) {
    const optionId = answers[question.id];
    const option = question.options.find((item) => item.id === optionId);
    answerScores.push(option.score);
    constructValues[question.construct].push(option.score);
  }
  const scores = constructs.map((construct) => mean(constructValues[construct]));
  return { answerScores, constructValues, scores, metrics: computeStyleMetrics(answerScores, constructValues, scores) };
}

function mutateAnswers(baseAnswers, count, rng) {
  const answers = { ...baseAnswers };
  const ids = Object.keys(answers);
  for (let i = 0; i < count; i += 1) {
    const questionId = ids[Math.floor(rng() * ids.length)];
    const question = questions.find((item) => item.id === questionId);
    const choices = question.options.map((option) => option.id).filter((id) => id !== answers[questionId]);
    answers[questionId] = choices[Math.floor(rng() * choices.length)];
  }
  return answers;
}

function topSubstitute(counts) {
  const entries = Object.entries(counts);
  if (!entries.length) return null;
  const [displayName, count] = entries.sort((a, b) => b[1] - a[1])[0];
  return { displayName, count, rate: round(count / ROBUSTNESS_VARIANTS) };
}

function buildScoreSensitivity(comparison, robustness) {
  const scenarios = {
    distributionFirst: { max: 240, min: 280, style: 90, robust: 70 },
    responseStyleFirst: { max: 120, min: 100, style: 260, robust: 70 },
    semanticFirst: { max: 90, min: 90, style: 90, robust: 40 },
    robustnessFirst: { max: 90, min: 90, style: 80, robust: 240 },
    lowFrequencyProtection: { max: 80, min: 360, style: 80, robust: 60 },
    balanced: { max: 190, min: 260, style: 160, robust: 120 },
  };
  return {
    generatedAt: new Date().toISOString(),
    scenarios: Object.fromEntries(Object.entries(scenarios).map(([name, weights]) => {
      const rows = comparison.profiles.map((profile) => {
        const robust10 = robustness.summary[profile.profile]?.[10]?.averageTop1RetainRate ?? 0;
        const score = round(100
          - Math.max(0, profile.validationUniformMaxTop1.rate - 0.18) * weights.max
          - Math.max(0, 0.005 - profile.validationUniformMinTop1.rate) * weights.min
          - Math.max(0, profile.validationStylePeak.rate - 0.75) * weights.style
          - Math.max(0, 0.93 - robust10) * weights.robust);
        return { profile: profile.profile, score };
      }).sort((a, b) => b.score - a.score);
      return [name, { weights, ranking: rows }];
    })),
  };
}

function buildSemanticReview(validation, robustness) {
  const currentRows = validation.datasets.uniform['candidate-a'].rows;
  const candidateBRows = validation.datasets.uniform['candidate-b'].rows;
  const profileE = validation.datasets.uniform[CANDIDATE_E_ID].rows;
  return candidateA.personas.map((persona) => {
    const description = descriptions.personas.find((item) => item.id === persona.id);
    const bPersona = candidateB.personas.find((item) => item.id === persona.id);
    return {
      id: persona.id,
      displayName: personaNameById[persona.id],
      coreDefinition: description?.oneLineSummary ?? description?.coreDrive ?? '待补充',
      baselineVector: baseline.personas.find((item) => item.id === persona.id)?.targetVector,
      candidateAVector: persona.targetVector,
      candidateBVector: bPersona?.targetVector,
      candidateBChanges: vectorDiff(persona.targetVector, bPersona?.targetVector),
      candidateDChangesDistanceExplanation: 'candidate-D does not change vectors; it changes distance interpretation to fixed standardized absolute + shape hybrid.',
      candidateEChangesDistanceExplanation: 'candidate-E does not change vectors; it changes distance interpretation with answer-style adaptive alpha.',
      mostConfusedPersona: robustness.rows.filter((row) => row.profile === CANDIDATE_E_ID && row.personaId === persona.id && row.mostCommonSubstitute)[0]?.mostCommonSubstitute ?? null,
      currentTop1Rate: currentRows.find((row) => row.id === persona.id)?.top1Rate,
      candidateBTop1Rate: candidateBRows.find((row) => row.id === persona.id)?.top1Rate,
      candidateETop1Rate: profileE.find((row) => row.id === persona.id)?.top1Rate,
      mainHitModes: mainHitModes(validation, persona.id),
      possibleSemanticIssue: semanticIssueHint(persona.id),
      manualReview: '接受 / 需要修改 / 不接受：__________',
      reviewerNotes: '',
    };
  });
}

function vectorDiff(a, b) {
  return Object.fromEntries(constructs.map((construct) => [construct, round((b?.[construct] ?? 0) - (a?.[construct] ?? 0))]));
}

function mainHitModes(validation, personaId) {
  return ['uniform', ...responseModes].filter((mode) => {
    const row = validation.datasets[mode][CANDIDATE_E_ID].rows.find((item) => item.id === personaId);
    return row?.top1Rate >= 0.08;
  });
}

function semanticIssueHint(id) {
  const hints = {
    'migratory-bird': '重点审查是否仍代表迁移、自由与关系流动，而不是中间答案兜底类型。',
    'nest-builder': '重点审查是否仍代表稳定建设、安全感与长期投入。',
    harbor: '重点审查是否与筑巢型、月光型过近。',
    stargazer: '重点审查是否被高波动答案错误吸收。',
    islander: '重点审查是否被低同意答案错误吸收。',
    moonlight: '重点审查是否被高同意答案错误吸收。',
  };
  return hints[id] ?? '常规人工复核。';
}

function writeSemanticReview(rows) {
  const sections = rows.map((row) => `### ${row.displayName}

- 核心定义：${row.coreDefinition}
- baseline向量：\`${JSON.stringify(row.baselineVector)}\`
- candidate-A向量：\`${JSON.stringify(row.candidateAVector)}\`
- candidate-B向量：\`${JSON.stringify(row.candidateBVector)}\`
- candidate-B构念变化：\`${JSON.stringify(row.candidateBChanges)}\`
- candidate-D解释变化：${row.candidateDChangesDistanceExplanation}
- candidate-E解释变化：${row.candidateEChangesDistanceExplanation}
- 最常混淆人格：${row.mostConfusedPersona ? `${row.mostConfusedPersona.displayName} (${row.mostConfusedPersona.rate})` : '未见明显替代'}
- 当前Top1占比(candidate-A uniform)：${percent(row.currentTop1Rate)}
- candidate-E Top1占比(uniform)：${percent(row.candidateETop1Rate)}
- 主要命中作答模式：${row.mainHitModes.join('、') || '无明显高频模式'}
- 语义异常提示：${row.possibleSemanticIssue}
- 人工评审栏：${row.manualReview}
- 备注：${row.reviewerNotes}
`).join('\n');
  writeText('reports/heart-island-v2-persona-semantic-review.md', `# 心岛 v2.0 人格语义人工评审表

本表由脚本生成，只用于人工评审。脚本不会自动填写“人工通过”。

${sections}`);
}

function writeReport(comparison, responseStyle, robustness, scoreSensitivity, volatilityDiagnosis, adaptiveSearch) {
  const candidateAProfile = comparison.profiles.find((item) => item.profile === 'candidate-a');
  const candidateDProfileRow = comparison.profiles.find((item) => item.profile === 'candidate-d');
  const candidateEProfile = comparison.profiles.find((item) => item.profile === CANDIDATE_E_ID);
  const rows = markdownTable(
    ['候选', '验证集最高Top1', '验证集最低Top1', '风格峰值', '10题扰动', '综合分'],
    comparison.profiles.map((item) => [
      item.profile,
      `${item.validationUniformMaxTop1.displayName} ${percent(item.validationUniformMaxTop1.rate)}`,
      `${item.validationUniformMinTop1.displayName} ${percent(item.validationUniformMinTop1.rate)}`,
      `${item.validationStylePeak.mode}:${item.validationStylePeak.displayName} ${percent(item.validationStylePeak.rate)}`,
      percent(item.robustness10AverageTop1RetainRate),
      item.score,
    ]),
  );
  const styleRows = markdownTable(
    ['模型', 'candidate-A峰值', 'candidate-D峰值', 'candidate-E峰值'],
    ['highAgreement', 'lowAgreement', 'volatile', 'middle', 'conservative', 'constructConsistent'].map((mode) => [
      mode,
      `${responseStyle.validation[mode]['candidate-a'].maxTop1.displayName} ${percent(responseStyle.validation[mode]['candidate-a'].maxTop1.rate)}`,
      `${responseStyle.validation[mode]['candidate-d'].maxTop1.displayName} ${percent(responseStyle.validation[mode]['candidate-d'].maxTop1.rate)}`,
      `${responseStyle.validation[mode][CANDIDATE_E_ID].maxTop1.displayName} ${percent(responseStyle.validation[mode][CANDIDATE_E_ID].maxTop1.rate)}`,
    ]),
  );
  const sensitivityRows = markdownTable(
    ['权重场景', '第1名', '第2名', '第3名'],
    Object.entries(scoreSensitivity.scenarios).map(([name, data]) => [name, data.ranking[0].profile, data.ranking[1].profile, data.ranking[2].profile]),
  );
  writeText('reports/heart-island-v2-alpha-adaptive-calibration-review.md', `# 心岛计划 v2.0 Alpha 1 阶段 1.7b 自适应评分与候选决策审计报告

## 1. 总结结论

本轮新增 candidate-E 自适应混合距离，并解释 candidate-D 的高波动问题。公开运行配置仍保持 candidate-A，未切换 \`V2_SCORING_PROFILE\`。

candidate-E 使用答案风格指标动态调整 alpha：高波动、低结构可信时提高 alpha，减少 shapeDistance；稳定且存在强同意/低同意偏置时降低 alpha，增加 shapeDistance。

## 2. candidate-D 为什么放大 volatile 偏置

candidate-D 固定 alpha=0.7，在 volatile 样本中仍给 shapeDistance 30% 权重。volatile 模型会制造相邻题强烈反向的结构形状，去均值后部分构念差异被放大，观星者更容易吸收这类形状。诊断数据见 \`reports/data/v2-candidate-d-volatility-diagnosis.json\`。

- volatile 中 shapeContribution 均值：${percent(volatilityDiagnosis.contribution.shapeContributionMean)}
- volatile 中 absoluteContribution 均值：${percent(volatilityDiagnosis.contribution.absoluteContributionMean)}
- alpha sweep 已记录 0.6 / 0.7 / 0.8 / 0.9 的 highAgreement、lowAgreement、volatile 峰值。

## 3. candidate-E 自适应规则

- 最低 alpha：${adaptiveSearch.publicData.selected.params.minAlpha}
- 最高 alpha：${adaptiveSearch.publicData.selected.params.maxAlpha}
- 默认 alpha：${adaptiveSearch.publicData.selected.params.defaultAlpha}
- 一致性阈值：${adaptiveSearch.publicData.selected.params.consistencyThreshold}
- 波动阈值：${adaptiveSearch.publicData.selected.params.volatilityThreshold}
- 同意倾向阈值：${adaptiveSearch.publicData.selected.params.agreementThreshold}

作答风格指标包括：全局同意倾向、极端程度、构念内部一致性、全局波动程度、结构可信度。这些指标只进入内部距离权重，不展示给普通用户。

## 4. 候选对照

${rows}

## 5. 作答风格对照

${styleRows}

## 6. 权重敏感性分析

${sensitivityRows}

## 7. 验收判断

- candidate-E 是否同时改善 highAgreement、lowAgreement 和 volatile：相对 candidate-D 需查看第5节。若 volatile 下降但 high/low 回升，不能视为完全通过。
- uniform 中候鸟型、筑巢型、港湾型是否改善：候鸟型 candidate-A ${percent(candidateAProfile.validationUniformMaxTop1.rate)}，candidate-D ${percent(candidateDProfileRow.validationUniformMaxTop1.rate)}，candidate-E ${percent(candidateEProfile.validationUniformMaxTop1.rate)}；最低人格 candidate-E 为 ${candidateEProfile.validationUniformMinTop1.displayName} ${percent(candidateEProfile.validationUniformMinTop1.rate)}。
- 是否产生新的人格集中：以第4节风格峰值和 uniform 最高人格为准。
- 稳定性是否下降：candidate-E 10题扰动为 ${percent(candidateEProfile.robustness10AverageTop1RetainRate)}。
- candidate-B语义变化是否可接受：不可由脚本自动判定，需阅读 \`reports/heart-island-v2-persona-semantic-review.md\`。
- candidate-D是否仍值得保留：值得保留为固定混合距离对照，但不建议直接公开切换。
- candidate-E是否更适合真人试测：只有在人工接受高波动、低同意和语义评审代价后才建议。
- 是否建议切换公开profile：不建议。本轮只给候选评审。
- 是否建议进入小规模真人试测：暂不自动建议，需人工语义审查后决定。
- 是否建议进入阶段二：不建议直接进入阶段二。

## 8. 低置信和高波动处理建议

建议未来内部增加低置信标记：构念内部高度矛盾、作答波动极高、Top1/Top2极近、多个人格距离相近。该标记不阻止输出主人格，只用于结果措辞和真人试测分析。

## 9. 自动化命令结果

本报告由 \`npm run v2:calibrate\` 生成。其余回归命令结果见最终提交说明。
`);
}

function statsOf(values) {
  return { mean: round(mean(values)), variance: round(variance(values)), std: round(std(values)), min: Math.min(...values), max: Math.max(...values) };
}

function summarizeScoreVectors(vectors) {
  if (!vectors.length) return { count: 0, means: null };
  return {
    count: vectors.length,
    means: Object.fromEntries(constructs.map((construct, index) => [construct, round(mean(vectors.map((vector) => vector[index])))])),
  };
}

function constructCorrelations(valuesByConstruct) {
  const rows = [];
  for (let i = 0; i < constructs.length; i += 1) {
    for (let j = i + 1; j < constructs.length; j += 1) {
      rows.push({ a: constructs[i], b: constructs[j], correlation: round(correlation(valuesByConstruct[constructs[i]], valuesByConstruct[constructs[j]])) });
    }
  }
  return rows.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
}

function zVector(values) {
  return values.map((value, index) => (value - stats.means[index]) / stats.stds[index]);
}

function centered(values) {
  const avg = mean(values);
  return values.map((value) => value - avg);
}

function vectorDistance(a, b) {
  return Math.sqrt(a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0) / a.length);
}

function weightedVectorDistance(a, b, weights) {
  if (!weights) return vectorDistance(a, b);
  const total = weights.reduce((sum, value) => sum + value, 0);
  return Math.sqrt(a.reduce((sum, value, index) => sum + weights[index] * (value - b[index]) ** 2, 0) / total);
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function variance(values) {
  const avg = mean(values);
  return mean(values.map((value) => (value - avg) ** 2));
}

function std(values) {
  return Math.sqrt(variance(values));
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) * p)];
}

function correlation(a, b) {
  const avgA = mean(a);
  const avgB = mean(b);
  const numerator = a.reduce((sum, value, index) => sum + (value - avgA) * (b[index] - avgB), 0);
  const denominator = Math.sqrt(a.reduce((sum, value) => sum + (value - avgA) ** 2, 0) * b.reduce((sum, value) => sum + (value - avgB) ** 2, 0));
  return denominator ? numerator / denominator : 0;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function round(value) {
  return Number(Number(value).toFixed(4));
}

function percent(value) {
  return `${((value ?? 0) * 100).toFixed(2)}%`;
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '--').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

function styleMetricDefinitions() {
  return {
    globalMean: 'Mean of all selected option scores normalized to 0..1.',
    extremity: 'Share of selected options with score 0 or 100.',
    constructInternalConsistency: 'Average within-construct reliability derived from per-construct answer standard deviation.',
    globalVolatility: 'Mean adjacent answer score jump normalized to 0..1.',
    structuralConfidence: 'Weighted combination of construct consistency, low volatility, and construct-score spread.',
  };
}
