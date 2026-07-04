import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const writeJson = (p, data) => {
  fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true });
  fs.writeFileSync(path.join(root, p), JSON.stringify(data, null, 2) + '\n', 'utf8');
};
const writeText = (p, text) => {
  fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true });
  fs.writeFileSync(path.join(root, p), text, 'utf8');
};

const questionBank = readJson('drafts/v2/question-bank.v2.draft.json');
const personaData = readJson('drafts/v2/persona-target-vectors.v2.draft.json');
const fixtureData = readJson('drafts/v2/simulation-fixtures.v2.draft.json');

const constructs = questionBank.constructs;
const questions = questionBank.questions;
const personas = personaData.personas;
const fixtures = fixtureData.fixtures;

const questionsById = new Map(questions.map((question) => [question.id, question]));
const personaNames = personas.map((persona) => persona.displayName);

const adjacentGroups = [
  ['灯塔型', '月光型', '摆渡人'],
  ['守门人', '岛屿型', '候鸟型'],
  ['筑巢型', '同行者', '港湾型'],
  ['探险家', '星火型', '候鸟型'],
  ['收藏家', '流浪诗人', '观星者'],
  ['镜像型', '港湾型', '摆渡人'],
  ['筑巢型', '观星者', '同行者'],
  ['月光型', '镜像型', '港湾型'],
];
const adjacent = new Map(personaNames.map((name) => [name, new Set()]));
for (const group of adjacentGroups) {
  for (const name of group) {
    for (const other of group) {
      if (other !== name && adjacent.has(name)) adjacent.get(name).add(other);
    }
  }
}

function validateInputs() {
  const errors = [];
  if (questions.length !== 60) errors.push(`question count expected 60, got ${questions.length}`);
  if (personas.length !== 15) errors.push(`persona count expected 15, got ${personas.length}`);
  for (const question of questions) {
    if (!question.id || !question.construct || typeof question.reverse !== 'boolean' || !question.question) errors.push(`question ${question.id} missing required fields`);
    if (!constructs.includes(question.construct)) errors.push(`question ${question.id} invalid construct ${question.construct}`);
    if (!Array.isArray(question.options) || question.options.length !== 4) errors.push(`question ${question.id} option count invalid`);
    for (const option of question.options ?? []) {
      if (!['A', 'B', 'C', 'D'].includes(option.id) || ![0, 33, 67, 100].includes(option.score)) errors.push(`question ${question.id} invalid option ${JSON.stringify(option)}`);
    }
  }
  for (const persona of personas) {
    for (const construct of constructs) {
      if (typeof persona.targetVector?.[construct] !== 'number') errors.push(`persona ${persona.displayName} missing ${construct}`);
    }
  }
  for (const fixture of fixtures) {
    const answerIds = Object.keys(fixture.answers ?? {});
    if (answerIds.length !== 60) errors.push(`fixture ${fixture.id} answer count expected 60, got ${answerIds.length}`);
    for (const question of questions) {
      if (!['A', 'B', 'C', 'D'].includes(fixture.answers?.[question.id])) errors.push(`fixture ${fixture.id} missing answer ${question.id}`);
    }
  }
  if (errors.length) throw new Error(`Invalid v2 validation inputs:\n${errors.join('\n')}`);
}

function scoreFixture(fixture) {
  const values = Object.fromEntries(constructs.map((construct) => [construct, []]));
  for (const [questionId, answer] of Object.entries(fixture.answers)) {
    const question = questionsById.get(questionId);
    const option = question.options.find((item) => item.id === answer);
    values[question.construct].push(option.score);
  }
  const constructScores = Object.fromEntries(constructs.map((construct) => {
    const scores = values[construct];
    return [construct, Number((scores.reduce((sum, value) => sum + value, 0) / scores.length).toFixed(2))];
  }));
  const ranked = personas.map((persona) => {
    const squared = constructs.reduce((sum, construct) => {
      const delta = constructScores[construct] - persona.targetVector[construct];
      return sum + delta * delta;
    }, 0);
    const distance = Math.sqrt(squared / constructs.length);
    return {
      id: persona.id,
      displayName: persona.displayName,
      distance: Number(distance.toFixed(4)),
      similarity: Number((100 - distance).toFixed(4)),
    };
  }).sort((a, b) => a.distance - b.distance || a.displayName.localeCompare(b.displayName, 'zh-Hans-CN'));
  const top5 = ranked.slice(0, 5);
  const gap = Number((top5[1].distance - top5[0].distance).toFixed(4));
  const hit = top5[0].displayName === fixture.expectedPersona;
  const adjacentMiss = !hit && adjacent.get(fixture.expectedPersona)?.has(top5[0].displayName);
  return {
    fixtureId: fixture.id,
    expectedPersona: fixture.expectedPersona,
    scenarioType: fixture.scenarioType,
    changedQuestions: fixture.changedQuestions,
    constructScores,
    top5,
    top1: top5[0].displayName,
    top2: top5[1].displayName,
    top1Top2Gap: gap,
    hit,
    adjacentMiss: Boolean(adjacentMiss),
    nonAdjacentMiss: !hit && !adjacentMiss,
  };
}

