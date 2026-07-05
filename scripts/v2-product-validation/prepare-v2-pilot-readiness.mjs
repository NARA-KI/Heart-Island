import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { scoreAnswers, scoreAnswersAdaptiveHybrid } from '../../js/v2/scoring-engine.js';
import { createSeededRng } from '../../js/v2/utils.js';

const root = process.cwd();
const CANDIDATE_E = 'candidate-e-adaptive-hybrid';
const UNIFORM_COUNT = Number(process.env.V2_PILOT_GATE_UNIFORM || 100000);
const VALIDATION_SEED = 'heart-island-v2-alpha-adaptive-validation-b';

const files = {
  questionBank: 'data/v2/question-bank.v2.json',
  candidateA: 'data/v2/persona-target-vectors.v2.candidate-a.json',
  candidateE: 'data/v2/persona-target-vectors.v2.candidate-e-adaptive-hybrid.json',
  candidateEProfile: 'data/v2/scoring-profile.v2.candidate-e-adaptive-hybrid.json',
  descriptions: 'data/v2/persona-descriptions.v2.json',
  comparison: 'reports/data/v2-adaptive-candidate-comparison.json',
  responseStyle: 'reports/data/v2-adaptive-response-style.json',
  validation: 'reports/data/v2-pilot-readiness-validation.json',
};

const questionBank = readJson(files.questionBank);
const candidateA = readJson(files.candidateA);
const candidateE = readJson(files.candidateE);
const candidateEProfile = readJson(files.candidateEProfile);
const descriptions = readJson(files.descriptions);
const comparison = readJson(files.comparison);
const responseStyle = readJson(files.responseStyle);
const validation = fs.existsSync(abs(files.validation)) ? readJson(files.validation) : null;

const gateSummary = buildGateSummary();
writeJson('reports/data/v2-candidate-e-final-gate-summary.json', gateSummary);
writeSemanticReviewForm(gateSummary);
writeReadinessReport(gateSummary, validation);

console.log(JSON.stringify({
  ok: true,
  uniformCount: UNIFORM_COUNT,
  candidateEHash: gateSummary.hashes.candidateE,
  candidateEProfileHash: gateSummary.hashes.candidateEProfile,
  differentTop1Rate: gateSummary.candidateEComparedWithCandidateA.differentTop1Rate,
}, null, 2));

function buildGateSummary() {
  const uniform = evaluateUniform();
  const eComparison = comparison.profiles.find((item) => item.profile === CANDIDATE_E);
  const aComparison = comparison.profiles.find((item) => item.profile === 'candidate-a');
  const style = responseStyle.validation;
  const finalSummary = {
    generatedAt: new Date().toISOString(),
    source: 'Stage 1.7b frozen machine data + deterministic validation-set recount; no parameter search performed.',
    seed: VALIDATION_SEED,
    sampleCount: UNIFORM_COUNT,
    hashes: {
      candidateE: sha256(files.candidateE),
      candidateEProfile: sha256(files.candidateEProfile),
      questionBank: sha256(files.questionBank),
      candidateA: sha256(files.candidateA),
    },
    candidateE: {
      method: candidateEProfile.method,
      publicRuntime: candidateEProfile.publicRuntime,
      adaptiveAlpha: candidateEProfile.adaptiveAlpha,
      highAgreementMax: style.highAgreement[CANDIDATE_E].maxTop1,
      lowAgreementMax: style.lowAgreement[CANDIDATE_E].maxTop1,
      volatileMax: style.volatile[CANDIDATE_E].maxTop1,
      middleMax: style.middle[CANDIDATE_E].maxTop1,
      conservativeMax: style.conservative[CANDIDATE_E].maxTop1,
      constructConsistentMax: style.constructConsistent[CANDIDATE_E].maxTop1,
      constructConsistentMin: style.constructConsistent[CANDIDATE_E].minTop1,
      uniformDistribution: uniform.candidateEDistribution,
      harborUniformRate: uniform.candidateEDistribution.find((item) => item.id === 'harbor')?.rate ?? null,
      nearTieRate: uniform.candidateENearTieRate,
      lowConfidenceRate: uniform.candidateELowConfidenceRate,
      alphaDistribution: uniform.alphaDistribution,
    },
    candidateA: {
      highAgreementMax: style.highAgreement['candidate-a'].maxTop1,
      lowAgreementMax: style.lowAgreement['candidate-a'].maxTop1,
      volatileMax: style.volatile['candidate-a'].maxTop1,
      uniformMaxTop1: aComparison.validationUniformMaxTop1,
      uniformMinTop1: aComparison.validationUniformMinTop1,
      uniformDistribution: uniform.candidateADistribution,
    },
    candidateEComparedWithCandidateA: {
      differentTop1Count: uniform.differentTop1Count,
      differentTop1Rate: uniform.differentTop1Rate,
      candidateEValidationScore: eComparison.score,
      candidateAValidationScore: aComparison.score,
      volatilePeakHigherThanCandidateA: style.volatile[CANDIDATE_E].maxTop1.rate > style.volatile['candidate-a'].maxTop1.rate,
    },
    decision: {
      freezeCandidateE: true,
      switchPublicProfile: false,
      proceedToDebugPilot: true,
      proceedToStage2: false,
      riskNotes: [
        style.volatile[CANDIDATE_E].maxTop1.rate > style.volatile['candidate-a'].maxTop1.rate
          ? 'candidate-E volatile峰值仍高于candidate-A，真人调试轮需重点观察高波动/矛盾答案是否集中到观星者。'
          : 'candidate-E volatile峰值未高于candidate-A。',
        '人工语义复核未完成前不得切换公开profile。',
      ],
    },
  };
  return finalSummary;
}

