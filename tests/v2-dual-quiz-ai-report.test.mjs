import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import { buildResult } from '../js/v2/result-engine.js';
import {
  createQuestionBankForMode,
  getQuickQuestionIds,
  pickAnswersForQuestionIds,
} from '../js/v2/quiz-modes.js';
import { createAiReportRequestPayload } from '../js/v2/ai/ai-report-client.js';
import { createResultHash, validateStrictAiReport } from '../js/v2/ai/ai-report-schema.js';
import { handleAiReportRequest } from '../server/ai-report/handler.js';
import { validateAiReportRequest } from '../server/ai-report/validation.js';

const manifest = readJson('data/v2/manifest.json');
const questionBank = readJson('data/v2/question-bank.v2.json');
const candidateA = readJson('data/v2/persona-target-vectors.v2.candidate-a.json');
const descriptions = readJson('data/v2/persona-descriptions.v2.json');
candidateA.scoringProfile = 'candidate-a';

const allAnswers = Object.fromEntries(
  questionBank.questions.map((question, index) => [
    question.id,
    question.options[index % question.options.length].id,
  ]),
);
const quickQuestionBank = createQuestionBankForMode(questionBank, 'quick');
const quickAnswers = pickAnswersForQuestionIds(allAnswers, getQuickQuestionIds(questionBank));

const quickResult = buildResult({
  manifest,
  questionBank: quickQuestionBank,
  candidateA,
  descriptions,
  answers: quickAnswers,
  assessment: {
    quizMode: 'quick',
    totalQuestionCount: 30,
    elapsedMs: 240000,
  },
});
const fullResult = buildResult({
  manifest,
  questionBank,
  candidateA,
  descriptions,
  answers: allAnswers,
  assessment: {
    quizMode: 'full',
    totalQuestionCount: 60,
    elapsedMs: 540000,
    quickElapsedMs: 240000,
  },
});

const quickPayload = createAiReportRequestPayload(quickResult.facts, { requestId: 'quick-ai-test' });
const fullPayload = createAiReportRequestPayload(fullResult.facts, { requestId: 'full-ai-test' });
assert.equal(quickPayload.facts.assessment.quizMode, 'quick');
assert.equal(quickPayload.facts.assessment.answeredCount, 30);
assert.equal(quickPayload.facts.assessment.answeredQuestionIds.length, 30);
assert.equal(Object.keys(quickPayload.facts.constructScores).length, 15);
assert.equal(Object.keys(quickPayload.facts.assessment.normalizedConstructScores).length, 15);
assert.equal(fullPayload.facts.assessment.quizMode, 'full');
assert.equal(fullPayload.facts.assessment.answeredCount, 60);
assert.equal(fullPayload.facts.assessment.answeredQuestionIds.length, 60);
assert.equal(Object.keys(fullPayload.facts.constructScores).length, 15);
assert.notEqual(createResultHash(quickResult.facts), createResultHash(fullResult.facts));
validateAiReportRequest(quickPayload);
validateAiReportRequest(fullPayload);

const responses = await withHandlerServer(async (port) => ({
  quick: await postJson(port, quickPayload),
  full: await postJson(port, fullPayload),
}));
assert.equal(responses.quick.status, 200);
assert.equal(responses.full.status, 200);
assert.notEqual(responses.quick.body.resultHash, responses.full.body.resultHash);
validateStrictAiReport(responses.quick.body.report, quickResult.facts);
validateStrictAiReport(responses.full.body.report, fullResult.facts);
assert.equal(responses.quick.body.report.source, 'ai');
assert.equal(responses.full.body.report.source, 'ai');

console.log(JSON.stringify({
  pass: true,
  quick: {
    quizMode: quickPayload.facts.assessment.quizMode,
    answeredCount: quickPayload.facts.assessment.answeredCount,
    resultHash: responses.quick.body.resultHash,
  },
  full: {
    quizMode: fullPayload.facts.assessment.quizMode,
    answeredCount: fullPayload.facts.assessment.answeredCount,
    resultHash: responses.full.body.resultHash,
  },
  cacheSeparated: responses.quick.body.resultHash !== responses.full.body.resultHash,
}, null, 2));

async function withHandlerServer(callback) {
  const server = http.createServer((request, response) => handleAiReportRequest(request, response, {
    env: {
      AI_REPORT_PROVIDER: 'mock',
      AI_REPORT_MOCK_MODE: 'success',
      AI_REPORT_SESSION_LIMIT: '100',
      AI_REPORT_CACHE_TTL_MS: '600000',
    },
  }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    return await callback(server.address().port);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function postJson(port, payload) {
  const response = await fetch(`http://127.0.0.1:${port}/api/v2/ai-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return { status: response.status, body: await response.json() };
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
