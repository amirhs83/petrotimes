import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync } from 'fs';

/**
 * FEATURED NEWS pixel test — 359px reference viewport, isolated fixture.
 * Injects the reference's own content (chart crop + reference texts) into the
 * real component DOM (test-only; production keeps real data), screenshots the
 * element, and band-compares against the reference image metrics.
 */
const exe = process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: exe, headless: true });
const ctx = await browser.newContext({ viewport: { width: 359, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
await page.waitForTimeout(900);

const chartB64 = readFileSync('/tmp/ref-chart.png').toString('base64');
await page.evaluate((uri) => {
  const feat = document.querySelector('.pt-featured');
  const img = feat.querySelector('.pt-featured-media img');
  img.src = uri;
  const body = feat.querySelector('.pt-featured-body');
  if (!body.querySelector('.pt-featured-eyebrow')) {
    const eb = document.createElement('p');
    eb.className = 'pt-featured-eyebrow';
    body.prepend(eb);
  }
  body.querySelector('.pt-featured-eyebrow').textContent = 'سخنگوی وزارت اقتصاد چین اعلام کرد';
  body.querySelector('.pt-featured-title a').textContent =
    'چین از بزرگترین خریدار PP جهان به رقیب صادراتی تبدیل می‌شود';
  body.querySelector('.pt-featured-lead').textContent =
    'خالص واردات پلی‌پروپیلن چین در سال گذشته به حدود ۳۰۰ هزار تن سقوط کرد؛ رقمی که نشان‌دهنده کاهش چشمگیر تقاضای وارداتی این کشور در بازار جهانی PP است.';
  const items = body.querySelectorAll('.pt-featured-meta-item');
  items[0].textContent = 'INTERNATIONAL';
  items[1].textContent = 'NOV 6, 2026';
  items[2].textContent = '10:28 AM';
}, `data:image/png;base64,${chartB64}`);

await page.waitForTimeout(700);
const feat = page.locator('.pt-featured');
const box = await feat.boundingBox();
const geo = await page.evaluate(() => {
  const r = (sel) => {
    const el = document.querySelector(sel);
    const b = el.getBoundingClientRect();
    return { x: +(b.x.toFixed(1)), y: +( (b.y + scrollY).toFixed(1) ), w: +b.width.toFixed(1), h: +b.height.toFixed(1) };
  };
  return {
    img: r('.pt-featured-media img'),
    eyebrow: r('.pt-featured-eyebrow'),
    title: r('.pt-featured-title'),
    lead: r('.pt-featured-lead'),
    meta: r('.pt-featured-meta'),
    overflow: document.documentElement.scrollWidth > window.innerWidth,
  };
});
console.log('DOM:', JSON.stringify(geo));
await feat.screenshot({ path: 'visual-tests/actual/featured-fixture-359.png' });
await ctx.close();
await browser.close();
writeFileSync('/tmp/featured-fixture-geo.json', JSON.stringify(geo));
console.log('saved visual-tests/actual/featured-fixture-359.png');
