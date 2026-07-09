import { buildAdaptiveResult, buildResult } from './result-engine.js';
import { createSeededRng } from './utils.js';

export const PILOT_RESULT_VERSION = 'v2-alpha-1.8-pilot';

export const PILOT_FEEDBACK_FIELDS = [
  { name: 'overallFit', label: '总体结果符合程度' },
  { name: 'coreFit', label: '核心描述符合程度' },
  { name: 'needsFit', label: '关系需求描述符合程度' },
  { name: 'riskFit', label: '惯性与风险描述符合程度' },
  { name: 'growthHelp', label: '成长建议是否有帮助' },
];

export const PILOT_TEXT_FIELDS = [
  { name: 'obviousMismatch', label: '是否出现明显不符合内容' },
  { name: 'leastFittingLine', label: '最不符合的一句话' },
  { name: 'difficultQuestions', label: '哪些题目难以理解或难以选择' },
  { name: 'tooLong', label: '测试是否过长' },
  { name: 'willingToShare', label: '是否愿意把结果分享给别人' },
];

export function createPilotState(enabled = false) {
  return {
    enabled,
    pilotId: enabled ? createPilotId() : null,
    feedback: {},
    importedSummary: null,
    exportedRecord: null,
  };
}

export function buildPilotResult({ runtime, state }) {
  const candidateAResult = buildResult({
    manifest: runtime.manifest,
    questionBank: runtime.questionBank,
    candidateA: runtime.candidateA,
    descriptions: runtime.descriptions,
    answers: state.answers,
  });
  const candidateEResult = buildAdaptiveResult({
    manifest: runtime.manifest,
    questionBank: runtime.questionBank,
    candidateE: runtime.candidateE,
    candidateEScoringProfile: runtime.candidateEScoringProfile,
    descriptions: runtime.descriptions,
    answers: state.answers,
  });
  const profileAgreement = candidateAResult.persona.id === candidateEResult.persona.id;
  const xyOrder = profileAgreement ? [] : createXYOrder(state.pilot.pilotId);
  return {
    mode: 'pilot',
    pilotId: state.pilot.pilotId,
    profileAgreement,
    candidateAResult,
    candidateEResult,
    xyOrder,
    publicCards: profileAgreement
      ? [{ label: 'result', sourceProfile: 'candidate-a', result: candidateAResult }]
      : xyOrder.map((sourceProfile, index) => ({
        label: index === 0 ? 'X' : 'Y',
        sourceProfile,
        result: sourceProfile === 'candidate-a' ? candidateAResult : candidateEResult,
      })),
  };
}

export function createPilotExportRecord({ runtime, state }) {
  if (state.result?.mode !== 'pilot') throw new Error('Pilot result is not ready');
  const result = state.result;
  const finishedAt = state.completedAt ?? new Date().toISOString();
  const durationSeconds = state.startedAt
    ? Math.max(0, Math.round((new Date(finishedAt).getTime() - new Date(state.startedAt).getTime()) / 1000))
    : null;
  const preference = state.pilot.feedback.preferredResult ?? null;
  const helpful = state.pilot.feedback.moreHelpfulResult ?? null;
  return {
    publicResultVersion: PILOT_RESULT_VERSION,
    pilotId: result.pilotId,
    completedAt: finishedAt,
    durationSeconds,
    questionCount: runtime.questionBank.questions.length,
    answerIds: Object.fromEntries(runtime.questionBank.questions.map((question) => [question.id, state.answers[question.id]])),
    candidateAResult: compactResult(result.candidateAResult),
    candidateEResult: compactResult(result.candidateEResult),
    profileAgreement: result.profileAgreement,
    xyOrder: result.xyOrder,
    resultRatings: {
      xFit: state.pilot.feedback.xFit ?? null,
      yFit: state.pilot.feedback.yFit ?? null,
      overallFit: state.pilot.feedback.overallFit ?? null,
      coreFit: state.pilot.feedback.coreFit ?? null,
      needsFit: state.pilot.feedback.needsFit ?? null,
      riskFit: state.pilot.feedback.riskFit ?? null,
      growthHelp: state.pilot.feedback.growthHelp ?? null,
    },
    finalPreference: preference,
    moreHelpfulResult: helpful,
    responseStyleMetrics: result.candidateEResult.scoring.responseStyleMetrics,
    adaptiveAlpha: result.candidateEResult.scoring.adaptiveAlpha,
    candidateATop1Top2Gap: result.candidateAResult.scoring.top1Top2Gap,
    candidateETop1Top2Gap: result.candidateEResult.scoring.top1Top2Gap,
    candidateELowConfidence: result.candidateEResult.scoring.lowConfidence,
    textFeedback: Object.fromEntries(PILOT_TEXT_FIELDS.map((field) => [field.name, state.pilot.feedback[field.name] ?? ''])),
  };
}

