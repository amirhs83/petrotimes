import { chromium } from 'playwright-core';

/**
 * HEADER + MARKET TICKER pixel verification at the 359px reference viewport.
 * Measures the real rendered geometry against the client reference
 * measurements (photo_2026-11-14_16-32-19.jpg, ink bboxes measured with PIL):
 *
 *   hamburger ink  x 13–26   y 15–26      logo ink x 43–143  y 13–27
 *   subscribe      x 241–312 y 9–33       search ink x 326–340 y 14–27
 *   ticker bar     y 42–~102 (white)      market icon x≈9–20
 *   cards          y 49–85/86  w 101–107  gap 5–8
 *   featured image top y≈102/103, x 9–348
 */
const exe = process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: exe, headless: true });
const ctx = await browser.newContext({ viewport: { width: 359, height: 800 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
await page.waitForTimeout(1200);

const m = await page.evaluate(() => {
  const box = (el) => {
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: +(b.x + scrollX).toFixed(1), y: +(b.y + scrollY).toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) };
  };
  const cards = [...document.querySelectorAll('.pt-ticker-card')].slice(0, 4).map(box);
  const headRow = document.querySelector('.pt-mobile-head-row');
  return {
    header: box(document.querySelector('.pt-mobile-head')),
    headRow: box(headRow),
    hamburger: box(document.querySelector('.pt-mobile-toggle .pt-hamburger')),
    logo: box(document.querySelector('.pt-mobile-logo img')),
    subscribe: box(document.querySelector('.pt-mobile-head .pt-head-subscribe')),
    search: box(document.querySelector('.pt-mobile-search')),
    tickerBar: box(document.querySelector('.pt-ticker-bar')),
    tickerMenu: box(document.querySelector('.pt-ticker-menu')),
    cards,
    card3: box(document.querySelectorAll('.pt-ticker-card')[2]),
    featuredImg: box(document.querySelector('.pt-featured-media img')),
    tickerNames: [...document.querySelectorAll('.pt-ticker-name')].slice(0, 5).map((n) => n.textContent),
    naShown: !!document.querySelector('[data-testid="ticker-na"]'),
    docOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    headerDir: headRow ? getComputedStyle(headRow).direction : null,
  };
});
console.log(JSON.stringify(m, null, 1));

// top-region screenshot for pixel comparison with the reference
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: 'visual-tests/actual/header-ticker-359.png', clip: { x: 0, y: 0, width: 359, height: 474 } });

// ticker horizontal scroll check (more products exist than 3 visible)
const scroll = await page.evaluate(() => {
  const c = document.querySelector('.pt-ticker-cards');
  return { scrollWidth: c.scrollWidth, clientWidth: c.clientWidth, scrollable: c.scrollWidth > c.clientWidth };
});
console.log('ticker scroll:', JSON.stringify(scroll));
console.log('total ticker cards:', await page.locator('.pt-ticker-card').count());

await browser.close();
