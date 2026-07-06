import { V2_SCORING_PROFILE } from './config.js';
import { loadV2RuntimeData } from './data-loader.js';
import { renderRoute } from './router.js';
import { createInitialState, hydrateState, isComplete } from './state.js';
import { answerQuestion, goNext, goPrevious } from './question-engine.js';
import { buildResult } from './result-engine.js';
import { downloadResultImage, shareResultImage } from './share-card.js';
import { clearAiReportCache } from './ai/ai-report-cache.js';
import { generateAiResultReport } from './ai/ai-report-client.js';
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
const pilotMode = new URLSearchParams(window.location.search).get('pilot') === '1';

let runtime = null;
let state = createInitialState({ pilotMode });
let currentAiReportController = null;

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
    onFeedbackChange: handleResultFeedbackChange,
    ...overrides,
  });
}

function startFresh() {
  currentAiReportController?.abort();
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

function requestAiReportEnhancement() {
  if (state.pilot?.enabled || !state.result?.facts || !state.result?.report) return;
  if (state.result.report.source === 'ai') {
    state.result.aiReportStatus = { state: 'success', message: '个性化解读已生成' };
    persist();
    route();
    return;
  }

  currentAiReportController?.abort();
  const controller = new AbortController();
  currentAiReportController = controller;
  state.result.aiReportStatus = {
    state: 'loading',
    message: '正在结合你的15维关系倾向，整理更贴近本次作答的解读……',
  };
  persist();
  route();

  generateAiResultReport(state.result.facts, { signal: controller.signal })
    .then((entry) => {
      if (controller.signal.aborted || state.view !== 'result' || !state.result?.facts) return;
      state.result.report = entry.report;
      state.result.aiReportStatus = { state: 'success', message: '个性化解读已生成' };
      persist();
      route();
    })
    .catch(() => {
      if (controller.signal.aborted || state.view !== 'result' || !state.result) return;
      state.result.report = state.result.deterministicReport ?? state.result.report;
      state.result.aiReportStatus = {
        state: 'failed',
        message: '当前使用稳定版关系解读，结果内容不受影响。',
      };
      persist();
      route();
    });
}

async function handleSaveResultImage() {
  if (!state.result?.facts || !state.result?.report) return;
  state.shareStatus = { loading: 'save', message: '' };
  route();
  try {
    await downloadResultImage({ facts: state.result.facts, report: state.result.report });
    state.shareStatus = { message: '结果图已生成并下载。' };
  } catch (error) {
    console.error(error);
    state.shareStatus = { message: '结果图生成失败，请稍后重试。' };
  }
  persist();
  route();
  if (state.view === 'result' && !state.pilot?.enabled) requestAiReportEnhancement();
}

async function handleShareResult() {
  if (!state.result?.facts || !state.result?.report) return;
  state.shareStatus = { loading: 'share', message: '' };
  route();
  try {
    const result = await shareResultImage({ facts: state.result.facts, report: state.result.report });
    state.shareStatus = { message: result.shared ? '已打开系统分享。' : '当前浏览器不支持直接分享图片，已为你下载结果图。' };
  } catch (error) {
    console.error(error);
    state.shareStatus = { message: '分享图生成失败，请稍后重试。' };
  }
  persist();
  route();
}

function handleResultFeedbackChange(field, value) {
  state.feedback ??= {};
  state.feedback[field] = value;
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
  runtime = await loadV2RuntimeData(undefined, { includePilot: pilotMode });
  runtime.candidateA.scoringProfile = V2_SCORING_PROFILE;
  if (runtime.candidateE) runtime.candidateE.scoringProfile = 'candidate-e-adaptive-hybrid';

  const saved = loadSavedState(runtime.manifest);
  if (saved.status === 'ok') {
    state = hydrateState(saved.state, runtime.questionBank, { pilotMode });
    state.restoreNotice = '已恢复上次未完成的测试进度。';
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
