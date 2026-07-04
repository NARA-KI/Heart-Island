import fs from 'node:fs';
import path from 'node:path';
import { createSeededRng } from '../../js/v2/utils.js';

const root = process.cwd();
const dataDir = path.join(root, 'reports', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const SAMPLE_COUNT = Number(process.env.V2_DIAG_RANDOM_SAMPLES || 100000);
const MODEL_SAMPLE_COUNT = Number(process.env.V2_DIAG_MODEL_SAMPLES || 20000);
const ROBUSTNESS_VARIANTS = Number(process.env.V2_DIAG_ROBUSTNESS_VARIANTS || 1000);
const NEAR_TIE_GAP = 2.5;
const LOW_RATE_THRESHOLD = 0.005;
const HIGH_RATE_THRESHOLD = 0.2;

const questionBank = readJson('data/v2/question-bank.v2.json');
const candidateA = readJson('data/v2/persona-target-vectors.v2.candidate-a.json');
const baseline = readJson('data/v2/persona-target-vectors.v2.baseline.json');
const reachability = readJson('reports/data/v2-persona-reachability.json');

const sharedAnswers = generateUniformAnswerSets(SAMPLE_COUNT, 'heart-island-v2-alpha-candidate-baseline-compare-v1');
const comparison = compareCandidateAndBaseline(sharedAnswers);
const robustness = auditRobustness(reachability.results);
const responseModels = auditResponseModels();
const regionAnalysis = auditRegionAnalysis(comparison.samples);
const sensitivity = auditSensitivity(sharedAnswers.slice(0, 12000), regionAnalysis.center);
const diagnosis = buildDiagnosis({ comparison, robustness, responseModels, regionAnalysis, sensitivity });

writeJson('v2-candidate-baseline-comparison.json', comparison.publicData);
writeJson('v2-persona-robustness.json', robustness);
writeJson('v2-response-model-distribution.json', responseModels);
writeJson('v2-persona-region-analysis.json', regionAnalysis.publicData);
writeJson('v2-construct-sensitivity.json', sensitivity);

console.log(JSON.stringify({
  candidateMax: comparison.publicData.candidateA.summary.maxTop1,
  candidateMin: comparison.publicData.candidateA.summary.minTop1,
  baselineMax: comparison.publicData.baseline.summary.maxTop1,
  baselineMin: comparison.publicData.baseline.summary.minTop1,
  fragilePersonas: robustness.summary.fragilePersonas,
  requiresCalibration: diagnosis.requiresCalibration,
}, null, 2));

if (diagnosis.requiresCalibration) process.exitCode = 1;

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}

function writeJson(name, data) {
  fs.writeFileSync(path.join(dataDir, name), JSON.stringify(data, null, 2));
}

function generateUniformAnswerSets(count, seed) {
  const rng = createSeededRng(seed);
  const sets = [];
  for (let index = 0; index < count; index += 1) {
    const answers = {};
    for (const question of questionBank.questions) {
      answers[question.id] = question.options[Math.floor(rng() * question.options.length)].id;
    }
    sets.push(answers);
  }
  return sets;
}

