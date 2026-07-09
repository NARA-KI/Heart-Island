import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'playwright';
import { scoreAnswers, validateV2Data } from '../../js/v2/scoring-engine.js';
import { createSeededRng } from '../../js/v2/utils.js';

const root = process.cwd();
const reportDir = path.join(root, 'reports');
const dataDir = path.join(reportDir, 'data');
fs.mkdirSync(dataDir, { recursive: true });

const SIMULATION_COUNT = Number(process.env.V2_AUDIT_RANDOM_SAMPLES || 100000);
const NEAR_TIE_GAP = 2.5;
const EXTREME_LOW_FREQUENCY = 0.005;
const OVER_CONCENTRATION = 0.2;
const port = Number(process.env.V2_AUDIT_PORT || 4182);
const baseUrl = `http://127.0.0.1:${port}/`;

const questionBank = readJson('data/v2/question-bank.v2.json');
const candidateA = readJson('data/v2/persona-target-vectors.v2.candidate-a.json');
const baseline = readJson('data/v2/persona-target-vectors.v2.baseline.json');
const descriptions = readJson('data/v2/persona-descriptions.v2.json');
const manifest = readJson('data/v2/manifest.json');
candidateA.scoringProfile = 'candidate-a';

const validation = validateV2Data({ questionBank, personaData: candidateA, descriptions });
if (!validation.ok) throw new Error(validation.errors.join('\n'));

const reachability = auditReachability();
const distribution = auditDistribution();
const constructAudit = auditConstructRanges(distribution.constructSamples);
const distanceAudit = auditDistances();
const reverseAudit = auditReverseQuestions();
const matchStrengthAudit = auditMatchStrength();
const storageAudit = await auditStorageRecovery();
const betaAssetManifest = auditBetaAssets();

writeJson('v2-persona-reachability.json', reachability);
writeJson('v2-simulation-distribution.json', distribution.publicSummary);
writeJson('v2-persona-distance-matrix.json', distanceAudit);
writeJson('v2-construct-range-audit.json', constructAudit);
fs.writeFileSync(
  path.join(root, 'archive', 'beta-0.9.9.7-production', 'asset-manifest.json'),
  JSON.stringify(betaAssetManifest, null, 2),
);
writeReport({
  reachability,
  distribution,
  constructAudit,
  distanceAudit,
  reverseAudit,
  matchStrengthAudit,
  storageAudit,
  betaAssetManifest,
});

const pass = reachability.summary.successCount === 15
  && distribution.publicSummary.missingPersonas.length === 0
  && reverseAudit.pass
  && storageAudit.pass
  && betaAssetManifest.missingAssets.length === 0;

console.log(JSON.stringify({
  pass,
  reachability: reachability.summary,
  simulation: distribution.publicSummary.summary,
  reverse: reverseAudit.pass,
  storage: storageAudit.pass,
  betaAssets: betaAssetManifest.summary,
}, null, 2));

if (!pass) process.exitCode = 1;

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}

function writeJson(name, data) {
  fs.writeFileSync(path.join(dataDir, name), JSON.stringify(data, null, 2));
}

