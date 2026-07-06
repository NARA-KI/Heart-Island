import { AI_REPORT_PROMPT_VERSION } from '../../js/v2/ai/ai-report-schema.js';
import { buildDeterministicReport } from '../../js/v2/result-report-builder.js';
import { generateWithProvider, ProviderError } from './provider.js';
import { httpError, validateAiReportRequest, validateAiReportResponse } from './validation.js';

const DEFAULT_BODY_LIMIT = 64000;
const cache = new Map();
const pending = new Map();
const sessionCounts = new Map();

export async function handleAiReportRequest(request, response, options = {}) {
  const env = options.env ?? process.env;
  if (!applyCors(request, response, env)) return;
  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }
  try {
    if (request.method !== 'POST') throw httpError(405, 'Method not allowed');
    if (!String(request.headers['content-type'] || '').includes('application/json')) {
      throw httpError(415, 'Content-Type must be application/json');
    }
    enforceSessionLimit(request, env);
    const payload = JSON.parse(await readBody(request, Number(env.AI_REPORT_BODY_LIMIT_BYTES || DEFAULT_BODY_LIMIT)));
    const validated = validateAiReportRequest(payload);
    const cached = cache.get(validated.resultHash);
    if (cached && Date.now() - cached.createdAt < Number(env.AI_REPORT_CACHE_TTL_MS || 600000)) {
      return json(response, 200, cached.body);
    }
    if (pending.has(validated.resultHash)) {
      return json(response, 200, await pending.get(validated.resultHash));
    }
    const promise = createReport(validated, env);
    pending.set(validated.resultHash, promise);
    try {
      const body = await promise;
      cache.set(validated.resultHash, { createdAt: Date.now(), body });
      return json(response, 200, body);
    } finally {
      pending.delete(validated.resultHash);
    }
  } catch (error) {
    return json(response, sanitizeStatus(error), { error: sanitizeMessage(error) });
  }
}

async function createReport({ resultHash, facts }, env) {
  const deterministicReport = buildDeterministicReport(facts);
  const report = await callProviderWithRetry({ facts, deterministicReport, env });
  validateAiReportResponse(report, facts);
  return {
    resultHash,
    report,
    provider: 'ai',
    promptVersion: AI_REPORT_PROMPT_VERSION,
    generatedAt: new Date().toISOString(),
  };
}

async function callProviderWithRetry(input) {
  try {
    const report = await generateWithProvider(input);
    if (report === '__INVALID_JSON__') throw new ProviderError('AI provider returned invalid JSON', { status: 502 });
    return report;
  } catch (error) {
    if (!(error instanceof ProviderError) || !error.retryable) throw error;
    const retry = await generateWithProvider(input);
    if (retry === '__INVALID_JSON__') throw new ProviderError('AI provider returned invalid JSON', { status: 502 });
    return retry;
  }
}

function applyCors(request, response, env) {
  const origin = request.headers.origin;
  const allowedOrigin = env.ALLOWED_ORIGIN;
  if (origin && allowedOrigin && origin !== allowedOrigin) {
    json(response, 403, { error: 'Origin not allowed' });
    return false;
  }
  if (origin && (!allowedOrigin || origin === allowedOrigin)) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
  }
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  return true;
}

function enforceSessionLimit(request, env) {
  const limit = Number(env.AI_REPORT_SESSION_LIMIT || 6);
  const key = request.headers['x-forwarded-for'] || request.socket?.remoteAddress || 'local';
  const current = sessionCounts.get(key) ?? 0;
  if (current >= limit) throw httpError(429, 'AI report session limit reached');
  sessionCounts.set(key, current + 1);
}

function readBody(request, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let text = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      size += Buffer.byteLength(chunk);
      if (size > limit) {
        reject(httpError(413, 'Request body too large'));
        return;
      }
      text += chunk;
    });
    request.on('end', () => resolve(text));
    request.on('error', reject);
  });
}

function json(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

function sanitizeStatus(error) {
  const status = Number(error?.status || 500);
  if (status >= 400 && status <= 599) return status;
  return 500;
}

function sanitizeMessage(error) {
  const status = sanitizeStatus(error);
  if (status >= 500) return 'AI report is temporarily unavailable';
  return error?.message || 'Invalid AI report request';
}
