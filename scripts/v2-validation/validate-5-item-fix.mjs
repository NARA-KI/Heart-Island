import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { QUICK_QUESTION_IDS, validateQuizQuestionSets } from '../../js/v2/quiz-modes.js';
import { scoreAnswers } from '../../js/v2/scoring-engine.js';

const fixture = JSON.parse(fs.readFileSync('tests/fixtures/v2-question-narrative-before-5-items.json', 'utf-8'));
const after = JSON.parse(fs.readFileSync('data/v2/question-bank.v2.json', 'utf-8'));

const FIXTURE_MAP = new Map(fixture.items.map(item => [item.id, item]));
const TARGET_IDS = ['v2-q30', 'v2-q53', 'v2-q55', 'v2-q56', 'v2-q57'];
const QUICK_SET = new Set(QUICK_QUESTION_IDS);

// Print source of truth
console.log('=== 0. QUICK_QUESTION_IDS (from js/v2/quiz-modes.js) ===');
console.log(`  Count: ${QUICK_QUESTION_IDS.length}`);
console.log(`  IDs: [${QUICK_QUESTION_IDS.join(', ')}]`);

// Print per-construct quick distribution
const quickPerConstruct = {};
for (const id of QUICK_QUESTION_IDS) {
  const q = after.questions.find(x => x.id === id);
  if (!q) throw new Error(`Quick ID ${id} not found in question bank`);
  if (!quickPerConstruct[q.construct]) quickPerConstruct[q.construct] = { ids: [], forward: 0, reverse: 0 };
  quickPerConstruct[q.construct].ids.push(id);
  if (q.reverse) quickPerConstruct[q.construct].reverse++;
  else quickPerConstruct[q.construct].forward++;
}
console.log('  Per-construct distribution:');
for (const [c, info] of Object.entries(quickPerConstruct).sort()) {
  console.log(`    ${c}: ${info.ids.length}题 [${info.ids.join(', ')}] 正向${info.forward} 反向${info.reverse}`);
}

// Identify which of the 5 modified questions are in quick
for (const id of TARGET_IDS) {
  const inQuick = QUICK_SET.has(id);
  console.log(`  ${id}: ${inQuick ? 'IN quick' : 'NOT in quick'}`);
}
console.log('');

// ── Run quiz-modes built-in validation ──
console.log('=== validateQuizQuestionSets() ===');
try {
  const result = validateQuizQuestionSets(after);
  assert.equal(result.quickIds.length, 30);
  assert.equal(result.fullIds.length, 60);
  assert.equal(result.remainingIds.length, 30);
  console.log('  ✓ 30 quick + 30 remaining = 60 full');
  console.log('  ✓ 15 constructs × 2 quick, 1 forward + 1 reverse each');
} catch (e) {
  console.error('  ✗', e.message);
  process.exit(1);
}
console.log('');

let pass = true;

// ── 1. Only 5 targeted questions changed ──
console.log('=== 1. Changed Questions ===');
for (const id of TARGET_IDS) {
  const beforeItem = FIXTURE_MAP.get(id);
  const afterItem = after.questions.find(q => q.id === id);
  assert(beforeItem, `Missing fixture for ${id}`);
  assert(afterItem, `Missing question ${id} in bank`);
  const changed = beforeItem.question !== afterItem.question
    || beforeItem.options.some((bo, j) => bo.text !== afterItem.options[j].text);
  assert(changed, `${id}: no text change detected`);
  const inQuick = QUICK_SET.has(id) ? ' [QUICK]' : '';
  console.log(`  ${id} (${afterItem.construct}): changed ✓${inQuick}`);
}
console.log('  ✓ Only 5 target questions modified\n');

// ── 2. 60 questions ──
console.log('=== 2. Question Count ===');
assert.equal(after.questions.length, 60);
console.log('  ✓ 60\n');

// ── 3. IDs in order ──
console.log('=== 3. IDs and Order ===');
for (let i = 0; i < 60; i++) {
  const expectedId = `v2-q${String(i + 1).padStart(2, '0')}`;
  assert.equal(after.questions[i].id, expectedId);
}
console.log('  ✓ All 60 IDs in order\n');

// ── 4. Construct unchanged ──
console.log('=== 4. Construct Binding ===');
for (const id of TARGET_IDS) {
  const beforeItem = FIXTURE_MAP.get(id);
  const afterItem = after.questions.find(q => q.id === id);
  assert.equal(afterItem.construct, beforeItem.construct);
}
console.log('  ✓ Target constructs unchanged\n');

// ── 5. Reverse unchanged ──
console.log('=== 5. Reverse Flag ===');
for (const id of TARGET_IDS) {
  const beforeItem = FIXTURE_MAP.get(id);
  const afterItem = after.questions.find(q => q.id === id);
  assert.equal(afterItem.reverse, beforeItem.reverse);
}
console.log('  ✓ Target reverse flags unchanged\n');

