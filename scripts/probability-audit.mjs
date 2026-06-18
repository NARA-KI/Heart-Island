// ============================================
// 心岛计划 Beta 0.9.8 — 人格类型到达概率测评
// Usage: node scripts/probability-audit.mjs [--profile <name>]
// ============================================
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

import {
  scenes, displayScenes, DIM_META, DIM_ORDER, personalities as basePersonalities,
  CORE_TYPE_IDS, BRANCH_TYPE_IDS,
  getScore, computeDimensionScores, shuffleArray
} from '../core/scoring.mjs';
import { SCORING_PROFILES } from '../core/calibration-profiles.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = path.resolve(__dirname, '..', 'reports');
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

// ============================================
// CLI
// ============================================
const args = process.argv.slice(2);
let profileName = 'baseline';
let poolMode = 'core';  // Beta 0.9.7: default to core12, use 'all' for legacy 20-type
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--profile' && args[i+1]) profileName = args[i+1];
  if (args[i] === '--pool' && args[i+1]) poolMode = args[i+1];  // 'core' | 'all'
}
const profile = SCORING_PROFILES[profileName];
if (!profile) {
  console.error(`❌ Unknown profile: "${profileName}". Available: ${Object.keys(SCORING_PROFILES).join(', ')}`);
  process.exit(1);
}

// ============================================
// CONFIG
// ============================================
const RANDOM_SIMULATIONS = 100_000;
const FIXED_DISPLAY_SIMULATIONS = 10_000;

// Apply profile overrides
const ap = profile.algorithmParams;
const allPersonalities = basePersonalities.map(p => {
  const override = profile.personalityOverrides[p.id];
  if (!override) return { ...p };
  return {
    ...p,
    targetVector: override.targetVector || p.targetVector,
    coreThresholds: override.coreThresholds || p.coreThresholds,
  };
});

// Beta 0.9.7: Filter pool based on --pool argument
const auditPoolIds = poolMode === 'all' ? allPersonalities.map(p => p.id) : CORE_TYPE_IDS;
const personalities = allPersonalities.filter(p => auditPoolIds.includes(p.id));
const poolLabel = poolMode === 'all' ? '全20类型' : '12核心主岛';

// ============================================
// CUSTOM MATCH FUNCTION (profile-aware, pool-filtered)
// ============================================
function matchAllTypesProfile(avgDimensionScores) {
  const results = [];
  const pool = personalities; // already filtered by pool mode
  for (const p of pool) {
    let weightedSum = 0, totalWeight = 0;
    const thresholds = p.coreThresholds || {};

    for (const dim of DIM_ORDER) {
      const userScore = getScore(avgDimensionScores, dim);
      const targetScore = getScore(p.targetVector, dim);
      const diff = Math.abs(userScore - targetScore);

      let weight = 1.0;
      for (const key of Object.keys(thresholds)) {
        const baseDim = key.replace('_MAX','');
        if (baseDim === dim) { weight = ap.coreWeight; break; }
      }
      weightedSum += weight * diff;
      totalWeight += weight;
    }

    const weightedAvgDiff = weightedSum / totalWeight;
    let matchScore = 100 - weightedAvgDiff;

    // Core threshold bonus/penalty
    let metCount = 0, failCount = 0;
    let antiPenalty = 0;
    for (const [key, threshold] of Object.entries(thresholds)) {
      if (key.endsWith('_MAX')) {
        const dim = key.replace('_MAX','');
        const score = getScore(avgDimensionScores, dim);
        if (score <= threshold) {
          metCount++;
        } else {
          failCount++;
          // Anti-pattern: user far exceeds _MAX limit
          if (ap.antiPatternPenalty && score > threshold + 15) {
            antiPenalty += ap.antiPatternPenalty;
          }
        }
      } else {
        const score = getScore(avgDimensionScores, key);
        if (score >= threshold) {
          metCount++;
        } else {
          failCount++;
        }
      }
    }
    matchScore += metCount * ap.metBonus;
    matchScore -= failCount * ap.failPenalty;
    matchScore -= antiPenalty;

    matchScore = Math.min(99, Math.max(0, Math.round(matchScore)));

    results.push({ personality: p, matchScore });
  }

  results.sort((a,b) => b.matchScore - a.matchScore);
  return results;
}

