import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  createQuestionBankForMode,
  getQuickQuestionIds,
  pickAnswersForQuestionIds,
} from '../js/v2/quiz-modes.js';
import { scoreAnswers } from '../js/v2/scoring-engine.js';

const questionBank = readJson('data/v2/question-bank.v2.json');
const personaData = readJson('data/v2/persona-target-vectors.v2.candidate-a.json');
personaData.scoringProfile = 'candidate-a';
const quickBank = createQuestionBankForMode(questionBank, 'quick');
const quickIds = getQuickQuestionIds(questionBank);
const profiles = [
  { name: 'light', constructSigma: 5, questionSigma: 8, trials: 160 },
  { name: 'medium', constructSigma: 12, questionSigma: 18, trials: 160 },
];
const summary = {};
let seed = 0x51a7c0de;

for (const profile of profiles) {
  const rows = [];
  const personaRows = new Map(personaData.personas.map((persona) => [persona.id, []]));
  for (const persona of personaData.personas) {
    for (let trial = 0; trial < profile.trials; trial += 1) {
      const answers = generateStructuredAnswers(persona.targetVector, profile);
      const full = scoreAnswers(questionBank, personaData, answers);
      const quick = scoreAnswers(
        quickBank,
        personaData,
        pickAnswersForQuestionIds(answers, quickIds),
      );
      const row = compare(full, quick);
      rows.push(row);
      personaRows.get(persona.id).push(row);
    }
  }
  summary[profile.name] = aggregate(rows, personaRows);
}

const sensitivity = quickConstructSensitivity();
assert(summary.light.top1Agreement > summary.medium.top1Agreement, 'light perturbation should be more stable than medium perturbation');
assert(summary.light.averageTop3Overlap >= 0.8, 'light perturbation Top3 overlap should remain high');
assert(summary.light.averageConstructCorrelation >= 0.85, 'light perturbation 15d correlation should remain high');
assert(summary.medium.averageTop3Overlap >= 0.6, 'medium perturbation Top3 overlap should remain usable');
assert.equal(Object.keys(sensitivity).length, 15);

console.log(JSON.stringify({
  pass: true,
  methodology: 'persona target vectors with shared construct noise and per-question noise',
  profiles: summary,
  quickConstructSingleItemSensitivity: sensitivity,
}, null, 2));

function generateStructuredAnswers(targetVector, profile) {
  const constructCenters = Object.fromEntries(
    questionBank.constructs.map((code) => [
      code,
      clamp(targetVector[code] + gaussian() * profile.constructSigma, 0, 100),
    ]),
  );
  return Object.fromEntries(questionBank.questions.map((question) => {
    const desired = clamp(
      constructCenters[question.construct] + gaussian() * profile.questionSigma,
      0,
      100,
    );
    const option = [...question.options].sort((a, b) => (
      Math.abs(a.score - desired) - Math.abs(b.score - desired)
      || a.id.localeCompare(b.id)
    ))[0];
    return [question.id, option.id];
  }));
}

function compare(full, quick) {
  const fullTop3 = full.top5.slice(0, 3).map((item) => item.id);
  const quickTop3 = quick.top5.slice(0, 3).map((item) => item.id);
  const overlap = quickTop3.filter((id) => fullTop3.includes(id)).length / 3;
  const fullValues = questionBank.constructs.map((code) => full.constructScores[code]);
  const quickValues = questionBank.constructs.map((code) => quick.constructScores[code]);
  return {
    top1Same: full.finalPersona.id === quick.finalPersona.id,
    top3Overlap: overlap,
    distanceDelta: Math.abs(full.finalPersona.distance - quick.finalPersona.distance),
    fullMargin: full.top1Top2Gap,
    quickMargin: quick.top1Top2Gap,
    constructCorrelation: pearson(fullValues, quickValues),
  };
}

function aggregate(rows, personaRows) {
  const byPersona = Object.fromEntries([...personaRows].map(([id, items]) => [
    id,
    {
      top1Agreement: ratio(items.filter((item) => item.top1Same).length, items.length),
      averageTop3Overlap: average(items.map((item) => item.top3Overlap)),
      averageConstructCorrelation: average(items.map((item) => item.constructCorrelation)),
    },
  ]));
  return {
    samples: rows.length,
    top1Agreement: ratio(rows.filter((item) => item.top1Same).length, rows.length),
    averageTop3Overlap: average(rows.map((item) => item.top3Overlap)),
    averagePersonaDistanceDelta: average(rows.map((item) => item.distanceDelta)),
    averageFullMargin: average(rows.map((item) => item.fullMargin)),
    averageQuickMargin: average(rows.map((item) => item.quickMargin)),
    averageConstructCorrelation: average(rows.map((item) => item.constructCorrelation)),
    lowestAgreementPersonas: Object.entries(byPersona)
      .sort((a, b) => a[1].top1Agreement - b[1].top1Agreement)
      .slice(0, 5)
      .map(([id, metrics]) => ({ id, ...metrics })),
  };
}

function quickConstructSensitivity() {
  const result = {};
  for (const code of questionBank.constructs) {
    const targetValues = personaData.personas.map((persona) => persona.targetVector[code]);
    const deltas = [];
    for (const target of targetValues) {
      const questions = quickBank.questions.filter((question) => question.construct === code);
      const selectedScores = questions.map((question) => nearestOption(question, target).score);
      const baseline = average(selectedScores);
      for (let index = 0; index < questions.length; index += 1) {
        const alternatives = questions[index].options
          .filter((option) => option.score !== selectedScores[index])
          .sort((a, b) => Math.abs(a.score - selectedScores[index]) - Math.abs(b.score - selectedScores[index]));
        const changed = [...selectedScores];
        changed[index] = alternatives[0].score;
        deltas.push(Math.abs(average(changed) - baseline));
      }
    }
    result[code] = {
      averageSingleItemDelta: round(average(deltas)),
      maxSingleItemDelta: round(Math.max(...deltas)),
    };
  }
  return result;
}

function nearestOption(question, target) {
  return [...question.options].sort((a, b) => (
    Math.abs(a.score - target) - Math.abs(b.score - target)
    || a.id.localeCompare(b.id)
  ))[0];
}

function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 2 ** 32;
}

function gaussian() {
  const u = Math.max(Number.EPSILON, random());
  const v = Math.max(Number.EPSILON, random());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function pearson(a, b) {
  const meanA = average(a);
  const meanB = average(b);
  const numerator = a.reduce((sum, value, index) => sum + (value - meanA) * (b[index] - meanB), 0);
  const denominatorA = Math.sqrt(a.reduce((sum, value) => sum + (value - meanA) ** 2, 0));
  const denominatorB = Math.sqrt(b.reduce((sum, value) => sum + (value - meanB) ** 2, 0));
  if (!denominatorA || !denominatorB) return 1;
  return numerator / (denominatorA * denominatorB);
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function ratio(value, total) {
  return round(value / Math.max(1, total));
}

function round(value, digits = 4) {
  return Number(Number(value).toFixed(digits));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