function compareCandidateAndBaseline(answerSets) {
  const candidateStats = createStats(candidateA);
  const baselineStats = createStats(baseline);
  const samples = [];
  answerSets.forEach((answers, index) => {
    const candidateScore = score(answers, candidateA);
    const baselineScore = score(answers, baseline);
    addStats(candidateStats, candidateScore);
    addStats(baselineStats, baselineScore);
    if (index < 30000) {
      samples.push({
        constructScores: candidateScore.constructScores,
        candidateTop1: candidateScore.top5[0].displayName,
        baselineTop1: baselineScore.top5[0].displayName,
      });
    }
  });
  const candidateRows = finalizeStats(candidateStats, answerSets.length);
  const baselineRows = finalizeStats(baselineStats, answerSets.length);
  const baselineById = new Map(baselineRows.map((row) => [row.id, row]));
  const rows = candidateRows.map((row) => {
    const base = baselineById.get(row.id);
    return {
      id: row.id,
      displayName: row.displayName,
      candidateTop1Count: row.top1Count,
      candidateTop1Rate: row.top1Rate,
      baselineTop1Count: base?.top1Count ?? 0,
      baselineTop1Rate: base?.top1Rate ?? 0,
      top1RateDelta: round(row.top1Rate - (base?.top1Rate ?? 0)),
      candidateTop2Rate: row.top2Rate,
      baselineTop2Rate: base?.top2Rate ?? 0,
      candidateAverageRank: row.averageRank,
      baselineAverageRank: base?.averageRank ?? null,
      candidateAverageGap: row.averageGapWhenTop1,
      baselineAverageGap: base?.averageGapWhenTop1 ?? null,
      candidateMedianGap: row.medianGapWhenTop1,
      baselineMedianGap: base?.medianGapWhenTop1 ?? null,
      candidateNearTieRate: row.nearTieRateWhenTop1,
      baselineNearTieRate: base?.nearTieRateWhenTop1 ?? null,
    };
  });
  return {
    samples,
    publicData: {
      generatedAt: new Date().toISOString(),
      seed: 'heart-island-v2-alpha-candidate-baseline-compare-v1',
      sampleCount: answerSets.length,
      nearTieGap: NEAR_TIE_GAP,
      candidateA: { rows: candidateRows, summary: summarizeRows(candidateRows) },
      baseline: { rows: baselineRows, summary: summarizeRows(baselineRows) },
      comparisonRows: rows,
      conclusion: {
        migratoryBirdHighFrequency: comparePersona(rows, 'migratory-bird'),
        nestBuilderLowFrequency: comparePersona(rows, 'nest-builder'),
      },
    },
  };
}

function createStats(personaData) {
  return {
    personaData,
    byId: Object.fromEntries(personaData.personas.map((persona) => [persona.id, {
      id: persona.id,
      displayName: persona.displayName,
      top1Count: 0,
      top2Count: 0,
      rankSum: 0,
      gapsWhenTop1: [],
      nearTieWhenTop1: 0,
    }])),
  };
}

function addStats(stats, result) {
  result.personaScores.forEach((persona, index) => {
    stats.byId[persona.id].rankSum += index + 1;
  });
  const top1 = result.top5[0];
  const top2 = result.top5[1];
  stats.byId[top1.id].top1Count += 1;
  stats.byId[top1.id].gapsWhenTop1.push(result.top1Top2Gap);
  if (result.top1Top2Gap <= NEAR_TIE_GAP) stats.byId[top1.id].nearTieWhenTop1 += 1;
  stats.byId[top2.id].top2Count += 1;
}

function finalizeStats(stats, total) {
  return Object.values(stats.byId).map((item) => ({
    id: item.id,
    displayName: item.displayName,
    top1Count: item.top1Count,
    top1Rate: round(item.top1Count / total),
    top2Count: item.top2Count,
    top2Rate: round(item.top2Count / total),
    averageRank: round(item.rankSum / total),
    averageGapWhenTop1: item.gapsWhenTop1.length ? round(mean(item.gapsWhenTop1)) : null,
    medianGapWhenTop1: item.gapsWhenTop1.length ? round(percentile(item.gapsWhenTop1, 0.5)) : null,
    gapP10WhenTop1: item.gapsWhenTop1.length ? round(percentile(item.gapsWhenTop1, 0.1)) : null,
    gapP25WhenTop1: item.gapsWhenTop1.length ? round(percentile(item.gapsWhenTop1, 0.25)) : null,
    gapP75WhenTop1: item.gapsWhenTop1.length ? round(percentile(item.gapsWhenTop1, 0.75)) : null,
    gapP90WhenTop1: item.gapsWhenTop1.length ? round(percentile(item.gapsWhenTop1, 0.9)) : null,
    nearTieCountWhenTop1: item.nearTieWhenTop1,
    nearTieRateWhenTop1: item.top1Count ? round(item.nearTieWhenTop1 / item.top1Count) : null,
  }));
}

