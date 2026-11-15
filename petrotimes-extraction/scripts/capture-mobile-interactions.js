/** Recovery: mobile-only interactions at 390px */
const fs = require('fs');
const path = require('path');
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright');
const OUT = '/home/z/my-project/petrotimes-extraction';
const SITE = 'https://petrotimes.ir/';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const log = (...a) => console.log('[mobile-shots]', ...a);

async function activatePage(page) {
  await page.evaluate(() => { ['mousemove', 'keydown', 'scroll', 'wheel', 'touchstart'].forEach(t => { try { window.dispatchEvent(new Event(t)); document.dispatchEvent(new Event(t)); } catch (e) {} }); });
  await page.mouse.move(200, 300); await page.mouse.wheel(0, 400); await page.waitForTimeout(400);
  for (let i = 1; i <= 10; i++) { await page.evaluate(f => window.scrollTo(0, document.documentElement.scrollHeight * f), i / 10); await page.waitForTimeout(200); }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForFunction(() => { const els = [...document.querySelectorAll('[data-bgsrc]')]; return els.length && els.every(e => getComputedStyle(e).backgroundImage !== 'none'); }, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(800);
}

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: UA, locale: 'fa-IR' });
  const page = await context.newPage();
  await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await activatePage(page);
  await page.screenshot({ path: path.join(OUT, 'screenshots/interactions/mobile-390-initial.png') });

  let shotState = {};
  try { shotState = JSON.parse(fs.readFileSync(path.join(OUT, 'data/interaction-states.json'), 'utf8') || '{}'); } catch (e) { shotState = {}; }
  shotState.mobileHeader = await page.evaluate(() => {
    const h = document.querySelector('#smart-head-mobile');
    const row = document.querySelector('#smart-head-mobile .smart-head-row');
    return h ? { visible: h.getBoundingClientRect().height > 0, h: h.getBoundingClientRect().height, rowCls: row ? row.className : null } : null;
  });
  log('mobileHeader', JSON.stringify(shotState.mobileHeader));

  const burger = await page.evaluateHandle(() => {
    const cands = document.querySelectorAll('#smart-head-mobile .offcanvas-toggle, #smart-head .offcanvas-toggle');
    for (const c of cands) { const cs = getComputedStyle(c); if (cs.display !== 'none' && cs.visibility !== 'hidden' && c.getBoundingClientRect().width > 0) return c; }
    return cands[0] || null;
  });
  if (await burger.evaluate(el => !!el)) {
    await burger.click();
    await page.waitForTimeout(1100);
    await page.screenshot({ path: path.join(OUT, 'screenshots/interactions/mobile-offcanvas-open.png') });
    shotState.offCanvasOpen = await page.evaluate(() => {
      const oc = document.querySelector('#off-canvas');
      const bd = document.querySelector('.off-canvas-backdrop');
      const menu = oc.querySelector('ul');
      return {
        ocCls: oc.className, transform: getComputedStyle(oc).transform, left: getComputedStyle(oc).left, right: getComputedStyle(oc).right,
        backdropCls: bd ? bd.className : null, backdropOpacity: bd ? getComputedStyle(bd).opacity : null,
        menuItems: menu ? Array.from(menu.querySelectorAll('li > a')).map(a => a.textContent.trim()) : [],
        widgets: Array.from(oc.querySelectorAll('.widget-title, h3, .block-head')).map(w => w.textContent.trim()).slice(0, 8)
      };
    });
    log('offcanvas items:', shotState.offCanvasOpen.menuItems.join(' | '));
    const bd = await page.$('.off-canvas-backdrop');
    if (bd) await bd.click().catch(() => {});
    await page.waitForTimeout(700);
  }

  await page.evaluate(() => window.scrollTo(0, 700));
  await page.waitForTimeout(1100);
  await page.screenshot({ path: path.join(OUT, 'screenshots/interactions/mobile-sticky-header-scrolled.png'), clip: { x: 0, y: 0, width: 390, height: 120 } });
  shotState.mobileSticky = await page.evaluate(() => {
    const h = document.querySelector('#smart-head-mobile');
    return h ? { h: h.getBoundingClientRect().height, y: h.getBoundingClientRect().y, cls: h.className.slice(0, 100), pos: getComputedStyle(h).position } : null;
  });
  log('mobileSticky', JSON.stringify(shotState.mobileSticky));

  fs.writeFileSync(path.join(OUT, 'data/interaction-states.json'), JSON.stringify(shotState, null, 2));
  await browser.close();
  log('DONE');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
