import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';
import { buildResult } from '../js/v2/result-engine.js';
import { createResultHash } from '../js/v2/ai/ai-report-schema.js';
import { answerQuestion, orderedOptions } from '../js/v2/question-engine.js';
import { createInitialState } from '../js/v2/state.js';
import { handleAiReportRequest } from '../server/ai-report/handler.js';
import { loadStoredPilotAnswers } from './v2-baseline-samples.mjs';

const root = process.cwd();
const port = Number(process.env.V2_OPTION_READABILITY_PORT || 4332);
const baseUrl = `http://127.0.0.1:${port}/`;
const outDir = path.join(root, 'temp', 'rc2-option-readability-fix');
const questionBank = readJson('data/v2/question-bank.v2.json');
const manifest = readJson('data/v2/manifest.json');
const candidateA = readJson('data/v2/persona-target-vectors.v2.candidate-a.json');
const descriptions = readJson('data/v2/persona-descriptions.v2.json');
const realAnswers = loadStoredPilotAnswers(root);

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const summary = {
  generatedAt: new Date().toISOString(),
  screenshotDir: path.relative(root, outDir).replaceAll('\\', '/'),
  staticAudit: runStaticAudit(),
  viewportRuns: [],
  screenshots: [],
  pass: false,
};

let aiRequestCount = 0;
const server = await serveApp();
const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of [
    { name: '375x667', width: 375, height: 667, capture: false },
    { name: '390x844', width: 390, height: 844, capture: true },
    { name: '430x932', width: 430, height: 932, capture: false },
  ]) {
    summary.viewportRuns.push(await runMobileViewport(browser, viewport));
  }
  summary.viewportRuns.push(await runDesktopViewport(browser));
  summary.aiRequestCount = aiRequestCount;
  summary.pass = summary.staticAudit.pass && summary.viewportRuns.every((run) => run.pass);
} finally {
  await browser.close();
  server.close();
}

