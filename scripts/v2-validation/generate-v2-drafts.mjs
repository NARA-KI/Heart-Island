import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const writeJson = (p, data) => {
  fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true });
  fs.writeFileSync(path.join(root, p), JSON.stringify(data, null, 2) + '\n', 'utf8');
};

const draftMd = read('reports/heart-island-v2-question-bank-and-scoring-draft.md');
const prepMd = read('reports/heart-island-v2-question-bank-audit-pass-2-prep.md');
const archMd = read('reports/heart-island-v2-personality-questionnaire-scoring-architecture.md');

function parseQuestionBlocks(md, mode = 'original') {
  const out = new Map();
  const re = /### v2-q(\d{2})[^\n]*([\s\S]*?)(?=\n### v2-q\d{2}|\n## |$)/g;
  for (const match of md.matchAll(re)) {
    const id = `v2-q${match[1]}`;
    const block = match[2];
    const construct = (block.match(mode === 'original' ? /构念代码：([A-Z]{2})/ : /所属构念：[^\n]*\s([A-Z]{2})/) || [])[1];
    const reverseRaw = (block.match(/是否反向题：\s*(true|false)/) || [])[1];
    const question = (block.match(mode === 'original' ? /题干：(.+)/ : /修改后题干：(.+)/) || [])[1]?.trim();
    const options = [];
    for (const optionMatch of block.matchAll(/^\s*-\s*([A-D])\.\s*(.+)$/gm)) {
      const optionId = optionMatch[1];
      const score = (block.match(new RegExp(`^\\s*-\\s*${optionId}:\\s*(0|33|67|100)\\s*$`, 'm')) || [])[1];
      if (score) options.push({ id: optionId, text: optionMatch[2].trim(), score: Number(score) });
    }
    if (construct && question && options.length === 4) {
      out.set(id, { id, construct, reverse: reverseRaw === 'true', question, options });
    }
  }
  return out;
}

const questions = parseQuestionBlocks(draftMd, 'original');
const prepQuestions = parseQuestionBlocks(prepMd, 'prep');
for (const [id, question] of prepQuestions) {
  questions.set(id, {
    ...questions.get(id),
    ...question,
    sourceVersion: 'pass-2-prep',
    reviewStatus: 'pass-2-prep-modified-pending-isolated-validation',
  });
}

