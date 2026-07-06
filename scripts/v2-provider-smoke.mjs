import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { buildResult } from '../js/v2/result-engine.js';
import { createResultHash, validateStrictAiReport } from '../js/v2/ai/ai-report-schema.js';
import { handleAiReportRequest } from '../server/ai-report/handler.js';
import { answersForBaselineSource } from '../tests/v2-baseline-samples.mjs';

const root = process.cwd();
const outDir = path.join(root, 'reports', 'audit-assets', 'v2-provider-smoke-and-deploy');
const resultPath = path.join(outDir, 'provider-smoke-summary.json');
const privateReviewPath = path.join(root, 'reports', 'private', 'v2-real-ai-report-quality-review.md');
const promptComparePath = path.join(root, 'reports', 'private', 'v2-ai-prompt-1-vs-2-review.md');
const env = loadPrivateEnv();
const requiredRealEnv = [
  'AI_REPORT_API_KEY',
  'AI_REPORT_BASE_URL',
  'AI_REPORT_MODEL',
];

fs.mkdirSync(outDir, { recursive: true });

if (!isRealProviderConfigured(env)) {
  const blocked = {
    status: 'BLOCKED',
    reason: 'real DeepSeek provider env is not configured',
    required: [
      'AI_REPORT_PROVIDER=deepseek',
      'AI_REPORT_ENABLED=true',
      ...requiredRealEnv,
    ],
    checkedPrivateFiles: ['.env.local', '.env'].filter((file) => fs.existsSync(path.join(root, file))),
    generatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(resultPath, `${JSON.stringify(blocked, null, 2)}\n`);
  console.log(JSON.stringify(blocked, null, 2));
  process.exit(0);
}

const questionBank = readJson('data/v2/question-bank.v2.json');
const candidateA = readJson('data/v2/persona-target-vectors.v2.candidate-a.json');
const descriptions = readJson('data/v2/persona-descriptions.v2.json');
const manifest = readJson('data/v2/manifest.json');
const baselines = readJson('tests/fixtures/v2-result-baselines.json');
candidateA.scoringProfile = 'candidate-a';

const sampleIds = [
  'real-collector',
  'same-persona-migratory-a',
  'same-persona-migratory-b',
  'conflict-au-cl-ri-high-sc-low',
  'focused-sc-high',
];
if (env.V2_PROVIDER_SMOKE_EXTENDED === 'true') {
  sampleIds.push('high-si-high-mn', 'abnormal-all-a');
}
const repeats = ['real-collector', 'same-persona-migratory-a'];
const samples = sampleIds.map((id) => buildSample(id));
const apiPath = env.AI_REPORT_API_PATH || '/api/v2/ai-report';
const serverEnv = {
  ...env,
  AI_REPORT_PROVIDER: 'deepseek',
  AI_REPORT_ENABLED: 'true',
  AI_REPORT_SESSION_LIMIT: env.AI_REPORT_SESSION_LIMIT || '20',
  AI_REPORT_CACHE_TTL_MS: env.AI_REPORT_CACHE_TTL_MS || '600000',
};

const { server, baseUrl, origin } = await startServer({ apiPath, env: serverEnv });
serverEnv.ALLOWED_ORIGIN = env.ALLOWED_ORIGIN || origin;

try {
  const prompt1Reports = loadPrivateReviewReports(privateReviewPath);
  const cors = await checkCors({ baseUrl, apiPath, allowedOrigin: serverEnv.ALLOWED_ORIGIN });
  const runs = [];
  for (const sample of samples) {
    runs.push(await runSample({ baseUrl, apiPath, origin: serverEnv.ALLOWED_ORIGIN, sample, repeat: false }));
  }
  for (const id of repeats) {
    runs.push(await runSample({
      baseUrl,
      apiPath,
      origin: serverEnv.ALLOWED_ORIGIN,
      sample: samples.find((item) => item.sampleId === id),
      repeat: true,
    }));
  }
  const quality = evaluatePrompt2Quality(runs);
  if (runs.some((item) => !item.repeat && item.reviewReport)) {
    writePrivateQualityReview({ runs, filePath: privateReviewPath });
    writePromptComparisonReview({
      prompt1Reports,
      runs,
      quality,
      filePath: promptComparePath,
    });
  }
  const summary = summarize({
    runs,
    cors,
    sampleCount: samples.length,
    realProviderCallCount: Number(serverEnv.__AI_REPORT_PROVIDER_CALLS || 0),
    privateReviewPath,
    promptComparePath,
    quality,
  });
  fs.writeFileSync(resultPath, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
  if (summary.schemaFailureRate > 0 || summary.providerErrorRate > 0 || !summary.quality.pass) process.exitCode = 1;
} finally {
  await new Promise((resolve) => server.close(resolve));
}

function buildSample(id) {
  const baseline = baselines.samples.find((item) => item.id === id);
  if (!baseline) throw new Error(`Unknown smoke sample: ${id}`);
  const answers = answersForBaselineSource(questionBank, baseline.source);
  const result = buildResult({ manifest, questionBank, candidateA, descriptions, answers });
  const resultHash = createResultHash(result.facts);
  return {
    sampleId: id,
    label: baseline.label,
    personaId: result.facts.persona.id,
    resultHash,
    facts: result.facts,
  };
}

async function runSample({ baseUrl, apiPath, origin, sample, repeat }) {
  const started = performance.now();
  const response = await fetch(`${baseUrl}${apiPath}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
    },
    body: JSON.stringify({
      requestId: `smoke-${sample.sampleId}-${repeat ? 'repeat' : 'first'}-${Date.now()}`,
      resultHash: sample.resultHash,
      facts: sample.facts,
    }),
  });
  const latencyMs = Math.round(performance.now() - started);
  let body = {};
  try {
    body = await response.json();
  } catch {
    body = {};
  }

  let schemaValid = false;
  let evidenceValid = false;
  if (response.ok && body.report) {
    try {
      validateStrictAiReport(body.report, sample.facts);
      schemaValid = true;
      evidenceValid = true;
    } catch {
      schemaValid = false;
      evidenceValid = false;
    }
  }

  return {
    sampleId: sample.sampleId,
    personaId: sample.personaId,
    httpStatus: response.status,
    aiSuccess: response.ok && body.report?.source === 'ai',
    finishReason: body.finishReason ?? null,
    schemaValid,
    evidenceValid,
    latencyMs,
    promptTokens: body.usage?.promptTokens ?? null,
    completionTokens: body.usage?.completionTokens ?? null,
    totalTokens: body.usage?.totalTokens ?? null,
    cacheHit: body.cacheHit === true,
    degraded: !response.ok || body.report?.source !== 'ai',
    errorType: body.errorType ?? null,
    repeat,
    reviewReport: !repeat && response.ok ? body.report : null,
  };
}

async function checkCors({ baseUrl, apiPath, allowedOrigin }) {
  const legal = await fetch(`${baseUrl}${apiPath}`, {
    method: 'OPTIONS',
    headers: { Origin: allowedOrigin },
  });
  const illegal = await fetch(`${baseUrl}${apiPath}`, {
    method: 'OPTIONS',
    headers: { Origin: 'https://invalid.example' },
  });
  return {
    legalOriginStatus: legal.status,
    illegalOriginStatus: illegal.status,
    legalAllowed: legal.status === 204 && legal.headers.get('access-control-allow-origin') === allowedOrigin,
    illegalRejected: illegal.status === 403,
  };
}

function summarize({ runs, cors, sampleCount, realProviderCallCount, privateReviewPath, promptComparePath, quality }) {
  const firstRuns = runs.filter((item) => !item.repeat);
  const successCount = firstRuns.filter((item) => item.aiSuccess).length;
  const degradedCount = firstRuns.filter((item) => item.degraded).length;
  const latencies = firstRuns.map((item) => item.latencyMs).sort((a, b) => a - b);
  const schemaFailures = firstRuns.filter((item) => !item.schemaValid).length;
  const providerErrors = firstRuns.filter((item) => item.errorType?.startsWith('provider')).length;
  return {
    status: 'COMPLETED',
    generatedAt: new Date().toISOString(),
    sampleCount,
    successCount,
    degradedCount,
    schemaPassRate: ratio(firstRuns.filter((item) => item.schemaValid).length, firstRuns.length),
    schemaFailureRate: ratio(schemaFailures, firstRuns.length),
    providerErrorRate: ratio(providerErrors, firstRuns.length),
    averageLatencyMs: average(latencies),
    p50LatencyMs: percentile(latencies, 50),
    p95LatencyMs: percentile(latencies, 95),
    averagePromptTokens: averageKnown(firstRuns.map((item) => item.promptTokens)),
    averageCompletionTokens: averageKnown(firstRuns.map((item) => item.completionTokens)),
    averageTotalTokens: averageKnown(firstRuns.map((item) => item.totalTokens)),
    cacheVerified: repeats.every((id) => runs.some((item) => item.sampleId === id && item.repeat && item.cacheHit)),
    realProviderCallCount,
    privateReviewPath: path.relative(root, privateReviewPath).replaceAll('\\', '/'),
    promptComparePath: path.relative(root, promptComparePath).replaceAll('\\', '/'),
    quality,
    cors,
    runs: runs.map(sanitizeRunForSummary),
  };
}

function sanitizeRunForSummary(run) {
  const { reviewReport, ...publicRun } = run;
  return publicRun;
}

function writePrivateQualityReview({ runs, filePath }) {
  const firstRuns = runs.filter((item) => !item.repeat && item.reviewReport);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const sections = [
    '# 心岛 V2 真实 AI Report 人工质量评审',
    '',
    `生成时间：${new Date().toISOString()}`,
    '',
    '本文件仅供本地人工评审使用，已排除 API Key、原始 60 题答案、完整请求头、用户身份信息和环境变量。',
    '',
  ];
  for (const run of firstRuns) {
    sections.push(
      `## ${run.sampleId}`,
      '',
      `- personaId: ${run.personaId}`,
      `- finishReason: ${run.finishReason ?? 'unknown'}`,
      `- latencyMs: ${run.latencyMs}`,
      `- cacheHit: ${run.cacheHit}`,
      '',
      '```json',
      JSON.stringify(run.reviewReport, null, 2),
      '```',
      '',
    );
  }
  fs.writeFileSync(filePath, `${sections.join('\n')}\n`);
}

function writePromptComparisonReview({ prompt1Reports, runs, quality, filePath }) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const firstRuns = runs.filter((item) => !item.repeat && item.reviewReport);
  const sections = [
    '# 心岛 V2 AI Report Prompt-1 vs Prompt-2 人工评审',
    '',
    `生成时间：${new Date().toISOString()}`,
    '',
    '本文件仅供本地人工评审使用，已排除 API Key、环境变量、原始 60 题答案、完整请求头和身份信息。',
    '',
    '## 自动质量检查',
    '',
    '```json',
    JSON.stringify(quality, null, 2),
    '```',
    '',
    '## 人工评分空表',
    '',
    '| sampleId | 准确贴合 | 增量价值 | 个性化 | 表达自然 | 冲突解释 | 建议具体 | 模板感(反向) | 过度推断(反向) | 阅读长度 | 愿意保存/分享 | 备注 |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...firstRuns.map((run) => `| ${run.sampleId} |  |  |  |  |  |  |  |  |  |  |  |`),
    '',
  ];

  for (const run of firstRuns) {
    const prompt1 = prompt1Reports[run.sampleId] ?? null;
    sections.push(
      `## ${run.sampleId}`,
      '',
      `- personaId: ${run.personaId}`,
      `- Prompt-1 available: ${prompt1 ? 'yes' : 'no'}`,
      '',
      '### 模块变化',
      '',
      ...moduleDiffRows(prompt1, run.reviewReport),
      '',
      '### Prompt-1 输出',
      '',
      '```json',
      JSON.stringify(prompt1, null, 2),
      '```',
      '',
      '### Prompt-2 输出',
      '',
      '```json',
      JSON.stringify(run.reviewReport, null, 2),
      '```',
      '',
    );
  }
  fs.writeFileSync(filePath, `${sections.join('\n')}\n`);
}