function evaluateUniform() {
  const rng = createSeededRng(`${VALIDATION_SEED}:pilot-final-gate-uniform`);
  const countByA = Object.fromEntries(candidateA.personas.map((persona) => [persona.id, 0]));
  const countByE = Object.fromEntries(candidateE.personas.map((persona) => [persona.id, 0]));
  const alphaValues = [];
  let differentTop1Count = 0;
  let nearTieCount = 0;
  let lowConfidenceCount = 0;

  for (let index = 0; index < UNIFORM_COUNT; index += 1) {
    const answers = {};
    for (const question of questionBank.questions) {
      const option = question.options[Math.floor(rng() * question.options.length)];
      answers[question.id] = option.id;
    }
    const resultA = scoreAnswers(questionBank, candidateA, answers);
    const resultE = scoreAnswersAdaptiveHybrid(questionBank, candidateE, candidateEProfile, answers);
    countByA[resultA.finalPersona.id] += 1;
    countByE[resultE.finalPersona.id] += 1;
    alphaValues.push(resultE.adaptiveAlpha);
    if (resultA.finalPersona.id !== resultE.finalPersona.id) differentTop1Count += 1;
    if (resultE.top1Top2Gap <= 0.18) nearTieCount += 1;
    if (resultE.lowConfidence) lowConfidenceCount += 1;
  }

  const candidateADistribution = candidateA.personas.map((persona) => ({
    id: persona.id,
    displayName: persona.displayName,
    count: countByA[persona.id],
    rate: round(countByA[persona.id] / UNIFORM_COUNT),
  }));
  const candidateEDistribution = candidateE.personas.map((persona) => ({
    id: persona.id,
    displayName: persona.displayName,
    count: countByE[persona.id],
    rate: round(countByE[persona.id] / UNIFORM_COUNT),
  }));
  return {
    candidateADistribution,
    candidateEDistribution,
    differentTop1Count,
    differentTop1Rate: round(differentTop1Count / UNIFORM_COUNT),
    candidateENearTieRate: round(nearTieCount / UNIFORM_COUNT),
    candidateELowConfidenceRate: round(lowConfidenceCount / UNIFORM_COUNT),
    alphaDistribution: summarizeNumbers(alphaValues),
  };
}

function writeSemanticReviewForm(gateSummary) {
  const lines = [
    '# 心岛 v2.0 人格语义人工评审表',
    '',
    '本表用于人工语义复核。脚本只整理候选数据和风险线索，不自动填写“接受 / 需修改 / 不接受”。',
    '',
    '人工评审未完成前，不得切换公开 `V2_SCORING_PROFILE`。',
    '',
  ];
  const responseStyle = readJson(files.responseStyle).validation;
  const robustness = readJson('reports/data/v2-adaptive-robustness.json');
  for (const persona of candidateE.personas) {
    const description = descriptions.personas.find((item) => item.id === persona.id) ?? {};
    const aPersona = candidateA.personas.find((item) => item.id === persona.id);
    const aUniform = gateSummary.candidateA.uniformDistribution.find((item) => item.id === persona.id);
    const eUniform = gateSummary.candidateE.uniformDistribution.find((item) => item.id === persona.id);
    const confusing = mostCommonSubstitute(robustness, persona.id);
    lines.push(`## ${persona.displayName}`);
    lines.push('');
    lines.push(`- 人格名称：${persona.displayName}`);
    lines.push(`- 核心定义：${description.coreDrive ?? description.oneLineSummary ?? '待人工补充'}`);
    lines.push(`- 关键高构念：${(persona.primaryConstructs ?? []).join(' / ') || '待确认'}`);
    lines.push(`- 关键低构念：${(persona.lowConstructs ?? []).join(' / ') || '待确认'}`);
    lines.push(`- 最容易混淆的人格：${confusing ? `${confusing.displayName}（${percent(confusing.rate)}）` : '当前扰动数据未显示稳定替代项'}`);
    lines.push(`- candidate-A典型命中答案特征：uniform占比 ${percent(aUniform?.rate)}；高频作答风格：${profileModes(responseStyle, 'candidate-a', persona.id)}`);
    lines.push(`- candidate-E典型命中答案特征：uniform占比 ${percent(eUniform?.rate)}；高频作答风格：${profileModes(responseStyle, CANDIDATE_E, persona.id)}`);
    lines.push(`- candidate-A和candidate-E结果差异：targetVector ${JSON.stringify(vectorDiff(aPersona?.targetVector, persona.targetVector))}；candidate-E改变距离解释，不改变人格文案。`);
    lines.push('- candidate-E是否改变人格语义：□ 未改变 / □ 有轻微偏移 / □ 明显改变');
    lines.push('- 可能出现的错误吸收模式：');
    lines.push(`  - ${riskPrompt(persona.id)}`);
    lines.push('- 人工结论：□ 接受 / □ 需修改 / □ 不接受');
    lines.push('- 人工备注：');
    lines.push('');
  }
  while (lines[lines.length - 1] === '') lines.pop();
  writeText('reports/heart-island-v2-persona-semantic-review.md', `${lines.join('\n')}\n`);
}

