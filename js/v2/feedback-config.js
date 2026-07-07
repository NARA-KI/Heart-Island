import {
  V2_AI_REPORT_PROMPT_VERSION,
  V2_FEEDBACK_CLICKED_STORAGE_KEY,
  V2_FEEDBACK_CONFIG_PATH,
} from './config.js';

const EMPTY_CONFIG = Object.freeze({
  enabled: false,
  url: null,
  allowedOrigins: [],
});

export async function loadFeedbackConfig(fetchImpl = globalThis.fetch?.bind(globalThis)) {
  const inlineConfig = globalThis.window?.HEART_ISLAND_V2_FEEDBACK_CONFIG;
  if (inlineConfig && typeof inlineConfig === 'object') return normalizeFeedbackConfig(inlineConfig);
  if (!fetchImpl) return EMPTY_CONFIG;

  try {
    const response = await fetchImpl(V2_FEEDBACK_CONFIG_PATH, { cache: 'no-store' });
    if (!response.ok) return EMPTY_CONFIG;
    const config = await response.json();
    return normalizeFeedbackConfig(config);
  } catch {
    return EMPTY_CONFIG;
  }
}

export function normalizeFeedbackConfig(config, currentLocation = globalThis.location?.href ?? 'http://127.0.0.1/') {
  const allowedOrigins = Array.isArray(config?.allowedOrigins)
    ? config.allowedOrigins.filter((origin) => typeof origin === 'string' && origin.length > 0)
    : [];
  const url = sanitizeFeedbackBaseUrl(config?.feedbackFormUrl, { allowedOrigins, currentLocation });
  if (!url) return { ...EMPTY_CONFIG, allowedOrigins };
  return {
    enabled: true,
    url,
    allowedOrigins,
  };
}

export function sanitizeFeedbackBaseUrl(rawUrl, { allowedOrigins = [], currentLocation = globalThis.location?.href ?? 'http://127.0.0.1/' } = {}) {
  if (typeof rawUrl !== 'string' || rawUrl.trim() === '') return null;
  let url;
  try {
    url = new URL(rawUrl.trim(), currentLocation);
  } catch {
    return null;
  }

  if (url.username || url.password) return null;
  if (!isSafeFeedbackProtocol(url)) return null;
  if (allowedOrigins.length > 0 && !allowedOrigins.includes(url.origin)) return null;
  return url.toString();
}

export function buildFeedbackUrl(baseUrl, { facts, report, viewport } = {}) {
  const safeBaseUrl = sanitizeFeedbackBaseUrl(baseUrl);
  if (!safeBaseUrl || !facts?.persona?.id || !facts?.resultId) return null;

  const url = new URL(safeBaseUrl);
  const params = {
    version: facts.versions?.productVersion,
    persona: facts.persona.id,
    promptVersion: V2_AI_REPORT_PROMPT_VERSION,
    anonymousResultId: facts.resultId,
    aiSource: report?.source ?? 'deterministic',
    viewport,
  };
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && String(value).length > 0) {
      const safeValue = String(value);
      url.searchParams.set(key, safeValue);
      url.searchParams.set(`prefill_${key}`, safeValue);
      url.searchParams.set(`hide_${key}`, '1');
    }
  }
  return url.toString();
}

export function getViewportLabel() {
  if (!globalThis.window) return '';
  return `${globalThis.window.innerWidth}x${globalThis.window.innerHeight}`;
}

export function recordFeedbackClick(storage = globalThis.localStorage) {
  try {
    storage?.setItem(V2_FEEDBACK_CLICKED_STORAGE_KEY, '1');
  } catch {
    // Feedback navigation must not depend on local storage availability.
  }
}

export function hasFeedbackClicked(storage = globalThis.localStorage) {
  try {
    return storage?.getItem(V2_FEEDBACK_CLICKED_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function isSafeFeedbackProtocol(url) {
  if (url.protocol === 'https:') return true;
  if (url.protocol !== 'http:') return false;
  return ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
}
