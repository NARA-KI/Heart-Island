import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';
import { handleAiReportRequest } from '../server/ai-report/handler.js';
import { loadStoredPilotAnswers } from '../tests/v2-baseline-samples.mjs';

const root = process.cwd();
const port = Number(process.env.RC2_PRODUCTION_REVIEW_PORT || 4330);
const baseUrl = `http://127.0.0.1:${port}/`;
const outDir = path.join(root, 'temp', 'rc2-production-review');
const realAnswers = loadStoredPilotAnswers(root);
const aiTimings = [];
let aiRequestCount = 0;
let aiMockMode = 'success';
let aiMockDelayMs = '900';
let aiTimeoutMs = '5000';
let aiCacheTtlMs = '600000';

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const server = await serveApp();
const browser = await chromium.launch({ headless: true });
const summary = {
  generatedAt: new Date().toISOString(),
  url: baseUrl,
  screenshotDir: path.relative(root, outDir).replaceAll('\\', '/'),
  screenshots: [],
  runs: [],
  pass: false,
};

try {
  summary.runs.push(await runMobileFlow(browser));
  summary.runs.push(await runDesktopFlow(browser));
  summary.runs.push(await runAiFallbackFlow(browser, { name: 'ai-error', mode: '500', expectedState: 'error', expectedStatus: 502 }));
  summary.runs.push(await runAiFallbackFlow(browser, { name: 'ai-timeout', mode: 'timeout', expectedState: 'timeout', expectedStatus: 504 }));
  summary.aiRequestCount = aiRequestCount;
  summary.aiTimings = aiTimings;
  summary.pass = summary.runs.every((run) => run.pass) && summary.screenshots.length === 21;
} finally {
  await browser.close();
  server.close();
}

