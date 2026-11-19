import { chromium } from 'playwright-core';

/**
 * FEATURED NEWS responsive verification — 12 mandatory viewports.
 * Measures the featured block geometry + checks horizontal overflow + saves
 * element screenshots. Real production data (no fixture).
 */
const exe = process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const viewports = [320, 359, 375, 390, 414, 430, 768, 820, 1024, 1280, 1440, 1920];
const browser = await chromium.launch({ executablePath: exe, headless: true });

for (const w of viewports) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(700);
  const m = await page.evaluate(() => {
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: Math.round(b.x), y: Math.round(b.y + scrollY), w: Math.round(b.width), h: Math.round(b.height) };
    };
    const img = document.querySelector('.pt-featured-media img');
    const meta = document.querySelector('.pt-featured-meta');
    const grid = document.querySelector('.pt-featured-grid');
    const twoCol = grid ? getComputedStyle(grid).display === 'grid' : false;
    return {
      featured: r(document.querySelector('.pt-featured')),
      img: r(img),
      imgRatio: img ? +(img.getBoundingClientRect().width / img.getBoundingClientRect().height).toFixed(3) : null,
      meta: r(meta),
      metaDir: meta ? getComputedStyle(meta).direction : null,
      metaText: meta ? meta.textContent : null,
      twoCol,
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      overflowPx: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
  console.log(w, JSON.stringify(m));
  const feat = page.locator('.pt-featured');
  await feat.screenshot({ path: `visual-tests/actual/featured-${w}.png` }).catch(() => {});
  await ctx.close();
}
await browser.close();
console.log('done');
