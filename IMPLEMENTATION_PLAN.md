# IMPLEMENTATION_PLAN — Petro Times Homepage (Pixel-Perfect, Phase 02)

> Status: ACTIVE — implementation executed in this repository.
> Source of truth: `petrotimes-extraction/` (real browser extraction of https://petrotimes.ir/,
> Chromium 157, 2026-11-15). All values below are taken from measured geometry
> (`measurements/desktop/geometry-1920.json`), real CSS (`source/stylesheets/28-rtl.css*` = SmartMag
> RTL theme, `16-post-7322.css` = page 7322 overrides, `17-post-7373.css` = footer overrides),
> the fixed content snapshot (`data/homepage-snapshot.json`) and the reference screenshots.

---

## 1. Technology Decision & Rationale

| Option considered | Verdict | Reason |
|---|---|---|
| WordPress Native/Child theme (PHP) | Rejected **for this delivery environment** | No WordPress installation, no DB, no admin access exists in this execution environment. Delivering un-runnable PHP would violate "nothing may remain pseudocode". |
| Astro / plain static HTML | Rejected | No data-layer story for dynamic WordPress news; weaker component/test tooling here. |
| **Next.js 16 (App Router) + TypeScript + hand-written CSS** | **Selected** | Component architecture, server data layer with a swappable WordPress adapter, full control of every CSS declaration (no framework preflight imposed on the design), RTL native, production build tooling, headless browser available for visual regression. |

**WordPress stays the CMS** (per prompt default). Integration strategy:

- `src/lib/wp/types.ts` — domain types (Article, SectionData, TickerItem …).
- `src/lib/wp/snapshot.ts` — loads the fixed homepage snapshot (test environment source, exactly the
  content captured from the live site).
- `src/lib/wp/wordpress.ts` — live adapter: fetches `wp-json/wp/v2` (posts/categories/media) when
  `WP_BASE_URL` is configured; maps REST payloads to the same domain types.
- `src/lib/wp/index.ts` — `getHomepageData()` selects the source (`WP_MODE=snapshot|live`,
  default `snapshot`).
- `GET /api/homepage` — REST endpoint exposing the same data (used by tests + external consumers).
- The **market ticker keeps its real iframe URL** (`https://market.petrotimes.ir`) exactly as the
  live site embeds it, with a native fallback replica (same extracted CSS/geometry) that renders if
  the iframe cannot load, so the 38px strip is never blank.

**CSS policy:** The page is styled with a dedicated stylesheet tree written from the extracted
SmartMag/Elementor values (design tokens as CSS custom properties + one stylesheet per component
layer). Tailwind preflight/utilities are **not** applied to this page so no framework default
changes the appearance.

## 2. Architecture

```
src/app/
  layout.tsx            → html[lang=fa-IR][dir=rtl], font preloads, metadata
  page.tsx              → server component: assembles the homepage from the data layer
  petro.css             → token layer (design system) + base + layout + all component styles
  api/homepage/route.ts → data endpoint
src/components/petro/
  SmartHeader.tsx        (desktop header 63px, sticky-smart)
  MobileHeader.tsx       (48px, ≤1024)
  OffCanvasMenu.tsx      (right drawer 370px + What's Hot + subscribe)
  SearchModal.tsx        (fullscreen dark search)
  MarketTicker.tsx       (iframe + native fallback, 38px)
  PostMeta.tsx, PostTitle… shared bits inside cards
  SmallPostCard.tsx      (110×76 thumb cards — hero-secondary, top-news, playlist, footer, what's-hot)
  HighlightsHero.tsx     (main featured 384px)
  TvSection.tsx          (dark overlay video + playlist)
  MagazineSlider.tsx     (carousel 3:4, arrows on hover, autoplay)
  FeatureTitle.tsx       (heading + 3 ranked items)
  SocialWidget.tsx       (2×3 colored buttons)
  NewsletterWidget.tsx   (subscribe card)
  EnergySection.tsx      (featured + 2 secondary + 3-col grid)
  AdvertiseRow.tsx       (2 banners, negative offset)
  SiteFooter.tsx         (3 columns + copyright)
  TickerNative.tsx       (fallback marquee)
src/data/homepage-snapshot.json   (fixed content = live capture)
src/lib/wp/*                      (data layer as above)
public/assets/{images,fonts,icons,logos}/ (real extracted assets, no screenshots cropped)
visual-tests/            (Playwright pixel tests, baselines/diffs/reports)
```

