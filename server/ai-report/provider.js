import { buildAiReportMessages } from './prompt.js';

export class ProviderError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ProviderError';
    this.status = options.status ?? 502;
    this.retryable = options.retryable === true;
    this.code = options.code || 'provider_error';
    this.finishReason = options.finishReason;
  }
}

export async function generateWithProvider({ facts, deterministicReport, env = process.env, signal }) {
  const provider = env.AI_REPORT_PROVIDER || 'deepseek';
  if (provider === 'mock') return mockProvider({ facts, deterministicReport, env, signal });
  if (provider !== 'deepseek') throw new ProviderError('Unsupported AI report provider', { status: 503 });
  if (!truthy(env.AI_REPORT_ENABLED)) throw new ProviderError('AI report disabled', { status: 503 });
  return deepseekProvider({ facts, deterministicReport, env, signal });
}

async function deepseekProvider({ facts, deterministicReport, env, signal }) {
  env.__AI_REPORT_PROVIDER_CALLS = Number(env.__AI_REPORT_PROVIDER_CALLS || 0) + 1;
  const apiKey = env.AI_REPORT_API_KEY;
  const baseUrl = env.AI_REPORT_BASE_URL;
  const model = env.AI_REPORT_MODEL;
  if (!apiKey || !baseUrl || !model) throw new ProviderError('AI report provider is not configured', { status: 503 });

  const timeoutMs = Number(env.AI_REPORT_TIMEOUT_MS || 12000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildDeepseekRequestBody({ model, facts, deterministicReport, env })),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new ProviderError('AI provider request failed', {
        status: 502,
        retryable: response.status === 429 || response.status >= 500,
      });
    }
    const payload = await response.json();
    const choice = payload?.choices?.[0];
    const finishReason = choice?.finish_reason;
    if (finishReason !== 'stop') {
      throw new ProviderError('AI provider did not finish cleanly', {
        status: 502,
        code: 'provider_finish_reason',
        finishReason: normalizeFinishReason(finishReason),
      });
    }
    const content = choice?.message?.content;
    if (!content) throw new ProviderError('AI provider returned empty content', { status: 502 });
    return {
      report: JSON.parse(content),
      meta: {
        finishReason,
        usage: sanitizeUsage(payload?.usage),
      },
    };
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if (error?.name === 'AbortError') throw new ProviderError('AI provider timeout', { status: 504, retryable: true });
    if (error instanceof SyntaxError) throw new ProviderError('AI provider returned invalid JSON', { status: 502 });
    throw new ProviderError('AI provider network error', { status: 502, retryable: true });
  } finally {
    clearTimeout(timeout);
  }
}

export function buildDeepseekRequestBody({ model, facts, deterministicReport, env = process.env }) {
  const body = {
    model,
    messages: buildAiReportMessages({ facts, deterministicReport }),
    stream: false,
    temperature: Number(env.AI_REPORT_TEMPERATURE || 0.3),
    max_tokens: Number(env.AI_REPORT_MAX_TOKENS || 1200),
    response_format: { type: 'json_object' },
  };
  const thinkingType = env.AI_REPORT_THINKING_TYPE || 'disabled';
  if (thinkingType !== 'omit') {
    body.thinking = { type: thinkingType };
  }
  return body;
}

async function mockProvider({ facts, deterministicReport, env, signal }) {
  env.__AI_REPORT_MOCK_CALLS = Number(env.__AI_REPORT_MOCK_CALLS || 0) + 1;
  const mode = env.AI_REPORT_MOCK_MODE || 'success';
  if (env.AI_REPORT_MOCK_DELAY_MS) await sleep(Number(env.AI_REPORT_MOCK_DELAY_MS), signal);
  if (mode === 'timeout') {
    await sleep(Number(env.AI_REPORT_TIMEOUT_MS || 12000) + 200, signal);
    throw new ProviderError('Mock timeout', { status: 504, retryable: true });
  }
  if (mode === 'invalid-json') return { report: '__INVALID_JSON__', meta: { finishReason: 'stop' } };
  if (mode === '429') throw new ProviderError('Mock rate limit', { status: 429, retryable: true });
  if (mode === '500') throw new ProviderError('Mock server error', { status: 502, retryable: true });
  if (mode.startsWith('finish-')) {
    const finishReason = mode.slice('finish-'.length) || undefined;
    throw new ProviderError('Mock finish reason failure', {
      status: 502,
      code: 'provider_finish_reason',
      finishReason: normalizeFinishReason(finishReason),
    });
  }

  const report = {
    ...deterministicReport,
    source: 'ai',
    oneLine: `${facts.persona.displayName}的本次结果重点落在${facts.topConstructs.slice(0, 3).map((item) => item.label).join('、')}，不是固定标签，而是这次作答呈现出的关系节奏。`,
    keyTraits: facts.topConstructs.slice(0, 3).map((item) => `${item.label}在本次结果中较突出，说明这部分需求更容易影响你靠近、表达或退后的方式。`),
    neededRelationship: `你更适合一种能接住${facts.topConstructs[0].label}，也允许${facts.bottomConstructs[0].label}不必被勉强表演的关系。`,
    innerConflict: facts.conflicts[0]
      ? `${facts.conflicts[0].summary}${facts.conflicts[0].detail}`
      : `这次结果里没有特别尖锐的高低维度拉扯，主要差异来自${facts.topConstructs[0].label}和${facts.bottomConstructs[0].label}的侧重不同。`,
    misunderstoodByOthers: `别人可能只看见你的${facts.bottomConstructs[0].label}相对不强，却忽略你其实更重视${facts.topConstructs[0].label}背后的真实需要。`,
    strengths: facts.strengths.slice(0, 3),
    repeatPatterns: facts.riskPatterns.slice(0, 2),
    advice: deterministicReport.advice.map((item) => ({
      title: item.title,
      text: item.text,
    })),
    evidence: {
      personaId: facts.persona.id,
      constructCodes: facts.topConstructs.slice(0, 3).map((item) => item.code),
      conflictIds: facts.conflicts.slice(0, 2).map((item) => item.id),
    },
  };
  if (mode === 'invalid-schema') {
    report.advice = report.advice.slice(0, 2);
  }
  return {
    report,
    meta: {
      finishReason: 'stop',
      usage: {
        promptTokens: null,
        completionTokens: null,
        totalTokens: null,
      },
    },
  };
}

function truthy(value) {
  return value === true || value === 'true' || value === '1';
}

function normalizeFinishReason(value) {
  return typeof value === 'string' && value ? value : 'missing';
}

function sanitizeUsage(usage) {
  return {
    promptTokens: numberOrNull(usage?.prompt_tokens),
    completionTokens: numberOrNull(usage?.completion_tokens),
    totalTokens: numberOrNull(usage?.total_tokens),
  };
}

function numberOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(id);
      reject(new ProviderError('Mock timeout aborted', { status: 504, retryable: true }));
    }, { once: true });
  });
}
