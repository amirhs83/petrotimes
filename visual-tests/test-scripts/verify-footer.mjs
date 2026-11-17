import { chromium } from 'playwright-core';
const exe = process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: exe, headless: true });

const widths = [1920, 1366, 1024, 768, 390, 360];
for (const w of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 1080 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(800);
  const m = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.pt-advertise-card')];
    const last = cards[cards.length - 1];
    const footer = document.querySelector('.pt-footer');
    const inner = document.querySelector('.pt-advertise-inner');
    const main = document.querySelector('.main-wrap');
    if (!last || !footer) return { err: 'missing nodes', cards: cards.length };
    const c = last.getBoundingClientRect();
    const f = footer.getBoundingClientRect();
    // scroll to bottom to trigger content-visibility rendering
    window.scrollTo(0, document.body.scrollHeight);
    return {
      lastCardBottom: Math.round(c.bottom + window.scrollY),
      footerTop: Math.round(f.top + window.scrollY),
      gap: Math.round(f.top - c.bottom),
      innerBottom: inner ? Math.round(inner.getBoundingClientRect().bottom + window.scrollY) : null,
      docHeight: document.body.scrollHeight,
    };
  });
  // after scroll, re-measure footer position (content-visibility)
  const m2 = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.pt-advertise-card')];
    const last = cards[cards.length - 1];
    const footer = document.querySelector('.pt-footer');
    if (!last || !footer) return { err: 'missing nodes' };
    const c = last.getBoundingClientRect();
    const f = footer.getBoundingClientRect();
    const overlap = f.top < c.bottom;
    return {
      lastCardBottom: Math.round(c.bottom + window.scrollY),
      footerTop: Math.round(f.top + window.scrollY),
      gapPx: Math.round(f.top - c.bottom),
      OVERLAP: overlap,
    };
  });
  console.log(w, JSON.stringify(m), 'afterScroll:', JSON.stringify(m2));
  await page.screenshot({ path: `visual-tests/actual/final-check-${w}.png`, fullPage: true });
  await ctx.close();
}
await browser.close();
console.log('done');
