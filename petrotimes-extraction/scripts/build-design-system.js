/**
 * Petro Times — Aggregate design-system colors.json + typography.json
 * Combines: computed palette (browser), CSS-declared palette (stylesheets), font usage
 * Run: node /home/z/my-project/petrotimes-extraction/scripts/build-design-system.js
 */
const fs = require('fs');
const path = require('path');
const OUT = '/home/z/my-project/petrotimes-extraction';
const CSS_DIR = path.join(OUT, 'source/stylesheets');

const files = fs.readdirSync(CSS_DIR).filter(f => f.includes('.css')).sort();

/* ---- CSS-declared colors ---- */
const colorDecls = new Map(); // value -> {count, properties:Set, files:Set}
const colorProps = ['color', 'background', 'background-color', 'border-color', 'border', 'fill', 'stroke', 'outline-color', 'box-shadow', 'text-shadow', 'background-image'];
for (const f of files) {
  const text = fs.readFileSync(path.join(CSS_DIR, f), 'utf8');
  for (const m of text.matchAll(/([a-z-]+)\s*:\s*([^;{}]+)/g)) {
    const prop = m[1].trim().toLowerCase();
    if (!colorProps.includes(prop)) continue;
    const val = m[2].trim();
    const hexes = val.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
    const rgbs = val.match(/rgba?\([^)]+\)/g) || [];
    for (const c of [...hexes, ...rgbs]) {
      const norm = c.toLowerCase();
      if (!colorDecls.has(norm)) colorDecls.set(norm, { value: norm, count: 0, properties: new Set(), files: new Set() });
      const e = colorDecls.get(norm);
      e.count++;
      e.properties.add(prop);
      e.files.add(f.replace(/-\d+-/, ''));
    }
  }
}
const declared = Array.from(colorDecls.values()).map(e => ({ value: e.value, occurrences: e.count, usedIn: Array.from(e.properties), sourceFiles: Array.from(e.files).slice(0, 3) })).sort((a, b) => b.occurrences - a.occurrences);

/* ---- computed palette merge ---- */
let computed = { computedPalette: [], cssCustomProperties: {} };
try { computed = JSON.parse(fs.readFileSync(path.join(OUT, 'design-system/colors-computed.json'), 'utf8')); } catch (e) {}

/* ---- semantic map (verified from computed measurements) ---- */
const semantic = {
  headerBackground: { value: 'rgb(0, 0, 0)', hex: '#000000', evidence: 'measured #smart-head .smart-head-row backgroundColor' },
  headerLinkText: { value: 'rgb(240, 240, 240)', hex: '#f0f0f0', evidence: 'measured #smart-head .menu > li > a color (240,240,240)' },
  headerCurrentItem: { value: 'rgb(0, 0, 0)', hex: '#000000', evidence: 'current-menu-item link color = black on black header (visually hidden) - verified in screenshot' },
  bodyText: { value: 'rgb(68, 68, 68)', hex: '#444444', evidence: 'measured body color' },
  headingText: { value: 'rgb(22, 22, 22)', hex: '#161616', evidence: 'measured post-title color' },
  excerptText: { value: 'rgb(80, 80, 80)', hex: '#505050', evidence: 'measured .excerpt color' },
  metaDateText: { value: 'rgb(138, 138, 138)', hex: '#8a8a8a', evidence: 'measured .meta-item.date color' },
  darkSectionText: { value: 'rgb(236, 236, 236)', hex: '#ececec', evidence: 'measured TV playlist title color (s-dark)' },
  darkSectionDate: { value: 'rgba(255, 255, 255, 0.65)', hex: '#ffffffa6', evidence: 'measured TV playlist date color' },
  newsletterInputBg: { value: 'rgb(255, 255, 255)', hex: '#ffffff', evidence: 'measured newsletter input' },
  newsletterInputText: { value: 'rgb(119, 119, 119)', hex: '#777777', evidence: 'measured input placeholder color' },
  tickerPositive: { value: 'green (CSS keyword)', hex: '#008000', evidence: 'market-iframe inline CSS .market-change.positive' },
  tickerNegative: { value: 'red (CSS keyword)', hex: '#ff0000', evidence: 'market-iframe inline CSS .market-change.negative' }
};

