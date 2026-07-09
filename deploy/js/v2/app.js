import { V2_AI_REPORT_DEFAULT_ENDPOINT, V2_SCORING_PROFILE } from './config.js';
import { loadV2RuntimeData } from './data-loader.js';
import { renderRoute } from './router.js';
import { createInitialState, hydrateState, isComplete, syncAnsweredCount } from './state.js';
import { answerQuestion, goNext, goPrevious } from './question-engine.js';
import { buildResult } from './result-engine.js';
import {
  QUIZ_MODE_FULL,
  QUIZ_MODE_QUICK,
  createQuestionBankForMode,
  getOrderedQuestionIds,
  isQuizMode,
  pickAnswersForQuestionIds,
  validateQuizQuestionSets,
} from './quiz-modes.js';
import { createV2ShareCardBlob } from './share-card.js';
import { clearAiReportCache } from './ai/ai-report-cache.js';
import { generateAiResultReport } from './ai/ai-report-client.js';
import { loadAiReportConfig } from './ai/ai-report-config.js';
import { createResultHash } from './ai/ai-report-schema.js';
import {
  currentElapsedMs,
  formatElapsedTime,
  pauseQuizTimer,
  resumeQuizTimer,
} from './quiz-timer.js';
import {
  buildFeedbackUrl,
  getViewportLabel,
  hasFeedbackClicked,
  loadFeedbackConfig,
  recordFeedbackClick,
} from './feedback-config.js';
import {
  buildPilotResult,
  createPilotCode,
  createPilotExportRecord,
  createPilotState,
  pilotRecordsToCsv,
  summarizePilotRecords,
} from './pilot-engine.js';
import { clearSavedState, loadSavedState, saveState } from './storage.js';

const root = document.querySelector('#app');
const bootStatus = document.querySelector('#bootStatus');
const urlParams = new URLSearchParams(window.location.search);
const pilotMode = urlParams.get('pilot') === '1';
const debugMode = urlParams.get('debug') === '1';

let runtime = null;
let state = createInitialState({ pilotMode });
let currentAiReportController = null;
const attemptedAiReportHashes = new Set();
let aiReportConfig = { endpoint: V2_AI_REPORT_DEFAULT_ENDPOINT };
let feedbackConfig = { enabled: false, url: null };
let sharePreviewUrl = null;
let sharePreviewBlob = null;
let sharePreviewFile = null;
let timerIntervalId = null;
let statePersistenceEnabled = true;

function setBootStatus(message, mode = 'loading') {
  if (!bootStatus) return;
  bootStatus.textContent = message;
  bootStatus.dataset.mode = mode;
}

function persist() {
  if (!runtime || !statePersistenceEnabled) return;
  saveState(runtime.manifest, state);
}

function route(overrides = {}) {
  const hasDraft = state.orderedQuestionIds.length > 0
    && state.orderedQuestionIds.some((id) => !state.answersByQuestionId[id])
    && Object.keys(state.answersByQuestionId).length > 0;
  renderRoute(root, {
    runtime,
    state,
    questionBank: runtime.questionBank,
    result: state.result,
    hasDraft,
    restoreNotice: state.restoreNotice,
    onSelectMode: selectQuizMode,
    onStart: startFresh,
    onContinue: continueDraft,
    onRestart: restartToHome,
    onBack: () => {
      state.view = 'home';
      route();
    },
    onBegin: beginQuiz,
    onAnswer: handleAnswer,
    onPrevious: handlePrevious,
    onShowResult: showResult,
    onContinueFull: continueFullExploration,
    onFeedbackChange: handlePilotFeedbackChange,
    onExportJson: handlePilotExportJson,
    onCopyCode: handlePilotCopyCode,
    onImportJson: handlePilotImportJson,
    onExportCsv: handlePilotExportCsv,
    onSaveResultImage: handleSaveResultImage,
    onShareResult: handleShareResult,
    onNativeShareResult: handleNativeShareResult,
    onDownloadShareCard: handleDownloadShareCard,
    onCloseSharePreview: handleCloseSharePreview,
    onExternalFeedback: handleExternalFeedback,
    onRetryAiReport: handleRetryAiReport,
    feedbackEntry: buildFeedbackEntry(),
    debugMode,
    onFeedbackChange: handleResultFeedbackChange,
    ...overrides,
  });
  syncTimerLoop();
}

