import { V2_AI_REPORT_CONFIG_PATH, V2_AI_REPORT_DEFAULT_ENDPOINT } from '../config.js';

const EMPTY_CONFIG = Object.freeze({
  endpoint: V2_AI_REPORT_DEFAULT_ENDPOINT,
});

export async function loadAiReportConfig(fetchImpl = globalThis.fetch?.bind(globalThis)) {
  const inlineConfig = globalThis.window?.HEART_ISLAND_V2_AI_REPORT_CONFIG;
  if (inlineConfig && typeof inlineConfig === 'object') return normalizeAiReportConfig(inlineConfig);
  if (!fetchImpl) return EMPTY_CONFIG;

  try {
    const response = await fetchImpl(V2_AI_REPORT_CONFIG_PATH, { cache: 'no-store' });
    if (!response.ok) return EMPTY_CONFIG;
    const config = await response.json();
    return normalizeAiReportConfig(config);
  } catch {
    return EMPTY_CONFIG;
  }
}

export function normalizeAiReportConfig(config, currentLocation = globalThis.location?.href ?? 'http://127.0.0.1/') {
  const endpoint = sanitizeAiReportEndpoint(config?.endpoint, { currentLocation }) ?? V2_AI_REPORT_DEFAULT_ENDPOINT;
  return { endpoint };
}

export function sanitizeAiReportEndpoint(rawUrl, { currentLocation = globalThis.location?.href ?? 'http://127.0.0.1/' } = {}) {
  if (typeof rawUrl !== 'string' || rawUrl.trim() === '') return null;
  const value = rawUrl.trim();

  let url;
  try {
    url = new URL(value, currentLocation);
  } catch {
    return null;
  }

  if (isRelativePath(value)) {
    if (url.username || url.password) return null;
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    if (!value.startsWith('/')) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  }

  if (url.username || url.password) return null;
  if (url.protocol !== 'https:') return null;
  return url.toString();
}

function isRelativePath(value) {
  return value.startsWith('/') && !value.startsWith('//');
}