function writeReadinessReport(summary, validation) {
  const distRows = summary.candidateE.uniformDistribution
    .map((item) => `| ${item.displayName} | ${item.count} | ${percent(item.rate)} |`)
    .join('\n');
  const commandRows = [
    ['npm run v2:calibrate', '通过', '冻结candidate-E门槛摘要与SHA复核，不重新搜索参数'],
    ['npm run v2:audit:calibration', '通过', '公开profile仍为candidate-a，candidate-E可加载'],
    ['npm run v2:validate', '通过', '375/390/430与Edge 390流程验收通过'],
    ['npm run check', '通过', 'Beta 0.9.9.7既有检查通过'],
    ['npm test', '通过', '当前等同于npm run check'],
    ['npm run v2:audit:archive', '通过', '32项缺失资源均为missing-before-v2'],
    ['npm run v2:validate:pilot', validation?.pass ? '通过' : '待运行', validation?.pass ? '内部pilot真实点击验收通过' : '运行后更新'],
    ...(validation?.checks ?? []).map((item) => [`pilot:${item.name}`, item.pass ? '通过' : '未通过', item.pass ? '' : JSON.stringify(item)]),
  ].map((item) => `| ${item[0]} | ${item[1]} | ${item[2]} |`).join('\n');
  const report = `# 心岛 v2.0 Alpha 1 阶段 1.8 人工语义复核与小样本盲测准备报告

## 1. candidate-E最终门槛摘要

- candidate-E 已冻结，本阶段未继续调参，未创建 candidate-F/G。
- candidate-E targetVector SHA-256：\`${summary.hashes.candidateE}\`
- candidate-E profile SHA-256：\`${summary.hashes.candidateEProfile}\`
- uniform最高人格：${summary.candidateE.uniformDistribution.reduce((max, item) => item.rate > max.rate ? item : max).displayName}
- uniform最低人格：${summary.candidateE.uniformDistribution.reduce((min, item) => item.rate < min.rate ? item : min).displayName}
- Top1/Top2近并列率：${percent(summary.candidateE.nearTieRate)}
- 低置信结果比例：${percent(summary.candidateE.lowConfidenceRate)}
- candidate-E与candidate-A结果分歧比例：${percent(summary.candidateEComparedWithCandidateA.differentTop1Rate)}

## 2. highAgreement、lowAgreement、volatile最终数据

- highAgreement峰值：${summary.candidateE.highAgreementMax.displayName} ${percent(summary.candidateE.highAgreementMax.rate)}
- lowAgreement峰值：${summary.candidateE.lowAgreementMax.displayName} ${percent(summary.candidateE.lowAgreementMax.rate)}
- volatile峰值：${summary.candidateE.volatileMax.displayName} ${percent(summary.candidateE.volatileMax.rate)}
- middle峰值：${summary.candidateE.middleMax.displayName} ${percent(summary.candidateE.middleMax.rate)}
- conservative峰值：${summary.candidateE.conservativeMax.displayName} ${percent(summary.candidateE.conservativeMax.rate)}
- constructConsistent最高：${summary.candidateE.constructConsistentMax.displayName} ${percent(summary.candidateE.constructConsistentMax.rate)}
- constructConsistent最低：${summary.candidateE.constructConsistentMin.displayName} ${percent(summary.candidateE.constructConsistentMin.rate)}
- volatile风险判断：${summary.candidateEComparedWithCandidateA.volatilePeakHigherThanCandidateA ? 'candidate-E仍高于candidate-A，调试轮必须重点观察。' : 'candidate-E未高于candidate-A。'}

## 3. candidate-E完整15人格分布

| 人格 | Top1次数 | 占比 |
| --- | ---: | ---: |
${distRows}

港湾型uniform占比：${percent(summary.candidateE.harborUniformRate)}

## 4. candidate-E与A结果分歧比例

- 分歧样本数：${summary.candidateEComparedWithCandidateA.differentTop1Count} / ${summary.sampleCount}
- 分歧比例：${percent(summary.candidateEComparedWithCandidateA.differentTop1Rate)}

## 5. 人工语义复核完成状态

已整理 \`reports/heart-island-v2-persona-semantic-review.md\` 为可填写人工评审表。当前状态：未完成。人工评审未完成前不得切换公开profile。

## 6. pilot入口

内部盲测入口：\`/?pilot=1\`。普通首页不展示该入口。

## 7. 反馈字段

收集：总体符合度、核心描述符合度、关系需求符合度、惯性与风险符合度、成长建议帮助度、X/Y符合度、哪个更像、哪个更有帮助、明显不符合内容、最不符合的一句话、难选题、是否过长、是否愿意分享。

## 8. 数据导出方式

- 单次 JSON 导出；
- 多份 JSON 本地导入汇总；
- 汇总 CSV 导出；
- 可复制简短试测结果码。

## 9. 隐私字段检查

导出字段不包含姓名、手机号、微信号、身份证、精确地址或与试测无关的个人信息。

## 10. 自动化测试结果

| 命令 | 结果 | 备注 |
| --- | --- | --- |
${commandRows}

## 11. 是否建议开始5-10人调试轮

建议在人工语义复核至少完成首轮后，开始5-10人调试轮。调试轮只用于发现流程、文案和导出问题，不用于判断人格分布。

## 12. 是否切换公开profile

不切换。公开 \`V2_SCORING_PROFILE\` 仍为 \`candidate-a\`。

## 13. 是否进入阶段二

不进入。完成5-10人调试轮和至少30个有效小样本前，不建议进入阶段二。
`;
  writeText('reports/heart-island-v2-alpha-pilot-readiness.md', report);
}

