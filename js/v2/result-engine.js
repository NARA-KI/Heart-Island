import { CONSTRUCT_LABELS } from './config.js';
import { buildResultFactsFromScoring } from './result-facts.js';
import { buildDeterministicReport } from './result-report-builder.js';
import { scoreAnswers, scoreAnswersAdaptiveHybrid } from './scoring-engine.js';

export function buildResult({ manifest = {}, questionBank, candidateA, descriptions, answers, assessment }) {
  const scoring = scoreAnswers(questionBank, candidateA, answers);
  return buildResultFromScoring({
    manifest,
    questionBank,
    candidateA,
    descriptions,
    answers,
    scoring,
    assessment,
  });
}

export function buildAdaptiveResult({ manifest = {}, questionBank, candidateE, candidateEScoringProfile, descriptions, answers }) {
  const scoring = scoreAnswersAdaptiveHybrid(questionBank, candidateE, candidateEScoringProfile, answers);
  return buildResultFromScoring({ manifest, questionBank, candidateA: candidateE, descriptions, answers, scoring });
}

export function buildResultFromScoring({
  manifest = {},
  questionBank,
  candidateA,
  descriptions,
  answers,
  scoring,
  assessment,
}) {
  const persona = scoring.finalPersona;
  const description = descriptions.personas.find((item) => item.id === persona.id)
    ?? descriptions.personas.find((item) => item.displayName === persona.displayName)
    ?? null;
  const facts = buildResultFactsFromScoring({
    manifest,
    questionBank,
    candidateA,
    descriptions,
    answers,
    scoring,
    assessment,
  });
  const report = buildDeterministicReport(facts);
  const highConstructs = Object.entries(scoring.constructScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([code, score]) => ({ code, label: CONSTRUCT_LABELS[code] ?? code, score }));
  const lowConstructs = Object.entries(scoring.constructScores)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 4)
    .map(([code, score]) => ({ code, label: CONSTRUCT_LABELS[code] ?? code, score }));

  return {
    persona,
    description,
    matchStrength: persona.matchScore,
    matchStrengthLevel: matchStrengthLevel(persona.matchScore),
    matchStrengthNote: '这是本次答案与候选人格画像的贴合倾向分级，不是统计概率，也不是心理测量准确率。',
    highConstructs,
    lowConstructs,
    facts,
    deterministicReport: report,
    report,
    aiReport: null,
    aiReportStatus: { state: 'idle', message: '' },
    scoring,
    sections: buildSections(description, report),
  };
}

function matchStrengthLevel(score) {
  if (score >= 82) return '匹配倾向非常明显';
  if (score >= 70) return '匹配倾向明显';
  if (score >= 58) return '匹配倾向较明显';
  return '匹配倾向有一定参考价值';
}

function buildSections(description, report) {
  return {
    corePattern: report?.oneLine || description?.coreDrive || description?.relationshipPattern || '你的答案显示出一组稳定的关系倾向。',
    neededRelationship: report?.neededRelationship || [description?.relationshipNeeds, description?.suitableRelationshipEnvironment].filter(Boolean).join('\n\n'),
    inertia: report?.repeatPatterns ?? (Array.isArray(description?.blindSpots) ? description.blindSpots : []),
    growth: report?.advice?.map((item) => `${item.title}：${item.text}`) ?? buildGrowthItems(description),
    summary: report?.oneLine || description?.oneLineSummary || '',
    keywords: buildKeywords(description),
  };
}

function buildKeywords(description) {
  const constructs = [
    ...(description?.primaryConstructs ?? []),
    ...(description?.secondaryConstructs ?? []),
  ].map((code) => CONSTRUCT_LABELS[code]).filter(Boolean);
  const fallback = Array.isArray(description?.strengths) ? description.strengths : [];
  return [...new Set([...constructs, ...fallback])].slice(0, 5);
}

function buildGrowthItems(description) {
  const items = [];
  if (description?.commonMisunderstandings) items.push(description.commonMisunderstandings);
  if (Array.isArray(description?.blindSpots) && description.blindSpots[0]) {
    items.push(`当你发现自己又进入“${description.blindSpots[0]}”时，先暂停一下，确认这是真实需要，还是旧惯性在替你做决定。`);
  }
  if (description?.communicationStyle) {
    items.push('把感受翻译成一个具体请求，会比等待对方自行理解更稳定。');
  }
  return items.slice(0, 3);
}
