import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';
import { V2_AI_REPORT_PROMPT_VERSION } from '../js/v2/config.js';
import { buildDeterministicReport } from '../js/v2/result-report-builder.js';

const root = process.cwd();
const server = http.createServer(serveStatic);
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const outputDir = path.join(root, 'output', 'playwright', 'dual-quiz-local');
fs.mkdirSync(outputDir, { recursive: true });

try {
  const mobileChecks = [];
  for (const width of [320, 375, 390, 430]) {
    const page = await browser.newPage({ viewport: { width, height: 667 } });
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('[data-quiz-mode="quick"]').click();
    const startBox = await page.locator('[data-action="start"]').boundingBox();
    const layout = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    assert.equal(layout.scrollWidth, layout.clientWidth, `${width}px home must not overflow horizontally`);
    assert(startBox && startBox.y + startBox.height <= 667, `${width}px primary home action must be visible in first viewport`);
    mobileChecks.push({ width, ...layout, primaryActionBottom: Math.round(startBox.y + startBox.height) });
    await page.close();
  }

  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const consoleErrors = [];
  const aiRequests = [];
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.route('**/api/v2/ai-report', async (route) => {
    const payload = route.request().postDataJSON();
    aiRequests.push(payload);
    const report = { ...buildDeterministicReport(payload.facts), source: 'ai' };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        resultHash: payload.resultHash,
        report,
        provider: 'mock',
        promptVersion: V2_AI_REPORT_PROMPT_VERSION,
        generatedAt: new Date().toISOString(),
      }),
    });
  });

  await page.goto(`${baseUrl}/index.html?debug=1`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('[data-quiz-mode="quick"]').click();
  await page.screenshot({ path: path.join(outputDir, '01-home-quick-selected-390x844.png'), fullPage: true });
  await page.locator('[data-action="start"]').click();
  await page.locator('[data-action="begin"]').click();
  assert.match(await page.locator('[data-quiz-timer]').textContent(), /^◷ \d{2}:\d{2}$/);
  assert.equal(await page.locator('.v2-question-card').evaluate((node) => getComputedStyle(node, '::before').display), 'none');
  await page.screenshot({ path: path.join(outputDir, '02-quick-quiz-390x844.png'), fullPage: true });

  const quickIds = await answerCurrentSequence(page, 30);
  assert.equal(new Set(quickIds).size, 30);
  assert.equal(await page.locator('.v2-transition--quick').count(), 1);
  await page.screenshot({ path: path.join(outputDir, '03-quick-transition-390x844.png'), fullPage: true });
  await page.locator('[data-action="result"]').click();
  await page.locator('[data-ai-report-panel][data-ai-state="success"]').waitFor();
  assert.equal(await page.locator('.v2-construct-row').count(), 15);
  assert.equal(await page.locator('[data-action="continue-full"]').count(), 1);
  const quickState = await page.evaluate(() => ({
    resultId: window.__heartIslandV2Debug.state.quickReport.facts.resultId,
    answers: Object.keys(window.__heartIslandV2Debug.state.answersByQuestionId).length,
  }));
  assert.equal(quickState.answers, 30);
  await page.screenshot({ path: path.join(outputDir, '04-quick-result-390x844.png'), fullPage: true });

  await page.locator('[data-action="continue-full"]').click();
  const firstRemainingId = await page.locator('.v2-option').first().getAttribute('data-question-id');
  assert(!quickIds.includes(firstRemainingId), 'continuation must start from the remaining complement');
  const firstFiveRemaining = await answerCurrentSequence(page, 5);
  const beforeRefreshId = await page.locator('.v2-option').first().getAttribute('data-question-id');
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.locator('.v2-draft-card').count(), 1);
  await page.locator('[data-action="continue"]').click();
  assert.equal(await page.locator('.v2-option').first().getAttribute('data-question-id'), beforeRefreshId);
  const remainingTail = await answerCurrentSequence(page, 25);
  const remainingIds = [...firstFiveRemaining, ...remainingTail];
  assert.equal(new Set(remainingIds).size, 30);
  assert.equal(remainingIds.filter((id) => quickIds.includes(id)).length, 0);
  assert.equal(await page.locator('.v2-transition--full').count(), 1);
  await page.screenshot({ path: path.join(outputDir, '05-full-transition-390x844.png'), fullPage: true });
  await page.locator('[data-action="result"]').click();
  await page.locator('[data-ai-report-panel][data-ai-state="success"]').waitFor();

  const finalState = await page.evaluate(() => ({
    answers: Object.keys(window.__heartIslandV2Debug.state.answersByQuestionId).length,
    quickResultId: window.__heartIslandV2Debug.state.quickReport.facts.resultId,
    fullResultId: window.__heartIslandV2Debug.state.fullReport.facts.resultId,
    quickMode: window.__heartIslandV2Debug.state.quickReport.facts.assessment.quizMode,
    fullMode: window.__heartIslandV2Debug.state.fullReport.facts.assessment.quizMode,
  }));
  assert.equal(finalState.answers, 60);
  assert.equal(finalState.quickResultId, quickState.resultId);
  assert.notEqual(finalState.quickResultId, finalState.fullResultId);
  assert.equal(finalState.quickMode, 'quick');
  assert.equal(finalState.fullMode, 'full');
  assert.equal(aiRequests.length, 2);
  assert.equal(aiRequests[0].facts.assessment.quizMode, 'quick');
  assert.equal(aiRequests[0].facts.assessment.answeredCount, 30);
  assert.equal(aiRequests[1].facts.assessment.quizMode, 'full');
  assert.equal(aiRequests[1].facts.assessment.answeredCount, 60);
  assert.notEqual(aiRequests[0].resultHash, aiRequests[1].resultHash);
  await page.screenshot({ path: path.join(outputDir, '06-full-result-390x844.png'), fullPage: true });

  assert.deepEqual(consoleErrors, []);
  console.log(JSON.stringify({
    pass: true,
    mobileChecks,
    quickQuestions: quickIds.length,
    remainingQuestions: remainingIds.length,
    answersPreserved: finalState.answers,
    refreshRestoredQuestionId: beforeRefreshId,
    aiRequests: aiRequests.map((payload) => ({
      quizMode: payload.facts.assessment.quizMode,
      answeredCount: payload.facts.assessment.answeredCount,
      resultHash: payload.resultHash,
    })),
    screenshots: fs.readdirSync(outputDir).map((name) => path.join('output', 'playwright', 'dual-quiz-local', name)),
  }, null, 2));
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

async function answerCurrentSequence(page, count) {
  const ids = [];
  for (let index = 0; index < count; index += 1) {
    const option = page.locator('.v2-option').nth(index % 4);
    const id = await option.getAttribute('data-question-id');
    ids.push(id);
    await option.click();
    await page.waitForFunction((previousId) => {
      const current = document.querySelector('.v2-option')?.dataset.questionId;
      return current !== previousId || Boolean(document.querySelector('.v2-transition'));
    }, id);
  }
  return ids;
}

function serveStatic(request, response) {
  const url = new URL(request.url || '/', 'http://127.0.0.1');
  const relative = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
  const filePath = path.resolve(root, relative);
  if (!filePath.startsWith(`${path.resolve(root)}${path.sep}`) && filePath !== path.join(root, 'index.html')) {
    response.writeHead(403).end();
    return;
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, {
    'Content-Type': contentType(filePath),
    'Cache-Control': 'no-store',
  });
  fs.createReadStream(filePath).pipe(response);
}

function contentType(filePath) {
  return ({
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.webp': 'image/webp',
  })[path.extname(filePath)] ?? 'application/octet-stream';
}