// ============================================
// HELPERS
// ============================================
function prct(n, total) { return (n / total * 100).toFixed(1) + '%'; }
function median(arr) { const s = [...arr].sort((a,b)=>a-b); const m = Math.floor(s.length/2); return s.length%2 ? s[m] : Math.round((s[m-1]+s[m])/2); }
function mean(arr) { return Math.round(arr.reduce((a,b)=>a+b,0) / arr.length); }
function labelProb(pct) {
  const p = parseFloat(pct);
  if (p > 15) return '🔴 超高频';
  if (p >= 8) return '🟠 高频';
  if (p >= 3) return '🟢 正常';
  if (p >= 1) return '🟡 低频';
  return '⚫ 极低频';
}

// ============================================
// A. RANDOM REAL SIMULATION
// ============================================
console.log('═══════════════════════════════════');
console.log(`🧪 心岛计划 Beta 0.9.8 概率测评 [${profileName}] [${poolLabel}]`);
console.log(`   算法: coreWeight=${ap.coreWeight} bonus=+${ap.metBonus} penalty=-${ap.failPenalty}${ap.antiPatternPenalty ? ` antiPattern=-${ap.antiPatternPenalty}` : ''}`);
console.log(`   A. 随机真实模拟 × ${RANDOM_SIMULATIONS.toLocaleString()}`);
console.log('═══════════════════════════════════');

function simulateRandomJourney() {
  const choiceHistory = [];
  for (const scene of displayScenes) {
    const shuffled = shuffleArray(scene.options);
    const chosen = shuffled[Math.floor(Math.random() * 4)];
    choiceHistory.push({ sceneId: scene.id, dimension: scene.dimension, optionId: chosen.id, score: chosen.score });
  }
  const avgs = computeDimensionScores(choiceHistory);
  const results = matchAllTypesProfile(avgs);
  return {
    primary: results[0], secondary: results[1],
    gap: results[0].matchScore - results[1].matchScore,
    results, avgs
  };
}

const rpc = {}, rsc = {}, allGaps = [];
personalities.forEach(p => { rpc[p.id] = 0; rsc[p.id] = 0; });

const t0 = performance.now();
for (let i = 0; i < RANDOM_SIMULATIONS; i++) {
  const { primary, secondary, gap } = simulateRandomJourney();
  rpc[primary.personality.id]++; rsc[secondary.personality.id]++; allGaps.push(gap);
  if ((i+1) % 20000 === 0) console.log(`   ... ${(i+1).toLocaleString()} (${((performance.now()-t0)/1000).toFixed(1)}s)`);
}
console.log(`   ✅ 完成 (${((performance.now()-t0)/1000).toFixed(1)}s)`);

const primaryDist = Object.entries(rpc).map(([id,count]) => ({
  id, name: personalities.find(p=>p.id===id).name, count, pct: count/RANDOM_SIMULATIONS*100
})).sort((a,b)=>b.count-a.count);

const secondaryDist = Object.entries(rsc).map(([id,count]) => ({
  id, name: personalities.find(p=>p.id===id).name, count, pct: count/RANDOM_SIMULATIONS*100
})).sort((a,b)=>b.count-a.count);

// ============================================
// B. FIXED DISPLAYED POSITION
// ============================================
console.log(`\n   B. 固定显示位置 × ${FIXED_DISPLAY_SIMULATIONS}`);

function simulateFixedDisplay(displayPos) {
  const history = [];
  for (const scene of displayScenes) {
    const shuffled = shuffleArray(scene.options);
    const chosen = shuffled[displayPos];
    history.push({ sceneId: scene.id, dimension: scene.dimension, optionId: chosen.id, score: chosen.score });
  }
  return matchAllTypesProfile(computeDimensionScores(history));
}

const fixedDispResults = {};
for (const pos of [0,1,2,3]) {
  const counts = {}; personalities.forEach(p => { counts[p.id] = 0; });
  for (let i = 0; i < FIXED_DISPLAY_SIMULATIONS; i++) {
    counts[simulateFixedDisplay(pos)[0].personality.id]++;
  }
  const top = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  const t1pct = parseFloat(prct(top[0][1], FIXED_DISPLAY_SIMULATIONS));
  fixedDispResults[pos] = {
    top1Type: personalities.find(p=>p.id===top[0][0]).name,
    top1Pct: prct(top[0][1], FIXED_DISPLAY_SIMULATIONS),
    top2Type: top[1] ? personalities.find(p=>p.id===top[1][0]).name : '-',
    top2Pct: top[1] ? prct(top[1][1], FIXED_DISPLAY_SIMULATIONS) : '-',
    isBiased: t1pct > 30
  };
  console.log(`   位置${pos+1}: Top1=${fixedDispResults[pos].top1Type} (${fixedDispResults[pos].top1Pct}) 偏向=${fixedDispResults[pos].isBiased?'⚠️':'✅'}`);
}

