import { compareTwoSchemes, createSeededRng, encodePilotRecord, normalizeExportRecord, shuffledOptions } from './scoring.mjs';
import { FEEDBACK_SCHEMA_VERSION, PUBLIC_RESULT_VERSION, RESULT_EXPLANATION_VERSION, loadPersonaDescriptions, publicResultMetadata, renderAnonymousResults } from './result-explanation.mjs';

const PILOT_TOOL_VERSION = 'v2.0-pilot-single-persona-result-display';
const PERSONA_DESCRIPTION_VERSION = 'v2-pilot-persona-descriptions-1';
const SCORING_RULE_VERSION = 'v2-draft-rms-distance-low-confidence-v1';
const STORAGE_KEY = 'heart-island-v2-pilot-draft';
const isDeployBuild = true;
const DATA_PATHS = {
  questionBank: './question-bank.v2.draft.json',
  baseline: './persona-target-vectors.v2.baseline.json',
  candidateA: './persona-target-vectors.v2.candidate-a.json',
  descriptions: './persona-descriptions.v2.pilot.json',
  manifest: './pilot-manifest.json',
  fixtures: null,
};

const state = {
  pilotId: null,
  currentIndex: 0,
  questionBank: null,
  baseline: null,
  candidateA: null,
  personaDescriptions: null,
  fixtures: null,
  hashes: {},
  manifest: null,
  answers: {},
  flags: {},
  comparison: null,
  anonymousCardOrder: [],
  testFixtureId: null,
  downloaded: false,
  copied: false,
  resultShownAt: null,
  feedbackStartedAt: null,
  fullExplanationOpened: false,
  comparisonViewed: false,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const elements = {
  introView: $('#introView'),
  questionView: $('#questionView'),
  resultView: $('#resultView'),
  startButton: $('#startButton'),
  prevButton: $('#prevButton'),
  nextButton: $('#nextButton'),
  progressText: $('#progressText'),
  progressBar: $('#progressBar'),
  questionTitle: $('#questionTitle'),
  optionList: $('#optionList'),
  resultHint: $('#resultHint'),
  resultCards: $('#resultCards'),
  readGate: $('#readGate'),
  beginFeedbackButton: $('#beginFeedbackButton'),
  preferenceField: $('#preferenceField'),
  cardFitFields: $('#cardFitFields'),
  downloadButton: $('#downloadButton'),
  copyCodeButton: $('#copyCodeButton'),
  copyCodeOutput: $('#copyCodeOutput'),
  downloadNote: $('#downloadNote'),
  restartButton: $('#restartButton'),
  feedbackForm: $('#feedbackForm'),
  initPanel: $('#initPanel'),
  initStatus: $('#initStatus'),
  reloadButton: $('#reloadButton'),
};

async function sha256(text) {
  if (!crypto?.subtle) return null;
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function readJsonWithHash(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`加载失败：${path}（HTTP ${response.status}）`);
  const text = await response.text();
  try {
    return { data: JSON.parse(text), hash: await sha256(text) };
  } catch (error) {
    throw new Error(`解析失败：${path}（${error.message}）`);
  }
}

async function readOptionalJson(path) {
  if (!path) return null;
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) return null;
  try {
    return await response.json();
  } catch (error) {
    throw new Error(`解析失败：${path}（${error.message}）`);
  }
}

async function init() {
  setInitState('loading', '正在加载内测题库与评分数据...');
  bindEarlyEvents();
  const [questionBank, baseline, candidateA, descriptions, fixtures, manifest] = await Promise.all([
    readJsonWithHash(DATA_PATHS.questionBank),
    readJsonWithHash(DATA_PATHS.baseline),
    readJsonWithHash(DATA_PATHS.candidateA),
    readJsonWithHash(DATA_PATHS.descriptions),
    DATA_PATHS.fixtures ? readOptionalJson(DATA_PATHS.fixtures) : Promise.resolve(null),
    readOptionalJson(DATA_PATHS.manifest),
  ]);
  state.questionBank = questionBank.data;
  state.baseline = baseline.data;
  state.candidateA = candidateA.data;
  state.personaDescriptions = descriptions.data;
  state.fixtures = fixtures;
  state.manifest = manifest;
  state.hashes = {
    questionBankHash: manifest?.questionBankHash ?? questionBank.hash,
    baselineVectorHash: manifest?.baselineVectorHash ?? baseline.hash,
    candidateAVectorHash: manifest?.candidateAVectorHash ?? candidateA.hash,
    personaDescriptionHash: manifest?.personaDescriptionHash ?? descriptions.hash,
  };

  restoreDraft();

  const params = new URLSearchParams(location.search);
  const fixtureId = params.get('fixture');
  if (fixtureId && !isDeployBuild) loadFixture(fixtureId);

  bindEvents();
  setInitState('ready', '加载完成，可以开始内测。');
  window.__v2Pilot = {
    state,
    start: startPilot,
    finish: finishQuestionnaire,
    exportRecord: buildExportRecord,
    loadFixture,
    isDeployBuild,
  };
}

