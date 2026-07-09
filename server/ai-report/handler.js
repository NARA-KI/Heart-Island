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
    const payload = JSON.parse(await readBody(request, Number(env.AI_REPORT_BODY_LIMIT_BYTES || DEFAULT_BODY_LIMIT)));
    const validated = validateAiReportRequest(payload);
    const cacheKey = createCacheKey(validated.resultHash);
    const cacheTtlMs = Number(env.AI_REPORT_CACHE_TTL_MS ?? 600000);
    const cached = cacheTtlMs > 0 ? cache.get(cacheKey) : null;
    if (cached && Date.now() - cached.createdAt < cacheTtlMs) {
      validateAiReportResponse(cached.body.report, validated.facts);
      return json(response, 200, { ...cached.body, cacheHit: true });
    }
    if (pending.has(cacheKey)) {
      return json(response, 200, { ...await pending.get(cacheKey), cacheHit: false });
    }
    enforceSessionLimit(request, env);
    const promise = createReport(validated, env);
    pending.set(cacheKey, promise);
    try {
      const body = await promise;
      if (cacheTtlMs > 0) cache.set(cacheKey, { createdAt: Date.now(), body });
      return json(response, 200, { ...body, cacheHit: false });
    } finally {
      pending.delete(cacheKey);
    }
  } catch (error) {
    return json(response, sanitizeStatus(error), {
      error: sanitizeMessage(error),
      errorType: sanitizeErrorType(error),
      finishReason: sanitizeFinishReason(error),
      cacheHit: false,
    });
  }
}

async function createReport({ resultHash, facts }, env) {
  const deterministicReport = buildDeterministicReport(facts);
  const generated = await callProviderWithRetry({ facts, deterministicReport, env });
  const report = generated.report;
  validateAiReportResponse(report, facts);
  return {
    resultHash,
    report,
    provider: 'ai',
    promptVersion: AI_REPORT_PROMPT_VERSION,
    generatedAt: new Date().toISOString(),
    finishReason: generated.meta?.finishReason ?? null,
    usage: generated.meta?.usage ?? {
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
    },
  };
}

async function callProviderWithRetry(input) {
  try {
    const generated = await normalizeProviderResult(await generateWithProvider(input));
    if (generated.report === '__INVALID_JSON__') throw new ProviderError('AI provider returned invalid JSON', { status: 502 });
    return generated;
  } catch (error) {
    if (!(error instanceof ProviderError) || !error.retryable) throw error;
    const retry = await normalizeProviderResult(await generateWithProvider(input));
    if (retry.report === '__INVALID_JSON__') throw new ProviderError('AI provider returned invalid JSON', { status: 502 });
    return retry;
  }
}

function normalizeProviderResult(result) {
  if (result && typeof result === 'object' && Object.hasOwn(result, 'report')) return result;
  return {
    report: result,
    meta: {
      finishReason: null,
      usage: {
        promptTokens: null,
        completionTokens: null,
        totalTokens: null,
      },
    },
  };
}

function applyCors(request, response, env) {
  const origin = request.headers.origin;
  const allowedOrigins = readAllowedOrigins(env);
  if (origin && !allowedOrigins.has(normalizeRequestOrigin(origin))) {
    json(response, 403, { error: 'Origin not allowed' });
    return false;
  }
  if (origin) {
    response.setHeader('Access-Control-Allow-Origin', normalizeRequestOrigin(origin));
    response.setHeader('Vary', 'Origin');
  }
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  return true;
}

export function readAllowedOrigins(env = process.env) {
  const plural = String(env.ALLOWED_ORIGINS || '').trim();
  const values = plural
    ? plural.split(',')
    : [String(env.ALLOWED_ORIGIN || '')];
  return new Set(values.map(normalizeConfiguredOrigin).filter(Boolean));
}

function normalizeRequestOrigin(value) {
  try {
    const url = new URL(String(value));
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return '';
    if (url.pathname !== '/' || url.search || url.hash) return '';
    return url.origin;
  } catch {
    return '';
  }
}

function normalizeConfiguredOrigin(value) {
  const text = String(value || '').trim();
  if (!text || text === '*' || text.toLowerCase() === 'null') return '';
  return normalizeRequestOrigin(text);
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

function sanitizeErrorType(error) {
  if (error instanceof ProviderError) return error.code || 'provider_error';
  return sanitizeStatus(error) >= 500 ? 'server_error' : 'request_error';
}

function sanitizeFinishReason(error) {
  if (error instanceof ProviderError && error.finishReason) return error.finishReason;
  return null;
}

function createCacheKey(resultHash) {
  return `${AI_REPORT_PROMPT_VERSION}:${resultHash}`;
}