fs.writeFileSync(path.join(outDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
if (!summary.pass) process.exitCode = 1;

function runStaticAudit() {
  assert.equal(questionBank.questions.length, 60, 'question count changed');
  const notOriginallyAbcd = questionBank.questions.filter((question) => question.options.map((option) => option.id).join('') !== 'ABCD').length;
  const state = createInitialState();
  let allOrdered = true;
  let allUnique = true;
  for (const question of questionBank.questions) {
    state.optionOrder[question.id] = ['C', 'D', 'B', 'A'];
    const displayIds = orderedOptions(question, state).map((option) => option.id);
    if (displayIds.join('') !== 'ABCD') allOrdered = false;
    if (new Set(displayIds).size !== 4) allUnique = false;
    assert.equal(state.optionOrder[question.id].join(''), 'ABCD', `${question.id} optionOrder should normalize`);
  }

  const before = buildResult({
    manifest,
    questionBank,
    candidateA,
    descriptions,
    answers: realAnswers,
  });
  const clickState = createInitialState();
  for (const question of questionBank.questions) {
    clickState.optionOrder[question.id] = ['D', 'C', 'B', 'A'];
    answerQuestion(questionBank, clickState, question.id, realAnswers[question.id]);
  }
  const after = buildResult({
    manifest,
    questionBank,
    candidateA,
    descriptions,
    answers: clickState.answers,
  });
  const beforeHash = createResultHash(before.facts);
  const afterHash = createResultHash(after.facts);
  assert.equal(after.report.source, 'deterministic');
  assert.equal(afterHash, beforeHash, 'resultHash must not change');
  assert.equal(after.facts.persona.id, before.facts.persona.id, 'persona must not change');
  assert.deepEqual(roundObject(after.facts.constructScores), roundObject(before.facts.constructScores), 'construct scores must not change');

  return {
    pass: allOrdered && allUnique && beforeHash === afterHash,
    questionCount: questionBank.questions.length,
    notOriginallyAbcd,
    answerStorageFormat: 'answers[questionId] = stable option.id',
    resultHashBefore: beforeHash,
    resultHashAfter: afterHash,
    personaBefore: before.facts.persona.id,
    personaAfter: after.facts.persona.id,
    constructCount: Object.keys(after.facts.constructScores).length,
  };
}

async function runMobileViewport(browser, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  await installNativeShareMock(context);
  const page = await instrumentPage(context);
  const run = { name: viewport.name, pass: false };
  try {
    await openFresh(page);
    await page.locator('[data-quiz-mode="full"]').click();
    await page.locator('[data-action="start"]').click();
    await page.waitForSelector('[data-action="begin"]');
    await page.locator('[data-action="begin"]').click();
    await page.waitForSelector('.v2-option');
    if (viewport.capture) await shot(page, '01-quiz-question-01.png');

    const firstQuestion = await currentQuestionId(page);
    await selectCurrent(page, 'A');
    await page.waitForFunction((previous) => document.querySelector('.v2-option')?.dataset.questionId !== previous, firstQuestion);
    await page.locator('[data-action="previous"]').click();
    await page.waitForSelector(`.v2-option[data-question-id="${firstQuestion}"]`);
    const previousRestore = await selectedOptionId(page);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('[data-action="continue"]');
    await page.locator('[data-action="continue"]').click();
    await page.waitForSelector(`.v2-option[data-question-id="${firstQuestion}"]`);
    const refreshRestore = await selectedOptionId(page);
    if (viewport.capture) await shot(page, '04-quiz-selected.png');

    const displayChecks = [];
    while (!(await page.locator('[data-action="result"]').count())) {
      const questionId = await currentQuestionId(page);
      const optionIds = await visibleOptionIds(page);
      displayChecks.push({ questionId, optionIds });
      if (viewport.capture && displayChecks.length === 30) await shot(page, '02-quiz-question-middle.png');
      if (viewport.capture && displayChecks.length === 60) await shot(page, '03-quiz-question-60.png');
      await selectCurrent(page, realAnswers[questionId] ?? 'A');
      await page.waitForTimeout(205);
    }
    await page.waitForSelector('[data-action="result"]');
    if (viewport.capture) await shot(page, '05-completion-transition.png');
    const transitionReadability = await readability(page, [
      '.v2-transition .v2-lead',
      '.v2-transition .v2-transition__meta',
    ]);
    await page.locator('[data-action="result"]').click();
    await page.waitForSelector('.v2-result-hero--trusted');
    const deterministicImmediate = await page.evaluate(() => window.__heartIslandV2Debug.state.result.report.source);
    await page.waitForFunction(() => document.querySelector('[data-ai-report-panel][data-ai-state="loading"], [data-ai-report-panel][data-ai-state="success"]'));
    const aiLoadingReadability = await page.locator('[data-ai-report-panel][data-ai-state="loading"]').count()
      ? await readability(page, [
        '.v2-ai-status h3',
        '.v2-ai-status p',
      ])
      : { pass: true, samples: [], skipped: 'mock response reached success before loading sample' };
    await page.waitForSelector('[data-ai-report-panel][data-ai-state="success"]');
    const state = await page.evaluate(() => ({
      reportSource: window.__heartIslandV2Debug.state.result.report.source,
      aiSource: window.__heartIslandV2Debug.state.result.aiReport?.source,
      resultHash: window.__heartIslandV2Debug.state.result.facts.resultHash,
      constructCount: Object.keys(window.__heartIslandV2Debug.state.result.facts.constructScores).length,
      layerCount: new Set(window.__heartIslandV2Debug.state.result.facts.constructRanking.map((item) => item.layer)).size,
    }));
    await page.locator('.v2-map-section').scrollIntoViewIfNeeded();
    await page.locator('.v2-map-section summary').click();
    await page.locator('.v2-map-section').scrollIntoViewIfNeeded();
    if (viewport.capture) await shot(page, '06-five-layer-expanded-top.png');
    const mapReadability = await readability(page, [
      '.v2-map-section summary span',
      '.v2-map-section summary small',
      '.v2-section-intro',
      '.v2-construct-layer__header h3',
      '.v2-construct-row span',
      '.v2-construct-row strong',
      '.v2-construct-row small',
      '.v2-radar__labels text',
    ]);
    const mapTitleLines = await lineCount(page, '.v2-map-section summary span');
    if (viewport.capture) await shot(page, '07-five-layer-expanded-full.png');
    await page.locator('.v2-bottom-actions').scrollIntoViewIfNeeded();
    if (viewport.capture) await shot(page, '08-feedback-section.png');
    const feedbackReadability = await readability(page, [
      '.v2-structured-feedback__title',
      '.v2-feedback-lite summary',
      '.v2-feedback-field span',
      '.v2-bottom-actions > .v2-note',
      '.v2-bottom-actions > .v2-ai-disclaimer',
    ]);
    if (viewport.capture) await shot(page, '09-result-full.png');
    const pageMetrics = await collectPageMetrics(page);

    run.pass = page.__errors.length === 0
      && page.__badResponses.length === 0
      && displayChecks.length === 60
      && displayChecks.every((item) => item.optionIds.join('') === 'ABCD')
      && previousRestore === 'A'
      && refreshRestore === 'A'
      && deterministicImmediate === 'deterministic'
      && state.reportSource === 'deterministic'
      && state.aiSource === 'ai'
      && state.constructCount === 15
      && state.layerCount === 5
      && transitionReadability.pass
      && aiLoadingReadability.pass
      && mapReadability.pass
      && feedbackReadability.pass
      && mapTitleLines > 0
      && mapTitleLines <= 2
      && pageMetrics.horizontalOverflow === 0
      && pageMetrics.brokenImages === 0
      && !pageMetrics.hasUndefined
      && !pageMetrics.hasNaN;
    Object.assign(run, {
      displayChecks,
      previousRestore,
      refreshRestore,
      deterministicImmediate,
      state,
      transitionReadability,
      aiLoadingReadability,
      mapReadability,
      feedbackReadability,
      mapTitleLines,
      pageMetrics,
      consoleErrors: page.__errors,
      badResponses: page.__badResponses,
    });
  } finally {
    await context.close();
  }
  return run;
}

async function runDesktopViewport(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await instrumentPage(context);
  const run = { name: '1440x900', pass: false };
  try {
    await openFresh(page);
    await page.locator('[data-quiz-mode="full"]').click();
    await page.locator('[data-action="start"]').click();
    await page.locator('[data-action="begin"]').click();
    await page.waitForSelector('.v2-option');
    await shot(page, '10-quiz-1440x900.png');
    const optionIds = await visibleOptionIds(page);
    await completeQuiz(page);
    await page.locator('[data-action="result"]').click();
    await page.waitForSelector('[data-ai-report-panel][data-ai-state="success"]');
    await page.locator('.v2-map-section').scrollIntoViewIfNeeded();
    await page.locator('.v2-map-section summary').click();
    await shot(page, '11-five-layer-map-1440x900.png');
    const mapReadability = await readability(page, [
      '.v2-map-section summary span',
      '.v2-map-section summary small',
      '.v2-construct-layer__header h3',
      '.v2-construct-row span',
      '.v2-construct-row strong',
      '.v2-construct-row small',
    ]);
    const pageMetrics = await collectPageMetrics(page);
    run.pass = page.__errors.length === 0
      && page.__badResponses.length === 0
      && optionIds.join('') === 'ABCD'
      && mapReadability.pass
      && pageMetrics.horizontalOverflow === 0
      && pageMetrics.brokenImages === 0;
    Object.assign(run, { optionIds, mapReadability, pageMetrics, consoleErrors: page.__errors, badResponses: page.__badResponses });
  } finally {
    await context.close();
  }
  return run;
}

async function openFresh(page) {
  await page.goto(`${baseUrl}?debug=1`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('[data-action="start"]');
}

async function completeQuiz(page) {
  while (!(await page.locator('[data-action="result"]').count())) {
    const questionId = await currentQuestionId(page);
    await selectCurrent(page, realAnswers[questionId] ?? 'A');
    await page.waitForTimeout(205);
  }
  await page.waitForSelector('[data-action="result"]');
}

async function currentQuestionId(page) {
  return page.locator('.v2-option').first().getAttribute('data-question-id');
}

async function visibleOptionIds(page) {
  return page.$$eval('.v2-option', (options) => options.map((option) => option.dataset.optionId));
}

async function selectedOptionId(page) {
  return page.locator('.v2-option.selected').first().getAttribute('data-option-id');
}

async function selectCurrent(page, optionId) {
  const questionId = await currentQuestionId(page);
  await page.locator(`.v2-option[data-question-id="${questionId}"][data-option-id="${optionId}"]`).click();
}

async function installNativeShareMock(context) {
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: (data) => Array.isArray(data?.files) && data.files.length > 0,
    });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async () => {},
    });
  });
}

