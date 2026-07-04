import { createSeededRng } from './utils.js';

export function currentQuestion(questionBank, state) {
  return questionBank.questions[state.currentQuestionIndex];
}

export function ensureOptionOrder(question, state) {
  if (!state.optionOrder[question.id]) {
    const rng = createSeededRng(`heart-island-v2-alpha:${question.id}`);
    const order = question.options.map((option) => option.id);
    for (let index = order.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(rng() * (index + 1));
      [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
    }
    state.optionOrder[question.id] = order;
  }
  return state.optionOrder[question.id];
}

export function orderedOptions(question, state) {
  const optionMap = new Map(question.options.map((option) => [option.id, option]));
  return ensureOptionOrder(question, state).map((id) => optionMap.get(id)).filter(Boolean);
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