function pct(numerator, denominator) {
  return denominator ? `${((numerator / denominator) * 100).toFixed(1)}%` : '0.0%';
}

function byScenario(type, results) {
  return results.filter((result) => result.scenarioType === type);
}

function summarizeScenario(type, results) {
  const group = byScenario(type, results);
  const hits = group.filter((result) => result.hit).length;
  const adjacentMisses = group.filter((result) => result.adjacentMiss).length;
  const nonAdjacentMisses = group.filter((result) => result.nonAdjacentMiss).length;
  return {
    type,
    total: group.length,
    hits,
    hitRate: pct(hits, group.length),
    adjacentMisses,
    nonAdjacentMisses,
  };
}

function countMap(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Object.fromEntries([...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-Hans-CN')));
}

function gapDistribution(results) {
  return {
    min: Number(Math.min(...results.map((r) => r.top1Top2Gap)).toFixed(4)),
    p25: percentile(results.map((r) => r.top1Top2Gap), 0.25),
    median: percentile(results.map((r) => r.top1Top2Gap), 0.5),
    p75: percentile(results.map((r) => r.top1Top2Gap), 0.75),
    max: Number(Math.max(...results.map((r) => r.top1Top2Gap)).toFixed(4)),
    smallGapUnder2: results.filter((r) => r.top1Top2Gap < 2).length,
    smallGapUnder5: results.filter((r) => r.top1Top2Gap < 5).length,
  };
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return Number(sorted[lower].toFixed(4));
  const weighted = sorted[lower] * (upper - index) + sorted[upper] * (index - lower);
  return Number(weighted.toFixed(4));
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map((cell) => String(cell).replace(/\n/g, '<br>')).join(' | ')} |`),
  ].join('\n');
}

function makeReport(summary, results, riskSensitivity) {
  const ideal = byScenario('ideal-primary-persona', results);
  const perturb = byScenario('minor-perturbation', results);
  const confusable = byScenario('confusable-contrast', results);
  const risk = byScenario('risk-question-single-perturbation', results);
  const scenarioRows = summary.scenarios.map((item) => [item.type, item.total, item.hits, item.hitRate, item.adjacentMisses, item.nonAdjacentMisses]);
  const idealRows = ideal.map((result) => [result.fixtureId, result.expectedPersona, result.top1, result.top2, result.top1Top2Gap, result.hit ? '命中' : result.adjacentMiss ? '相邻误判' : '非相邻误判']);
  const top1Rows = Object.entries(summary.top1Counts).map(([name, count]) => [name, count, summary.falseTop1Counts[name] ?? 0]);
  const riskRows = Object.values(riskSensitivity).map((item) => [item.questionId, item.total, item.top1Changed, pct(item.top1Changed, item.total), [...item.changedTo].join('、') || '无']);
  const problemQuestions = Object.values(riskSensitivity).filter((item) => item.top1Changed > 0).map((item) => item.questionId);
  const overFreq = Object.entries(summary.falseTop1Counts).filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]).map(([name]) => name);

  return `# 心岛 v2.0 隔离评分验证报告

## 1. 本轮真实执行摘要

这是**真实脚本执行**，不是人工推演。

本轮执行命令：

\`\`\`bash
node scripts/v2-validation/run-v2-simulation.mjs
\`\`\`

验证脚本只读取 \`drafts/v2\` 下的数据文件，不 import \`app.js\`，不 import \`core/scoring.mjs\`，不连接生产题库或 Beta 0.9.9.7 正式人格数据。

${markdownTable(['指标', '结果'], [
    ['fixture 总数', summary.totalFixtures],
    ['15 主性人格理想路径命中数', `${summary.idealHits}/${summary.idealTotal} (${pct(summary.idealHits, summary.idealTotal)})`],
    ['扰动路径命中率', `${summary.perturbHits}/${summary.perturbTotal} (${pct(summary.perturbHits, summary.perturbTotal)})`],
    ['易混人格命中率', `${summary.confusableHits}/${summary.confusableTotal} (${pct(summary.confusableHits, summary.confusableTotal)})`],
    ['风险题单题扰动 Top1 改变次数', `${summary.riskTop1Changes}/${summary.riskTotal}`],
    ['非相邻人格误判数', summary.nonAdjacentMisses],
    ['风险题压力是否通过', summary.riskTop1Changes === 0 ? '通过' : '未通过'],
  ])}

## 2. 本轮修改文件

${markdownTable(['文件', '用途'], [
    ['drafts/v2/question-bank.v2.draft.json', '完整 60 题 v2 候选题库隔离草案。'],
    ['drafts/v2/persona-target-vectors.v2.draft.json', '15 主性人格候选 targetVector 隔离草案。'],
    ['drafts/v2/simulation-fixtures.v2.draft.json', '完整 60 题 A/B/C/D 模拟 fixture。'],
    ['drafts/v2/validation-results.v2.draft.json', '脚本真实运行后的结构化结果。'],
    ['scripts/v2-validation/generate-v2-drafts.mjs', '从 reports 生成隔离草案数据。'],
    ['scripts/v2-validation/run-v2-simulation.mjs', '隔离评分验证脚本。'],
    ['reports/heart-island-v2-question-bank-isolated-scoring-validation.md', '本验证报告。'],
  ])}

## 3. 本轮未修改的生产文件

未修改：

- \`app.js\`
- \`index.html\`
- \`styles.css\`
- 当前正式题库
- \`core/scoring.mjs\`
- \`core/calibration-profiles.mjs\`
- Beta 0.9.9.7 正式人格数据
- \`deploy/\`
- \`release/\`

## 4. 数据来源与临时假设

${markdownTable(['数据', '来源', '说明'], [
    ['60 题候选题库', 'reports/heart-island-v2-question-bank-and-scoring-draft.md + pass-2/user final', '已合并 q06/q11/q15/q21/q28/q32/q36/q41/q47/q50/q57/q58 等最终/小修版本。'],
    ['15 主性人格', 'reports/heart-island-v2-personality-questionnaire-scoring-architecture.md', '使用报告中的候选 targetVector 初稿。'],
    ['模拟 fixture', 'drafts/v2/simulation-fixtures.v2.draft.json', '包含理想路径、扰动路径、易混对照、风险题单题扰动。'],
    ['评分算法', '本隔离脚本内透明实现', '每构念 4 题取平均；与候选 targetVector 做 15 维欧氏距离；距离越小越匹配。'],
  ])}

## 5. 题库草案完整性检查

${markdownTable(['检查项', '结果'], [
    ['题目数量', questionBank.questions.length],
    ['构念数量', questionBank.constructs.length],
    ['每题选项数', '4'],
    ['完整字段', 'id / construct / reverse / question / options / score / sourceVersion / reviewStatus 均存在'],
    ['是否只保存风险题', '否，保存完整 60 题'],
  ])}

## 6. targetVector 临时映射规则

本轮没有编造 targetVector。实际使用 \`reports/heart-island-v2-personality-questionnaire-scoring-architecture.md\` 中“候选人格 targetVector 初稿”的 15 维数值。

这些数值仅为**验证用候选 targetVector**，不得视为正式人格参数。

评分规则：

1. 读取每个 fixture 的完整 60 题答案。
2. 每题按选项分值得到单题构念分。
3. 每个构念 4 题取平均，得到 15 构念实际得分。
4. 对每个人格计算 15 维欧氏距离。
5. 距离越小排名越高，输出 Top5。
6. Top1-Top2 gap = Top2 distance - Top1 distance。

## 7. 模拟 fixture 规模

${markdownTable(['模拟类型', '组数', '命中数', '命中率', '相邻误判', '非相邻误判'], scenarioRows)}

## 8. 15 主性人格真实命中结果

${markdownTable(['Fixture', '预期人格', 'Top1', 'Top2', 'Gap', '结果'], idealRows)}

## 9. 扰动路径稳定性

${markdownTable(['指标', '结果'], [
    ['扰动路径总数', perturb.length],
    ['扰动路径命中数', perturb.filter((item) => item.hit).length],
    ['扰动路径命中率', pct(perturb.filter((item) => item.hit).length, perturb.length)],
    ['扰动路径相邻误判数', perturb.filter((item) => item.adjacentMiss).length],
    ['扰动路径非相邻误判数', perturb.filter((item) => item.nonAdjacentMiss).length],
  ])}

## 10. 6 组易混人格真实结果

${markdownTable(['指标', '结果'], [
    ['易混 fixture 总数', confusable.length],
    ['命中数', confusable.filter((item) => item.hit).length],
    ['命中率', pct(confusable.filter((item) => item.hit).length, confusable.length)],
    ['相邻误判数', confusable.filter((item) => item.adjacentMiss).length],
    ['非相邻误判数', confusable.filter((item) => item.nonAdjacentMiss).length],
  ])}

## 11. 风险题敏感度

${markdownTable(['题号', '扰动组数', 'Top1 改变次数', '改变率', '改变后 Top1'], riskRows)}

## 12. 人格 Top1 分布

${markdownTable(['人格', 'Top1 次数', '在其他人格路径中被误判为 Top1 次数'], top1Rows)}

## 13. 最容易被误判的人格

${summary.missedExpectedCounts && Object.keys(summary.missedExpectedCounts).length ? markdownTable(['预期人格', '被误判次数'], Object.entries(summary.missedExpectedCounts).map(([name, count]) => [name, count])) : '本轮没有误判。'}

## 14. 最容易过度高频的人格

${overFreq.length ? markdownTable(['人格', '被误判为 Top1 次数'], overFreq.map((name) => [name, summary.falseTop1Counts[name]])) : '本轮没有出现其他路径误判吸走人格。'}

## 15. 是否需要回到题目修改

${problemQuestions.length ? `需要局部复查风险题：${problemQuestions.join('、')}。` : '暂不需要因本轮隔离跑分回到题目修改。'}

## 16. 是否需要调整 targetVector

${summary.nonAdjacentMisses > 0 || Object.keys(summary.falseTop1Counts).length > 0 ? '需要。当前候选 targetVector 在部分路径上仍有误判或吸走风险，建议先复查误判对应人格的 targetVector，再决定是否改题。' : '暂不需要。当前隔离 fixture 未暴露 targetVector 明显失衡。'}

## 17. 是否建议进入正式结构化题库

${summary.idealHits === summary.idealTotal && summary.nonAdjacentMisses === 0 && summary.riskTop1Changes === 0 ? '可以进入结构化题库草案，但仍不能接入生产代码。' : '不建议进入正式结构化题库。需先处理误判、gap 过小或风险题敏感问题。'}

## 18. 是否建议接入生产代码

不建议。

原因：

1. 当前仍是隔离 drafts/reports 阶段。
2. 尚未接入正式结构化数据。
3. 尚未用生产评分脚本验证。
4. 当前 targetVector 仍是候选草案，不是正式人格参数。
5. 本轮即使局部通过，也不得自动接入 \`app.js\`。

最终结论：

${markdownTable(['问题', '结论'], [
    ['这是人工推演还是真实脚本执行', '真实脚本执行'],
    ['fixture 总数', summary.totalFixtures],
    ['15 主性人格理想路径命中数', `${summary.idealHits}/${summary.idealTotal}`],
    ['扰动路径命中率', pct(summary.perturbHits, summary.perturbTotal)],
    ['易混人格命中率', pct(summary.confusableHits, summary.confusableTotal)],
    ['风险题压力是否通过', summary.riskTop1Changes === 0 ? '通过' : '未通过'],
    ['哪些题仍有问题', problemQuestions.length ? problemQuestions.join('、') : '暂无'],
    ['哪些人格仍有问题', Object.keys(summary.missedExpectedCounts).length ? Object.keys(summary.missedExpectedCounts).join('、') : '暂无'],
    ['是否建议冻结题库文字', summary.riskTop1Changes === 0 ? '可考虑冻结风险题文字，但仍需人工确认体验语感' : '不建议'],
    ['是否建议冻结 targetVector', summary.nonAdjacentMisses === 0 && Object.keys(summary.falseTop1Counts).length === 0 ? '可考虑暂冻候选 targetVector' : '不建议'],
    ['是否建议接入生产代码', '不建议'],
  ])}
`;
}

validateInputs();
const results = fixtures.map(scoreFixture);
const resultById = new Map(results.map((result) => [result.fixtureId, result]));
const riskResults = byScenario('risk-question-single-perturbation', results);
const riskSensitivity = {};
for (const result of riskResults) {
  const fixture = fixtures.find((item) => item.id === result.fixtureId);
  const baseline = resultById.get(fixture.baselineFixtureId);
  const questionId = fixture.riskQuestion;
  riskSensitivity[questionId] ??= { questionId, total: 0, top1Changed: 0, changedTo: new Set() };
  riskSensitivity[questionId].total += 1;
  if (baseline && baseline.top1 !== result.top1) {
    riskSensitivity[questionId].top1Changed += 1;
    riskSensitivity[questionId].changedTo.add(result.top1);
  }
}

const ideal = byScenario('ideal-primary-persona', results);
const perturb = byScenario('minor-perturbation', results);
const confusable = byScenario('confusable-contrast', results);
const risk = byScenario('risk-question-single-perturbation', results);
const falseTop1 = results.filter((result) => !result.hit);
const summary = {
  generatedAt: new Date().toISOString(),
  totalFixtures: results.length,
  idealTotal: ideal.length,
  idealHits: ideal.filter((result) => result.hit).length,
  perturbTotal: perturb.length,
  perturbHits: perturb.filter((result) => result.hit).length,
  confusableTotal: confusable.length,
  confusableHits: confusable.filter((result) => result.hit).length,
  riskTotal: risk.length,
  riskHits: risk.filter((result) => result.hit).length,
  riskTop1Changes: Object.values(riskSensitivity).reduce((sum, item) => sum + item.top1Changed, 0),
  adjacentMisses: results.filter((result) => result.adjacentMiss).length,
  nonAdjacentMisses: results.filter((result) => result.nonAdjacentMiss).length,
  top1Counts: countMap(results, (result) => result.top1),
  falseTop1Counts: countMap(falseTop1, (result) => result.top1),
  missedExpectedCounts: countMap(falseTop1, (result) => result.expectedPersona),
  gapDistribution: gapDistribution(results),
  scenarios: [
    summarizeScenario('ideal-primary-persona', results),
    summarizeScenario('minor-perturbation', results),
    summarizeScenario('confusable-contrast', results),
    summarizeScenario('risk-question-single-perturbation', results),
  ],
};

const serializableRiskSensitivity = Object.fromEntries(Object.entries(riskSensitivity).map(([key, value]) => [key, {
  ...value,
  changedTo: [...value.changedTo],
}]));

writeJson('drafts/v2/validation-results.v2.draft.json', {
  schemaVersion: 'v2-validation-results-draft-1',
  scoringRule: 'construct average + 15-dimensional Euclidean distance to draft targetVector; lower distance is better',
  summary,
  riskSensitivity: serializableRiskSensitivity,
  results,
});

const report = makeReport(summary, results, riskSensitivity);
writeText('reports/heart-island-v2-question-bank-isolated-scoring-validation.md', report);

console.log(JSON.stringify({
  totalFixtures: summary.totalFixtures,
  ideal: `${summary.idealHits}/${summary.idealTotal}`,
  perturbHitRate: pct(summary.perturbHits, summary.perturbTotal),
  confusableHitRate: pct(summary.confusableHits, summary.confusableTotal),
  nonAdjacentMisses: summary.nonAdjacentMisses,
  riskTop1Changes: summary.riskTop1Changes,
}, null, 2));
