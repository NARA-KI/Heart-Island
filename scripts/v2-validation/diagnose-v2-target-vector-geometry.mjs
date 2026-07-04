import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const writeJson = (file, data) => {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), JSON.stringify(data, null, 2) + '\n', 'utf8');
};
const writeText = (file, text) => {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), text, 'utf8');
};

const personaData = readJson('drafts/v2/persona-target-vectors.v2.draft.json');
const validationData = readJson('drafts/v2/validation-results.v2.draft.json');
const robustnessData = readJson('reports/data/heart-island-v2-robustness-results.json');

const constructs = personaData.constructs;
const personas = personaData.personas;
const neutralVector = Object.fromEntries(constructs.map((construct) => [construct, 50]));
const results = robustnessData.results;
const baseResults = validationData.results;

const personaByName = new Map(personas.map((persona) => [persona.displayName, persona]));
const resultById = new Map(results.map((result) => [result.fixtureId, result]));
const baseResultById = new Map(baseResults.map((result) => [result.fixtureId, result]));

const focusTriples = {
  '守门人 / 岛屿型 / 候鸟型': ['守门人', '岛屿型', '候鸟型'],
  '筑巢型 / 同行者 / 港湾型': ['筑巢型', '同行者', '港湾型'],
  '镜像型 / 港湾型 / 摆渡人': ['镜像型', '港湾型', '摆渡人'],
};

function distance(a, b) {
  const squared = constructs.reduce((sum, construct) => {
    const delta = a[construct] - b[construct];
    return sum + delta * delta;
  }, 0);
  return Number(Math.sqrt(squared / constructs.length).toFixed(4));
}