// ============================================
// C. FIXED RAW OPTION
// ============================================
console.log('\n   C. 固定原始选项');

const fixedRawResults = {};
const rawLabels = ['全A','全B','全C','全D'];
for (const optIdx of [0,1,2,3]) {
  const history = [];
  for (const scene of displayScenes) {
    const chosen = scene.options[optIdx];
    history.push({ sceneId: scene.id, dimension: scene.dimension, optionId: chosen.id, score: chosen.score });
  }
  const avgs = computeDimensionScores(history);
  const results = matchAllTypesProfile(avgs);
  fixedRawResults[rawLabels[optIdx]] = {
    primary: results[0].personality.name, primaryScore: results[0].matchScore,
    secondary: results[1].personality.name, secondaryScore: results[1].matchScore,
    gap: results[0].matchScore - results[1].matchScore,
    top5: results.slice(0,5).map(r=>`${r.personality.name}(${r.matchScore})`), avgs
  };
  console.log(`   ${rawLabels[optIdx]}: ${fixedRawResults[rawLabels[optIdx]].primary}(${fixedRawResults[rawLabels[optIdx]].primaryScore}) gap=${fixedRawResults[rawLabels[optIdx]].gap}`);
}

// ============================================
// D. SELF-MATCH
// ============================================
console.log('\n   D. 类型自匹配');
const selfMatchResults = [];
for (const p of personalities) {
  const results = matchAllTypesProfile(p.targetVector);
  const rank = results.findIndex(r=>r.personality.id===p.id)+1;
  const selfScore = results.find(r=>r.personality.id===p.id).matchScore;
  const first = results[0];
  const risk = rank===1?'✅':rank<=3?'⚠️':'🔴';
  selfMatchResults.push({
    name:p.name, selfFirst:rank===1, actualFirst:first.personality.name,
    selfRank:rank, diff:first.matchScore-selfScore, risk
  });
  if (rank!==1) console.log(`   ⚠️ ${p.name}: rank#${rank}, #1=${first.personality.name}(${first.matchScore}), diff=${first.matchScore-selfScore}`);
}
const smPass = selfMatchResults.filter(r=>r.selfFirst).length;
console.log(`   ✅ 自匹配: ${smPass}/${personalities.length}`);

// ============================================
// GAP ANALYSIS
// ============================================
const gapM = mean(allGaps), gapMed = median(allGaps);
const gapMax = Math.max(...allGaps), gapMin = Math.min(...allGaps);
const gapLe3 = allGaps.filter(g=>g<=3).length;
const gapLe5 = allGaps.filter(g=>g<=5).length;
const gapLe8 = allGaps.filter(g=>g<=8).length;
const gapLe12 = allGaps.filter(g=>g<=12).length;

const gapStats = {
  mean:gapM, median:gapMed, max:gapMax, min:gapMin,
  le3:gapLe3, le3Pct:prct(gapLe3,RANDOM_SIMULATIONS),
  le5:gapLe5, le5Pct:prct(gapLe5,RANDOM_SIMULATIONS),
  le8:gapLe8, le8Pct:prct(gapLe8,RANDOM_SIMULATIONS),
  le12:gapLe12, le12Pct:prct(gapLe12,RANDOM_SIMULATIONS)
};

const top3 = primaryDist.slice(0,3), bottom3 = primaryDist.slice(-3);
const neverAppeared = primaryDist.filter(d=>d.count===0);
const warnings = [];
for (const d of primaryDist) {
  const lab = labelProb(d.pct.toFixed(1));
  if (lab.includes('超高频')) warnings.push({type:d.name,issue:'超高频',pct:d.pct.toFixed(1)+'%',severity:'high'});
  if (lab.includes('极低频')) warnings.push({type:d.name,issue:'极低频',pct:d.pct.toFixed(1)+'%',severity:'critical'});
  if (lab.includes('低频')) warnings.push({type:d.name,issue:'低频',pct:d.pct.toFixed(1)+'%',severity:'medium'});
}
neverAppeared.forEach(d=>warnings.push({type:d.name,issue:'从未出现',pct:'0%',severity:'critical'}));

// ============================================
// PROFILE-SUFFIXED REPORT
// ============================================
const poolSuffix = poolMode === 'all' ? '-all20' : '';
const suffix = (profileName === 'baseline' ? '' : `-${profileName}`) + poolSuffix;
const reportPath = path.join(REPORTS_DIR, `probability-audit${suffix}.md`);
const jsonPath = path.join(REPORTS_DIR, `probability-audit${suffix}.json`);

