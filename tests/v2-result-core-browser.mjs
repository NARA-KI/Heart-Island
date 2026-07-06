import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';
import { handleAiReportRequest } from '../server/ai-report/handler.js';
import { answersFromSameOption, loadStoredPilotAnswers } from './v2-baseline-samples.mjs';

const root = process.cwd();
const port = Number(process.env.V2_RESULT_CORE_PORT || 4323);
const baseUrl = `http://127.0.0.1:${port}/`;
const outDir = path.join(root, 'reports', 'audit-assets', 'v2-trusted-beta-result-core');
const resultPath = path.join(root, 'reports', 'data', 'v2-trusted-beta-result-core-browser.json');
const questionBank = readJson('data/v2/question-bank.v2.json');
const realAnswers = loadStoredPilotAnswers(root);
const abnormalAnswers = answersFromSameOption(questionBank, 'A');

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(path.dirname(resultPath), { recursive: true });

const server = await serveStatic();
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const run of [
    { label: '375x667', viewport: { width: 375, height: 667 } },
    { label: '390x844', viewport: { width: 390, height: 844 } },
    { label: '1440x900', viewport: { width: 1440, height: 900 } },
  ]) {
    results.push(await runFullFlow(browser, run));
  }
  results.push(await runAbnormalQualityFlow(browser));
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

async function runFullFlow(browser, { label, viewport }) {
  const context = await browser.newContext({ viewport, acceptDownloads: true });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const consoleErrors = [];
  const requestFailures = [];
  const badResponses = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  page.on('requestfailed', (request) => requestFailures.push({ url: request.url(), error: request.failure()?.errorText }));
  page.on('response', (response) => {
    if (response.status() >= 400) badResponses.push({ url: response.url(), status: response.status() });
  });

  const shots = [];
  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.waitForSelector('[data-action="start"]');
    shots.push(await screenshot(page, `${label}-01-home.png`));
    await page.locator('[data-action="start"]').click();
    await page.waitForSelector('[data-action="begin"]');
    await page.locator('[data-action="begin"]').click();
    await page.waitForSelector('.v2-option');
    shots.push(await screenshot(page, `${label}-02-quiz.png`));
    for (const [questionId, optionId] of Object.entries(realAnswers)) {
      await page.locator(`.v2-option[data-question-id="${questionId}"][data-option-id="${optionId}"]`).click();
    }
    await page.waitForSelector('[data-action="result"]');
    await page.locator('[data-action="result"]').click();
    await page.waitForSelector('.v2-result-hero--trusted');
    shots.push(await screenshot(page, `${label}-03-result-hero.png`));
    shots.push(await screenshot(page, `${label}-04-result-long.png`));
    await page.locator('.v2-map-section').scrollIntoViewIfNeeded();
    shots.push(await screenshot(page, `${label}-05-relationship-map.png`));
    await page.locator('.v2-details summary').click();
    await page.locator('.v2-details').scrollIntoViewIfNeeded();
    shots.push(await screenshot(page, `${label}-06-evidence-expanded.png`));

    const saveDownload = page.waitForEvent('download');
    await page.locator('[data-action="save-result"]').first().click();
    const saved = await saveDownload;
    await saved.saveAs(path.join(outDir, `${label}-07-share-card-save.png`));

    const shareDownload = page.waitForEvent('download');
    await page.locator('[data-action="share-result"]').first().click();
    const shared = await shareDownload;
    await shared.saveAs(path.join(outDir, `${label}-08-share-fallback.png`));

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.v2-result-hero--trusted');
    shots.push(await screenshot(page, `${label}-09-refresh-restored.png`));
    const restoredView = await page.evaluate(() => window.__heartIslandV2Debug.state.view);
    await page.locator('[data-action="restart"]').click();
    await page.waitForSelector('[data-action="begin"]');
    const cleared = await page.evaluate(() => localStorage.getItem('heart-island-v2-alpha-1-state') === null);
    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      text: document.body.innerText,
      smallButtons: [...document.querySelectorAll('button')].filter((button) => {
        const rect = button.getBoundingClientRect();
        return rect.width < 44 || rect.height < 44;
      }).length,
      brokenImages: [...document.images].filter((image) => image.naturalWidth === 0).length,
    }));
    return {
      name: label,
      pass: consoleErrors.length === 0
        && requestFailures.length === 0
        && badResponses.length === 0
        && metrics.scrollWidth <= metrics.innerWidth
        && metrics.smallButtons === 0
        && metrics.brokenImages === 0
        && !metrics.text.includes('undefined')
        && !metrics.text.includes('NaN')
        && !/Alpha|ALPHA|pilot|candidate-a/i.test(metrics.text)
        && restoredView === 'result'
        && cleared,
      shots,
      consoleErrors,
      requestFailures,
      badResponses,
      restoredView,
      cleared,
      metrics: {
        horizontalOverflow: Math.max(0, metrics.scrollWidth - metrics.innerWidth),
        smallButtons: metrics.smallButtons,
        brokenImages: metrics.brokenImages,
        hasUndefined: metrics.text.includes('undefined'),
        hasNaN: metrics.text.includes('NaN'),
        hasInternalText: /Alpha|ALPHA|pilot|candidate-a/i.test(metrics.text),
      },
    };
  } finally {
    await context.close();
  }
}

async function runAbnormalQualityFlow(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.locator('[data-action="start"]').click();
    await page.locator('[data-action="begin"]').click();
    for (const [questionId, optionId] of Object.entries(abnormalAnswers)) {
      await page.locator(`.v2-option[data-question-id="${questionId}"][data-option-id="${optionId}"]`).click();
    }
    await page.locator('[data-action="result"]').click();
    await page.waitForSelector('.v2-quality-notice');
    const text = await page.locator('.v2-quality-notice').innerText();
    const shot = await screenshot(page, '390x844-10-quality-notice.png');
    return {
      name: 'quality-notice',
      pass: consoleErrors.length === 0 && text.includes('选择比较集中'),
      shot,
      consoleErrors,
      text,
    };
  } finally {
    await context.close();
  }
}

async function screenshot(page, name) {
  const file = path.join(outDir, name);
  await page.screenshot({ path: file, fullPage: true });
  return path.relative(root, file).replaceAll('\\', '/');
}

function serveStatic() {
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
          AI_REPORT_MOCK_MODE: 'success',
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

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}