const colorsOut = {
  generatedAt: new Date().toISOString(),
  semanticMap: semantic,
  computedFromBrowser: computed.computedPalette,
  cssCustomPropertiesFromBrowser: computed.cssCustomProperties,
  declaredInStylesheets: { total: declared.length, top100: declared.slice(0, 100) },
  notes: [
    'All values are real extracted values (computed styles at 1920px viewport + stylesheet declarations).',
    'SmartMag theme uses a light skin (site-s-light) with dark header (s-dark rows) and dark TV section.',
    'The ticker values are green/red CSS keywords from the market.petrotimes.ir inline stylesheet.'
  ]
};
fs.writeFileSync(path.join(OUT, 'design-system/colors.json'), JSON.stringify(colorsOut, null, 2));

/* ---- typography.json ---- */
let fontFaces = [];
try { fontFaces = JSON.parse(fs.readFileSync(path.join(OUT, 'design-system/font-faces.json'), 'utf8')).fontFaces; } catch (e) {}
const roles = JSON.parse(fs.readFileSync(path.join(OUT, 'design-system/typography-roles.json'), 'utf8'));

// which fonts actually render
const familiesUsed = new Map();
for (const r of roles.roles || []) {
  if (!r.fontFamily) continue;
  const fam = r.fontFamily.split(',')[0].replace(/["']/g, '').trim();
  if (!familiesUsed.has(fam)) familiesUsed.set(fam, { roles: [] });
  familiesUsed.get(fam).roles.push(r.role + ' @' + r.fontSize);
}

const typography = {
  generatedAt: new Date().toISOString(),
  primaryFamilies: {
    persian: { family: 'Vazir', weightsLoaded: [400, 700], source: 'wp-content/plugins/parsi-font/assets/fonts/Vazir/ (woff2, woff, ttf, eot)', evidence: 'measured body font-family; Vazir.woff + Vazir-Bold.woff seen in network manifest' },
    latinDisplay: { family: 'Barlow', weightsLoaded: ['400','500','600','700'] + ' (google-fonts cache)', source: 'wp-content/cache/fonts/1/google-fonts/...barlow...woff2', evidence: 'headings for English labels (TOP NEWS, MAGAZINE, ENERGY...) and smart-head' },
    latinSerif: { family: 'PT Serif', source: 'google-fonts cache', evidence: 'footer about text + logo serif style' },
    icons: { family: 'ts-icons', source: 'wp-content/themes/smart-mag/css/icons/fonts/ts-icons.woff2?v3.2', evidence: 'play icons, search icon, social glyphs' }
  },
  fontFamiliesByRole: Object.fromEntries([...familiesUsed.entries()].map(([k, v]) => [k, v.roles.slice(0, 12)])),
  measuredRoles: roles.roles,
  fontFaceDeclarations: fontFaces,
  unavailableFonts: [
    { family: 'IRANSans', issue: 'referenced in parsi-font/fonts.css but files return HTTP 404 on server', files: ['woff2', 'woff', 'ttf', 'eot', 'Medium', 'Light', 'UltraLight'] },
    { family: 'IRANYekan', issue: 'referenced in parsi-font/fonts.css but files return HTTP 404 on server' },
    { family: 'Vazir-Bold (wof2f)', issue: 'broken filename typo "Vazir-Bold.wof2f" inside parsi-font fonts.css @font-face src — declaration fails silently' }
  ],
  rtlNotes: {
    direction: 'rtl on <html> (fa-IR)',
    dateOrder: 'Persian date then time: "۲۹ مرداد ۱۴۰۵ - ۰۹:۰۴"',
    justify: 'post excerpts inherit direction rtl; text-align measured per role (see measuredRoles)',
    bidi: 'unicode-bidi normal; English tokens inside Persian text (PP, TV) use natural LTR runs'
  }
};
fs.writeFileSync(path.join(OUT, 'design-system/typography.json'), JSON.stringify(typography, null, 2));
console.log('colors.json: declared', declared.length, '| semantic keys:', Object.keys(semantic).length);
console.log('typography.json: font-faces', fontFaces.length, '| families:', [...familiesUsed.keys()].join(', '));
console.log('DONE');