## 3. Layout Math (verified at 1920px — geometry-1920.json)

- Viewport 1920 → container (`--main-width`) 1200px centered: x=360..1560.
- Header 63px black (`#000`), shadow `0 3px 4px #0a0a0a`; inner wrap 1200.
  RTL order (right→left): offcanvas toggle 26×45 @x1534 · logo 258.5×63 @x1261 · nav 832px (9 items,
  `صفحه اصلی` current item rendered `#000` on `#000` — faithful to live) · search icon 19×45 @x360.
- Ticker strip: widget box 45px total (iframe 38px, inline baseline gap 7px), white, shadow
  `0 4px 8px rgba(0,0,0,.1)`, y=63..108.
- **Section A (TOP NEWS)** y=108..1723: content column x=772..1560 (788px) + sidebar x=360..716 (356px).
  - Hero widget (384×462) at x=1176 (right), image 16:9 (384×216), title 21px/900 (2 lines max),
    meta row (category · date 11px #8a8a8a), excerpt 15px #505050.
  - Secondary cards: 4× (384×76, thumb 110×76 right, text 256px, row-gap 10px), x=772 (left).
  - TV block (788×652) dark: block-head (chip `TV` black bg + `PETRO TIMES`), overlay media
    ratio-4-3 (788×591→ but measured media 788×~475 with head 33 + gaps), play icon circle center,
    cat chip `نفت`, white title 28px centered, date rgba(255,255,255,.65).
  - TV playlist (788×501) black bg, padding 25/35/20/35, 5 rows 718×76 (row gap 18, item pad 14),
    thumb 110 right, title 17px #ececec, date 65% white.
  - Sidebar: TOP NEWS chip (14px/600 white on #161616, pad 9/14, r2) + 1st item (356×78) +
    3 more items (78px, 15px gaps) → y 108..526; MAGAZINE (356×569) y=546 (margin-top 10 + pad-bottom 45
    of previous → 20px gap): 3:4 cover 356×474.67, arrows on hover, autoplay;
    FEATURE TITLE heading (21px/600, width 40.363% ≈144px, 2 lines) y=1115; 3 ranked items
    (rank png 28×28 right, title 15px, meta cat+date, row-gap 30px) y=1198..1397.
- **Section B (ENERGY)** y=1758..2842: content 788 + sidebar 356.
  - Energy hero 788×685: head 24px, image 16:9 (788×443), title 21px/700, meta, excerpt; 2 secondary
    cards (788×76/78, gap 20 → y 2443, 2539); 3-col grid 249×195 (margins 4px, gutter 20): ADS, banner, ADS.
  - Sidebar: WE ARE SOCIAL (356×222, margin-bottom 45): heading + 2-col grid of 173×36 buttons
    (icon right in tinted box, label, radius 2, 12px); NEWSLETTER (356×349): bg #f7f7f7-ish card,
    envelope watermark, heading, text, input 284×44 (border #ddd), blue button rgb(27,97,200),
    disclaimer + checkbox.
- **ADVERTISE** y=2865..3183 (section margin-top −52 net of gaps): 5×231 columns, gap 15, first two
  (right) filled: banner 231×129.6 (ar-bunyad-thumb 16:9), title 15px centered, date centered gray.
- **FOOTER** y=3203..3746: black; 3 columns (right→left): ABOUT US 324px (x1236) / بیشترین بازدید روز
  399px (x801) / اخرین اخبار 397px (x368); headings 20px/600 white; posts = small-post thumb-right
  110×~62, title 2-line clamp #ececec→#fff hover, date 65% white; sep lines rgba(255,255,255,.08);
  ABOUT US: logo 324×38 white version, PT Serif text 13px #ccc, Email Us line, 5 social icons;
  copyright bar 41px black: `حق نشر © 2026 Petro Times` centered (rendered as
  "Petro Times 2026 © حق نشر" by RTL bidi — same as live).

## 4. Breakpoints (real, from CSS @media frequency + measured swaps)

| Range | Rules |
|---|---|
| ≥1201 | container 1200, columns 824/412 grid (content 788 + sidebar 356 with 20px inner gutters), menu 15px |
| 941–1200 | container = viewport − 2×wrap-padding(35); menu 14px |
| ≤1024 | desktop header hidden → mobile header 48px (search left, logo center, burger right) |
| ≤940 | columns stack to single 788/716 column flow (sidebar widgets below content) |
| ≤767 | full single column; playlist/energy-grid reflow |
| ≤540 | hero title 20px, card titles 14px, grid/ads single column, social 2-col, footer hides `بیشترین بازدید روز` col (hidden-mobile) |
| ≤350 | micro adjustments |

## 5. Development Stages

| # | Stage | Output |
|---|---|---|
| 1 | Asset migration | public/assets (fonts/images/logos/icons/ticker svgs) |
| 2 | Token layer (`petro.css`) | colors/typography/spacing/breakpoints as CSS custom props + @font-face |
| 3 | Chrome components | header, mobile header, off-canvas, search modal, ticker |
| 4 | Card system | SmallPostCard + meta variants (light/dark) |
| 5 | Sections A/B | hero, TV, magazine, feature, social, newsletter, energy, ads |
| 6 | Footer + copyright | 3 columns + bar |
| 7 | Data layer | types + snapshot + WP adapter + /api/homepage |
| 8 | Interactions | sticky smart header, search modal, off-canvas, hovers, magazine slider, ticker marquee fallback |
| 9 | Responsive pass | all breakpoint behaviors above |
| 10 | Visual regression | Playwright: 1920/1440/1366/1280/1024/834/768/430/390/375/360 vs baselines; pixelmatch diffs |
| 11 | Correction loop | INSPECT→COMPARE→IDENTIFY→FIX→RETEST until targets met |
| 12 | Reports | TEST_REPORT.md, VISUAL_REGRESSION_REPORT.md, LIMITATIONS.md, README/INSTALLATION |

## 6. Test Strategy

- `bun run lint` clean; dev server runs; `/api/homepage` returns snapshot JSON.
- Playwright (`visual-tests/`): same viewport/DPR, fonts ready (`document.fonts.ready`), images
  settled, live-content masked (ticker iframe region) per snapshot rules.
- Component-level shots: header, ticker, hero, tv, magazine, feature, social, newsletter, energy,
  ads, footer — compared against `petrotimes-extraction/screenshots/**`.
- Geometry assertions (key elements at 1920): container x=360 w=1200; header h=63; ticker 45;
  hero 384×462 @x1176; cards 384×76 @x772; TV 788×652; playlist rows 718×76; sidebar widgets 356;
  footer columns 324/399/397; copyright 41px. Tolerance ≤ 1 CSS px (MP02 §16).

## 7. Known Constraints (carried from extraction)

- Live ticker feed currently renders `N/A (N/A)` — reproduced as the default fallback state.
- Menu current item (`صفحه اصلی`) is `#000` on `#000` on the live site — reproduced faithfully.
- `Vazir-Bold` exists only as `.woff` (site's `.woff2` URL is typo'd/404) — same files registered.
- TV play interaction could not be verified headless; play button is rendered, click opens the
  article URL (video player backend is a WordPress plugin — documented dependency).
- Newsletter form is rendered and validated client-side; submission endpoint is CF7 (external) —
  documented, not faked.