function buildFeedbackEntry() {
  if (!feedbackConfig.enabled || !feedbackConfig.url || !state.result?.facts) return null;
  const url = buildFeedbackUrl(feedbackConfig.url, {
    facts: state.result.facts,
    report: getShareReport(),
    viewport: getViewportLabel(),
  });
  if (!url) return null;
  return {
    url,
    resultId: state.result.facts.resultId,
    clicked: hasFeedbackClicked(),
  };
}

function selectQuizMode(mode) {
  if (!isQuizMode(mode) || Object.keys(state.answersByQuestionId).length > 0) return;
  state.quizMode = mode;
  state.quizPath = 'direct';
  state.orderedQuestionIds = getOrderedQuestionIds(runtime.questionBank, mode);
  state.currentQuestionIndex = 0;
  persist();
  route();
}

function startFresh(mode = state.quizMode) {
  if (!isQuizMode(mode)) return;
  statePersistenceEnabled = true;
  currentAiReportController?.abort();
  clearSharePreview();
  clearSavedState();
  clearAiReportCache();
  state = createInitialState({ pilotMode });
  state.quizMode = mode;
  state.quizPath = 'direct';
  state.orderedQuestionIds = getOrderedQuestionIds(runtime.questionBank, mode);
  state.view = 'instructions';
  state.startedAt = new Date().toISOString();
  state.completionStatus = 'in-progress';
  persist();
  route();
}

function restartToHome() {
  statePersistenceEnabled = true;
  currentAiReportController?.abort();
  clearSharePreview();
  clearSavedState();
  clearAiReportCache();
  state = createInitialState({ pilotMode });
  if (pilotMode) {
    state.quizMode = QUIZ_MODE_FULL;
    state.quizPath = 'direct';
    state.orderedQuestionIds = getOrderedQuestionIds(runtime.questionBank, QUIZ_MODE_FULL);
  }
  route();
}

function continueDraft() {
  state.view = 'quiz';
  state.completionStatus = 'in-progress';
  resumeQuizTimer(state);
  persist();
  route();
}

function beginQuiz() {
  state.view = 'quiz';
  state.startedAt ??= new Date().toISOString();
  state.completionStatus = 'in-progress';
  resumeQuizTimer(state);
  persist();
  route();
}

function handleAnswer(questionId, optionId) {
  answerQuestion(runtime.questionBank, state, questionId, optionId);
  invalidateCurrentModeReport();
  const nextView = goNext(runtime.questionBank, state);
  state.view = nextView;
  if (nextView === 'transition') {
    pauseQuizTimer(state);
    state.completedAt = new Date().toISOString();
    if (state.quizMode === QUIZ_MODE_QUICK) {
      state.quickCompleted = true;
      state.quickElapsedMs = state.elapsedMs;
      state.completionStatus = 'quick-complete';
    } else {
      state.fullCompleted = true;
      state.completionStatus = 'full-complete';
    }
  }
  syncAnsweredCount(state);
  persist();
  route();
}

function handlePrevious() {
  goPrevious(state);
  state.view = 'quiz';
  persist();
  route();
}

function showResult() {
  if (!isComplete(state, runtime.questionBank)) {
    state.view = 'quiz';
    route();
    return;
  }
  const resultQuestionBank = createQuestionBankForMode(runtime.questionBank, state.quizMode);
  const resultQuestionIds = resultQuestionBank.questions.map((question) => question.id);
  const resultAnswers = pickAnswersForQuestionIds(state.answersByQuestionId, resultQuestionIds);
  state.result = state.pilot?.enabled
    ? buildPilotResult({ runtime, state })
    : buildResult({
      manifest: runtime.manifest,
      questionBank: resultQuestionBank,
      candidateA: runtime.candidateA,
      descriptions: runtime.descriptions,
      answers: resultAnswers,
      assessment: {
        quizMode: state.quizMode,
        totalQuestionCount: state.quizMode === QUIZ_MODE_QUICK ? 30 : 60,
        elapsedMs: state.elapsedMs,
        quickElapsedMs: state.quickElapsedMs,
      },
    });
  if (state.quizMode === QUIZ_MODE_QUICK) {
    state.quickCompleted = true;
    state.quickReport = state.result;
  } else {
    state.fullCompleted = true;
    state.fullReport = state.result;
  }
  syncCurrentReportStatus();
  state.view = 'result';
  persist();
  route();
  requestAiReportEnhancement();
}