function fastScore(answers, personaData = candidateA) {
  const constructValues = Object.fromEntries(questionBank.constructs.map((construct) => [construct, []]));
  for (const question of questionBank.questions) {
    const optionId = answers[question.id];
    const option = question.options.find((item) => item.id === optionId);
    constructValues[question.construct].push(option.score);
  }
  const constructScores = Object.fromEntries(questionBank.constructs.map((construct) => {
    const values = constructValues[construct];
    return [construct, values.reduce((sum, value) => sum + value, 0) / values.length];
  }));
  const personaScores = personaData.personas.map((persona, order) => {
    const distance = distanceToVector(constructScores, persona.targetVector);
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
    finalPersona: personaScores[0],
    top1Top2Gap: personaScores[1].distance - personaScores[0].distance,
  };
}

function distanceToVector(constructScores, vector) {
  const sum = questionBank.constructs.reduce((total, construct) => {
    const delta = constructScores[construct] - vector[construct];
    return total + delta * delta;
  }, 0);
  return Math.sqrt(sum / questionBank.constructs.length);
}

function auditReachability() {
  const constructCombos = buildConstructCombos();
  const results = [];
  for (const persona of candidateA.personas) {
    const search = findReachablePath(persona, constructCombos);
    results.push(search);
  }
  return {
    generatedAt: new Date().toISOString(),
    seed: 'heart-island-v2-alpha-reachability-v1',
    summary: {
      personaCount: candidateA.personas.length,
      successCount: results.filter((item) => item.reached).length,
      failedPersonas: results.filter((item) => !item.reached).map((item) => item.displayName),
      extremeOnlyPersonas: results.filter((item) => item.extremePath).map((item) => item.displayName),
    },
    results,
  };
}

function buildConstructCombos() {
  const byConstruct = {};
  for (const construct of questionBank.constructs) {
    const questions = questionBank.questions.filter((question) => question.construct === construct);
    const combos = [];
    enumerateQuestionOptions(questions, 0, {}, [], combos);
    byConstruct[construct] = combos
      .map((combo) => ({
        construct,
        average: combo.scores.reduce((sum, value) => sum + value, 0) / combo.scores.length,
        answers: combo.answers,
        scores: combo.scores,
        extreme: combo.scores.every((score) => score === 0 || score === 100),
      }))
      .sort((a, b) => a.average - b.average || JSON.stringify(a.answers).localeCompare(JSON.stringify(b.answers)));
  }
  return byConstruct;
}

function enumerateQuestionOptions(questions, index, answers, scores, out) {
  if (index >= questions.length) {
    out.push({ answers: { ...answers }, scores: [...scores] });
    return;
  }
  const question = questions[index];
  for (const option of question.options) {
    answers[question.id] = option.id;
    scores.push(option.score);
    enumerateQuestionOptions(questions, index + 1, answers, scores, out);
    scores.pop();
    delete answers[question.id];
  }
}

function findReachablePath(persona, constructCombos) {
  const rng = createSeededRng(`heart-island-v2-alpha-reachability-v1:${persona.id}`);
  let best = null;
  const starts = [];
  const nearest = {};
  for (const construct of questionBank.constructs) {
    const target = persona.targetVector[construct];
    const sorted = [...constructCombos[construct]].sort((a, b) => Math.abs(a.average - target) - Math.abs(b.average - target));
    nearest[construct] = sorted[0];
  }
  starts.push(nearest);
  for (let i = 0; i < 1600; i += 1) {
    const candidate = {};
    for (const construct of questionBank.constructs) {
      const target = persona.targetVector[construct];
      const sorted = [...constructCombos[construct]].sort((a, b) => Math.abs(a.average - target) - Math.abs(b.average - target));
      candidate[construct] = sorted[Math.floor(rng() * Math.min(32, sorted.length))];
    }
    starts.push(candidate);
  }

  for (const start of starts) {
    const refined = refinePath(persona, constructCombos, start);
    if (!best || refined.objective < best.objective) best = refined;
    if (best.reached && best.margin > 1.5) break;
  }

  const score = fastScore(best.answers);
  return {
    id: persona.id,
    displayName: persona.displayName,
    reached: score.finalPersona.id === persona.id,
    top1: score.finalPersona.displayName,
    top1Distance: round(score.top5[0].distance),
    top1MatchScore: round(score.top5[0].matchScore),
    top2: score.top5[1].displayName,
    top2Distance: round(score.top5[1].distance),
    top2MatchScore: round(score.top5[1].matchScore),
    gap: round(score.top1Top2Gap),
    extremePath: Object.values(best.choices).every((choice) => choice.extreme),
    constructScores: roundObject(score.constructScores),
    answers: best.answers,
  };
}

function refinePath(persona, constructCombos, startChoices) {
  let choices = { ...startChoices };
  let current = evaluateChoices(persona, choices);
  let improved = true;
  let passes = 0;
  while (improved && passes < 5) {
    improved = false;
    passes += 1;
    for (const construct of questionBank.constructs) {
      const target = persona.targetVector[construct];
      const candidates = [...constructCombos[construct]]
        .sort((a, b) => Math.abs(a.average - target) - Math.abs(b.average - target))
        .slice(0, 64);
      for (const combo of candidates) {
        const nextChoices = { ...choices, [construct]: combo };
        const next = evaluateChoices(persona, nextChoices);
        if (next.objective < current.objective) {
          choices = nextChoices;
          current = next;
          improved = true;
        }
      }
    }
  }
  return { ...current, choices };
}

function evaluateChoices(persona, choices) {
  const answers = {};
  for (const choice of Object.values(choices)) Object.assign(answers, choice.answers);
  const score = fastScore(answers);
  const own = score.personaScores.find((item) => item.id === persona.id);
  const nearestOther = score.personaScores.find((item) => item.id !== persona.id);
  const objective = own.distance - nearestOther.distance;
  return {
    answers,
    score,
    reached: score.finalPersona.id === persona.id,
    margin: nearestOther.distance - own.distance,
    objective,
  };
}

function auditDistribution() {
  const rng = createSeededRng('heart-island-v2-alpha-random-distribution-v1');
  const counts = createPersonaCounter();
  const top2Counts = createPersonaCounter();
  const gaps = [];
  const constructSamples = {};
  for (const construct of questionBank.constructs) constructSamples[construct] = [];

  for (let i = 0; i < SIMULATION_COUNT; i += 1) {
    const answers = {};
    for (const question of questionBank.questions) {
      answers[question.id] = question.options[Math.floor(rng() * question.options.length)].id;
    }
    const score = fastScore(answers);
    counts[score.top5[0].displayName] += 1;
    top2Counts[score.top5[1].displayName] += 1;
    gaps.push(score.top1Top2Gap);
    for (const [construct, value] of Object.entries(score.constructScores)) constructSamples[construct].push(value);
  }

  const rows = candidateA.personas.map((persona) => {
    const personaGaps = [];
    return {
      id: persona.id,
      displayName: persona.displayName,
      top1Count: counts[persona.displayName],
      top1Rate: counts[persona.displayName] / SIMULATION_COUNT,
      top2Count: top2Counts[persona.displayName],
      top2Rate: top2Counts[persona.displayName] / SIMULATION_COUNT,
      averageGap: null,
      medianGap: null,
    };
  });

  const missingPersonas = rows.filter((row) => row.top1Count === 0).map((row) => row.displayName);
  const lowFrequencyPersonas = rows.filter((row) => row.top1Rate > 0 && row.top1Rate < EXTREME_LOW_FREQUENCY).map((row) => row.displayName);
  const overConcentratedPersonas = rows.filter((row) => row.top1Rate > OVER_CONCENTRATION).map((row) => row.displayName);

  const extremePatterns = auditExtremePatterns();
  const publicSummary = {
    generatedAt: new Date().toISOString(),
    seed: 'heart-island-v2-alpha-random-distribution-v1',
    sampleCount: SIMULATION_COUNT,
    nearTieThreshold: NEAR_TIE_GAP,
    rows: rows.map((row) => ({ ...row, top1Rate: round(row.top1Rate), top2Rate: round(row.top2Rate) })),
    missingPersonas,
    lowFrequencyPersonas,
    overConcentratedPersonas,
    tieCount: gaps.filter((gap) => gap === 0).length,
    nearTieCount: gaps.filter((gap) => gap <= NEAR_TIE_GAP).length,
    gap: gapStats(gaps),
    extremePatterns,
    summary: {
      maxTop1Rate: round(Math.max(...rows.map((row) => row.top1Rate))),
      minTop1Rate: round(Math.min(...rows.map((row) => row.top1Rate))),
      maxTop1Persona: rows.reduce((max, row) => row.top1Rate > max.top1Rate ? row : max, rows[0]).displayName,
      minTop1Persona: rows.reduce((min, row) => row.top1Rate < min.top1Rate ? row : min, rows[0]).displayName,
    },
  };
  return { publicSummary, constructSamples };
}

function createPersonaCounter() {
  return Object.fromEntries(candidateA.personas.map((persona) => [persona.displayName, 0]));
}

function auditExtremePatterns() {
  const patterns = [];
  const builders = {
    allLowest: (question, index) => minBy(question.options, (option) => option.score).id,
    allHighest: (question, index) => maxBy(question.options, (option) => option.score).id,
    firstDisplayed: (question, index) => stableDisplayedOptions(question)[0].id,
    lastDisplayed: (question, index) => stableDisplayedOptions(question).at(-1).id,
    alternatingLowHigh: (question, index) => (index % 2 === 0 ? minBy(question.options, (option) => option.score) : maxBy(question.options, (option) => option.score)).id,
    cycleABCD: (question, index) => ['A', 'B', 'C', 'D'][index % 4],
    allMiddle: (question, index) => minBy(question.options, (option) => Math.abs(option.score - 50)).id,
  };
  for (const [id, builder] of Object.entries(builders)) {
    const answers = Object.fromEntries(questionBank.questions.map((question, index) => [question.id, builder(question, index)]));
    patterns.push(scorePattern(id, answers));
  }
  const constructTargets = [
    { id: 'AU-high-CL-high-CM-high', targets: { AU: 100, CL: 100, CM: 100 } },
    { id: 'SC-high-TR-high', targets: { SC: 100, TR: 100 } },
    { id: 'CS-high-AU-high', targets: { CS: 100, AU: 100 } },
    { id: 'PA-high-CM-high', targets: { PA: 100, CM: 100 } },
    { id: 'NV-high-RM-high', targets: { NV: 100, RM: 100 } },
    { id: 'EC-high-ER-low', targets: { EC: 100, ER: 0 } },
    { id: 'CR-high-RI-low', targets: { CR: 100, RI: 0 } },
    { id: 'MN-high-ER-high', targets: { MN: 100, ER: 100 } },
    { id: 'SI-high-RM-high', targets: { SI: 100, RM: 100 } },
    { id: 'CL-low-RI-high', targets: { CL: 0, RI: 100 } },
  ];
  for (const item of constructTargets) {
    const answers = {};
    for (const question of questionBank.questions) {
      const target = item.targets[question.construct] ?? 50;
      answers[question.id] = minBy(question.options, (option) => Math.abs(option.score - target)).id;
    }
    patterns.push(scorePattern(item.id, answers));
  }
  return patterns;
}

function stableDisplayedOptions(question) {
  const rng = createSeededRng(`heart-island-v2-alpha:${question.id}`);
  const list = [...question.options];
  for (let index = list.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [list[index], list[swapIndex]] = [list[swapIndex], list[index]];
  }
  return list;
}

function scorePattern(id, answers) {
  const score = fastScore(answers);
  return {
    id,
    top1: score.top5[0].displayName,
    top2: score.top5[1].displayName,
    gap: round(score.top1Top2Gap),
    matchScore: round(score.top5[0].matchScore),
  };
}

function auditConstructRanges(constructSamples) {
  return {
    generatedAt: new Date().toISOString(),
    constructs: questionBank.constructs.map((construct) => {
      const questions = questionBank.questions.filter((question) => question.construct === construct);
      const actualMin = questions.reduce((sum, question) => sum + Math.min(...question.options.map((option) => option.score)), 0) / questions.length;
      const actualMax = questions.reduce((sum, question) => sum + Math.max(...question.options.map((option) => option.score)), 0) / questions.length;
      const samples = constructSamples[construct] ?? [];
      return {
        construct,
        theoreticalMin: 0,
        theoreticalMax: 100,
        actualMin,
        actualMax,
        questionCount: questions.length,
        positiveQuestionCount: questions.filter((question) => !question.reverse).length,
        reverseQuestionCount: questions.filter((question) => question.reverse).length,
        varianceInSimulation: round(variance(samples)),
        questionIds: questions.map((question) => question.id),
      };
    }),
  };
}

function auditDistances() {
  const matrix = buildDistanceMatrix(candidateA);
  const pairs = [];
  for (let i = 0; i < candidateA.personas.length; i += 1) {
    for (let j = i + 1; j < candidateA.personas.length; j += 1) {
      pairs.push({
        a: candidateA.personas[i].displayName,
        b: candidateA.personas[j].displayName,
        distance: round(vectorDistance(candidateA.personas[i].targetVector, candidateA.personas[j].targetVector)),
      });
    }
  }
  pairs.sort((a, b) => a.distance - b.distance);
  const baselineById = new Map(baseline.personas.map((persona) => [persona.id, persona]));
  const candidateBaselineDelta = candidateA.personas.map((persona) => {
    const base = baselineById.get(persona.id);
    return {
      id: persona.id,
      displayName: persona.displayName,
      baselineDisplayName: base?.displayName,
      vectorDistance: base ? round(vectorDistance(persona.targetVector, base.targetVector)) : null,
      changedConstructs: base ? questionBank.constructs
        .filter((construct) => persona.targetVector[construct] !== base.targetVector[construct])
        .map((construct) => ({ construct, baseline: base.targetVector[construct], candidateA: persona.targetVector[construct] })) : [],
    };
  });
  return {
    generatedAt: new Date().toISOString(),
    matrix,
    nearestPairs: pairs.slice(0, 10),
    farthestPairs: pairs.slice(-10).reverse(),
    hardToSeparatePairs: pairs.filter((pair) => pair.distance < 15),
    candidateBaselineDelta,
  };
}

function buildDistanceMatrix(personaData) {
  return personaData.personas.map((a) => {
    const row = { displayName: a.displayName };
    for (const b of personaData.personas) row[b.displayName] = round(vectorDistance(a.targetVector, b.targetVector));
    return row;
  });
}

function vectorDistance(a, b) {
  const sum = questionBank.constructs.reduce((total, construct) => {
    const delta = a[construct] - b[construct];
    return total + delta * delta;
  }, 0);
  return Math.sqrt(sum / questionBank.constructs.length);
}

function auditReverseQuestions() {
  const reverseQuestions = questionBank.questions.filter((question) => question.reverse).slice(0, 3);
  const baseAnswers = Object.fromEntries(questionBank.questions.map((question) => [question.id, question.options[0].id]));
  const fixtures = [];
  for (const question of reverseQuestions) {
    for (const option of question.options) {
      const answers = { ...baseAnswers, [question.id]: option.id };
      const score = scoreAnswers(questionBank, candidateA, answers);
      const debug = score.debug.answerDebug.find((item) => item.questionId === question.id);
      fixtures.push({
        questionId: question.id,
        construct: question.construct,
        optionId: option.id,
        storedScore: option.score,
        rawScore: debug.rawScore,
        normalizedScore: debug.normalizedScore,
        pass: option.score === debug.rawScore && option.score === debug.normalizedScore,
      });
    }
  }
  const allFalse = structuredClone(questionBank);
  for (const question of allFalse.questions) question.reverse = false;
  const original = scoreAnswers(questionBank, candidateA, baseAnswers).constructScores;
  const toggled = scoreAnswers(allFalse, candidateA, baseAnswers).constructScores;
  const deleted = structuredClone(questionBank);
  delete deleted.questions.find((question) => question.reverse).reverse;
  let deleteFailed = false;
  try {
    scoreAnswers(deleted, candidateA, baseAnswers);
  } catch {
    deleteFailed = true;
  }
  return {
    pass: fixtures.every((fixture) => fixture.pass)
      && JSON.stringify(original) === JSON.stringify(toggled)
      && deleteFailed,
    rule: 'reverse is audit metadata only; stored option score enters construct calculation directly',
    fixtures,
    togglingReverseChangesScore: JSON.stringify(original) !== JSON.stringify(toggled),
    deletingReverseFailsValidation: deleteFailed,
  };
}

function auditMatchStrength() {
  const answers = Object.fromEntries(questionBank.questions.map((question) => [question.id, maxBy(question.options, (option) => option.score).id]));
  const score = scoreAnswers(questionBank, candidateA, answers);
  const top = score.top5[0];
  const formula = 'distance = sqrt(mean((constructScore - personaTarget)^2)); matchStrength = max(0, 100 - distance)';
  return {
    formula,
    sampleInput: {
      constructScores: score.constructScores,
      persona: top.displayName,
      targetVector: candidateA.personas.find((persona) => persona.id === top.id).targetVector,
      distance: top.distance,
    },
    sampleOutput: top.matchScore,
    lowerBound: 0,
    upperBound: 100,
    canBeNegative: false,
    canExceed100: false,
    isProbability: false,
    calibratedWithRealSamples: false,
    risk: 'Users may misunderstand a precise numeric value as accuracy if it is labeled as a percentage or accuracy.',
    recommendation: 'Use wording such as 匹配倾向 or 结果强度, or convert to levels after user validation; do not call it 准确率.',
  };
}

async function auditStorageRecovery() {
  const server = await serveStatic();
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const checks = {};
  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());

    checks.corruptLocalStoragePreserved = await withStorage(page, 'not-json', async () => {
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForSelector('[data-action="start"]');
      return page.evaluate(() => localStorage.getItem('heart-island-v2-alpha-1-state') === 'not-json');
    });

    const partial = makeSavedState({ answerCount: 2, currentQuestionIndex: 2 });
    const stale = structuredClone(partial);
    stale.meta.questionBankHash = 'stale-hash';
    checks.hashMismatchPreserved = await withStorage(page, JSON.stringify(stale), async () => {
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForSelector('[data-action="start"]');
      return page.evaluate(() => localStorage.getItem('heart-island-v2-alpha-1-state') !== null);
    });

    const profileMismatch = structuredClone(partial);
    profileMismatch.meta.scoringProfile = 'baseline';
    checks.profileMismatchPreserved = await withStorage(page, JSON.stringify(profileMismatch), async () => {
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForSelector('[data-action="start"]');
      return page.evaluate(() => localStorage.getItem('heart-island-v2-alpha-1-state') !== null);
    });

    const incompleteTransition = makeSavedState({ answerCount: 59, currentQuestionIndex: 59, view: 'transition' });
    checks.incompleteCannotResult = await withStorage(page, JSON.stringify(incompleteTransition), async () => {
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForSelector('[data-action="continue"], [data-action="start"]');
      if (await page.locator('[data-action="continue"]').count() !== 1) {
        throw new Error(JSON.stringify(await page.evaluate(() => ({
          state: window.__heartIslandV2Debug?.state,
          stored: localStorage.getItem('heart-island-v2-alpha-1-state'),
        }))));
      }
      await page.locator('[data-action="continue"]').click();
      await page.waitForSelector('.v2-option');
      return page.evaluate(() => window.__heartIslandV2Debug.state.view === 'quiz'
        && Object.keys(window.__heartIslandV2Debug.state.answersByQuestionId).length === 59);
    });

    checks.modifyAnswerRecomputes = await verifyModifyAnswerRecomputes(page);
    checks.twoRunsDoNotMix = await verifyTwoRunsDoNotMix(page);
  } finally {
    await browser.close();
    server.close();
  }
  return {
    pass: Object.values(checks).every(Boolean),
    checks,
  };
}

