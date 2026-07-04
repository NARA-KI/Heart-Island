import { V2_PRODUCT_VERSION, V2_SCORING_PROFILE } from './config.js';
import { loadV2RuntimeData } from './data-loader.js';
import { renderRoute } from './router.js';
import { createInitialState, hydrateState, isComplete } from './state.js';
import { answerQuestion, goNext, goPrevious } from './question-engine.js';
import { buildResult } from './result-engine.js';
import { clearSavedState, loadSavedState, saveState } from './storage.js';

const root = document.querySelector('#app');
const bootStatus = document.querySelector('#bootStatus');

let runtime = null;
let state = createInitialState();

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
    ...overrides,
  });
}

function startFresh() {
  clearSavedState();
  state = createInitialState();
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
  state.result = buildResult({
    questionBank: runtime.questionBank,
    candidateA: runtime.candidateA,
    descriptions: runtime.descriptions,
    answers: state.answers,
  });
  state.view = 'result';
  persist();
  route();
}

async function boot() {
  setBootStatus('正在加载 Heart Island v2.0 Alpha 数据...');
  runtime = await loadV2RuntimeData();
  runtime.candidateA.scoringProfile = V2_SCORING_PROFILE;

  const saved = loadSavedState(runtime.manifest);
  if (saved.status === 'ok') {
    state = hydrateState(saved.state, runtime.questionBank);
    state.restoreNotice = '已恢复上次未完成的测试进度。';
  } else if (saved.status === 'stale') {
    clearSavedState();
    state = createInitialState();
    state.restoreNotice = '测试版本已更新，旧进度已停用，请重新开始。';
  } else if (saved.status === 'invalid') {
    clearSavedState();
    state = createInitialState();
    state.restoreNotice = '本地进度无法读取，已重置。';
  }

  setBootStatus(`${V2_PRODUCT_VERSION} 已就绪`, 'ready');
  window.__heartIslandV2Debug = {
    get state() { return state; },
    get runtime() { return runtime; },
    score: () => buildResult({
      questionBank: runtime.questionBank,
      candidateA: runtime.candidateA,
      descriptions: runtime.descriptions,
      answers: state.answers,
    }),
  };
  route();
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
