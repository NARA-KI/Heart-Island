import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { scoreAnswers, scoreAnswersAdaptiveHybrid } from '../../js/v2/scoring-engine.js';
import { createSeededRng } from '../../js/v2/utils.js';

const root = process.cwd();
const port = Number(process.env.V2_PILOT_PORT || 4182);
const baseUrl = `http://127.0.0.1:${port}/`;
const resultPath = path.join(root, 'reports', 'data', 'v2-pilot-readiness-validation.json');

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
};

const questionBank = readJson('data/v2/question-bank.v2.json');
const candidateA = readJson('data/v2/persona-target-vectors.v2.candidate-a.json');
const candidateE = readJson('data/v2/persona-target-vectors.v2.candidate-e-adaptive-hybrid.json');
const candidateEProfile = readJson('data/v2/scoring-profile.v2.candidate-e-adaptive-hybrid.json');
const fixtures = findPilotFixtures();

const server = await serveStatic();
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  results.push(await runPublicEntryCheck(browser));
  results.push(await runPilotFixture(browser, fixtures.same, true));
  results.push(await runPilotFixture(browser, fixtures.different, false));
} finally {
  await browser.close();
  server.close();
}

const summary = {
  generatedAt: new Date().toISOString(),
  branch: runGit('branch --show-current'),
  candidateEHash: sha256('data/v2/persona-target-vectors.v2.candidate-e-adaptive-hybrid.json'),
  candidateEProfileHash: sha256('data/v2/scoring-profile.v2.candidate-e-adaptive-hybrid.json'),
  publicProfileCandidateA: fs.readFileSync(path.join(root, 'js/v2/config.js'), 'utf8').includes("V2_SCORING_PROFILE = 'candidate-a'"),
  fixtures: {
    same: summarizeFixture(fixtures.same),
    different: summarizeFixture(fixtures.different),
  },
  checks: results,
};
summary.pass = summary.publicProfileCandidateA
  && summary.branch !== 'main'
  && summary.branch !== 'master'
  && results.every((item) => item.pass);

fs.mkdirSync(path.dirname(resultPath), { recursive: true });
fs.writeFileSync(resultPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
if (!summary.pass) process.exitCode = 1;

async function runPublicEntryCheck(browser) {
  const page = await newPage(browser);
  const requestedPaths = [];
  page.on('request', (request) => requestedPaths.push(new URL(request.url()).pathname));
  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    const bodyText = await page.locator('body').innerText();
    const hasPilotUi = await page.locator('[data-pilot="1"], .v2-pilot-result').count();
    const requestedCandidateE = requestedPaths.some((item) => item.includes('candidate-e-adaptive-hybrid'));
    return {
      name: 'public-entry-hides-pilot',
      pass: hasPilotUi === 0 && !bodyText.includes('candidate-E') && !bodyText.includes('内部盲测') && !requestedCandidateE,
      hasPilotUi,
      requestedCandidateE,
    };
  } finally {
    await page.close();
  }
}