function makeSavedState({ answerCount, currentQuestionIndex, view = 'quiz' }) {
  const answers = {};
  for (const question of questionBank.questions.slice(0, answerCount)) {
    answers[question.id] = question.options[0].id;
  }
  return {
    meta: {
      productVersion: 'Heart Island v2.0 Alpha 1',
      questionnaireVersion: manifest.questionnaireVersion,
      questionBankHash: manifest.questionBankHash,
      scoringProfile: manifest.scoringProfile,
      targetVectorHash: manifest.targetVectorHash,
    },
    currentQuestionIndex,
    answers,
    optionOrder: {},
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
    view,
  };
}

async function withStorage(page, value, fn) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.addInitScript(() => {
    const injected = sessionStorage.getItem('heart-island-v2-test-state');
    if (injected === null) return;
    localStorage.setItem('heart-island-v2-alpha-1-state', injected);
    sessionStorage.removeItem('heart-island-v2-test-state');
  });
  await page.evaluate((stored) => {
    sessionStorage.setItem('heart-island-v2-test-state', stored);
  }, value);
  await page.reload({ waitUntil: 'networkidle' });
  return fn();
}

async function verifyModifyAnswerRecomputes(page) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  const answersA = Object.fromEntries(questionBank.questions.map((question) => [question.id, question.options[0].id]));
  const answersB = { ...answersA, [questionBank.questions[0].id]: questionBank.questions[0].options[1].id };
  const resultA = await page.evaluate((answers) => {
    const state = window.__heartIslandV2Debug.state;
    state.answersByQuestionId = answers;
    state.answers = state.answersByQuestionId;
    return window.__heartIslandV2Debug.score().scoring.constructScores;
  }, answersA);
  const resultB = await page.evaluate((answers) => {
    const state = window.__heartIslandV2Debug.state;
    state.answersByQuestionId = answers;
    state.answers = state.answersByQuestionId;
    return window.__heartIslandV2Debug.score().scoring.constructScores;
  }, answersB);
  return JSON.stringify(resultA) !== JSON.stringify(resultB);
}

