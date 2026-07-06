import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';
import { handleAiReportRequest } from '../server/ai-report/handler.js';
import { loadStoredPilotAnswers } from './v2-baseline-samples.mjs';

const root = process.cwd();
const port = Number(process.env.V2_CONTROLLED_AI_PORT || 4324);
const baseUrl = `http://127.0.0.1:${port}/`;
const outDir = path.join(root, 'reports', 'audit-assets', 'v2-controlled-ai-report');
const resultPath = path.join(root, 'reports', 'data', 'v2-controlled-ai-report-browser.json');
const realAnswers = loadStoredPilotAnswers(root);
let mockMode = 'success';
let mockDelayMs = '700';

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(path.dirname(resultPath), { recursive: true });

const server = await serveApp();
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const run of [
    { label: '375x667', viewport: { width: 375, height: 667 } },
    { label: '390x844', viewport: { width: 390, height: 844 } },
    { label: '1440x900', viewport: { width: 1440, height: 900 } },
  ]) {
    results.push(await runSuccessFlow(browser, run));
  }
  results.push(await runFailureFlow(browser, 'timeout', '390x844-timeout'));
  results.push(await runFailureFlow(browser, 'invalid-schema', '390x844-invalid-schema'));
} finally {
  await browser.close();
  server.close();
}

const summary = {
  generatedAt: new Date().toISOString(),
  screenshotDir: path.relative(root, outDir).replaceAll('\\', '/'),
  results,
  pass: results.every((item) => item.pass),
};
fs.writeFileSync(resultPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
if (!summary.pass) process.exitCode = 1;

async function runSuccessFlow(browser, { label, viewport }) {
  mockMode = 'success';
  mockDelayMs = '700';
  const context = await browser.newContext({ viewport, acceptDownloads: true });
  const page = await instrumentPage(context);
  const shots = [];
  try {
    await completeQuiz(page);
    await page.locator('[data-action="result"]').click();
    await page.waitForSelector('.v2-result-hero--trusted');
    const initialSource = await page.evaluate(() => window.__heartIslandV2Debug.state.result.report.source);
    await page.waitForSelector('.v2-ai-status[data-ai-state="loading"]');
    shots.push(await screenshot(page, `${label}-01-deterministic-initial.png`));
    shots.push(await screenshot(page, `${label}-02-ai-generating.png`));
    await page.waitForSelector('.v2-ai-status[data-ai-state="success"]');
    const successSource = await page.evaluate(() => window.__heartIslandV2Debug.state.result.report.source);
    shots.push(await screenshot(page, `${label}-03-ai-success-result.png`));
    await page.locator('.v2-map-section').scrollIntoViewIfNeeded();
    shots.push(await screenshot(page, `${label}-04-five-layer-map.png`));

    const saveDownload = page.waitForEvent('download');
    await page.locator('[data-action="save-result"]').first().click();
    const saved = await saveDownload;
    await saved.saveAs(path.join(outDir, `${label}-05-ai-share-card.png`));

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.v2-ai-status[data-ai-state="success"]');
    const restoredSource = await page.evaluate(() => window.__heartIslandV2Debug.state.result.report.source);
    shots.push(await screenshot(page, `${label}-06-refresh-ai-restored.png`));

    await page.locator('[data-action="restart"]').click();
    await page.waitForSelector('[data-action="begin"]');
    const cacheCleared = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      return !keys.some((key) => key.includes('ai-report-cache')) && localStorage.getItem('heart-island-v2-alpha-1-state') === null;
    });
    const metrics = await collectMetrics(page);
    return {
      name: label,
      pass: page.__errors.length === 0
        && page.__badResponses.length === 0
        && initialSource === 'deterministic'
        && successSource === 'ai'
        && restoredSource === 'ai'
        && cacheCleared
        && metrics.horizontalOverflow === 0
        && metrics.brokenImages === 0
        && metrics.apiKeyLeaks === 0
        && !metrics.hasUndefined
        && !metrics.hasNaN,
      shots,
      consoleErrors: page.__errors,
      badResponses: page.__badResponses,
      initialSource,
      successSource,
      restoredSource,
      cacheCleared,
      metrics,
    };
  } finally {
    await context.close();
  }
}

async function runFailureFlow(browser, mode, label) {
  mockMode = mode;
  mockDelayMs = '0';
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const page = await instrumentPage(context);
  const shots = [];
  try {
    await completeQuiz(page);
    await page.locator('[data-action="result"]').click();
    await page.waitForSelector('.v2-result-hero--trusted');
    await page.waitForSelector('.v2-ai-status[data-ai-state="failed"]');
    const source = await page.evaluate(() => window.__heartIslandV2Debug.state.result.report.source);
    const text = await page.locator('.v2-ai-status[data-ai-state="failed"]').innerText();
    shots.push(await screenshot(page, `${label}-fallback.png`));
    const metrics = await collectMetrics(page);
    const expectedStatus = mode === 'timeout' ? 504 : 500;
    const onlyExpectedBadResponses = page.__badResponses.every((item) => item.status === expectedStatus);
    return {
      name: label,
      pass: page.__errors.length === 0
        && onlyExpectedBadResponses
        && source === 'deterministic'
        && text.includes('稳定版')
        && metrics.horizontalOverflow === 0
        && metrics.brokenImages === 0
        && metrics.apiKeyLeaks === 0
        && !metrics.hasUndefined
        && !metrics.hasNaN,
      shots,
      consoleErrors: page.__errors,
      badResponses: page.__badResponses,
      source,
      statusText: text,
      metrics,
    };
  } finally {
    await context.close();
  }
}

async function completeQuiz(page) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.waitForSelector('[data-action="start"]');
  await page.locator('[data-action="start"]').click();
  await page.waitForSelector('[data-action="begin"]');
  await page.locator('[data-action="begin"]').click();
  await page.waitForSelector('.v2-option');
  for (const [questionId, optionId] of Object.entries(realAnswers)) {
    await page.locator(`.v2-option[data-question-id="${questionId}"][data-option-id="${optionId}"]`).click();
  }
  await page.waitForSelector('[data-action="result"]');
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

async function collectMetrics(page) {
  return page.evaluate(() => {
    const scripts = [...document.scripts].map((script) => script.textContent || '').join('\n');
    const text = document.body.innerText;
    return {
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      brokenImages: [...document.images].filter((image) => image.naturalWidth === 0).length,
      apiKeyLeaks: (text.match(/AI_REPORT_API_KEY|sk-[A-Za-z0-9_-]{12,}/g) || []).length
        + (scripts.match(/AI_REPORT_API_KEY|sk-[A-Za-z0-9_-]{12,}/g) || []).length,
      hasUndefined: text.includes('undefined'),
      hasNaN: text.includes('NaN'),
    };
  });
}

async function screenshot(page, name) {
  const file = path.join(outDir, name);
  await page.screenshot({ path: file, fullPage: true });
  return path.relative(root, file).replaceAll('\\', '/');
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
      return handleAiReportRequest(request, response, {
        env: {
          AI_REPORT_PROVIDER: 'mock',
          AI_REPORT_MOCK_MODE: mockMode,
          AI_REPORT_MOCK_DELAY_MS: mockDelayMs,
          AI_REPORT_TIMEOUT_MS: '10',
          AI_REPORT_SESSION_LIMIT: '100',
          AI_REPORT_CACHE_TTL_MS: '0',
        },
      });
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
