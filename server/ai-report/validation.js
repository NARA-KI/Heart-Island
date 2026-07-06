import {
  CANONICAL_PERSONA_IDS,
  V2_EXPECTED_CONSTRUCTS,
  V2_RESULT_SCHEMA_VERSION,
} from '../../js/v2/config.js';
import { createResultHash, validateStrictAiReport } from '../../js/v2/ai/ai-report-schema.js';
import { validateResultFacts } from '../../js/v2/result-facts.js';
import { CONFLICT_RULES } from '../../js/v2/result-rules.js';

const allowedTopLevel = new Set(['requestId', 'resultHash', 'facts']);
const forbiddenTopLevel = new Set(['answers', 'rawAnswers', 'localStorage', 'feedback', 'phone', 'wechat', 'address', 'name']);

export function validateAiReportRequest(payload) {
  const errors = [];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) errors.push('request body must be an object');
  for (const key of Object.keys(payload ?? {})) {
    if (!allowedTopLevel.has(key)) errors.push(`unexpected field: ${key}`);
    if (forbiddenTopLevel.has(key)) errors.push(`forbidden field: ${key}`);
  }
  if (!payload?.requestId || typeof payload.requestId !== 'string') errors.push('requestId is required');
  if (!payload?.resultHash || typeof payload.resultHash !== 'string') errors.push('resultHash is required');
  const facts = payload?.facts;
  try {
    validateResultFacts(facts);
  } catch (error) {
    errors.push(error.message);
  }
  if (facts?.versions?.resultSchemaVersion !== V2_RESULT_SCHEMA_VERSION) errors.push('unsupported result schema version');
  if (!CANONICAL_PERSONA_IDS.includes(facts?.persona?.id)) errors.push('invalid persona id');
  const constructs = Object.keys(facts?.constructScores ?? {});
  if (constructs.length !== 15) errors.push('construct score count must be 15');
  for (const code of V2_EXPECTED_CONSTRUCTS) {
    const score = facts?.constructScores?.[code];
    if (typeof score !== 'number' || score < 0 || score > 100) errors.push(`invalid construct score: ${code}`);
  }
  const validConflictIds = new Set(CONFLICT_RULES.map((rule) => rule.id));
  for (const conflict of facts?.conflicts ?? []) {
    if (!validConflictIds.has(conflict.id)) errors.push(`invalid conflict id: ${conflict.id}`);
    for (const code of conflict.evidence ?? []) {
      if (!V2_EXPECTED_CONSTRUCTS.includes(code)) errors.push(`invalid conflict evidence: ${code}`);
    }
  }
  if (payload?.resultHash !== createResultHash(facts)) errors.push('resultHash mismatch');
  if (errors.length) throw httpError(422, errors.join('\n'));
  return { requestId: payload.requestId, resultHash: payload.resultHash, facts };
}

export function validateAiReportResponse(report, facts) {
  validateStrictAiReport(report, facts);
  return report;
}

export function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}
