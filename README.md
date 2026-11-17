# Petro Times — pixel-perfect homepage replica

Pixel-accurate, production-ready replica of the [petrotimes.ir](https://petrotimes.ir/) homepage
(SmartMag design, Persian, RTL), built as a headless Next.js 16 front end with a
**backend-agnostic content layer** — the rendering contract is pure JSON; the content backend
can be written in any language (see `docs/API-CONTRACT.md`).

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

## Connecting the backend (any language)

The rendering contract is source-agnostic: components never know which data source produced the
page. Two modes are supported via environment variables:

| Variable | Values | Behavior |
|---|---|---|
| `CONTENT_API_MODE` | `snapshot` (default) / `remote` | selects the data source |
| `CONTENT_API_BASE_URL` | e.g. `https://api.example.com` | content backend base (required for `remote`) |
| `CONTENT_API_TOKEN` | any string | optional, sent as `Authorization: Bearer …` |
| `NEWSLETTER_API_URL` | e.g. `https://api.example.com/newsletter` | optional explicit newsletter upstream |

**Snapshot mode** (default) renders the fixed content snapshot bundled with the app —
deterministic, used by the visual regression suite. Works with zero configuration.

**Remote mode** — set `CONTENT_API_MODE=remote` and `CONTENT_API_BASE_URL` — the frontend
calls the external content backend (implementable in **any** language/framework):

- `GET  {base}/homepage`   → the full `HomepageData` JSON (articles pre-formatted, Jalali
  dates arrive as `dateText` — the backend owns calendar formatting)
- `POST {base}/newsletter` ← `{ "email": "…" }` → 2xx = subscribed

The **full HTTP/JSON contract** the backend must fulfill — including schemas, field rules and
an implementation checklist — is documented in **[`docs/API-CONTRACT.md`](docs/API-CONTRACT.md)**.
If the backend is unreachable or returns an invalid payload the app **falls back to the
snapshot automatically** (no white page).

Endpoints exposed by this app:

| Route | Description |
|---|---|
| `GET /api/homepage` | assembled homepage data (same contract as the renderer) |
| `POST /api/newsletter` | proxies subscriptions to the configured upstream; returns `501` until `CONTENT_API_BASE_URL`/`NEWSLETTER_API_URL` is configured |

> Widget selection (which post appears in which homepage slot) is owned by the backend — the
> frontend renders the slots exactly as delivered, so editorial control stays fully server-side.

## Project structure

```
src/app/page.tsx              → server component assembling the homepage
src/app/petro.css             → design tokens + all component styles (extracted values)
src/lib/content/              → types (the contract), snapshot loader, generic REST adapter, source selector
docs/API-CONTRACT.md          → the HTTP/JSON contract for the external content backend
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
- Deploy configuration is environment-based (`CONTENT_API_MODE`, `CONTENT_API_BASE_URL`,
  `CONTENT_API_TOKEN`, `DATABASE_URL`).
