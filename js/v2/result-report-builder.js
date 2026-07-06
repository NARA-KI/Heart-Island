import { V2_REPORT_SCHEMA_VERSION } from './config.js';
import { ADVICE_LIBRARY } from './result-rules.js';

const DIAGNOSTIC_TERMS = ['依恋障碍', '人格障碍', '精神疾病', '创伤导致', '病态', '诊断'];

export function buildDeterministicReport(facts) {
  const top3 = facts.topConstructs.slice(0, 3);
  const bottom2 = facts.bottomConstructs.slice(0, 2);
  const primaryConflict = facts.conflicts[0] ?? null;
  const keyTraits = buildKeyTraits(facts, top3, bottom2);
  const advice = buildAdvice(facts);
  const report = {
    schemaVersion: V2_REPORT_SCHEMA_VERSION,
    oneLine: sentence([
      `${facts.persona.displayName}的核心不是一个固定标签`,
      `而是${top3.map((item) => item.label).join('、')}共同形成的关系节奏`,
      primaryConflict ? primaryConflict.summary : '这次答案里的关系模式相对一致',
    ]),
    keyTraits,
    neededRelationship: buildNeededRelationship(facts, top3, bottom2),
    innerConflict: primaryConflict
      ? `${primaryConflict.summary}${primaryConflict.detail ? ` ${primaryConflict.detail}` : ''}`
      : `你的高分倾向集中在${top3.map((item) => item.label).join('、')}，目前没有特别尖锐的内在张力，更像是一组方向一致的关系偏好。`,
    misunderstoodByOthers: buildMisunderstanding(facts, top3, bottom2, primaryConflict),
    strengths: facts.strengths.slice(0, 3).map((item) => normalizeSentence(item)),
    repeatPatterns: facts.riskPatterns.slice(0, 2).map((item) => normalizeSentence(item)),
    advice,
    evidence: {
      personaId: facts.persona.id,
      constructCodes: [...new Set([...top3.map((item) => item.code), ...bottom2.map((item) => item.code)])],
      conflictIds: facts.conflicts.slice(0, 2).map((item) => item.id),
    },
    safetyDisclaimer: '本结果用于自我理解和关系沟通参考，不作为专业评估或医疗建议。',
    source: 'deterministic',
  };
  validateResultReport(report);
  return report;
}

export function validateResultReport(report) {
  const errors = [];
  if (report?.schemaVersion !== V2_REPORT_SCHEMA_VERSION) errors.push('invalid report schema version');
  if (!textOk(report?.oneLine, 24, 180)) errors.push('oneLine length invalid');
  if (!Array.isArray(report?.keyTraits) || report.keyTraits.length !== 3) errors.push('keyTraits must contain three entries');
  if (!textOk(report?.neededRelationship, 24, 260)) errors.push('neededRelationship length invalid');
  if (!textOk(report?.innerConflict, 12, 280)) errors.push('innerConflict length invalid');
  if (!textOk(report?.misunderstoodByOthers, 12, 240)) errors.push('misunderstoodByOthers length invalid');
  if (!Array.isArray(report?.strengths) || report.strengths.length < 2 || report.strengths.length > 3) errors.push('strengths length invalid');
  if (!Array.isArray(report?.repeatPatterns) || report.repeatPatterns.length < 1 || report.repeatPatterns.length > 2) errors.push('repeatPatterns length invalid');
  if (!Array.isArray(report?.advice) || report.advice.length !== 3) errors.push('advice must contain three entries');
  for (const advice of report?.advice ?? []) {
    if (!textOk(advice.title, 2, 18) || !textOk(advice.text, 12, 90)) errors.push('advice item invalid');
  }
  const serialized = JSON.stringify(report);
  if (/<\/?[a-z][\s\S]*>/i.test(serialized)) errors.push('report must not contain HTML');
  if (serialized.includes('undefined') || serialized.includes('NaN')) errors.push('report contains invalid literal');
  if (DIAGNOSTIC_TERMS.some((term) => serialized.includes(term))) errors.push('report contains diagnostic term');
  if (!report?.evidence?.personaId || !Array.isArray(report.evidence.constructCodes)) errors.push('missing evidence');
  if (errors.length) throw new Error(errors.join('\n'));
  return true;
}

function buildKeyTraits(facts, top3, bottom2) {
  const close = facts.confidence.isCloseMatch ? '结果接近相邻类型，说明你的关系节奏可能会随情境切换。' : '';
  const quality = facts.responseQuality.level !== 'normal' ? facts.responseQuality.userMessage : '';
  return [
    `${top3[0].label}最突出：${top3[0].explanation}`,
    `${top3[1].label}和${top3[2].label}共同影响你靠近或退后的方式。`,
    close || quality || `${bottom2[0].label}相对较低，这不代表缺陷，只表示它不是你这次答案里的主要驱动力。`,
  ].map(normalizeSentence);
}

function buildNeededRelationship(facts, top3, bottom2) {
  const needs = facts.needs.slice(0, 2).join('；');
  return normalizeSentence(`你真正适合的关系，需要能承接你的${top3[0].label}和${top3[1].label}，也允许你在${bottom2[0].label}不那么强的时候不用勉强表演。${needs}`);
}

function buildMisunderstanding(facts, top3, bottom2, conflict) {
  if (conflict) {
    return normalizeSentence(`别人可能只看见你在${conflict.evidence.map((code) => labelFor(facts, code)).join('和')}之间的摇摆，却没有意识到这其实是在平衡两种真实需要。`);
  }
  return normalizeSentence(`别人可能会把你的${bottom2[0].label}相对较低理解成不在意，但从这次结果看，你更习惯通过${top3[0].label}和${top3[1].label}表达关系重点。`);
}

function buildAdvice(facts) {
  const selected = facts.adviceTags
    .map((tag) => ADVICE_LIBRARY[tag])
    .filter(Boolean);
  const fallback = [ADVICE_LIBRARY.expressOneNeed, ADVICE_LIBRARY.askBeforeAssuming, ADVICE_LIBRARY.keepNonDiagnostic];
  return uniqueByTitle([...selected, ...fallback]).slice(0, 3);
}

function labelFor(facts, code) {
  return facts.constructRanking.find((item) => item.code === code)?.label ?? code;
}

function sentence(parts) {
  return normalizeSentence(parts.filter(Boolean).join('，'));
}

function normalizeSentence(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function textOk(value, min, max) {
  const length = normalizeSentence(value).length;
  return length >= min && length <= max;
}

function uniqueByTitle(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item || seen.has(item.title)) return false;
    seen.add(item.title);
    return true;
  });
}