async function instrumentPage(context) {
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.__errors = [];
  page.__badResponses = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) {
      page.__errors.push(message.text());
    }
  });
  page.on('pageerror', (error) => page.__errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) page.__badResponses.push({ url: response.url(), status: response.status() });
  });
  return page;
}

async function readability(page, selectors) {
  const samples = await page.evaluate((selectors) => selectors.map((selector) => {
    const element = document.querySelector(selector);
    if (!element) return { selector, exists: false, pass: false };
    const style = window.getComputedStyle(element);
    const color = style.fill && style.fill !== 'none' ? style.fill : style.color;
    const opacity = Number(style.opacity || 1);
    const fontSize = Number.parseFloat(style.fontSize);
    const lineHeight = style.lineHeight === 'normal' ? fontSize * 1.2 : Number.parseFloat(style.lineHeight);
    const rect = element.getBoundingClientRect();
    const rgb = color.match(/\d+(\.\d+)?/g)?.map(Number) ?? [];
    const [r = 255, g = 255, b = 255, a = 1] = rgb;
    const tooLight = Math.min(r, g, b) > 185 || (g > 145 && b > 135 && r < 130);
    const minFontSize = selector.includes('radar__labels') ? 8 : 12;
    const minLineHeight = fontSize >= 24 ? fontSize * 1.05 : fontSize * 1.2;
    const pass = rect.width > 0
      && rect.height > 0
      && style.visibility !== 'hidden'
      && style.display !== 'none'
      && opacity >= 0.65
      && a >= 0.65
      && fontSize >= minFontSize
      && lineHeight >= minLineHeight
      && !tooLight;
    return { selector, exists: true, color, opacity, fontSize, lineHeight, width: rect.width, height: rect.height, pass };
  }), selectors);
  return { pass: samples.every((sample) => sample.pass), samples };
}

