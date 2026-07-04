export function createInitialState() {
  return {
    view: 'home',
    currentQuestionIndex: 0,
    answers: {},
    optionOrder: {},
    startedAt: null,
    completedAt: null,
    result: null,
    restoreNotice: null,
  };
}

export function hydrateState(saved, questionBank) {
  const state = createInitialState();
  state.currentQuestionIndex = Math.min(
    Math.max(Number(saved.currentQuestionIndex ?? 0), 0),
    questionBank.questions.length - 1,
  );
  state.answers = sanitizeAnswers(saved.answers ?? {}, questionBank);
  state.optionOrder = sanitizeOptionOrder(saved.optionOrder ?? {}, questionBank);
  state.startedAt = saved.startedAt ?? new Date().toISOString();
  state.completedAt = saved.completedAt ?? null;
  state.view = Object.keys(state.answers).length >= questionBank.questions.length ? 'transition' : 'quiz';
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
