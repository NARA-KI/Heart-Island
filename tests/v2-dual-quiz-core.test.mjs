import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  QUICK_QUESTION_IDS,
  createQuestionBankForMode,
  getFullQuestionIds,
  getOrderedQuestionIds,
  getQuickQuestionIds,
  getRemainingQuestionIds,
  pickAnswersForQuestionIds,
  validateQuizQuestionSets,
} from '../js/v2/quiz-modes.js';
import {
  createInitialState,
  hydrateState,
  isComplete,
} from '../js/v2/state.js';
import { answerQuestion, goNext } from '../js/v2/question-engine.js';
import { scoreAnswers } from '../js/v2/scoring-engine.js';
import { buildResult } from '../js/v2/result-engine.js';
import {
  currentElapsedMs,
  formatElapsedTime,
  pauseQuizTimer,
  resumeQuizTimer,
} from '../js/v2/quiz-timer.js';

const questionBank = readJson('data/v2/question-bank.v2.json');
const candidateA = readJson('data/v2/persona-target-vectors.v2.candidate-a.json');
const descriptions = readJson('data/v2/persona-descriptions.v2.json');
const manifest = readJson('data/v2/manifest.json');
candidateA.scoringProfile = 'candidate-a';

const sets = validateQuizQuestionSets(questionBank);
assert.equal(questionBank.questions.length, 60);
assert.equal(QUICK_QUESTION_IDS.length, 30);
assert.equal(new Set(QUICK_QUESTION_IDS).size, 30);
assert.deepEqual(sets.quickIds, getQuickQuestionIds(questionBank));
assert.deepEqual(sets.fullIds, getFullQuestionIds(questionBank));
assert.deepEqual(sets.remainingIds, getRemainingQuestionIds(questionBank));
assert.equal(new Set([...sets.quickIds, ...sets.remainingIds]).size, 60);
assert.equal(sets.quickIds.filter((id) => sets.remainingIds.includes(id)).length, 0);

for (const construct of questionBank.constructs) {
  const full = questionBank.questions.filter((question) => question.construct === construct);
  const quick = full.filter((question) => sets.quickIds.includes(question.id));
  assert.equal(full.length, 4, `${construct} full count`);
  assert.equal(quick.length, 2, `${construct} quick count`);
  assert.equal(quick.filter((question) => question.reverse).length, 1, `${construct} quick reverse balance`);
}

const allAnswers = Object.fromEntries(
  questionBank.questions.map((question) => [question.id, question.options[0].id]),
);
const quickBank = createQuestionBankForMode(questionBank, 'quick');
const quickAnswers = pickAnswersForQuestionIds(allAnswers, sets.quickIds);
const quickScoring = scoreAnswers(quickBank, candidateA, quickAnswers);
const fullScoring = scoreAnswers(questionBank, candidateA, allAnswers);
assert.equal(Object.keys(quickScoring.constructScores).length, 15);
assert.equal(Object.keys(fullScoring.constructScores).length, 15);
assert(quickScoring.debug.answerDebug.every((item) => item.rawScore === item.normalizedScore));

const quickResult = buildResult({
  manifest,
  questionBank: quickBank,
  candidateA,
  descriptions,
  answers: quickAnswers,
  assessment: { quizMode: 'quick', totalQuestionCount: 30, elapsedMs: 123000 },
});
assert.equal(quickResult.facts.assessment.quizMode, 'quick');
assert.equal(quickResult.facts.assessment.answeredCount, 30);
assert.equal(quickResult.facts.constructRanking.length, 15);
assert.equal(quickResult.report.advice.length, 3);

const state = createInitialState();
state.quizMode = 'quick';
state.quizPath = 'direct';
state.orderedQuestionIds = getOrderedQuestionIds(questionBank, 'quick');
for (let index = 0; index < state.orderedQuestionIds.length; index += 1) {
  const id = state.orderedQuestionIds[index];
  const question = questionBank.questions.find((item) => item.id === id);
  answerQuestion(questionBank, state, id, question.options[0].id);
  const next = goNext(questionBank, state);
  assert.equal(next, index === 29 ? 'transition' : 'quiz');
}
assert.equal(state.answeredCount, 30);
assert(isComplete(state, questionBank));

state.quickCompleted = true;
state.quickReport = quickResult;
state.quizMode = 'full';
state.quizPath = 'continuation';
state.orderedQuestionIds = getOrderedQuestionIds(questionBank, 'full', { continuation: true });
state.currentQuestionIndex = 0;
assert.equal(state.orderedQuestionIds.length, 30);
assert(state.orderedQuestionIds.every((id) => !state.answersByQuestionId[id]));
assert(sets.quickIds.every((id) => state.answersByQuestionId[id]));
assert.equal(state.quickReport, quickResult);

for (const id of state.orderedQuestionIds) {
  const question = questionBank.questions.find((item) => item.id === id);
  answerQuestion(questionBank, state, id, question.options[0].id);
}
assert.equal(state.answeredCount, 60);
assert(isComplete(state, questionBank));

const fullResult = buildResult({
  manifest,
  questionBank,
  candidateA,
  descriptions,
  answers: state.answersByQuestionId,
  assessment: {
    quizMode: 'full',
    totalQuestionCount: 60,
    elapsedMs: 456000,
    quickElapsedMs: 123000,
  },
});
assert.equal(fullResult.facts.assessment.quizMode, 'full');
assert.equal(fullResult.facts.assessment.answeredCount, 60);
assert.notEqual(fullResult.facts.resultId, quickResult.facts.resultId);

const legacy = hydrateState({
  currentQuestionIndex: 4,
  answers: Object.fromEntries(Object.entries(allAnswers).slice(0, 5)),
  optionOrder: {},
  startedAt: new Date().toISOString(),
}, questionBank);
assert.equal(legacy.quizMode, 'full');
assert.equal(legacy.orderedQuestionIds.length, 60);
assert.equal(legacy.answeredCount, 5);
assert.equal(legacy.view, 'home');
assert.equal(legacy.answers, legacy.answersByQuestionId);

const timerState = { view: 'quiz', elapsedMs: 0, startTimestamp: null };
resumeQuizTimer(timerState, 1_000);
assert.equal(currentElapsedMs(timerState, 61_000), 60_000);
pauseQuizTimer(timerState, 61_000);
assert.equal(timerState.elapsedMs, 60_000);
assert.equal(timerState.startTimestamp, null);
resumeQuizTimer(timerState, 121_000);
assert.equal(currentElapsedMs(timerState, 181_000), 120_000);
assert.equal(formatElapsedTime(120_000), '02:00');
assert.equal(formatElapsedTime(3_661_000), '01:01:01');

console.log(JSON.stringify({
  pass: true,
  fullQuestions: sets.fullIds.length,
  quickQuestions: sets.quickIds.length,
  remainingQuestions: sets.remainingIds.length,
  constructs: questionBank.constructs.length,
  legacyMigration: true,
  timerPauseResume: true,
  quickPersona: quickResult.facts.persona.id,
  fullPersona: fullResult.facts.persona.id,
}, null, 2));

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
