import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = process.argv.slice(2);
const expectedQuestionIds = loadExpectedQuestionIds();
const expectedManifest = loadExpectedManifest();

function usage() {
  console.error(`Usage:
  node scripts/v2-validation/analyze-v2-pilot-results.mjs <file-or-directory> [...]

Inputs may be anonymous JSON exports, directories containing JSON files,
one JSON array, or text files containing HI2PILOT encoded result codes.`);
}

function readText(file) {
  return fs.readFileSync(file, 'utf8').trim();
}

function readJsonIfExists(file) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) return null;
  return JSON.parse(fs.readFileSync(full, 'utf8').replace(/^\uFEFF/, ''));
}

function loadExpectedQuestionIds() {
  const deploy = readJsonIfExists('pilot-deploy/v2/question-bank.v2.draft.json');
  const draft = readJsonIfExists('drafts/v2/question-bank.v2.draft.json');
  return (deploy ?? draft)?.questions?.map((question) => question.id) ?? [];
}

function loadExpectedManifest() {
  return readJsonIfExists('pilot-deploy/v2/pilot-manifest.json');
}

function base64UrlDecode(text) {
  let base64 = text.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return Buffer.from(base64, 'base64').toString('utf8');
}

function parseInputText(text, file) {
  text = text.replace(/^\uFEFF/, '');
  if (text.startsWith('HI2PILOT:')) {
    return [{ ...JSON.parse(base64UrlDecode(text.slice('HI2PILOT:'.length))), __sourceFile: file, __inputKind: 'encoded' }];
  }
  const data = JSON.parse(text);
  const items = Array.isArray(data) ? data : [data];
  return items.map((item) => ({ ...item, __sourceFile: file, __inputKind: 'json' }));
}

function collectFiles(input) {
  const fullPath = path.resolve(root, input);
  if (!fs.existsSync(fullPath)) throw new Error(`Input not found: ${input}`);
  const stat = fs.statSync(fullPath);
  if (stat.isDirectory()) {
    return fs.readdirSync(fullPath)
      .filter((name) => /\.(json|txt|code)$/i.test(name))
      .map((name) => path.join(fullPath, name));
  }
  return [fullPath];
}

function loadRecords(inputs) {
  const records = [];
  const parseErrors = [];
  for (const input of inputs) {
    for (const file of collectFiles(input)) {
      try {
        records.push(...parseInputText(readText(file), file));
      } catch (error) {
        parseErrors.push({ file, reason: `parse-error: ${error.message}` });
      }
    }
  }
  return { records, parseErrors };
}