const finalOverrides = {
  'v2-q06': {
    question: '对方有件事没有解释完整，你能感觉到还有一点空白。你第一反应更接近哪一种？',
    options: [
      ['A', '我会先相信这里面未必有问题。', 100],
      ['B', '我会保留疑问，但不急着下判断。', 67],
      ['C', '我会很快往不好的方向联想。', 0],
      ['D', '我会先把这份空白放在心里，对关系多一点保留。', 33],
    ],
  },
  'v2-q11': {
    question: '对方希望你们更快进入稳定节奏，但你心里还没准备好。你身体里的第一反应更像什么？',
    options: [
      ['A', '我会跟上对方节奏，先让关系继续推进。', 0],
      ['B', '我会需要更多时间，确认自己是否舒服。', 67],
      ['C', '我会先守住自己的节奏，不急着被关系推着走。', 100],
      ['D', '我会试着适应，但心里会保留一点空间。', 33],
    ],
  },
  'v2-q15': {
    question: '关系进入稳定期后，需要有人持续维护它的节奏、回应和方向。你更接近哪种状态？',
    options: [
      ['A', '我愿意把这件事认真放进日常里。', 67],
      ['B', '我可以配合，但不想让关系变成任务。', 33],
      ['C', '我会主动维护节奏，让关系不只靠感觉。', 100],
      ['D', '我更希望关系自然发展，不太想经营太多。', 0],
    ],
  },
  'v2-q21': {
    question: '你们开始讨论未来一段时间这段关系要如何持续。你更在意这件事说明什么？',
    options: [
      ['A', '说明彼此愿意把关系放进生活计划里。', 67],
      ['B', '我会把它当作一次普通讨论，不太视为承诺。', 0],
      ['C', '我会在意这些约定能不能被持续维护。', 100],
      ['D', '我会有点压力，但仍愿意慢慢尝试。', 33],
    ],
  },
  'v2-q28': {
    question: '对方遇到一段压力很大的时期。你最自然的反应是什么？',
    options: [
      ['A', '我会先问对方现在最需要哪种支持。', 67],
      ['B', '我会很快进入支持状态，先补上自己能做的部分。', 100],
      ['C', '我会关心对方，但不急着替对方处理。', 33],
      ['D', '我更倾向尊重对方自己处理。', 0],
    ],
  },
  'v2-q32': {
    question: '对方反复遇到相似问题，每次都很依赖你。你最容易怎么做？',
    options: [
      ['A', '我会自然靠近，继续给出自己能给的帮忙。', 100],
      ['B', '我会支持，但也会把责任还给对方。', 33],
      ['C', '我会减少介入，让对方自己面对。', 0],
      ['D', '我会先安抚，再一起找更长期的办法。', 67],
    ],
  },
  'v2-q36': {
    question: '对方的问题反复出现，你已经有些累了。你最自然的第一反应是什么？',
    options: [
      ['A', '我会先确认自己还能给出多少支持。', 33],
      ['B', '我会继续靠近，因为很难看着对方一个人撑。', 100],
      ['C', '我会陪对方看问题，但不自动接手。', 67],
      ['D', '我会先拉开，让对方自己处理。', 0],
    ],
  },
  'v2-q41': {
    question: '当你心里有不舒服，但事情还没严重到争吵，你通常会怎么处理？',
    options: [
      ['A', '我会找个合适时机把重点说出来。', 100],
      ['B', '我会先收在心里，不太主动提起。', 0],
      ['C', '我会用一些反应让对方察觉。', 33],
      ['D', '我会先整理语言，再轻一点说。', 67],
    ],
  },
  'v2-q47': {
    question: '你被对方误解了，而且当下气氛有点急。你最可能怎样表达自己的重点？',
    options: [
      ['A', '我会当场把核心意思说清楚。', 100],
      ['B', '我会先说出最关键的一句话，让对方知道重点。', 67],
      ['C', '我会用反问让对方知道他误会了。', 33],
      ['D', '我会先不解释，等对方自己慢慢理解。', 0],
    ],
  },
  'v2-q50': {
    question: '你明明有话想说，但担心说出来会让气氛变差。你更可能怎么做？',
    options: [
      ['A', '我会先收住，暂时不把话说出来。', 0],
      ['B', '我会用比较间接的方式让对方知道。', 33],
      ['C', '我会挑一句最轻的话先开口。', 67],
      ['D', '我会尽量直接说出自己的感受和需要。', 100],
    ],
  },
  'v2-q58': {
    question: '一段关系已经结束，但很多细节还会在某些时刻回来。你通常会怎样处理这些记忆？',
    options: [
      ['A', '我会让它们留下，像我生命里的一部分。', 67],
      ['B', '我会尽量少想，过去就让它过去。', 0],
      ['C', '我会整理它们，理解自己为什么在意。', 100],
      ['D', '我会偶尔回到这些细节，试着给这段关系一个说法。', 33],
    ],
  },
};

for (const [id, override] of Object.entries(finalOverrides)) {
  const base = questions.get(id);
  if (!base) throw new Error(`Missing question ${id}`);
  questions.set(id, {
    ...base,
    question: override.question,
    options: override.options.map(([optionId, text, score]) => ({ id: optionId, text, score })),
    sourceVersion: 'v2.0-question-bank-isolated-scoring-validation-user-final',
    reviewStatus: 'user-approved-final-text-for-isolated-validation',
  });
}

for (const question of questions.values()) {
  question.sourceVersion ??= 'heart-island-v2-question-bank-and-scoring-draft';
  question.reviewStatus ??= 'original-candidate-pending-isolated-validation';
}

const questionArray = [...questions.values()].sort((a, b) => a.id.localeCompare(b.id));
if (questionArray.length !== 60) throw new Error(`Expected 60 questions, got ${questionArray.length}`);

