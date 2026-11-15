/**
 * Petro Times — Homepage Reverse Engineering Extraction Script
 * Phase 03-11: DOM, geometry, CSS, typography, colors, assets, responsive, snapshot
 *
 * Run: node /home/z/my-project/petrotimes-extraction/scripts/extract.js
 * Requires: playwright (global install) + Chromium
 *
 * All operations are READ-ONLY against the target site.
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright');

const OUT = '/home/z/my-project/petrotimes-extraction';
const SITE = 'https://petrotimes.ir/';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const WIDTHS = [1920, 1440, 1366, 1280, 1024, 834, 768, 430, 414, 390, 375, 360];

const CSS_PROPS = [
  'display', 'position', 'top', 'right', 'bottom', 'left', 'zIndex', 'float', 'clear',
  'boxSizing', 'width', 'minWidth', 'maxWidth', 'height', 'minHeight', 'maxHeight',
  'margin', 'padding', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
  'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius',
  'overflow', 'gap', 'rowGap', 'columnGap', 'flexDirection', 'flexWrap', 'justifyContent',
  'alignItems', 'alignContent', 'flexGrow', 'flexShrink', 'flexBasis', 'order',
  'gridTemplateColumns', 'gridTemplateRows', 'gridAutoFlow', 'gridColumn', 'gridRow',
  'aspectRatio', 'objectFit', 'objectPosition',
  'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing',
  'wordSpacing', 'textAlign', 'textJustifyContent', 'textTransform', 'textDecorationLine',
  'textOverflow', 'whiteSpace', 'direction', 'unicodeBidi', 'writingMode',
  'color', 'backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition',
  'backgroundRepeat', 'opacity', 'boxShadow', 'textShadow', 'transform', 'transition',
  'filter', 'mixBlendMode', 'visibility'
];

const log = (...a) => console.log('[extract]', ...a);
const save = (rel, data) => {
  const p = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, typeof data === 'string' ? data : JSON.stringify(data, null, 2));
  log('saved', rel);
};

/** Trigger WP Rocket "Delay JS Execution" + force lazy-load of all backgrounds */
async function activatePage(page) {
  await page.evaluate(() => {
    ['mousemove', 'mousedown', 'mouseup', 'keydown', 'scroll', 'touchstart', 'wheel', 'pointermove'].forEach(t => {
      try { window.dispatchEvent(new Event(t)); document.dispatchEvent(new Event(t)); } catch (e) {}
    });
  });
  await page.mouse.move(700, 400);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(600);
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    await page.evaluate((f) => window.scrollTo(0, document.documentElement.scrollHeight * f), i / steps);
    await page.waitForTimeout(250);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  // wait until every lazy background span received its background-image
  await page.waitForFunction(() => {
    const els = Array.from(document.querySelectorAll('[data-bgsrc]'));
    return els.length > 0 && els.every(e => getComputedStyle(e).backgroundImage !== 'none');
  }, { timeout: 30000 }).catch(() => log('WARN: some lazy backgrounds may not have resolved'));
  await page.evaluate(() => document.fonts.ready.then(() => true)).catch(() => {});
  await page.waitForTimeout(1200);
}

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'] });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, userAgent: UA, locale: 'fa-IR' });

  const network = [];
  const failed = [];
  const page = await context.newPage();
  page.on('request', r => {
    if (!r.url().startsWith('data:')) network.push({ url: r.url(), resourceType: r.resourceType(), method: r.method() });
  });
  page.on('response', r => {
    const entry = network.find(n => n.url === r.url() && n.status === undefined);
    if (entry) { entry.status = r.status(); const h = r.headers(); entry.contentType = h['content-type']; entry.size = h['content-length'] ? parseInt(h['content-length']) : null; entry.fromCache = h['x-nextjs-cache'] || undefined; }
  });
  page.on('requestfailed', r => failed.push({ url: r.url(), error: r.failure() && r.failure().errorText }));

  log('navigating', SITE);
  const t0 = Date.now();
  await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const domReady = Date.now() - t0;
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => log('networkidle timeout (acceptable)'));
  const loadDone = Date.now() - t0;

  log('activating delayed JS + lazy loads');
  await activatePage(page);

  /* ---------------------------------------------------------------
   * PAGE META + ENVIRONMENT
   * --------------------------------------------------------------- */
  const pageMeta = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] || {};
    const metas = {};
    document.querySelectorAll('meta[name], meta[property]').forEach(m => {
      const k = m.getAttribute('name') || m.getAttribute('property');
      if (k && !metas[k]) metas[k] = m.getAttribute('content');
    });
    const links = {};
    document.querySelectorAll('link[rel]').forEach(l => {
      const rel = l.getAttribute('rel');
      (links[rel] = links[rel] || []).push({ href: l.href, sizes: l.getAttribute('sizes'), type: l.getAttribute('type'), media: l.getAttribute('media'), as: l.getAttribute('as') });
    });
    return {
      title: document.title,
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
      htmlClasses: document.documentElement.className,
      bodyClasses: document.body.className,
      bodyId: document.body.id || null,
      readyState: document.readyState,
      docHeight: document.documentElement.scrollHeight,
      docWidth: document.documentElement.scrollWidth,
      viewport: { w: window.innerWidth, h: window.innerHeight },
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      dpr: window.devicePixelRatio,
      performance: {
        domContentLoadedEventStart: nav.domContentLoadedEventStart, domContentLoadedEventEnd: nav.domContentLoadedEventEnd,
        loadEventStart: nav.loadEventStart, loadEventEnd: nav.loadEventEnd,
        transferSize: nav.transferSize, encodedBodySize: nav.encodedBodySize, decodedBodySize: nav.decodedBodySize,
        domInteractive: nav.domInteractive, responseStart: nav.responseStart, responseEnd: nav.responseEnd
      },
      metaTags: metas,
      linkTags: links,
      canonical: (document.querySelector('link[rel="canonical"]') || {}).href || null,
      generator: metas['generator'] || null,
      counts: {
        elements: document.querySelectorAll('*').length,
        articles: document.querySelectorAll('article, .post').length,
        images: document.images.length,
        lazyBgSpans: document.querySelectorAll('[data-bgsrc]').length,
        iframes: document.querySelectorAll('iframe').length,
        scripts: document.scripts.length,
        stylesheets: document.styleSheets.length,
        forms: document.forms.length,
        links: document.links.length
      }
    };
  });
  pageMeta.extractionTimings = { domContentLoadedClientMs: domReady, networkSettledMs: loadDone };
  save('data/page-meta.json', pageMeta);

  /* ---------------------------------------------------------------
   * STRUCTURAL INVENTORY (top-level tree)
   * --------------------------------------------------------------- */
  const tree = await page.evaluate(() => {
    const walk = (el, depth, maxD) => {
      if (!el || depth > maxD) return null;
      const r = el.getBoundingClientRect();
      const kids = Array.from(el.children).slice(0, 18).map(c => walk(c, depth + 1, maxD)).filter(Boolean);
      return {
        tag: el.tagName, id: el.id || undefined,
        cls: (el.className && el.className.split) ? el.className.split(' ').filter(Boolean).slice(0, 10).join(' ') : undefined,
        rect: { x: Math.round(r.x + window.scrollX), y: Math.round(r.y + window.scrollY), w: Math.round(r.width), h: Math.round(r.height) },
        children: kids.length ? kids : undefined
      };
    };
    return { body: walk(document.body, 0, 5) };
  });
  save('data/dom-tree.json', tree);

  /* ---------------------------------------------------------------
   * FULL MEASUREMENTS (desktop 1920) — key elements with computed styles
   * --------------------------------------------------------------- */
  const measureAll = await page.evaluate((PROPS) => {
    const pick = (cs) => { const o = {}; PROPS.forEach(p => { const v = cs[p]; if (v !== undefined && v !== 'none' && v !== '' && v !== 'auto' && v !== 'normal' && v !== '0px' && v !== 'rgba(0, 0, 0, 0)') o[p] = v; }); return o; };
    const M = (el, note) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        sel: note || null, tag: el.tagName, id: el.id || undefined,
        cls: (el.className && el.className.split) ? el.className.split(' ').filter(Boolean).join(' ') : undefined,
        rect: {
          x: +(r.x.toFixed(1)), y: +(r.y.toFixed(1)), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
          docX: +(r.x + window.scrollX).toFixed(1), docY: +(r.y + window.scrollY).toFixed(1)
        },
        styles: pick(cs)
      };
    };
    const out = { sampledAt: new Date().toISOString(), viewport: { w: innerWidth, h: innerHeight }, scrollY: scrollY, elements: [] };
    const add = (sel, note) => { try { const el = document.querySelector(sel); if (el) out.elements.push(M(el, note || sel)); else out.elements.push({ sel: note || sel, missing: true }); } catch (e) { out.elements.push({ sel, error: String(e) }); } };

    // Layout skeleton
    ['.main-wrap', '#smart-head', '#smart-head .smart-head-row', '#smart-head .inner', '#smart-head .items.items-left', '#smart-head .items.items-right',
     '#smart-head .logo-link', '#smart-head .logo-image', '#smart-head .nav-wrap', '#smart-head .navigation-main', '#smart-head .menu > li', '#smart-head .menu > li > a',
     '#smart-head .search-icon', '#smart-head .offcanvas-toggle', '.hamburger-icon-a', '.hamburger-icon-a .inner',
     '#smart-head-mobile', '.off-canvas', '.off-canvas-head', '.off-canvas .ts-logo', '#mobile-menu', '.off-canvas-widgets',
     '.main-full', '.elementor-7322', '.elementor-7373',
     // Ticker
     '[data-id="1c95847"]', '[data-id="1c95847"] iframe',
     // Top news area
     '[data-id="cedc57a"]', '[data-id="cedc57a"] .block-head', '[data-id="cedc57a"] .post-title', '[data-id="cedc57a"] .excerpt', '[data-id="cedc57a"] .read-more', '[data-id="cedc57a"] .meta-item.date',
     '[data-id="8316c3e"]', '[data-id="8316c3e"] .post-title', '[data-id="8316c3e"] .media', '[data-id="8316c3e"] [data-bgsrc]',
     // TV
     '[data-id="53fa308"]', '[data-id="53fa308"] .block-head', '[data-id="53fa308"] .overlay-media', '[data-id="53fa308"] .overlay-title', '[data-id="53fa308"] .play-icon, [data-id="53fa308"] .tsi-play',
     '[data-id="c258178"]', '[data-id="c258178"] article:first-child', '[data-id="c258178"] .post-title', '[data-id="c258178"] .meta-item.date',
     // Sidebar
     '[data-id="a11540e"]', '[data-id="a11540e"] .block-head', '[data-id="a11540e"] article', '[data-id="f46c34f"]', '[data-id="2b53655"]', '[data-id="ad71bc1"]',
     '[data-id="c074dc7"]', '[data-id="c074dc7"] .block-head', '[data-id="c074dc7"] .overlay-title', '[data-id="c074dc7"] .magazine-tag, [data-id="c074dc7"] .post-cat',
     '[data-id="d43218c"]', '[data-id="c519aec"]', '[data-id="cdf7917"]', '[data-id="cdf7917"] .post-title',
     // Social + newsletter
     '[data-id="2a4da1e"]', '[data-id="2a4da1e"] .block-head', '[data-id="2a4da1e"] .spc-social a:first-child',
     '[data-id="9609692"]', '[data-id="9609692"] .block-head', '[data-id="9609692"] .subscribe-input, [data-id="9609692"] input[type="email"]', '[data-id="9609692"] .subscribe-button, [data-id="9609692"] button',
     // Energy
     '[data-id="2517f37"]', '[data-id="2517f37"] .block-head', '[data-id="2517f37"] .post-title', '[data-id="2517f37"] .excerpt',
     '[data-id="ebc9ae9"]', '[data-id="4ed4320"]',
     '[data-id="1635d4c"]', '[data-id="5fabf63"]', '[data-id="4957a9a"]', '[data-id="1635d4c"] .post-title',
     // Advertise
     '[data-id="41768b4"]', '[data-id="98a37f7"]', '[data-id="98a37f7"] .block-head', '[data-id="7719ff3"]', '[data-id="7719ff3"] .post-title',
     // Footer
     '.elementor-7373 .elementor-top-section', '[data-id="4d82adf"]', '[data-id="660d205"]', '[data-id="b35aad9"]', '[data-id="24bcf41"]', '[data-id="42dbf9e"], [data-id="42db0c1"]',
     '[data-id="3cb94db"]', '[data-id="0740360"]', '[data-id="0740360"] .post-title', '[data-id="9da778c"]', '[data-id="85e7526"]',
     '[data-id="226a5f9"]', '[data-id="774363e"]',
     // Search modal
     '.search-modal-wrap', '.search-modal-box', '.search-form', '.search-field'
    ].forEach(s => add(s));

    // All 9 menu items
    document.querySelectorAll('#smart-head .menu > li').forEach((li, i) => out.elements.push(M(li, `menu-item-${i + 1}: ` + (li.className.match(/menu-item-(\d+)/) || ['', ''])[1])));
    // All social buttons
    document.querySelectorAll('[data-id="2a4da1e"] .spc-social a, [data-id="2a4da1e"] .social-icons a').forEach((a, i) => out.elements.push(M(a, `social-btn-${i + 1}: ` + (a.className || ''))));
    return out;
  }, CSS_PROPS);
  save('measurements/desktop/geometry-1920.json', measureAll);

  /* ---------------------------------------------------------------
   * TYPOGRAPHY — per role
   * --------------------------------------------------------------- */
  const typography = await page.evaluate(() => {
    const T = (el, role) => {
      if (!el) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        role, selectorHint: el.tagName + (el.id ? '#' + el.id : '') + (el.className && el.className.split ? '.' + el.className.split(' ').filter(Boolean).slice(0, 4).join('.') : ''),
        sample: (el.textContent || '').trim().slice(0, 60),
        rect: { w: +r.width.toFixed(1), h: +r.height.toFixed(1) },
        fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight, fontStyle: cs.fontStyle,
        lineHeight: cs.lineHeight, letterSpacing: cs.letterSpacing, wordSpacing: cs.wordSpacing,
        textAlign: cs.textAlign, textTransform: cs.textTransform, textDecorationLine: cs.textDecorationLine,
        textOverflow: cs.textOverflow, whiteSpace: cs.whiteSpace, direction: cs.direction, unicodeBidi: cs.unicodeBidi,
        color: cs.color, display: cs.display,
        lineClamp: cs.webkitLineClamp !== 'none' ? cs.webkitLineClamp : undefined,
        renderedLines: Math.round(r.height / parseFloat(cs.lineHeight) || 0)
      };
    };
    const out = { sampledAt: new Date().toISOString(), roles: [] };
    const add = (sel, role) => { const el = document.querySelector(sel); if (el) out.roles.push(T(el, role)); else out.roles.push({ role, missing: true, selector: sel }); };
    add('#smart-head .menu > li > a', 'menu-item');
    add('#smart-head .logo-link', 'logo');
    add('[data-id="cedc57a"] .block-head .heading', 'section-heading-topnews');
    add('[data-id="cedc57a"] .post-title a', 'hero-headline');
    add('[data-id="cedc57a"] .meta-item.date', 'hero-date');
    add('[data-id="cedc57a"] .excerpt', 'hero-excerpt');
    add('[data-id="cedc57a"] .read-more', 'hero-readmore');
    add('[data-id="8316c3e"] .post-title a', 'secondary-card-title');
    add('[data-id="8316c3e"] .meta-item.date', 'secondary-card-date');
    add('[data-id="a11540e"] .block-head .heading', 'topnews-label');
    add('[data-id="a11540e"] .post-title a', 'topnews-list-title');
    add('[data-id="53fa308"] .block-head .heading', 'tv-heading');
    add('[data-id="53fa308"] .overlay-title', 'tv-overlay-title');
    add('[data-id="c258178"] .post-title a', 'video-playlist-title');
    add('[data-id="c258178"] .meta-item.date', 'video-playlist-date');
    add('[data-id="c074dc7"] .block-head .heading', 'magazine-heading');
    add('[data-id="c074dc7"] .overlay-title', 'magazine-overlay-title');
    add('[data-id="d43218c"]', 'feature-title-heading');
    add('[data-id="cdf7917"] .post-title a', 'feature-title-item');
    add('[data-id="2a4da1e"] .block-head .heading', 'social-heading');
    add('[data-id="2a4da1e"] .spc-social a, [data-id="2a4da1e"] .social a', 'social-button');
    add('[data-id="9609692"] .block-head .heading', 'newsletter-heading');
    add('[data-id="9609692"] p, [data-id="9609692"] .subscribe-text', 'newsletter-desc');
    add('[data-id="9609692"] input[type="email"], [data-id="9609692"] .subscribe-input', 'newsletter-input');
    add('[data-id="9609692"] button, [data-id="9609692"] .subscribe-button', 'newsletter-button');
    add('[data-id="2517f37"] .block-head .heading', 'energy-heading');
    add('[data-id="2517f37"] .post-title a', 'energy-headline');
    add('[data-id="ebc9ae9"] .post-title a', 'energy-sub-title');
    add('[data-id="ebc9ae9"] .meta-item.date', 'energy-sub-date');
    add('[data-id="1635d4c"] .post-title a', 'energy-grid-title');
    add('[data-id="98a37f7"] .block-head .heading', 'advertise-heading');
    add('[data-id="7719ff3"] .post-title a', 'advertise-card-title');
    add('[data-id="4d82adf"]', 'footer-about-heading');
    add('[data-id="b35aad9"]', 'footer-about-text');
    add('[data-id="24bcf41"]', 'footer-email');
    add('[data-id="3cb94db"]', 'footer-popular-heading');
    add('[data-id="0740360"] .post-title a', 'footer-popular-title');
    add('[data-id="9da778c"]', 'footer-latest-heading');
    add('[data-id="85e7526"] .post-title a', 'footer-latest-title');
    add('[data-id="774363e"]', 'copyright');
    return out;
  });
  save('design-system/typography-roles.json', typography);

  /* ---------------------------------------------------------------
   * COLOR PALETTE — computed from key elements
   * --------------------------------------------------------------- */
  const colors = await page.evaluate(() => {
    const targets = [
      ['body', document.body], ['html', document.documentElement],
      ['header-row', document.querySelector('#smart-head .smart-head-row')],
      ['header-menu-link', document.querySelector('#smart-head .menu > li > a')],
      ['ticker-section', document.querySelector('[data-id="1c95847"]')],
      ['main-content-bg', document.querySelector('.elementor-7322')],
      ['topnews-heading-bg', document.querySelector('[data-id="cedc57a"] .block-head .heading')],
      ['topnews-heading-text', document.querySelector('[data-id="cedc57a"] .block-head .heading')],
      ['hero-title', document.querySelector('[data-id="cedc57a"] .post-title a')],
      ['hero-excerpt', document.querySelector('[data-id="cedc57a"] .excerpt')],
      ['hero-date', document.querySelector('[data-id="cedc57a"] .meta-item.date')],
      ['small-post-title', document.querySelector('[data-id="8316c3e"] .post-title a')],
      ['small-post-date', document.querySelector('[data-id="8316c3e"] .meta-item.date')],
      ['tv-section', document.querySelector('[data-id="53fa308"]')],
      ['tv-title', document.querySelector('[data-id="53fa308"] .overlay-title')],
      ['tv-playlist', document.querySelector('[data-id="c258178"]')],
      ['video-card', document.querySelector('[data-id="c258178"] article')],
      ['magazine-section', document.querySelector('[data-id="c074dc7"]')],
      ['magazine-tag', document.querySelector('[data-id="c074dc7"] .post-cat, [data-id="c074dc7"] .magazine-tag')],
      ['social-heading-bg', document.querySelector('[data-id="2a4da1e"] .block-head .heading')],
      ['social-btn-1', document.querySelector('[data-id="2a4da1e"] .spc-social a, [data-id="2a4da1e"] .social a')],
      ['newsletter-card', document.querySelector('[data-id="9609692"]')],
      ['newsletter-input', document.querySelector('[data-id="9609692"] input[type="email"], [data-id="9609692"] .subscribe-input')],
      ['newsletter-btn', document.querySelector('[data-id="9609692"] button, [data-id="9609692"] .subscribe-button')],
      ['energy-heading-bg', document.querySelector('[data-id="2517f37"] .block-head .heading')],
      ['energy-title', document.querySelector('[data-id="2517f37"] .post-title a')],
      ['energy-grid-title', document.querySelector('[data-id="1635d4c"] .post-title a')],
      ['advertise-heading', document.querySelector('[data-id="98a37f7"] .block-head .heading')],
      ['advertise-card-title', document.querySelector('[data-id="7719ff3"] .post-title a')],
      ['footer', document.querySelector('.elementor-7373')],
      ['footer-section', document.querySelector('.elementor-7373 .elementor-top-section')],
      ['footer-heading', document.querySelector('[data-id="4d82adf"]')],
      ['footer-text', document.querySelector('[data-id="b35aad9"]')],
      ['footer-email', document.querySelector('[data-id="24bcf41"]')],
      ['footer-title', document.querySelector('[data-id="0740360"] .post-title a')],
      ['footer-date', document.querySelector('[data-id="0740360"] .meta-item.date')],
      ['copyright', document.querySelector('[data-id="774363e"]')],
      ['copyright-link', document.querySelector('[data-id="774363e"] a')]
    ];
    const used = new Map();
    targets.forEach(([name, el]) => {
      if (!el) return;
      const cs = getComputedStyle(el);
      [['color', cs.color], ['backgroundColor', cs.backgroundColor], ['borderColor', cs.borderTopColor]].forEach(([k, v]) => {
        if (v && v !== 'rgba(0, 0, 0, 0)') {
          const key = k + ':' + v;
          if (!used.has(key)) used.set(key, { property: k, value: v, elements: [] });
          used.get(key).elements.push(name);
        }
      });
    });
    const cssVars = {};
    try {
      for (const sheet of document.styleSheets) {
        let rules; try { rules = sheet.cssRules; } catch (e) { continue; }
        for (const rule of rules) {
          if (rule.style) {
            for (const p of rule.style) {
              if (p.startsWith('--')) cssVars[p] = rule.style.getPropertyValue(p).trim();
            }
          }
        }
      }
    } catch (e) {}
    return { sampledAt: new Date().toISOString(), computedPalette: Array.from(used.values()), cssCustomProperties: cssVars };
  });
  save('design-system/colors-computed.json', colors);

  /* ---------------------------------------------------------------
   * DATA SNAPSHOT — every article on the homepage
   * --------------------------------------------------------------- */
  const snapshot = await page.evaluate(() => {
    const WIDGETS = {
      hero_main: '[data-id="cedc57a"]',
      hero_secondary_1: '[data-id="8316c3e"]', hero_secondary_2: '[data-id="7f377e8"]',
      hero_secondary_3: '[data-id="bf02a19"]', hero_secondary_4: '[data-id="791af3e"]',
      tv_player: '[data-id="53fa308"]', tv_playlist: '[data-id="c258178"]',
      topnews_label: '[data-id="a11540e"]', topnews_2: '[data-id="f46c34f"]', topnews_3: '[data-id="2b53655"]', topnews_4: '[data-id="ad71bc1"]',
      magazine: '[data-id="c074dc7"]',
      feature_1: '[data-id="cdf7917"]', feature_2: '[data-id="4a3c89f"]', feature_3: '[data-id="de04eb4"]',
      energy_main: '[data-id="2517f37"]', energy_sub_1: '[data-id="ebc9ae9"]', energy_sub_2: '[data-id="4ed4320"]',
      energy_grid_1: '[data-id="1635d4c"]', energy_grid_2: '[data-id="5fabf63"]', energy_grid_3: '[data-id="4957a9a"]',
      advertise_1: '[data-id="98a37f7"]', advertise_2: '[data-id="7719ff3"]',
      footer_popular: '[data-id="0740360"]', footer_latest: '[data-id="85e7526"]'
    };
    const snap = { capturedAt: new Date().toISOString(), pageUrl: location.href, widgets: {} };
    for (const [key, sel] of Object.entries(WIDGETS)) {
      const root = document.querySelector(sel);
      if (!root) { snap.widgets[key] = { selector: sel, missing: true }; continue; }
      const arts = Array.from(root.querySelectorAll('article, .post, .l-post'));
      snap.widgets[key] = {
        selector: sel,
        widgetType: (Array.from(root.classList).find(c => c.startsWith('elementor-widget-')) || root.className).toString(),
        heading: (root.querySelector('.block-head .heading, .block-head h2, .widget-title') || {}).textContent?.trim() || null,
        articles: arts.map(a => {
          const titleEl = a.querySelector('.post-title a, h2 a, h4 a, .title a');
          const dateEl = a.querySelector('.meta-item.date, .date');
          const img = a.querySelector('[data-bgsrc], img');
          const cat = a.querySelector('.post-cat a, .category a, .cat-labels a');
          const exc = a.querySelector('.excerpt, .post-excerpt');
          const vid = a.querySelector('.tsi-play, .play-icon, video, iframe');
          return {
            title: titleEl ? titleEl.textContent.trim() : (a.textContent || '').trim().slice(0, 80),
            url: titleEl ? titleEl.href : null,
            dateText: dateEl ? dateEl.textContent.trim() : null,
            dateISO: dateEl ? (dateEl.getAttribute('datetime') || dateEl.title || dateEl.getAttribute('data-date') || null) : null,
            category: cat ? cat.textContent.trim() : null,
            categoryUrl: cat ? cat.href : null,
            excerpt: exc ? exc.textContent.trim() : null,
            image: img ? (img.getAttribute('data-bgsrc') || img.currentSrc || img.src) : null,
            imageSrcSet: img ? (img.getAttribute('data-bgset') || img.getAttribute('srcset')) : null,
            imageSizes: img ? (img.getAttribute('data-sizes') || img.getAttribute('sizes')) : null,
            hasVideoIndicator: !!vid,
            videoUrl: (a.querySelector('a[href*=".mp4"], a[href*="aparat"], a[href*="youtube"]') || {}).href || null
          };
        })
      };
    }
    // market iframe wrapper
    const ifr = document.querySelector('iframe');
    snap.marketIframe = ifr ? { src: ifr.src, title: ifr.title, rendered: { w: ifr.getBoundingClientRect().width, h: ifr.getBoundingClientRect().height }, wrapperHtml: ifr.parentElement.outerHTML.slice(0, 2000) } : null;
    return snap;
  });
  save('data/homepage-snapshot.json', snapshot);

  /* ---------------------------------------------------------------
   * ASSET MANIFEST — images, logos, icons, favicons
   * --------------------------------------------------------------- */
  const assets = await page.evaluate(() => {
    const imgs = Array.from(document.images).map(img => {
      const r = img.getBoundingClientRect();
      return {
        tag: 'img', id: img.id || undefined, cls: img.className, alt: img.alt, title: img.title,
        src: img.currentSrc || img.src, srcset: img.getAttribute('srcset'), sizes: img.getAttribute('sizes'),
        natural: { w: img.naturalWidth, h: img.naturalHeight }, rendered: { w: +r.width.toFixed(1), h: +r.height.toFixed(1) },
        aspectRatioRendered: r.width && r.height ? +(r.width / r.height).toFixed(3) : null,
        objectFit: getComputedStyle(img).objectFit, objectPosition: getComputedStyle(img).objectPosition,
        loading: img.getAttribute('loading'), complete: img.complete, visible: img.offsetParent !== null,
        parentSelectorHint: img.closest('[data-id]') ? 'widget#' + img.closest('[data-id]').getAttribute('data-id') : (img.parentElement && img.parentElement.className || '').slice(0, 60)
      };
    });
    const bgs = Array.from(document.querySelectorAll('[data-bgsrc], [data-bgset]')).map(el => {
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName, cls: el.className, dataBgSrc: el.getAttribute('data-bgsrc'), dataBgSet: el.getAttribute('data-bgset'),
        dataSizes: el.getAttribute('data-sizes'), appliedBackgroundImage: getComputedStyle(el).backgroundImage,
        rendered: { w: +r.width.toFixed(1), h: +r.height.toFixed(1) },
        aspectRatioRendered: r.width && r.height ? +(r.width / r.height).toFixed(3) : null,
        backgroundSize: getComputedStyle(el).backgroundSize, backgroundPosition: getComputedStyle(el).backgroundPosition,
        parentSelectorHint: el.closest('[data-id]') ? 'widget#' + el.closest('[data-id]').getAttribute('data-id') : undefined,
        visible: el.offsetParent !== null
      };
    });
    const favicons = Array.from(document.querySelectorAll('link[rel*="icon"]')).map(l => ({ rel: l.rel, href: l.href, sizes: l.sizes && l.sizes.value, type: l.type }));
    const cssCustom = {};
    document.querySelectorAll('[style*="background"]').forEach(el => {
      const bg = getComputedStyle(el).backgroundImage;
      if (bg && bg !== 'none' && !cssCustom[bg]) cssCustom[bg] = (el.className || '').toString().slice(0, 60);
    });
    return { capturedAt: new Date().toISOString(), imgTags: imgs, lazyBackgrounds: bgs, favicons, inlineBackgrounds: cssCustom };
  });
  save('data/asset-manifest.json', assets);

  /* ---------------------------------------------------------------
   * STYLESHEETS + SCRIPTS inventory
   * --------------------------------------------------------------- */
  const resources = await page.evaluate(() => ({
    stylesheets: Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => ({
      href: l.href, media: l.media, integrity: l.integrity || null,
      crossorigin: l.crossOrigin || null, disabled: l.disabled
    })),
    scripts: Array.from(document.scripts).map(s => ({
      src: s.src || null, id: s.id || null, async: s.async, defer: s.defer, type: s.type || null,
      hasSrc: !!s.src, inlineLength: s.src ? 0 : (s.textContent || '').length
    })),
    preloadLinks: Array.from(document.querySelectorAll('link[rel="preload"], link[rel="preconnect"], link[rel="dns-prefetch"]')).map(l => ({ rel: l.rel, href: l.href, as: l.as }))
  }));
  save('data/resources-inventory.json', resources);

  /* ---------------------------------------------------------------
   * INTERACTIVE STATE (desktop, before interactions)
   * --------------------------------------------------------------- */
  const interactive = await page.evaluate(() => {
    const offc = document.querySelector('#off-canvas');
    const searchModal = document.querySelector('.search-modal-wrap');
    const stickyHead = document.querySelector('#smart-head .smart-head-row');
    const ocCs = offc ? getComputedStyle(offc) : null;
    const smCs = searchModal ? getComputedStyle(searchModal) : null;
    const shCs = stickyHead ? getComputedStyle(stickyHead) : null;
    const forms = Array.from(document.forms).map(f => ({
      id: f.id, action: f.action, method: f.method,
      fields: Array.from(f.elements).map(el => ({ tag: el.tagName, type: el.type, name: el.name, placeholder: el.placeholder, required: el.required, cls: el.className }))
    }));
    return {
      offCanvas: offc ? { cls: offc.className, transform: ocCs.transform, position: ocCs.position, width: ocCs.width, right: ocCs.right, left: ocCs.left, transition: ocCs.transition, display: ocCs.display } : null,
      searchModal: searchModal ? { cls: searchModal.className, display: smCs.display, opacity: smCs.opacity, transition: smCs.transition, position: smCs.position, zIndex: smCs.zIndex } : null,
      smartHeadRow: stickyHead ? { cls: stickyHead.className, position: shCs.position, top: shCs.top, transform: shCs.transform, transition: shCs.transition, zIndex: shCs.zIndex } : null,
      backTop: (() => { const b = document.querySelector('.back-top, .backtop, #back-top'); if (!b) return null; const cs = getComputedStyle(b); return { cls: b.className, display: cs.display, opacity: cs.opacity, position: cs.position }; })(),
      forms,
      popups: Array.from(document.querySelectorAll('.popup, .modal, [class*="popup"]')).map(p => ({ cls: p.className, visible: p.offsetParent !== null })).slice(0, 10)
    };
  });
  save('data/interactive-states-initial.json', interactive);

  /* ---------------------------------------------------------------
   * RESPONSIVE MEASUREMENTS at all widths
   * --------------------------------------------------------------- */
  const responsive = {};
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 1080 });
    await page.waitForTimeout(700);
    // re-trigger lazyload after resize
    await page.evaluate(() => { window.dispatchEvent(new Event('scroll')); document.dispatchEvent(new Event('scroll')); });
    for (let i = 1; i <= 4; i++) {
      await page.evaluate((f) => window.scrollTo(0, document.documentElement.scrollHeight * f), i / 4);
      await page.waitForTimeout(180);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => {
      const g = (sel) => { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return { x: +(r.x.toFixed(1)), y: +(r.y.toFixed(1)), w: +r.width.toFixed(1), h: +r.height.toFixed(1), docX: +(r.x + scrollX).toFixed(1), docY: +(r.y + scrollY).toFixed(1) }; };
      const vis = (sel) => { const el = document.querySelector(sel); if (!el) return false; const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && (el.offsetParent !== null || cs.position === 'fixed'); };
      const fs = (sel) => { const el = document.querySelector(sel); return el ? getComputedStyle(el).fontSize : null; };
      const headRow = document.querySelector('#smart-head .smart-head-row');
      return {
        viewport: { w: innerWidth, h: innerHeight },
        docWidth: document.documentElement.scrollWidth,
        docHeight: document.documentElement.scrollHeight,
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
        containers: {
          headerInner: g('#smart-head .inner'),
          mainContainer1: g('.elementor-7322 > .elementor-section:nth-child(2) .elementor-container'),
          elementorContainer: g('.elementor-container'),
          footerContainer: g('.elementor-7373 .elementor-container')
        },
        sections: {
          ticker: g('[data-id="1c95847"]'),
          topNewsArea: g('.elementor-7322 > .elementor-section:nth-child(2)'),
          mainContentCol: g('[data-id="cedc57a"]'),
          sidebarCol: g('[data-id="a11540e"]'),
          energySection: g('[data-id="2517f37"]'),
          advertiseRow: g('[data-id="41768b4"]'),
          footer: g('.elementor-7373')
        },
        visibility: {
          desktopHeader: vis('#smart-head'),
          mobileHeader: vis('#smart-head-mobile'),
          offCanvas: vis('#off-canvas'),
          desktopNav: vis('#smart-head .navigation-main'),
          hamburger: vis('#smart-head .offcanvas-toggle'),
          tickerIframe: vis('[data-id="1c95847"] iframe'),
          magazine: vis('[data-id="c074dc7"]'),
          socialWidget: vis('[data-id="2a4da1e"]'),
          newsletter: vis('[data-id="9609692"]'),
          footerAbout: vis('[data-id="4d82adf"]')
        },
        columns: (() => {
          const c = document.querySelector('.elementor-7322 > .elementor-section:nth-child(2)');
          if (!c) return null;
          const cols = Array.from(c.querySelectorAll(':scope > .elementor-container > .elementor-column'));
          return cols.map(col => { const r = col.getBoundingClientRect(); const cs = getComputedStyle(col); return { cls: col.className.split(' ').filter(x => x.includes('elementor-element') || x.includes('col-') || x.includes('main')).join(' '), w: +r.width.toFixed(1), h: +r.height.toFixed(1), order: cs.order, flexBasis: cs.flexBasis }; });
        })(),
        fontSizes: {
          heroTitle: fs('[data-id="cedc57a"] .post-title a'),
          smallPostTitle: fs('[data-id="8316c3e"] .post-title a'),
          sectionHeading: fs('[data-id="cedc57a"] .block-head .heading'),
          menuItem: fs('#smart-head .menu > li > a'),
          date: fs('[data-id="8316c3e"] .meta-item.date'),
          bodyBase: fs('body'),
          footerTitle: fs('[data-id="0740360"] .post-title a')
        },
        stickyHeaderState: headRow ? { cls: headRow.className.slice(0, 120), position: getComputedStyle(headRow).position, top: getComputedStyle(headRow).top, transform: getComputedStyle(headRow).transform } : null
      };
    });
    responsive[w] = m;
    save(`measurements/${w >= 1024 ? 'desktop' : w >= 768 ? 'tablet' : 'mobile'}/measurements-${w}.json`, m);
    log('measured breakpoint', w);
  }
  save('data/responsive-summary.json', responsive);

  /* ---------------------------------------------------------------
   * NETWORK MANIFEST
   * --------------------------------------------------------------- */
  save('data/network-manifest.json', { capturedAt: new Date().toISOString(), totalRequests: network.length, requests: network, failedRequests: failed });

  /* ---------------------------------------------------------------
   * DOWNLOAD: stylesheets, scripts, fonts, images
   * --------------------------------------------------------------- */
  const download = async (url, dest) => {
    try {
      const res = await context.request.get(url, { timeout: 30000 });
      if (!res.ok()) { log('WARN download failed', res.status(), url); return false; }
      const buf = await res.body();
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, buf);
      return true;
    } catch (e) { log('WARN download error', url, String(e).slice(0, 80)); return false; }
  };

  // stylesheets
  const cssManifest = [];
  let i = 0;
  for (const s of resources.stylesheets) {
    i++;
    const safe = s.href.replace(/https?:\/\//, '').replace(/[^a-z0-9._\/-]/gi, '_').slice(0, 140);
    const file = `source/stylesheets/${String(i).padStart(2, '0')}-${path.basename(safe.split('?')[0]) || 'style.css'}`;
    const ok = await download(s.href, path.join(OUT, file));
    cssManifest.push({ index: i, href: s.href, media: s.media, localFile: ok ? file : null, bytes: ok ? fs.statSync(path.join(OUT, file)).size : null });
  }
  save('data/stylesheets-manifest.json', cssManifest);

  // scripts (external only)
  const jsManifest = [];
  i = 0;
  for (const s of resources.scripts) {
    if (!s.src) continue;
    i++;
    const safe = s.src.replace(/https?:\/\//, '').replace(/[^a-z0-9._\/-]/gi, '_').slice(0, 140);
    const file = `source/public-scripts/${String(i).padStart(2, '0')}-${path.basename(safe.split('?')[0]) || 'script.js'}`;
    const ok = await download(s.src, path.join(OUT, file));
    jsManifest.push({ index: i, src: s.src, id: s.id, async: s.async, defer: s.defer, localFile: ok ? file : null });
  }
  save('data/scripts-manifest.json', jsManifest);

  // fonts — from @font-face in downloaded CSS
  const fontUrls = new Set();
  for (const c of cssManifest) {
    if (!c.localFile) continue;
    const txt = fs.readFileSync(path.join(OUT, c.localFile), 'utf8');
    const re = /@font-face\s*{([^}]*)}/g;
    let mm;
    while ((mm = re.exec(txt))) {
      const block = mm[1];
      const fam = (block.match(/font-family\s*:\s*['"]?([^;'"]+)/) || [])[1];
      const weight = (block.match(/font-weight\s*:\s*([^;}]+)/) || [])[1];
      const style = (block.match(/font-style\s*:\s*([^;}]+)/) || [])[1];
      const srcs = [];
      const urlRe = /url\((['"]?)([^)'"]+)\1\)/g;
      let u;
      while ((u = urlRe.exec(block))) srcs.push(u[2]);
      srcs.forEach(su => {
        const abs = su.startsWith('http') ? su : su.startsWith('//') ? 'https:' + su : su.startsWith('/') ? new URL(c.href).origin + su : new URL(su, c.href).href;
        fontUrls.add(JSON.stringify({ url: abs, family: fam && fam.trim(), weight: weight && weight.trim(), style: style && style.trim() }));
      });
    }
  }
  const fontManifest = [];
  for (const j of fontUrls) {
    const f = JSON.parse(j);
    const name = path.basename(f.url.split('?')[0]);
    const ok = await download(f.url, path.join(OUT, 'assets/fonts', name));
    fontManifest.push({ ...f, localFile: ok ? 'assets/fonts/' + name : null });
  }
  save('data/fonts-manifest.json', fontManifest);

  // images — unique URLs from manifest (bgsrc + srcset variants + logos)
  const imgUrlSet = new Map();
  assets.imgTags.forEach(im => { if (im.src && !im.src.startsWith('data:')) imgUrlSet.set(im.src, { url: im.src, kind: 'img', alt: im.alt }); });
  assets.lazyBackgrounds.forEach(b => {
    if (b.dataBgSrc) imgUrlSet.set(b.dataBgSrc, { url: b.dataBgSrc, kind: 'lazy-bg' });
    if (b.dataBgSet) b.dataBgSet.split(',').forEach(part => { const u = part.trim().split(' ')[0]; if (u) imgUrlSet.set(u, { url: u, kind: 'bgset-variant' }); });
  });
  (pageMeta.linkTags['icon'] || []).forEach(f => imgUrlSet.set(f.href, { url: f.href, kind: 'favicon' }));
  const imgManifest = [];
  for (const [, im] of imgUrlSet) {
    const name = path.basename(im.url.split('?')[0]);
    const sub = /logo/i.test(name) ? 'assets/logos' : /\.(svg)$/i.test(name) ? 'assets/icons' : 'assets/images';
    const ok = await download(im.url, path.join(OUT, sub, name));
    imgManifest.push({ ...im, localFile: ok ? sub + '/' + name : null, bytes: ok ? fs.statSync(path.join(OUT, sub, name)).size : null });
  }
  save('data/images-manifest.json', { total: imgManifest.length, images: imgManifest });

  await browser.close();
  log('EXTRACTION COMPLETE');
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
