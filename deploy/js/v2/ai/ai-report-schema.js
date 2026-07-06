import {
  V2_AI_REPORT_PROMPT_VERSION,
  V2_EXPECTED_CONSTRUCTS,
  V2_REPORT_SCHEMA_VERSION,
} from '../config.js';
import { validateResultReport } from '../result-report-builder.js';

export const AI_REPORT_PROMPT_VERSION = V2_AI_REPORT_PROMPT_VERSION;

export const AI_REPORT_ALLOWED_KEYS = [
  'schemaVersion',
  'oneLine',
  'keyTraits',
  'neededRelationship',
  'innerConflict',
  'misunderstoodByOthers',
  'strengths',
  'repeatPatterns',
  'advice',
  'evidence',
  'safetyDisclaimer',
  'source',
];

export function createResultHash(facts) {
  const payload = {
    questionBankVersion: facts?.versions?.questionBankVersion,
    scoringProfile: facts?.versions?.scoringProfile,
    personaId: facts?.persona?.id,
    constructScores: Object.fromEntries(
      Object.entries(facts?.constructScores ?? {})
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([code, score]) => [code, Number(Number(score).toFixed(4))]),
    ),
    conflictIds: (facts?.conflicts ?? []).map((item) => item.id).sort(),
    resultReportSchemaVersion: V2_REPORT_SCHEMA_VERSION,
    promptVersion: AI_REPORT_PROMPT_VERSION,
  };
  return `air-${fnv1a(stableStringify(payload))}`;
}

export function validateStrictAiReport(report, facts) {
  validateResultReport(report);
  const errors = [];
  const keys = Object.keys(report ?? {});
  const extras = keys.filter((key) => !AI_REPORT_ALLOWED_KEYS.includes(key));
  if (extras.length) errors.push(`report contains extra fields: ${extras.join(',')}`);
  if (report?.schemaVersion !== V2_REPORT_SCHEMA_VERSION) errors.push('invalid report schema version');
  if (report?.source !== 'ai') errors.push('ai report source must be ai');
  if (containsMarkdownShell(report)) errors.push('report contains markdown shell');

  const evidence = report?.evidence ?? {};
  if (evidence.personaId !== facts?.persona?.id) errors.push('evidence personaId is outside facts');
  if (!Array.isArray(evidence.constructCodes) || evidence.constructCodes.length < 3 || evidence.constructCodes.length > 6) {
    errors.push('evidence constructCodes must contain 3 to 6 items');
  }
  const allowedConstructs = new Set(V2_EXPECTED_CONSTRUCTS);
  const factConflictIds = new Set((facts?.conflicts ?? []).map((item) => item.id));
  for (const code of evidence.constructCodes ?? []) {
    if (!allowedConstructs.has(code)) errors.push(`evidence construct outside facts: ${code}`);
  }
  for (const id of evidence.conflictIds ?? []) {
    if (!factConflictIds.has(id)) errors.push(`evidence conflict outside facts: ${id}`);
  }
  if (errors.length) throw new Error(errors.join('\n'));
  return true;
}

function containsMarkdownShell(report) {
  const text = JSON.stringify(report ?? {});
  return /```|#{1,6}\s/.test(text);
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function fnv1a(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