const constructOrder = ['SC', 'AU', 'TR', 'CL', 'PA', 'CM', 'SI', 'NV', 'RM', 'CS', 'EC', 'CR', 'ER', 'RI', 'MN'];
const personaNameMap = new Map([
  ['灯塔型', '灯塔型'],
  ['守门人型', '守门人'],
  ['筑巢型', '筑巢型'],
  ['收藏家型', '收藏家'],
  ['候鸟型', '候鸟型'],
  ['岛屿型', '岛屿型'],
  ['远航者型', '探险家'],
  ['流浪诗人型', '流浪诗人'],
  ['星火型', '星火型'],
  ['月光型', '月光型'],
  ['镜像型', '镜像型'],
  ['观星者型', '观星者'],
  ['合拍规划型', '同行者'],
  ['信任港湾型', '港湾型'],
  ['潮汐修复型', '摆渡人'],
]);
const personaIds = new Map([
  ['灯塔型', 'lighthouse'],
  ['守门人', 'gatekeeper'],
  ['筑巢型', 'nest-builder'],
  ['收藏家', 'collector'],
  ['候鸟型', 'migratory-bird'],
  ['岛屿型', 'islander'],
  ['探险家', 'explorer'],
  ['流浪诗人', 'wandering-poet'],
  ['星火型', 'spark'],
  ['月光型', 'moonlight'],
  ['镜像型', 'mirror'],
  ['观星者', 'stargazer'],
  ['同行者', 'companion'],
  ['港湾型', 'harbor'],
  ['摆渡人', 'ferryman'],
]);

const vectorRows = [...archMd.matchAll(/^\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*$/gm)];
const labelRows = [...archMd.matchAll(/^\|\s*([^|]+?)\s*\|\s*([A-Z]{2}(?:、[A-Z]{2})*)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*$/gm)];
const labels = new Map();
for (const row of labelRows) {
  const rawName = row[1].trim();
  if (!personaNameMap.has(rawName)) continue;
  const displayName = personaNameMap.get(rawName);
  const parseConstructList = (value) => value.trim().split('、').map((item) => item.trim()).filter((item) => constructOrder.includes(item));
  labels.set(displayName, {
    primaryConstructs: parseConstructList(row[2]),
    secondaryConstructs: parseConstructList(row[3]),
    lowConstructs: parseConstructList(row[4]),
    unresolvedNotes: `命名按当前展示名 ${displayName}；架构文档原名 ${rawName}。`,
  });
}

const personas = [];
for (const row of vectorRows) {
  const rawName = row[1].trim();
  if (!personaNameMap.has(rawName)) continue;
  const displayName = personaNameMap.get(rawName);
  const targetVector = Object.fromEntries(constructOrder.map((construct, index) => [construct, Number(row[index + 2])]));
  const label = labels.get(displayName) ?? {
    primaryConstructs: [],
    secondaryConstructs: [],
    lowConstructs: [],
    unresolvedNotes: '构念标注待确认。',
  };
  personas.push({
    id: personaIds.get(displayName),
    displayName,
    targetVector,
    primaryConstructs: label.primaryConstructs,
    secondaryConstructs: label.secondaryConstructs,
    lowConstructs: label.lowConstructs,
    source: 'reports/heart-island-v2-personality-questionnaire-scoring-architecture.md#候选人格-targetVector-初稿',
    confidence: 'draft-validation-only',
    unresolvedNotes: `${label.unresolvedNotes} targetVector 为验证用候选草案，不是正式人格参数。`,
  });
}
if (personas.length !== 15) throw new Error(`Expected 15 personas, got ${personas.length}`);

const questionsById = new Map(questionArray.map((question) => [question.id, question]));
function nearestOption(question, target) {
  return [...question.options].sort((a, b) => Math.abs(a.score - target) - Math.abs(b.score - target) || b.score - a.score || a.id.localeCompare(b.id))[0].id;
}
function answersForPersona(persona) {
  return Object.fromEntries(questionArray.map((question) => [question.id, nearestOption(question, persona.targetVector[question.construct])]));
}
function optionScore(questionId, answers) {
  const question = questionsById.get(questionId);
  return question.options.find((option) => option.id === answers[questionId]).score;
}
function optionByRank(questionId, rankKind) {
  const sorted = [...questionsById.get(questionId).options].sort((a, b) => a.score - b.score || a.id.localeCompare(b.id));
  return (rankKind === 'low' ? sorted[0] : rankKind === 'midLow' ? sorted[1] : rankKind === 'midHigh' ? sorted[2] : sorted[3]).id;
}
function shiftAnswer(answers, questionId, direction) {
  const sorted = [...questionsById.get(questionId).options].sort((a, b) => a.score - b.score || a.id.localeCompare(b.id));
  const index = sorted.findIndex((option) => option.id === answers[questionId]);
  answers[questionId] = sorted[Math.max(0, Math.min(sorted.length - 1, index + direction))].id;
}
function firstQuestionForConstruct(construct, offset = 0) {
  return questionArray.filter((question) => question.construct === construct)[offset % 4].id;
}
function makeFixture(id, expectedPersona, scenarioType, answers, changedQuestions, rationale, extra = {}) {
  return { id, expectedPersona, scenarioType, answers, changedQuestions, rationale, ...extra };
}

