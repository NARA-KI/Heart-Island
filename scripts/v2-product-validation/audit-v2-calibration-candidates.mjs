import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { validateV2Data } from '../../js/v2/scoring-engine.js';

const root = process.cwd();
const errors = [];

const expectedFiles = [
  'data/v2/persona-target-vectors.v2.candidate-b.json',
  'data/v2/persona-target-vectors.v2.candidate-c.json',
  'data/v2/persona-target-vectors.v2.candidate-d.json',
  'data/v2/persona-target-vectors.v2.candidate-e-adaptive-hybrid.json',
  'data/v2/scoring-profile.v2.candidate-c.json',
  'data/v2/scoring-profile.v2.candidate-d.json',
  'data/v2/scoring-profile.v2.candidate-e-adaptive-hybrid.json',
  'reports/data/v2-calibration-training-set-summary.json',
  'reports/data/v2-calibration-validation-set-summary.json',
  'reports/data/v2-calibration-candidate-comparison.json',
  'reports/data/v2-calibration-semantic-drift.json',
  'reports/data/v2-calibration-response-style.json',
  'reports/data/v2-calibration-robustness.json',
  'reports/data/v2-calibration-search-log.json',
  'reports/data/v2-candidate-d-volatility-diagnosis.json',
  'reports/data/v2-adaptive-calibration-search.json',
  'reports/data/v2-adaptive-candidate-comparison.json',
  'reports/data/v2-adaptive-response-style.json',
  'reports/data/v2-calibration-score-sensitivity.json',
  'reports/data/v2-adaptive-robustness.json',
  'reports/heart-island-v2-alpha-calibration-candidates.md',
  'reports/heart-island-v2-alpha-adaptive-calibration-review.md',
  'reports/heart-island-v2-persona-semantic-review.md',
];

for (const file of expectedFiles) {
  if (!fs.existsSync(abs(file))) errors.push(`missing expected file: ${file}`);
}

const questionBank = readJson('data/v2/question-bank.v2.json');
for (const file of [
  'data/v2/persona-target-vectors.v2.candidate-b.json',
  'data/v2/persona-target-vectors.v2.candidate-c.json',
  'data/v2/persona-target-vectors.v2.candidate-d.json',
  'data/v2/persona-target-vectors.v2.candidate-e-adaptive-hybrid.json',
]) {
  if (!fs.existsSync(abs(file))) continue;
  const result = validateV2Data({ questionBank, personaData: readJson(file) });
  if (!result.ok) errors.push(`${file} failed validation: ${result.errors.join('; ')}`);
}

const configText = fs.readFileSync(abs('js/v2/config.js'), 'utf8');
if (!configText.includes("export const V2_SCORING_PROFILE = 'candidate-a';")) {
  errors.push('public V2_SCORING_PROFILE is no longer candidate-a');
}

const resultRenderer = fs.readFileSync(abs('js/v2/renderers/result.js'), 'utf8');
if (/匹配强度|准确率|概率|\/ 100|matchStrength\s*\}\s*\/\s*100/.test(resultRenderer)) {
  errors.push('public result renderer appears to contain percent/probability wording');
}

if (fs.existsSync(abs('reports/data/v2-calibration-search-log.json'))) {
  const searchLog = readJson('reports/data/v2-calibration-search-log.json');
  if (searchLog.sourceHashes?.baseline !== sha256File('data/v2/persona-target-vectors.v2.baseline.json')) {
    errors.push('baseline hash differs from calibration source hash');
  }
  if (searchLog.sourceHashes?.candidateA !== sha256File('data/v2/persona-target-vectors.v2.candidate-a.json')) {
    errors.push('candidate-A hash differs from calibration source hash');
  }
}

if (fs.existsSync(abs('reports/data/v2-adaptive-calibration-search.json'))) {
  const adaptiveSearch = readJson('reports/data/v2-adaptive-calibration-search.json');
  const hashFiles = {
    baseline: 'data/v2/persona-target-vectors.v2.baseline.json',
    candidateA: 'data/v2/persona-target-vectors.v2.candidate-a.json',
    candidateB: 'data/v2/persona-target-vectors.v2.candidate-b.json',
    candidateC: 'data/v2/persona-target-vectors.v2.candidate-c.json',
    candidateD: 'data/v2/persona-target-vectors.v2.candidate-d.json',
  };
  for (const [key, file] of Object.entries(hashFiles)) {
    if (adaptiveSearch.sourceHashes?.[key] !== sha256File(file)) {
      errors.push(`${key} hash differs from adaptive source hash`);
    }
  }
}

for (const profile of ['candidate-c', 'candidate-d']) {
  if (!fs.existsSync(abs(`data/v2/scoring-profile.v2.${profile}.json`))) continue;
  const data = readJson(`data/v2/scoring-profile.v2.${profile}.json`);
  if (profile === 'candidate-c' && data.method !== 'standardized-distance') errors.push('candidate-c method mismatch');
  if (profile === 'candidate-d' && data.method !== 'standardized-shape-hybrid') errors.push('candidate-d method mismatch');
  if (data.standardization?.source !== 'training uniform set only') errors.push(`${profile} standardization source mismatch`);
}

if (fs.existsSync(abs('data/v2/scoring-profile.v2.candidate-e-adaptive-hybrid.json'))) {
  const data = readJson('data/v2/scoring-profile.v2.candidate-e-adaptive-hybrid.json');
  const params = data.adaptiveAlpha;
  if (data.method !== 'adaptive-standardized-shape-hybrid') errors.push('candidate-e method mismatch');
  if (!params || params.minAlpha < 0.6 || params.maxAlpha > 0.95 || params.minAlpha > params.maxAlpha) {
    errors.push('candidate-e adaptive alpha bounds are invalid');
  }
  if (data.publicRuntime !== false) errors.push('candidate-e must not be public runtime');
}

if (fs.existsSync(abs('reports/data/v2-calibration-candidate-comparison.json'))) {
  const comparison = readJson('reports/data/v2-calibration-candidate-comparison.json');
  const profileIds = comparison.profiles.map((profile) => profile.profile);
  for (const id of ['baseline', 'candidate-a', 'candidate-b', 'candidate-c', 'candidate-d']) {
    if (!profileIds.includes(id)) errors.push(`comparison missing ${id}`);
  }
}

let adaptiveCandidate = null;
if (fs.existsSync(abs('reports/data/v2-adaptive-candidate-comparison.json'))) {
  const comparison = readJson('reports/data/v2-adaptive-candidate-comparison.json');
  adaptiveCandidate = comparison.recommendation?.recommendedCandidate ?? null;
  if (!comparison.profiles.some((profile) => profile.profile === 'candidate-e-adaptive-hybrid')) {
    errors.push('adaptive comparison missing candidate-e-adaptive-hybrid');
  }
}

const summary = {
  generatedAt: new Date().toISOString(),
  ok: errors.length === 0,
  errors,
  checkedFiles: expectedFiles.length,
  publicRuntimeProfile: 'candidate-a',
  adaptiveCandidate,
};

console.log(JSON.stringify(summary, null, 2));
if (errors.length) process.exitCode = 1;

function abs(file) {
  return path.join(root, file);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(abs(file), 'utf8'));
}

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(abs(file))).digest('hex');
}
