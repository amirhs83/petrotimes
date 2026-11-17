# Petro Times — pixel-perfect homepage replica

Pixel-accurate, production-ready replica of the [petrotimes.ir](https://petrotimes.ir/) homepage
(WordPress + SmartMag theme, Persian, RTL), built as a headless Next.js 16 front end with a
swappable WordPress data adapter.

- **Source of truth:** `petrotimes-extraction/` — real-browser extraction of the live site
  (measured geometry, real CSS, fixed content snapshot, reference screenshots at 12 widths).
- **Status:** verified with a Playwright + Pixelmatch visual regression suite
  (`visual-tests/`) and a geometry checker (`visual-tests/test-scripts/geometry-check.mjs`).

## Quick start

```bash
bun install
cp .env.example .env      # adjust if needed
bun run db:push           # Prisma/SQLite (newsletter + future features)
bun run dev               # http://localhost:3000
```

## Connecting the backend (WordPress)

The rendering contract is source-agnostic: components never know which data source produced the
page. Two modes are supported via environment variables:

| Variable | Values | Behavior |
|---|---|---|
| `WP_MODE` | `snapshot` (default) / `live` | selects the data source |
| `WP_BASE_URL` | e.g. `https://petrotimes.ir` | WordPress REST API base (required for `live`) |

**Snapshot mode** (default) renders the fixed content snapshot captured from the live site —
deterministic, used by the visual regression suite.

**Live mode** — set `WP_MODE=live` and `WP_BASE_URL` — assembles the homepage from the public
WordPress REST API:

- `GET /wp-json/wp/v2/posts?per_page=40` → articles (title, link, jalali date, category, featured image)
- `GET /wp-json/wp/v2/categories?per_page=100` → category names/links
- Static chrome (market ticker, social links, newsletter copy, footer about, off-canvas menu)
  is reused from the snapshot because it is not exposed by the REST API.
- If the API is unreachable the app **falls back to the snapshot** automatically (no white page).

Endpoints exposed by this app:

| Route | Description |
|---|---|
| `GET /api/homepage` | assembled homepage data (same contract as the renderer) |
| `POST /api/newsletter` | proxies subscriptions to the WordPress Contact Form 7 endpoint; returns `501` until `WP_BASE_URL` is configured |

> Widget selection (which post appears in which homepage slot) lives in the Elementor template
> (page 7322) and is not exposed by the REST API. The live adapter therefore uses documented
> selection rules (latest per section/category) — see `src/lib/wp/wordpress.ts`. Once the client
> provides the Elementor template export, the rules can be replaced without touching components.

## Project structure

```
src/app/page.tsx              → server component assembling the homepage
src/app/petro.css             → design tokens + all component styles (extracted values)
src/lib/wp/                   → types, snapshot loader, WordPress live adapter, source selector
src/components/petro/         → Chrome, header/footer, section components (1:1 with live DOM)
src/data/homepage-data.json   → fixed content snapshot
src/app/api/                  → /api/homepage, /api/newsletter
petrotimes-extraction/        → Phase-01 extraction artifacts (measurements, CSS, screenshots)
visual-tests/                 → baselines / actual / diffs / reports / test-scripts
```

## Visual regression

```bash
cd visual-tests/test-scripts
python3 capture.py    # captures the implementation at 12 widths (Playwright)
python3 compare.py    # Pixelmatch vs baselines + per-band worst-area report
node geometry-check.mjs  # DOM geometry vs live selectors (tolerance PASS/NEAR/FAIL)
```

Reports land in `visual-tests/reports/` (`visual-regression.json`, `geometry.json`).

## Notes

- **RTL everywhere** (`html[dir=rtl]`, Persian typography with Vazir/Barlow/PT Serif matching the
  live theme stack).
- The market ticker keeps the site's real iframe URL (`market.petrotimes.ir`) with a native
  fallback replica so the strip is never blank.
- Production is read-only for this delivery; deploy configuration is environment-based
  (`WP_MODE`, `WP_BASE_URL`, `DATABASE_URL`).
