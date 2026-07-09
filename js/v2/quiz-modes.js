export const QUIZ_MODE_QUICK = 'quick';
export const QUIZ_MODE_FULL = 'full';
export const QUIZ_MODES = Object.freeze({
  [QUIZ_MODE_QUICK]: Object.freeze({
    id: QUIZ_MODE_QUICK,
    title: '快速探索',
    reportTitle: '快速探索报告',
    questionCount: 30,
    durationLabel: '约 4-6 分钟',
  }),
  [QUIZ_MODE_FULL]: Object.freeze({
    id: QUIZ_MODE_FULL,
    title: '深度探索',
    reportTitle: '深度探索报告',
    questionCount: 60,
    durationLabel: '约 8-10 分钟',
  }),
});

export const QUICK_QUESTION_IDS = Object.freeze([
  'v2-q01', 'v2-q02', 'v2-q03', 'v2-q04', 'v2-q08', 'v2-q12',
  'v2-q13', 'v2-q14', 'v2-q15', 'v2-q22', 'v2-q23', 'v2-q24',
  'v2-q25', 'v2-q26', 'v2-q27', 'v2-q28', 'v2-q36', 'v2-q37',
  'v2-q38', 'v2-q39', 'v2-q41', 'v2-q42', 'v2-q43', 'v2-q50',
  'v2-q51', 'v2-q52', 'v2-q53', 'v2-q54', 'v2-q59', 'v2-q60',
]);

const QUICK_ID_SET = new Set(QUICK_QUESTION_IDS);

export function isQuizMode(value) {
  return value === QUIZ_MODE_QUICK || value === QUIZ_MODE_FULL;
}

export function getFullQuestionIds(questionBank) {
  return questionBank.questions.map((question) => question.id);
}

export function getQuickQuestionIds(questionBank) {
  return questionBank.questions
    .filter((question) => QUICK_ID_SET.has(question.id))
    .map((question) => question.id);
}

export function getRemainingQuestionIds(questionBank) {
  return questionBank.questions
    .filter((question) => !QUICK_ID_SET.has(question.id))
    .map((question) => question.id);
}

export function getOrderedQuestionIds(questionBank, mode, options = {}) {
  if (mode === QUIZ_MODE_QUICK) return getQuickQuestionIds(questionBank);
  if (mode === QUIZ_MODE_FULL && options.continuation === true) return getRemainingQuestionIds(questionBank);
  if (mode === QUIZ_MODE_FULL) return getFullQuestionIds(questionBank);
  return [];
}

export function createQuestionBankForIds(questionBank, questionIds) {
  const idSet = new Set(questionIds);
  const questions = questionBank.questions.filter((question) => idSet.has(question.id));
  if (questions.length !== idSet.size) {
    const known = new Set(questions.map((question) => question.id));
    const missing = questionIds.filter((id) => !known.has(id));
    throw new Error(`Unknown question ids: ${missing.join(', ')}`);
  }
  return {
    ...questionBank,
    questions,
    activeQuestionIds: questions.map((question) => question.id),
  };
}

export function createQuestionBankForMode(questionBank, mode) {
  const ids = mode === QUIZ_MODE_QUICK
    ? getQuickQuestionIds(questionBank)
    : getFullQuestionIds(questionBank);
  return createQuestionBankForIds(questionBank, ids);
}

export function pickAnswersForQuestionIds(answersByQuestionId, questionIds) {
  return Object.fromEntries(
    questionIds
      .filter((id) => answersByQuestionId[id])
      .map((id) => [id, answersByQuestionId[id]]),
  );
}

export function validateQuizQuestionSets(questionBank) {
  const fullIds = getFullQuestionIds(questionBank);
  const quickIds = getQuickQuestionIds(questionBank);
  const remainingIds = getRemainingQuestionIds(questionBank);
  const errors = [];
  const fullSet = new Set(fullIds);
  const quickSet = new Set(quickIds);
  const remainingSet = new Set(remainingIds);

  if (fullIds.length !== 60) errors.push(`full question count must be 60, got ${fullIds.length}`);
  if (quickIds.length !== 30) errors.push(`quick question count must be 30, got ${quickIds.length}`);
  if (quickSet.size !== quickIds.length) errors.push('quick question ids must be unique');
  if (remainingIds.length !== 30) errors.push(`remaining question count must be 30, got ${remainingIds.length}`);
  if (remainingIds.some((id) => quickSet.has(id))) errors.push('quick and remaining question sets must not overlap');
  if ([...quickSet, ...remainingSet].some((id) => !fullSet.has(id))) errors.push('question set contains unknown id');
  if (new Set([...quickSet, ...remainingSet]).size !== fullSet.size) errors.push('quick and remaining union must equal full set');

  for (const construct of questionBank.constructs) {
    const fullQuestions = questionBank.questions.filter((question) => question.construct === construct);
    const quickQuestions = fullQuestions.filter((question) => quickSet.has(question.id));
    if (fullQuestions.length !== 4) errors.push(`${construct} must have 4 full questions`);
    if (quickQuestions.length !== 2) errors.push(`${construct} must have 2 quick questions`);
    if (quickQuestions.filter((question) => question.reverse).length !== 1) {
      errors.push(`${construct} quick questions must contain exactly 1 reverse item`);
    }
  }

  if (errors.length) throw new Error(errors.join('\n'));
  return {
    fullIds,
    quickIds,
    remainingIds,
  };
}
