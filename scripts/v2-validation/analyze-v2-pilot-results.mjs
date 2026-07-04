import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = process.argv.slice(2);

function usage() {
  console.error(`Usage:
  node scripts/v2-validation/analyze-v2-pilot-results.mjs <file-or-directory> [...]

Inputs may be individual anonymous export JSON files, directories containing JSON files,
or one JSON file containing an array of export records.`);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function collectFiles(input) {
  const fullPath = path.resolve(root, input);
  if (!fs.existsSync(fullPath)) throw new Error(`Input not found: ${input}`);
  const stat = fs.statSync(fullPath);
  if (stat.isDirectory()) {
    return fs.readdirSync(fullPath)
      .filter((name) => name.toLowerCase().endsWith('.json'))
      .map((name) => path.join(fullPath, name));
  }
  return [fullPath];
}

function loadRecords(inputs) {
  const records = [];
  for (const input of inputs) {
    for (const file of collectFiles(input)) {
      const data = readJson(file);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) records.push({ ...item, __sourceFile: file });
    }
  }
  return records;
}

function top1(record, source) {
  return source === 'baseline' ? record.baselineTop5?.[0]?.displayName : record.candidateATop5?.[0]?.displayName;
}

function top3Names(record, source) {
  return (source === 'baseline' ? record.baselineTop5 : record.candidateATop5)?.slice(0, 3).map((item) => item.displayName) ?? [];
}

function preference(record) {
  if (record.resultAgreement) return 'same';
  return record.userPreferredResult ?? null;
}

function cardFitForSource(record, source) {
  if (record.resultAgreement) return Number(record.top1FitScore);
  if (!record.cardFitScores || !Array.isArray(record.anonymousCardOrder)) return null;
  const card = record.anonymousCardOrder.find((item) => item.source === source);
  if (!card) return null;
  return Number(record.cardFitScores[card.label]);
}

function sourceFitScore(record, source) {
  const cardFit = cardFitForSource(record, source);
  if (Number.isFinite(cardFit)) return cardFit;
  const pref = preference(record);
  if (pref === 'same' || pref === 'both' || pref === source) return Number(record.top1FitScore);
  return null;
}

function mean(values) {
  const valid = values.filter((value) => Number.isFinite(value));
  return valid.length ? Number((valid.reduce((sum, value) => sum + value, 0) / valid.length).toFixed(2)) : null;
}

function countBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Object.fromEntries([...map.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), 'zh-Hans-CN')));
}

function countQuestionIds(records, field) {
  const all = records.flatMap((record) => Array.isArray(record[field]) ? record[field] : []);
  return countBy(all, (item) => item);
}

function pct(numerator, denominator) {
  return denominator ? `${((numerator / denominator) * 100).toFixed(1)}%` : '0.0%';
}

