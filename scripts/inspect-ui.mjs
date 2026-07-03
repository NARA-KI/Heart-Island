// Heart Island UI Inspection Script
// Beta 0.9.9.7: mobile identity/transition verification + key flow screenshots.

import { chromium } from 'playwright';

const BASE = process.env.HEART_ISLAND_BASE || 'http://localhost:3000';
const REPORT_DIR = 'reports';
const VERSION_SLUG = 'beta-0.9.9.7';

async function screenshot(page, name) {
  const path = `${REPORT_DIR}/screenshot-${name}-${VERSION_SLUG}.png`;
  await page.screenshot({ path, fullPage: false });
  console.log(`  OK ${path}`);
  return path;
}

async function inspectHome(page, label) {
  const metrics = await page.evaluate(() => {
    const btn = document.querySelector('#intro-start-btn');
    const title = document.querySelector('#intro-title');
    const subtitle = document.querySelector('#intro-subtitle');
    const supplement = document.querySelector('#intro-concrete-subtitle');
    const doc = document.documentElement;
    const btnRect = btn ? btn.getBoundingClientRect() : null;
    const titleRect = title ? title.getBoundingClientRect() : null;
    const subtitleRect = subtitle ? subtitle.getBoundingClientRect() : null;
    const supplementRect = supplement ? supplement.getBoundingClientRect() : null;
    const visible = (rect) => !!rect && rect.top >= 0 && rect.bottom <= window.innerHeight && rect.left >= 0 && rect.right <= window.innerWidth;
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      titleVisible: visible(titleRect),
      subtitleVisible: visible(subtitleRect),
      supplementVisible: visible(supplementRect),
      ctaVisible: visible(btnRect),
      ctaHeight: btnRect ? Math.round(btnRect.height) : 0,
      ctaBottom: btnRect ? Math.round(btnRect.bottom) : null,
      horizontalOverflow: doc.scrollWidth > window.innerWidth
    };
  });

  console.log(
    `  ${label}: CTA=${metrics.ctaVisible ? 'PASS' : 'FAIL'} ` +
    `height=${metrics.ctaHeight}px bottom=${metrics.ctaBottom}/${metrics.viewport.height} ` +
    `title=${metrics.titleVisible ? 'PASS' : 'FAIL'} ` +
    `supplement=${metrics.supplementVisible ? 'PASS' : 'FAIL'} ` +
    `overflow=${metrics.horizontalOverflow ? 'FAIL' : 'PASS'}`
  );
  return metrics;
}

async function answerAllQuestions(page) {
  const startBtn = page.locator('#intro-start-btn');
  if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await startBtn.click();
    console.log('  Clicked start');
  }

  for (let q = 0; q < 36; q++) {
    await page.waitForTimeout(250);
    const options = page.locator('.option-btn');
    const count = await options.count();
    if (count > 0) await options.first().click();
    if ((q + 1) % 12 === 0) console.log(`  Answered ${q + 1}/36 questions`);
  }

  await page.locator('#ending-screen:not(.hidden)').waitFor({ timeout: 6000 });
  await page.waitForTimeout(900);
  await screenshot(page, 'transition-390px');
  const transitionMetrics = await page.evaluate(() => {
    const ending = document.querySelector('#ending-screen');
    const reveal = document.querySelector('#reveal-screen');
    const endingBackdrop = document.querySelector('#ending-backdrop');
    const bg = endingBackdrop ? getComputedStyle(endingBackdrop).backgroundImage : '';
    return {
      endingVisible: !!ending && !ending.classList.contains('hidden'),
      revealVisible: !!reveal && !reveal.classList.contains('hidden'),
      usesSilverLake: bg.includes('silver-lake'),
      litLocations: document.querySelectorAll('.ending-loc-node.lit').length,
      litBeacons: document.querySelectorAll('.ending-beacon.lit, .ending-beacon.highlighted').length,
      routeActive: !!document.querySelector('#ending-route-line.active')
    };
  });
  console.log(
    `  transition-390px: ending=${transitionMetrics.endingVisible ? 'PASS' : 'FAIL'} ` +
    `silverLake=${transitionMetrics.usesSilverLake ? 'PASS' : 'FAIL'} ` +
    `revealHidden=${!transitionMetrics.revealVisible ? 'PASS' : 'FAIL'} ` +
    `extraNodes=${transitionMetrics.litLocations + transitionMetrics.litBeacons === 0 && !transitionMetrics.routeActive ? 'PASS' : 'FAIL'}`
  );
  if (
    !transitionMetrics.endingVisible ||
    !transitionMetrics.usesSilverLake ||
    transitionMetrics.revealVisible ||
    transitionMetrics.litLocations > 0 ||
    transitionMetrics.litBeacons > 0 ||
    transitionMetrics.routeActive
  ) {
    throw new Error('Single-image transition check failed');
  }

  const skipBtn = page.locator('#ending-skip-btn');
  for (let attempt = 0; attempt < 5; attempt++) {
    if (await page.locator('#result-card.visible').isVisible().catch(() => false)) break;
    if (await skipBtn.isVisible({ timeout: 1200 }).catch(() => false)) {
      await skipBtn.click({ force: true });
      console.log('  Skipped ending');
    }
    await page.waitForTimeout(1300);
  }
  await page.locator('#result-card.visible').waitFor({ timeout: 10000 });
}

