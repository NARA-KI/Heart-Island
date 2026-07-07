import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { buildResult } from '../js/v2/result-engine.js';
import { createResultHash, validateStrictAiReport } from '../js/v2/ai/ai-report-schema.js';
import { createServer, sanitizeCloudBaseResponseHeaders } from '../server/cloudbase-ai-report/index.js';
import { handleAiReportRequest } from '../server/ai-report/handler.js';
import { loadStoredPilotAnswers } from './v2-baseline-samples.mjs';

const root = process.cwd();
const adapterVersion = 'backend-cors-v2';
const allowedOrigin = 'https://v2-xindao-mvp06-d9gf6ion1b76a1327.webapps.tcloudbase.com';
const illegalOrigin = 'https://invalid.example.com';
const sample = buildSample();
const originalEnv = { ...process.env };

Object.assign(process.env, {
  ALLOWED_ORIGIN: allowedOrigin,
  AI_REPORT_PROVIDER: 'mock',
  AI_REPORT_MOCK_MODE: 'success',
  AI_REPORT_SESSION_LIMIT: '100',
  AI_REPORT_CACHE_TTL_MS: '0',
});

const server = createServer();
const baseUrl = await listen(server);
try {
  const options = await rawRequest({
    baseUrl,
    method: 'OPTIONS',
    path: '/api/v2/ai-report',
    headers: {
      Origin: allowedOrigin,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type',
    },
  });
  assert.equal(options.statusCode, 204);
  assertAllowedCors(options.rawHeaders);
  assert.equal(headerValue(options.rawHeaders, 'X-Heart-Island-Adapter-Version'), adapterVersion);

  const post = await validPost({ baseUrl, requestId: 'cloudbase-cors-success' });
  assert.equal(post.statusCode, 200);
  assertAllowedCors(post.rawHeaders, { requireMethods: false, requireHeaders: false });
  assert.equal(headerValue(post.rawHeaders, 'X-Heart-Island-Adapter-Version'), adapterVersion);
  assert.equal(headerCount(post.rawHeaders, 'Content-Type'), 1, 'POST should emit one Content-Type header');
  const body = JSON.parse(post.body);
  assert.equal(body.report.source, 'ai');
  validateStrictAiReport(body.report, sample.facts);
  assert.equal(countSecrets(`${post.rawHeaders.join('\n')}\n${post.body}`), 0, 'response should not leak API keys');

  process.env.__AI_REPORT_MOCK_CALLS = '0';
  const rejected = await rawRequest({
    baseUrl,
    method: 'OPTIONS',
    path: '/api/v2/ai-report',
    headers: { Origin: illegalOrigin },
  });
  assert.equal(rejected.statusCode, 403);
  assertNoAllowOrigin(rejected.rawHeaders);
  assert.equal(Number(process.env.__AI_REPORT_MOCK_CALLS || 0), 0, 'rejected origin should not enter provider');
  assert.equal(headerValue(rejected.rawHeaders, 'X-Heart-Island-Adapter-Version'), adapterVersion);

  const unprocessable = await rawRequest({
    baseUrl,
    method: 'POST',
    path: '/api/v2/ai-report',
    headers: {
      Origin: allowedOrigin,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requestId: 'cloudbase-cors-422' }),
  });
  assert.equal(unprocessable.statusCode, 422);
  assertAllowedCors(unprocessable.rawHeaders, { requireMethods: false, requireHeaders: false });

  process.env.AI_REPORT_SESSION_LIMIT = '0';
  const limited = await validPost({ baseUrl, requestId: 'cloudbase-cors-429' });
  assert.equal(limited.statusCode, 429);
  assertAllowedCors(limited.rawHeaders, { requireMethods: false, requireHeaders: false });
  process.env.AI_REPORT_SESSION_LIMIT = '100';

  process.env.AI_REPORT_MOCK_MODE = '500';
  const providerError = await validPost({ baseUrl, requestId: 'cloudbase-cors-provider-error' });
  assert.equal(providerError.statusCode, 502);
  assertAllowedCors(providerError.rawHeaders, { requireMethods: false, requireHeaders: false });
  process.env.AI_REPORT_MOCK_MODE = 'success';

  const directHandlerOptions = await callHandlerDirectly({
    method: 'OPTIONS',
    headers: { origin: allowedOrigin },
    env: { ALLOWED_ORIGIN: allowedOrigin },
  });
  assert.equal(directHandlerOptions.statusCode, 204);
  assert.equal(directHandlerOptions.headers['access-control-allow-origin'], allowedOrigin, 'generic handler should still own CORS rules');

  const sanitized = sanitizeCloudBaseResponseHeaders(new Map([
    ['vary', { name: 'Vary', value: 'Origin, Accept-Encoding, Origin, Accept-Encoding' }],
    ['access-control-allow-origin', { name: 'Access-Control-Allow-Origin', value: `${allowedOrigin}, ${allowedOrigin}` }],
    ['access-control-allow-methods', { name: 'Access-Control-Allow-Methods', value: 'POST, OPTIONS, POST' }],
  ]));
  assert.equal(sanitized.get('access-control-allow-origin')?.value, allowedOrigin);
  assert.equal(sanitized.get('vary')?.value, 'Origin, Accept-Encoding');
  assert.equal(sanitized.get('access-control-allow-methods')?.value, 'POST, OPTIONS');

  console.log(JSON.stringify({
    pass: true,
    optionsAccessControlAllowOrigin: headerValue(options.rawHeaders, 'Access-Control-Allow-Origin'),
    optionsMethods: headerValue(options.rawHeaders, 'Access-Control-Allow-Methods'),
    optionsHeaders: headerValue(options.rawHeaders, 'Access-Control-Allow-Headers'),
    postContentTypeCount: headerCount(post.rawHeaders, 'Content-Type'),
    optionsVaryOriginCount: varyTokenCount(options.rawHeaders, 'Origin'),
    postVaryOriginCount: varyTokenCount(post.rawHeaders, 'Origin'),
    rejectedAccessControlAllowOrigin: headerValue(rejected.rawHeaders, 'Access-Control-Allow-Origin'),
    errorStatusesCovered: [unprocessable.statusCode, limited.statusCode, providerError.statusCode],
    adapterVersion: headerValue(post.rawHeaders, 'X-Heart-Island-Adapter-Version'),
    source: body.report.source,
    apiKeyLeaks: 0,
  }, null, 2));
} finally {
  await new Promise((resolve) => server.close(resolve));
  process.env = originalEnv;
}