function moduleDiffRows(before, after) {
  const fields = ['oneLine', 'keyTraits', 'neededRelationship', 'innerConflict', 'misunderstoodByOthers', 'strengths', 'repeatPatterns', 'advice'];
  return fields.map((field) => {
    const changed = JSON.stringify(before?.[field] ?? null) !== JSON.stringify(after?.[field] ?? null);
    return `- ${field}: ${changed ? 'changed' : 'same or unavailable'}`;
  });
}

function loadPrivateReviewReports(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const text = fs.readFileSync(filePath, 'utf8');
  const reports = {};
  const blockPattern = /## ([^\r\n]+)[\s\S]*?```json\r?\n([\s\S]*?)\r?\n```/g;
  for (const match of text.matchAll(blockPattern)) {
    try {
      const sampleId = match[1].trim();
      reports[sampleId] = JSON.parse(match[2]);
    } catch {
      // Keep comparison best-effort; smoke validity is based on Prompt-2 output.
    }
  }
  return reports;
}

function evaluatePrompt2Quality(runs) {
  const firstRuns = runs.filter((item) => !item.repeat);
  const reports = firstRuns.map((item) => item.reviewReport).filter(Boolean);
  const forbidden = [
    '核心不是一个固定标签',
    '不用勉强表演',
    '把结果当作参考',
    '主要驱动力',
    '这次答案里的关系模式',
    '被认真对待',
    '顺其自然',
    '学会爱自己',
  ];
  const fixedOpeningCount = reports.filter((report) => /型的核心不是一个固定标签/.test(report.oneLine)).length;
  const phraseCounts = Object.fromEntries(forbidden.map((phrase) => [phrase, countInReports(reports, phrase)]));
  const adviceReferenceCount = reports.reduce((sum, report) => (
    sum + (report.advice ?? []).filter((item) => `${item.title}${item.text}`.includes('把结果当作参考')).length
  ), 0);
  const duplicateAdviceGroups = countDuplicateGroups(reports.flatMap((report) => report.advice ?? []).map((item) => `${item.title}\n${item.text}`));
  const duplicateStrengthGroups = countDuplicateGroups(reports.map((report) => JSON.stringify(report.strengths ?? [])));
  const duplicateRepeatPatternGroups = countDuplicateGroups(reports.map((report) => JSON.stringify(report.repeatPatterns ?? [])));
  const constructCodeLengths = Object.fromEntries(firstRuns.map((run) => [
    run.sampleId,
    run.reviewReport?.evidence?.constructCodes?.length ?? 0,
  ]));
  const constructCodesAllInRange = Object.values(constructCodeLengths).every((length) => length >= 3 && length <= 6);
  const migratoryDiffModules = countModuleDiff(
    firstRuns.find((run) => run.sampleId === 'same-persona-migratory-a')?.reviewReport,
    firstRuns.find((run) => run.sampleId === 'same-persona-migratory-b')?.reviewReport,
  );
  const sampleChecks = Object.fromEntries(firstRuns.map((run) => [run.sampleId, {
    schemaValid: run.schemaValid,
    evidenceValid: run.evidenceValid,
    constructCodesInRange: (run.reviewReport?.evidence?.constructCodes?.length ?? 0) >= 3
      && (run.reviewReport?.evidence?.constructCodes?.length ?? 0) <= 6,
    fixedOpeningFree: !/型的核心不是一个固定标签/.test(run.reviewReport?.oneLine ?? ''),
    forbiddenPhraseFree: forbidden.every((phrase) => !reportText(run.reviewReport).includes(phrase)),
  }]));
  const pass = firstRuns.length === 5
    && firstRuns.every((run) => run.schemaValid && run.evidenceValid)
    && constructCodesAllInRange
    && fixedOpeningCount === 0
    && phraseCounts['核心不是一个固定标签'] === 0
    && phraseCounts['不用勉强表演'] === 0
    && adviceReferenceCount === 0
    && duplicateAdviceGroups === 0
    && duplicateStrengthGroups === 0
    && duplicateRepeatPatternGroups === 0
    && migratoryDiffModules >= 5
    && Object.values(sampleChecks).every((item) => Object.values(item).every(Boolean));
  return {
    pass,
    fixedOpeningCount,
    phraseCounts,
    adviceReferenceCount,
    duplicateAdviceGroups,
    duplicateStrengthGroups,
    duplicateRepeatPatternGroups,
    constructCodeLengths,
    constructCodesAllInRange,
    migratoryDiffModules,
    sampleChecks,
  };
}