function summarizeRows(rows) {
  const maxTop1 = rows.reduce((a, b) => a.top1Rate > b.top1Rate ? a : b);
  const minTop1 = rows.reduce((a, b) => a.top1Rate < b.top1Rate ? a : b);
  return {
    maxTop1: { displayName: maxTop1.displayName, rate: maxTop1.top1Rate, count: maxTop1.top1Count },
    minTop1: { displayName: minTop1.displayName, rate: minTop1.top1Rate, count: minTop1.top1Count },
    missingPersonas: rows.filter((row) => row.top1Count === 0).map((row) => row.displayName),
    lowFrequencyPersonas: rows.filter((row) => row.top1Rate > 0 && row.top1Rate < LOW_RATE_THRESHOLD).map((row) => row.displayName),
    overConcentratedPersonas: rows.filter((row) => row.top1Rate > HIGH_RATE_THRESHOLD).map((row) => row.displayName),
  };
}

function comparePersona(rows, id) {
  const row = rows.find((item) => item.id === id);
  return {
    displayName: row.displayName,
    candidateTop1Rate: row.candidateTop1Rate,
    baselineTop1Rate: row.baselineTop1Rate,
    delta: row.top1RateDelta,
  };
}

function auditRobustness(paths) {
  const levels = [1, 3, 5, 10, 15];
  const rows = [];
  for (const item of paths) {
    const original = score(item.answers, candidateA);
    for (const level of levels) {
      const rng = createSeededRng(`heart-island-v2-alpha-robustness:${item.id}:${level}`);
      const substituteCounts = {};
      let retainTop1 = 0;
      let originalTop2 = 0;
      let outTop3 = 0;
      const gaps = [];
      for (let index = 0; index < ROBUSTNESS_VARIANTS; index += 1) {
        const answers = perturbAnswers(item.answers, level, rng);
        const result = score(answers, candidateA);
        if (result.top5[0].id === item.id) retainTop1 += 1;
        else substituteCounts[result.top5[0].displayName] = (substituteCounts[result.top5[0].displayName] ?? 0) + 1;
        if (result.top5[1]?.id === item.id) originalTop2 += 1;
        if (!result.top5.slice(0, 3).some((persona) => persona.id === item.id)) outTop3 += 1;
        gaps.push(result.top1Top2Gap);
      }
      rows.push({
        id: item.id,
        displayName: item.displayName,
        perturbationQuestions: level,
        variants: ROBUSTNESS_VARIANTS,
        originalTop1: original.top5[0].displayName,
        originalGap: round(original.top1Top2Gap),
        top1RetainRate: round(retainTop1 / ROBUSTNESS_VARIANTS),
        originalAsTop2Rate: round(originalTop2 / ROBUSTNESS_VARIANTS),
        outOfTop3Rate: round(outTop3 / ROBUSTNESS_VARIANTS),
        mostCommonSubstitute: topEntry(substituteCounts),
        averageGap: round(mean(gaps)),
      });
    }
  }
  return {
    generatedAt: new Date().toISOString(),
    variantsPerLevel: ROBUSTNESS_VARIANTS,
    rows,
    summary: {
      fragilePersonas: [...new Set(rows.filter((row) => row.perturbationQuestions <= 5 && row.top1RetainRate < 0.8).map((row) => row.displayName))],
      wideRegionPersonas: [...new Set(rows.filter((row) => row.perturbationQuestions >= 10 && row.top1RetainRate > 0.85).map((row) => row.displayName))],
    },
  };
}

function perturbAnswers(baseAnswers, count, rng) {
  const answers = { ...baseAnswers };
  const questions = [...questionBank.questions];
  for (let i = questions.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [questions[i], questions[j]] = [questions[j], questions[i]];
  }
  for (const question of questions.slice(0, count)) {
    const options = question.options.map((option) => option.id).filter((id) => id !== answers[question.id]);
    answers[question.id] = options[Math.floor(rng() * options.length)];
  }
  return answers;
}

function auditResponseModels() {
  const models = {
    middle: (question, rng) => weightedPick(question.options, (option) => 1 / (1 + Math.abs(option.score - 50)), rng),
    extreme: (question, rng) => weightedPick(question.options, (option) => 1 + Math.abs(option.score - 50), rng),
    highAgreement: (question, rng) => weightedPick(question.options, (option) => 1 + option.score, rng),
    lowAgreement: (question, rng) => weightedPick(question.options, (option) => 101 - option.score, rng),
    conservative: (question, rng) => weightedPick(question.options, (option) => [33, 67].includes(option.score) ? 4 : 1, rng),
    volatile: (question, rng, index) => weightedPick(question.options, (option) => (index % 2 === 0 ? option.score + 1 : 101 - option.score), rng),
    constructConsistent: null,
    constructConflict: null,
  };
  const output = {};
  for (const [model, picker] of Object.entries(models)) {
    output[model] = runResponseModel(model, picker);
  }
  return {
    generatedAt: new Date().toISOString(),
    sampleCountPerModel: MODEL_SAMPLE_COUNT,
    models: output,
    summary: summarizeResponseModels(output),
  };
}

