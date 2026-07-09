import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { createResultHash } from '../js/v2/ai/ai-report-schema.js';

const baseUrl = process.env.V2_PRODUCTION_BASE_URL;
if (!baseUrl) throw new Error('V2_PRODUCTION_BASE_URL is required');
const useCacheBust = process.env.V2_PRODUCTION_CACHE_BUST !== 'false';

const outputDir = path.resolve(
  process.env.V2_PRODUCTION_OUTPUT_DIR
    ?? path.join('output', 'playwright', 'production-validation'),
);
fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const summary = {
  baseUrl,
  generatedAt: new Date().toISOString(),
  mobile: [],
  quickToFull: null,
  directFull: null,
  errorFallback: null,
  screenshots: [],
  pass: false,
};

try {
  for (const width of [320, 375, 390, 430]) {
    const page = await browser.newPage({ viewport: { width, height: 667 } });
    await openFresh(page);
    await page.locator('[data-quiz-mode="quick"]').click();
    const metrics = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('[data-quiz-mode]')];
      const start = document.querySelector('[data-action="start"]')?.getBoundingClientRect();
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        cardCount: cards.length,
        smallCards: cards.filter((card) => {
          const box = card.getBoundingClientRect();
          return box.width < 44 || box.height < 44;
        }).length,
        primaryActionBottom: start ? Math.round(start.bottom) : null,
      };
    });
    assert.equal(metrics.scrollWidth, metrics.clientWidth);
    assert.equal(metrics.cardCount, 2);
    assert.equal(metrics.smallCards, 0);
    assert(metrics.primaryActionBottom && metrics.primaryActionBottom <= 667);
    summary.mobile.push({ width, ...metrics });
    await page.close();
  }

  summary.quickToFull = await runQuickToFull();
  summary.directFull = await runDirectFull();
  summary.errorFallback = await runErrorFallback();
  summary.pass = true;
} finally {
  await browser.close();
}

fs.writeFileSync(
  path.join(outputDir, 'summary.json'),
  `${JSON.stringify(summary, null, 2)}\n`,
);
console.log(JSON.stringify(summary, null, 2));

async function runQuickToFull() {
  const page = await instrumentedPage({ width: 390, height: 844 });
  try {
    await openFresh(page);
    await page.locator('[data-quiz-mode="quick"]').click();
    await shot(page, '01-home-dual-mode-390x844.png');
    await page.locator('[data-action="start"]').click();
    await page.locator('[data-action="begin"]').click();
    assert.match(await page.locator('[data-quiz-timer]').textContent(), /^◷ \d{2}:\d{2}$/);
    assert.equal(
      await page.locator('.v2-question-card').evaluate((node) => getComputedStyle(node, '::before').display),
      'none',
    );
    await shot(page, '02-quick-quiz-timer-390x844.png');

    const quickIds = await answerSequence(page, 30);
    assert.equal(new Set(quickIds).size, 30);
    await page.locator('.v2-transition--quick').waitFor();
    await shot(page, '03-quick-transition-390x844.png');
    await page.locator('[data-action="result"]').click();
    await waitForAiSuccess(page);
    assert.equal(await page.locator('.v2-construct-row').count(), 15);
    assert.equal(await page.locator('[data-action="continue-full"]').count(), 1);
    const quick = await reportSnapshot(page, 'quick');
    await shot(page, '04-quick-ai-result-390x844.png', true);

    await page.locator('[data-action="continue-full"]').click();
    const firstRemaining = await currentQuestionId(page);
    assert(!quickIds.includes(firstRemaining));
    const firstFive = await answerSequence(page, 5);
    const beforeRefresh = await currentQuestionId(page);
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('[data-action="continue"]').click();
    assert.equal(await currentQuestionId(page), beforeRefresh);
    const tail = await answerSequence(page, 25);
    const remainingIds = [...firstFive, ...tail];
    assert.equal(new Set(remainingIds).size, 30);
    assert.equal(remainingIds.some((id) => quickIds.includes(id)), false);
    await page.locator('.v2-transition--full').waitFor();
    await shot(page, '05-full-transition-after-continuation-390x844.png');
    await page.locator('[data-action="result"]').click();
    await waitForAiSuccess(page);
    const full = await reportSnapshot(page, 'full');
    assert.equal(full.answerCount, 60);
    assert.notEqual(quick.resultHash, full.resultHash);
    assert.notEqual(quick.reportSignature, full.reportSignature);
    await shot(page, '06-full-ai-result-after-continuation-390x844.png', true);
    const errors = classifyConsoleErrors(page.__errors, page);
    if (errors.unexpected.length > 0) {
      console.log('Production HTTP errors (quickToFull):', JSON.stringify(page.__httpErrors, null, 2));
    }
    console.log('Console errors (quickToFull):', JSON.stringify({
      total: page.__errors.length,
      transientAi: errors.transientAi.length,
      transientCdn: errors.transientCdn.length,
      unexpected: errors.unexpected,
    }));
    assert.deepEqual(errors.unexpected, []);
    return {
      quick,
      full,
      quickQuestions: quickIds.length,
      remainingQuestions: remainingIds.length,
      answersPreserved: full.answerCount,
      refreshRestoredQuestionId: beforeRefresh,
      transientAiErrors: errors.transientAi.length,
      transientCdnErrors: errors.transientCdn.length,
    };
  } finally {
    await page.close();
  }
}

