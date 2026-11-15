/**
 * Petro Times — Component Specification Builder
 * Phase 13: extracts per-component HTML + builds spec JSON from measured data
 * Run: node /home/z/my-project/petrotimes-extraction/scripts/build-components.js
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright');

const OUT = '/home/z/my-project/petrotimes-extraction';
const SITE = 'https://petrotimes.ir/';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const log = (...a) => console.log('[components]', ...a);

const COMPONENTS = [
  { id: 'top-bar-ticker', name: 'Market Data Ticker (iframe wrapper)', sel: '[data-id="1c95847"]', category: 'ticker' },
  { id: 'header', name: 'Main Header (SmartMag smart-head-a)', sel: '#smart-head', category: 'header' },
  { id: 'navigation-main', name: 'Main Navigation', sel: '#smart-head .nav-wrap', category: 'navigation' },
  { id: 'mobile-header', name: 'Mobile Header', sel: '#smart-head-mobile', category: 'header' },
  { id: 'offcanvas-menu', name: 'Off-canvas Mobile Menu', sel: '#off-canvas', category: 'navigation' },
  { id: 'search-modal', name: 'Search Modal', sel: '.search-modal-wrap', category: 'search' },
  { id: 'top-news-hero', name: 'Main Featured Article (highlights)', sel: '[data-id="cedc57a"]', category: 'hero' },
  { id: 'top-news-secondary', name: 'Secondary News Cards (posts-small x4)', sel: '.elementor-7322 .elementor-element-0cd2772 .elementor-widget-wrap', category: 'news-cards' },
  { id: 'top-news-list', name: 'Top News Label + Sidebar List', sel: '.elementor-7322 .elementor-element-98a6ee8 .elementor-widget-wrap', category: 'news-cards' },
  { id: 'tv-section', name: 'TV Petro Times (overlay video)', sel: '[data-id="53fa308"]', category: 'video-section' },
  { id: 'tv-playlist', name: 'TV Playlist (posts-small x5)', sel: '[data-id="c258178"]', category: 'video-section' },
  { id: 'magazine', name: 'Magazine (overlay slider)', sel: '[data-id="c074dc7"]', category: 'magazine' },
  { id: 'feature-title', name: 'Feature Title List (heading + 3 grids)', sel: '.elementor-7322 .elementor-element-98a6ee8 .elementor-widget-wrap', category: 'news-cards' },
  { id: 'social-widget', name: 'We Are Social Buttons', sel: '[data-id="2a4da1e"]', category: 'social' },
  { id: 'newsletter', name: 'Newsletter Subscribe', sel: '[data-id="9609692"]', category: 'newsletter' },
  { id: 'energy-featured', name: 'Energy Featured (highlights)', sel: '[data-id="2517f37"]', category: 'energy' },
  { id: 'energy-list', name: 'Energy Sub News (posts-small x2)', sel: '.elementor-7322 .elementor-element-0e6f215 .elementor-widget-wrap', category: 'energy' },
  { id: 'energy-grid', name: 'Energy 3-Column Grid', sel: '.elementor-7322 .elementor-element-0e6f215 .elementor-widget-wrap', category: 'energy' },
  { id: 'advertise-row', name: 'Advertise Row (5-col flex, 2 filled)', sel: '[data-id="41768b4"]', category: 'news-cards' },
  { id: 'footer', name: 'Footer (Elementor 7373)', sel: '.elementor-7373', category: 'footer' },
  { id: 'copyright', name: 'Copyright Bar', sel: '[data-id="226a5f9"]', category: 'footer' }
];

async function activatePage(page) {
  await page.evaluate(() => { ['mousemove', 'keydown', 'scroll', 'wheel'].forEach(t => { try { window.dispatchEvent(new Event(t)); document.dispatchEvent(new Event(t)); } catch (e) {} }); });
  await page.mouse.move(700, 400); await page.mouse.wheel(0, 500); await page.waitForTimeout(400);
  for (let i = 1; i <= 10; i++) { await page.evaluate(f => window.scrollTo(0, document.documentElement.scrollHeight * f), i / 10); await page.waitForTimeout(200); }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForFunction(() => { const els = [...document.querySelectorAll('[data-bgsrc]')]; return els.length && els.every(e => getComputedStyle(e).backgroundImage !== 'none'); }, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(800);
}

const KEY_PROPS = ['display','position','flexDirection','gridTemplateColumns','gap','padding','margin','background','backgroundColor','color','fontSize','fontWeight','lineHeight','textAlign','direction','borderRadius','boxShadow','transition','overflow','zIndex','width','maxWidth','aspectRatio'];

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, userAgent: UA, locale: 'fa-IR' });
  const page = await context.newPage();
  await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await activatePage(page);

  const index = [];
  const geo = JSON.parse(fs.readFileSync(path.join(OUT, 'measurements/desktop/geometry-1920.json'), 'utf8'));
  const typ = JSON.parse(fs.readFileSync(path.join(OUT, 'design-system/typography-roles.json'), 'utf8'));
  const snap = JSON.parse(fs.readFileSync(path.join(OUT, 'data/homepage-snapshot.json'), 'utf8'));

  for (const c of COMPONENTS) {
    const spec = {
      componentId: c.id, componentName: c.name, category: c.category,
      primarySelector: c.sel, extractedAt: new Date().toISOString()
    };
    try {
      const el = await page.$(c.sel);
      if (!el) { spec.status = 'SELECTOR_NOT_FOUND'; index.push(spec); continue; }
      spec.status = 'EXTRACTED';
      spec.html = await el.evaluate(e => e.outerHTML);
      spec.geometry = await el.evaluate((e, PROPS) => {
        const r = e.getBoundingClientRect();
        const cs = getComputedStyle(e);
        const o = { rect: { x: +r.x.toFixed(1), y: +(r.y + scrollY).toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }, computed: {} };
        PROPS.forEach(p => { const v = cs[p]; if (v && v !== 'none' && v !== 'auto' && v !== 'normal') o.computed[p] = v; });
        return o;
      }, KEY_PROPS);
      // child element tree with styles (depth 3)
      spec.children = await el.evaluate((PROPS, sel) => {
        const root = document.querySelector(sel);
        if (!root) return null;
        const pick = (elm) => { const cs = getComputedStyle(elm); const o = {}; PROPS.forEach(p => { const v = cs[p]; if (v && v !== 'none' && v !== 'auto' && v !== 'normal') o[p] = v; }); return o; };
        const walk = (node, depth) => {
          if (depth > 3) return null;
          const r = node.getBoundingClientRect();
          const item = {
            tag: node.tagName, id: node.id || undefined, cls: (node.className && node.className.split) ? node.className.split(' ').filter(Boolean).slice(0, 10).join(' ') : undefined,
            rect: { x: +(r.x + scrollX).toFixed(1), y: +(r.y + scrollY).toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) },
            styles: pick(node),
            text: node.children.length === 0 ? (node.textContent || '').trim().slice(0, 120) : undefined
          };
          const kids = Array.from(node.children).slice(0, 12).map(k => walk(k, depth + 1)).filter(Boolean);
          if (kids.length) item.children = kids;
          return item;
        };
        return walk(root, 0);
      }, KEY_PROPS, c.sel);
      // save HTML file
      const dir = path.join(OUT, 'components');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${c.id}.html`), spec.html);
      // snapshot link
      const snapKey = Object.keys(snap.widgets).find(k => snap.widgets[k].selector === c.sel) || null;
      if (snapKey) spec.dataSnapshotKey = snapKey;
    } catch (e) { spec.status = 'ERROR: ' + String(e).slice(0, 120); }
    index.push(spec);
    log(c.id, spec.status);
  }

  fs.writeFileSync(path.join(OUT, 'components/component-index.json'), JSON.stringify({
    generatedAt: new Date().toISOString(),
    source: 'petrotimes.ir homepage (WordPress 6.x, SmartMag theme, Elementor)',
    components: index.map(i => ({ componentId: i.componentId, componentName: i.componentName, category: i.category, primarySelector: i.primarySelector, status: i.status, htmlFile: `components/${i.componentId}.html`, dataSnapshotKey: i.dataSnapshotKey || null }))
  }, null, 2));

  // save full specs (incl. HTML embedded)
  fs.writeFileSync(path.join(OUT, 'components/full-specs.json'), JSON.stringify(index, null, 2));
  log('component index written:', index.length);
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
