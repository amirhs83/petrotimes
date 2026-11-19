import { chromium } from 'playwright-core';

/**
 * Responsive + functional verification for the header/ticker work and the
 * desktop duo restore. 12 mandatory viewports + functional probes.
 */
const exe = process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const viewports = [320, 359, 375, 390, 414, 430, 768, 820, 1024, 1280, 1440, 1920];
const browser = await chromium.launch({ executablePath: exe, headless: true });

const out = [];
for (const w of viewports) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(900);
  const m = await page.evaluate(() => {
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: +b.x.toFixed(1), y: +(b.y + scrollY).toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) };
    };
    const visible = (el) => {
      if (!el) return false;
      const cs = getComputedStyle(el);
      return cs.display !== 'none' && cs.visibility !== 'hidden' && el.getBoundingClientRect().width > 0;
    };
    return {
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      header: r(document.querySelector('.pt-mobile-head')) || r(document.querySelector('.pt-smart-head')),
      subscribe: r(document.querySelector('.pt-head-subscribe')),
      tickerBar: r(document.querySelector('.pt-ticker-bar')),
      firstCard: r(document.querySelector('.pt-ticker-card')),
      cardCount: document.querySelectorAll('.pt-ticker-card').length,
      featuredVisible: visible(document.querySelector('.pt-featured')),
      duoVisible: visible(document.querySelector('.pt-duo-desktop')),
      featuredImg: r(document.querySelector('.pt-featured-media img')),
      heroPostTitle: r(document.querySelector('.pt-duo-desktop .pt-hero-post .pt-post-title')),
      duoSecondaryCount: document.querySelectorAll('.pt-duo-desktop .pt-duo-secondary .pt-small-post').length,
      footerTop: r(document.querySelector('.pt-footer')),
      tickerScrollable: (() => {
        const c = document.querySelector('.pt-ticker-cards');
        return c ? c.scrollWidth > c.clientWidth : null;
      })(),
    };
  });
  out.push({ w, ...m });
  if ([359, 1440].includes(w)) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `visual-tests/actual/full-${w}.png`, fullPage: true });
  }
  await ctx.close();
}

// functional probes at 390 (mobile header) and 1280 (desktop header)
async function probe(width) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(600);
  const res = { width };
  // menu opens
  const toggleSel = width <= 940 ? '.pt-mobile-toggle' : '.pt-offcanvas-toggle';
  await page.click(toggleSel);
  await page.waitForTimeout(600);
  res.offcanvasOpens = await page.evaluate(() => {
    const oc = document.querySelector('.pt-offcanvas');
    return oc?.classList.contains('is-open') && getComputedStyle(oc).visibility === 'visible';
  });
  res.menuItems = await page.locator('.pt-offcanvas .mobile-menu li a:visible').count();
  await page.click('.pt-offcanvas-close');
  await page.waitForTimeout(500);
  res.offcanvasCloses = await page.evaluate(() => !document.querySelector('.pt-offcanvas').classList.contains('is-open'));
  // search opens
  const searchSel = width <= 940 ? '.pt-mobile-search' : '.pt-search-icon';
  await page.click(searchSel);
  await page.waitForTimeout(500);
  res.searchOpens = await page.evaluate(() => {
    const s = document.querySelector('.pt-search-modal');
    return s?.classList.contains('is-open') && getComputedStyle(s).visibility === 'visible';
  });
  res.searchFocus = await page.evaluate(() => document.activeElement?.classList.contains('pt-search-field'));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  res.searchEscCloses = await page.evaluate(() => !document.querySelector('.pt-search-modal').classList.contains('is-open'));
  // subscribe anchor
  res.subscribeHref = await page.getAttribute('.pt-head-subscribe', 'href');
  res.newsletterTarget = await page.evaluate(() => !!document.querySelector('#pt-newsletter form'));
  // ticker data state
  await page.waitForTimeout(800);
  res.tickerState = await page.evaluate(() => ({
    na: document.querySelectorAll('[data-testid="ticker-na"]').length,
    names: [...document.querySelectorAll('.pt-ticker-name')].slice(0, 3).map((n) => n.textContent),
  }));
  // sticky
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(500);
  res.stickyWorks = await page.evaluate((w) => {
    const h = document.querySelector(w <= 940 ? '.pt-mobile-head' : '.pt-smart-head');
    return h?.classList.contains('is-sticky') && getComputedStyle(h).position === 'fixed';
  }, width);
  await ctx.close();
  return res;
}
const probes = [await probe(390), await probe(1280)];

console.log(JSON.stringify({ viewports: out, probes }, null, 1));
await browser.close();
