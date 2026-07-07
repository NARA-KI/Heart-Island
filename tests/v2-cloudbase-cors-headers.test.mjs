import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { buildResult } from '../js/v2/result-engine.js';
import { createResultHash, validateStrictAiReport } from '../js/v2/ai/ai-report-schema.js';
import { createServer } from '../server/cloudbase-ai-report/index.js';
import { loadStoredPilotAnswers } from './v2-baseline-samples.mjs';

const root = process.cwd();
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
  assert.equal(headerCount(options.rawHeaders, 'Access-Control-Allow-Origin'), 1, 'OPTIONS should emit one Access-Control-Allow-Origin header');
  assert.equal(headerValue(options.rawHeaders, 'Access-Control-Allow-Origin'), allowedOrigin);
  assert.equal(varyTokenCount(options.rawHeaders, 'Origin'), 1, 'OPTIONS Vary should contain Origin once');

  const post = await rawRequest({
    baseUrl,
    method: 'POST',
    path: '/api/v2/ai-report',
    headers: {
      Origin: allowedOrigin,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requestId: `cloudbase-cors-test-${Date.now()}`,
      resultHash: sample.resultHash,
      facts: sample.facts,
    }),
  });
  assert.equal(post.statusCode, 200);
  assert.equal(headerCount(post.rawHeaders, 'Access-Control-Allow-Origin'), 1, 'POST should emit one Access-Control-Allow-Origin header');
  assert.equal(headerValue(post.rawHeaders, 'Access-Control-Allow-Origin'), allowedOrigin);
  assert.equal(varyTokenCount(post.rawHeaders, 'Origin'), 1, 'POST Vary should contain Origin once');
  assert.equal(headerCount(post.rawHeaders, 'Content-Type'), 1, 'POST should emit one Content-Type header');
  const body = JSON.parse(post.body);
  assert.equal(body.report.source, 'ai');
  validateStrictAiReport(body.report, sample.facts);
  assert.equal(countSecrets(`${post.rawHeaders.join('\n')}\n${post.body}`), 0, 'response should not leak API keys');

  const rejected = await rawRequest({
    baseUrl,
    method: 'OPTIONS',
    path: '/api/v2/ai-report',
    headers: { Origin: illegalOrigin },
  });
  assert.equal(rejected.statusCode, 403);
  assert.equal(headerCount(rejected.rawHeaders, 'Access-Control-Allow-Origin'), 0, 'rejected origin should not receive Access-Control-Allow-Origin');

  console.log(JSON.stringify({
    pass: true,
    optionsAccessControlAllowOriginCount: headerCount(options.rawHeaders, 'Access-Control-Allow-Origin'),
    postAccessControlAllowOriginCount: headerCount(post.rawHeaders, 'Access-Control-Allow-Origin'),
    postContentTypeCount: headerCount(post.rawHeaders, 'Content-Type'),
    optionsVaryOriginCount: varyTokenCount(options.rawHeaders, 'Origin'),
    postVaryOriginCount: varyTokenCount(post.rawHeaders, 'Origin'),
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

function varyTokenCount(rawHeaders, token) {
  const value = headerValue(rawHeaders, 'Vary') ?? '';
  return value.split(',').filter((item) => item.trim().toLowerCase() === token.toLowerCase()).length;
}

function countSecrets(text) {
  return (text.match(/AI_REPORT_API_KEY|sk-[A-Za-z0-9_-]{12,}|Bearer\s+[A-Za-z0-9._-]{12,}/g) || []).length;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}
