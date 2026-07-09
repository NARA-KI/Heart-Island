import { createPilotState } from './pilot-engine.js';
import {
  QUIZ_MODE_FULL,
  QUIZ_MODE_QUICK,
  getOrderedQuestionIds,
  isQuizMode,
} from './quiz-modes.js';

export function createInitialState(options = {}) {
  const answersByQuestionId = {};
  const state = {
    schemaVersion: 2,
    view: 'home',
    quizMode: null,
    quizPath: null,
    currentQuestionIndex: 0,
    orderedQuestionIds: [],
    answersByQuestionId,
    answers: answersByQuestionId,
    answeredCount: 0,
    optionOrder: {},
    startedAt: null,
    startTimestamp: null,
    elapsedMs: 0,
    quickElapsedMs: null,
    completedAt: null,
    completionStatus: 'idle',
    quickCompleted: false,
    fullCompleted: false,
    quickReport: null,
    fullReport: null,
    reportGenerationStatus: {
      quick: { state: 'idle', message: '' },
      full: { state: 'idle', message: '' },
    },
    result: null,
    restoreNotice: null,
    shareStatus: {},
    feedback: {},
    pilot: createPilotState(options.pilotMode === true),
  };
  return state;
}

export function hydrateState(saved, questionBank, options = {}) {
  const state = createInitialState(options);
  const legacy = Number(saved.schemaVersion ?? 1) < 2;
  state.quizMode = isQuizMode(saved.quizMode)
    ? saved.quizMode
    : inferLegacyQuizMode(saved, questionBank);
  state.quizPath = saved.quizPath === 'continuation' ? 'continuation' : (state.quizMode ? 'direct' : null);
  const defaultQuestionIds = getOrderedQuestionIds(questionBank, state.quizMode, {
    continuation: state.quizPath === 'continuation',
  });
  state.orderedQuestionIds = sanitizeOrderedQuestionIds(
    saved.orderedQuestionIds,
    questionBank,
    defaultQuestionIds,
  );
  state.currentQuestionIndex = Math.min(
    Math.max(Number(saved.currentQuestionIndex ?? 0), 0),
    Math.max(0, state.orderedQuestionIds.length - 1),
  );
  setAnswers(state, sanitizeAnswers(saved.answersByQuestionId ?? saved.answers ?? {}, questionBank));
  state.answeredCount = Object.keys(state.answersByQuestionId).length;
  state.optionOrder = sanitizeOptionOrder(saved.optionOrder ?? {}, questionBank);
  state.startedAt = saved.startedAt ?? new Date().toISOString();
  state.startTimestamp = null;
  state.elapsedMs = nonNegativeNumber(saved.elapsedMs);
  state.quickElapsedMs = nullableNonNegativeNumber(saved.quickElapsedMs);
  state.completedAt = saved.completedAt ?? null;
  state.quickCompleted = Boolean(saved.quickCompleted);
  state.fullCompleted = Boolean(saved.fullCompleted);
  state.quickReport = sanitizeSavedResult(saved.quickReport);
  state.fullReport = sanitizeSavedResult(saved.fullReport);
  const legacyResult = sanitizeSavedResult(saved.result);
  if (legacy && legacyResult) {
    state.fullReport = legacyResult;
    state.fullCompleted = state.answersByQuestionId
      && Object.keys(state.answersByQuestionId).length >= questionBank.questions.length;
  }
  state.result = state.quizMode === QUIZ_MODE_QUICK
    ? state.quickReport
    : state.fullReport;
  state.reportGenerationStatus = sanitizeReportGenerationStatus(
    saved.reportGenerationStatus,
    state.quickReport,
    state.fullReport,
  );
  state.completionStatus = normalizeCompletionStatus(saved.completionStatus, state);
  state.feedback = typeof saved.feedback === 'object' && saved.feedback ? saved.feedback : {};
  if (options.pilotMode === true) {
    state.pilot = {
      ...createPilotState(true),
      ...(saved.pilot ?? {}),
      enabled: true,
      pilotId: saved.pilot?.pilotId ?? createPilotState(true).pilotId,
    };
  }
  if (state.result && ((state.quizMode === QUIZ_MODE_QUICK && state.quickCompleted) || state.fullCompleted)) {
    state.view = 'result';
  } else if (isCurrentSequenceComplete(state)) {
    state.view = 'transition';
  } else if (state.answeredCount > 0) {
    state.view = 'home';
  } else {
    state.view = 'home';
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
  return Object.keys(state.answersByQuestionId ?? state.answers ?? {}).length;
}

export function isComplete(state, questionBank) {
  const questionIds = state.orderedQuestionIds?.length
    ? state.orderedQuestionIds
    : questionBank.questions.map((question) => question.id);
  const answers = state.answersByQuestionId ?? state.answers ?? {};
  return questionIds.length > 0 && questionIds.every((id) => Boolean(answers[id]));
}

export function isCurrentSequenceComplete(state) {
  const answers = state.answersByQuestionId ?? state.answers ?? {};
  return state.orderedQuestionIds.length > 0
    && state.orderedQuestionIds.every((id) => Boolean(answers[id]));
}

export function setAnswers(state, answersByQuestionId) {
  state.answersByQuestionId = answersByQuestionId;
  state.answers = answersByQuestionId;
  state.answeredCount = Object.keys(answersByQuestionId).length;
}

export function syncAnsweredCount(state) {
  state.answeredCount = answeredCount(state);
  return state.answeredCount;
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

function inferLegacyQuizMode(saved, questionBank) {
  const answers = saved.answersByQuestionId ?? saved.answers ?? {};
  if (Object.keys(answers).length > 0 || saved.result) return QUIZ_MODE_FULL;
  return null;
}

function sanitizeOrderedQuestionIds(value, questionBank, fallback) {
  if (!Array.isArray(value) || value.length === 0) return fallback;
  const validIds = new Set(questionBank.questions.map((question) => question.id));
  const clean = value.filter((id) => validIds.has(id));
  if (clean.length !== value.length || new Set(clean).size !== clean.length) return fallback;
  return clean;
}

function nonNegativeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function nullableNonNegativeNumber(value) {
  if (value === null || value === undefined) return null;
  return nonNegativeNumber(value);
}

function normalizeCompletionStatus(value, state) {
  const allowed = new Set(['idle', 'in-progress', 'quick-complete', 'full-complete']);
  if (allowed.has(value)) return value;
  if (state.fullCompleted) return 'full-complete';
  if (state.quickCompleted) return 'quick-complete';
  if (state.answeredCount > 0) return 'in-progress';
  return 'idle';
}

function sanitizeReportGenerationStatus(value, quickReport, fullReport) {
  const fallback = (report) => report?.aiReportStatus
    ?? { state: report?.aiReport ? 'success' : 'idle', message: '' };
  return {
    quick: normalizeStatus(value?.quick, fallback(quickReport)),
    full: normalizeStatus(value?.full, fallback(fullReport)),
  };
}

function normalizeStatus(value, fallback) {
  if (!value || typeof value !== 'object') return fallback;
  return {
    state: typeof value.state === 'string' ? value.state : fallback.state,
    message: typeof value.message === 'string' ? value.message : '',
    resultHash: typeof value.resultHash === 'string' ? value.resultHash : undefined,
    retryUsed: Boolean(value.retryUsed),
  };
}