const fixtures = [];
const idealAnswersByPersona = new Map();
for (const persona of personas) {
  const answers = answersForPersona(persona);
  idealAnswersByPersona.set(persona.displayName, answers);
  fixtures.push(makeFixture(`ideal-${persona.id}-01`, persona.displayName, 'ideal-primary-persona', answers, [], `按 ${persona.displayName} 的候选 targetVector 逐题选择最接近选项。`));
}

for (const persona of personas) {
  const primary = persona.primaryConstructs[0] ?? constructOrder[0];
  const secondary = persona.secondaryConstructs[0] ?? constructOrder[1];
  const low = persona.lowConstructs[0] ?? constructOrder[2];
  const base = idealAnswersByPersona.get(persona.displayName);

  const primarySoftened = structuredClone(base);
  const primaryQuestion = firstQuestionForConstruct(primary, 0);
  shiftAnswer(primarySoftened, primaryQuestion, -1);
  fixtures.push(makeFixture(`perturb-${persona.id}-primary-soften-01`, persona.displayName, 'minor-perturbation', primarySoftened, [primaryQuestion], `核心构念 ${primary} 单题降低一档。`));

  const lowRaised = structuredClone(base);
  const lowQuestion = firstQuestionForConstruct(low, 1);
  shiftAnswer(lowRaised, lowQuestion, +1);
  fixtures.push(makeFixture(`perturb-${persona.id}-low-raised-02`, persona.displayName, 'minor-perturbation', lowRaised, [lowQuestion], `排斥构念 ${low} 单题提高一档。`));

  const mixed = structuredClone(base);
  const secondaryQuestion = firstQuestionForConstruct(secondary, 2);
  const lowQuestionTwo = firstQuestionForConstruct(low, 3);
  shiftAnswer(mixed, secondaryQuestion, -1);
  shiftAnswer(mixed, lowQuestionTwo, +1);
  fixtures.push(makeFixture(`perturb-${persona.id}-mixed-03`, persona.displayName, 'minor-perturbation', mixed, [secondaryQuestion, lowQuestionTwo], `辅助构念 ${secondary} 降一档，同时排斥构念 ${low} 升一档。`));
}

const confusableGroups = [
  ['lighthouse-moonlight-ferryman', ['灯塔型', '月光型', '摆渡人']],
  ['gatekeeper-islander-migratory', ['守门人', '岛屿型', '候鸟型']],
  ['nest-companion-harbor', ['筑巢型', '同行者', '港湾型']],
  ['explorer-spark-migratory', ['探险家', '星火型', '候鸟型']],
  ['collector-poet-stargazer', ['收藏家', '流浪诗人', '观星者']],
  ['mirror-harbor-ferryman', ['镜像型', '港湾型', '摆渡人']],
];
const personaByName = new Map(personas.map((persona) => [persona.displayName, persona]));
for (const [groupId, names] of confusableGroups) {
  for (const name of names) {
    const persona = personaByName.get(name);
    const neighbor = personaByName.get(names.find((candidate) => candidate !== name));
    const base = idealAnswersByPersona.get(name);

    const softened = structuredClone(base);
    const softenedQuestion = firstQuestionForConstruct(persona.primaryConstructs[0], 1);
    shiftAnswer(softened, softenedQuestion, -1);
    fixtures.push(makeFixture(`confusable-${groupId}-${persona.id}-soften-01`, name, 'confusable-contrast', softened, [softenedQuestion], `易混组 ${names.join(' vs ')}：降低 ${name} 的关键构念 ${persona.primaryConstructs[0]}。`, { confusableGroup: groupId }));

    const neighborRaised = structuredClone(base);
    const neighborConstruct = neighbor.primaryConstructs.find((construct) => !persona.primaryConstructs.includes(construct)) ?? neighbor.primaryConstructs[0];
    const raisedQuestion = firstQuestionForConstruct(neighborConstruct, 2);
    shiftAnswer(neighborRaised, raisedQuestion, +1);
    fixtures.push(makeFixture(`confusable-${groupId}-${persona.id}-neighbor-02`, name, 'confusable-contrast', neighborRaised, [raisedQuestion], `易混组 ${names.join(' vs ')}：抬高相邻人格关键构念 ${neighborConstruct}。`, { confusableGroup: groupId }));
  }
}

