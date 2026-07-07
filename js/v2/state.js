import { createPilotState } from './pilot-engine.js';

export function createInitialState(options = {}) {
  return {
    view: 'home',
    currentQuestionIndex: 0,
    answers: {},
    optionOrder: {},
    startedAt: null,
    completedAt: null,
    result: null,
    restoreNotice: null,
    shareStatus: {},
    feedback: {},
    pilot: createPilotState(options.pilotMode === true),
  };
}

export function hydrateState(saved, questionBank, options = {}) {
  const state = createInitialState(options);
  state.currentQuestionIndex = Math.min(
    Math.max(Number(saved.currentQuestionIndex ?? 0), 0),
    questionBank.questions.length - 1,
  );
  state.answers = sanitizeAnswers(saved.answers ?? {}, questionBank);
  state.optionOrder = sanitizeOptionOrder(saved.optionOrder ?? {}, questionBank);
  state.startedAt = saved.startedAt ?? new Date().toISOString();
  state.completedAt = saved.completedAt ?? null;
  state.result = sanitizeSavedResult(saved.result);
  state.feedback = typeof saved.feedback === 'object' && saved.feedback ? saved.feedback : {};
  if (options.pilotMode === true) {
    state.pilot = {
      ...createPilotState(true),
      ...(saved.pilot ?? {}),
      enabled: true,
      pilotId: saved.pilot?.pilotId ?? createPilotState(true).pilotId,
    };
  }
  if (Object.keys(state.answers).length >= questionBank.questions.length) {
    state.view = state.result ? 'result' : 'transition';
  } else {
    state.view = 'quiz';
  }
  return state;
}

export function sanitizeAnswers(answers, questionBank) {
  const questionMap = new Map(questionBank.questions.map((question) => [question.id, question]));
  const clean = {};
  for (const [questionId, optionId] of Object.entries(answers)) {
    const question = questionMap.get(questionId);
    if (!question) continue;
    if (question.options.some((option) => option.id === optionId)) clean[questionId] = optionId;
  }
  return clean;
}

export function sanitizeOptionOrder(optionOrder, questionBank) {
  const clean = {};
  for (const question of questionBank.questions) {
    const order = optionOrder[question.id];
    const optionIds = question.options.map((option) => option.id).sort().join('');
    if (Array.isArray(order) && order.length === 4 && [...order].sort().join('') === optionIds) {
      clean[question.id] = order;
    }
  }
  return clean;
}

export function answeredCount(state) {
  return Object.keys(state.answers).length;
}

export function isComplete(state, questionBank) {
  return answeredCount(state) === questionBank.questions.length;
}

function sanitizeSavedResult(result) {
  if (!result || typeof result !== 'object') return null;
  if (result.mode === 'pilot') return null;
  if (!result.facts?.versions?.resultSchemaVersion || !result.report?.schemaVersion) return null;
  return {
    facts: result.facts,
    deterministicReport: result.deterministicReport ?? (result.report?.source === 'deterministic' ? result.report : null),
    report: result.report,
    aiReport: result.aiReport ?? (result.report?.source === 'ai' ? result.report : null),
    aiReportStatus: normalizeAiReportStatus(result),
  };
}

function normalizeAiReportStatus(result) {
  const status = result.aiReportStatus;
  if (status?.state === 'failed') return { ...status, state: 'error' };
  if (status?.state) return status;
  return { state: result.aiReport || result.report?.source === 'ai' ? 'success' : 'idle', message: '' };
}
