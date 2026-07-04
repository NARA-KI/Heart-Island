import { CANONICAL_PERSONA_NAMES, V2_EXPECTED_CONSTRUCTS } from './config.js';

export function validateV2Data({ questionBank, personaData, descriptions }) {
  const errors = [];
  const questionIds = new Set();
  const personaIds = new Set();
  const personaNames = new Set();

  if (!Array.isArray(questionBank?.constructs)) {
    errors.push('questionBank.constructs must be an array');
  } else {
    for (const construct of V2_EXPECTED_CONSTRUCTS) {
      if (!questionBank.constructs.includes(construct)) errors.push(`missing construct ${construct}`);
    }
  }

  if (!Array.isArray(questionBank?.questions) || questionBank.questions.length !== 60) {
    errors.push(`question count must be 60, got ${questionBank?.questions?.length ?? 0}`);
  }

  for (const question of questionBank?.questions ?? []) {
    if (!question.id) errors.push('question is missing id');
    if (questionIds.has(question.id)) errors.push(`duplicate question id ${question.id}`);
    questionIds.add(question.id);

    if (!questionBank.constructs?.includes(question.construct)) {
      errors.push(`${question.id} has unknown construct ${question.construct}`);
    }
    if (typeof question.reverse !== 'boolean') {
      errors.push(`${question.id} reverse must be boolean`);
    }
    if (typeof question.question !== 'string' || !question.question.trim()) {
      errors.push(`${question.id} question text is empty`);
    }
    if (!Array.isArray(question.options) || question.options.length !== 4) {
      errors.push(`${question.id} must have four options`);
      continue;
    }
    const optionIds = new Set();
    for (const option of question.options) {
      if (!['A', 'B', 'C', 'D'].includes(option.id)) errors.push(`${question.id} invalid option id ${option.id}`);
      if (optionIds.has(option.id)) errors.push(`${question.id} duplicate option id ${option.id}`);
      optionIds.add(option.id);
      if (typeof option.text !== 'string' || !option.text.trim()) errors.push(`${question.id}/${option.id} option text is empty`);
      if (![0, 33, 67, 100].includes(option.score)) errors.push(`${question.id}/${option.id} invalid score ${option.score}`);
    }
  }

  if (!Array.isArray(personaData?.personas) || personaData.personas.length !== 15) {
    errors.push(`persona count must be 15, got ${personaData?.personas?.length ?? 0}`);
  }

  for (const persona of personaData?.personas ?? []) {
    if (!persona.id) errors.push('persona is missing id');
    if (personaIds.has(persona.id)) errors.push(`duplicate persona id ${persona.id}`);
    personaIds.add(persona.id);
    if (personaNames.has(persona.displayName)) errors.push(`duplicate persona displayName ${persona.displayName}`);
    personaNames.add(persona.displayName);
    if (!CANONICAL_PERSONA_NAMES.includes(persona.displayName)) errors.push(`non-canonical persona name ${persona.displayName}`);
    for (const construct of V2_EXPECTED_CONSTRUCTS) {
      const value = persona.targetVector?.[construct];
      if (typeof value !== 'number' || Number.isNaN(value)) errors.push(`${persona.displayName} missing targetVector.${construct}`);
    }
  }

  for (const name of CANONICAL_PERSONA_NAMES) {
    if (!personaNames.has(name)) errors.push(`missing canonical persona ${name}`);
  }

  if (descriptions) {
    const descriptionIds = new Set((descriptions.personas ?? []).map((persona) => persona.id));
    for (const persona of personaData?.personas ?? []) {
      if (!descriptionIds.has(persona.id)) errors.push(`missing description for ${persona.id}`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    questionCount: questionBank?.questions?.length ?? 0,
    constructCount: questionBank?.constructs?.length ?? 0,
    personaCount: personaData?.personas?.length ?? 0,
  };
}

export function assertV2Data(data) {
  const result = validateV2Data(data);
  if (!result.ok) throw new Error(result.errors.join('\n'));
  return result;
}

export function scoreAnswers(questionBank, personaData, answers) {
  assertV2Data({ questionBank, personaData });
  const constructValues = Object.fromEntries(questionBank.constructs.map((construct) => [construct, []]));
  const answerDebug = [];

  for (const question of questionBank.questions) {
    const optionId = answers[question.id];
    if (!optionId) throw new Error(`Missing answer for ${question.id}`);
    const option = question.options.find((item) => item.id === optionId);
    if (!option) throw new Error(`Invalid answer ${optionId} for ${question.id}`);

    // Important: V2 frozen options already store the final normalized construct
    // score. `reverse` is audit metadata only; runtime scoring must not invert a
    // reverse item a second time. Regression tests lock this behavior.
    const normalizedScore = option.score;
    constructValues[question.construct].push(normalizedScore);
    answerDebug.push({
      questionId: question.id,
      construct: question.construct,
      reverse: question.reverse,
      optionId,
      rawScore: option.score,
      normalizedScore,
    });
  }

  const constructScores = Object.fromEntries(questionBank.constructs.map((construct) => {
    const values = constructValues[construct];
    if (values.length !== 4) throw new Error(`Construct ${construct} expected 4 answers, got ${values.length}`);
    return [construct, Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2))];
  }));

  const personaScores = personaData.personas.map((persona, index) => {
    const squared = questionBank.constructs.reduce((sum, construct) => {
      const delta = constructScores[construct] - persona.targetVector[construct];
      return sum + delta * delta;
    }, 0);
    const distance = Math.sqrt(squared / questionBank.constructs.length);
    return {
      id: persona.id,
      displayName: persona.displayName,
      distance: Number(distance.toFixed(4)),
      matchScore: Number(Math.max(0, 100 - distance).toFixed(2)),
      order: index,
    };
  }).sort((a, b) => a.distance - b.distance || a.order - b.order);

  const top5 = personaScores.slice(0, 5);
  const tieDistance = top5[0].distance;
  const tied = personaScores.filter((persona) => persona.distance === tieDistance);

  return {
    scoringProfile: personaData.scoringProfile ?? 'candidate-a',
    constructScores,
    normalizedConstructScores: constructScores,
    personaScores,
    top5,
    finalPersona: top5[0],
    top1Top2Gap: Number((top5[1].distance - top5[0].distance).toFixed(4)),
    tieBreak: {
      tied: tied.length > 1,
      rule: 'distance ascending, then frozen persona order',
      tiedPersonaIds: tied.map((persona) => persona.id),
    },
    debug: {
      answerDebug,
      constructValues,
    },
  };
}
