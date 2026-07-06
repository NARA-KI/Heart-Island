import { readAiReportCache, writeAiReportCache } from './ai-report-cache.js';
import { AI_REPORT_PROMPT_VERSION, createResultHash, validateStrictAiReport } from './ai-report-schema.js';

const inflight = new Map();
const SESSION_LIMIT = 3;
const SESSION_COUNT_KEY = 'heart-island-v2-ai-report-session-count';

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
  if (count >= SESSION_LIMIT) throw new Error('AI report session limit reached');
  sessionStorage.setItem(SESSION_COUNT_KEY, String(count + 1));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 12000);
  if (options.signal) {
    if (options.signal.aborted) controller.abort();
    options.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const response = await fetch(options.endpoint ?? '/api/v2/ai-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: createRequestId(),
        resultHash,
        facts,
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`AI report request failed: ${response.status}`);
    const payload = await response.json();
    if (payload.resultHash !== resultHash) throw new Error('AI report hash mismatch');
    if (payload.promptVersion !== AI_REPORT_PROMPT_VERSION) throw new Error('AI report prompt version mismatch');
    validateStrictAiReport(payload.report, facts);
    const entry = writeAiReportCache({
      facts,
      report: payload.report,
      generatedAt: payload.generatedAt,
    });
    return { ...entry, fromCache: false };
  } finally {
    clearTimeout(timeout);
  }
}

function createRequestId() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
