import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';
import { validateV2Data, scoreAnswers } from '../../js/v2/scoring-engine.js';

const root = process.cwd();
const port = Number(process.env.V2_ALPHA_PORT || 4181);
const baseUrl = `http://127.0.0.1:${port}/`;
const resultDir = path.join(root, 'reports', 'data');
const resultPath = path.join(resultDir, 'heart-island-v2-alpha-acceptance-results.json');

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}

function validateDataLayer() {
  const questionBank = readJson('data/v2/question-bank.v2.json');
  const candidateA = readJson('data/v2/persona-target-vectors.v2.candidate-a.json');
  const descriptions = readJson('data/v2/persona-descriptions.v2.json');
  const validation = validateV2Data({ questionBank, personaData: candidateA, descriptions });
  if (!validation.ok) throw new Error(validation.errors.join('\n'));

  const firstAnswers = Object.fromEntries(questionBank.questions.map((question) => [question.id, question.options[0].id]));
  const firstScore = scoreAnswers(questionBank, candidateA, firstAnswers);
  const secondScore = scoreAnswers(questionBank, candidateA, firstAnswers);
  const reverseQuestionCount = questionBank.questions.filter((question) => question.reverse === true).length;

  return {
    validation,
    reverseQuestionCount,
    reproducible: JSON.stringify(firstScore.top5) === JSON.stringify(secondScore.top5),
    sampleFinalPersona: firstScore.finalPersona.displayName,
    allPersonaNames: candidateA.personas.map((persona) => persona.displayName),
  };
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

async function runBrowserFlow({ name, viewport, executablePath }) {
  const browser = await chromium.launch(executablePath ? { headless: true, executablePath } : { headless: true });
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  const badResponses = [];
  const requestedPaths = [];

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  page.on('request', (request) => requestedPaths.push(new URL(request.url()).pathname));
  page.on('requestfailed', (request) => failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
  page.on('response', (response) => {
    if (response.status() >= 400) badResponses.push({ url: response.url(), status: response.status() });
  });

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-action="start"]', { timeout: 10000 });
  const homeOverflow = await hasHorizontalOverflow(page);
  await page.locator('[data-action="start"]').click();
  await page.waitForSelector('[data-action="begin"]');
  await page.locator('[data-action="begin"]').click();
  await page.waitForSelector('.v2-option');

  const stateChecks = {
    q2InitialSelected: null,
    previousRestored: null,
    modifiedAnswer: null,
    refreshRestored: null,
  };

  const answerLog = [];
  let firstQuestionId = await currentQuestionId(page);
  await clickOption(page, 0, answerLog);
  await waitForQuestionChange(page, firstQuestionId);
  stateChecks.q2InitialSelected = await selectedCount(page);

  const q2Id = await currentQuestionId(page);
  await page.locator('[data-action="previous"]').click();
  await waitForQuestionChange(page, q2Id);
  stateChecks.previousRestored = await selectedCount(page) === 1 && await currentQuestionId(page) === firstQuestionId;
  await clickOption(page, 1, answerLog);
  await waitForQuestionChange(page, firstQuestionId);
  stateChecks.modifiedAnswer = (await selectedCount(page)) === 0;

  await clickOption(page, 2, answerLog);
  const q3Id = await currentQuestionId(page);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.v2-option');
  stateChecks.refreshRestored = await currentQuestionId(page) === q3Id;

  while (await page.locator('.v2-option').count()) {
    const qid = await currentQuestionId(page);
    const progressText = await page.locator('.v2-progress-text').innerText();
    const index = Number(progressText.split('/')[0].trim());
    await clickOption(page, index % 4, answerLog);
    if (index >= 60) break;
    await waitForQuestionChange(page, qid);
  }

  await page.waitForSelector('[data-action="result"]');
  await page.locator('[data-action="result"]').click();
  await page.waitForSelector('.v2-result-hero');
  const resultText = await page.locator('.v2-result').innerText();
  const debugState = await page.evaluate(() => ({
    questionCount: window.__heartIslandV2Debug.runtime.questionBank.questions.length,
    personaCount: window.__heartIslandV2Debug.runtime.candidateA.personas.length,
    answerCount: Object.keys(window.__heartIslandV2Debug.state.answers).length,
    finalPersona: window.__heartIslandV2Debug.score().persona.displayName,
  }));
  const resultContainsInternalInfo = ['Top2', 'Top3', 'baseline', 'candidate-A', 'targetVector', 'lowConfidence', 'gap', '距离'].some((needle) => resultText.includes(needle));
  const resultOverflow = await hasHorizontalOverflow(page);
  await page.locator('[data-action="restart"]').click();
  await page.waitForSelector('[data-action="begin"]');
  const restartCleared = await page.evaluate(() => localStorage.getItem('heart-island-v2-alpha-1-state') === null);

  await browser.close();
  const readsOldRuntimeData = requestedPaths.some((item) => item === '/app.js' || item.includes('/pilot-deploy/') || item.includes('/drafts/v2/'));
  const pass = !homeOverflow
    && !resultOverflow
    && consoleErrors.length === 0
    && failedRequests.length === 0
    && badResponses.length === 0
    && stateChecks.q2InitialSelected === 0
    && stateChecks.previousRestored
    && stateChecks.modifiedAnswer
    && stateChecks.refreshRestored
    && debugState.questionCount === 60
    && debugState.personaCount === 15
    && debugState.answerCount === 60
    && restartCleared
    && !resultContainsInternalInfo
    && !readsOldRuntimeData;

  return {
    name,
    viewport,
    pass,
    consoleErrors,
    failedRequests,
    badResponses,
    homeOverflow,
    resultOverflow,
    stateChecks,
    debugState,
    restartCleared,
    resultContainsInternalInfo,
    readsOldRuntimeData,
  };
}

async function clickOption(page, index, answerLog) {
  const count = await page.locator('.v2-option').count();
  const normalized = index % count;
  const button = page.locator('.v2-option').nth(normalized);
  const meta = await button.evaluate((node) => ({
    questionId: node.dataset.questionId,
    optionId: node.dataset.optionId,
  }));
  answerLog.push(meta);
  await button.click();
}

async function currentQuestionId(page) {
  return page.locator('.v2-option').first().evaluate((node) => node.dataset.questionId);
}

async function selectedCount(page) {
  return page.locator('.v2-option.selected').count();
}

async function waitForQuestionChange(page, previousQuestionId) {
  await page.waitForFunction((id) => {
    const next = document.querySelector('.v2-option')?.dataset.questionId;
    return next && next !== id;
  }, previousQuestionId, { timeout: 5000 });
}

async function hasHorizontalOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
}

const server = await serveStatic();
const data = validateDataLayer();
const runs = [
  { name: 'chromium-375', viewport: { width: 375, height: 812 } },
  { name: 'chromium-390', viewport: { width: 390, height: 844 } },
  { name: 'chromium-430', viewport: { width: 430, height: 932 } },
];
const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
if (fs.existsSync(edgePath)) {
  runs.push({ name: 'edge-390', viewport: { width: 390, height: 844 }, executablePath: edgePath });
}

const browserResults = [];
try {
  for (const run of runs) browserResults.push(await runBrowserFlow(run));
} finally {
  server.close();
}

const summary = {
  generatedAt: new Date().toISOString(),
  data,
  browserResults,
  pass: data.validation.ok
    && data.reproducible
    && data.reverseQuestionCount > 0
    && browserResults.every((result) => result.pass),
};

fs.mkdirSync(resultDir, { recursive: true });
fs.writeFileSync(resultPath, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
if (!summary.pass) process.exitCode = 1;
