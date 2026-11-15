# LIMITATIONS — Petro Times Homepage Extraction (Phase 01)

This file lists every item that could not be fully extracted, was unavailable, or behaves
differently under automated capture. Nothing below was guessed; each item states exactly
what is known and what is not.

## 1. JS-Delayed Rendering (WP Rocket "Delay JS Execution")

- All theme scripts (jQuery bundle, SmartMag JS) are held until user interaction.
- **Impact:** On a fresh load with no interaction, `<span data-bgsrc data-bgset class="lazyload">`
  news thumbnails never receive their `background-image`, and the market iframe marquee JS may
  not run.
- **Mitigation performed:** Synthetic interaction (`mousemove/keydown/scroll/wheel` dispatch +
  real mouse wheel) was used to trigger the delayed scripts. Final-state measurements and
  screenshots were taken after all 39 lazy backgrounds resolved (`lazyloaded` class + inline
  `background-image`).
- **Residual risk:** Sub-1600ms first-paint states differ from the captured final state. If
  pixel-perfect *initial* paint reproduction is required, WP Rocket's delayed-queue composition
  must be read from `data/` (see `source/original-response.html`, `rocket-browser-checker`).

## 2. Market Ticker Values Render N/A

- The ticker iframe (`market.petrotimes.ir`, 1920×38px) polls `fetch_prices.php`.
- At capture time every value for all 15 commodities rendered `N/A (N/A)` (green "positive" style).
- Structure, CSS, item geometry, commodity list, and the polling script WERE fully extracted
  (`data/market-iframe.json`, `source/market-iframe-dom.html`).
- **Unknown:** whether N/A is a temporary feed outage or the standing behavior of the feed.
  Reproduction should implement the exact same N/A fallback rendering as the live site.

## 3. TV Video Playback

- The big TV overlay play button was not activatable by headless automation (element reported
  "not visible" to the click engine — likely a transformed overlay state).
- `screenshots/interactions/tv-play-clicked.png` shows the page state after the click attempt:
  no lightbox opened, no video element appeared.
- **Unknown:** the exact player used on click (featured-video-plus + post-featured-video plugins
  are loaded; their CSS is captured in `source/stylesheets/32-pfv-videopopup.css`).
- Video URLs of playlist items were not exposed in the DOM (links are internal post links).

## 4. Server-Side News Selection Logic

- Which posts appear in each widget (hero, top-news list, energy, magazine, footer lists) is
  decided by Elementor/SmartMag widget settings stored in the database (page 7322 + template 7373).
- The REST API exposes posts and categories but not the widget query configuration.
- **Extracted instead:** the complete live result per widget with post IDs/titles/dates/URLs in
  `data/homepage-snapshot.json` — enough to reproduce today's content, not the selection rule.
- **Required from client (for Phase 2 implementation):** export of Elementor template JSON for
  page 7322 and template 7373, or admin access to the widget settings.

## 5. Fonts Declared but Missing on Server (404)

- `parsi-font/fonts.css` declares IRANSans (9 files), IRANYekan (12 files) — **all return HTTP 404**.
- `Vazir-Bold.wof2f` — filename typo inside the CSS itself (`woff2` misspelled); that declaration fails.
- Net effect: only Vazir (400/700), Barlow, PT Serif, ts-icons actually load. Reproduction must
  NOT include the 404 fonts (or must replicate the exact same silent-failure behavior).

## 6. Full-Page Screenshot Sticky-Header Artifact

- The desktop header is sticky; in Playwright full-page captures the sticky header can render at
  an intermediate scroll offset (visible on `screenshots/tablet/full-page-768.png` where the
  mobile header band appears mid-page).
- Viewport-sized screenshots (`screenshots/interactions/*`) are authoritative for header positioning.
- `measurements/*.json` y-coordinates are DOM-flow positions, unaffected by this artifact.

## 7. Interactive States Not Reproducible via Computed Style

- `:hover` / `:focus` exact visual states were captured from the stylesheet rules (real CSS) and
  one live hover measurement (hero title color rgb(22,22,22) → rgb(0,0,0)). Full per-element
  hover screenshots were not taken for every card; the CSS rules in
  `design-system/visual-effects.json` are the source of truth for hover styling.

## 8. Newsletter Submission

- Form structure, fields, placeholders, and CF7 endpoint (`contact-form-7/v1` namespace) were recorded.
- **Deliberately not submitted** (per task rules) — the POST behavior/validation UI is unverified.

## 9. WordPress Backend

- Widget settings, ACF/custom fields, user data, DB schema: **UNAVAILABLE** (no admin access; none requested).
- REST API public surface documented in `data/api-endpoints.json`.

## 10. Encoding Note

- `X-WP-Total: 159` posts; only 159 total posts exist — the homepage widget counts (e.g., footer
  lists of 4) are fed from the same pool; ordering beyond "latest first" is server-side.

## 11. Viewport Sampling vs Real Breakpoints

- The 12 tested widths are **sample points**, not the site's breakpoints.
- Real breakpoints extracted from CSS: 1201px, 1200px, 1100px, 1025px/1024px, 992px/991px,
  941px/940px, 900px, 800px, 782px, 768px/767px, 600px, 541px/540px, 480px, 479px, 350px.
- Header swap (desktop→mobile) measured at 1024→834 boundary (desktop header hidden ≤1024).
