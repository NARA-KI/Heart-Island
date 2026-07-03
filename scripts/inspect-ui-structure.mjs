// Heart Island — UI Structure Inspector
// Extracts DOM metrics, accessibility tree, and layout issues

import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const ISSUES = [];

function addIssue(severity, page, viewport, title, detail) {
  ISSUES.push({ severity, page, viewport, title, detail });
}

async function inspectPage(page, name, viewport) {
  console.log(`\n=== ${name} @ ${viewport} ===`);

  // 1. Check for horizontal overflow
  const overflowX = await page.evaluate(() => {
    const body = document.body;
    const html = document.documentElement;
    return {
      bodyScrollWidth: body.scrollWidth,
      bodyClientWidth: body.clientWidth,
      htmlScrollWidth: html.scrollWidth,
      htmlClientWidth: html.clientWidth,
      hasHorizontalOverflow: body.scrollWidth > body.clientWidth + 2,
      overflowAmount: body.scrollWidth - body.clientWidth,
    };
  });
  console.log(`  Overflow: bodyScroll=${overflowX.bodyScrollWidth} clientWidth=${overflowX.bodyClientWidth} overflow=${overflowX.hasHorizontalOverflow ? 'YES +' + overflowX.overflowAmount + 'px' : 'OK'}`);
  if (overflowX.hasHorizontalOverflow) {
    addIssue('HIGH', name, viewport, '横向溢出', `body scrollWidth(${overflowX.bodyScrollWidth}) > clientWidth(${overflowX.bodyClientWidth}), 溢出 ${overflowX.overflowAmount}px`);
  }

  // 2. Check key buttons — size and visibility
  const buttons = await page.evaluate(() => {
    const btns = document.querySelectorAll('button, [role="button"], .btn, [class*="btn"]');
    return Array.from(btns).map(b => {
      const rect = b.getBoundingClientRect();
      const style = window.getComputedStyle(b);
      return {
        text: b.textContent.trim().slice(0, 30),
        id: b.id || '',
        class: b.className.slice(0, 50),
        visible: style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        fontSize: style.fontSize,
        clickable: rect.width >= 44 && rect.height >= 44,
      };
    }).filter(b => b.visible);
  });
  console.log(`  Buttons found: ${buttons.length}`);
  buttons.forEach(b => {
    const flag = b.clickable ? '✓' : '⚠ SMALL';
    console.log(`    ${flag} #${b.id || '(no-id)'} "${b.text}" ${b.width}×${b.height} font:${b.fontSize}`);
    if (!b.clickable && (b.width < 44 || b.height < 44)) {
      addIssue('MEDIUM', name, viewport, `按钮点击区域不足 (${b.width}×${b.height}px)`, `"${b.text}" 小于 44px 最小触摸目标`);
    }
  });

  // 3. Check hero portrait image
  const portrait = await page.evaluate(() => {
    const imgs = document.querySelectorAll('.hero-portrait-img, #result-hero img, [class*="portrait"] img');
    return Array.from(imgs).map(img => {
      const rect = img.getBoundingClientRect();
      const style = window.getComputedStyle(img);
      return {
        src: img.src.slice(-40),
        visible: style.display !== 'none' && rect.width > 0,
        naturalW: img.naturalWidth,
        naturalH: img.naturalHeight,
        renderedW: Math.round(rect.width),
        renderedH: Math.round(rect.height),
        objectFit: style.objectFit,
        aspectRatio: style.aspectRatio,
      };
    });
  });
  console.log(`  Portrait images: ${portrait.length}`);
  portrait.forEach(p => {
    console.log(`    ${p.visible ? '✓' : '✗'} ${p.src} natural=${p.naturalW}×${p.naturalH} rendered=${p.renderedW}×${p.renderedH} fit=${p.objectFit} ratio=${p.aspectRatio}`);
    if (p.visible && (p.renderedW === 0 || p.renderedH === 0)) {
      addIssue('HIGH', name, viewport, '拟人图渲染尺寸为0', p.src);
    }
    if (p.visible && p.objectFit === 'fill') {
      addIssue('MEDIUM', name, viewport, '拟人图 object-fit:fill 可能导致拉伸', p.src);
    }
  });

  // 4. Check scene stage image
  const sceneImg = await page.evaluate(() => {
    const imgs = document.querySelectorAll('.scene-stage-image, #scene-stage img, [class*="scene"] img');
    return Array.from(imgs).map(img => {
      const rect = img.getBoundingClientRect();
      const style = window.getComputedStyle(img);
      return {
        src: img.src.slice(-40),
        visible: rect.width > 0 && rect.height > 0,
        renderedW: Math.round(rect.width),
        renderedH: Math.round(rect.height),
        objectFit: style.objectFit,
      };
    });
  });
  console.log(`  Scene images: ${sceneImg.length}`);
  sceneImg.forEach(s => {
    console.log(`    ${s.visible ? '✓' : '✗'} ${s.src} ${s.renderedW}×${s.renderedH} fit=${s.objectFit}`);
  });

  // 5. Check result card width
  const resultCard = await page.evaluate(() => {
    const card = document.querySelector('#result-card');
    if (!card) return null;
    const rect = card.getBoundingClientRect();
    const style = window.getComputedStyle(card);
    return {
      width: Math.round(rect.width),
      maxWidth: style.maxWidth,
      overflow: style.overflow,
    };
  });
  if (resultCard) {
    console.log(`  Result card: ${resultCard.width}px max-width:${resultCard.maxWidth}`);
    if (resultCard.width > 920) {
      addIssue('LOW', name, viewport, '结果卡宽度超过920px', `当前 ${resultCard.width}px`);
    }
  }

  // 6. Check for any element with negative margin causing overflow
  const negativeMargins = await page.evaluate(() => {
    const all = document.querySelectorAll('*');
    const issues = [];
    all.forEach(el => {
      const style = window.getComputedStyle(el);
      const ml = parseFloat(style.marginLeft);
      const mr = parseFloat(style.marginRight);
      if (ml < -10 || mr < -10) {
        issues.push({ tag: el.tagName, class: el.className.slice(0, 40), ml, mr });
      }
    });
    return issues.slice(0, 5);
  });
  if (negativeMargins.length > 0) {
    console.log(`  ⚠ Negative margins: ${JSON.stringify(negativeMargins)}`);
  }

  // 7. Font size check for readability
  const fontSizes = await page.evaluate(() => {
    const texts = document.querySelectorAll('p, h1, h2, h3, h4, span, div');
    const small = [];
    texts.forEach(el => {
      const style = window.getComputedStyle(el);
      const fs = parseFloat(style.fontSize);
      const text = el.textContent.trim().slice(0, 40);
      if (fs > 0 && fs < 11 && text.length > 5) {
        small.push({ text, fs, tag: el.tagName });
      }
    });
    return small.slice(0, 10);
  });
  if (fontSizes.length > 0) {
    console.log(`  ⚠ Small fonts (<11px):`);
    fontSizes.forEach(f => console.log(`      ${f.fs}px ${f.tag} "${f.text}"`));
    fontSizes.forEach(f => {
      addIssue('LOW', name, viewport, `字体过小 (${f.fs}px)`, `"${f.text}" 在移动端可能难以阅读`);
    });
  }

  // 8. Check console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
}