function continueFullExploration() {
  if (!state.quickCompleted || Object.keys(state.answersByQuestionId).length < 30) return;
  currentAiReportController?.abort();
  clearSharePreview();
  state.quizMode = QUIZ_MODE_FULL;
  state.quizPath = 'continuation';
  state.orderedQuestionIds = getOrderedQuestionIds(runtime.questionBank, QUIZ_MODE_FULL, { continuation: true });
  state.currentQuestionIndex = Math.max(
    0,
    state.orderedQuestionIds.findIndex((id) => !state.answersByQuestionId[id]),
  );
  state.result = null;
  state.fullReport = null;
  state.fullCompleted = false;
  state.completedAt = null;
  state.completionStatus = 'in-progress';
  state.reportGenerationStatus.full = { state: 'idle', message: '' };
  state.view = 'quiz';
  resumeQuizTimer(state);
  persist();
  route();
}

function syncTimerLoop() {
  if (state.view === 'quiz' && document.visibilityState !== 'hidden') {
    resumeQuizTimer(state);
    if (!timerIntervalId) {
      timerIntervalId = window.setInterval(() => {
        const timer = root.querySelector('[data-quiz-timer]');
        if (timer) timer.textContent = `◷ ${formatElapsedTime(currentElapsedMs(state))}`;
      }, 1000);
    }
    return;
  }
  if (timerIntervalId) {
    window.clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    pauseQuizTimer(state);
    persist();
    syncTimerLoop();
  } else if (state.view === 'quiz') {
    resumeQuizTimer(state);
    persist();
    syncTimerLoop();
  }
});

window.addEventListener('pagehide', () => {
  if (state.view === 'quiz') {
    pauseQuizTimer(state);
    persist();
  }
});

function invalidateCurrentModeReport() {
  if (state.quizMode === QUIZ_MODE_QUICK) {
    state.quickReport = null;
    state.quickCompleted = false;
    state.reportGenerationStatus.quick = { state: 'idle', message: '' };
  } else {
    state.fullReport = null;
    state.fullCompleted = false;
    state.reportGenerationStatus.full = { state: 'idle', message: '' };
  }
  state.result = null;
}

function requestAiReportEnhancement(options = {}) {
  if (state.pilot?.enabled || !state.result?.facts || !state.result?.report) return;
  const resultHash = createResultHash(state.result.facts);
  const status = state.result.aiReportStatus ?? { state: 'idle', message: '' };
  if (state.result.aiReport || state.result.report.source === 'ai') {
    state.result.aiReport ??= state.result.report.source === 'ai' ? state.result.report : null;
    state.result.aiReportStatus = { ...status, state: 'success', message: '个性化解读已生成', resultHash };
    syncCurrentReportStatus();
    persist();
    route();
    return;
  }
  if (status.state === 'loading') return;
  if (!options.force && attemptedAiReportHashes.has(resultHash)) return;
  if (options.force && status.retryUsed) return;

  currentAiReportController?.abort();
  const controller = new AbortController();
  currentAiReportController = controller;
  attemptedAiReportHashes.add(resultHash);
  state.result.aiReportStatus = {
    state: 'loading',
    message: options.force
      ? '正在重新整理这份个性化关系解读...'
      : '正在结合你的本次作答，整理一份更贴近你的关系解读...',
    resultHash,
    retryUsed: Boolean(status.retryUsed || options.force),
  };
  syncCurrentReportStatus();
  persist();
  route();

  generateAiResultReport(state.result.facts, {
    endpoint: aiReportConfig.endpoint,
    signal: controller.signal,
    force: options.force === true,
  })
    .then((entry) => {
      if (controller.signal.aborted || state.view !== 'result' || !state.result?.facts) return;
      state.result.aiReport = entry.report;
      if (state.result.report?.source === 'ai') {
        state.result.report = state.result.deterministicReport ?? state.result.report;
      }
      state.result.aiReportStatus = {
        state: 'success',
        message: entry.fromCache ? '已恢复本次个性化解读' : '个性化解读已生成',
        resultHash,
        retryUsed: Boolean(status.retryUsed || options.force),
      };
      syncCurrentReportStatus();
      persist();
      route();
    })
    .catch((error) => {
      if (controller.signal.aborted || state.view !== 'result' || !state.result) return;
      state.result.report = state.result.deterministicReport ?? state.result.report;
      state.result.aiReport = null;
      state.result.aiReportStatus = {
        state: error?.code === 'timeout' ? 'timeout' : 'error',
        message: '个性化报告暂时生成失败，当前基础分析仍可正常查看。',
        resultHash,
        retryUsed: Boolean(status.retryUsed || options.force),
      };
      syncCurrentReportStatus();
      if (debugMode) console.warn('AI report enhancement failed', error);
      persist();
      route();
    });
}