function countModuleDiff(a, b) {
  if (!a || !b) return 0;
  const fields = ['oneLine', 'keyTraits', 'neededRelationship', 'innerConflict', 'misunderstoodByOthers', 'strengths', 'repeatPatterns', 'advice'];
  return fields.filter((field) => JSON.stringify(a[field]) !== JSON.stringify(b[field])).length;
}

function countInReports(reports, phrase) {
  return reports.reduce((sum, report) => sum + [...reportText(report).matchAll(escapeRegExp(phrase))].length, 0);
}

function countDuplicateGroups(values) {
  const counts = new Map();
  for (const value of values.filter(Boolean)) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.values()].filter((count) => count > 1).length;
}

function reportText(report) {
  return JSON.stringify(report ?? {});
}

function escapeRegExp(text) {
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
}

function startServer({ apiPath, env }) {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (url.pathname === apiPath) {
      return handleAiReportRequest(request, response, { env });
    }
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${port}`,
        origin: `http://127.0.0.1:${port}`,
      });
    });
  });
}

function isRealProviderConfigured(source) {
  return source.AI_REPORT_PROVIDER === 'deepseek'
    && source.AI_REPORT_ENABLED === 'true'
    && requiredRealEnv.every((key) => Boolean(source[key]));
}

function loadPrivateEnv() {
  const loaded = { ...process.env };
  for (const name of ['.env', '.env.local']) {
    const file = path.join(root, name);
    if (!fs.existsSync(file)) continue;
    Object.assign(loaded, parseEnv(fs.readFileSync(file, 'utf8')));
  }
  return loaded;
}

function parseEnv(text) {
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}

function average(values) {
  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function averageKnown(values) {
  const known = values.filter((value) => Number.isFinite(value));
  return known.length ? average(known) : null;
}

function percentile(sortedValues, p) {
  if (!sortedValues.length) return null;
  const index = Math.ceil((p / 100) * sortedValues.length) - 1;
  return sortedValues[Math.min(Math.max(index, 0), sortedValues.length - 1)];
}

function ratio(numerator, denominator) {
  if (!denominator) return 0;
  return Number((numerator / denominator).toFixed(4));
}