async function run() {
  console.log('Heart Island UI Structure Inspection\n');

  const browser = await chromium.launch({ headless: true });

  try {
    // Desktop 1440
    const ctxD = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageD = await ctxD.newPage();

    // Collect console errors
    const errorsD = [];
    pageD.on('pageerror', err => errorsD.push(err.message));

    await pageD.goto(BASE, { waitUntil: 'networkidle' });
    await pageD.waitForTimeout(800);
    await inspectPage(pageD, 'Home', '1440px');

    // Quiz
    const startBtn = pageD.locator('#intro-start-btn');
    if (await startBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await startBtn.click();
      await pageD.waitForTimeout(600);
    }
    await inspectPage(pageD, 'Quiz', '1440px');

    // Answer all questions for result
    for (let q = 0; q < 36; q++) {
      await pageD.waitForTimeout(200);
      const opts = pageD.locator('.option-btn, button[class*="option"]');
      const cnt = await opts.count();
      if (cnt > 0) await opts.first().click();
    }
    await pageD.waitForTimeout(1500);
    const skipBtnD = pageD.locator('#ending-skip-btn');
    if (await skipBtnD.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipBtnD.click({ force: true });
    }
    await pageD.waitForTimeout(2500);
    await inspectPage(pageD, 'Result', '1440px');

    console.log(`\n  Console errors (desktop): ${errorsD.length}`);
    errorsD.forEach(e => {
      console.log(`    ❌ ${e}`);
      addIssue('HIGH', 'Global', '1440px', 'JS 控制台错误', e);
    });

    await ctxD.close();

    // Mobile 390
    const ctxM = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const pageM = await ctxM.newPage();

    const errorsM = [];
    pageM.on('pageerror', err => errorsM.push(err.message));

    await pageM.goto(BASE, { waitUntil: 'networkidle' });
    await pageM.waitForTimeout(800);
    await inspectPage(pageM, 'Home', '390px');

    const startBtnM = pageM.locator('#intro-start-btn');
    if (await startBtnM.isVisible({ timeout: 2000 }).catch(() => false)) {
      await startBtnM.click();
      await pageM.waitForTimeout(600);
    }
    await inspectPage(pageM, 'Quiz', '390px');

    for (let q = 0; q < 36; q++) {
      await pageM.waitForTimeout(200);
      const opts = pageM.locator('.option-btn, button[class*="option"]');
      const cnt = await opts.count();
      if (cnt > 0) await opts.first().click();
    }
    await pageM.waitForTimeout(1500);
    const skipBtnM = pageM.locator('#ending-skip-btn');
    if (await skipBtnM.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipBtnM.click({ force: true });
    }
    await pageM.waitForTimeout(2500);
    await inspectPage(pageM, 'Result', '390px');

    console.log(`\n  Console errors (mobile): ${errorsM.length}`);
    errorsM.forEach(e => {
      console.log(`    ❌ ${e}`);
      addIssue('HIGH', 'Global', '390px', 'JS 控制台错误', e);
    });

    await ctxM.close();

  } finally {
    await browser.close();
  }

  // Print issue summary
  console.log('\n');
  console.log('='.repeat(60));
  console.log('ISSUE SUMMARY');
  console.log('='.repeat(60));
  const bySeverity = { HIGH: [], MEDIUM: [], LOW: [] };
  ISSUES.forEach(i => bySeverity[i.severity].push(i));
  for (const sev of ['HIGH', 'MEDIUM', 'LOW']) {
    console.log(`\n[${sev}] ${bySeverity[sev].length} issues:`);
    bySeverity[sev].forEach(i => {
      console.log(`  ${i.page}/${i.viewport}: ${i.title}`);
      console.log(`    → ${i.detail}`);
    });
  }

  // Write report JSON
  const fs = await import('fs');
  fs.writeFileSync('reports/ui-inspection-raw.json', JSON.stringify(ISSUES, null, 2));
  console.log('\n✓ Raw data written to reports/ui-inspection-raw.json');
}

run().catch(err => {
  console.error('Inspection failed:', err.message);
  process.exit(1);
});
