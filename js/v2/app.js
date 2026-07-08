import { V2_AI_REPORT_DEFAULT_ENDPOINT, V2_SCORING_PROFILE } from './config.js';
import { loadV2RuntimeData } from './data-loader.js';
import { renderRoute } from './router.js';
import { createInitialState, hydrateState, isComplete } from './state.js';
import { answerQuestion, goNext, goPrevious } from './question-engine.js';
import { buildResult } from './result-engine.js';
import { createV2ShareCardBlob } from './share-card.js';
import { clearAiReportCache } from './ai/ai-report-cache.js';
import { generateAiResultReport } from './ai/ai-report-client.js';
import { loadAiReportConfig } from './ai/ai-report-config.js';
import { createResultHash } from './ai/ai-report-schema.js';
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

function setBootStatus(message, mode = 'loading') {
  if (!bootStatus) return;
  bootStatus.textContent = message;
  bootStatus.dataset.mode = mode;
}

function persist() {
  if (!runtime) return;
  saveState(runtime.manifest, state);
}

function route(overrides = {}) {
  renderRoute(root, {
    runtime,
    state,
    questionBank: runtime.questionBank,
    result: state.result,
    hasDraft: Object.keys(state.answers).length > 0 && !isComplete(state, runtime.questionBank),
    restoreNotice: state.restoreNotice,
    onStart: startFresh,
    onContinue: continueDraft,
    onBack: () => {
      state.view = 'home';
      route();
    },
    onBegin: beginQuiz,
    onAnswer: handleAnswer,
    onPrevious: handlePrevious,
    onShowResult: showResult,
    onRestart: startFresh,
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

function startFresh() {
  currentAiReportController?.abort();
  clearSharePreview();
  clearSavedState();
  clearAiReportCache();
  state = createInitialState({ pilotMode });
  state.view = 'instructions';
  state.startedAt = new Date().toISOString();
  route();
}

function continueDraft() {
  state.view = 'quiz';
  route();
}

function beginQuiz() {
  state.view = 'quiz';
  state.startedAt ??= new Date().toISOString();
  persist();
  route();
}

function handleAnswer(questionId, optionId) {
  answerQuestion(runtime.questionBank, state, questionId, optionId);
  const nextView = goNext(runtime.questionBank, state);
  state.view = nextView;
  if (nextView === 'transition') state.completedAt = new Date().toISOString();
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
  state.result = state.pilot?.enabled
    ? buildPilotResult({ runtime, state })
    : buildResult({
      manifest: runtime.manifest,
      questionBank: runtime.questionBank,
      candidateA: runtime.candidateA,
      descriptions: runtime.descriptions,
      answers: state.answers,
    });
  state.view = 'result';
  persist();
  route();
  requestAiReportEnhancement();
}

function requestAiReportEnhancement(options = {}) {
  if (state.pilot?.enabled || !state.result?.facts || !state.result?.report) return;
  const resultHash = createResultHash(state.result.facts);
  const status = state.result.aiReportStatus ?? { state: 'idle', message: '' };
  if (state.result.aiReport || state.result.report.source === 'ai') {
    state.result.aiReport ??= state.result.report.source === 'ai' ? state.result.report : null;
    state.result.aiReportStatus = { ...status, state: 'success', message: '个性化解读已生成', resultHash };
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
      persist();
      route();
    })
    .catch((error) => {
      if (controller.signal.aborted || state.view !== 'result' || !state.result) return;
      state.result.report = state.result.deterministicReport ?? state.result.report;
      state.result.aiReport = null;
      state.result.aiReportStatus = {
        state: error?.code === 'timeout' ? 'timeout' : 'error',
        message: '个性化解读暂时没有生成，当前结果仍可正常查看。',
        resultHash,
        retryUsed: Boolean(status.retryUsed || options.force),
      };
      if (debugMode) console.warn('AI report enhancement failed', error);
      persist();
      route();
    });
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

  const saved = loadSavedState(runtime.manifest);
  if (saved.status === 'ok') {
    state = hydrateState(saved.state, runtime.questionBank, { pilotMode });
    state.restoreNotice = state.result
      ? '这是你上一次保存的心岛结果。'
      : '已恢复上次未完成的测试进度。';
  } else if (saved.status === 'stale') {
    clearSavedState();
    state = createInitialState({ pilotMode });
    state.restoreNotice = '测试版本已更新，旧进度已停用，请重新开始。';
  } else if (saved.status === 'invalid') {
    clearSavedState();
    state = createInitialState({ pilotMode });
    state.restoreNotice = '本地进度无法读取，已重置。';
  }
  if (pilotMode && !state.pilot?.enabled) state.pilot = createPilotState(true);
  if (!pilotMode && isComplete(state, runtime.questionBank) && !state.result) {
    state.result = buildResult({
      manifest: runtime.manifest,
      questionBank: runtime.questionBank,
      candidateA: runtime.candidateA,
      descriptions: runtime.descriptions,
      answers: state.answers,
    });
    state.view = 'result';
    persist();
  }

  setBootStatus('关系倾向测试已就绪', 'ready');
  window.__heartIslandV2Debug = {
    get state() { return state; },
    get runtime() { return runtime; },
    score: () => buildResult({
      manifest: runtime.manifest,
      questionBank: runtime.questionBank,
      candidateA: runtime.candidateA,
      descriptions: runtime.descriptions,
      answers: state.answers,
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