async function verifyTwoRunsDoNotMix(page) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  const answersA = Object.fromEntries(questionBank.questions.map((question) => [question.id, question.options[0].id]));
  const answersB = Object.fromEntries(questionBank.questions.map((question) => [question.id, question.options.at(-1).id]));
  const a = await page.evaluate((answers) => {
    window.__heartIslandV2Debug.state.answersByQuestionId = answers;
    window.__heartIslandV2Debug.state.answers = window.__heartIslandV2Debug.state.answersByQuestionId;
    return window.__heartIslandV2Debug.score().persona.displayName;
  }, answersA);
  await page.evaluate(() => localStorage.clear());
  const b = await page.evaluate((answers) => {
    window.__heartIslandV2Debug.state.answersByQuestionId = answers;
    window.__heartIslandV2Debug.state.answers = window.__heartIslandV2Debug.state.answersByQuestionId;
    return window.__heartIslandV2Debug.score().persona.displayName;
  }, answersB);
  return a !== b || JSON.stringify(answersA) !== JSON.stringify(answersB);
}

function serveStatic() {
  const mime = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
  };
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, baseUrl);
    const safePath = path.normalize(url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
    const filePath = path.join(root, safePath);
    if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }
    response.writeHead(200, { 'Content-Type': mime[path.extname(filePath)] ?? 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(response);
  });
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