async function inspectQuiz(page) {
  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const title = document.querySelector('#scene-title')?.getBoundingClientRect();
    const options = [...document.querySelectorAll('.option-btn')].map(btn => btn.getBoundingClientRect());
    const visibleOptions = options.filter(rect => rect.top < window.innerHeight && rect.bottom > 0);
    return {
      horizontalOverflow: doc.scrollWidth > window.innerWidth,
      titleTop: title ? Math.round(title.top) : null,
      visibleOptions: visibleOptions.length,
      minOptionHeight: options.length ? Math.round(Math.min(...options.map(rect => rect.height))) : 0
    };
  });

  console.log(
    `  quiz-390px: titleTop=${metrics.titleTop} ` +
    `visibleOptions=${metrics.visibleOptions} minOptionHeight=${metrics.minOptionHeight}px ` +
    `overflow=${metrics.horizontalOverflow ? 'FAIL' : 'PASS'}`
  );

  if (metrics.horizontalOverflow || metrics.visibleOptions < 2 || metrics.minOptionHeight < 44) {
    throw new Error('Quiz mobile simplification check failed');
  }
  return metrics;
}

async function checkPrevButton(page) {
  await page.locator('.option-btn').first().click();
  await page.waitForTimeout(550);
  const prevBtn = page.locator('#prev-btn');
  const prevVisible = await prevBtn.isVisible({ timeout: 2000 }).catch(() => false);
  console.log(`  prev button: ${prevVisible ? 'PASS' : 'FAIL'}`);
  if (!prevVisible) throw new Error('Previous button is not available after answering one question');
  await prevBtn.click();
  await page.waitForTimeout(550);
}

async function inspectResultHeroAndShare(page) {
  const metrics = await page.evaluate(() => {
    const rectFor = selector => document.querySelector(selector)?.getBoundingClientRect();
    const inViewport = rect => !!rect && rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
    const doc = document.documentElement;
    const name = rectFor('.hero-island-name');
    const hitline = rectFor('.hero-hitline');
    const portrait = rectFor('.hero-portrait-wrap');
    const share = rectFor('#hero-share-trigger');
    return {
      horizontalOverflow: doc.scrollWidth > window.innerWidth,
      nameVisible: inViewport(name),
      hitlineVisible: inViewport(hitline),
      portraitVisible: inViewport(portrait),
      portraitWidth: portrait ? Math.round(portrait.width) : 0,
      shareVisible: inViewport(share),
      keywordCount: document.querySelectorAll('.hero-keyword').length
    };
  });

  console.log(
    `  result-390px: name=${metrics.nameVisible ? 'PASS' : 'FAIL'} ` +
    `keywords=${metrics.keywordCount} hitline=${metrics.hitlineVisible ? 'PASS' : 'FAIL'} ` +
    `portrait=${metrics.portraitVisible ? 'PASS' : 'FAIL'} width=${metrics.portraitWidth}px ` +
    `share=${metrics.shareVisible ? 'PASS' : 'FAIL'} ` +
    `overflow=${metrics.horizontalOverflow ? 'FAIL' : 'PASS'}`
  );

  if (
    metrics.horizontalOverflow ||
    !metrics.nameVisible ||
    metrics.keywordCount < 3 ||
    !metrics.hitlineVisible ||
    !metrics.portraitVisible ||
    metrics.portraitWidth < 220 ||
    !metrics.shareVisible
  ) {
    throw new Error('Result hero mobile simplification check failed');
  }

  await page.locator('#hero-share-trigger').click();
  await page.waitForTimeout(1200);
  const shareOk = await page.evaluate(() => {
    const img = document.querySelector('#share-preview-img');
    return !!img && typeof img.src === 'string' && img.src.startsWith('data:image/');
  });
  console.log(`  share card generation: ${shareOk ? 'PASS' : 'FAIL'}`);
  if (!shareOk) throw new Error('Share card generation failed');
  return metrics;
}

async function run() {
  console.log(`Heart Island UI Inspection ${VERSION_SLUG}`);
  console.log(`Base: ${BASE}\n`);

  const browser = await chromium.launch({ headless: true });
  const results = {};

  try {
    for (const width of [375, 390, 430]) {
      const label = `home-${width}px`;
      console.log(`=== HOME ${width}x844 ===`);
      const ctx = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true });
      const page = await ctx.newPage();
      await page.goto(BASE, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1700);
      results[label] = await inspectHome(page, label);
      await screenshot(page, label);
      await ctx.close();
    }

    console.log('\n=== MOBILE FLOW 390x844 ===');
    const ctxMobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const pageM = await ctxMobile.newPage();
    await pageM.goto(BASE, { waitUntil: 'networkidle' });
    await pageM.waitForTimeout(1700);

    const startBtnM = pageM.locator('#intro-start-btn');
    if (await startBtnM.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startBtnM.click();
      await pageM.waitForTimeout(800);
    }
    await screenshot(pageM, 'quiz-390px');
    await inspectQuiz(pageM);
    await checkPrevButton(pageM);

    await answerAllQuestions(pageM);
    await pageM.waitForTimeout(1000);
    await screenshot(pageM, 'result-390px');
    await inspectResultHeroAndShare(pageM);
    await ctxMobile.close();

    const failedHomes = Object.entries(results).filter(([, m]) =>
      !m.ctaVisible || m.ctaHeight < 44 || m.horizontalOverflow || !m.titleVisible || !m.supplementVisible
    );

    if (failedHomes.length > 0) {
      console.error('\nHome CTA verification failed:', failedHomes.map(([name]) => name).join(', '));
      process.exit(1);
    }

    console.log('\nAll screenshots captured and home CTA checks passed');
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('Inspection failed:', err);
  process.exit(1);
});