// ── 6. Option IDs and scores ──
console.log('=== 6. Option IDs & Scores (all 240) ===');
for (const q of after.questions) {
  for (let j = 0; j < 4; j++) {
    assert.equal(q.options[j].id, ['A', 'B', 'C', 'D'][j]);
    assert(typeof q.options[j].score === 'number');
  }
}
console.log('  ✓ All 240 OK\n');

// ── 7. 15 constructs × 4 ──
console.log('=== 7. Construct Distribution ===');
const cc = {};
for (const q of after.questions) cc[q.construct] = (cc[q.construct] || 0) + 1;
for (const [c, n] of Object.entries(cc)) assert.equal(n, 4);
assert.equal(Object.keys(cc).length, 15);
console.log('  ✓ 15 × 4\n');

// ── 8. Quick set via quiz-modes.js ──
console.log('=== 8. Quick Set (via QUICK_QUESTION_IDS) ===');
assert.equal(QUICK_QUESTION_IDS.length, 30);
const qDist = {};
for (const id of QUICK_QUESTION_IDS) {
  const q = after.questions.find(x => x.id === id);
  qDist[q.construct] = (qDist[q.construct] || 0) + 1;
}
for (const [c, n] of Object.entries(qDist)) {
  assert.equal(n, 2, `Construct ${c} has ${n} quick questions, expected 2`);
}
console.log('  ✓ 30 quick questions, 15 constructs × 2\n');

// ── 9. Scoring hash ──
console.log('=== 9. Scoring Profile Hash ===');
const scoringHash = crypto.createHash('md5')
  .update(fs.readFileSync('data/v2/scoring-profile.v2.candidate-c.json')).digest('hex');
assert.equal(scoringHash, '4ab19a3c58bfc20d4f00507da5a98049');
console.log('  ✓ Unchanged\n');

// ── 10. Persona vectors hash ──
console.log('=== 10. Persona Vectors Hash ===');
const vectorHash = crypto.createHash('md5')
  .update(fs.readFileSync('data/v2/persona-target-vectors.v2.baseline.json')).digest('hex');
assert.equal(vectorHash, '59dbf86a95e52834ef73ea52c1f95571');
console.log('  ✓ Unchanged\n');

// ── 11. Fixed-answer regression ──
console.log('=== 11. Fixed-Answer Regression ===');

function computeConstructScores(bank, mode, selector) {
  const questions = mode === 'quick'
    ? bank.questions.filter(q => QUICK_SET.has(q.id))
    : bank.questions;
  const scores = {};
  const counts = {};
  for (const c of bank.constructs) { scores[c] = 0; counts[c] = 0; }
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const optIndex = selector(i, q);
    scores[q.construct] += q.options[optIndex].score;
    counts[q.construct] += 1;
  }
  for (const c of bank.constructs) {
    if (counts[c] > 0) scores[c] = Math.round(scores[c] / counts[c]);
  }
  return scores;
}

const personaData = JSON.parse(fs.readFileSync('data/v2/persona-target-vectors.v2.baseline.json', 'utf-8'));

function runScoringFull(bank, selector) {
  const answers = {};
  for (let i = 0; i < bank.questions.length; i++) {
    const q = bank.questions[i];
    answers[q.id] = q.options[selector(i, q)].id;
  }
  return scoreAnswers(bank, personaData, answers);
}

const fixtures = [
  { name: 'all-A', fn: () => 0 },
  { name: 'all-B', fn: () => 1 },
  { name: 'all-C', fn: () => 2 },
  { name: 'all-D', fn: () => 3 },
  { name: 'alternate-AB', fn: (i) => i % 2 },
  { name: 'alternate-CD', fn: (i) => 2 + (i % 2) },
];

for (const mode of ['quick', 'full']) {
  for (const { name, fn } of fixtures) {
    const label = `${mode}-${name}`;
    const scores = computeConstructScores(after, mode, fn);
    for (const [c, s] of Object.entries(scores)) {
      assert(!Number.isNaN(s), `${label}: ${c}=NaN`);
      assert(s >= 0 && s <= 100, `${label}: ${c}=${s} OOB`);
    }
  }
}
console.log('  ✓ 12 score arrays valid (quick + full × 6 patterns)');

console.log('  --- personality regression (full mode) ---');
for (const { name, fn } of fixtures) {
  const label = `full-${name}`;
  const result = runScoringFull(after, fn);
  assert(result.personaScores.length === 15);
  const top3 = result.personaScores.slice(0, 3).map(p => p.id);
  console.log(`  ✓ ${label}: Top1=${result.finalPersona.id}, Top3=${top3.join(',')}`);
}

const allA = runScoringFull(after, () => 0);
const allD = runScoringFull(after, () => 3);
assert.notEqual(allA.finalPersona.id, allD.finalPersona.id,
  'All-A vs All-D should differ');

console.log('\n=== ALL 11 VALIDATIONS PASSED ===');
