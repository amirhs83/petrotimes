/**
 * Petro Times — Screenshot Dataset + Interactive States Capture
 * Phase 10 & 12: responsive screenshots, per-section shots, interaction states
 *
 * Run: node /home/z/my-project/petrotimes-extraction/scripts/capture-screenshots.js
 * All operations are READ-ONLY against the target site (no form submissions).
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright');

const OUT = '/home/z/my-project/petrotimes-extraction';
const SITE = 'https://petrotimes.ir/';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const DESKTOP_W = [1920, 1440, 1366, 1280, 1024];
const TABLET_W = [834, 768];
const MOBILE_W = [430, 414, 390, 375, 360];

const log = (...a) => console.log('[shots]', ...a);

async function activatePage(page) {
  await page.evaluate(() => {
    ['mousemove', 'mousedown', 'mouseup', 'keydown', 'scroll', 'touchstart', 'wheel', 'pointermove'].forEach(t => {
      try { window.dispatchEvent(new Event(t)); document.dispatchEvent(new Event(t)); } catch (e) {}
    });
  });
  await page.mouse.move(700, 400);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(500);
  for (let i = 1; i <= 12; i++) {
    await page.evaluate((f) => window.scrollTo(0, document.documentElement.scrollHeight * f), i / 12);
    await page.waitForTimeout(220);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForFunction(() => {
    const els = Array.from(document.querySelectorAll('[data-bgsrc]'));
    return els.length > 0 && els.every(e => getComputedStyle(e).backgroundImage !== 'none');
  }, { timeout: 30000 }).catch(() => log('WARN: lazy backgrounds incomplete'));
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  await page.waitForTimeout(1000);
}

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'] });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, userAgent: UA, locale: 'fa-IR' });
  const page = await context.newPage();

  const shotState = {};
  log('navigating');
  await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await activatePage(page);

  /* ---------- Full-page screenshots, all widths ---------- */
  for (const w of [...DESKTOP_W, ...TABLET_W, ...MOBILE_W]) {
    const folder = w >= 1024 ? 'desktop' : w >= 768 ? 'tablet' : 'mobile';
    await page.setViewportSize({ width: w, height: 1080 });
    await page.waitForTimeout(800);
    // re-run lazyload scroll at new size
    for (let i = 1; i <= 6; i++) {
      await page.evaluate((f) => window.scrollTo(0, document.documentElement.scrollHeight * f), i / 6);
      await page.waitForTimeout(180);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT, `screenshots/${folder}/full-page-${w}.png`), fullPage: true });
    log('full-page', w);
  }

  /* ---------- Desktop component shots at 1920 ---------- */
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(800);
  await activatePage(page);

  const COMPONENTS = [
    ['header', '#smart-head'],
    ['mobile-menu-offcanvas', '#off-canvas'],
    ['market-ticker', '[data-id="1c95847"]'],
    ['top-news-hero', '[data-id="cedc57a"]'],
    ['top-news-secondary-list', '.elementor-7322 .elementor-element-0cd2772 .elementor-widget-wrap'],
    ['tv-section', '[data-id="53fa308"]'],
    ['tv-playlist', '[data-id="c258178"]'],
    ['topnews-sidebar-label', '[data-id="a11540e"]'],
    ['topnews-sidebar-items', '.elementor-7322 .elementor-element-98a6ee8 .elementor-widget-wrap'],
    ['magazine', '[data-id="c074dc7"]'],
    ['feature-title', '.elementor-7322 .elementor-element-98a6ee8 .elementor-widget-wrap'],
    ['social-widget', '[data-id="2a4da1e"]'],
    ['newsletter', '[data-id="9609692"]'],
    ['energy-section', '[data-id="2517f37"]'],
    ['energy-list', '.elementor-7322 .elementor-element-0e6f215 .elementor-widget-wrap'],
    ['energy-grid', '.elementor-7322 .elementor-element-0e6f215 .elementor-widget-wrap'],
    ['advertise-row', '[data-id="41768b4"]'],
    ['footer', '.elementor-7373'],
    ['copyright', '[data-id="226a5f9"]'],
    ['search-modal', '.search-modal-wrap']
  ];
  for (const [name, sel] of COMPONENTS) {
    try {
      const el = await page.$(sel);
      if (!el) { log('missing component', name, sel); continue; }
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await el.screenshot({ path: path.join(OUT, `screenshots/components/${name}.png`) });
      log('component shot', name);
    } catch (e) { log('WARN component', name, String(e).slice(0, 100)); }
  }

  /* ---------- Interactive states ---------- */
  // 1. sticky header after scroll
  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, 'screenshots/interactions/desktop-sticky-header-scrolled.png'), clip: { x: 0, y: 0, width: 1920, height: 130 } });
  shotState.stickyHeader = await page.evaluate(() => {
    const row = document.querySelector('#smart-head .smart-head-row');
    const cs = getComputedStyle(row);
    return { cls: row.className, position: cs.position, top: cs.top, transform: cs.transform, height: row.getBoundingClientRect().height, scrollY: window.scrollY };
  });

  // 2. back-to-top button
  shotState.backTop = await page.evaluate(() => {
    const b = document.querySelector('.back-top, .backtop, #back-top, a[href="#top"]');
    if (!b) return null;
    const cs = getComputedStyle(b);
    return { cls: b.className, display: cs.display, opacity: cs.opacity, position: cs.position, bottom: cs.bottom, right: cs.right, left: cs.left };
  });
  const bt = await page.$('.back-top, .backtop, #back-top');
  if (bt) {
    await bt.screenshot({ path: path.join(OUT, 'screenshots/interactions/back-to-top-button.png') }).catch(() => {});
  }

  // 3. search modal open
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
  const searchIcon = await page.$('#smart-head .search-icon');
  if (searchIcon) {
    await searchIcon.click();
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(OUT, 'screenshots/interactions/desktop-search-open.png') });
    shotState.searchOpen = await page.evaluate(() => {
      const w = document.querySelector('.search-modal-wrap');
      const f = document.querySelector('.search-field');
      const active = document.activeElement;
      return w ? {
        wrapCls: w.className, display: getComputedStyle(w).display, opacity: getComputedStyle(w).opacity,
        zIndex: getComputedStyle(w).zIndex,
        focusedElement: active ? active.tagName + '.' + (active.className || '') : null,
        inputPlaceholder: f ? f.placeholder : null, inputValue: f ? f.value : null
      } : null;
    });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    shotState.searchClosedByEscape = await page.evaluate(() => {
      const w = document.querySelector('.search-modal-wrap');
      return w ? { display: getComputedStyle(w).display, opacity: getComputedStyle(w).opacity } : null;
    });
    log('search interaction captured');
  }

  // 4. hover on news card
  const heroTitle = await page.$('[data-id="cedc57a"] .post-title a');
  if (heroTitle) {
    const before = await heroTitle.evaluate(el => getComputedStyle(el).color);
    await heroTitle.hover();
    await page.waitForTimeout(400);
    const after = await heroTitle.evaluate(el => getComputedStyle(el).color);
    shotState.heroTitleHover = { before, after, changed: before !== after };
    log('hero hover color:', before, '->', after);
  }

  // 5. TV video click behavior (record only — reload after)
  const playBtn = await page.$('[data-id="53fa308"] .tsi-play, [data-id="53fa308"] .play-icon, [data-id="53fa308"] a[href*="watch"], [data-id="53fa308"] .overlay-media a');
  if (playBtn) {
    await playBtn.click().catch(e => log('play click fail', String(e).slice(0, 80)));
    await page.waitForTimeout(1800);
    await page.screenshot({ path: path.join(OUT, 'screenshots/interactions/tv-play-clicked.png') });
    shotState.tvPlayClicked = await page.evaluate(() => ({
      url: location.href,
      modals: Array.from(document.querySelectorAll('.lightbox, .modal, .mfp-wrap, [class*="overlay-open"]')).filter(m => getComputedStyle(m).display !== 'none').map(m => m.className.slice(0, 80)),
      videos: document.querySelectorAll('video, iframe[src*="aparat"], iframe[src*="youtube"], iframe[src*="vimeo"]').length
    }));
    log('tv click result', JSON.stringify(shotState.tvPlayClicked).slice(0, 200));
    await page.goto(SITE, { waitUntil: 'domcontentloaded' });
    await activatePage(page);
  }

  /* ---------- Mobile interactions at 390 ---------- */
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(900);
  await activatePage(page);
  await page.screenshot({ path: path.join(OUT, 'screenshots/interactions/mobile-390-initial.png') });
  shotState.mobileHeader = await page.evaluate(() => {
    const h = document.querySelector('#smart-head-mobile');
    const row = document.querySelector('#smart-head-mobile .smart-head-row');
    return h ? { visible: h.getBoundingClientRect().height > 0, h: h.getBoundingClientRect().height, rowCls: row ? row.className : null } : null;
  });

  // off-canvas open (pick the VISIBLE toggle — desktop one is hidden at mobile widths)
  const burger = await page.evaluateHandle(() => {
    const cands = document.querySelectorAll('#smart-head-mobile .offcanvas-toggle, #smart-head .offcanvas-toggle');
    for (const c of cands) { const cs = getComputedStyle(c); if (cs.display !== 'none' && cs.visibility !== 'hidden' && c.getBoundingClientRect().width > 0) return c; }
    return cands[0] || null;
  });
  if (burger && (await burger.evaluate(el => !!el))) {
    await burger.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT, 'screenshots/interactions/mobile-offcanvas-open.png') });
    shotState.offCanvasOpen = await page.evaluate(() => {
      const oc = document.querySelector('#off-canvas');
      const bd = document.querySelector('.off-canvas-backdrop');
      const menu = oc.querySelector('ul');
      return {
        ocCls: oc.className, transform: getComputedStyle(oc).transform, left: getComputedStyle(oc).left,
        backdropCls: bd ? bd.className : null, backdropOpacity: bd ? getComputedStyle(bd).opacity : null,
        menuItems: menu ? Array.from(menu.querySelectorAll('li > a')).map(a => a.textContent.trim()) : [],
        widgets: Array.from(oc.querySelectorAll('.widget-title, h3')).map(w => w.textContent.trim()).slice(0, 8)
      };
    });
    log('offcanvas items:', shotState.offCanvasOpen.menuItems.join(', '));
    const bd = await page.$('.off-canvas-backdrop');
    if (bd) await bd.click();
    await page.waitForTimeout(700);
  }

  // mobile sticky header on scroll
  await page.evaluate(() => window.scrollTo(0, 700));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT, 'screenshots/interactions/mobile-sticky-header-scrolled.png'), clip: { x: 0, y: 0, width: 390, height: 120 } });
  shotState.mobileSticky = await page.evaluate(() => {
    const h = document.querySelector('#smart-head-mobile');
    return h ? { h: h.getBoundingClientRect().height, y: h.getBoundingClientRect().y, cls: h.className.slice(0, 100), pos: getComputedStyle(h).position } : null;
  });

  fs.writeFileSync(path.join(OUT, 'data/interaction-states.json'), JSON.stringify(shotState, null, 2));
  log('interaction states saved');

  /* ---------- Market iframe (separate document) ---------- */
  const mpage = await context.newPage();
  try {
    await mpage.goto('https://market.petrotimes.ir/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await mpage.waitForTimeout(3500);
    await mpage.setViewportSize({ width: 1920, height: 60 });
    await mpage.waitForTimeout(1200);
    await mpage.screenshot({ path: path.join(OUT, 'screenshots/components/market-iframe-internal.png') });
    const mdata = await mpage.evaluate(() => ({
      title: document.title,
      html: document.documentElement.outerHTML.slice(0, 60000),
      bodyClasses: document.body.className,
      items: Array.from(document.querySelectorAll('body *')).slice(0, 400).map(el => ({ tag: el.tagName, cls: (el.className || '').toString().slice(0, 60), text: (el.textContent || '').trim().slice(0, 40) })).filter(x => x.text),
      scripts: Array.from(document.scripts).map(s => s.src || ('inline:' + (s.textContent || '').slice(0, 300))),
      styles: Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map(s => s.href || ('inline:' + (s.textContent || '').slice(0, 200)))
    }));
    fs.writeFileSync(path.join(OUT, 'source/market-iframe-dom.html'), mdata.html);
    fs.writeFileSync(path.join(OUT, 'data/market-iframe.json'), JSON.stringify({ ...mdata, html: undefined }, null, 2));
    log('market iframe captured');
  } catch (e) { log('WARN market iframe', String(e).slice(0, 120)); }
  await mpage.close();

  await browser.close();
  log('SCREENSHOT CAPTURE COMPLETE');
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
