import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createAiReportRequestPayload, createRequestId, generateAiResultReport } from '../js/v2/ai/ai-report-client.js';
import { createResultHash } from '../js/v2/ai/ai-report-schema.js';
import { buildResult } from '../js/v2/result-engine.js';
import { buildDeterministicReport } from '../js/v2/result-report-builder.js';
import { answersForBaselineSource } from './v2-baseline-samples.mjs';
import { V2_AI_REPORT_PROMPT_VERSION } from '../js/v2/config.js';

const manifest = readJson('data/v2/manifest.json');
const questionBank = readJson('data/v2/question-bank.v2.json');
const candidateA = readJson('data/v2/persona-target-vectors.v2.candidate-a.json');
const descriptions = readJson('data/v2/persona-descriptions.v2.json');
const baselines = readJson('tests/fixtures/v2-result-baselines.json');
candidateA.scoringProfile = 'candidate-a';

const sample = baselines.samples.find((item) => item.id === 'real-collector');
const answers = answersForBaselineSource(questionBank, sample.source);
const result = buildResult({ manifest, questionBank, candidateA, descriptions, answers });
const facts = result.facts;
const resultHash = createResultHash(facts);
const validReport = { ...buildDeterministicReport(facts), source: 'ai' };

installMemoryStorage();

const requestIdA = createRequestId();
const requestIdB = createRequestId();
assert.notEqual(requestIdA, requestIdB, 'requestId should be unique');

const payload = createAiReportRequestPayload(facts, { requestId: 'client-test-request' });
assert.equal(payload.requestId, 'client-test-request');
assert.equal(payload.resultHash, resultHash);
assert.equal(payload.facts, facts, 'request payload should submit the existing complete facts object');

await withFreshStorage(async () => {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return jsonResponse(200, { resultHash, promptVersion: validReportPromptVersion(), report: validReport });
  };
  const entry = await generateAiResultReport(facts, { endpoint: '/api/v2/ai-report' });
  assert.equal(entry.report.source, 'ai');
  assert.equal(entry.fromCache, false);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].body.resultHash, resultHash);
  assert.equal(calls[0].body.facts.persona.id, facts.persona.id);
  assert.equal(calls[0].init.headers.Authorization, undefined);
  assert.equal(calls[0].init.headers.authorization, undefined);
});

await withFreshStorage(async () => {
  const statuses = [403, 422, 500];
  for (const status of statuses) {
    resetStorage();
    globalThis.fetch = async () => jsonResponse(status, { error: 'mock' });
    await assert.rejects(
      () => generateAiResultReport(facts, { endpoint: '/api/v2/ai-report' }),
      (error) => error.code === 'error' && error.status === status,
      `${status} should enter error`,
    );
  }
});

await withFreshStorage(async () => {
  globalThis.fetch = async (_url, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
  });
  await assert.rejects(
    () => generateAiResultReport(facts, { endpoint: '/api/v2/ai-report', timeoutMs: 1 }),
    (error) => error.code === 'timeout',
    'timeout should enter timeout',
  );
});

await withFreshStorage(async () => {
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('bad json'); } });
  await assert.rejects(() => generateAiResultReport(facts, { endpoint: '/api/v2/ai-report' }), /not valid JSON/);
});

await withFreshStorage(async () => {
  globalThis.fetch = async () => jsonResponse(200, { resultHash, promptVersion: validReportPromptVersion() });
  await assert.rejects(() => generateAiResultReport(facts, { endpoint: '/api/v2/ai-report' }), /missing report/);
});

await withFreshStorage(async () => {
  globalThis.fetch = async () => jsonResponse(200, {
    resultHash,
    promptVersion: validReportPromptVersion(),
    report: { ...validReport, source: 'deterministic' },
  });
  await assert.rejects(() => generateAiResultReport(facts, { endpoint: '/api/v2/ai-report' }), /source/);
});

await withFreshStorage(async () => {
  globalThis.fetch = async () => jsonResponse(200, {
    resultHash,
    promptVersion: validReportPromptVersion(),
    report: { ...validReport, extra: true },
  });
  await assert.rejects(() => generateAiResultReport(facts, { endpoint: '/api/v2/ai-report' }), /extra fields/);
});

await withFreshStorage(async () => {
  let callCount = 0;
  globalThis.fetch = async () => {
    callCount += 1;
    await new Promise((resolve) => setTimeout(resolve, 20));
    return jsonResponse(200, { resultHash, promptVersion: validReportPromptVersion(), report: validReport });
  };
  const [first, second] = await Promise.all([
    generateAiResultReport(facts, { endpoint: '/api/v2/ai-report' }),
    generateAiResultReport(facts, { endpoint: '/api/v2/ai-report' }),
  ]);
  assert.equal(callCount, 1, 'same resultHash should not create duplicate concurrent requests');
  assert.equal(first.report.source, 'ai');
  assert.equal(second.report.source, 'ai');
});

await withFreshStorage(async () => {
  let callCount = 0;
  globalThis.fetch = async () => {
    callCount += 1;
    return jsonResponse(200, { resultHash, promptVersion: validReportPromptVersion(), report: validReport });
  };
  await generateAiResultReport(facts, { endpoint: '/api/v2/ai-report' });
  await generateAiResultReport(facts, { endpoint: '/api/v2/ai-report' });
  await generateAiResultReport(facts, { endpoint: '/api/v2/ai-report', force: true });
  assert.equal(callCount, 2, 'manual force retry should create at most one new request in this flow');
});

console.log(JSON.stringify({
  pass: true,
  resultHash,
  coveredStates: ['success', 'error', 'timeout'],
  duplicateRequestGuard: true,
  authorizationHeaderLeaks: 0,
}, null, 2));

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function validReportPromptVersion() {
  return V2_AI_REPORT_PROMPT_VERSION;
}

function installMemoryStorage() {
  const storage = () => {
    const values = new Map();
    return {
      getItem: (key) => values.has(key) ? values.get(key) : null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key),
      clear: () => values.clear(),
      key: (index) => [...values.keys()][index] ?? null,
      get length() { return values.size; },
    };
  };
  globalThis.localStorage = storage();
  globalThis.sessionStorage = storage();
}

function resetStorage() {
  localStorage.clear();
  sessionStorage.clear();
}

async function withFreshStorage(callback) {
  resetStorage();
  await callback();
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