function syncCurrentReportStatus() {
  if (!state.result || !isQuizMode(state.quizMode)) return;
  state.reportGenerationStatus[state.quizMode] = {
    ...(state.result.aiReportStatus ?? { state: 'idle', message: '' }),
  };
  if (state.quizMode === QUIZ_MODE_QUICK) state.quickReport = state.result;
  if (state.quizMode === QUIZ_MODE_FULL) state.fullReport = state.result;
}

function handleRetryAiReport() {
  requestAiReportEnhancement({ force: true });
}

async function handleSaveResultImage() {
  if (!state.result?.facts || !state.result?.report) return;
  state.shareStatus = { loading: 'save', message: '' };
  route();
  try {
    await prepareSharePreview();
    state.shareStatus = createSharePreviewStatus('分享卡已生成。');
  } catch (error) {
    console.error(error);
    state.shareStatus = { message: '分享卡生成失败，请稍后重试。' };
  }
  route();
}

async function handleShareResult() {
  if (!state.result?.facts || !state.result?.report) return;
  state.shareStatus = { loading: 'share', message: '' };
  route();
  try {
    await prepareSharePreview();
    state.shareStatus = createSharePreviewStatus('分享卡已生成。');
  } catch (error) {
    console.error(error);
    state.shareStatus = { message: '分享卡生成失败，请稍后重试。' };
  }
  route();
}

async function handleNativeShareResult() {
  if (!sharePreviewFile || !state.result?.facts || !state.result?.report) return;
  const shareReport = getShareReport();
  const shareData = {
    title: '我的心岛人格',
    text: `${state.result.facts.persona.displayName}：${shareReport.oneLine}`,
    files: [sharePreviewFile],
  };
  if (!navigator.share || !navigator.canShare?.(shareData)) {
    state.shareStatus = createSharePreviewStatus('当前浏览器不支持系统分享，请长按图片保存或下载。');
    route();
    return;
  }
  try {
    await navigator.share(shareData);
    state.shareStatus = createSharePreviewStatus('已打开系统分享。');
  } catch (error) {
    if (error?.name !== 'AbortError') console.error(error);
    state.shareStatus = createSharePreviewStatus('分享卡仍保留在页面内，可继续保存或下载。');
  }
  route();
}

