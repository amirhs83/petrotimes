import { chromium } from 'playwright-core';
const exe = process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: exe, headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.goto('https://petrotimes.ir/', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
await page.waitForTimeout(2500);
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(1200);
const m = await page.evaluate(() => {
  // live: advertise section = last .smartmag-section / block before footer
  const footer = document.querySelector('footer#footer, .site-footer, footer');
  const cards = [...document.querySelectorAll('.pt-advertise-card, .post')];
  const mainWrap = document.querySelector('.main-wrap, #main, main');
  let lastPost = null;
  // find the last post card visually above the footer in main content
  const all = [...document.querySelectorAll('article, .post')].filter((el) => {
    const r = el.getBoundingClientRect();
    return r.height > 0;
  });
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (!footer || r.bottom + window.scrollY < footer.getBoundingClientRect().top + window.scrollY + 5) {
      if (!lastPost || r.bottom > lastPost.getBoundingClientRect().bottom) lastPost = el;
    }
  }
  if (!lastPost || !footer) return { err: 'missing', posts: all.length };
  const lp = lastPost.getBoundingClientRect();
  const f = footer.getBoundingClientRect();
  const cls = lastPost.className.toString().slice(0, 80);
  const titleEl = lastPost.querySelector('.post-title, h2, h3');
  const t = titleEl ? titleEl.getBoundingClientRect() : null;
  return {
    lastPostClass: cls,
    lastPostBottom: Math.round(lp.bottom + window.scrollY),
    titleBottom: t ? Math.round(t.bottom + window.scrollY) : null,
    footerTop: Math.round(f.top + window.scrollY),
    gap: Math.round(f.top - lp.bottom),
    docH: document.body.scrollHeight,
  };
});
console.log(JSON.stringify(m, null, 1));
await page.screenshot({ path: 'visual-tests/actual/live-390-bottom.png', fullPage: false });
await browser.close();
