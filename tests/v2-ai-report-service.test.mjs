import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import { buildResult } from '../js/v2/result-engine.js';
import { createResultHash, validateStrictAiReport } from '../js/v2/ai/ai-report-schema.js';
import { V2_AI_REPORT_PROMPT_VERSION, V2_AI_REPORT_PROMPT_VERSION_PREVIOUS } from '../js/v2/config.js';
import { buildDeterministicReport } from '../js/v2/result-report-builder.js';
import { handleAiReportRequest } from '../server/ai-report/handler.js';
import { buildDeepseekRequestBody } from '../server/ai-report/provider.js';
import { validateAiReportRequest } from '../server/ai-report/validation.js';
import { answersForBaselineSource } from './v2-baseline-samples.mjs';

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
const validPayload = { requestId: 'test-request', resultHash, facts };
const otherSample = baselines.samples.find((item) => item.id === 'same-persona-migratory-a');
const otherAnswers = answersForBaselineSource(questionBank, otherSample.source);
const otherResult = buildResult({ manifest, questionBank, candidateA, descriptions, answers: otherAnswers });
const otherFacts = otherResult.facts;
const otherPayload = {
  requestId: 'test-request-other',
  resultHash: createResultHash(otherFacts),
  facts: otherFacts,
};
const thirdSample = baselines.samples.find((item) => item.id === 'balanced-middle');
const thirdAnswers = answersForBaselineSource(questionBank, thirdSample.source);
const thirdResult = buildResult({ manifest, questionBank, candidateA, descriptions, answers: thirdAnswers });
const thirdFacts = thirdResult.facts;
const thirdPayload = {
  requestId: 'test-request-third',
  resultHash: createResultHash(thirdFacts),
  facts: thirdFacts,
};
const invalidOriginPayload = payloadForSample('focused-sc-high');
const invalidHashPayload = payloadForSample('high-au-low-sc');
const expiredCachePayload = payloadForSample('high-cl-high-ri');

assert.equal(V2_AI_REPORT_PROMPT_VERSION_PREVIOUS, 'v2-controlled-ai-report-prompt-1');
assert.equal(V2_AI_REPORT_PROMPT_VERSION, 'v2-controlled-ai-report-prompt-2');
assert.equal(resultHash, createResultHash(facts));

assert.equal(validateAiReportRequest(validPayload).resultHash, resultHash);
assertRejects({ ...validPayload, facts: withoutConstruct(facts, 'SC') }, 'construct score count');
assertRejects({ ...validPayload, facts: { ...facts, persona: { ...facts.persona, id: 'unknown' } } }, 'invalid persona');
assertRejects({ ...validPayload, facts: { ...facts, constructScores: { ...facts.constructScores, SC: 101 } } }, 'invalid construct score');
assertRejects({ ...validPayload, facts: { ...facts, conflicts: [{ id: 'NOPE', evidence: ['SC'] }] } }, 'invalid conflict');
assertRejects({ ...validPayload, answers: { q1: 'A' } }, 'unexpected field');

const aiReport = {
  ...buildDeterministicReport(facts),
  source: 'ai',
};
validateStrictAiReport(aiReport, facts);
assert.throws(() => validateStrictAiReport({ ...aiReport, extra: true }, facts), /extra fields/);
assert.throws(() => validateStrictAiReport({ ...aiReport, oneLine: '<b>bad</b>' }, facts), /HTML/);
assert.throws(() => validateStrictAiReport({ ...aiReport, oneLine: `# ${aiReport.oneLine}` }, facts), /markdown/);
assert.throws(() => validateStrictAiReport({ ...aiReport, source: 'deterministic' }, facts), /source/);
assert.throws(() => validateStrictAiReport({
  ...aiReport,
  evidence: { ...aiReport.evidence, constructCodes: ['NOPE'] },
}, facts), /construct/);
assert.throws(() => validateStrictAiReport({
  ...aiReport,
  evidence: { ...aiReport.evidence, constructCodes: ['SC', 'AU'] },
}, facts), /3 to 6/);
assert.throws(() => validateStrictAiReport({
  ...aiReport,
  evidence: { ...aiReport.evidence, constructCodes: ['SC', 'AU', 'TR', 'CL', 'PA', 'CM', 'SI'] },
}, facts), /3 to 6/);

const providerBody = buildDeepseekRequestBody({
  model: 'deepseek-test',
  facts,
  deterministicReport: buildDeterministicReport(facts),
  env: {},
});
assert.equal(providerBody.stream, false);
assert.deepEqual(providerBody.response_format, { type: 'json_object' });
assert.deepEqual(providerBody.thinking, { type: 'disabled' });
assert.equal(providerBody.temperature, 0.3);
assert.equal(providerBody.max_tokens, 1200);
assert.equal(providerBody.model, 'deepseek-test');