function handleDownloadShareCard() {
  if (!sharePreviewUrl || !state.result?.facts) return;
  const link = document.createElement('a');
  link.href = sharePreviewUrl;
  link.download = `heart-island-${state.result.facts.persona.id}-${state.result.facts.resultId}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function handleCloseSharePreview() {
  clearSharePreview();
  state.shareStatus = {};
  route();
}

async function prepareSharePreview() {
  clearSharePreview();
  sharePreviewBlob = await createV2ShareCardBlob({ facts: state.result.facts, report: getShareReport() });
  sharePreviewUrl = URL.createObjectURL(sharePreviewBlob);
  sharePreviewFile = new File([sharePreviewBlob], `heart-island-${state.result.facts.persona.id}.png`, { type: 'image/png' });
}

function createSharePreviewStatus(message) {
  const shareReport = getShareReport();
  const shareData = sharePreviewFile ? {
    title: '我的心岛人格',
    text: `${state.result.facts.persona.displayName}：${shareReport.oneLine}`,
    files: [sharePreviewFile],
  } : null;
  return {
    message,
    previewUrl: sharePreviewUrl,
    canNativeShare: Boolean(shareData && navigator.share && navigator.canShare?.(shareData)),
    isMobile: window.innerWidth <= 720,
  };
}

function getShareReport() {
  return state.result?.aiReport ?? state.result?.report;
}

function clearSharePreview() {
  if (sharePreviewUrl) URL.revokeObjectURL(sharePreviewUrl);
  sharePreviewUrl = null;
  sharePreviewBlob = null;
  sharePreviewFile = null;
}

function handleResultFeedbackChange(field, value) {
  state.feedback ??= {};
  state.feedback[field] = value;
  persist();
}

function handleExternalFeedback() {
  recordFeedbackClick();
  state.feedback ??= {};
  state.feedback.externalFeedbackClickedAt = new Date().toISOString();
  persist();
}

function handlePilotFeedbackChange(field, value) {
  if (!state.pilot?.enabled) return;
  state.pilot.feedback[field] = value;
  persist();
}

function handlePilotExportJson() {
  const record = createPilotExportRecord({ runtime, state });
  state.pilot.exportedRecord = record;
  persist();
  downloadText(`${record.pilotId}.json`, JSON.stringify(record, null, 2), 'application/json');
}

async function handlePilotCopyCode() {
  const record = state.pilot.exportedRecord ?? createPilotExportRecord({ runtime, state });
  state.pilot.exportedRecord = record;
  persist();
  const code = createPilotCode(record);
  if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(code);
}

async function handlePilotImportJson(files) {
  const records = [];
  for (const file of [...files]) {
    try {
      records.push(JSON.parse(await file.text()));
    } catch (error) {
      console.warn(`Pilot JSON import skipped: ${file.name}`, error);
    }
  }
  state.pilot.importedSummary = summarizePilotRecords(records);
  persist();
  route();
}

function handlePilotExportCsv() {
  const records = [];
  if (state.pilot.exportedRecord) records.push(state.pilot.exportedRecord);
  if (state.pilot.importedSummary?.rows) records.push(...state.pilot.importedSummary.rows);
  downloadText('heart-island-v2-pilot-summary.csv', pilotRecordsToCsv(records), 'text/csv');
}

async function boot() {
  setBootStatus('正在加载关系倾向测试...');
  [runtime, feedbackConfig, aiReportConfig] = await Promise.all([
    loadV2RuntimeData(undefined, { includePilot: pilotMode }),
    loadFeedbackConfig(),
    loadAiReportConfig(),
  ]);
  runtime.candidateA.scoringProfile = V2_SCORING_PROFILE;
  if (runtime.candidateE) runtime.candidateE.scoringProfile = 'candidate-e-adaptive-hybrid';

  validateQuizQuestionSets(runtime.questionBank);

  const saved = loadSavedState(runtime.manifest);
  if (saved.status === 'ok') {
    state = hydrateState(saved.state, runtime.questionBank, { pilotMode });
    state.restoreNotice = state.result
      ? '这是你上一次保存的心岛结果。'
      : '已恢复上次未完成的测试进度。';
  } else if (saved.status === 'stale') {
    statePersistenceEnabled = false;
    state = createInitialState({ pilotMode });
    state.restoreNotice = '检测到无法安全迁移的旧进度。原记录仍保留，请选择模式重新开始。';
  } else if (saved.status === 'invalid') {
    statePersistenceEnabled = false;
    state = createInitialState({ pilotMode });
    state.restoreNotice = '本地进度暂时无法读取。原记录未删除，请选择模式重新开始。';
  }
  if (pilotMode) {
    if (!state.pilot?.enabled) state.pilot = createPilotState(true);
    state.quizMode ??= QUIZ_MODE_FULL;
    state.quizPath ??= 'direct';
    if (!state.orderedQuestionIds.length) {
      state.orderedQuestionIds = getOrderedQuestionIds(runtime.questionBank, QUIZ_MODE_FULL);
    }
  }

  setBootStatus('关系倾向测试已就绪', 'ready');
  window.__heartIslandV2Debug = {
    get state() { return state; },
    get runtime() { return runtime; },
    score: () => buildResult({
      manifest: runtime.manifest,
      questionBank: createQuestionBankForMode(runtime.questionBank, state.quizMode ?? QUIZ_MODE_FULL),
      candidateA: runtime.candidateA,
      descriptions: runtime.descriptions,
      answers: pickAnswersForQuestionIds(
        state.answersByQuestionId,
        state.quizMode === QUIZ_MODE_QUICK
          ? getOrderedQuestionIds(runtime.questionBank, QUIZ_MODE_QUICK)
          : getOrderedQuestionIds(runtime.questionBank, QUIZ_MODE_FULL),
      ),
      assessment: {
        quizMode: state.quizMode ?? QUIZ_MODE_FULL,
        elapsedMs: state.elapsedMs,
        quickElapsedMs: state.quickElapsedMs,
      },
    }),
    exportPilotRecord: () => createPilotExportRecord({ runtime, state }),
    summarizePilotRecords,
    pilotRecordsToCsv,
    get feedbackConfig() { return feedbackConfig; },
    get aiReportConfig() { return aiReportConfig; },
    get debugMode() { return debugMode; },
  };
  route();
  if (state.view === 'result' && !state.pilot?.enabled) requestAiReportEnhancement();
}

function downloadText(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

boot().catch((error) => {
  console.error(error);
  setBootStatus(`加载失败：${error.message}`, 'error');
  root.innerHTML = `
    <section class="v2-screen v2-panel">
      <p class="v2-eyebrow">加载失败</p>
      <h1>暂时无法开始登岛</h1>
      <p>${error.message}</p>
      <button class="v2-primary" type="button" onclick="location.reload()">重新加载</button>
    </section>
  `;
});
