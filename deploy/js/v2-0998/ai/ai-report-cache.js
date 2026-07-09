import { V2_STORAGE_KEY } from '../config.js';
import { AI_REPORT_PROMPT_VERSION, createResultHash, validateStrictAiReport } from './ai-report-schema.js';

const CACHE_KEY = `${V2_STORAGE_KEY}:ai-report-cache:v1`;
const MAX_ENTRIES = 8;

export function readAiReportCache(facts) {
  const resultHash = createResultHash(facts);
  const cache = readCache();
  const entry = cache[resultHash];
  if (!entry) return null;
  try {
    if (entry.promptVersion !== AI_REPORT_PROMPT_VERSION) return null;
    validateStrictAiReport(entry.report, facts);
    return entry;
  } catch {
    delete cache[resultHash];
    writeCache(cache);
    return null;
  }
}

export function writeAiReportCache({ facts, report, generatedAt = new Date().toISOString() }) {
  const resultHash = createResultHash(facts);
  validateStrictAiReport(report, facts);
  const cache = readCache();
  cache[resultHash] = {
    resultHash,
    report,
    provider: 'ai',
    promptVersion: AI_REPORT_PROMPT_VERSION,
    generatedAt,
  };
  const entries = Object.entries(cache)
    .sort((a, b) => String(b[1].generatedAt).localeCompare(String(a[1].generatedAt)))
    .slice(0, MAX_ENTRIES);
  writeCache(Object.fromEntries(entries));
  return cache[resultHash];
}

export function clearAiReportCache() {
  localStorage.removeItem(CACHE_KEY);
  sessionStorage.removeItem(`${CACHE_KEY}:session-count`);
}

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeCache(cache) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}