function top1(record, source) {
  return source === 'baseline' ? record.baselineTop5?.[0]?.displayName : record.candidateATop5?.[0]?.displayName;
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

function answerIds(record) {
  if (Array.isArray(record.answerSequence)) return record.answerSequence.map((item) => item.questionId);
  if (record.answers && typeof record.answers === 'object') return Object.keys(record.answers);
  return [];
}

function validateRecord(record, index, pilotIdCounts) {
  const reasons = [];
  const source = record.__sourceFile ?? `record-${index}`;
  const isSinglePersonaPublicResult = Boolean(record.publicResultVersion);

  if (!record.pilotId) reasons.push('missing-pilotId');
  if (!record.exportedAt) reasons.push('missing-exportedAt');
  if (!record.pilotToolVersion) reasons.push('missing-pilotToolVersion');
  if (!record.questionnaireVersion) reasons.push('missing-questionnaireVersion');
  if (!record.scoringRuleVersion) reasons.push('missing-scoringRuleVersion');
  if (!record.questionBankHash) reasons.push('missing-questionBankHash');
  if (!record.baselineVectorHash) reasons.push('missing-baselineVectorHash');
  if (!record.candidateAVectorHash) reasons.push('missing-candidateAVectorHash');
  if (!Array.isArray(record.baselineTop5) || record.baselineTop5.length < 5) reasons.push('invalid-baselineTop5');
  if (!Array.isArray(record.candidateATop5) || record.candidateATop5.length < 5) reasons.push('invalid-candidateATop5');
  if (!isSinglePersonaPublicResult && !['yes', 'no'].includes(record.top3ContainsFit)) reasons.push('missing-top3ContainsFit');
  if (!['no', 'some', 'strong'].includes(record.correctAnswerFeeling)) reasons.push('missing-correctAnswerFeeling');
  if (!['yes', 'maybe', 'no'].includes(record.shareIntent)) reasons.push('missing-shareIntent');

  const ids = answerIds(record);
  const uniqueIds = new Set(ids);
  if (ids.length !== 60) reasons.push(`invalid-answerSequence-length:${ids.length}`);
  if (uniqueIds.size !== 60) reasons.push(`duplicate-questionIds:${ids.length - uniqueIds.size}`);
  const missing = expectedQuestionIds.filter((id) => !uniqueIds.has(id));
  const extra = ids.filter((id) => expectedQuestionIds.length && !expectedQuestionIds.includes(id));
  if (missing.length) reasons.push(`missing-questionIds:${missing.slice(0, 5).join(',')}${missing.length > 5 ? '...' : ''}`);
  if (extra.length) reasons.push(`unknown-questionIds:${extra.slice(0, 5).join(',')}${extra.length > 5 ? '...' : ''}`);

  if (expectedManifest) {
    if (record.pilotToolVersion !== expectedManifest.pilotToolVersion) reasons.push('pilotToolVersion-mismatch');
    if (record.questionBankHash !== expectedManifest.questionBankHash) reasons.push('questionBankHash-mismatch');
    if (record.baselineVectorHash !== expectedManifest.baselineVectorHash) reasons.push('baselineVectorHash-mismatch');
    if (record.candidateAVectorHash !== expectedManifest.candidateAVectorHash) reasons.push('candidateAVectorHash-mismatch');
    if (record.scoringRuleVersion !== expectedManifest.scoringRuleVersion) reasons.push('scoringRuleVersion-mismatch');
  }

  if (record.testFixtureId) reasons.push(`fixture-data:${record.testFixtureId}`);
  if (record.deployMode !== 'pilot-deploy') reasons.push(`non-deploy-export:${record.deployMode ?? 'unknown'}`);
  if (pilotIdCounts.get(record.pilotId) > 1) reasons.push(`duplicate-pilotId:${record.pilotId}`);

  return {
    valid: reasons.length === 0,
    invalidRecord: reasons.length ? { source, pilotId: record.pilotId ?? null, reasons } : null,
  };
}

function flowValidation(record) {
  const ids = answerIds(record);
  const hasFlow = Boolean(record.pilotId)
    && ids.length === 60
    && new Set(ids).size === 60
    && Array.isArray(record.baselineTop5)
    && Array.isArray(record.candidateATop5);
  return { valid: hasFlow, reason: hasFlow ? null : 'missing flow completion fields' };
}

function fitValidation(record) {
  const legacyReasons = [];
  if (!record.personaDescriptionVersion) legacyReasons.push('missing personaDescriptionVersion');
  if (typeof record.resultExplanationViewed !== 'boolean') legacyReasons.push('missing resultExplanationViewed');
  if (!record.resultExplanationSufficient) legacyReasons.push('missing resultExplanationSufficient');
  if (!record.feedbackSchemaVersion || record.feedbackSchemaVersion < 'v2-pilot-feedback-2') legacyReasons.push('feedback schema before explanation fix');
  const compatiblePilotVersions = new Set([
    'v2.0-pilot-result-explanation-p0-fix',
    'v2.0-pilot-single-persona-result-display',
  ]);
  if (!compatiblePilotVersions.has(record.pilotToolVersion)) legacyReasons.push('pilotToolVersion before result explanation fix');
  if (legacyReasons.length) {
    return {
      valid: false,
      legacy: true,
      unableToJudge: false,
      reason: 'legacy result did not include sufficient persona explanation',
      details: legacyReasons,
    };
  }
  if (record.fitJudgmentValid === false || record.unableToJudge === true) {
    return {
      valid: false,
      legacy: false,
      unableToJudge: true,
      reason: record.fitJudgmentInvalidReason || 'user was unable to judge',
      details: [],
    };
  }
  if (record.resultExplanationViewed !== true || record.resultExplanationSufficient !== 'yes') {
    return {
      valid: false,
      legacy: false,
      unableToJudge: true,
      reason: 'result explanation was not sufficiently viewed',
      details: [],
    };
  }
  return { valid: true, legacy: false, unableToJudge: false, reason: null, details: [] };
}

function analyze(records, parseErrors) {
  const pilotIdCounts = new Map();
  for (const record of records) {
    if (record.pilotId) pilotIdCounts.set(record.pilotId, (pilotIdCounts.get(record.pilotId) ?? 0) + 1);
  }

  const invalidRecords = parseErrors.map((item) => ({ source: item.file, pilotId: null, reasons: [item.reason] }));
  const valid = [];
  const flowValid = [];
  const fitValid = [];
  const fitInvalid = [];
  const legacySamples = [];
  const unableToJudgeSamples = [];

  records.forEach((record, index) => {
    const validation = validateRecord(record, index, pilotIdCounts);
    if (validation.valid) valid.push(record);
    else invalidRecords.push(validation.invalidRecord);
    const flow = flowValidation(record);
    const fit = fitValidation(record);
    if (flow.valid) flowValid.push(record);
    if (fit.valid && flow.valid && validation.valid) fitValid.push(record);
    if (!fit.valid && flow.valid) {
      const item = {
        pilotId: record.pilotId ?? null,
        source: record.__sourceFile ?? `record-${index}`,
        flowValidationValid: true,
        fitJudgmentValid: false,
        fitJudgmentInvalidReason: fit.reason,
        details: fit.details,
      };
      fitInvalid.push(item);
      if (fit.legacy) legacySamples.push(item);
      if (fit.unableToJudge) unableToJudgeSamples.push(item);
    }
  });

  const metricSamples = fitValid;
  const disagreements = metricSamples.filter((record) => top1(record, 'baseline') !== top1(record, 'candidate-A'));
  const agreements = metricSamples.length - disagreements.length;
  const baselinePreferred = disagreements.filter((record) => preference(record) === 'baseline').length;
  const candidatePreferred = disagreements.filter((record) => preference(record) === 'candidate-A').length;
  const bothPreferred = disagreements.filter((record) => preference(record) === 'both').length;
  const neitherPreferred = disagreements.filter((record) => preference(record) === 'neither').length;
  const baselineFitScores = metricSamples.map((record) => sourceFitScore(record, 'baseline')).filter((value) => value !== null);
  const candidateFitScores = metricSamples.map((record) => sourceFitScore(record, 'candidate-A')).filter((value) => value !== null);

  const byPersonaFit = {};
  for (const source of ['baseline', 'candidate-A']) {
    for (const record of metricSamples) {
      const persona = top1(record, source);
      const score = sourceFitScore(record, source);
      if (!persona || score === null) continue;
      const key = `${source}:${persona}`;
      if (!byPersonaFit[key]) byPersonaFit[key] = [];
      byPersonaFit[key].push(score);
    }
  }

  return {
    totalFilesOrRecords: records.length + parseErrors.length,
    totalParsedRecords: records.length,
    validSamples: valid.length,
    invalidSamples: invalidRecords.length,
    flowValidSamples: flowValid.length,
    fitValidSamples: fitValid.length,
    fitInvalidSamples: fitInvalid.length,
    legacySamplesWithoutExplanation: legacySamples.length,
    unableToJudgeSamples: unableToJudgeSamples.length,
    fitInvalidRecords: fitInvalid,
    duplicateSampleCount: [...pilotIdCounts.values()].filter((count) => count > 1).reduce((sum, count) => sum + count, 0),
    versionMismatchSamples: invalidRecords.filter((item) => item.reasons.some((reason) => reason.includes('mismatch'))).length,
    invalidRecords,
    top1Agreement: {
      count: agreements,
      rate: pct(agreements, metricSamples.length),
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
        count: metricSamples.filter((record) => record.top3ContainsFit === 'yes' && (record.resultAgreement || preference(record) === 'baseline' || preference(record) === 'both')).length,
        rate: pct(metricSamples.filter((record) => record.top3ContainsFit === 'yes' && (record.resultAgreement || preference(record) === 'baseline' || preference(record) === 'both')).length, metricSamples.length),
      },
      candidateA: {
        count: metricSamples.filter((record) => record.top3ContainsFit === 'yes' && (record.resultAgreement || preference(record) === 'candidate-A' || preference(record) === 'both')).length,
        rate: pct(metricSamples.filter((record) => record.top3ContainsFit === 'yes' && (record.resultAgreement || preference(record) === 'candidate-A' || preference(record) === 'both')).length, metricSamples.length),
      },
    },
    lowConfidence: {
      baseline: {
        count: metricSamples.filter((record) => record.baselineLowConfidence).length,
        rate: pct(metricSamples.filter((record) => record.baselineLowConfidence).length, metricSamples.length),
      },
      candidateA: {
        count: metricSamples.filter((record) => record.candidateALowConfidence).length,
        rate: pct(metricSamples.filter((record) => record.candidateALowConfidence).length, metricSamples.length),
      },
    },
    top1Counts: {
      baseline: countBy(metricSamples, (record) => top1(record, 'baseline')),
      candidateA: countBy(metricSamples, (record) => top1(record, 'candidate-A')),
    },
    personaFit: Object.fromEntries(Object.entries(byPersonaFit).map(([key, values]) => [key, {
      count: values.length,
      averageFit: mean(values),
    }])),
    questionFeedback: {
      difficultQuestionIds: countQuestionIds(flowValid, 'difficultQuestionIds'),
      unclearQuestionIds: countQuestionIds(flowValid, 'unclearQuestionIds'),
      bothFitQuestionIds: countQuestionIds(flowValid, 'bothFitQuestionIds'),
      noneFitQuestionIds: countQuestionIds(flowValid, 'noneFitQuestionIds'),
      correctAnswerFeelingQuestionIds: countQuestionIds(flowValid, 'correctAnswerFeelingQuestionIds'),
    },
    correctAnswerFeeling: countBy(flowValid, (record) => record.correctAnswerFeeling),
    shareIntent: countBy(flowValid, (record) => record.shareIntent),
    improvements: disagreements.filter((record) => preference(record) === 'candidate-A').map((record) => ({
      pilotId: record.pilotId,
      baselineTop1: top1(record, 'baseline'),
      candidateATop1: top1(record, 'candidate-A'),
      cardFitScores: record.cardFitScores ?? null,
      mostFitText: record.mostFitText ?? '',
    })),
    regressions: disagreements.filter((record) => preference(record) === 'baseline').map((record) => ({
      pilotId: record.pilotId,
      baselineTop1: top1(record, 'baseline'),
      candidateATop1: top1(record, 'candidate-A'),
      cardFitScores: record.cardFitScores ?? null,
      leastFitText: record.leastFitText ?? '',
    })),
    notes: [
      'Invalid samples are excluded from all aggregate metrics.',
      '3-5 person smoke test checks flow only; 20-30 person pilot is still product research, not psychological validity evidence.',
      'If baseline and candidate-A are close, keep baseline rather than tuning for tiny differences.',
    ],
  };
}

if (!args.length) {
  usage();
  process.exit(1);
}

try {
  const { records, parseErrors } = loadRecords(args);
  const result = analyze(records, parseErrors);
  console.log(JSON.stringify(result, null, 2));
  if (result.invalidSamples > 0) {
    process.exitCode = 2;
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