const riskCases = [
  ['v2-q06', '守门人'],
  ['v2-q11', '岛屿型'],
  ['v2-q15', '同行者'],
  ['v2-q21', '同行者'],
  ['v2-q28', '灯塔型'],
  ['v2-q32', '灯塔型'],
  ['v2-q36', '月光型'],
  ['v2-q38', '探险家'],
  ['v2-q41', '摆渡人'],
  ['v2-q47', '摆渡人'],
  ['v2-q50', '摆渡人'],
  ['v2-q57', '港湾型'],
  ['v2-q58', '收藏家'],
  ['v2-q60', '流浪诗人'],
];
for (const [questionId, expectedPersona] of riskCases) {
  const persona = personaByName.get(expectedPersona);
  const base = idealAnswersByPersona.get(expectedPersona);
  const answers = structuredClone(base);
  const score = optionScore(questionId, answers);
  answers[questionId] = score >= 67 ? optionByRank(questionId, 'low') : optionByRank(questionId, 'high');
  fixtures.push(makeFixture(`risk-${questionId}-${persona.id}-single-flip`, expectedPersona, 'risk-question-single-perturbation', answers, [questionId], `风险题 ${questionId} 单题翻转到${score >= 67 ? '低分' : '高分'}端。`, {
    baselineFixtureId: `ideal-${persona.id}-01`,
    riskQuestion: questionId,
  }));
}

for (const fixture of fixtures) {
  if (Object.keys(fixture.answers).length !== 60) throw new Error(`Fixture ${fixture.id} incomplete`);
}

writeJson('drafts/v2/question-bank.v2.draft.json', {
  schemaVersion: 'v2-question-bank-draft-1',
  sourceVersion: 'v2.0-question-bank-isolated-scoring-validation',
  generatedAt: new Date().toISOString(),
  notes: '隔离验证用 60 题候选题库草案；不接入生产代码。',
  constructs: constructOrder,
  questions: questionArray,
});
writeJson('drafts/v2/persona-target-vectors.v2.draft.json', {
  schemaVersion: 'v2-persona-target-vectors-draft-1',
  sourceVersion: 'reports/heart-island-v2-personality-questionnaire-scoring-architecture.md',
  generatedAt: new Date().toISOString(),
  vectorRule: '使用架构报告 11.2 的候选人格 targetVector 数值；仅用于隔离验证，不是正式人格参数。',
  constructs: constructOrder,
  personas,
});
writeJson('drafts/v2/simulation-fixtures.v2.draft.json', {
  schemaVersion: 'v2-simulation-fixtures-draft-1',
  sourceVersion: 'v2.0-question-bank-isolated-scoring-validation',
  generatedAt: new Date().toISOString(),
  fixtureCounts: {
    total: fixtures.length,
    idealPrimaryPersona: fixtures.filter((fixture) => fixture.scenarioType === 'ideal-primary-persona').length,
    minorPerturbation: fixtures.filter((fixture) => fixture.scenarioType === 'minor-perturbation').length,
    confusableContrast: fixtures.filter((fixture) => fixture.scenarioType === 'confusable-contrast').length,
    riskQuestionSinglePerturbation: fixtures.filter((fixture) => fixture.scenarioType === 'risk-question-single-perturbation').length,
  },
  fixtures,
});

console.log(`Generated ${questionArray.length} questions, ${personas.length} personas, ${fixtures.length} fixtures.`);
