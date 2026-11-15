/**
 * Petro Times — CSS Cascade & Design-System Analysis
 * Parses downloaded stylesheets: breakpoints, hover rules, keyframes, CSS vars, @font-face
 * Run: node /home/z/my-project/petrotimes-extraction/scripts/analyze-css.js
 */
const fs = require('fs');
const path = require('path');
const OUT = '/home/z/my-project/petrotimes-extraction';
const CSS_DIR = path.join(OUT, 'source/stylesheets');

const files = fs.readdirSync(CSS_DIR).filter(f => f.includes('.css')).sort();
const sheets = files.map(f => ({ name: f, text: fs.readFileSync(path.join(CSS_DIR, f), 'utf8') }));
console.log('analyzing', sheets.length, 'stylesheets');

/* ---------- 1. Breakpoints ---------- */
const bpCount = new Map();
const bpExamples = {};
for (const { name, text } of sheets) {
  const re = /@media([^{]+){/g;
  let m;
  while ((m = re.exec(text))) {
    const cond = m[1].replace(/\s+/g, ' ').trim();
    bpCount.set(cond, (bpCount.get(cond) || 0) + 1);
    (bpExamples[cond] = bpExamples[cond] || []).push(name);
  }
}
const widths = new Set();
for (const cond of bpCount.keys()) {
  for (const mm of cond.matchAll(/(min|max)-width\s*:\s*([\d.]+)(px|em|rem)/g)) {
    let v = parseFloat(mm[2]);
    if (mm[3] !== 'px') v = v * 16;
    widths.add(Math.round(v) + 'px ' + mm[1]);
  }
}
const breakpoints = {
  note: 'Values extracted from actual @media conditions in all loaded stylesheets. Test widths (1920..360) were sampled separately.',
  mediaConditionFrequency: Object.fromEntries([...bpCount.entries()].sort((a, b) => b[1] - a[1])),
  distinctThresholds: [...widths].sort((a, b) => parseInt(a) - parseInt(b)),
  sourceFiles: Object.fromEntries(Object.entries(bpExamples).map(([k, v]) => [k, [...new Set(v)].slice(0, 3)]))
};
fs.writeFileSync(path.join(OUT, 'design-system/breakpoints.json'), JSON.stringify(breakpoints, null, 2));
console.log('breakpoints written:', Object.keys(bpCount).length, 'distinct conditions');

/* ---------- 2. CSS custom properties ---------- */
const cssVars = {};
for (const { name, text } of sheets) {
  for (const m of text.matchAll(/(--[a-zA-Z0-9-]+)\s*:\s*([^;}]+)/g)) {
    if (!cssVars[m[1]]) cssVars[m[1]] = { value: m[2].trim(), sources: [] };
    if (cssVars[m[1]].sources.length < 3) cssVars[m[1]].sources.push(name);
  }
}
fs.writeFileSync(path.join(OUT, 'design-system/css-variables.json'), JSON.stringify({ count: Object.keys(cssVars).length, variables: cssVars }, null, 2));
console.log('css variables:', Object.keys(cssVars).length);

/* ---------- 3. Hover / focus / active rules for site selectors ---------- */
const interesting = /(menu|post-title|heading|social|search|subscribe|offcanvas|smart-head|navigation|l-post|media|image-link|block-head|play|video|button|back-top|logo)/i;
const stateRules = { hover: [], focus: [], active: [], keyframes: [], transitions: [] };
for (const { name, text } of sheets) {
  // split into rules (crude but effective for minified CSS)
  for (const m of text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].trim();
    const body = m[2].trim();
    if (sel.includes(':hover') && interesting.test(sel) && body) stateRules.hover.push({ selector: sel.slice(0, 200), styles: body.slice(0, 300), file: name });
    if (sel.includes(':focus') && interesting.test(sel) && body) stateRules.focus.push({ selector: sel.slice(0, 200), styles: body.slice(0, 300), file: name });
    if (sel.includes(':active') && interesting.test(sel) && body) stateRules.active.push({ selector: sel.slice(0, 200), styles: body.slice(0, 300), file: name });
  }
  for (const m of text.matchAll(/@(-webkit-)?keyframes\s+([a-zA-Z0-9_-]+)\s*{/g)) {
    stateRules.keyframes.push({ name: m[2], file: name, vendor: m[1] ? '-webkit-' : '' });
  }
}
// transition declarations of interest
for (const { name, text } of sheets) {
  for (const m of text.matchAll(/([^{}]+)\{([^{}]*transition[^{}]*)\}/g)) {
    const sel = m[1].trim(); const body = m[2].trim();
    if (interesting.test(sel)) stateRules.transitions.push({ selector: sel.slice(0, 150), decl: (body.match(/transition[^;]*;/g) || []).join(' ').slice(0, 250), file: name });
  }
}
const dedupe = arr => { const seen = new Set(); return arr.filter(r => { const k = r.selector + '|' + (r.styles || r.decl); if (seen.has(k)) return false; seen.add(k); return true; }); };
stateRules.hover = dedupe(stateRules.hover).slice(0, 120);
stateRules.focus = dedupe(stateRules.focus).slice(0, 40);
stateRules.active = dedupe(stateRules.active).slice(0, 40);
stateRules.transitions = dedupe(stateRules.transitions).slice(0, 80);
fs.writeFileSync(path.join(OUT, 'design-system/visual-effects.json'), JSON.stringify({
  hoverRules: stateRules.hover, focusRules: stateRules.focus, activeRules: stateRules.active,
  keyframes: stateRules.keyframes, transitionDeclarations: stateRules.transitions
}, null, 2));
console.log('state rules:', stateRules.hover.length, 'hover /', stateRules.keyframes.length, 'keyframes /', stateRules.transitions.length, 'transitions');

/* ---------- 4. @font-face inventory ---------- */
const fonts = [];
for (const { name, text } of sheets) {
  for (const m of text.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
    const b = m[1];
    fonts.push({
      family: (b.match(/font-family\s*:\s*['"]?([^;'"]+)/) || [])[1]?.trim(),
      weight: (b.match(/font-weight\s*:\s*([^;}]+)/) || [])[1]?.trim(),
      style: (b.match(/font-style\s*:\s*([^;}]+)/) || [])[1]?.trim(),
      display: (b.match(/font-display\s*:\s*([^;}]+)/) || [])[1]?.trim(),
      src: (b.match(/src\s*:\s*([^;}]+)/) || [])[1]?.trim().slice(0, 400),
      unicodeRange: (b.match(/unicode-range\s*:\s*([^;}]+)/) || [])[1]?.trim().slice(0, 200),
      file: name
    });
  }
}
fs.writeFileSync(path.join(OUT, 'design-system/font-faces.json'), JSON.stringify({ count: fonts.length, fontFaces: fonts }, null, 2));
console.log('font-faces:', fonts.length);