async function runDirectFull() {
  const page = await instrumentedPage({ width: 430, height: 932 });
  try {
    await openFresh(page);
    await page.locator('[data-quiz-mode="full"]').click();
    await page.locator('[data-action="start"]').click();
    await page.locator('[data-action="begin"]').click();
    const ids = await answerSequence(page, 60);
    assert.equal(new Set(ids).size, 60);
    await page.locator('.v2-transition--full').waitFor();
    await page.locator('[data-action="result"]').click();
    await waitForAiSuccess(page);
    const result = await reportSnapshot(page, 'full');
    assert.equal(result.answerCount, 60);
    await shot(page, '07-direct-full-ai-result-430x932.png', true);
    const errors = classifyConsoleErrors(page.__errors, page);
    if (errors.unexpected.length > 0) {
      console.log('Production HTTP errors (directFull):', JSON.stringify(page.__httpErrors, null, 2));
    }
    console.log('Console errors (directFull):', JSON.stringify({
      total: page.__errors.length,
      transientAi: errors.transientAi.length,
      transientCdn: errors.transientCdn.length,
      unexpected: errors.unexpected,
    }));
    assert.deepEqual(errors.unexpected, []);
    return { ...result, transientAiErrors: errors.transientAi.length, transientCdnErrors: errors.transientCdn.length };
  } finally {
    await page.close();
  }
}

async function runErrorFallback() {
  const page = await instrumentedPage({ width: 390, height: 844 });
  await page.route('**/api/v2/ai-report', (route) => route.fulfill({
    status: 502,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'temporary upstream failure' }),
  }));
  try {
    await openFresh(page);
    await page.locator('[data-quiz-mode="quick"]').click();
    await page.locator('[data-action="start"]').click();
    await page.locator('[data-action="begin"]').click();
    await answerSequence(page, 30);
    await page.locator('[data-action="result"]').click();
    await page.locator('[data-ai-report-panel][data-ai-state="error"]').waitFor({ timeout: 30000 });
    const state = await page.evaluate(() => ({
      reportSource: window.__heartIslandV2Debug.state.result.report.source,
      aiSource: window.__heartIslandV2Debug.state.result.aiReport?.source ?? null,
      answerCount: Object.keys(window.__heartIslandV2Debug.state.answersByQuestionId).length,
    }));
    assert.equal(state.reportSource, 'deterministic');
    assert.equal(state.aiSource, null);
    assert.equal(state.answerCount, 30);
    assert.equal(await page.locator('[data-action="retry-ai-report"]').count(), 1);
    await shot(page, '08-ai-error-fallback-390x844.png', true);
    return state;
  } finally {
    await page.close();
  }
}