const md = `# 心岛计划 Beta 0.9.7 概率测评 — ${profileName} [${poolLabel}]

> Profile: ${profileName} | Pool: ${poolLabel} | coreWeight=${ap.coreWeight} | bonus=+${ap.metBonus} | penalty=-${ap.failPenalty}${ap.antiPatternPenalty ? ` | antiPattern=-${ap.antiPatternPenalty}` : ''}
> 生成时间：${new Date().toISOString().replace('T',' ').slice(0,19)}

## 摘要

| 指标 | 数值 |
|------|------|
| 模拟次数 | ${RANDOM_SIMULATIONS.toLocaleString()} |
| 审计类型池 | ${poolLabel} (${personalities.length}种) |
| 主岛最高频 | ${top3[0].name} (${top3[0].pct.toFixed(1)}%) |
| 主岛最低频 | ${bottom3[0].name} (${bottom3[0].pct.toFixed(1)}%) |
| gap均值 | ${gapM} |
| gap≤5 | ${gapStats.le5Pct} |
| 自匹配 | ${smPass}/${personalities.length} |
| 从未出现 | ${neverAppeared.length} |

## 主岛分布

| 排名 | 类型 | 次数 | 概率 | 标签 |
|------|------|-----:|-----:|------|
${primaryDist.map((d,i)=>`| ${i+1} | ${d.name} | ${d.count.toLocaleString()} | ${d.pct.toFixed(1)}% | ${labelProb(d.pct.toFixed(1))} |`).join('\n')}

## 关系回声分布

| 排名 | 类型 | 次数 | 概率 | 标签 |
|------|------|-----:|-----:|------|
${secondaryDist.map((d,i)=>`| ${i+1} | ${d.name} | ${d.count.toLocaleString()} | ${d.pct.toFixed(1)}% | ${labelProb(d.pct.toFixed(1))} |`).join('\n')}

## 固定显示位置

| 位置 | Top1 | Top1% | Top2 | Top2% | 偏向 |
|------|------|------:|------|------:|:--:|
${[0,1,2,3].map(p=>`| ${p+1} | ${fixedDispResults[p].top1Type} | ${fixedDispResults[p].top1Pct} | ${fixedDispResults[p].top2Type} | ${fixedDispResults[p].top2Pct} | ${fixedDispResults[p].isBiased?'⚠️':'✅'} |`).join('\n')}

## 固定原始选项

| 方式 | 主岛 | 分数 | 关系回声 | 分数 | gap |
|------|------|----:|------|----:|---:|
${rawLabels.map(l=>`| ${l} | ${fixedRawResults[l].primary} | ${fixedRawResults[l].primaryScore} | ${fixedRawResults[l].secondary} | ${fixedRawResults[l].secondaryScore} | ${fixedRawResults[l].gap} |`).join('\n')}

## 自匹配: ${smPass}/${personalities.length}

## Gap

| 指标 | 数值 |
|------|-----:|
| mean | ${gapM} |
| median | ${gapMed} |
| ≤3 | ${gapStats.le3Pct} |
| ≤5 | ${gapStats.le5Pct} |
| ≤8 | ${gapStats.le8Pct} |
| ≤12 | ${gapStats.le12Pct} |
`;

fs.writeFileSync(reportPath, md, 'utf-8');

const jsonData = {
  generatedAt: new Date().toISOString(),
  profile: profileName,
  pool: poolLabel,
  poolTypeCount: personalities.length,
  algorithmParams: ap,
  simulationCount: RANDOM_SIMULATIONS,
  primaryDistribution: primaryDist.map(d=>({...d,label:labelProb(d.pct.toFixed(1))})),
  secondaryDistribution: secondaryDist.map(d=>({...d,label:labelProb(d.pct.toFixed(1))})),
  gapStats,
  fixedDisplayedPositionResults: fixedDispResults,
  fixedRawOptionResults: fixedRawResults,
  selfMatchResults,
  warnings,
  neverAppeared: neverAppeared.length
};
fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');

// ============================================
// SUMMARY
// ============================================
console.log('\n═══════════════════════════════════');
console.log(`📊 [${profileName}] 完成`);
console.log(`   最高频: ${top3[0].name} (${top3[0].pct.toFixed(1)}%)`);
console.log(`   最低频: ${bottom3[0].name} (${bottom3[0].pct.toFixed(1)}%)`);
console.log(`   gap≤5: ${gapStats.le5Pct}`);
console.log(`   类型池: ${poolLabel} (${personalities.length}种)`);
console.log(`   自匹配: ${smPass}/${personalities.length}`);
console.log(`   从未出现: ${neverAppeared.length}`);
console.log(`   报告: ${reportPath}`);
console.log('═══════════════════════════════════');
