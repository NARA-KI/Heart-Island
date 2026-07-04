import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { validateV2Data } from '../../js/v2/scoring-engine.js';

const root = process.cwd();

const expectedFiles = [
  'data/v2/persona-target-vectors.v2.candidate-b.json',
  'data/v2/persona-target-vectors.v2.candidate-c.json',
  'data/v2/persona-target-vectors.v2.candidate-d.json',
  'data/v2/scoring-profile.v2.candidate-c.json',
  'data/v2/scoring-profile.v2.candidate-d.json',
  'reports/data/v2-calibration-training-set-summary.json',
  'reports/data/v2-calibration-validation-set-summary.json',
  'reports/data/v2-calibration-candidate-comparison.json',
  'reports/data/v2-calibration-semantic-drift.json',
  'reports/data/v2-calibration-response-style.json',
  'reports/data/v2-calibration-robustness.json',
  'reports/data/v2-calibration-search-log.json',
  'reports/heart-island-v2-alpha-calibration-candidates.md',
];

const questionBank = readJson('data/v2/question-bank.v2.json');
const candidateA = readJson('data/v2/persona-target-vectors.v2.candidate-a.json');
const searchLog = readJson('reports/data/v2-calibration-search-log.json');
const errors = [];

for (const file of expectedFiles) {
  if (!fs.existsSync(abs(file))) errors.push(`missing expected file: ${file}`);
}

for (const file of [
  'data/v2/persona-target-vectors.v2.candidate-b.json',
  'data/v2/persona-target-vectors.v2.candidate-c.json',
  'data/v2/persona-target-vectors.v2.candidate-d.json',
]) {
  if (!fs.existsSync(abs(file))) continue;
  const result = validateV2Data({ questionBank, personaData: readJson(file) });
  if (!result.ok) errors.push(`${file} failed validation: ${result.errors.join('; ')}`);
}

const currentConfig = fs.readFileSync(abs('js/v2/config.js'), 'utf8');
if (!currentConfig.includes("export const V2_SCORING_PROFILE = 'candidate-a';")) {
  errors.push('public V2_SCORING_PROFILE is no longer candidate-a');
}

const resultRenderer = fs.readFileSync(abs('js/v2/renderers/result.js'), 'utf8');
if (/匹配强度|准确率|概率|\/ 100/.test(resultRenderer)) {
  errors.push('public result renderer appears to contain percent/probability wording');
}

if (searchLog.sourceHashes.baseline !== sha256File('data/v2/persona-target-vectors.v2.baseline.json')) {
  errors.push('baseline hash differs from calibration source hash');
}
if (searchLog.sourceHashes.candidateA !== sha256File('data/v2/persona-target-vectors.v2.candidate-a.json')) {
  errors.push('candidate-A hash differs from calibration source hash');
}

for (const profile of ['candidate-c', 'candidate-d']) {
  const data = readJson(`data/v2/scoring-profile.v2.${profile}.json`);
  if (profile === 'candidate-c' && data.method !== 'standardized-distance') errors.push('candidate-c method mismatch');
  if (profile === 'candidate-d' && data.method !== 'standardized-shape-hybrid') errors.push('candidate-d method mismatch');
  if (data.standardization?.source !== 'training uniform set only') errors.push(`${profile} standardization source mismatch`);
}

const comparison = readJson('reports/data/v2-calibration-candidate-comparison.json');
const profileIds = comparison.profiles.map((profile) => profile.profile);
for (const id of ['baseline', 'candidate-a', 'candidate-b', 'candidate-c', 'candidate-d']) {
  if (!profileIds.includes(id)) errors.push(`comparison missing ${id}`);
}

const summary = {
  generatedAt: new Date().toISOString(),
  ok: errors.length === 0,
  errors,
  checkedFiles: expectedFiles.length,
  publicRuntimeProfile: 'candidate-a',
  recommendedCandidate: comparison.recommendation?.recommendedCandidate,
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
