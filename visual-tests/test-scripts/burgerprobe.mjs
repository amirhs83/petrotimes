import { chromium } from 'playwright-core';
const exe = process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: exe, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await ctx.newPage();
await page.goto('https://petrotimes.ir/', { waitUntil: 'networkidle', timeout: 60000 }).catch(()=>{});
await page.waitForTimeout(2000);
// find which stylesheet defines .hamburger-icon-a .inner
const res = await page.evaluate(() => {
  const hits = [];
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    const walk = (list) => {
      for (const r of list) {
        if (r.cssRules) { walk(r.cssRules); continue; }
        const t = r.cssText || '';
        if (t.includes('hamburger')) hits.push({ href: sheet.href || 'inline', text: t.slice(0, 400) });
      }
    };
    walk(rules);
  }
  return hits.slice(0, 12);
});
console.log(JSON.stringify(res, null, 1));
await browser.close();