async function runPilotFixture(browser, fixture, expectAgreement) {
  const page = await newPage(browser);
  const consoleErrors = [];
  const failedRequests = [];
  const badResponses = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  page.on('requestfailed', (request) => failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
  page.on('response', (response) => {
    if (response.status() >= 400) badResponses.push({ url: response.url(), status: response.status() });
  });

  try {
    await page.goto(`${baseUrl}?pilot=1`, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${baseUrl}?pilot=1`, { waitUntil: 'networkidle' });
    await page.locator('[data-action="start"]').click();
    await page.waitForSelector('[data-action="begin"]');
    await page.locator('[data-action="begin"]').click();
    await page.waitForSelector('.v2-option');

    for (const question of questionBank.questions) {
      await page.locator(`.v2-option[data-question-id="${question.id}"][data-option-id="${fixture.answers[question.id]}"]`).click();
    }

    await page.waitForSelector('[data-action="result"]');
    await page.locator('[data-action="result"]').click();
    await page.waitForSelector('.v2-pilot-result');

    const agreementAttr = await page.locator('.v2-pilot-result').getAttribute('data-profile-agreement');
    const cardCount = await page.locator('.v2-pilot-card').count();
    const resultText = await page.locator('.v2-pilot-result').innerText();
    const hasInternalProfileNames = /candidate-a|candidate-e|baseline|targetVector|adaptiveAlpha|lowConfidence|gap/i.test(resultText);

    await page.locator('[data-feedback-field="overallFit"]').selectOption('4');
    await page.locator('[data-feedback-field="coreFit"]').selectOption('4');
    await page.locator('[data-feedback-field="needsFit"]').selectOption('4');
    await page.locator('[data-feedback-field="riskFit"]').selectOption('3');
    await page.locator('[data-feedback-field="growthHelp"]').selectOption('4');
    if (!expectAgreement) {
      await page.locator('[data-feedback-field="xFit"]').selectOption('4');
      await page.locator('[data-feedback-field="yFit"]').selectOption('3');
      await page.locator('[data-feedback-field="preferredResult"]').selectOption('X');
      await page.locator('[data-feedback-field="moreHelpfulResult"]').selectOption('都有');
    }
    await page.locator('[data-feedback-field="leastFittingLine"]').fill('无');
    await page.locator('[data-feedback-field="difficultQuestions"]').fill('暂未发现');

    const record = await page.evaluate(() => window.__heartIslandV2Debug.exportPilotRecord());
    const duplicateSummary = await page.evaluate((item) => window.__heartIslandV2Debug.summarizePilotRecords([item, item]), record);
    const csv = await page.evaluate((item) => window.__heartIslandV2Debug.pilotRecordsToCsv([item]), record);
    const noPii = !containsPiiFields(record);
    const csvComplete = ['pilotId', 'candidateA', 'candidateE', 'adaptiveAlpha', 'leastFittingLine'].every((field) => csv.includes(field));
    const pass = agreementAttr === String(expectAgreement)
      && (expectAgreement ? cardCount === 1 : cardCount === 2)
      && !hasInternalProfileNames
      && consoleErrors.length === 0
      && failedRequests.length === 0
      && badResponses.length === 0
      && record.profileAgreement === expectAgreement
      && record.candidateAResult?.persona?.id === fixture.candidateA
      && record.candidateEResult?.persona?.id === fixture.candidateE
      && record.answerIds
      && Object.keys(record.answerIds).length === 60
      && duplicateSummary.uniqueCount === 1
      && csvComplete
      && noPii;
    return {
      name: expectAgreement ? 'pilot-agreement-flow' : 'pilot-blind-xy-flow',
      pass,
      cardCount,
      agreementAttr,
      consoleErrors,
      failedRequests,
      badResponses,
      hasInternalProfileNames,
      exportedPilotId: record.pilotId,
      candidateA: record.candidateAResult?.persona?.displayName,
      candidateE: record.candidateEResult?.persona?.displayName,
      xyOrder: record.xyOrder,
      duplicateUniqueCount: duplicateSummary.uniqueCount,
      csvComplete,
      noPii,
    };
  } finally {
    await page.close();
  }
}

function findPilotFixtures() {
  const rng = createSeededRng('heart-island-v2-alpha-pilot-fixtures');
  let same = null;
  let different = null;
  for (let index = 0; index < 20000 && (!same || !different); index += 1) {
    const answers = {};
    for (const question of questionBank.questions) {
      answers[question.id] = question.options[Math.floor(rng() * question.options.length)].id;
    }
    const resultA = scoreAnswers(questionBank, candidateA, answers);
    const resultE = scoreAnswersAdaptiveHybrid(questionBank, candidateE, candidateEProfile, answers);
    const fixture = {
      answers,
      candidateA: resultA.finalPersona.id,
      candidateE: resultE.finalPersona.id,
      candidateADisplayName: resultA.finalPersona.displayName,
      candidateEDisplayName: resultE.finalPersona.displayName,
    };
    if (resultA.finalPersona.id === resultE.finalPersona.id && !same) same = fixture;
    if (resultA.finalPersona.id !== resultE.finalPersona.id && !different) different = fixture;
  }
  if (!same || !different) throw new Error('Unable to find both agreement and disagreement pilot fixtures');
  return { same, different };
}

function summarizeFixture(fixture) {
  return {
    candidateA: fixture.candidateADisplayName,
    candidateE: fixture.candidateEDisplayName,
    agreement: fixture.candidateA === fixture.candidateE,
  };
}

function containsPiiFields(record) {
  const forbiddenKeys = new Set([
    'name',
    'phone',
    'phoneNumber',
    'wechat',
    'weChat',
    'idCard',
    'identityCard',
    'address',
    '姓名',
    '手机号',
    '微信号',
    '身份证',
    '精确地址',
  ]);
  const visit = (value) => {
    if (!value || typeof value !== 'object') return false;
    if (Array.isArray(value)) return value.some(visit);
    return Object.entries(value).some(([key, child]) => forbiddenKeys.has(key) || visit(child));
  };
  return visit(record);
}

async function newPage(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  return context.newPage();
}

function serveStatic() {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, baseUrl);
    const decoded = decodeURIComponent(url.pathname);
    const safePath = path.normalize(decoded === '/' ? '/index.html' : decoded).replace(/^([/\\])+/, '');
    const filePath = path.join(root, safePath);
    if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }
    response.writeHead(200, { 'Content-Type': mime[path.extname(filePath)] ?? 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(response);
  });
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
}

function runGit(args) {
  try {
    return execFileSync('git', args.split(/\s+/), { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}
