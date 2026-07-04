import { compareTwoSchemes, createSeededRng, normalizeExportRecord, shuffledOptions } from './scoring.mjs';

const DATA_PATHS = {
  questionBank: '../../drafts/v2/question-bank.v2.draft.json',
  baseline: '../../drafts/v2/persona-target-vectors.v2.baseline.json',
  candidateA: '../../drafts/v2/persona-target-vectors.v2.candidate-a.json',
  fixtures: '../../drafts/v2/simulation-fixtures.v2.draft.json',
};

const state = {
  pilotId: crypto.randomUUID(),
  currentIndex: 0,
  questionBank: null,
  baseline: null,
  candidateA: null,
  fixtures: null,
  answers: {},
  flags: {},
  comparison: null,
  anonymousCardOrder: [],
  testFixtureId: null,
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
  preferenceField: $('#preferenceField'),
  cardFitFields: $('#cardFitFields'),
  downloadButton: $('#downloadButton'),
  restartButton: $('#restartButton'),
  feedbackForm: $('#feedbackForm'),
};

async function readJson(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Cannot load ${path}: ${response.status}`);
  return response.json();
}

async function init() {
  [state.questionBank, state.baseline, state.candidateA, state.fixtures] = await Promise.all([
    readJson(DATA_PATHS.questionBank),
    readJson(DATA_PATHS.baseline),
    readJson(DATA_PATHS.candidateA),
    readJson(DATA_PATHS.fixtures),
  ]);

  const params = new URLSearchParams(location.search);
  const fixtureId = params.get('fixture');
  if (fixtureId) loadFixture(fixtureId);

  bindEvents();
  window.__v2Pilot = {
    state,
    start: startPilot,
    finish: finishQuestionnaire,
    exportRecord: buildExportRecord,
    loadFixture,
  };
}

function bindEvents() {
  elements.startButton.addEventListener('click', startPilot);
  elements.prevButton.addEventListener('click', () => {
    state.currentIndex = Math.max(0, state.currentIndex - 1);
    renderQuestion();
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
    state.currentIndex += 1;
    renderQuestion();
  });
  elements.downloadButton.addEventListener('click', () => {
    if (!elements.feedbackForm.reportValidity()) return;
    downloadJson(buildExportRecord());
  });
  elements.restartButton.addEventListener('click', () => {
    localStorage.removeItem('heart-island-v2-pilot-draft');
    location.href = location.pathname;
  });
  bindRange('#overallFitScore', '#overallValue');
  bindRange('#top1FitScore', '#top1Value');
  bindRange('#cardAFitScore', '#cardAValue');
  bindRange('#cardBFitScore', '#cardBValue');
}

function bindRange(inputSelector, outputSelector) {
  const input = $(inputSelector);
  const output = $(outputSelector);
  input.addEventListener('input', () => {
    output.textContent = input.value;
  });
}

function loadFixture(fixtureId) {
  const fixture = state.fixtures?.fixtures?.find((item) => item.id === fixtureId);
  if (!fixture) throw new Error(`Unknown fixture ${fixtureId}`);
  state.testFixtureId = fixtureId;
  state.answers = { ...fixture.answers };
}

function startPilot() {
  elements.introView.classList.add('hidden');
  elements.resultView.classList.add('hidden');
  elements.questionView.classList.remove('hidden');
  renderQuestion();
}

function currentQuestion() {
  return state.questionBank.questions[state.currentIndex];
}

function renderQuestion() {
  const question = currentQuestion();
  const total = state.questionBank.questions.length;
  elements.progressText.textContent = `${String(state.currentIndex + 1).padStart(2, '0')} / ${total}`;
  elements.progressBar.style.width = `${((state.currentIndex + 1) / total) * 100}%`;
  elements.questionTitle.textContent = question.question;
  elements.optionList.innerHTML = '';

  for (const option of shuffledOptions(question.options, `heart-island-v2-pilot:${question.id}`)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `option-button${state.answers[question.id] === option.id ? ' selected' : ''}`;
    button.textContent = option.text;
    button.addEventListener('click', () => {
      state.answers[question.id] = option.id;
      saveDraft();
      renderQuestion();
    });
    elements.optionList.append(button);
  }

  renderFlags(question.id);
  elements.prevButton.disabled = state.currentIndex === 0;
  elements.nextButton.textContent = state.currentIndex === total - 1 ? '查看结果' : '下一题';
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
  localStorage.setItem('heart-island-v2-pilot-draft', JSON.stringify({
    pilotId: state.pilotId,
    answers: state.answers,
    flags: state.flags,
    testFixtureId: state.testFixtureId,
  }));
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
  const { baseline, candidateA, resultAgreement } = state.comparison;
  elements.resultCards.innerHTML = '';
  elements.preferenceField.classList.toggle('hidden', resultAgreement);
  elements.cardFitFields.classList.toggle('hidden', resultAgreement);
  elements.resultHint.textContent = resultAgreement
    ? '两套候选向量得到相同 Top1。请根据结果本身评价贴合度。'
    : '两套候选向量得到不同 Top1。页面只展示匿名结果 A / B，不标注来源。';

  if (resultAgreement) {
    elements.resultCards.append(resultCard('结果', baseline));
    return;
  }

  for (const item of state.anonymousCardOrder) {
    elements.resultCards.append(resultCard(`结果 ${item.label}`, item.source === 'baseline' ? baseline : candidateA));
  }
}

function resultCard(title, result) {
  const card = document.createElement('article');
  card.className = 'result-card';
  const topList = result.top5.map((item, index) => `<li>Top${index + 1}：${item.displayName} · 距离 ${item.distance}</li>`).join('');
  card.innerHTML = `
    <p class="eyebrow">${title}</p>
    <h3>${result.top1}</h3>
    <p class="muted">Top1-Top2 gap：${result.top1Top2Gap} · ${result.lowConfidence ? '低置信' : '较明确'}</p>
    <ul class="top-list">${topList}</ul>
  `;
  return card;
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
  const card = state.anonymousCardOrder.find((item) => item.label === preferredCard);
  return card?.source ?? null;
}

function buildExportRecord() {
  const comparison = state.comparison ?? compareTwoSchemes(state.questionBank, state.baseline, state.candidateA, state.answers);
  const answerSequence = state.questionBank.questions.map((question) => ({
    questionId: question.id,
    optionId: state.answers[question.id],
  }));

  return normalizeExportRecord({
    pilotId: state.pilotId,
    timestamp: new Date().toISOString(),
    questionnaireVersion: state.questionBank.sourceVersion ?? 'heart-island-v2-question-bank-draft',
    vectorVersions: {
      baseline: state.baseline.sourceVersion ?? 'baseline',
      candidateA: state.candidateA.sourceVersion ?? 'candidate-A',
    },
    testFixtureId: state.testFixtureId,
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
    anonymousCardOrder: state.anonymousCardOrder,
    userPreferredResult: preferredSourceFromCard(),
    overallFitScore: Number($('#overallFitScore').value),
    top1FitScore: Number($('#top1FitScore').value),
    cardFitScores: comparison.resultAgreement ? null : {
      A: Number($('#cardAFitScore').value),
      B: Number($('#cardBFitScore').value),
    },
    top3ContainsFit: selectedRadio('top3ContainsFit'),
    mostFitText: $('#mostFitText').value.trim(),
    leastFitText: $('#leastFitText').value.trim(),
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
  });
}

function downloadJson(record) {
  const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `heart-island-v2-pilot-${record.pilotId}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

init().catch((error) => {
  document.body.innerHTML = `<main class="app-shell"><section class="intro"><h1>加载失败</h1><p class="notice">${error.message}</p></section></main>`;
  console.error(error);
});