function buildSample() {
  const questionBank = readJson('data/v2/question-bank.v2.json');
  const candidateA = readJson('data/v2/persona-target-vectors.v2.candidate-a.json');
  const descriptions = readJson('data/v2/persona-descriptions.v2.json');
  const manifest = readJson('data/v2/manifest.json');
  candidateA.scoringProfile = 'candidate-a';
  const result = buildResult({
    manifest,
    questionBank,
    candidateA,
    descriptions,
    answers: loadStoredPilotAnswers(root),
  });
  return {
    facts: result.facts,
    resultHash: createResultHash(result.facts),
  };
}

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`));
  });
}

function validPost({ baseUrl, requestId }) {
  return rawRequest({
    baseUrl,
    method: 'POST',
    path: '/api/v2/ai-report',
    headers: {
      Origin: allowedOrigin,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requestId: `${requestId}-${Date.now()}`,
      resultHash: sample.resultHash,
      facts: sample.facts,
    }),
  });
}

function rawRequest({ baseUrl, method, path: requestPath, headers = {}, body }) {
  const target = new URL(requestPath, baseUrl);
  return new Promise((resolve, reject) => {
    const request = http.request({
      method,
      hostname: target.hostname,
      port: target.port,
      path: `${target.pathname}${target.search}`,
      headers,
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve({
        statusCode: response.statusCode,
        rawHeaders: response.rawHeaders,
        body: Buffer.concat(chunks).toString('utf8'),
      }));
    });
    request.on('error', reject);
    if (body) request.write(body);
    request.end();
  });
}

function assertAllowedCors(rawHeaders, options = {}) {
  const { requireMethods = true, requireHeaders = true } = options;
  assert.equal(headerValue(rawHeaders, 'Access-Control-Allow-Origin'), allowedOrigin);
  assert.equal(varyTokenCount(rawHeaders, 'Origin'), 1, 'Vary should contain Origin once');
  assert.equal(varyHasDuplicates(rawHeaders), false, 'Vary should be deduplicated');
  assert.notEqual(headerValue(rawHeaders, 'Access-Control-Allow-Origin'), '*', 'ACAO wildcard is not allowed');
  if (requireMethods) {
    const methods = commaTokens(headerValue(rawHeaders, 'Access-Control-Allow-Methods'));
    assert.equal(methods.includes('post'), true);
    assert.equal(methods.includes('options'), true);
  }
  if (requireHeaders) {
    const allowedHeaders = commaTokens(headerValue(rawHeaders, 'Access-Control-Allow-Headers'));
    assert.equal(allowedHeaders.includes('content-type'), true);
  }
}

function assertNoAllowOrigin(rawHeaders) {
  assert.equal(headerValue(rawHeaders, 'Access-Control-Allow-Origin'), null);
}

function headerCount(rawHeaders, name) {
  let count = 0;
  for (let index = 0; index < rawHeaders.length; index += 2) {
    if (rawHeaders[index].toLowerCase() === name.toLowerCase()) count += 1;
  }
  return count;
}

function headerValue(rawHeaders, name) {
  for (let index = 0; index < rawHeaders.length; index += 2) {
    if (rawHeaders[index].toLowerCase() === name.toLowerCase()) return rawHeaders[index + 1];
  }
  return null;
}

function commaTokens(value) {
  return String(value ?? '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
}

function varyTokenCount(rawHeaders, token) {
  return commaTokens(headerValue(rawHeaders, 'Vary')).filter((item) => item === token.toLowerCase()).length;
}

function varyHasDuplicates(rawHeaders) {
  const tokens = commaTokens(headerValue(rawHeaders, 'Vary'));
  return new Set(tokens).size !== tokens.length;
}

function countSecrets(text) {
  return (text.match(/AI_REPORT_API_KEY|sk-[A-Za-z0-9_-]{12,}|Bearer\s+[A-Za-z0-9._-]{12,}/g) || []).length;
}

async function callHandlerDirectly({ method, headers, env }) {
  const request = createMockRequest({ method, headers });
  const response = createMockResponse();
  await handleAiReportRequest(request, response, { env });
  return response;
}

function createMockRequest({ method, headers }) {
  return {
    method,
    headers,
    socket: { remoteAddress: '127.0.0.1' },
    setEncoding() {},
    on(event, callback) {
      if (event === 'end') queueMicrotask(callback);
      return this;
    },
  };
}

function createMockResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    writeHead(status, headers = {}) {
      this.statusCode = status;
      for (const [name, value] of Object.entries(headers)) this.setHeader(name, value);
    },
    end(chunk = '') {
      this.body += String(chunk);
    },
  };
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}