function runResponseModel(model, picker) {
  const rng = createSeededRng(`heart-island-v2-alpha-response-model:${model}`);
  const stats = createStats(candidateA);
  for (let index = 0; index < MODEL_SAMPLE_COUNT; index += 1) {
    const constructTargets = {};
    if (model === 'constructConsistent' || model === 'constructConflict') {
      for (const construct of questionBank.constructs) {
        constructTargets[construct] = [0, 33, 67, 100][Math.floor(rng() * 4)];
      }
    }
    const answers = {};
    questionBank.questions.forEach((question, questionIndex) => {
      if (model === 'constructConsistent') {
        answers[question.id] = closestOption(question, constructTargets[question.construct], rng).id;
      } else if (model === 'constructConflict') {
        const base = constructTargets[question.construct];
        const target = questionIndex % 2 === 0 ? base : 100 - base;
        answers[question.id] = closestOption(question, target, rng).id;
      } else {
        answers[question.id] = picker(question, rng, questionIndex).id;
      }
    });
    addStats(stats, score(answers, candidateA));
  }
  const rows = finalizeStats(stats, MODEL_SAMPLE_COUNT);
  return { rows, summary: summarizeRows(rows) };
}

function summarizeResponseModels(models) {
  const byPersona = Object.fromEntries(candidateA.personas.map((persona) => [persona.displayName, []]));
  for (const model of Object.values(models)) {
    for (const row of model.rows) byPersona[row.displayName].push(row.top1Rate);
  }
  return Object.entries(byPersona).map(([displayName, rates]) => ({
    displayName,
    minRate: round(Math.min(...rates)),
    maxRate: round(Math.max(...rates)),
    averageRate: round(mean(rates)),
    consistentlyLow: rates.every((rate) => rate < LOW_RATE_THRESHOLD),
    consistentlyHigh: rates.filter((rate) => rate > 0.15).length >= 4,
  }));
}

function auditRegionAnalysis(samples) {
  const center = {};
  for (const construct of questionBank.constructs) {
    center[construct] = mean(samples.map((sample) => sample.constructScores[construct]));
  }
  const candidateVolumes = volumeByTop1(samples, 'candidateTop1');
  const baselineVolumes = volumeByTop1(samples, 'baselineTop1');
  const candidateRows = candidateA.personas.map((persona) => {
    const nearest = nearestPersona(persona, candidateA);
    const density15 = samples.filter((sample) => vectorDistance(sample.constructScores, persona.targetVector) <= 15).length / samples.length;
    const density20 = samples.filter((sample) => vectorDistance(sample.constructScores, persona.targetVector) <= 20).length / samples.length;
    return {
      id: persona.id,
      displayName: persona.displayName,
      distanceToSampleCenter: round(vectorDistance(center, persona.targetVector)),
      sampleDensityRadius15: round(density15),
      sampleDensityRadius20: round(density20),
      nearestNeighbor: nearest.displayName,
      nearestNeighborDistance: round(nearest.distance),
      approximateBoundaryDistance: round(nearest.distance / 2),
      approximateRegionVolume: round(candidateVolumes[persona.displayName] ?? 0),
      baselineRegionVolume: round(baselineVolumes[persona.displayName] ?? 0),
      volumeDeltaCandidateMinusBaseline: round((candidateVolumes[persona.displayName] ?? 0) - (baselineVolumes[persona.displayName] ?? 0)),
    };
  });
  return {
    center: roundObject(center),
    publicData: {
      generatedAt: new Date().toISOString(),
      sampleCount: samples.length,
      center: roundObject(center),
      personas: candidateRows,
      conclusions: {
        migratoryBird: candidateRows.find((row) => row.id === 'migratory-bird'),
        nestBuilder: candidateRows.find((row) => row.id === 'nest-builder'),
      },
    },
  };
}