fs.writeFileSync(path.join(outDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
if (!summary.pass) process.exitCode = 1;

async function runMobileFlow(browser) {
  useSuccessAi();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  await installNativeShareMock(context);
  const page = await instrumentPage(context);
  const result = { name: 'mobile-390x844', pass: false };
  try {
    await captureLoading(context, '02-loading.png');
    await openFresh(page);
    await shot(page, '01-home.png');
    await page.locator('[data-action="start"]').click();
    await page.waitForSelector('[data-action="begin"]');
    await shot(page, '03-instructions.png');
    await page.locator('[data-action="begin"]').click();
    await page.waitForSelector('.v2-option');
    await shot(page, '04-quiz.png');
    await page.locator('.v2-option').first().evaluate((button) => {
      button.classList.add('selected');
      button.setAttribute('aria-pressed', 'true');
      button.focus();
    });
    await shot(page, '05-quiz-selected.png');
    await openFresh(page);
    await page.locator('[data-action="start"]').click();
    await page.waitForSelector('[data-action="begin"]');
    await page.locator('[data-action="begin"]').click();
    await page.waitForSelector('.v2-option');
    await selectCurrentStoredAnswer(page);
    const previousBefore = await page.locator('.v2-option').first().getAttribute('data-question-id');
    await page.locator('[data-action="previous"]').click();
    await page.waitForFunction(() => document.querySelector('.v2-option')?.getAttribute('data-question-id') === 'v2-q01');
    const previousAfter = await page.locator('.v2-option').first().getAttribute('data-question-id');
    const previousWorked = previousBefore !== previousAfter && previousAfter === 'v2-q01';
    await completeQuizFromCurrent(page);
    await page.locator('[data-action="result"]').click();
    await page.waitForSelector('.v2-result-hero--trusted');
    const initialSource = await page.evaluate(() => window.__heartIslandV2Debug.state.result.report.source);
    await page.waitForSelector('.v2-ai-status[data-ai-state="loading"]');
    await shot(page, '06-result-hero.png');
    await page.locator('[data-ai-report-panel]').scrollIntoViewIfNeeded();
    await shot(page, '07-ai-loading.png');
    await page.waitForSelector('.v2-ai-report-panel[data-ai-state="success"]');
    const successState = await page.evaluate(() => ({
      reportSource: window.__heartIslandV2Debug.state.result.report.source,
      aiSource: window.__heartIslandV2Debug.state.result.aiReport?.source,
    }));
    await page.locator('[data-ai-report-panel]').scrollIntoViewIfNeeded();
    await shot(page, '08-ai-success.png');
    await page.locator('.v2-construct-summary').scrollIntoViewIfNeeded();
    await shot(page, '09-core-constructs.png');
    await page.locator('.v2-map-section').scrollIntoViewIfNeeded();
    await shot(page, '10-five-layer-collapsed.png');
    await page.locator('.v2-map-section summary').click();
    await page.locator('.v2-map-section').scrollIntoViewIfNeeded();
    await shot(page, '11-five-layer-expanded.png');
    await page.locator('.v2-bottom-actions').scrollIntoViewIfNeeded();
    await page.locator('[data-action="save-result"]').first().click();
    await page.waitForSelector('[data-share-preview] img');
    await shot(page, '12-share.png');
    await page.locator('[data-action="close-share-preview"]').click();
    await page.waitForSelector('[data-share-preview]', { state: 'detached' });
    await shot(page, '13-result-full.png');
    const beforeReloadRequests = aiRequestCount;
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.v2-ai-report-panel[data-ai-state="success"]');
    const afterReloadRequests = aiRequestCount;
    await shot(page, '14-returning-user.png');
    const counts = await page.evaluate(() => ({
      constructLayers: document.querySelectorAll('.v2-construct-layer').length,
      constructRows: document.querySelectorAll('.v2-construct-row').length,
      view: window.__heartIslandV2Debug.state.view,
    }));
    result.pass = page.__errors.length === 0
      && page.__badResponses.length === 0
      && initialSource === 'deterministic'
      && successState.reportSource === 'deterministic'
      && successState.aiSource === 'ai'
      && beforeReloadRequests === afterReloadRequests
      && previousWorked
      && counts.constructLayers === 5
      && counts.constructRows === 15
      && counts.view === 'result';
    Object.assign(result, { initialSource, successState, previousWorked, beforeReloadRequests, afterReloadRequests, counts });
  } finally {
    result.consoleErrors = page.__errors;
    result.badResponses = page.__badResponses;
    await context.close();
  }
  return result;
}

async function runDesktopFlow(browser) {
  useSuccessAi();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  await installNativeShareMock(context);
  const page = await instrumentPage(context);
  const result = { name: 'desktop-1440x900', pass: false };
  try {
    await openFresh(page);
    await shot(page, '15-home.png');
    await page.locator('[data-action="start"]').click();
    await page.waitForSelector('[data-action="begin"]');
    await shot(page, '16-instructions.png');
    await page.locator('[data-action="begin"]').click();
    await page.waitForSelector('.v2-option');
    await shot(page, '17-quiz.png');
    await completeQuizFromCurrent(page);
    await page.locator('[data-action="result"]').click();
    await page.waitForSelector('.v2-result-hero--trusted');
    await shot(page, '18-result-hero.png');
    await page.waitForSelector('.v2-ai-report-panel[data-ai-state="success"]');
    await page.locator('[data-ai-report-panel]').scrollIntoViewIfNeeded();
    await shot(page, '19-ai-success.png');
    await page.locator('.v2-map-section').scrollIntoViewIfNeeded();
    await page.locator('.v2-map-section summary').click();
    await shot(page, '20-five-layer-map.png');
    await shot(page, '21-result-full.png');
    const counts = await page.evaluate(() => ({
      constructLayers: document.querySelectorAll('.v2-construct-layer').length,
      constructRows: document.querySelectorAll('.v2-construct-row').length,
      aiSource: window.__heartIslandV2Debug.state.result.aiReport?.source,
    }));
    result.pass = page.__errors.length === 0
      && page.__badResponses.length === 0
      && counts.constructLayers === 5
      && counts.constructRows === 15
      && counts.aiSource === 'ai';
    result.counts = counts;
  } finally {
    result.consoleErrors = page.__errors;
    result.badResponses = page.__badResponses;
    await context.close();
  }
  return result;
}

async function runAiFallbackFlow(browser, { name, mode, expectedState, expectedStatus }) {
  aiMockMode = mode;
  aiMockDelayMs = mode === 'timeout' ? '50' : '0';
  aiTimeoutMs = mode === 'timeout' ? '10' : '5000';
  aiCacheTtlMs = '0';
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await instrumentPage(context);
  const result = { name, pass: false };
  try {
    await openFresh(page);
    await page.locator('[data-action="start"]').click();
    await page.waitForSelector('[data-action="begin"]');
    await page.locator('[data-action="begin"]').click();
    await page.waitForSelector('.v2-option');
    await completeQuizFromCurrent(page);
    await page.locator('[data-action="result"]').click();
    await page.waitForFunction((state) => window.__heartIslandV2Debug.state.result.aiReportStatus.state === state, expectedState);
    const state = await page.evaluate(() => ({
      reportSource: window.__heartIslandV2Debug.state.result.report.source,
      aiSource: window.__heartIslandV2Debug.state.result.aiReport?.source ?? null,
      aiState: window.__heartIslandV2Debug.state.result.aiReportStatus.state,
      retryButtonCount: document.querySelectorAll('[data-action="retry-ai-report"]').length,
    }));
    const metrics = await collectMetrics(page);
    const expectedBadResponses = page.__badResponses.every((item) => item.status === expectedStatus);
    result.pass = page.__errors.length === 0
      && expectedBadResponses
      && state.reportSource === 'deterministic'
      && state.aiSource === null
      && state.aiState === expectedState
      && state.retryButtonCount === 1
      && metrics.horizontalOverflow === 0
      && metrics.brokenImages === 0
      && metrics.smallClickTargets === 0
      && !metrics.secretLeak;
    Object.assign(result, { state, metrics });
  } finally {
    result.consoleErrors = page.__errors;
    result.badResponses = page.__badResponses;
    await context.close();
    useSuccessAi();
  }
  return result;
}

async function captureLoading(context, fileName) {
  const page = await context.newPage();
  await page.route('**/app.mjs', (route) => route.fulfill({
    status: 200,
    contentType: 'text/javascript; charset=utf-8',
    body: '',
  }));
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await shot(page, fileName);
  await page.close();
}

async function openFresh(page) {
  await page.goto(`${baseUrl}?debug=1`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('[data-action="start"]');
}

async function completeQuizFromCurrent(page) {
  for (let step = 0; step < Object.keys(realAnswers).length; step += 1) {
    if (await page.locator('[data-action="result"]').count()) return;
    await selectCurrentStoredAnswer(page);
  }
  await page.waitForSelector('[data-action="result"]');
}

async function selectCurrentStoredAnswer(page) {
  const questionId = await page.locator('.v2-option').first().getAttribute('data-question-id');
  const optionId = realAnswers[questionId] ?? 'A';
  await page.evaluate(({ questionId, optionId }) => {
    document
      .querySelector(`.v2-option[data-question-id="${questionId}"][data-option-id="${optionId}"]`)
      ?.click();
  }, { questionId, optionId });
  await page.waitForFunction((previousQuestionId) => {
    const nextQuestionId = document.querySelector('.v2-option')?.getAttribute('data-question-id');
    return document.querySelector('[data-action="result"]') || (nextQuestionId && nextQuestionId !== previousQuestionId);
  }, questionId);
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

async function shot(page, name) {
  const file = path.join(outDir, name);
  await page.screenshot({ path: file, fullPage: true });
  const metrics = await collectMetrics(page);
  summary.screenshots.push({ name, file: path.relative(root, file).replaceAll('\\', '/'), ...metrics });
}

async function collectMetrics(page) {
  return page.evaluate(() => {
    const text = document.body.innerText;
    const visibleControls = [...document.querySelectorAll('button, a[href], summary')].filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    });
    return {
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      brokenImages: [...document.images].filter((image) => image.naturalWidth === 0).length,
      smallClickTargets: visibleControls.filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width < 44 || rect.height < 44;
      }).length,
      hasUndefined: text.includes('undefined'),
      hasNaN: text.includes('NaN'),
      secretLeak: /API_KEY|Authorization|Bearer|sk-[A-Za-z0-9_-]{12,}/.test(text),
      internalText: /RC2|STATUS CLARITY|CONSTRUCT CODE|schema/i.test(text),
    };
  });
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
    const startedAt = Date.now();
    const url = new URL(request.url, baseUrl);
    if (url.pathname === '/api/v2/ai-report') {
      aiRequestCount += 1;
      response.once('finish', () => aiTimings.push({ status: response.statusCode, durationMs: Date.now() - startedAt }));
      return handleAiReportRequest(request, response, {
        env: {
          AI_REPORT_PROVIDER: 'mock',
          AI_REPORT_MOCK_MODE: aiMockMode,
          AI_REPORT_MOCK_DELAY_MS: aiMockDelayMs,
          AI_REPORT_TIMEOUT_MS: aiTimeoutMs,
          AI_REPORT_SESSION_LIMIT: '100',
          AI_REPORT_CACHE_TTL_MS: aiCacheTtlMs,
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

function useSuccessAi() {
  aiMockMode = 'success';
  aiMockDelayMs = '900';
  aiTimeoutMs = '5000';
  aiCacheTtlMs = '600000';
}
