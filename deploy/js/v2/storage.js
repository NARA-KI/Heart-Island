import { V2_PRODUCT_VERSION, V2_STORAGE_KEY } from './config.js';

export function createStorageMeta(manifest) {
  return {
    productVersion: V2_PRODUCT_VERSION,
    questionnaireVersion: manifest.questionnaireVersion,
    questionBankHash: manifest.questionBankHash,
    scoringProfile: manifest.scoringProfile,
    targetVectorHash: manifest.targetVectorHash,
  };
}

export function loadSavedState(manifest) {
  const raw = localStorage.getItem(V2_STORAGE_KEY);
  if (!raw) return { status: 'empty', state: null };
  try {
    const parsed = JSON.parse(raw);
    const expected = createStorageMeta(manifest);
    const meta = parsed.meta ?? {};
    const compatible = Object.entries(expected).every(([key, value]) => meta[key] === value);
    if (!compatible) {
      return { status: 'stale', state: parsed, expected };
    }
    return { status: 'ok', state: parsed };
  } catch (error) {
    return { status: 'invalid', error };
  }
}

export function saveState(manifest, state) {
  const payload = {
    meta: createStorageMeta(manifest),
    currentQuestionIndex: state.currentQuestionIndex,
    answers: state.answers,
    optionOrder: state.optionOrder,
    startedAt: state.startedAt,
    updatedAt: new Date().toISOString(),
    completedAt: state.completedAt,
    view: state.view,
    pilot: state.pilot,
    feedback: state.feedback,
    result: compactResultForStorage(state.result),
  };
  localStorage.setItem(V2_STORAGE_KEY, JSON.stringify(payload));
}

export function clearSavedState() {
  localStorage.removeItem(V2_STORAGE_KEY);
}

function compactResultForStorage(result) {
  if (!result || result.mode === 'pilot') return null;
  if (!result.facts || !result.report) return null;
  return {
    facts: result.facts,
    deterministicReport: result.deterministicReport ?? result.report,
    report: result.report,
    aiReport: result.aiReport ?? (result.report?.source === 'ai' ? result.report : null),
    aiReportStatus: result.aiReportStatus ?? { state: result.aiReport || result.report?.source === 'ai' ? 'success' : 'idle', message: '' },
  };
}
