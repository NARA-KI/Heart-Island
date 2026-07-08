import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium, webkit } from 'playwright';

const root = process.cwd();
const port = Number(process.env.V2_IOS_HOME_PORT || 4334);
const baseUrl = `http://127.0.0.1:${port}/`;
const outDir = path.join(root, 'temp', 'rc2-ios-home-fix');

const wechatUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.49 NetType/WIFI Language/zh_CN';
const safariUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const summary = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  screenshotDir: path.relative(root, outDir).replaceAll('\\', '/'),
  staticAudit: runStaticAudit(),
  runs: [],
  screenshots: [],
  pass: false,
};

const screenshotPlan = new Map([
  ['webkit:wechat:375x667', '01-ios-wechat-375x667.png'],
  ['webkit:wechat:390x844', '02-ios-wechat-390x844.png'],
  ['webkit:wechat:430x932', '03-ios-wechat-430x932.png'],
  ['webkit:safari:375x667', '04-ios-safari-375x667.png'],
  ['webkit:safari:390x844', '05-ios-safari-390x844.png'],
  ['webkit:safari:430x932', '06-ios-safari-430x932.png'],
]);

const server = await serveApp();
try {
  await runBrowserSuite('chromium', chromium);
  await runBrowserSuite('webkit', webkit);
  await runDynamicViewport();
  await runDesktopBaseline();
  summary.pass = summary.staticAudit.pass && summary.runs.every((run) => run.pass);
} finally {
  server.close();
}

fs.writeFileSync(path.join(outDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
if (!summary.pass) process.exitCode = 1;

function runStaticAudit() {
  const homeCss = fs.readFileSync(path.join(root, 'styles', 'rc2-home.css'), 'utf8');
  const responsiveCss = fs.readFileSync(path.join(root, 'styles', 'rc2-responsive.css'), 'utf8');
  const combined = `${homeCss}\n${responsiveCss}`;
  const homeUsesDvh = /\[data-visual-theme="rc2"\]\s+\.v2-home\s*\{[^}]*100dvh/s.test(combined);
  const homeVisualLimitedToHalfViewport = /\[data-visual-theme="rc2"\]\s+\.v2-home__visual[^{]*\{[^}]*50dvh/s.test(responsiveCss);
  return {
    pass: !homeUsesDvh && !homeVisualLimitedToHalfViewport,
    homeUsesDvh,
    homeVisualLimitedToHalfViewport,
  };
}

async function runBrowserSuite(browserName, launcher) {
  const browser = await launcher.launch({ headless: true });
  try {
    for (const profile of [
      { name: 'wechat', userAgent: wechatUA },
      { name: 'safari', userAgent: safariUA },
    ]) {
      for (const viewport of [
        { name: '375x667', width: 375, height: 667 },
        { name: '390x844', width: 390, height: 844 },
        { name: '393x852', width: 393, height: 852 },
        { name: '430x932', width: 430, height: 932 },
      ]) {
        const screenshotName = screenshotPlan.get(`${browserName}:${profile.name}:${viewport.name}`) ?? null;
        summary.runs.push(await runHomeCase(browser, {
          browserName,
          profileName: profile.name,
          userAgent: profile.userAgent,
          viewport,
          screenshotName,
        }));
      }
    }
  } finally {
    await browser.close();
  }
}

async function runDynamicViewport() {
  const browser = await webkit.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    userAgent: safariUA,
  });
  const page = await instrumentPage(context);
  const run = { name: 'webkit:safari:dynamic-viewport', pass: false };
  try {
    await openHome(page);
    await page.setViewportSize({ width: 390, height: 724 });
    await page.waitForTimeout(120);
    const compact = await collectHomeMetrics(page);
    await shot(page, '07-ios-safari-dynamic-390x724.png');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(120);
    const expanded = await collectHomeMetrics(page);
    await shot(page, '08-ios-safari-dynamic-390x844.png');
    await page.evaluate(() => window.scrollTo(0, 80));
    await page.waitForTimeout(80);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(80);
    const afterScroll = await collectHomeMetrics(page);
    run.pass = [compact, expanded, afterScroll].every((metrics) => metrics.pass)
      && page.__errors.length === 0
      && page.__badResponses.length === 0;
    Object.assign(run, { compact, expanded, afterScroll, consoleErrors: page.__errors, badResponses: page.__badResponses });
  } finally {
    await context.close();
    await browser.close();
  }
  summary.runs.push(run);
}

async function runDesktopBaseline() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await instrumentPage(context);
  const run = { name: 'chromium:desktop:1440x900', pass: false };
  try {
    await openHome(page);
    const metrics = await collectHomeMetrics(page, { desktop: true });
    await shot(page, '09-home-desktop-1440x900.png');
    run.pass = metrics.pass && page.__errors.length === 0 && page.__badResponses.length === 0;
    Object.assign(run, { metrics, consoleErrors: page.__errors, badResponses: page.__badResponses });
  } finally {
    await context.close();
    await browser.close();
  }
  summary.runs.push(run);
}

