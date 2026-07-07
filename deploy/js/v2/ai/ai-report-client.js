import { readAiReportCache, writeAiReportCache } from './ai-report-cache.js';
import { AI_REPORT_PROMPT_VERSION, createResultHash, validateStrictAiReport } from './ai-report-schema.js';
import { V2_AI_REPORT_DEFAULT_ENDPOINT } from '../config.js';

const inflight = new Map();
const SESSION_LIMIT = 3;
const SESSION_COUNT_KEY = 'heart-island-v2-ai-report-session-count';
const DEFAULT_TIMEOUT_MS = 25000;

export class AiReportRequestError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'AiReportRequestError';
    this.code = code;
    this.status = details.status;
    this.cause = details.cause;
  }
}

export async function generateAiResultReport(facts, options = {}) {
  const resultHash = createResultHash(facts);
  const cached = options.force ? null : readAiReportCache(facts);
  if (cached) return { ...cached, fromCache: true };
  if (inflight.has(resultHash)) return inflight.get(resultHash);

  const promise = requestAiReport(facts, resultHash, options)
    .finally(() => inflight.delete(resultHash));
  inflight.set(resultHash, promise);
  return promise;
}

async function requestAiReport(facts, resultHash, options) {
  const count = Number(sessionStorage.getItem(SESSION_COUNT_KEY) || 0);
  if (count >= SESSION_LIMIT) throw new AiReportRequestError('error', 'AI report session limit reached', { status: 429 });
  sessionStorage.setItem(SESSION_COUNT_KEY, String(count + 1));

  const controller = new AbortController();
  let didTimeout = false;
  const timeout = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  if (options.signal) {
    if (options.signal.aborted) controller.abort();
    options.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const payload = createAiReportRequestPayload(facts, { resultHash });
    const response = await fetch(options.endpoint ?? V2_AI_REPORT_DEFAULT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!response.ok) {
      const code = response.status === 504 ? 'timeout' : 'error';
      throw new AiReportRequestError(code, `AI report request failed: ${response.status}`, { status: response.status });
    }
    const responsePayload = await parseJsonResponse(response);
    if (!responsePayload?.report) throw new AiReportRequestError('error', 'AI report response missing report');
    if (responsePayload.resultHash !== resultHash) throw new AiReportRequestError('error', 'AI report hash mismatch');
    if (responsePayload.promptVersion !== AI_REPORT_PROMPT_VERSION) throw new AiReportRequestError('error', 'AI report prompt version mismatch');
    validateStrictAiReport(responsePayload.report, facts);
    const entry = writeAiReportCache({
      facts,
      report: responsePayload.report,
      generatedAt: responsePayload.generatedAt,
    });
    return { ...entry, fromCache: false };
  } catch (error) {
    if (error instanceof AiReportRequestError) throw error;
    if (didTimeout || error?.name === 'AbortError') {
      throw new AiReportRequestError('timeout', 'AI report request timed out', { cause: error });
    }
    throw new AiReportRequestError('error', `AI report request failed: ${error?.message ?? 'unknown error'}`, { cause: error });
  } finally {
    clearTimeout(timeout);
  }
}

export function createAiReportRequestPayload(facts, options = {}) {
  const resultHash = options.resultHash ?? createResultHash(facts);
  return {
    requestId: options.requestId ?? createRequestId(),
    resultHash,
    facts,
  };
}

async function parseJsonResponse(response) {
  try {
    return await response.json();
  } catch (error) {
    throw new AiReportRequestError('error', 'AI report response is not valid JSON', { cause: error });
  }
}

export function createRequestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