export function summarizePilotRecords(records) {
  const unique = new Map();
  for (const record of records) {
    if (record?.pilotId && !unique.has(record.pilotId)) unique.set(record.pilotId, record);
  }
  const rows = [...unique.values()];
  const disagreementRows = rows.filter((record) => record.profileAgreement === false);
  const ePreferred = disagreementRows.filter((record) => preferenceToProfile(record, record.finalPreference) === 'candidate-e').length;
  const aPreferred = disagreementRows.filter((record) => preferenceToProfile(record, record.finalPreference) === 'candidate-a').length;
  return {
    importedCount: records.length,
    uniqueCount: rows.length,
    agreementCount: rows.filter((record) => record.profileAgreement).length,
    disagreementCount: disagreementRows.length,
    candidateEPreferredCount: ePreferred,
    candidateAPreferredCount: aPreferred,
    bothOrNeitherCount: disagreementRows.length - ePreferred - aPreferred,
    averageCandidateEFit: average(rows.map((record) => Number(record.resultRatings?.overallFit)).filter(Number.isFinite)),
    rows,
  };
}

export function pilotRecordsToCsv(records) {
  const summary = summarizePilotRecords(records);
  const fields = [
    'pilotId',
    'completedAt',
    'durationSeconds',
    'profileAgreement',
    'candidateA',
    'candidateE',
    'xyOrder',
    'overallFit',
    'xFit',
    'yFit',
    'finalPreference',
    'moreHelpfulResult',
    'adaptiveAlpha',
    'candidateETop1Top2Gap',
    'candidateELowConfidence',
    'obviousMismatch',
    'leastFittingLine',
    'difficultQuestions',
    'tooLong',
    'willingToShare',
  ];
  const lines = [fields.join(',')];
  for (const record of summary.rows) {
    lines.push(fields.map((field) => csvValue(csvField(record, field))).join(','));
  }
  return lines.join('\n');
}

export function createPilotCode(record) {
  return [
    record.pilotId,
    record.profileAgreement ? 'same' : 'diff',
    record.candidateAResult?.persona?.displayName,
    record.candidateEResult?.persona?.displayName,
    record.resultRatings?.overallFit ?? 'na',
  ].join('|');
}

function compactResult(result) {
  return {
    profile: result.scoring.scoringProfile,
    persona: {
      id: result.persona.id,
      displayName: result.persona.displayName,
    },
    top5: result.scoring.top5.map((persona) => ({
      id: persona.id,
      displayName: persona.displayName,
      distance: persona.distance,
      matchScore: persona.matchScore,
    })),
    top1Top2Gap: result.scoring.top1Top2Gap,
    lowConfidence: result.scoring.lowConfidence ?? result.scoring.top1Top2Gap <= 2.5,
    adaptiveAlpha: result.scoring.adaptiveAlpha ?? null,
  };
}

function createXYOrder(pilotId) {
  const rng = createSeededRng(`pilot-xy:${pilotId}`);
  return rng() < 0.5 ? ['candidate-a', 'candidate-e'] : ['candidate-e', 'candidate-a'];
}

function createPilotId() {
  if (globalThis.crypto?.getRandomValues) {
    const buffer = new Uint32Array(2);
    globalThis.crypto.getRandomValues(buffer);
    return `pilot-${buffer[0].toString(16).padStart(8, '0')}${buffer[1].toString(16).padStart(8, '0')}`;
  }
  return `pilot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function preferenceToProfile(record, value) {
  if (!['X', 'Y'].includes(value)) return null;
  const index = value === 'X' ? 0 : 1;
  return record.xyOrder?.[index] ?? null;
}

function csvField(record, field) {
  if (field === 'candidateA') return record.candidateAResult?.persona?.displayName;
  if (field === 'candidateE') return record.candidateEResult?.persona?.displayName;
  if (field === 'xyOrder') return record.xyOrder?.join('>');
  if (field in (record.resultRatings ?? {})) return record.resultRatings[field];
  if (field in (record.textFeedback ?? {})) return record.textFeedback[field];
  return record[field];
}

function csvValue(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function average(values) {
  if (!values.length) return null;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}