const success = await postToHandler(validPayload, { AI_REPORT_PROVIDER: 'mock', AI_REPORT_MOCK_MODE: 'success' });
assert.equal(success.status, 200);
assert.equal(success.body.resultHash, resultHash);
assert.equal(success.body.cacheHit, false);
assert.equal(success.body.finishReason, 'stop');
validateStrictAiReport(success.body.report, facts);

const cached = await postTwiceToHandler(validPayload, { AI_REPORT_PROVIDER: 'mock', AI_REPORT_MOCK_MODE: 'success' });
assert.equal(cached.first.status, 200);
assert.equal(cached.second.status, 200);
assert.equal(cached.first.body.cacheHit, false);
assert.equal(cached.second.body.cacheHit, true);

const quotaCache = await exerciseQuotaCacheOrder(otherPayload, thirdPayload);
assert.equal(quotaCache.first.status, 200);
assert.equal(quotaCache.cachedAfterLimit.status, 200);
assert.equal(quotaCache.cachedAfterLimit.body.cacheHit, true);
assert.equal(quotaCache.uncachedAfterLimit.status, 429);
assert.equal(quotaCache.mockCallsAfterCachedRead, 1);
assert.equal(quotaCache.mockCallsAfterUncachedLimit, 1);

const invalidOriginCache = await exerciseInvalidOriginCannotReadCache(invalidOriginPayload);
assert.equal(invalidOriginCache.first.status, 200);
assert.equal(invalidOriginCache.invalidOrigin.status, 403);
assert.equal(invalidOriginCache.mockCalls, 1);

const invalidHashCache = await exerciseInvalidHashCannotReadCache(invalidHashPayload);
assert.equal(invalidHashCache.first.status, 200);
assert.equal(invalidHashCache.invalidHash.status, 422);
assert.equal(invalidHashCache.mockCalls, 1);

const expiredCacheLimit = await exerciseExpiredCacheCannotBypassLimit(expiredCachePayload);
assert.equal(expiredCacheLimit.first.status, 200);
assert.equal(expiredCacheLimit.expiredRead.status, 429);
assert.equal(expiredCacheLimit.mockCalls, 1);

const invalidJson = await postToHandler(validPayload, { AI_REPORT_PROVIDER: 'mock', AI_REPORT_MOCK_MODE: 'invalid-json' });
assert.equal(invalidJson.status, 502);

const invalidSchema = await postToHandler(validPayload, { AI_REPORT_PROVIDER: 'mock', AI_REPORT_MOCK_MODE: 'invalid-schema' });
assert.equal(invalidSchema.status, 500);

const rateLimit = await postToHandler(validPayload, { AI_REPORT_PROVIDER: 'mock', AI_REPORT_MOCK_MODE: '429' });
assert.equal(rateLimit.status, 429);

const serverError = await postToHandler(validPayload, { AI_REPORT_PROVIDER: 'mock', AI_REPORT_MOCK_MODE: '500' });
assert.equal(serverError.status, 502);

const timeout = await postToHandler(validPayload, {
  AI_REPORT_PROVIDER: 'mock',
  AI_REPORT_MOCK_MODE: 'timeout',
  AI_REPORT_TIMEOUT_MS: '1',
});
assert.equal(timeout.status, 504);

for (const finishReason of ['length', 'content_filter', 'insufficient_system_resource', 'tool_calls', 'unknown', 'missing']) {
  const result = await postToHandler(validPayload, {
    AI_REPORT_PROVIDER: 'mock',
    AI_REPORT_MOCK_MODE: `finish-${finishReason}`,
  });
  assert.equal(result.status, 502, `finish_reason ${finishReason} should fail`);
  assert.equal(result.body.errorType, 'provider_finish_reason');
  assert.equal(result.body.finishReason, finishReason);
  assert.equal(result.body.cacheHit, false);
}

const oversized = await postToHandler({ ...validPayload, padding: 'x'.repeat(2000) }, {
  AI_REPORT_PROVIDER: 'mock',
  AI_REPORT_BODY_LIMIT_BYTES: '256',
});
assert.equal(oversized.status, 413);

console.log(JSON.stringify({
  pass: true,
  resultHash,
  providerModes: ['success', 'invalid-json', 'invalid-schema', '429', '500', 'timeout'],
  finishReasonsRejected: ['length', 'content_filter', 'insufficient_system_resource', 'tool_calls', 'unknown', 'missing'],
  cacheBeforeQuota: true,
}, null, 2));

function assertRejects(payload, pattern) {
  assert.throws(() => validateAiReportRequest(payload), new RegExp(pattern));
}

function withoutConstruct(sourceFacts, code) {
  const constructScores = { ...sourceFacts.constructScores };
  delete constructScores[code];
  return { ...sourceFacts, constructScores };
}

