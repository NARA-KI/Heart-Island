import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { buildResult } from '../js/v2/result-engine.js';
import { validateResultFacts } from '../js/v2/result-facts.js';
import { validateResultReport } from '../js/v2/result-report-builder.js';
import { scoreAnswers } from '../js/v2/scoring-engine.js';
import { answersForBaselineSource } from './v2-baseline-samples.mjs';

const questionBank = readJson('data/v2/question-bank.v2.json');
const candidateA = readJson('data/v2/persona-target-vectors.v2.candidate-a.json');
const descriptions = readJson('data/v2/persona-descriptions.v2.json');
const manifest = readJson('data/v2/manifest.json');
const baselines = readJson('tests/fixtures/v2-result-baselines.json');
candidateA.scoringProfile = 'candidate-a';

assert.equal(sha256('data/v2/question-bank.v2.json'), manifest.questionBankHash, 'question bank hash changed');
assert.equal(sha256('data/v2/persona-target-vectors.v2.candidate-a.json'), manifest.targetVectorHash, 'candidate-a hash changed');
assert.equal(questionBank.questions.length, 60, 'question count changed');
assert.equal(questionBank.constructs.length, 15, 'construct count changed');
assert.equal(candidateA.personas.length, 15, 'persona count changed');

const built = new Map();
for (const sample of baselines.samples) {
  const answers = answersForBaselineSource(questionBank, sample.source);
  const scoring = scoreAnswers(questionBank, candidateA, answers);
  assert.deepEqual(roundObject(scoring.constructScores), roundObject(sample.expected.constructScores), `${sample.id} construct scores changed`);
  assert.equal(scoring.finalPersona.id, sample.expected.persona.id, `${sample.id} persona changed`);
  assert.equal(scoring.finalPersona.displayName, sample.expected.persona.displayName, `${sample.id} persona display changed`);
  assert.equal(scoring.top5[0].id, sample.expected.top1.id, `${sample.id} top1 changed`);
  assert.equal(scoring.top5[1].id, sample.expected.top2.id, `${sample.id} top2 changed`);
  assert.equal(round(scoring.top5[0].distance), sample.expected.top1.distance, `${sample.id} top1 distance changed`);
  assert.equal(round(scoring.top5[1].distance), sample.expected.top2.distance, `${sample.id} top2 distance changed`);
  assert.equal(round(scoring.top1Top2Gap), sample.expected.top1Top2Gap, `${sample.id} gap changed`);

  const result = buildResult({ manifest, questionBank, candidateA, descriptions, answers });
  validateResultFacts(result.facts);
  validateResultReport(result.report);
  assert.equal(result.facts.persona.id, sample.expected.persona.id);
  assert.equal(result.facts.constructRanking.length, 15);
  assert.equal(result.report.advice.length, 3);
  assert(!JSON.stringify(result.report).includes('<'), `${sample.id} report contains html-like text`);
  assert(!/依恋障碍|人格障碍|精神疾病|诊断/.test(JSON.stringify(result.report)), `${sample.id} report contains diagnostic term`);
  built.set(sample.id, result);
}

assert(built.get('high-mn-low-er').facts.conflicts.some((item) => item.id === 'MN_HIGH_ER_LOW'), 'MN/ER conflict not detected');
assert(built.get('high-si-high-mn').facts.conflicts.some((item) => item.id === 'SI_HIGH_RM_LOW'), 'SI/RM conflict not detected');
assert(built.get('conflict-au-cl-ri-high-sc-low').facts.conflicts.some((item) => item.id === 'CL_HIGH_AU_HIGH'), 'CL/AU conflict not detected');
assert.equal(built.get('balanced-middle').facts.conflicts.length, 0, 'balanced sample should not force conflict');
assert.notEqual(built.get('abnormal-all-a').facts.responseQuality.level, 'normal', 'abnormal all-A sample should be flagged');

const reportA = built.get('same-persona-migratory-a').report;
const reportB = built.get('same-persona-migratory-b').report;
assert.equal(built.get('same-persona-migratory-a').facts.persona.id, 'migratory-bird');
assert.equal(built.get('same-persona-migratory-b').facts.persona.id, 'migratory-bird');
const fields = ['oneLine', 'neededRelationship', 'innerConflict', 'misunderstoodByOthers'];
const diffCount = fields.filter((field) => reportA[field] !== reportB[field]).length
  + (JSON.stringify(reportA.keyTraits) !== JSON.stringify(reportB.keyTraits) ? 1 : 0)
  + (JSON.stringify(reportA.repeatPatterns) !== JSON.stringify(reportB.repeatPatterns) ? 1 : 0)
  + (JSON.stringify(reportA.advice) !== JSON.stringify(reportB.advice) ? 1 : 0);
assert(diffCount >= 3, `same persona reports are not different enough: ${diffCount}`);

console.log(JSON.stringify({
  pass: true,
  samples: baselines.samples.length,
  conflictRulesCovered: ['MN_HIGH_ER_LOW', 'SI_HIGH_RM_LOW', 'CL_HIGH_AU_HIGH'],
  samePersonaDiffCount: diffCount,
}, null, 2));

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function round(value, digits = 4) {
  return Number(Number(value).toFixed(digits));
}

function roundObject(object) {
  return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, round(value)]));
}
