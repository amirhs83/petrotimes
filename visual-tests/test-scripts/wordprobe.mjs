import { chromium } from 'playwright-core';
const exe = process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: exe, headless: true });
async function probe(url, label) {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(()=>{});
  await page.waitForTimeout(2000);
  const res = await page.evaluate(() => {
    const a = Array.from(document.querySelectorAll('a')).find(a => a.textContent.includes('پالایش'));
    const cs = getComputedStyle(a);
    // measure each word via Range on a temporarily-spanned clone (no flex pollution)
    const words = ['پالایش', 'و', 'پخش'];
    const out = { aW: Math.round(a.getBoundingClientRect().width*100)/100, fs: cs.fontSize };
    const m = (txt) => {
      const s = document.createElement('span');
      s.style.cssText = 'white-space:pre;font:inherit;position:absolute;visibility:hidden';
      s.textContent = txt;
      a.appendChild(s);
      const w = s.getBoundingClientRect().width;
      s.remove();
      return Math.round(w*100)/100;
    };
    out.words = words.map(m);
    out.full = m('پالایش و پخش');
    return out;
  });
  await ctx.close();
  console.log(label, JSON.stringify(res));
}
await probe('https://petrotimes.ir/', 'LIVE:');
await probe('http://localhost:3000', 'MINE:');
await browser.close();