function auditSensitivity(answerSets, center) {
  const focusIds = ['migratory-bird', 'nest-builder'];
  const focus = Object.fromEntries(focusIds.map((id) => [id, candidateA.personas.find((persona) => persona.id === id)]));
  const fullCounts = focusCounts(answerSets, focusIds);
  const questionRemoval = [];
  for (const question of questionBank.questions) {
    const counts = focusCounts(answerSets, focusIds, { omitQuestionId: question.id });
    questionRemoval.push({
      questionId: question.id,
      construct: question.construct,
      migratoryBirdDelta: round((counts['migratory-bird'] - fullCounts['migratory-bird']) / answerSets.length),
      nestBuilderDelta: round((counts['nest-builder'] - fullCounts['nest-builder']) / answerSets.length),
    });
  }
  const constructRemoval = questionBank.constructs.map((construct) => {
    const counts = focusCounts(answerSets, focusIds, { omitConstruct: construct });
    return {
      construct,
      migratoryBirdDelta: round((counts['migratory-bird'] - fullCounts['migratory-bird']) / answerSets.length),
      nestBuilderDelta: round((counts['nest-builder'] - fullCounts['nest-builder']) / answerSets.length),
    };
  });
  const variances = Object.fromEntries(questionBank.constructs.map((construct) => {
    const values = answerSets.map((answers) => score(answers, candidateA).constructScores[construct]);
    return [construct, round(variance(values))];
  }));
  const correlations = topConstructCorrelations(answerSets.slice(0, 5000));
  return {
    generatedAt: new Date().toISOString(),
    sampleCount: answerSets.length,
    focusPersonas: Object.values(focus).map((persona) => persona.displayName),
    fullTop1Rates: Object.fromEntries(Object.entries(fullCounts).map(([id, count]) => [focus[id].displayName, round(count / answerSets.length)])),
    topQuestionRemovalEffects: questionRemoval
      .sort((a, b) => Math.max(Math.abs(b.migratoryBirdDelta), Math.abs(b.nestBuilderDelta)) - Math.max(Math.abs(a.migratoryBirdDelta), Math.abs(a.nestBuilderDelta)))
      .slice(0, 12),
    constructRemoval,
    constructVariance: variances,
    topConstructCorrelations: correlations,
    contributionByConstruct: Object.fromEntries(Object.entries(focus).map(([id, persona]) => [persona.displayName, questionBank.constructs.map((construct) => ({
      construct,
      targetMinusCenter: round(persona.targetVector[construct] - center[construct]),
      absoluteOffset: round(Math.abs(persona.targetVector[construct] - center[construct])),
    })).sort((a, b) => b.absoluteOffset - a.absoluteOffset)])),
  };
}

function focusCounts(answerSets, ids, omit = {}) {
  const counts = Object.fromEntries(ids.map((id) => [id, 0]));
  for (const answers of answerSets) {
    const result = scoreWithOmission(answers, candidateA, omit);
    if (counts[result.top5[0].id] !== undefined) counts[result.top5[0].id] += 1;
  }
  return counts;
}

function scoreWithOmission(answers, personaData, omit) {
  const constructValues = Object.fromEntries(questionBank.constructs.map((construct) => [construct, []]));
  for (const question of questionBank.questions) {
    if (omit.omitQuestionId === question.id || omit.omitConstruct === question.construct) continue;
    const option = question.options.find((item) => item.id === answers[question.id]);
    constructValues[question.construct].push(option.score);
  }
  const constructScores = {};
  for (const construct of questionBank.constructs) {
    const values = constructValues[construct];
    constructScores[construct] = values.length ? mean(values) : 50;
  }
  const personaScores = personaData.personas.map((persona, order) => ({
    id: persona.id,
    displayName: persona.displayName,
    distance: vectorDistance(constructScores, persona.targetVector),
    order,
  })).sort((a, b) => a.distance - b.distance || a.order - b.order);
  return { constructScores, personaScores, top5: personaScores.slice(0, 5) };
}