async function reportSnapshot(page, expectedMode) {
  return page.evaluate(({ expectedMode }) => {
    const result = window.__heartIslandV2Debug.state.result;
    const facts = result.facts;
    const ai = result.aiReport;
    return {
      quizMode: facts.assessment.quizMode,
      answeredCount: facts.assessment.answeredCount,
      answerCount: Object.keys(window.__heartIslandV2Debug.state.answersByQuestionId).length,
      facts,
      aiSource: ai?.source ?? null,
      aiSchemaVersion: ai?.schemaVersion ?? null,
      reportSignature: JSON.stringify(ai),
      expectedMode,
    };
  }, { expectedMode }).then((snapshot) => {
    assert.equal(snapshot.quizMode, expectedMode);
    assert.equal(snapshot.aiSource, 'ai');
    assert(snapshot.aiSchemaVersion);
    return {
      quizMode: snapshot.quizMode,
      answeredCount: snapshot.answeredCount,
      answerCount: snapshot.answerCount,
      resultHash: createResultHash(snapshot.facts),
      aiSource: snapshot.aiSource,
      aiSchemaVersion: snapshot.aiSchemaVersion,
      reportSignature: crypto.createHash('sha256')
        .update(snapshot.reportSignature)
        .digest('hex')
        .slice(0, 16),
    };
  });
}

async function answerSequence(page, count) {
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

async function currentQuestionId(page) {
  return page.locator('.v2-option').first().getAttribute('data-question-id');
}

async function waitForAiSuccess(page) {
  await page.waitForFunction(() => {
    const state = document.querySelector('[data-ai-report-panel]')?.dataset.aiState;
    return ['success', 'error', 'timeout'].includes(state);
  }, undefined, { timeout: 60000 });
  const state = await page.locator('[data-ai-report-panel]').getAttribute('data-ai-state');
  if (state === 'success') return;
  await page.locator('[data-action="retry-ai-report"]').click();
  await page.locator('[data-ai-report-panel][data-ai-state="success"]').waitFor({ timeout: 60000 });
}

function classifyConsoleErrors(errors, page) {
  const transientAi = errors.filter((message) => (
    message.includes('/api/v2/ai-report')
    || message.includes('net::ERR_FAILED')
  ));
  // CloudBase CDN cold-start: the first page navigation to a novel
  // cache-bust URL may return 404 from the tcbgw gateway while the edge
  // propagates the upstream COS route.  The SPA still renders (the HTML
  // body is delivered), and a delayed gateway meta-refresh eventually
  // loads the real 200 response.  The browser logs a generic "Failed to
  // load resource … 404" for the initial document hit — but ONLY when
  // the HTTP layer confirms the sole 4xx source is a document navigation.
  // If any other 4xx (image, script, stylesheet, etc.) is present we let
  // the assertion fire so real defects are never masked.
  const httpErrors = page?.__httpErrors ?? [];
  const doc404s = httpErrors.filter(
    (e) => e.status === 404 && e.resourceType === 'document',
  );
  const other4xx = httpErrors.filter(
    (e) => !(e.status === 404 && e.resourceType === 'document'),
  );
  const transientCdn = (doc404s.length > 0 && other4xx.length === 0)
    ? errors.filter((msg) => (
        !transientAi.includes(msg)
        && msg.includes('Failed to load resource')
        && msg.includes('404')
      ))
    : [];
  return {
    transientAi,
    transientCdn,
    unexpected: errors.filter((message) => (
      !transientAi.includes(message)
      && !transientCdn.includes(message)
    )),
  };
}

async function openFresh(page) {
  const separator = baseUrl.includes('?') ? '&' : '?';
  const url = useCacheBust
    ? `${baseUrl}${separator}deploy=${Date.now()}&debug=1`
    : baseUrl;
  await page.goto(url, { waitUntil: 'networkidle' });
  const riskContinue = page.getByRole('button', { name: '确定访问' });
  if (await riskContinue.count()) {
    await riskContinue.waitFor({ state: 'visible' });
    await page.waitForFunction(() => {
      const button = [...document.querySelectorAll('button')]
        .find((item) => item.textContent?.trim() === '确定访问');
      return button && !button.disabled;
    });
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      riskContinue.click(),
    ]);
  }
  await page.locator('[data-action="start"]').waitFor();
}

async function instrumentedPage(viewport) {
  const page = await browser.newPage({ viewport });
  page.__errors = [];
  page.__httpErrors = [];
  page.on('pageerror', (error) => page.__errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') page.__errors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      page.__httpErrors.push({
        status: response.status(),
        method: response.request().method(),
        resourceType: response.request().resourceType(),
        url: response.url(),
      });
    }
  });
  return page;
}

async function shot(page, name, fullPage = false) {
  const file = path.join(outputDir, name);
  await page.screenshot({ path: file, fullPage });
  summary.screenshots.push(file);
}
