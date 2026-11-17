#!/usr/bin/env bun
/**
 * Geometry conformance check — implementation vs live-site extraction.
 *
 * Compares getBoundingClientRect (docY/docX = client rect + scroll offset) of
 * 108 elements measured on the real petrotimes.ir (1920×1080) against the same
 * selectors mapped onto the implementation DOM (visual-tests/test-scripts/selectors.json).
 *
 * Usage:
 *   bun geometry-check.mjs [--url http://localhost:3000] [--width 1920] [--height 1080]
 *                          [--measure-only out.json] [--from measured.json]
 * Output: visual-tests/reports/geometry-check-<width>.json (+ console table)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : dflt;
};
const URL = arg('url', 'http://localhost:3000');
const W = Number(arg('width', 1920));
const H = Number(arg('height', 1080));
const MEASURE_ONLY = arg('measure-only', null);
const FROM = arg('from', null);
const REPORTS = join(HERE, '..', 'reports');
mkdirSync(REPORTS, { recursive: true });

const { map } = JSON.parse(readFileSync(join(HERE, 'selectors.json'), 'utf8'));

/** entry -> CSS selector string, or {union:[a,b], trailing?:n} bounding box of
 *  both selectors minus documented trailing whitespace inside the live box. */
function resolveSel(entry) {
  return typeof entry === 'string' ? entry : entry.union;
}

async function rectOf(sel) {
  const js = `(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return null; const r = el.getBoundingClientRect(); return {x: r.x, y: r.y, w: r.width, h: r.height, docX: r.x + window.scrollX, docY: r.y + window.scrollY}; })()`;
  const { $ } = await import('bun');
  const res = await $`agent-browser eval ${js}`.quiet().nothrow();
  const out = res.stdout.toString().trim();
  const s = out.indexOf('{');
  return s >= 0 ? JSON.parse(out.slice(s, out.lastIndexOf('}') + 1)) : null;
}

/* ---------------------------------------------------------------- measure */
async function measure() {
  // Build one eval expression returning [{ref, rect|rects, present}]
  const entries = map
    .map(([ref, mine]) => {
      const sel = typeof mine === 'string' ? mine : mine.union;
      if (typeof mine === 'string') {
        return `[${JSON.stringify(ref)}, ${JSON.stringify(mine)}]`;
      }
      return `[${JSON.stringify(ref)}, {union: ${JSON.stringify(sel)}}]`;
    })
    .join(',');
  const js = `(() => {
    const pairs = [${entries}];
    const sx = window.scrollX, sy = window.scrollY;
    const rectOf = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height, docX: r.x + sx, docY: r.y + sy };
    };
    return pairs.map(([ref, spec]) => {
      if (spec && spec.union) {
        const rs = spec.union.map(rectOf);
        if (rs.some(r => !r)) return { ref, present: false };
        const x = Math.min(...rs.map(r => r.x));
        const y = Math.min(...rs.map(r => r.y));
        const R = Math.max(...rs.map(r => r.x + r.w));
        const B = Math.max(...rs.map(r => r.y + r.h));
        return { ref, present: true, rect: { x, y, w: R - x, h: B - y, docX: x + sx, docY: y + sy } };
      }
      const r = rectOf(spec);
      return r ? { ref, present: true, rect: r } : { ref, present: false };
    });
  })()`;

  const { $ } = await import('bun');
  // viewport + load + eval through agent-browser CLI
  await $`agent-browser set viewport ${W} ${H}`.quiet();
  await $`agent-browser open ${URL} --timeout 60000`.quiet();
  try { await $`agent-browser wait --load networkidle --timeout 30000`.quiet(); } catch {}
  await new Promise(r => setTimeout(r, 2500));
  const res = await $`agent-browser eval ${js}`.quiet().nothrow();
  const out = res.stdout.toString().trim();
  // agent-browser prints the JSON on stdout
  const start = out.indexOf('[');
  const end = out.lastIndexOf(']');
  if (start < 0 || end < 0) {
    console.error('eval failed:', out.slice(0, 400), res.stderr.toString().slice(0, 200));
    process.exit(2);
  }
  return JSON.parse(out.slice(start, end + 1));
}