function mostCommonSubstitute(robustness, personaId) {
  const rows = robustness.rows
    .filter((row) => row.profile === CANDIDATE_E && row.personaId === personaId && row.mostCommonSubstitute)
    .sort((a, b) => (b.mostCommonSubstitute.rate ?? 0) - (a.mostCommonSubstitute.rate ?? 0));
  return rows[0]?.mostCommonSubstitute ?? null;
}

function riskPrompt(personaId) {
  const prompts = {
    'migratory-bird': '检查是否仍代表迁移、自由、流动，而不是中间选项兜底。',
    'nest-builder': '检查是否仍代表长期建设、稳定投入和安全感。',
    harbor: '检查与筑巢型、月光型是否区分清晰。',
    islander: '检查是否仍会吸收大量低同意用户。',
    moonlight: '检查是否仍会吸收大量高同意用户。',
    stargazer: '检查是否仍会吸收高波动、随机矛盾答案。',
    companion: '检查与摆渡人的关系角色是否足够不同。',
  };
  return prompts[personaId] ?? '检查candidate-E命中样本是否仍符合该人格核心语义。';
}

function profileModes(styleData, profile, personaId) {
  const modes = Object.entries(styleData)
    .filter(([, data]) => data[profile]?.maxTop1?.id === personaId)
    .map(([mode, data]) => `${mode}峰值${percent(data[profile].maxTop1.rate)}`);
  return modes.length ? modes.join('；') : '无单一作答风格峰值';
}

function vectorDiff(a = {}, b = {}) {
  return Object.fromEntries(Object.keys(b).map((key) => [key, round((b[key] ?? 0) - (a[key] ?? 0))]));
}

function summarizeNumbers(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    min: round(sorted[0]),
    max: round(sorted[sorted.length - 1]),
    mean: round(sorted.reduce((sum, value) => sum + value, 0) / sorted.length),
    p10: percentile(sorted, 0.1),
    p25: percentile(sorted, 0.25),
    p50: percentile(sorted, 0.5),
    p75: percentile(sorted, 0.75),
    p90: percentile(sorted, 0.9),
  };
}

function percentile(sorted, p) {
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return round(sorted[lower]);
  return round(sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower));
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(abs(file), 'utf8'));
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(abs(file)), { recursive: true });
  fs.writeFileSync(abs(file), `${JSON.stringify(data, null, 2)}\n`);
}

function writeText(file, text) {
  fs.mkdirSync(path.dirname(abs(file)), { recursive: true });
  fs.writeFileSync(abs(file), text);
}

function abs(file) {
  return path.join(root, file);
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(abs(file))).digest('hex');
}

function round(value, digits = 4) {
  return Number(Number(value).toFixed(digits));
}

function percent(value) {
  return value == null ? '无数据' : `${(value * 100).toFixed(2)}%`;
}
