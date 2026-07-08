const OPTION_DISPLAY_ORDER = ['A', 'B', 'C', 'D'];
const OPTION_DISPLAY_RANK = new Map(OPTION_DISPLAY_ORDER.map((id, index) => [id, index]));

export function currentQuestion(questionBank, state) {
  return questionBank.questions[state.currentQuestionIndex];
}

export function ensureOptionOrder(question, state) {
  const order = [...question.options].sort(stableOptionComparator).map((option) => option.id);
  state.optionOrder[question.id] = order;
  return state.optionOrder[question.id];
}

export function orderedOptions(question, state) {
  ensureOptionOrder(question, state);
  return [...question.options].sort(stableOptionComparator);
}

export function stableOptionComparator(a, b) {
  const rankA = OPTION_DISPLAY_RANK.get(a.id);
  const rankB = OPTION_DISPLAY_RANK.get(b.id);
  if (rankA !== undefined || rankB !== undefined) {
    return (rankA ?? Number.MAX_SAFE_INTEGER) - (rankB ?? Number.MAX_SAFE_INTEGER);
  }
  return String(a.id).localeCompare(String(b.id));
}

export function answerQuestion(questionBank, state, questionId, optionId) {
  const question = questionBank.questions.find((item) => item.id === questionId);
  if (!question) throw new Error(`Unknown question ${questionId}`);
  if (!question.options.some((option) => option.id === optionId)) throw new Error(`Unknown option ${optionId} for ${questionId}`);
  state.answers[questionId] = optionId;
  state.currentQuestionIndex = questionBank.questions.findIndex((item) => item.id === questionId);
}

export function goNext(questionBank, state) {
  if (state.currentQuestionIndex < questionBank.questions.length - 1) {
    state.currentQuestionIndex += 1;
    return 'quiz';
  }
  return 'transition';
}

export function goPrevious(state) {
  state.currentQuestionIndex = Math.max(0, state.currentQuestionIndex - 1);
}