function vectorNorm(vector) {
  const squared = constructs.reduce((sum, construct) => sum + vector[construct] * vector[construct], 0);
  return Number(Math.sqrt(squared).toFixed(4));
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function pct(n, d) {
  return d ? `${((n / d) * 100).toFixed(2)}%` : '0.00%';
}

function ratio(n, d) {
  return d ? Number((n / d).toFixed(4)) : 0;
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return Number(sorted[lower].toFixed(4));
  return Number((sorted[lower] * (upper - index) + sorted[upper] * (index - lower)).toFixed(4));
}

function gapStats(items) {
  const gaps = items.map((item) => item.top1Top2Gap);
  return {
    mean: Number(mean(gaps).toFixed(4)),
    p10: percentile(gaps, 0.1),
    p25: percentile(gaps, 0.25),
    median: percentile(gaps, 0.5),
    p75: percentile(gaps, 0.75),
    p90: percentile(gaps, 0.9),
  };
}

function countBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Object.fromEntries([...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-Hans-CN')));
}

function top1Distribution(items) {
  const counts = countBy(items, (item) => item.top1);
  return Object.fromEntries(personas.map((persona) => {
    const count = counts[persona.displayName] ?? 0;
    return [persona.displayName, { count, rate: ratio(count, items.length) }];
  }));
}

function averageConstructVector(items) {
  if (!items.length) return Object.fromEntries(constructs.map((construct) => [construct, null]));
  return Object.fromEntries(constructs.map((construct) => [
    construct,
    Number(mean(items.map((item) => item.constructScores[construct])).toFixed(2)),
  ]));
}

function table(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map((cell) => String(cell).replace(/\n/g, '<br>')).join(' | ')} |`),
  ].join('\n');
}

function personaDistance(a, b) {
  return distance(personaByName.get(a).targetVector, personaByName.get(b).targetVector);
}

function analyzeVectors() {
  const pairs = [];
  for (let i = 0; i < personas.length; i++) {
    for (let j = i + 1; j < personas.length; j++) {
      pairs.push({
        a: personas[i].displayName,
        b: personas[j].displayName,
        distance: personaDistance(personas[i].displayName, personas[j].displayName),
      });
    }
  }
  const sortedPairs = [...pairs].sort((a, b) => a.distance - b.distance);
  const matrix = {};
  for (const persona of personas) {
    matrix[persona.displayName] = {};
    for (const other of personas) {
      matrix[persona.displayName][other.displayName] = persona.displayName === other.displayName
        ? 0
        : personaDistance(persona.displayName, other.displayName);
    }
  }
  const profile = personas.map((persona) => {
    const vector = persona.targetVector;
    const highCount = constructs.filter((construct) => vector[construct] >= 67).length;
    const midCount = constructs.filter((construct) => vector[construct] > 33 && vector[construct] < 67).length;
    const lowCount = constructs.filter((construct) => vector[construct] <= 33).length;
    const distances = personas
      .filter((other) => other.displayName !== persona.displayName)
      .map((other) => ({ displayName: other.displayName, distance: personaDistance(persona.displayName, other.displayName) }))
      .sort((a, b) => a.distance - b.distance);
    const avgDistance = Number(mean(distances.map((item) => item.distance)).toFixed(4));
    const neutralDistance = distance(vector, neutralVector);
    const nearDuplicate = distances[0].distance < 10;
    const surrounded = neutralDistance < 18 || (distances[0].distance < 14 && avgDistance < 28);
    return {
      displayName: persona.displayName,
      targetVector: vector,
      highCount,
      midCount,
      lowCount,
      neutralDistance,
      norm: vectorNorm(vector),
      nearestPersona: distances[0].displayName,
      nearestDistance: distances[0].distance,
      secondNearestPersona: distances[1].displayName,
      secondNearestDistance: distances[1].distance,
      averageDistance: avgDistance,
      duplicateOrSurroundedRisk: nearDuplicate ? 'near-duplicate-risk' : surrounded ? 'surrounded-or-neutral-risk' : 'none',
    };
  });
  return {
    neutralVector,
    profile,
    matrix,
    closestPairs: sortedPairs.slice(0, 10),
    farthestPairs: sortedPairs.slice(-10).reverse(),
    focusDistances: {
      migratoryBird: pairs.filter((pair) => pair.a === '候鸟型' || pair.b === '候鸟型'),
      nestBuilder: pairs.filter((pair) => pair.a === '筑巢型' || pair.b === '筑巢型'),
      triples: Object.fromEntries(Object.entries(focusTriples).map(([name, members]) => [name, members.flatMap((a, index) => members.slice(index + 1).map((b) => ({ a, b, distance: personaDistance(a, b) })))])),
    },
  };
}

function randomBreakdown() {
  const random = results.filter((result) => result.scenarioType === 'monte-carlo-random');
  const highConfidence = random.filter((result) => !result.lowConfidence);
  const lowConfidence = random.filter((result) => result.lowConfidence);
  const groups = {
    allRandom: random,
    highConfidenceRandom: highConfidence,
    lowConfidenceRandom: lowConfidence,
    uniform: random.filter((result) => result.meta.randomMode === 'uniform'),
    high: random.filter((result) => result.meta.randomMode === 'high'),
    low: random.filter((result) => result.meta.randomMode === 'low'),
    middle: random.filter((result) => result.meta.randomMode === 'middle'),
  };
  const breakdown = {};
  for (const [name, items] of Object.entries(groups)) {
    const dist = top1Distribution(items);
    breakdown[name] = {
      sampleCount: items.length,
      top1Distribution: dist,
      gapStats: gapStats(items),
      lowConfidenceCount: items.filter((item) => item.lowConfidence).length,
      lowConfidenceRate: ratio(items.filter((item) => item.lowConfidence).length, items.length),
      migratoryBirdRate: dist['候鸟型']?.rate ?? 0,
      nestBuilderRate: dist['筑巢型']?.rate ?? 0,
    };
  }
  const migratoryAll = random.filter((result) => result.top1 === '候鸟型');
  return {
    breakdown,
    migratoryBirdTop1: {
      total: migratoryAll.length,
      lowConfidenceCount: migratoryAll.filter((result) => result.lowConfidence).length,
      lowConfidenceRate: ratio(migratoryAll.filter((result) => result.lowConfidence).length, migratoryAll.length),
      byRandomMode: countBy(migratoryAll, (result) => result.meta.randomMode),
    },
  };
}

function nestBuilderDiagnostic() {
  const vector = analyzeVectors().profile.find((item) => item.displayName === '筑巢型');
  const ideal = baseResultById.get('ideal-nest-builder-01');
  const multi = results.filter((result) => result.scenarioType === 'multi-question-perturbation' && result.expectedPersona === '筑巢型');
  const byMutation = {};
  for (const count of [3, 5, 8, 12]) {
    const items = multi.filter((result) => result.meta.mutationCount === count);
    byMutation[count] = {
      total: items.length,
      top1Kept: items.filter((result) => result.top1 === '筑巢型').length,
      acceptable: items.filter((result) => result.acceptable).length,
      nonAdjacent: items.filter((result) => result.nonAdjacentMiss).length,
      lowConfidence: items.filter((result) => result.lowConfidence).length,
      top1Flows: countBy(items, (result) => result.top1),
      averageGap: Number(mean(items.map((result) => result.top1Top2Gap)).toFixed(4)),
    };
  }
  const misclassified = multi.filter((result) => result.top1 !== '筑巢型');
  const otherToNest = results.filter((result) => result.expectedPersona && result.expectedPersona !== '筑巢型' && result.top1 === '筑巢型');
  return {
    vector,
    distanceToCompanion: personaDistance('筑巢型', '同行者'),
    distanceToHarbor: personaDistance('筑巢型', '港湾型'),
    ideal: {
      top1: ideal.top1,
      top2: ideal.top2,
      gap: ideal.top1Top2Gap,
      top5: ideal.top5,
    },
    perturbation: byMutation,
    misclassifiedFlows: countBy(misclassified, (result) => result.top1),
    otherMisclassifiedToNestBuilder: otherToNest.length,
    diagnosis: '自身理想路径能命中，但随机判定区域明显较窄；更像 targetVector 几何区域窄，而不是题库文字不可用。',
  };
}

function migratoryBirdDiagnostic() {
  const random = results.filter((result) => result.scenarioType === 'monte-carlo-random');
  const allTop1 = random.filter((result) => result.top1 === '候鸟型');
  const highConfidenceTop1 = allTop1.filter((result) => !result.lowConfidence);
  const lowConfidenceTop1 = allTop1.filter((result) => result.lowConfidence);
  return {
    neutralDistance: distance(personaByName.get('候鸟型').targetVector, neutralVector),
    distanceToExplorer: personaDistance('候鸟型', '探险家'),
    distanceToIslander: personaDistance('候鸟型', '岛屿型'),
    distanceToGatekeeper: personaDistance('候鸟型', '守门人'),
    averageVectorAllTop1: averageConstructVector(allTop1),
    averageVectorHighConfidenceTop1: averageConstructVector(highConfidenceTop1),
    averageVectorLowConfidenceTop1: averageConstructVector(lowConfidenceTop1),
    top1ByRandomMode: countBy(allTop1, (result) => result.meta.randomMode),
    lowConfidenceShare: ratio(lowConfidenceTop1.length, allTop1.length),
    diagnosis: '候鸟型随机占比较高主要需要通过低置信拆解判断；若高置信样本仍偏高，优先校准 targetVector，而不是改题目。',
  };
}

function mixDiagnostic() {
  const mix = results.filter((result) => result.scenarioType === 'dual-persona-mix');
  return mix.map((result) => ({
    fixtureId: result.fixtureId,
    pair: result.meta.pair,
    ratio: result.meta.mixRatio,
    acceptableTopResults: result.acceptableTopResults,
    actualTop1: result.top1,
    actualTop2: result.top2,
    gap: result.top1Top2Gap,
    lowConfidence: result.lowConfidence,
    pass: result.acceptable,
    nonAdjacent: !result.acceptable,
    failureReason: result.acceptable
      ? ''
      : result.meta.mixRatio === '50/50'
        ? '50/50 混合落到第三人格，风险低于占优路径失败，但说明边界区域会被相邻温柔/稳定人格吸走。'
        : '占优人格路径未落入 acceptableTopResults，说明该混合边界下 targetVector 判定区域需要复查。',
  }));
}

function perturbationDiagnostic() {
  const multi = results.filter((result) => result.scenarioType === 'multi-question-perturbation');
  const byCount = {};
  for (const count of [3, 5, 8, 12]) {
    const items = multi.filter((result) => result.meta.mutationCount === count);
    byCount[count] = {
      total: items.length,
      top1KeptRate: ratio(items.filter((result) => result.explicitHit).length, items.length),
      adjacentMigrationRate: ratio(items.filter((result) => !result.explicitHit && result.acceptable).length, items.length),
      lowConfidenceRate: ratio(items.filter((result) => result.lowConfidence).length, items.length),
      nonAdjacentRate: ratio(items.filter((result) => result.nonAdjacentMiss).length, items.length),
      byPersona: Object.fromEntries(personas.map((persona) => {
        const personaItems = items.filter((result) => result.expectedPersona === persona.displayName);
        return [persona.displayName, {
          total: personaItems.length,
          top1KeptRate: ratio(personaItems.filter((result) => result.explicitHit).length, personaItems.length),
          acceptableRate: ratio(personaItems.filter((result) => result.acceptable).length, personaItems.length),
          nonAdjacentRate: ratio(personaItems.filter((result) => result.nonAdjacentMiss).length, personaItems.length),
        }];
      })),
    };
  }
  const firstInstability = {};
  for (const persona of personas) {
    firstInstability[persona.displayName] = null;
    for (const count of [3, 5, 8, 12]) {
      const value = byCount[count].byPersona[persona.displayName];
      if (value.top1KeptRate < 0.95 || value.nonAdjacentRate > 0) {
        firstInstability[persona.displayName] = count;
        break;
      }
    }
  }
  const stabilityScore = personas.map((persona) => {
    const rates = [3, 5, 8, 12].map((count) => byCount[count].byPersona[persona.displayName].acceptableRate);
    return { displayName: persona.displayName, score: Number(mean(rates).toFixed(4)), firstInstability: firstInstability[persona.displayName] };
  }).sort((a, b) => b.score - a.score || a.displayName.localeCompare(b.displayName, 'zh-Hans-CN'));
  return {
    byMutationCount: byCount,
    firstInstability,
    mostStable: stabilityScore.slice(0, 5),
    leastStable: stabilityScore.slice(-5).reverse(),
  };
}

function lowConfidenceDiagnostic() {
  const byType = {};
  for (const type of [...new Set(results.map((result) => result.scenarioType))]) {
    const items = results.filter((result) => result.scenarioType === type);
    byType[type] = {
      total: items.length,
      lowConfidence: items.filter((result) => result.lowConfidence).length,
      lowConfidenceRate: ratio(items.filter((result) => result.lowConfidence).length, items.length),
    };
  }
  const baseIdeal = baseResults.filter((result) => result.scenarioType === 'ideal-primary-persona');
  const basePerturb = baseResults.filter((result) => result.scenarioType === 'minor-perturbation');
  return {
    rule: 'Top1-Top2 gap < 2.5，或 Top3 spread < 5，或所有构念 40-60，或 fixture 明确标记低置信/50-50 混合。',
    byRobustnessType: byType,
    baseIdealLowConfidenceRate: ratio(baseIdeal.filter((result) => result.top1Top2Gap < 2.5).length, baseIdeal.length),
    basePerturbLowConfidenceRate: ratio(basePerturb.filter((result) => result.top1Top2Gap < 2.5).length, basePerturb.length),
    judgment: '85.11% 主要由随机与中间/混合输入造成；阈值在合成随机测试里偏严格，但适合作为产品低置信拦截的起点。',
  };
}

function makeReport(diagnostic) {
  const { vectorAnalysis, random, nestBuilder, migratoryBird, mix, perturbation, lowConfidence, attribution, conclusions } = diagnostic;
  const vectorRows = vectorAnalysis.profile.map((item) => [
    item.displayName,
    item.highCount,
    item.midCount,
    item.lowCount,
    item.neutralDistance,
    item.norm,
    `${item.nearestPersona} (${item.nearestDistance})`,
    `${item.secondNearestPersona} (${item.secondNearestDistance})`,
    item.averageDistance,
    item.duplicateOrSurroundedRisk,
  ]);
  const matrixRows = personas.map((persona) => [
    persona.displayName,
    ...personas.map((other) => vectorAnalysis.matrix[persona.displayName][other.displayName]),
  ]);
  const randomRows = Object.entries(random.breakdown).map(([name, item]) => [
    name,
    item.sampleCount,
    `${(item.migratoryBirdRate * 100).toFixed(2)}%`,
    `${(item.nestBuilderRate * 100).toFixed(2)}%`,
    item.gapStats.mean,
    item.gapStats.median,
    item.gapStats.p10,
    item.gapStats.p25,
    item.gapStats.p75,
    item.gapStats.p90,
    `${(item.lowConfidenceRate * 100).toFixed(2)}%`,
  ]);
  const mixRows = mix.map((item) => [
    item.fixtureId,
    item.pair.join('/'),
    item.ratio,
    item.acceptableTopResults.join('、'),
    item.actualTop1,
    item.actualTop2,
    item.gap,
    item.nonAdjacent ? '是' : '否',
    item.pass ? '通过' : '未通过',
    item.failureReason || '-',
  ]);
  const perturbRows = Object.entries(perturbation.byMutationCount).map(([count, item]) => [
    count,
    `${(item.top1KeptRate * 100).toFixed(1)}%`,
    `${(item.adjacentMigrationRate * 100).toFixed(1)}%`,
    `${(item.lowConfidenceRate * 100).toFixed(1)}%`,
    `${(item.nonAdjacentRate * 100).toFixed(1)}%`,
  ]);
  const lowRows = Object.entries(lowConfidence.byRobustnessType).map(([type, item]) => [
    type,
    item.total,
    `${(item.lowConfidenceRate * 100).toFixed(2)}%`,
  ]);

  return `# 心岛 v2.0 候选人格向量几何诊断报告

## 1. 候选向量基础结构

中性向量定义：15 个构念全部为 50。距离采用 15 维归一化欧氏距离，即上轮隔离验证脚本使用的同一距离口径。

高/中/低维度计数规则：高分维度 >= 67；中分维度 34-66；低分维度 <= 33。

${table(['人格', '高维', '中维', '低维', '距中性', '向量范数', '最近邻', '第二近邻', '平均距离', '重复/包围风险'], vectorRows)}

## 2. 15×15 人格距离矩阵

${table(['人格', ...personas.map((persona) => persona.displayName)], matrixRows)}

最近的 10 组：

${table(['人格 A', '人格 B', '距离'], vectorAnalysis.closestPairs.map((item) => [item.a, item.b, item.distance]))}

最远的 10 组：

${table(['人格 A', '人格 B', '距离'], vectorAnalysis.farthestPairs.map((item) => [item.a, item.b, item.distance]))}

候鸟型与其他人格距离：

${table(['人格 A', '人格 B', '距离'], vectorAnalysis.focusDistances.migratoryBird.map((item) => [item.a, item.b, item.distance]))}

筑巢型与其他人格距离：

${table(['人格 A', '人格 B', '距离'], vectorAnalysis.focusDistances.nestBuilder.map((item) => [item.a, item.b, item.distance]))}

重点三角关系：

${Object.entries(vectorAnalysis.focusDistances.triples).map(([name, rows]) => `### ${name}\n\n${table(['人格 A', '人格 B', '距离'], rows.map((item) => [item.a, item.b, item.distance]))}`).join('\n\n')}

## 3. 随机 Top1 分布拆解

${table(['样本组', '样本数', '候鸟型占比', '筑巢型占比', 'Gap 均值', 'Gap 中位数', 'P10', 'P25', 'P75', 'P90', '低置信比例'], randomRows)}

关键回答：

1. 候鸟型 19.02% 是否主要来自低置信样本：${random.migratoryBirdTop1.lowConfidenceRate > 0.8 ? '是' : '否'}，候鸟型 Top1 中低置信占比为 ${(random.migratoryBirdTop1.lowConfidenceRate * 100).toFixed(2)}%。
2. 在高置信样本中，候鸟型是否仍异常偏高：高置信随机样本候鸟型占比为 ${(random.breakdown.highConfidenceRandom.migratoryBirdRate * 100).toFixed(2)}%，${random.breakdown.highConfidenceRandom.migratoryBirdRate > 0.18 ? '仍偏高' : '未见明显偏高'}。
3. 筑巢型是否只在随机噪声中偏低，但在语义路径中稳定：是。基础理想路径命中，随机均匀占比 ${(random.breakdown.uniform.nestBuilderRate * 100).toFixed(2)}%，说明随机判定区域较窄，不等同真实不可命中。
4. 最容易吸向候鸟型的输入分布：${Object.entries(random.migratoryBirdTop1.byRandomMode).sort((a, b) => b[1] - a[1]).map(([mode, count]) => `${mode}:${count}`).join('，')}。

## 4. 筑巢型判定区域诊断

${table(['项目', '结果'], [
    ['最近邻', `${nestBuilder.vector.nearestPersona} (${nestBuilder.vector.nearestDistance})`],
    ['与同行者距离', nestBuilder.distanceToCompanion],
    ['与港湾型距离', nestBuilder.distanceToHarbor],
    ['理想路径 Top1 / Top2 / Gap', `${nestBuilder.ideal.top1} / ${nestBuilder.ideal.top2} / ${nestBuilder.ideal.gap}`],
    ['其他人格误判成筑巢型次数', nestBuilder.otherMisclassifiedToNestBuilder],
    ['诊断', nestBuilder.diagnosis],
  ])}

扰动后表现：

${table(['扰动题数', '总数', 'Top1 保持', '合理相邻', '非相邻', '低置信', 'Top1 流向', '平均 Gap'], Object.entries(nestBuilder.perturbation).map(([count, item]) => [
    count,
    item.total,
    item.top1Kept,
    item.acceptable,
    item.nonAdjacent,
    item.lowConfidence,
    Object.entries(item.top1Flows).map(([name, value]) => `${name}:${value}`).join('，'),
    item.averageGap,
  ]))}

## 5. 候鸟型判定区域诊断

${table(['项目', '结果'], [
    ['与中性向量距离', migratoryBird.neutralDistance],
    ['与探险家距离', migratoryBird.distanceToExplorer],
    ['与岛屿型距离', migratoryBird.distanceToIslander],
    ['与守门人距离', migratoryBird.distanceToGatekeeper],
    ['候鸟型 Top1 低置信占比', `${(migratoryBird.lowConfidenceShare * 100).toFixed(2)}%`],
    ['候鸟型随机 Top1 模式来源', Object.entries(migratoryBird.top1ByRandomMode).map(([mode, count]) => `${mode}:${count}`).join('，')],
  ])}

候鸟型 Top1 样本平均构念向量：

${table(['样本', ...constructs], [
    ['全部', ...constructs.map((construct) => migratoryBird.averageVectorAllTop1[construct])],
    ['高置信', ...constructs.map((construct) => migratoryBird.averageVectorHighConfidenceTop1[construct])],
    ['低置信', ...constructs.map((construct) => migratoryBird.averageVectorLowConfidenceTop1[construct])],
  ])}

判断：候鸟型的 AU + NV + CL 组合确实形成较大的随机判定区域；是否调整应优先从 targetVector 几何校准和低置信拦截入手，不应先改题目。

## 6. 双人格混合失败的 3 组

${table(['Fixture ID', '混合人格', '比例', 'acceptableTopResults', 'Top1', 'Top2', 'Gap', '非相邻', '结果', '失败原因推测'], mixRows)}

失败集中在灯塔/摆渡人、港湾/摆渡人混合，其中包含 50/50 和 75/25。50/50 失败风险较低；75/25 仍跳到月光型，说明“温柔稳定/修复”边界可能被月光型吸走，风险中等。

## 7. 扰动稳定性拆解

${table(['扰动题数', 'Top1 保持率', '合理相邻迁移率', '低置信率', '非相邻误判率'], perturbRows)}

最稳定的 5 个人格：

${table(['人格', '平均合理率', '首次明显失稳点'], perturbation.mostStable.map((item) => [item.displayName, `${(item.score * 100).toFixed(1)}%`, item.firstInstability ?? '未见']))}

最不稳定的 5 个人格：

${table(['人格', '平均合理率', '首次明显失稳点'], perturbation.leastStable.map((item) => [item.displayName, `${(item.score * 100).toFixed(1)}%`, item.firstInstability ?? '未见']))}

## 8. 低置信规则诊断

当前低置信判定规则：${lowConfidence.rule}

${table(['fixture 类型', '样本数', '低置信率'], lowRows)}

基础理想路径按 gap<2.5 的低置信率：${(lowConfidence.baseIdealLowConfidenceRate * 100).toFixed(2)}%。

基础轻扰动路径按 gap<2.5 的低置信率：${(lowConfidence.basePerturbLowConfidenceRate * 100).toFixed(2)}%。

回答：

1. 85.11% 是否主要由随机和中间回答造成：是，Monte Carlo 与中间/混合输入贡献最大。
2. 理想人格和合理扰动路径是否被错误判为低置信：少量会被 gap 阈值拦截，但不是主因。
3. 低置信阈值是过严、合理还是过松：对合成随机测试偏严格；对产品侧“不要硬给人格”的目标是合理起点。
4. 产品未来是否应该显示“混合型 / 尚未形成单一倾向”：建议考虑，尤其是 50/50 混合和中间区域输入。

## 9. 问题归因

${table(['归因类型', '是否成立', '证据', '风险等级', '下一轮是否需要修改'], attribution.map((item) => [item.type, item.applies ? '成立' : '不成立/证据不足', item.evidence, item.risk, item.nextStep]))}

## 10. 报告结论

${table(['问题', '结论'], [
    ['是否建议修改题库文字', conclusions.editQuestions],
    ['是否建议调整候鸟型 targetVector', conclusions.adjustMigratoryBird],
    ['是否建议调整筑巢型 targetVector', conclusions.adjustNestBuilder],
    ['是否建议调整其他 targetVector', conclusions.adjustOtherVectors],
    ['是否建议调整距离算法', conclusions.adjustDistanceAlgorithm],
    ['是否建议调整低置信阈值', conclusions.adjustLowConfidenceRule],
    ['双人格混合 3 个失败是否严重', conclusions.mixFailuresSeverity],
    ['候鸟型 19.02% 是否主要属于低置信结果', conclusions.migratoryMainlyLowConfidence],
    ['筑巢型 0.21% 是否真实不可命中', conclusions.nestBuilderLowRandomMeaning],
    ['是否可以暂时冻结题库文字', conclusions.freezeQuestionText],
    ['是否可以进入候选 targetVector 校准', conclusions.enterVectorCalibration],
    ['是否可以进入生产接入准备', conclusions.enterProductionPrep],
    ['是否可以修改 app.js', conclusions.modifyAppJs],
  ])}
`;
}

const vectorAnalysis = analyzeVectors();
const random = randomBreakdown();
const nestBuilder = nestBuilderDiagnostic();
const migratoryBird = migratoryBirdDiagnostic();
const mix = mixDiagnostic();
const perturbation = perturbationDiagnostic();
const lowConfidence = lowConfidenceDiagnostic();

const attribution = [
  {
    type: 'A. 题库文字问题',
    applies: false,
    evidence: '理想路径 15/15 命中，构念矛盾异常率 0/10；当前风险主要出现在随机和混合边界。',
    risk: '低',
    nextStep: '暂不修改题库文字。',
  },
  {
    type: 'B. 选项分值问题',
    applies: false,
    evidence: '多题扰动非相邻误判率仅 0.22%，未显示单题分值大规模失控。',
    risk: '低',
    nextStep: '暂不调整分值；保留后续真实样本复查。',
  },
  {
    type: 'C. targetVector 几何问题',
    applies: true,
    evidence: `候鸟型随机均匀 Top1 ${(random.breakdown.uniform.migratoryBirdRate * 100).toFixed(2)}%，筑巢型 ${(random.breakdown.uniform.nestBuilderRate * 100).toFixed(2)}%；筑巢型自身命中但随机区域窄。`,
    risk: '中高',
    nextStep: '进入候选 targetVector 校准。',
  },
  {
    type: 'D. 距离/相似度算法问题',
    applies: true,
    evidence: '纯欧氏距离对随机中间区域会硬分配 Top1，导致低置信样本仍被给出确定人格。',
    risk: '中',
    nextStep: '考虑增加低置信出口，不先加隐藏人格 bonus。',
  },
  {
    type: 'E. 低置信规则问题',
    applies: true,
    evidence: `低置信比例 ${(robustnessData.summary.lowConfidence.rate * 100).toFixed(2)}%，主要来自随机/中间/混合输入；产品侧需要明确呈现策略。`,
    risk: '中',
    nextStep: '校准低置信阈值和展示策略。',
  },
  {
    type: 'F. 合成测试分布本身的问题',
    applies: true,
    evidence: 'A/B/C/D 等概率随机并不代表真实用户分布，不能按随机占比追求 15 类型均匀。',
    risk: '中',
    nextStep: '保留为压力测试，不作为真实分布目标。',
  },
];

const conclusions = {
  editQuestions: '不建议。当前证据不足以支持修改题库文字。',
  adjustMigratoryBird: '建议进入候选校准。重点看 AU/NV/CL 组合是否过度贴近随机中间区域。',
  adjustNestBuilder: '建议进入候选校准。筑巢型自身可命中，但随机判定区域偏窄。',
  adjustOtherVectors: '建议复查月光型、港湾型、摆渡人边界，尤其双人格混合失败处。',
  adjustDistanceAlgorithm: '建议评估低置信出口或相对 gap，不建议添加隐藏 bonus。',
  adjustLowConfidenceRule: '建议继续校准。当前对随机偏严格，但方向合理。',
  mixFailuresSeverity: '中等。50/50 失败不严重；港湾/摆渡人 75/25 仍跳月光型需要复查。',
  migratoryMainlyLowConfidence: random.migratoryBirdTop1.lowConfidenceRate > 0.8 ? '是，主要属于低置信结果。' : '否，高置信中仍需重点处理。',
  nestBuilderLowRandomMeaning: '不是不可命中；是随机判定区域较窄，语义路径仍稳定。',
  freezeQuestionText: '可以暂时冻结题库文字，进入向量校准；不要因随机分布不均改题。',
  enterVectorCalibration: '可以，且建议作为下一轮目标。',
  enterProductionPrep: '不建议。应先完成候选 targetVector 校准和低置信策略。',
  modifyAppJs: '不可以。',
};

const diagnostic = {
  generatedAt: new Date().toISOString(),
  sourceFiles: [
    'drafts/v2/persona-target-vectors.v2.draft.json',
    'drafts/v2/validation-results.v2.draft.json',
    'reports/data/heart-island-v2-robustness-results.json',
  ],
  neutralVector,
  vectorAnalysis,
  random,
  nestBuilder,
  migratoryBird,
  mix,
  perturbation,
  lowConfidence,
  attribution,
  conclusions,
};

writeJson('reports/data/heart-island-v2-target-vector-geometry.json', diagnostic);
writeText('reports/heart-island-v2-target-vector-geometry-diagnostic.md', makeReport(diagnostic));

console.log(JSON.stringify({
  personas: personas.length,
  closestPair: vectorAnalysis.closestPairs[0],
  migratoryUniformRate: random.breakdown.uniform.migratoryBirdRate,
  migratoryHighConfidenceRate: random.breakdown.highConfidenceRandom.migratoryBirdRate,
  nestUniformRate: random.breakdown.uniform.nestBuilderRate,
  mixFailures: mix.filter((item) => !item.pass).length,
  lowConfidenceRate: robustnessData.summary.lowConfidence.rate,
  recommendation: 'enter-target-vector-calibration-before-production-prep',
}, null, 2));