function topConstructCorrelations(answerSets) {
  const values = Object.fromEntries(questionBank.constructs.map((construct) => [construct, []]));
  for (const answers of answerSets) {
    const result = score(answers, candidateA);
    for (const construct of questionBank.constructs) values[construct].push(result.constructScores[construct]);
  }
  const pairs = [];
  for (let i = 0; i < questionBank.constructs.length; i += 1) {
    for (let j = i + 1; j < questionBank.constructs.length; j += 1) {
      const a = questionBank.constructs[i];
      const b = questionBank.constructs[j];
      pairs.push({ a, b, correlation: round(correlation(values[a], values[b])) });
    }
  }
  return pairs.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation)).slice(0, 12);
}

function buildDiagnosis({ comparison, robustness, responseModels, regionAnalysis, sensitivity }) {
  const candidateSummary = comparison.publicData.candidateA.summary;
  const nest = regionAnalysis.publicData.conclusions.nestBuilder;
  const bird = regionAnalysis.publicData.conclusions.migratoryBird;
  const fragile = robustness.summary.fragilePersonas;
  const requiresCalibration = candidateSummary.lowFrequencyPersonas.length > 0
    || candidateSummary.overConcentratedPersonas.length > 0
    || fragile.includes('筑巢型')
    || nest.approximateRegionVolume < LOW_RATE_THRESHOLD
    || bird.approximateRegionVolume > 0.18;
  return { requiresCalibration };
}

function score(answers, personaData) {
  const constructValues = Object.fromEntries(questionBank.constructs.map((construct) => [construct, []]));
  for (const question of questionBank.questions) {
    const option = question.options.find((item) => item.id === answers[question.id]);
    constructValues[question.construct].push(option.score);
  }
  const constructScores = Object.fromEntries(questionBank.constructs.map((construct) => [construct, mean(constructValues[construct])]));
  const personaScores = personaData.personas.map((persona, order) => {
    const distance = vectorDistance(constructScores, persona.targetVector);
    return {
      id: persona.id,
      displayName: persona.displayName,
      distance,
      matchScore: Math.max(0, 100 - distance),
      order,
    };
  }).sort((a, b) => a.distance - b.distance || a.order - b.order);
  return {
    constructScores,
    personaScores,
    top5: personaScores.slice(0, 5),
    top1Top2Gap: personaScores[1].distance - personaScores[0].distance,
  };
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

function closestOption(question, target, rng) {
  const sorted = [...question.options].sort((a, b) => Math.abs(a.score - target) - Math.abs(b.score - target) || a.id.localeCompare(b.id));
  const bestDelta = Math.abs(sorted[0].score - target);
  const tied = sorted.filter((option) => Math.abs(option.score - target) === bestDelta);
  return tied[Math.floor(rng() * tied.length)];
}

function vectorDistance(a, b) {
  return Math.sqrt(questionBank.constructs.reduce((sum, construct) => sum + (a[construct] - b[construct]) ** 2, 0) / questionBank.constructs.length);
}

function nearestPersona(persona, personaData) {
  return personaData.personas
    .filter((item) => item.id !== persona.id)
    .map((item) => ({ id: item.id, displayName: item.displayName, distance: vectorDistance(persona.targetVector, item.targetVector) }))
    .sort((a, b) => a.distance - b.distance)[0];
}

function volumeByTop1(samples, key) {
  const counts = {};
  for (const sample of samples) counts[sample[key]] = (counts[sample[key]] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).map(([name, count]) => [name, count / samples.length]));
}

function topEntry(object) {
  const entries = Object.entries(object);
  if (!entries.length) return null;
  const [displayName, count] = entries.sort((a, b) => b[1] - a[1])[0];
  return { displayName, count, rate: round(count / ROBUSTNESS_VARIANTS) };
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function variance(values) {
  const avg = mean(values);
  return mean(values.map((value) => (value - avg) ** 2));
}

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) * p)];
}

function correlation(a, b) {
  const meanA = mean(a);
  const meanB = mean(b);
  const numerator = a.reduce((sum, value, index) => sum + (value - meanA) * (b[index] - meanB), 0);
  const denominator = Math.sqrt(a.reduce((sum, value) => sum + (value - meanA) ** 2, 0) * b.reduce((sum, value) => sum + (value - meanB) ** 2, 0));
  return denominator ? numerator / denominator : 0;
}

function round(value) {
  return Number(value.toFixed(4));
}

function roundObject(object) {
  return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, round(value)]));
}
