// Heart Island — UI Inspection Script (read-only, no code changes)
// Takes screenshots at 1440px and 390px for homepage, quiz, and result pages

import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const REPORT_DIR = 'reports';

async function screenshot(page, name) {
  const path = `${REPORT_DIR}/screenshot-${name}.png`;
  await page.screenshot({ path, fullPage: false });
  console.log(`  ✓ ${path}`);
  return path;
}

async function answerAllQuestions(page) {
  // Click "开始测试" button
  const startBtn = page.locator('#intro-start-btn');
  if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await startBtn.click();
    console.log('  → Clicked 开始测试');
  }

  // Answer all 36 questions
  for (let q = 0; q < 36; q++) {
    await page.waitForTimeout(400); // wait for transition

    // Find any visible option button
    const options = page.locator('.option-btn, .scene-option-btn, [class*="option"]');
    const count = await options.count();
    if (count > 0) {
      // Click the first available option
      await options.first().click();
    }

    // If there's a "next" or "确认" button, click it
    const nextBtn = page.locator('#scene-next-btn, .next-btn, [class*="next"]');
    if (await nextBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await nextBtn.click();
    }

    if ((q + 1) % 10 === 0) console.log(`  → Answered ${q + 1}/36 questions`);
  }

  // Wait for ending sequence — try to click skip button with force
  await page.waitForTimeout(1500);

  // Use force:true to bypass the ending-backdrop overlay
  const skipBtn = page.locator('#ending-skip-btn');
  if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await skipBtn.click({ force: true });
    console.log('  → Clicked 直接查看结果 (forced)');
  }

  // Wait for result transition to complete
  await page.waitForTimeout(2500);
}

async function run() {
  console.log('Heart Island UI Inspection\n');

  const browser = await chromium.launch({ headless: true });

  try {
    // ===== 1440px DESKTOP =====
    console.log('=== DESKTOP 1440×900 ===');
    const ctxDesktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageD = await ctxDesktop.newPage();

    // Homepage
    await pageD.goto(BASE, { waitUntil: 'networkidle' });
    await pageD.waitForTimeout(500);
    await screenshot(pageD, 'home-1440px');

    // Quiz page — first question
    const startBtn = pageD.locator('#intro-start-btn');
    if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startBtn.click();
      await pageD.waitForTimeout(800);
    }
    await screenshot(pageD, 'quiz-1440px');

    // Answer all and get result
    await answerAllQuestions(pageD);
    await pageD.waitForTimeout(1000);
    await screenshot(pageD, 'result-1440px');

    await ctxDesktop.close();

    // ===== 390px MOBILE =====
    console.log('\n=== MOBILE 390×844 ===');
    const ctxMobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const pageM = await ctxMobile.newPage();

    // Homepage
    await pageM.goto(BASE, { waitUntil: 'networkidle' });
    await pageM.waitForTimeout(500);
    await screenshot(pageM, 'home-390px');

    // Quiz page
    const startBtnM = pageM.locator('#intro-start-btn');
    if (await startBtnM.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startBtnM.click();
      await pageM.waitForTimeout(800);
    }
    await screenshot(pageM, 'quiz-390px');

    // Answer all and get result
    await answerAllQuestions(pageM);
    await pageM.waitForTimeout(1000);
    await screenshot(pageM, 'result-390px');

    await ctxMobile.close();

    console.log('\n✓ All screenshots captured');
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('Inspection failed:', err.message);
  process.exit(1);
});
