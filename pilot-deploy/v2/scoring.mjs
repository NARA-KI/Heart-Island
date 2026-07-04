export const LOW_CONFIDENCE_GAP = 2.5;
export const LOW_CONFIDENCE_TOP3_SPREAD = 5;

export function createSeededRng(seedText) {
  let seed = 2166136261;
  for (let index = 0; index < String(seedText).length; index += 1) {
    seed ^= String(seedText).charCodeAt(index);
    seed = Math.imul(seed, 16777619);
  }
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffledOptions(options, seedText) {
  const rng = createSeededRng(seedText);
  const list = [...options];
  for (let index = list.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [list[index], list[swapIndex]] = [list[swapIndex], list[index]];
  }
  return list;
}

export function validateQuestionnaire(questionBank, personaData) {
  const errors = [];
  if (!Array.isArray(questionBank?.constructs) || questionBank.constructs.length !== 15) errors.push('construct count must be 15');
  if (!Array.isArray(questionBank?.questions) || questionBank.questions.length !== 60) errors.push('question count must be 60');
  if (!Array.isArray(personaData?.personas) || personaData.personas.length !== 15) errors.push('persona count must be 15');

  for (const question of questionBank.questions ?? []) {
    if (!question.id || !question.construct || typeof question.question !== 'string') errors.push(`invalid question ${question.id ?? '(missing id)'}`);
    if (!questionBank.constructs.includes(question.construct)) errors.push(`unknown construct ${question.construct} in ${question.id}`);
    if (!Array.isArray(question.options) || question.options.length !== 4) errors.push(`${question.id} must have four options`);
    for (const option of question.options ?? []) {
      if (!['A', 'B', 'C', 'D'].includes(option.id)) errors.push(`${question.id} has invalid option id ${option.id}`);
      if (![0, 33, 67, 100].includes(option.score)) errors.push(`${question.id}/${option.id} has invalid score ${option.score}`);
    }
  }

  for (const persona of personaData.personas ?? []) {
    for (const construct of questionBank.constructs ?? []) {
      if (typeof persona.targetVector?.[construct] !== 'number') errors.push(`${persona.displayName} missing targetVector.${construct}`);
    }
  }

  if (errors.length) throw new Error(errors.join('\n'));
}

export function scoreAnswers(questionBank, personaData, answers) {
  validateQuestionnaire(questionBank, personaData);
  const constructs = questionBank.constructs;
  const questionsById = new Map(questionBank.questions.map((question) => [question.id, question]));
  const constructValues = Object.fromEntries(constructs.map((construct) => [construct, []]));

  for (const question of questionBank.questions) {
    const answer = answers[question.id];
    if (!answer) throw new Error(`Missing answer for ${question.id}`);
    const option = question.options.find((item) => item.id === answer);
    if (!option) throw new Error(`Invalid answer ${answer} for ${question.id}`);
    constructValues[question.construct].push(option.score);
  }

  const constructScores = Object.fromEntries(constructs.map((construct) => {
    const values = constructValues[construct];
    if (values.length !== 4) throw new Error(`Construct ${construct} expected 4 answers, got ${values.length}`);
    return [construct, Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2))];
  }));

  const top5 = personaData.personas.map((persona) => {
    const squared = constructs.reduce((sum, construct) => {
      const delta = constructScores[construct] - persona.targetVector[construct];
      return sum + delta * delta;
    }, 0);
    const distance = Math.sqrt(squared / constructs.length);
    return {
      id: persona.id,
      displayName: persona.displayName,
      distance: Number(distance.toFixed(4)),
      similarity: Number(Math.max(0, 100 - distance).toFixed(2)),
    };
  }).sort((a, b) => a.distance - b.distance || a.displayName.localeCompare(b.displayName, 'zh-Hans-CN')).slice(0, 5);

  const top1Top2Gap = Number((top5[1].distance - top5[0].distance).toFixed(4));
  const top3Spread = Number((top5[2].distance - top5[0].distance).toFixed(4));
  const allMiddle = constructs.every((construct) => constructScores[construct] >= 40 && constructScores[construct] <= 60);

  return {
    constructScores,
    top5,
    top1: top5[0].displayName,
    top1Top2Gap,
    top3Spread,
    lowConfidence: top1Top2Gap < LOW_CONFIDENCE_GAP || top3Spread < LOW_CONFIDENCE_TOP3_SPREAD || allMiddle,
  };
}

export function compareTwoSchemes(questionBank, baselineData, candidateAData, answers) {
  const baseline = scoreAnswers(questionBank, baselineData, answers);
  const candidateA = scoreAnswers(questionBank, candidateAData, answers);
  return {
    baseline,
    candidateA,
    resultAgreement: baseline.top1 === candidateA.top1,
  };
}

export function normalizeExportRecord(record) {
  return {
    ...record,
    timestamp: record.timestamp ?? new Date().toISOString(),
    questionnaireVersion: record.questionnaireVersion ?? 'heart-island-v2-question-bank-draft',
  };
}

export function encodePilotRecord(record) {
  const json = JSON.stringify(record);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `HI2PILOT:${btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')}`;
}

export function decodePilotRecord(code) {
  const text = String(code).trim();
  if (!text.startsWith('HI2PILOT:')) throw new Error('Unsupported pilot result code');
  let base64 = text.slice('HI2PILOT:'.length).replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}