function bindEarlyEvents() {
  elements.reloadButton.addEventListener('click', () => {
    location.reload();
  }, { once: true });
}

function setInitState(status, message) {
  elements.initPanel.classList.toggle('error', status === 'error');
  elements.initStatus.textContent = message;
  elements.reloadButton.classList.toggle('hidden', status !== 'error');
  elements.startButton.disabled = status !== 'ready';
  elements.startButton.textContent = status === 'ready' ? '开始内测' : status === 'error' ? '暂时无法开始' : '正在准备...';
}

function bindEvents() {
  elements.startButton.addEventListener('click', startPilot);
  elements.prevButton.addEventListener('click', () => {
    const fromQuestionId = currentQuestion().id;
    state.currentIndex = Math.max(0, state.currentIndex - 1);
    recordPilotDebugEvent('questionChanged', {
      direction: 'prev',
      fromQuestionId,
      toQuestionId: currentQuestion().id,
    });
    renderQuestion({ focusTitle: true, reason: 'prev' });
  });
  elements.nextButton.addEventListener('click', () => {
    const question = currentQuestion();
    if (!state.answers[question.id]) {
      alert('请先选择一个最接近的答案。');
      return;
    }
    if (state.currentIndex === state.questionBank.questions.length - 1) {
      finishQuestionnaire();
      return;
    }
    const fromQuestionId = question.id;
    state.currentIndex += 1;
    recordPilotDebugEvent('questionChanged', {
      direction: 'next',
      fromQuestionId,
      toQuestionId: currentQuestion().id,
    });
    renderQuestion({ focusTitle: true, reason: 'next' });
  });
  elements.downloadButton.addEventListener('click', () => {
    if (!elements.feedbackForm.reportValidity()) return;
    const record = buildExportRecord();
    downloadJson(record);
    state.downloaded = true;
    saveDraft();
    elements.downloadNote.classList.remove('hidden');
  });
  elements.copyCodeButton.addEventListener('click', async () => {
    if (!elements.feedbackForm.reportValidity()) return;
    const code = encodePilotRecord(buildExportRecord());
    elements.copyCodeOutput.value = code;
    elements.copyCodeOutput.classList.remove('hidden');
    elements.copyCodeOutput.select();
    try {
      await navigator.clipboard.writeText(code);
      elements.copyCodeButton.textContent = '已复制匿名结果代码';
    } catch {
      document.execCommand('copy');
      elements.copyCodeButton.textContent = '请手动复制下方代码';
    }
    state.copied = true;
    saveDraft();
  });
  elements.beginFeedbackButton.addEventListener('click', () => {
    state.feedbackStartedAt = Date.now();
    state.fullExplanationOpened = true;
    state.comparisonViewed = false;
    elements.readGate.classList.add('hidden');
    elements.feedbackForm.classList.remove('hidden');
    elements.feedbackForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  elements.restartButton.addEventListener('click', () => {
    if (!state.downloaded && !state.copied && Object.keys(state.answers).length) {
      const confirmed = confirm('当前记录还没有下载或复制。确定要重新开始吗？');
      if (!confirmed) return;
    }
    localStorage.removeItem(STORAGE_KEY);
    location.href = location.pathname;
  });
  window.addEventListener('beforeunload', (event) => {
    if (shouldWarnBeforeUnload()) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
  bindRange('#overallFitScore', '#overallValue');
  bindRange('#top1FitScore', '#top1Value');
  bindRange('#top2FitScore', '#top2Value');
  bindRange('#cardAFitScore', '#cardAValue');
  bindRange('#cardBFitScore', '#cardBValue');
}

function bindRange(inputSelector, outputSelector) {
  const input = $(inputSelector);
  const output = $(outputSelector);
  if (!input || !output) return;
  input.addEventListener('input', () => {
    output.textContent = input.value;
  });
}

function restoreDraft() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    state.pilotId = createPilotId();
    return;
  }
  try {
    const draft = JSON.parse(saved);
    state.pilotId = draft.pilotId || createPilotId();
    state.answers = draft.answers ?? {};
    state.flags = draft.flags ?? {};
    state.testFixtureId = isDeployBuild ? null : draft.testFixtureId ?? null;
    state.downloaded = Boolean(draft.downloaded);
    state.copied = Boolean(draft.copied);
  } catch {
    state.pilotId = createPilotId();
  }
}

function createPilotId() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  const rng = createSeededRng(`${Date.now()}:${Math.random()}:${navigator.userAgent}`);
  const segment = () => Math.floor(rng() * 0xffffffff).toString(16).padStart(8, '0');
  return `${segment()}-${segment()}-${segment()}-${segment()}`;
}

function loadFixture(fixtureId) {
  if (isDeployBuild) throw new Error('Fixture preload is disabled in deploy build');
  const fixture = state.fixtures?.fixtures?.find((item) => item.id === fixtureId);
  if (!fixture) throw new Error(`Unknown fixture ${fixtureId}`);
  state.testFixtureId = fixtureId;
  state.answers = { ...fixture.answers };
}

function startPilot() {
  if (elements.startButton.disabled) return;
  elements.introView.classList.add('hidden');
  elements.resultView.classList.add('hidden');
  elements.questionView.classList.remove('hidden');
  renderQuestion();
}

function currentQuestion() {
  return state.questionBank.questions[state.currentIndex];
}

function recordPilotDebugEvent(type, payload = {}) {
  window.__heartIslandPilotDebugEvents ??= [];
  window.__heartIslandPilotDebugEvents.push({
    type,
    timestamp: new Date().toISOString(),
    ...payload,
  });
}

function renderQuestion({ focusTitle = false, reason = 'render' } = {}) {
  const question = currentQuestion();
  const total = state.questionBank.questions.length;
  const savedAnswer = state.answers[question.id] ?? null;
  elements.progressText.textContent = `${String(state.currentIndex + 1).padStart(2, '0')} / ${total}`;
  elements.progressBar.style.width = `${((state.currentIndex + 1) / total) * 100}%`;
  elements.questionTitle.textContent = question.question;
  elements.questionTitle.setAttribute('tabindex', '-1');
  elements.optionList.innerHTML = '';

  for (const option of shuffledOptions(question.options, `heart-island-v2-pilot:${question.id}`)) {
    const button = document.createElement('button');
    button.type = 'button';
    const isSelected = savedAnswer === option.id;
    button.className = `option-button${isSelected ? ' selected' : ''}`;
    button.setAttribute('aria-pressed', String(isSelected));
    button.dataset.questionId = question.id;
    button.dataset.optionId = option.id;
    button.textContent = option.text;
    button.addEventListener('click', () => {
      state.answers[question.id] = option.id;
      recordPilotDebugEvent('answerSelected', {
        questionId: question.id,
        optionId: option.id,
      });
      saveDraft();
      renderQuestion({ reason: 'answerSelected' });
    });
    elements.optionList.append(button);
  }

  renderFlags(question.id);
  elements.prevButton.disabled = state.currentIndex === 0;
  elements.nextButton.textContent = state.currentIndex === total - 1 ? '查看结果' : '下一题';
  if (focusTitle) {
    requestAnimationFrame(() => elements.questionTitle.focus({ preventScroll: true }));
  }
  recordPilotDebugEvent('questionRendered', {
    questionId: question.id,
    index: state.currentIndex,
    reason,
    restoredOptionId: savedAnswer,
    selectedCount: elements.optionList.querySelectorAll('.option-button.selected').length,
  });
  if (savedAnswer) {
    recordPilotDebugEvent('answerRestored', {
      questionId: question.id,
      optionId: savedAnswer,
    });
  }
}

function renderFlags(questionId) {
  const current = state.flags[questionId] ?? {};
  $$('.question-flags input[type="checkbox"]').forEach((checkbox) => {
    checkbox.checked = Boolean(current[checkbox.dataset.flag]);
    checkbox.onchange = () => {
      state.flags[questionId] = {
        ...(state.flags[questionId] ?? {}),
        [checkbox.dataset.flag]: checkbox.checked,
      };
      saveDraft();
    };
  });
}

function saveDraft() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    pilotId: state.pilotId,
    answers: state.answers,
    flags: state.flags,
    testFixtureId: isDeployBuild ? null : state.testFixtureId,
    downloaded: state.downloaded,
    copied: state.copied,
  }));
}