function analyze(records) {
  const valid = records.filter((record) => record?.pilotId && record?.baselineTop5?.length && record?.candidateATop5?.length);
  const disagreements = valid.filter((record) => top1(record, 'baseline') !== top1(record, 'candidate-A'));
  const agreements = valid.length - disagreements.length;

  const candidatePreferred = disagreements.filter((record) => preference(record) === 'candidate-A').length;
  const baselinePreferred = disagreements.filter((record) => preference(record) === 'baseline').length;
  const bothPreferred = disagreements.filter((record) => preference(record) === 'both').length;
  const neitherPreferred = disagreements.filter((record) => preference(record) === 'neither').length;

  const baselineFitScores = valid.map((record) => sourceFitScore(record, 'baseline')).filter((value) => value !== null);
  const candidateFitScores = valid.map((record) => sourceFitScore(record, 'candidate-A')).filter((value) => value !== null);

  const baselineTop3Coverage = valid.filter((record) => record.top3ContainsFit === 'yes' && (record.resultAgreement || preference(record) === 'baseline' || preference(record) === 'both')).length;
  const candidateTop3Coverage = valid.filter((record) => record.top3ContainsFit === 'yes' && (record.resultAgreement || preference(record) === 'candidate-A' || preference(record) === 'both')).length;

  const byPersonaFit = {};
  for (const source of ['baseline', 'candidate-A']) {
    for (const record of valid) {
      const persona = top1(record, source);
      const score = sourceFitScore(record, source);
      if (!persona || score === null) continue;
      const key = `${source}:${persona}`;
      if (!byPersonaFit[key]) byPersonaFit[key] = [];
      byPersonaFit[key].push(score);
    }
  }

  const personaFit = Object.fromEntries(Object.entries(byPersonaFit).map(([key, values]) => [key, {
    count: values.length,
    averageFit: mean(values),
  }]));

  const improvements = disagreements.filter((record) => preference(record) === 'candidate-A').map((record) => ({
    pilotId: record.pilotId,
    baselineTop1: top1(record, 'baseline'),
    candidateATop1: top1(record, 'candidate-A'),
    top1FitScore: record.top1FitScore,
    cardFitScores: record.cardFitScores ?? null,
    mostFitText: record.mostFitText ?? '',
  }));

  const regressions = disagreements.filter((record) => preference(record) === 'baseline').map((record) => ({
    pilotId: record.pilotId,
    baselineTop1: top1(record, 'baseline'),
    candidateATop1: top1(record, 'candidate-A'),
    top1FitScore: record.top1FitScore,
    cardFitScores: record.cardFitScores ?? null,
    leastFitText: record.leastFitText ?? '',
  }));

  return {
    validSamples: valid.length,
    invalidSamples: records.length - valid.length,
    top1Agreement: {
      count: agreements,
      rate: pct(agreements, valid.length),
    },
    disagreementPreference: {
      total: disagreements.length,
      baselinePreferred,
      candidateAPreferred: candidatePreferred,
      bothPreferred,
      neitherPreferred,
    },
    averageTop1Fit: {
      baseline: mean(baselineFitScores),
      candidateA: mean(candidateFitScores),
    },
    top3Coverage: {
      baseline: {
        count: baselineTop3Coverage,
        rate: pct(baselineTop3Coverage, valid.length),
      },
      candidateA: {
        count: candidateTop3Coverage,
        rate: pct(candidateTop3Coverage, valid.length),
      },
    },
    lowConfidence: {
      baseline: {
        count: valid.filter((record) => record.baselineLowConfidence).length,
        rate: pct(valid.filter((record) => record.baselineLowConfidence).length, valid.length),
      },
      candidateA: {
        count: valid.filter((record) => record.candidateALowConfidence).length,
        rate: pct(valid.filter((record) => record.candidateALowConfidence).length, valid.length),
      },
    },
    top1Counts: {
      baseline: countBy(valid, (record) => top1(record, 'baseline')),
      candidateA: countBy(valid, (record) => top1(record, 'candidate-A')),
    },
    personaFit,
    questionFeedback: {
      difficultQuestionIds: countQuestionIds(valid, 'difficultQuestionIds'),
      unclearQuestionIds: countQuestionIds(valid, 'unclearQuestionIds'),
      bothFitQuestionIds: countQuestionIds(valid, 'bothFitQuestionIds'),
      noneFitQuestionIds: countQuestionIds(valid, 'noneFitQuestionIds'),
      correctAnswerFeelingQuestionIds: countQuestionIds(valid, 'correctAnswerFeelingQuestionIds'),
    },
    correctAnswerFeeling: countBy(valid, (record) => record.correctAnswerFeeling),
    shareIntent: countBy(valid, (record) => record.shareIntent),
    improvements,
    regressions,
    notes: [
      '20-30 person pilot results are product research signals, not psychological validity evidence.',
      'If baseline and candidate-A are close, keep baseline rather than tuning for tiny differences.',
    ],
  };
}

if (!args.length) {
  usage();
  process.exit(1);
}

try {
  const records = loadRecords(args);
  const result = analyze(records);
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