async function lineCount(page, selector) {
  return page.evaluate((selector) => {
    const element = document.querySelector(selector);
    if (!element) return 0;
    const range = document.createRange();
    range.selectNodeContents(element);
    return new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size;
  }, selector);
}

async function collectPageMetrics(page) {
  return page.evaluate(() => {
    const text = document.body.innerText;
    return {
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      brokenImages: [...document.images].filter((image) => image.naturalWidth === 0).length,
      hasUndefined: text.includes('undefined'),
      hasNaN: text.includes('NaN'),
    };
  });
}

async function shot(page, name) {
  const file = path.join(outDir, name);
  await page.screenshot({ path: file, fullPage: true });
  summary.screenshots.push(path.relative(root, file).replaceAll('\\', '/'));
}

function serveApp() {
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
  };
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, baseUrl);
    if (url.pathname === '/api/v2/ai-report') {
      aiRequestCount += 1;
      return handleAiReportRequest(request, response, {
        env: {
          AI_REPORT_PROVIDER: 'mock',
          AI_REPORT_MOCK_MODE: 'success',
          AI_REPORT_MOCK_DELAY_MS: '900',
          AI_REPORT_TIMEOUT_MS: '5000',
          AI_REPORT_SESSION_LIMIT: '100',
          AI_REPORT_CACHE_TTL_MS: '600000',
          ALLOWED_ORIGINS: baseUrl,
        },
      });
    }
    if (url.pathname === '/ai-report-config.json') {
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ endpoint: '/api/v2/ai-report' }));
      return;
    }
    const safePath = path.normalize(url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
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

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function roundObject(input) {
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, Number(Number(value).toFixed(4))]));
}
