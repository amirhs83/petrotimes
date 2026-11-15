/** Market ticker iframe (market.petrotimes.ir) standalone extraction */
const fs = require('fs');
const path = require('path');
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright');
const OUT = '/home/z/my-project/petrotimes-extraction';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const log = (...a) => console.log('[market]', ...a);

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1920, height: 120 }, userAgent: UA });
  const page = await context.newPage();
  log('opening market.petrotimes.ir');
  await page.goto('https://market.petrotimes.ir/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('networkidle', { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(4000);

  await page.screenshot({ path: path.join(OUT, 'screenshots/components/market-iframe-internal.png') });
  const dom = await page.evaluate(() => document.documentElement.outerHTML);
  fs.writeFileSync(path.join(OUT, 'source/market-iframe-dom.html'), dom);

  const data = await page.evaluate(() => {
    const measure = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { tag: el.tagName, id: el.id || undefined, cls: (el.className || '').toString().slice(0, 80), rect: { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }, text: (el.textContent || '').trim().slice(0, 60), styles: { color: cs.color, backgroundColor: cs.backgroundColor, fontSize: cs.fontSize, fontWeight: cs.fontWeight, fontFamily: cs.fontFamily.slice(0, 80), display: cs.display, animation: cs.animation, animationDuration: cs.animationDuration, whiteSpace: cs.whiteSpace } }; };
    return {
      title: document.title,
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
      bodyClasses: document.body.className,
      docSize: { w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight },
      scripts: Array.from(document.scripts).map(s => s.src || ('inline:' + (s.textContent || '').slice(0, 500))),
      stylesheets: Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => l.href),
      inlineStyles: Array.from(document.querySelectorAll('style')).map(s => (s.textContent || '').slice(0, 3000)),
      visibleStructure: Array.from(document.querySelectorAll('body *')).slice(0, 300).map(measure)
    };
  });
  fs.writeFileSync(path.join(OUT, 'data/market-iframe.json'), JSON.stringify(data, null, 2));
  log('market iframe captured. items:', data.visibleStructure.length);
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
