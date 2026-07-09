import { V2_PRODUCT_VERSION, V2_STORAGE_KEY } from './config.js';

export function createStorageMeta(manifest) {
  return {
    storageSchemaVersion: 2,
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
    const compatible = isCompatibleMeta(meta, manifest);
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
    schemaVersion: 2,
    quizMode: state.quizMode,
    quizPath: state.quizPath,
    currentQuestionIndex: state.currentQuestionIndex,
    orderedQuestionIds: state.orderedQuestionIds,
    answersByQuestionId: state.answersByQuestionId,
    optionOrder: state.optionOrder,
    startedAt: state.startedAt,
    startTimestamp: state.startTimestamp,
    elapsedMs: state.elapsedMs,
    quickElapsedMs: state.quickElapsedMs,
    updatedAt: new Date().toISOString(),
    completedAt: state.completedAt,
    completionStatus: state.completionStatus,
    quickCompleted: state.quickCompleted,
    fullCompleted: state.fullCompleted,
    view: state.view,
    pilot: state.pilot,
    feedback: state.feedback,
    quickReport: compactResultForStorage(state.quickReport),
    fullReport: compactResultForStorage(state.fullReport),
    reportGenerationStatus: state.reportGenerationStatus,
  };
  localStorage.setItem(V2_STORAGE_KEY, JSON.stringify(payload));
}

function isCompatibleMeta(meta, manifest) {
  if (!meta || typeof meta !== 'object') return false;
  const compatibleQuestionBankHashes = new Set([
    manifest.questionBankHash,
    ...(manifest.compatibleQuestionBankHashes ?? []),
  ]);
  return compatibleQuestionBankHashes.has(meta.questionBankHash)
    && meta.scoringProfile === manifest.scoringProfile
    && meta.targetVectorHash === manifest.targetVectorHash;
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
