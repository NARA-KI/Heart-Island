import fs from 'node:fs';
import { createSeededRng } from '../js/v2/utils.js';

export function loadStoredPilotAnswers(root = process.cwd()) {
  const input = JSON.parse(fs.readFileSync(`${root}/reports/pilot-input/heart-island-current-test-1783239916728.json`, 'utf8'));
  return JSON.parse(input.localStorage['heart-island-v2-alpha-1-state']).answers;
}

export function closestOption(question, target) {
  return [...question.options]
    .sort((a, b) => Math.abs(a.score - target) - Math.abs(b.score - target) || a.id.localeCompare(b.id))[0];
}

export function answersFromTargets(questionBank, targets, fallback = 50) {
  return Object.fromEntries(questionBank.questions.map((question) => [
    question.id,
    closestOption(question, targets[question.construct] ?? fallback).id,
  ]));
}

export function answersFromRandomSeed(questionBank, seed) {
  const rng = createSeededRng(seed);
  return Object.fromEntries(questionBank.questions.map((question) => [
    question.id,
    question.options[Math.floor(rng() * question.options.length)].id,
  ]));
}

export function answersFromSameOption(questionBank, optionId) {
  return Object.fromEntries(questionBank.questions.map((question) => [question.id, optionId]));
}

export const V2_BASELINE_SAMPLE_SOURCES = [
  { id: 'real-collector', label: 'Real stored collector sample', kind: 'storedPilot' },
  { id: 'focused-sc-high', label: 'Focused safety-confirmation high', kind: 'targets', fallback: 50, targets: { SC: 100 } },
  { id: 'balanced-middle', label: 'Balanced middle sample', kind: 'targets', fallback: 50, targets: {} },
  { id: 'high-au-low-sc', label: 'High autonomy boundary low safety confirmation', kind: 'targets', fallback: 50, targets: { AU: 100, SC: 0, TR: 33 } },
  { id: 'high-cl-high-ri', label: 'High intimacy connection high relationship investment', kind: 'targets', fallback: 50, targets: { CL: 100, RI: 100, CM: 67, EC: 67 } },
  { id: 'high-si-high-mn', label: 'High soul ideal high memory pull', kind: 'targets', fallback: 50, targets: { SI: 100, MN: 100, RM: 33, ER: 33 } },
  { id: 'high-mn-low-er', label: 'High memory pull low emotion regulation', kind: 'targets', fallback: 50, targets: { MN: 100, ER: 0, SI: 67, EC: 33 } },
  { id: 'conflict-au-cl-ri-high-sc-low', label: 'High AU CL RI with low SC', kind: 'targets', fallback: 50, targets: { AU: 100, CL: 100, RI: 100, SC: 0, ER: 33, CR: 33 } },
  { id: 'same-persona-migratory-a', label: 'Same persona migratory bird A', kind: 'random', seed: 'same-23' },
  { id: 'same-persona-migratory-b', label: 'Same persona migratory bird B', kind: 'random', seed: 'same-b-23' },
  { id: 'abnormal-all-a', label: 'Highly consistent all A options', kind: 'allOption', optionId: 'A' },
];

export function answersForBaselineSource(questionBank, source, root = process.cwd()) {
  if (source.kind === 'storedPilot') return loadStoredPilotAnswers(root);
  if (source.kind === 'targets') return answersFromTargets(questionBank, source.targets, source.fallback);
  if (source.kind === 'random') return answersFromRandomSeed(questionBank, source.seed);
  if (source.kind === 'allOption') return answersFromSameOption(questionBank, source.optionId);
  throw new Error(`Unknown baseline sample source: ${source.kind}`);
}