async function postToHandler(payload, env = {}) {
  const port = await getPort();
  const server = http.createServer((request, response) => handleAiReportRequest(request, response, {
    env: {
      AI_REPORT_PROVIDER: 'mock',
      AI_REPORT_SESSION_LIMIT: '100',
      AI_REPORT_CACHE_TTL_MS: '0',
      ...env,
    },
  }));
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/v2/ai-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    return { status: response.status, body };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function postTwiceToHandler(payload, env = {}) {
  const port = await getPort();
  const server = http.createServer((request, response) => handleAiReportRequest(request, response, {
    env: {
      AI_REPORT_PROVIDER: 'mock',
      AI_REPORT_SESSION_LIMIT: '100',
      AI_REPORT_CACHE_TTL_MS: '600000',
      ...env,
    },
  }));
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  try {
    const first = await postJson(port, payload);
    const second = await postJson(port, payload);
    return { first, second };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function exerciseQuotaCacheOrder(cachedPayload, uncachedPayload) {
  const env = {
    AI_REPORT_PROVIDER: 'mock',
    AI_REPORT_MOCK_MODE: 'success',
    AI_REPORT_SESSION_LIMIT: '1',
    AI_REPORT_CACHE_TTL_MS: '600000',
  };
  return withHandlerServer(env, async (port) => {
    const headers = { 'x-forwarded-for': `quota-cache-${Date.now()}` };
    const first = await postJson(port, cachedPayload, { headers });
    const cachedAfterLimit = await postJson(port, cachedPayload, { headers });
    const mockCallsAfterCachedRead = env.__AI_REPORT_MOCK_CALLS;
    const uncachedAfterLimit = await postJson(port, uncachedPayload, { headers });
    return {
      first,
      cachedAfterLimit,
      uncachedAfterLimit,
      mockCallsAfterCachedRead,
      mockCallsAfterUncachedLimit: env.__AI_REPORT_MOCK_CALLS,
    };
  });
}

async function exerciseInvalidOriginCannotReadCache(payload) {
  const env = {
    AI_REPORT_PROVIDER: 'mock',
    AI_REPORT_MOCK_MODE: 'success',
    AI_REPORT_SESSION_LIMIT: '1',
    AI_REPORT_CACHE_TTL_MS: '600000',
    ALLOWED_ORIGIN: 'http://allowed.example',
  };
  return withHandlerServer(env, async (port) => {
    const headers = {
      Origin: 'http://allowed.example',
      'x-forwarded-for': `origin-cache-${Date.now()}`,
    };
    const first = await postJson(port, payload, { headers });
    const invalidOrigin = await postJson(port, payload, {
      headers: {
        Origin: 'http://blocked.example',
        'x-forwarded-for': headers['x-forwarded-for'],
      },
    });
    return { first, invalidOrigin, mockCalls: env.__AI_REPORT_MOCK_CALLS };
  });
}

async function exerciseInvalidHashCannotReadCache(payload) {
  const env = {
    AI_REPORT_PROVIDER: 'mock',
    AI_REPORT_MOCK_MODE: 'success',
    AI_REPORT_SESSION_LIMIT: '1',
    AI_REPORT_CACHE_TTL_MS: '600000',
  };
  return withHandlerServer(env, async (port) => {
    const headers = { 'x-forwarded-for': `hash-cache-${Date.now()}` };
    const first = await postJson(port, payload, { headers });
    const invalidHash = await postJson(port, { ...payload, resultHash: 'air-invalid' }, { headers });
    return { first, invalidHash, mockCalls: env.__AI_REPORT_MOCK_CALLS };
  });
}

async function exerciseExpiredCacheCannotBypassLimit(payload) {
  const env = {
    AI_REPORT_PROVIDER: 'mock',
    AI_REPORT_MOCK_MODE: 'success',
    AI_REPORT_SESSION_LIMIT: '1',
    AI_REPORT_CACHE_TTL_MS: '600000',
  };
  return withHandlerServer(env, async (port) => {
    const headers = { 'x-forwarded-for': `expired-cache-${Date.now()}` };
    const first = await postJson(port, payload, { headers });
    env.AI_REPORT_CACHE_TTL_MS = '1';
    await new Promise((resolve) => setTimeout(resolve, 5));
    const expiredRead = await postJson(port, payload, { headers });
    return { first, expiredRead, mockCalls: env.__AI_REPORT_MOCK_CALLS };
  });
}

async function withHandlerServer(env, callback) {
  const port = await getPort();
  const server = http.createServer((request, response) => handleAiReportRequest(request, response, { env }));
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  try {
    return await callback(port);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function postJson(port, payload, options = {}) {
  const response = await fetch(`http://127.0.0.1:${port}/api/v2/ai-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    body: JSON.stringify(payload),
  });
  const body = await response.json();
  return { status: response.status, body };
}

function getPort() {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function payloadForSample(id) {
  const source = baselines.samples.find((item) => item.id === id)?.source;
  if (!source) throw new Error(`Missing baseline sample: ${id}`);
  const sampleAnswers = answersForBaselineSource(questionBank, source);
  const sampleResult = buildResult({ manifest, questionBank, candidateA, descriptions, answers: sampleAnswers });
  return {
    requestId: `test-request-${id}`,
    resultHash: createResultHash(sampleResult.facts),
    facts: sampleResult.facts,
  };
}
