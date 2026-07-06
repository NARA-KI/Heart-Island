import {
  V2_CLOSE_MATCH_GAP_THRESHOLD,
  V2_PRODUCT_VERSION,
  V2_RESULT_SCHEMA_VERSION,
} from './config.js';
import { scoreAnswers } from './scoring-engine.js';
import {
  buildConstructRanking,
  buildNeedsStrengthsRisks,
  detectConflicts,
  detectResponseQuality,
} from './result-rules.js';

const personaImageMap = {
  lighthouse: './assets/personas/lighthouse.webp',
  gatekeeper: './assets/personas/gatekeeper.webp',
  'nest-builder': './assets/personas/nest-builder.webp',
  collector: './assets/personas/collector.webp',
  'migratory-bird': './assets/personas/migratory-bird.webp',
  islander: './assets/personas/islander.webp',
  explorer: './assets/personas/explorer.webp',
  'wandering-poet': './assets/personas/wandering-poet.webp',
  spark: './assets/personas/spark.webp',
  moonlight: './assets/personas/moonlight.webp',
  mirror: './assets/personas/mirror.webp',
  stargazer: './assets/personas/stargazer.webp',
};

export function buildResultFacts({ manifest, questionBank, candidateA, descriptions, answers, generatedAt = new Date().toISOString() }) {
  const scoring = scoreAnswers(questionBank, candidateA, answers);
  return buildResultFactsFromScoring({
    manifest,
    questionBank,
    candidateA,
    descriptions,
    answers,
    scoring,
    generatedAt,
  });
}

export function buildResultFactsFromScoring({ manifest, questionBank, candidateA, descriptions, answers, scoring, generatedAt = new Date().toISOString() }) {
  const top1 = scoring.top5[0];
  const top2 = scoring.top5[1];
  const description = descriptions.personas.find((item) => item.id === top1.id)
    ?? descriptions.personas.find((item) => item.displayName === top1.displayName)
    ?? {};
  const constructRanking = buildConstructRanking(scoring.constructScores);
  const topConstructs = constructRanking.slice(0, 5);
  const bottomConstructs = [...constructRanking].reverse().slice(0, 4);
  const conflicts = detectConflicts(scoring.constructScores);
  const derived = buildNeedsStrengthsRisks({ description, topConstructs, bottomConstructs, conflicts });
  const isCloseMatch = scoring.top1Top2Gap <= V2_CLOSE_MATCH_GAP_THRESHOLD;
  const responseQuality = detectResponseQuality(scoring, answers, questionBank);

  const facts = {
    resultId: createResultId({ answers, questionBankVersion: manifest.questionnaireVersion, scoringProfile: candidateA.scoringProfile ?? 'candidate-a' }),
    generatedAt,
    versions: {
      productVersion: V2_PRODUCT_VERSION,
      questionBankVersion: manifest.questionnaireVersion,
      questionBankHash: manifest.questionBankHash,
      scoringProfile: candidateA.scoringProfile ?? manifest.scoringProfile ?? 'candidate-a',
      resultSchemaVersion: V2_RESULT_SCHEMA_VERSION,
    },
    persona: {
      id: top1.id,
      displayName: top1.displayName,
      image: personaImageMap[top1.id] ?? null,
      hitLine: description.oneLineSummary ?? '',
      keywords: buildKeywords(description, topConstructs),
      rank: 1,
      distance: top1.distance,
    },
    personaRanking: scoring.personaScores.map((persona, index) => ({
      id: persona.id,
      displayName: persona.displayName,
      distance: persona.distance,
      rank: index + 1,
    })),
    confidence: {
      top1Distance: top1.distance,
      top2Distance: top2.distance,
      top1Top2Gap: scoring.top1Top2Gap,
      level: isCloseMatch ? 'close' : 'clear',
      isCloseMatch,
      userMessage: isCloseMatch
        ? '你的结果同时靠近另一种关系倾向，这意味着你在不同情境下可能呈现出两种相邻模式。'
        : '你的主要关系倾向在本次答案中相对清晰。',
    },
    constructScores: scoring.constructScores,
    constructRanking,
    topConstructs,
    bottomConstructs,
    conflicts,
    needs: derived.needs,
    strengths: derived.strengths,
    riskPatterns: derived.riskPatterns,
    adviceTags: derived.adviceTags,
    responseQuality,
  };

  validateResultFacts(facts);
  return facts;
}

export function validateResultFacts(facts) {
  const errors = [];
  if (facts?.versions?.resultSchemaVersion !== V2_RESULT_SCHEMA_VERSION) errors.push('invalid result facts schema version');
  if (!facts?.resultId) errors.push('missing resultId');
  if (!facts?.persona?.id || !facts?.persona?.displayName) errors.push('missing persona');
  if (!Array.isArray(facts?.personaRanking) || facts.personaRanking.length < 2) errors.push('personaRanking must include at least two entries');
  if (!facts?.confidence || typeof facts.confidence.top1Top2Gap !== 'number') errors.push('missing confidence gap');
  if (!facts?.constructScores || Object.keys(facts.constructScores).length !== 15) errors.push('constructScores must include all 15 constructs');
  if (!Array.isArray(facts?.constructRanking) || facts.constructRanking.length !== 15) errors.push('constructRanking must include all 15 constructs');
  if (!Array.isArray(facts?.topConstructs) || facts.topConstructs.length < 3) errors.push('topConstructs must include at least three entries');
  if (!Array.isArray(facts?.bottomConstructs) || facts.bottomConstructs.length < 2) errors.push('bottomConstructs must include at least two entries');
  if (!facts?.responseQuality?.level) errors.push('missing responseQuality');
  if (errors.length) throw new Error(errors.join('\n'));
  return true;
}

function buildKeywords(description, topConstructs) {
  const fromDescription = [
    ...(description.primaryConstructs ?? []),
    ...(description.secondaryConstructs ?? []),
  ];
  const labels = topConstructs.map((item) => item.label);
  const descriptive = fromDescription
    .map((code) => topConstructs.find((item) => item.code === code)?.label)
    .filter(Boolean);
  return [...new Set([...descriptive, ...labels, ...(description.strengths ?? [])])].slice(0, 5);
}

function createResultId({ answers, questionBankVersion, scoringProfile }) {
  const text = JSON.stringify({ questionBankVersion, scoringProfile, answers: Object.entries(answers).sort() });
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `v2-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function personaImageForId(id) {
  return personaImageMap[id] ?? null;
}