async function runHomeCase(browser, { browserName, profileName, userAgent, viewport, screenshotName }) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    userAgent,
  });
  const page = await instrumentPage(context);
  const run = { name: `${browserName}:${profileName}:${viewport.name}`, pass: false };
  try {
    await openHome(page);
    const firstPaint = await collectHomeMetrics(page);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.v2-home [data-action="start"]');
    const afterRefresh = await collectHomeMetrics(page);
    if (screenshotName) await shot(page, screenshotName);
    run.pass = firstPaint.pass
      && afterRefresh.pass
      && page.__errors.length === 0
      && page.__badResponses.length === 0;
    Object.assign(run, { firstPaint, afterRefresh, consoleErrors: page.__errors, badResponses: page.__badResponses });
  } finally {
    await context.close();
  }
  return run;
}

async function openHome(page) {
  await page.goto(`${baseUrl}?debug=1&ios-home=${Date.now()}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.v2-home [data-action="start"]');
}

async function collectHomeMetrics(page, options = {}) {
  const metrics = await page.evaluate((options) => {
    const hero = document.querySelector('.v2-home');
    const visual = document.querySelector('.v2-home__visual');
    const image = document.querySelector('.v2-home__visual img');
    const content = document.querySelector('.v2-home__content');
    const cta = document.querySelector('.v2-home [data-action="start"]');
    const actions = document.querySelector('.v2-home .v2-actions');
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
    const rect = (node) => {
      const box = node.getBoundingClientRect();
      return {
        top: box.top,
        right: box.right,
        bottom: box.bottom,
        left: box.left,
        width: box.width,
        height: box.height,
      };
    };
    const heroRect = rect(hero);
    const visualRect = rect(visual);
    const imageRect = rect(image);
    const contentRect = rect(content);
    const ctaRect = rect(cta);
    const actionsRect = rect(actions);
    const heroStyle = window.getComputedStyle(hero);
    const visualStyle = window.getComputedStyle(visual);
    const imageStyle = window.getComputedStyle(image);
    const bottomTarget = document.elementFromPoint(Math.floor(viewportWidth / 2), Math.max(0, Math.floor(viewportHeight - 6)));
    const blankAfterActions = Math.max(0, Math.min(heroRect.bottom, viewportHeight) - actionsRect.bottom);
    const ctaBottomTolerance = options.desktop ? 80 : Math.max(34, viewportHeight * 0.08);
    const pass = Boolean(hero && visual && image && content && cta && actions)
      && heroRect.top <= 1
      && heroRect.bottom >= viewportHeight - 1
      && visualRect.top <= 1
      && visualRect.bottom >= viewportHeight - 1
      && imageRect.height >= viewportHeight - 1
      && ctaRect.top >= 0
      && ctaRect.top < viewportHeight
      && ctaRect.bottom <= viewportHeight + ctaBottomTolerance
      && blankAfterActions <= Math.max(96, viewportHeight * 0.18)
      && document.documentElement.scrollWidth <= Math.ceil(viewportWidth)
      && [...document.images].every((item) => item.complete && item.naturalWidth > 0)
      && heroStyle.overflow !== 'visible'
      && visualStyle.position === 'absolute'
      && visualStyle.inset !== 'auto'
      && imageStyle.objectFit === 'cover'
      && Boolean(bottomTarget?.closest('.v2-home'));
    return {
      pass,
      viewport: { width: viewportWidth, height: viewportHeight },
      heroRect,
      visualRect,
      imageRect,
      contentRect,
      ctaRect,
      actionsRect,
      blankAfterActions,
      ctaBottomTolerance,
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - viewportWidth),
      brokenImages: [...document.images].filter((item) => !item.complete || item.naturalWidth === 0).length,
      heroMinHeight: heroStyle.minHeight,
      heroOverflow: heroStyle.overflow,
      visualPosition: visualStyle.position,
      visualInset: visualStyle.inset,
      imageObjectFit: imageStyle.objectFit,
      bottomElement: bottomTarget?.className ?? bottomTarget?.tagName ?? null,
    };
  }, options);
  assert.equal(metrics.pass, true, JSON.stringify(metrics, null, 2));
  return metrics;
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
  await page.screenshot({ path: file, fullPage: false });
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
    if (url.pathname === '/favicon.ico') {
      response.writeHead(204);
      response.end();
      return;
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