/* ---------- 5. Cascade order (from link order in original HTML) ---------- */
const orig = fs.readFileSync(path.join(OUT, 'source/original-response.html'), 'utf8');
const linkOrder = [...orig.matchAll(/<link[^>]+rel=['"]stylesheet['"][^>]*>/g)].map(m => m[0]);
const order = linkOrder.map((l, i) => ({ order: i, tag: l.slice(0, 300) }));
fs.writeFileSync(path.join(OUT, 'data/css-cascade-order.json'), JSON.stringify({ count: order.length, links: order }, null, 2));
console.log('cascade link order:', order.length);

/* ---------- 6. Spacing scale (from computed geometry JSON) ---------- */
const geo = JSON.parse(fs.readFileSync(path.join(OUT, 'measurements/desktop/geometry-1920.json'), 'utf8'));
const spacing = { note: 'Margins/paddings/gaps computed at 1920px viewport from key components', components: [] };
for (const el of geo.elements) {
  if (el.missing || el.error) continue;
  const s = el.styles || {};
  if (s.margin || s.padding || s.gap || s.rowGap) {
    spacing.components.push({
      element: el.sel, rect: el.rect,
      margin: s.margin, padding: s.padding, gap: s.gap || s.rowGap, columnGap: s.columnGap,
      display: s.display, position: s.position, flexDirection: s.flexDirection
    });
  }
}
fs.writeFileSync(path.join(OUT, 'design-system/spacing.json'), JSON.stringify(spacing, null, 2));
console.log('spacing components:', spacing.components.length);
console.log('DONE');