/* ---------------------------------------------------------------- compare */
function compare(actual, extraction) {
  const expected = new Map(extraction.elements.map(e => [e.sel, e.rect]));
  const opts = new Map(map.map(([ref, mine]) => [ref, typeof mine === 'string' ? {} : (mine.options ?? mine)]));
  const rows = [];
  for (const a of actual) {
    const exp = expected.get(a.ref);
    const o = opts.get(a.ref) ?? {};
    const row = { sel: a.ref, present: a.present, expected: exp ?? null, actual: a.rect ?? null };
    if (!exp) row.note = 'no-extraction-entry';
    else if (!a.present) row.note = 'missing-in-impl';
    else {
      const adj = (v) => v;
      // trailing: live extraction box includes N px of invisible block-space
      // below the content that the impl element does not contain.
      const trailing = o.trailing ?? 0;
      const d = (k) => Math.round((a.rect[k] - exp[k]) * 10) / 10;
      const dh = Math.round((a.rect.h - (exp.h - trailing)) * 10) / 10;
      row.delta = { docY: d('docY'), h: dh, docX: d('docX'), w: d('w') };
      row.maxAbs = Math.max(
        Math.abs(row.delta.docY), Math.abs(row.delta.h),
        Math.abs(row.delta.docX), Math.abs(row.delta.w)
      );
      row.status = row.maxAbs <= 1 ? 'PASS' : row.maxAbs <= 2 ? 'NEAR' : 'FAIL';
      if (trailing) row.trailing = trailing;
    }
    rows.push(row);
  }
  return rows;
}

/* ------------------------------------------------------------------- main */
let actual;
if (FROM) {
  actual = JSON.parse(readFileSync(FROM, 'utf8'));
} else {
  actual = await measure();
}
if (MEASURE_ONLY) {
  writeFileSync(MEASURE_ONLY, JSON.stringify(actual, null, 1));
  console.log(`measured ${actual.length} selectors -> ${MEASURE_ONLY}`);
  process.exit(0);
}

const extPath = join(HERE, '..', '..', 'petrotimes-extraction', 'measurements', 'desktop', `geometry-${W}.json`);
let extraction = null;
try { extraction = JSON.parse(readFileSync(extPath, 'utf8')); } catch {}

const summary = { url: URL, viewport: { w: W, h: H }, sampledAt: new Date().toISOString(), rows: [], counts: { PASS: 0, NEAR: 0, FAIL: 0, missing: 0 } };

console.log(`\nGEOMETRY CHECK  impl=${URL}  vs  extraction@${W}x${H}`);
console.log('='.repeat(96));
const fmt = (v) => (v == null ? '—' : typeof v === 'number' ? Math.round(v * 10) / 10 : v);
for (const row of extraction ? compare(actual, extraction) : actual.map(a => ({ sel: a.ref, present: a.present }))) {
  summary.rows.push(row);
  if (row.status) summary.counts[row.status]++;
  if (row.note === 'missing-in-impl') summary.counts.missing++;
  const line = row.expected
    ? `${row.sel.padEnd(58)} dy=${fmt(row.delta?.docY).toString().padStart(6)} dh=${fmt(row.delta?.h).toString().padStart(6)} dx=${fmt(row.delta?.docX).toString().padStart(6)} dw=${fmt(row.delta?.w).toString().padStart(6)}  ${row.status ?? row.note}`
    : `${row.sel.padEnd(58)} ${row.note ?? ''}`;
  console.log(line);
}
console.log('='.repeat(96));
console.log('counts:', summary.counts);
writeFileSync(join(REPORTS, `geometry-check-${W}.json`), JSON.stringify(summary, null, 1));
console.log(`report -> visual-tests/reports/geometry-check-${W}.json`);