function shouldWarnBeforeUnload() {
  const hasStarted = Object.keys(state.answers).length > 0 || Boolean(state.comparison);
  return hasStarted && !state.downloaded && !state.copied;
}

function missingAnswerIds() {
  return state.questionBank.questions.filter((question) => !state.answers[question.id]).map((question) => question.id);
}

function finishQuestionnaire() {
  const missing = missingAnswerIds();
  if (missing.length) {
    alert(`还有 ${missing.length} 题未作答，请返回补全。`);
    const firstMissingIndex = state.questionBank.questions.findIndex((question) => question.id === missing[0]);
    state.currentIndex = Math.max(0, firstMissingIndex);
    renderQuestion();
    return;
  }

  state.comparison = compareTwoSchemes(state.questionBank, state.baseline, state.candidateA, state.answers);
  buildAnonymousCardOrder();
  state.downloaded = false;
  state.copied = false;
  state.resultShownAt = Date.now();
  state.feedbackStartedAt = null;
  state.fullExplanationOpened = false;
  state.comparisonViewed = false;
  saveDraft();
  renderResults();
  elements.questionView.classList.add('hidden');
  elements.resultView.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function buildAnonymousCardOrder() {
  if (state.comparison.resultAgreement) {
    state.anonymousCardOrder = [{ label: '结果', source: 'both' }];
    return;
  }
  const rng = createSeededRng(`${state.pilotId}:card-order`);
  const order = rng() > 0.5
    ? [{ label: 'A', source: 'baseline' }, { label: 'B', source: 'candidate-A' }]
    : [{ label: 'A', source: 'candidate-A' }, { label: 'B', source: 'baseline' }];
  state.anonymousCardOrder = order;
}

function renderResults() {
  renderAnonymousResults({
    container: elements.resultCards,
    comparison: state.comparison,
    descriptions: state.personaDescriptions,
  });
  elements.preferenceField.classList.add('hidden');
  elements.cardFitFields.classList.add('hidden');
  elements.feedbackForm.classList.add('hidden');
  elements.readGate.classList.remove('hidden');
  elements.resultHint.textContent = '请先阅读你的心岛人格档案，再判断这个结果整体像不像你。';
}

function selectedRadio(name) {
  return $(`input[name="${name}"]:checked`)?.value ?? null;
}

function flaggedQuestionIds(flag) {
  return Object.entries(state.flags)
    .filter(([, value]) => value?.[flag])
    .map(([questionId]) => questionId)
    .sort((a, b) => Number(a.replace('v2-q', '')) - Number(b.replace('v2-q', '')));
}

function preferredSourceFromCard() {
  const preferredCard = selectedRadio('preferredCard');
  if (state.comparison.resultAgreement) return 'same';
  if (preferredCard === 'both') return 'both';
  if (preferredCard === 'neither') return 'neither';
  if (preferredCard === 'insufficient') return 'insufficient';
  const card = state.anonymousCardOrder.find((item) => item.label === preferredCard);
  return card?.source ?? null;
}

function selectedBestPersona() {
  const value = selectedRadio('selectedBestPersona');
  if (!value) return null;
  if (value === 'top1') return state.comparison.baseline.top5[0].displayName;
  if (value === 'top2') return state.comparison.baseline.top5[1].displayName;
  return value;
}

function fitJudgmentStatus() {
  const sufficient = selectedRadio('resultExplanationSufficient');
  const preferred = selectedRadio('preferredCard');
  const best = selectedRadio('selectedBestPersona');
  if (sufficient === 'no') {
    return { valid: false, reason: 'result explanation was marked insufficient' };
  }
  if (preferred === 'insufficient' || best === 'insufficient') {
    return { valid: false, reason: 'user selected insufficient information' };
  }
  return { valid: true, reason: null };
}

function buildExportRecord() {
  const comparison = state.comparison ?? compareTwoSchemes(state.questionBank, state.baseline, state.candidateA, state.answers);
  const publicMeta = publicResultMetadata({ comparison, descriptions: state.personaDescriptions });
  const answerSequence = state.questionBank.questions.map((question) => ({
    questionId: question.id,
    optionId: state.answers[question.id],
  }));

  return normalizeExportRecord({
    pilotId: state.pilotId,
    timestamp: new Date().toISOString(),
    exportedAt: new Date().toISOString(),
    pilotToolVersion: PILOT_TOOL_VERSION,
    personaDescriptionVersion: PERSONA_DESCRIPTION_VERSION,
    resultExplanationVersion: RESULT_EXPLANATION_VERSION,
    publicResultVersion: PUBLIC_RESULT_VERSION,
    feedbackSchemaVersion: FEEDBACK_SCHEMA_VERSION,
    questionnaireVersion: state.questionBank.sourceVersion ?? 'heart-island-v2-question-bank-draft',
    questionBankHash: state.hashes.questionBankHash,
    baselineVectorHash: state.hashes.baselineVectorHash,
    candidateAVectorHash: state.hashes.candidateAVectorHash,
    personaDescriptionHash: state.hashes.personaDescriptionHash,
    scoringRuleVersion: SCORING_RULE_VERSION,
    vectorVersions: {
      baseline: state.baseline.sourceVersion ?? 'baseline',
      candidateA: state.candidateA.sourceVersion ?? 'candidate-A',
    },
    testFixtureId: isDeployBuild ? null : state.testFixtureId,
    answerSequence,
    answers: { ...state.answers },
    constructScores: comparison.baseline.constructScores,
    baselineTop5: comparison.baseline.top5,
    candidateATop5: comparison.candidateA.top5,
    baselineGap: comparison.baseline.top1Top2Gap,
    candidateAGap: comparison.candidateA.top1Top2Gap,
    baselineLowConfidence: comparison.baseline.lowConfidence,
    candidateALowConfidence: comparison.candidateA.lowConfidence,
    resultAgreement: comparison.resultAgreement,
    publicDisplayedPersona: publicMeta.publicDisplayedPersona,
    publicResultWordingMode: publicMeta.publicResultWordingMode,
    blendedPersonalizationUsed: publicMeta.blendedPersonalizationUsed,
    blendedConstructs: publicMeta.blendedConstructs,
    anonymousCardOrder: state.anonymousCardOrder,
    userPreferredResult: preferredSourceFromCard(),
    resultExplanationViewed: Boolean(state.feedbackStartedAt),
    resultExplanationSufficient: selectedRadio('resultExplanationSufficient'),
    fitJudgmentValid: fitJudgmentStatus().valid,
    fitJudgmentInvalidReason: fitJudgmentStatus().reason,
    confidenceUnderstood: selectedRadio('confidenceUnderstood'),
    resultReadDurationMs: state.resultShownAt && state.feedbackStartedAt ? state.feedbackStartedAt - state.resultShownAt : null,
    fullExplanationOpened: state.fullExplanationOpened,
    top1Top2ComparisonViewed: state.comparisonViewed,
    overallFitScore: Number($('#overallFitScore').value),
    top1FitScore: Number($('#overallFitScore').value),
    top2FitScore: null,
    top2MoreAccurate: false,
    selectedBestPersona: selectedBestPersona(),
    cardFitScores: null,
    top3ContainsFit: null,
    mostFitText: $('#mostFitText').value.trim(),
    leastFitText: $('#leastFitText').value.trim(),
    inaccurateRelationshipArea: $('#inaccurateRelationshipArea').value.trim(),
    unableToJudge: selectedRadio('resultExplanationSufficient') === 'no' || selectedRadio('selectedBestPersona') === 'insufficient' || selectedRadio('preferredCard') === 'insufficient',
    difficultQuestionIds: flaggedQuestionIds('difficult'),
    unclearQuestionIds: flaggedQuestionIds('unclear'),
    bothFitQuestionIds: flaggedQuestionIds('bothFit'),
    noneFitQuestionIds: flaggedQuestionIds('noneFit'),
    correctAnswerFeelingQuestionIds: flaggedQuestionIds('correctAnswer'),
    correctAnswerFeeling: selectedRadio('correctAnswerFeeling'),
    shareIntent: selectedRadio('shareIntent'),
    optionalSelfDescription: $('#selfDescription').value.trim().slice(0, 100),
    optionalSelfPersonaGuess: $('#selfPersonaGuess').value.trim(),
    privacyMode: 'local-only-manual-json-export',
    deployMode: isDeployBuild ? 'pilot-deploy' : 'development',
  });
}

function downloadJson(record) {
  const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `pilot-${record.pilotId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

init().catch((error) => {
  setInitState('error', `加载失败：${error.message}`);
  console.error(error);
});