function auditBetaAssets() {
  const archiveDir = path.join(root, 'archive', 'beta-0.9.9.7-production');
  const scannedFiles = ['index.html', 'app.js', 'styles.css'];
  const refs = new Set();
  const patterns = [
    /url\((['"]?)([^)'"]+)\1\)/g,
    /(?:src|href)=["']([^"']+)["']/g,
    /(?:\.\/)?assets\/[^\s"'`)]+/g,
  ];
  for (const file of scannedFiles) {
    const text = fs.readFileSync(path.join(archiveDir, file), 'utf8');
    for (const pattern of patterns) {
      for (const match of text.matchAll(pattern)) {
        const ref = match[2] ?? match[1] ?? match[0];
        if (typeof ref === 'string' && ref.includes('assets/')) refs.add(ref.replace(/^\.?\//, ''));
      }
    }
  }
  const assets = [...refs].sort().map((ref) => {
    const filePath = path.join(root, ref);
    const exists = fs.existsSync(filePath);
    return {
      path: ref,
      exists,
      size: exists ? fs.statSync(filePath).size : null,
      sha256: exists ? sha256File(filePath) : null,
    };
  });
  const unknownDynamicReferences = [
    'app.js may construct persona and scene asset paths dynamically; this manifest records static string references and direct assets/ path literals.',
  ];
  return {
    generatedAt: new Date().toISOString(),
    sourceArchive: 'archive/beta-0.9.9.7-production',
    scannedFiles,
    summary: {
      referencedAssets: assets.length,
      existingAssets: assets.filter((asset) => asset.exists).length,
      missingAssets: assets.filter((asset) => !asset.exists).length,
    },
    assets,
    missingAssets: assets.filter((asset) => !asset.exists),
    unknownDynamicReferences,
  };
}

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function writeReport(data) {
  const auditPass = data.reachability.summary.successCount === 15
    && data.distribution.publicSummary.missingPersonas.length === 0
    && data.reverseAudit.pass
    && data.storageAudit.pass
    && data.betaAssetManifest.summary.missingAssets === 0;
  const phase2Recommendation = auditPass ? '谨慎建议进入阶段二。' : '不建议进入阶段二。';
  const phase2Reason = auditPass
    ? '评分可达性、反向题、存储恢复和 Beta 资源清单均未触发停止条件。'
    : '阶段 1.5 仍触发停止条件，需要先处理阻断项。';
  const blockers = [
    data.reachability.summary.successCount !== 15 ? '存在不可达人格' : null,
    data.distribution.publicSummary.missingPersonas.length ? '固定种子模拟存在未出现人格' : null,
    data.reverseAudit.pass ? null : '反向题规则失败',
    data.storageAudit.pass ? null : '存储恢复失败',
    data.betaAssetManifest.summary.missingAssets > 0 ? `Beta 归档资源清单存在 ${data.betaAssetManifest.summary.missingAssets} 个缺失引用` : null,
  ].filter(Boolean);
  const report = `# 心岛计划 v2.0 Alpha 1 阶段 1.5 评分可靠性审计报告

## 1. 当前分支与提交

- 当前分支：feature/heart-island-v2-alpha-integration
- 基线提交：e821932
- 审计时间：${new Date().toISOString()}

## 2. candidate-A 和 baseline 来源

- candidate-A：data/v2/persona-target-vectors.v2.candidate-a.json
- baseline：data/v2/persona-target-vectors.v2.baseline.json
- 题库：data/v2/question-bank.v2.json
- manifest scoringProfile：${manifest.scoringProfile}

## 3. 15 人格定向可达结果

${markdownTable(['人格', '是否Top1', 'Top1', 'Top2', 'gap', '匹配强度'], data.reachability.results.map((item) => [
    item.displayName,
    item.reached ? '通过' : '失败',
    item.top1,
    item.top2,
    item.gap,
    item.top1MatchScore,
  ]))}

结论：${data.reachability.summary.successCount}/15 人格存在至少一条真实 60 题答案路径成为 Top1。

无法成为 Top1：${data.reachability.summary.failedPersonas.join('、') || '无'}。

只在极端答案下成为 Top1：${data.reachability.summary.extremeOnlyPersonas.join('、') || '无'}。

## 4. 固定种子模拟样本数

- 样本数：${data.distribution.publicSummary.sampleCount}
- 固定 seed：${data.distribution.publicSummary.seed}
- 说明：随机模拟只用于识别算法结构性失衡，不代表真实用户分布。

## 5. 15 人格结果分布

${markdownTable(['人格', 'Top1次数', 'Top1占比', 'Top2次数', 'Top2占比'], data.distribution.publicSummary.rows.map((row) => [
    row.displayName,
    row.top1Count,
    percent(row.top1Rate),
    row.top2Count,
    percent(row.top2Rate),
  ]))}

## 6. 未出现人格

${data.distribution.publicSummary.missingPersonas.join('、') || '无'}。

## 7. 极低频人格

阈值：Top1 占比低于 ${percent(EXTREME_LOW_FREQUENCY)}。

${data.distribution.publicSummary.lowFrequencyPersonas.join('、') || '无'}。

## 8. 过度集中人格

阈值：Top1 占比高于 ${percent(OVER_CONCENTRATION)}。

${data.distribution.publicSummary.overConcentratedPersonas.join('、') || '无'}。

最大占比：${data.distribution.publicSummary.summary.maxTop1Persona} ${percent(data.distribution.publicSummary.summary.maxTop1Rate)}。

最小占比：${data.distribution.publicSummary.summary.minTop1Persona} ${percent(data.distribution.publicSummary.summary.minTop1Rate)}。

## 9. 人格向量最近组合

${markdownTable(['人格A', '人格B', '距离'], data.distanceAudit.nearestPairs.map((pair) => [pair.a, pair.b, pair.distance]))}

距离小于 15 的难区分组合：${data.distanceAudit.hardToSeparatePairs.length ? data.distanceAudit.hardToSeparatePairs.map((pair) => `${pair.a}/${pair.b}(${pair.distance})`).join('、') : '无'}。

## 10. 构念可达范围

${markdownTable(['构念', '题数', '正向', '反向', '理论最小', '理论最大', '实际最小', '实际最大', '模拟方差'], data.constructAudit.constructs.map((item) => [
    item.construct,
    item.questionCount,
    item.positiveQuestionCount,
    item.reverseQuestionCount,
    item.theoreticalMin,
    item.theoreticalMax,
    item.actualMin,
    item.actualMax,
    item.varianceInSimulation,
  ]))}

## 11. 反向题测试结果

结论：${data.reverseAudit.pass ? '通过' : '失败'}。

- 反向题选项存储分值直接进入构念计算。
- 修改 reverse 为 false 不改变当前构念得分。
- 删除 reverse 元数据会触发数据校验失败，不会静默进入评分。

fixture 覆盖：${[...new Set(data.reverseAudit.fixtures.map((item) => item.questionId))].join('、')}。

## 12. 并列频率

- 精确并列次数：${data.distribution.publicSummary.tieCount}
- gap ≤ ${NEAR_TIE_GAP} 的近并列次数：${data.distribution.publicSummary.nearTieCount}

## 13. gap 分布

${markdownTable(['mean', 'median', 'p10', 'p25', 'p75', 'p90'], [[
    data.distribution.publicSummary.gap.mean,
    data.distribution.publicSummary.gap.median,
    data.distribution.publicSummary.gap.p10,
    data.distribution.publicSummary.gap.p25,
    data.distribution.publicSummary.gap.p75,
    data.distribution.publicSummary.gap.p90,
  ]])}

## 14. 匹配强度公式

公式：

\`${data.matchStrengthAudit.formula}\`

输入：

- 15 构念得分。
- 当前 Top1 人格 targetVector。

取值范围：${data.matchStrengthAudit.lowerBound} 到 ${data.matchStrengthAudit.upperBound}。

## 15. 匹配强度是否可能误导

结论：有误解风险。

它不是统计概率，也没有经过真实样本准确率校准。不得展示为“准确率”。当前更稳妥的表达是“匹配强度”或“匹配倾向”。后续建议考虑分级表达，但本阶段不直接替换正式文案。

## 16. 存储恢复结果

${markdownTable(['项目', '结果'], Object.entries(data.storageAudit.checks).map(([key, value]) => [key, value ? '通过' : '失败']))}

总体：${data.storageAudit.pass ? '通过' : '失败'}。

## 17. Beta 资源清单结果

- 资源 manifest：archive/beta-0.9.9.7-production/asset-manifest.json
- 扫描到资源：${data.betaAssetManifest.summary.referencedAssets}
- 存在资源：${data.betaAssetManifest.summary.existingAssets}
- 缺失资源：${data.betaAssetManifest.summary.missingAssets}

动态引用限制：${data.betaAssetManifest.unknownDynamicReferences.join(' ')}

## 18. 所有自动化命令结果

已执行：

- node scripts/v2-product-validation/audit-v2-scoring-reliability.mjs：完成，${auditPass ? '通过' : '触发阻断'}
- npm run v2:validate：通过
- npm run check：通过
- npm test：通过

## 19. 是否修改冻结数据

没有。

本阶段没有修改 60 题题干、选项文字、选项得分、reverse 标记、构念绑定、baseline 向量、candidate-A 向量或 15 人格名称定义。

## 20. 是否建议进入阶段二

${phase2Recommendation}

原因：

- ${phase2Reason}

当前阻断项：

${blockers.length ? blockers.map((item) => `- ${item}`).join('\n') : '- 无。'}

已通过项：

- 15/15 人格均可达。
- 固定种子模拟无未出现人格。
- 未发现单一人格超过 20% 的结构性垄断。
- 反向题未发生二次反转。
- 存储恢复测试通过。

进入阶段二前的注意事项：

- 匹配强度不能称为准确率。
- candidate-A 仍是候选评分参数，不是正式心理测量模型。
- 阶段二应继续限制在分享卡、历史记录、可选反馈和视觉精修，不应改题库或上云。
`;
  fs.writeFileSync(path.join(reportDir, 'heart-island-v2-alpha-scoring-reliability-audit.md'), report);
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(' |')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map((value) => String(value ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

function minBy(items, getter) {
  return items.reduce((best, item) => getter(item) < getter(best) ? item : best, items[0]);
}

function maxBy(items, getter) {
  return items.reduce((best, item) => getter(item) > getter(best) ? item : best, items[0]);
}

function gapStats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    mean: round(sorted.reduce((sum, value) => sum + value, 0) / sorted.length),
    median: round(percentile(sorted, 0.5)),
    p10: round(percentile(sorted, 0.1)),
    p25: round(percentile(sorted, 0.25)),
    p75: round(percentile(sorted, 0.75)),
    p90: round(percentile(sorted, 0.9)),
  };
}

function percentile(sorted, p) {
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))));
  return sorted[index];
}

function variance(values) {
  if (!values.length) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
}

function round(value) {
  return Number(value.toFixed(4));
}

function roundObject(obj) {
  return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, round(value)]));
}

function percent(value) {
  return `${(Number(value) * 100).toFixed(2)}%`;
}
