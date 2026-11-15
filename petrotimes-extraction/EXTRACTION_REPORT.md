# EXTRACTION REPORT — Petro Times Homepage (Phase 01)

وب‌سایت هدف: `https://petrotimes.ir/` — بازکردن در Chromium واقعی (Headless 157)، استخراج
DOM/CSS/هندسه/تایپوگرافی/رنگ/دارایی‌ها/رفتار تعاملی/معماری داده — همه مقادیر گزارش‌شده در
این سند از مرورگر واقعی یا فایل‌های واقعی سرور استخراج شده‌اند (هیچ حدسی درج نشده است).

- زمان استخراج: 2026-11-15 (ساعت سرور هدف: 2026-11-15 06:55 GMT — last-modified)
- UA: Chrome 157 / Windows — viewport اصلی 1920×1080 — locale: fa-IR
- درخواست‌های شبکه ثبت‌شده: **123** (0 خطا)
- DOM: 1107 عنصر، 42 article، 39 lazy-background، 1 iframe، 52 اسکریپت، 46 استایل‌شیت
- Performance واقعی صفحه هدف: responseStart→domInteractive≈2.1s، load≈2.93s،
  HTML فشرده 36.4KB / باز‌شده 199.4KB

---

## 1) ساختار کامل صفحه اصلی (Top → Bottom)

مختصات Y بر اساس layout واقعی در 1920px (منبع: `data/dom-tree.json`، `measurements/desktop/geometry-1920.json`):

| # | Y | ارتفاع | بخش | سلکتور واقعی | یادداشت |
|---|---|---|---|---|---|
| 1 | 0 | 63 | **Main Header** (مشکی) | `#smart-head.smart-head-a` → `.smart-head-row.s-dark` | sticky هنگام اسکرول؛ ردیف واحد |
| 2 | 63 | 45 | **Market Ticker** | `[data-id="1c95847"]` → `iframe` 1920×38 | iframe از market.petrotimes.ir — sticky نیست |
| 3 | 108 | 1615 | **بخش TOP NEWS + TV** | `.elementor-7322 > section:nth-child(2)` — ستون content 824px + sidebar 412px | RTL: content راست، sidebar چپ |
| 3.1 | 108 | 462 | اخبار اصلی (Hero) | `[data-id="cedc57a"]` smartmag-highlights (384px) | تصویر 384×~230، تیتر 21px/900 |
| 3.2 | 108..457 | 4×76 | ۴ کارت خبری فرعی | `[data-id="8316c3e|7f377e8|bf02a19|791af3e"]` smartmag-postssmall (384px) | thumbnail 110×76 سمت راست کارت |
| 3.3 | 570 | 652 | **TV PETRO TIMES** | `[data-id="53fa308"]` smartmag-overlay (788px، اسکیم تاریک) | ویدیوی بزرگ + برچسب TV |
| 3.4 | 1222 | 501 | پلی‌لیست TV | `[data-id="c258178"]` smartmag-postssmall — ۵ آیتم | تیتر 17px، تاریخ سفید 65% |
| 3.5 | 108..526 | — | **TOP NEWS لیست** | `[data-id="a11540e"]` + ۳ ویجت postssmall (356px sidebar) | لیبل مشکی "TOP NEWS" |
| 3.6 | 546 | 569 | **MAGAZINE** | `[data-id="c074dc7"]` smartmag-overlay | اسلایدر جلد مجله (۵ اسلاید) |
| 3.7 | 1115 | ~267 | **FEATURE TITLE** | heading `[data-id="d43218c"]` + ۳ بلوک (image 28px + smartmag-grid) | آیکون‌های رتبه PNG 28×28 |
| 4 | 1758 | 1084 | **بخش ENERGY** | section سوم — content 824 + sidebar 412 | |
| 4.1 | 1758 | 685 | اخبار اصلی انرژی | `[data-id="2517f37"]` smartmag-highlights (788px) | تصویر تمام‌عرض ستون |
| 4.2 | 2443/2539 | 76/78 | ۲ خبر فرعی | `[data-id="ebc9ae9|4ed4320"]` | |
| 4.3 | 2647 | 195 | گرید ۳ ستونه | `[data-id="1635d4c|5fabf63|4957a9a"]` (249px هر ستون) | ۲ کاشی ADS + ۱ تصویر |
| 4.4 | 1758..2329 | — | **WE ARE SOCIAL** + **Newsletter** | `[data-id="2a4da1e"]` (222px) + `[data-id="9609692"]` (349px) | در ستون sidebar بخش 4 |
| 5 | 2865 | 318 | **ADVERTISE** | e-con `[data-id="41768b4"]` — flex ۵ ستون ×231px، ۲ ستون اول (راست) پر | |
| 6 | 3203 | 502 | **Footer** | `.elementor-7373` — ۳ ستون (397/399/324px) | ABOUT US / بیشترین بازدید روز / اخرین اخبار |
| 7 | 3705 | 41 | **Copyright** | e-con `[data-id="226a5f9"]` + widget copyright | «حق نشر © 2026 Petro Times» |

عناصر جانبی ثبت‌شده: `#off-canvas` (منوی موبایل 370px، ترجمه‌شده بیرون صفحه در دسکتاپ)،
`.search-modal-wrap` (مودال سرچ fullscreen)، `#smart-head-mobile` (هدر موبایل 48px)،
دو ویجت HTML خالی (h=0) با idهای `8bba52f` و `b93743a`.

---

## 2) سیستم طراحی استخراج‌شده

### 2.1 توکن‌های SmartMag (منبع واقعی: `source/stylesheets/28-rtl.css…` بلوک `:root,.s-light`)

```
--body-font: "Public Sans", system-ui, sans-serif   (فارسی → Vazir توسط parsi-font)
--text-size: 14px        --text-lh: 1.714
--main-width: 1200px     --grid-gutter: 36px      --wrap-padding: 35px
--sidebar-width: 33.333% --sidebar-pad: 38px      --max-width-md: 680px
مقیاس تیتر: --title-size-xs:14px  s:16  n:18  m:20  l:25  xl:30px
--title-fw-semi:600      --title-fw-bold:700
--excerpt-size: 15px     --post-content-size:1.186rem
```

### 2.2 اسکیم روشن (`.s-light` / پیش‌فرض صفحه)

```
--c-main:#2ab391  →  در CSS صفحه 7322 بازنویسی شده: --c-main:#000000
--c-contrast-0..900: #fff, #fbfbfb, #f7f7f7, #efefef, #e8e8e8, #e2e2e2, #ddd, #ccc,
                     #bbb, #999, #8a8a8a, #777, #666, #505050, #444, #333, #191919, #161616
--c-contrast:#000   --c-links/--c-headings: var(--c-contrast-900)
--c-excerpts:#505050 --c-post-meta:#8a8a8a
--footer-bg:#f7f7f7  --footer-lower-bg:#f0f0f0 (در این سایت فوتر با Elementor مشکی شده)
```

### 2.3 اسکیم تاریک (`.s-dark` — هدر، TV، فوتر)

```
--c-contrast-0..900: #000, #070707, #111, #151515, #222, #2b2b2b, #333, #444, #555,
                     #777, #999, #bbb, #c0c0c0, #ccc, #d1d1d1, #ddd, #ececec, #f0f0f0
--c-contrast:#fff   --c-a-hover: rgba(255,255,255,.7)
--c-post-meta: rgba(255,255,255,.65)   --c-nav-drop-bg: #070707
```

### 2.4 نقشه معنایی رنگ‌های اندازه‌گیری‌شده (computed در 1920px)

| نقش | مقدار واقعی | محل |
|---|---|---|
| پس‌زمینه هدر | `rgb(0,0,0)` | `.smart-head-row` |
| متن لینک منو | `rgb(240,240,240)` / 15px/600 | `.menu > li > a` |
| آیتم جاری منو | `rgb(0,0,0)` — **نامرئی روی مشکی** | `--c-nav-hov:var(--c-main)=#000` |
| متن بدنه | `rgb(68,68,68)` | body |
| تیتر اخبار | `rgb(22,22,22)` | `.post-title` |
| لید/excerpt | `rgb(80,80,80)` | `.excerpt` |
| تاریخ | `rgb(138,138,138)` 11px | `.meta-item.date` |
| تیتر پلی‌لیست TV | `rgb(236,236,236)` | اسکیم تاریک |
| تاریخ TV | `rgba(255,255,255,.65)` | اسکیم تاریک |
| hover تیتر hero | `rgb(22,22,22) → rgb(0,0,0)` | اندازه‌گیری زنده hover |
| تیکر مثبت/منفی | `green` / `red` (keyword) | inline CSS تیکر |

منبع کامل: `design-system/colors.json` (175 رنگ اعلان‌شده در CSS + پالت computed).

### 2.5 تایپوگرافی واقعی (منبع: `design-system/typography.json` + `typography-roles.json`)

| نقش | فونت | اندازه/وزن/ارتفاع خط (محاسبه‌شده) |
|---|---|---|
| تیتر خبر اصلی (Hero) | Vazir | 21px / 900 (رندر با Bold=700) / ~1.36 |
| تیتر کارت فرعی | Vazir | 15px / 600 / ~1.43 |
| تیتر لیست sidebar | Vazir | 15px / 700 |
| تیتر پلی‌لیست TV | Vazir | 17px / 600 |
| تیتر انرژی | Vazir | 21px / 700 / 28.5px |
| عنوان بخش‌ها (لاتین) | Barlow | اندازه از CSS — چیدمان RTL |
| تاریخ‌ها | Vazir | 11px / 400 |
| متن فوتر (لاتین) | PT Serif | از CSS |
| منوها | Vazir | 15px / 600 |
| بدنه پایه | Vazir | 14px / 400 / 1.714 |

فونت‌های بارگذاری‌شده واقعی (شبکه): `Vazir.woff`, `Vazir-Bold.woff` (parsi-font)،
`barlow/v13/*.woff2` (کش گوگل‌فونت)، `ptserif/v19/*.woff2`، `ts-icons.woff2?v3.2` (آیکون‌های تم).
**اعلان‌شده اما 404:** IRANSans، IRANYekan — و `Vazir-Bold.wof2f` (تایپوی نام فایل در CSS).
ترتیب تاریخ/ساعت: «۲۹ مرداد ۱۴۰۵ - ۰۹:۰۴» (تاریخ فارسی، خط تیره، ساعت ۲۴ساعته، راست‌چین).

### 2.6 Breakpointهای واقعی (از `design-system/breakpoints.json`)

فرکانس بالای @media در CSS واقعی: `max-767` (79×) — `max-940` (53×) — `max-540` (38×) —
`min-1201` (20×) — `min-941` (18×) — `min-768` (15×) — `max-1024` (13×) — `max-1200` (9×) —
`941–1200` (8×) — `max-350` (6×) — `992`، `800`، `782`، `480`، `600` (کم‌بسامد).
**تعویض هدر:** هدر دسکتاپ در ≤1024 مخفی و هدر موبایل (48px) نمایش داده می‌شود.

---

## 3) گزارش ریسپانسیو (۱۲ عرض آزمایش‌شده — نمونه‌برداری، نه breakpoint)

منبع: `data/responsive-summary.json` + `measurements/{desktop,tablet,mobile}/`

| عرض | کانتینر هدر | ستون‌های بخش TOP NEWS | تیتر hero | کارت فرعی | منو | هدر فعال | سرریز افقی |
|---|---|---|---|---|---|---|---|
| 1920 | 1200 | 824+412 | 21px | 15px | 15px | دسکتاپ 63px | خیر |
| 1440 | 1200 | 824+412 | 21px | 15px | 15px | دسکتاپ | خیر |
| 1366 | 1200 | 824+412 | 21px | 15px | 15px | دسکتاپ | خیر |
| 1280 | 1200 | 824+412 | 21px | 15px | 15px | دسکتاپ | خیر |
| 1024 | 964 | چیدمان تک‌ستونه مجدد | 21px | 15px | 14px | دسکتاپ | خیر |
| 834 | 0 (مخفی) | ستون‌های تمام‌عرض 716 | 21px | 15px | 15px | موبایل 48px | خیر |
| 768 | 0 (مخفی) | 716 | 21px | 15px | 15px | موبایل | خیر |
| 430 | 0 | تک‌ستون 387 | 20px | 14px | 15px | موبایل | خیر |
| 414 | 0 | 372.6 | 20px | 14px | 15px | موبایل | خیر |
| 390 | 0 | 351 | 20px | 14px | 15px | موبایل | خیر |
| 375 | 0 | 337.5 | 20px | 14px | 15px | موبایل | خیر |
| 360 | 0 | 324 | 20px | 14px | 15px | موبایل | خیر |

نکات موبایل (منبع اسکرین‌شات‌های `screenshots/mobile/`):
- ترتیب کامل تک‌ستونه: هدر موبایل → تیکر → hero → ۴ کارت → TV+پلی‌لیست → TOP NEWS → MAGAZINE
  → FEATURE TITLE → ENERGY → گرید تبلیغ (تک‌ستون) → WE ARE SOCIAL (۲×۳) → Subscribe →
  ADVERTISE → فوتر (ABOUT US / بازدید / اخبار) → کپی‌رایت.
- در 834–768 (تبلت): MAGAZINE دو جلد را کنار هم نشان می‌دهد (اسلایدر ۲ اسلاید قابل مشاهده).
- هدر موبایل: لوگو وسط، سرچ چپ، همبرگر راست، 48px.
- Sticky موبایل در کپچر headless فعال نشد (position:relative اندازه‌گیری شد — ثبت در LIMITATIONS).

---

## 4) منابع گرافیکی

منبع: `data/asset-manifest.json` (39 lazy-bg + 12 img) و `data/images-manifest.json` (139 فایل دانلودشده).

- **لوگو:** `PAsset-3-1.png` (529×88 طبیعی → 258.5×63 رندر دسکتاپ، 227×38 فوتر؛ نسخه placeholder
  data-URI برای lazyload). فایل: `assets/logos/logo-main-PAsset-3-1.png`
- **آیکون‌های رتبه:** `number-one_2097.png`, `two_10093046.png`, `number-3_11822196.png` (512² → 28.5×28.5)
- **تصاویر خبری:** همه به‌صورت `background-image` با `data-bgset` (srcset معادل):
  مثال hero: `ChatGPT-Image…jpg` با واریانت‌های 150/200/300/450/768/full + `data-sizes="(max-width: 110px) 100vw, 110px"`
- **تبلیغات:** بنر زرد «آرمان صنعت آرمان» (`sepahan-oil…jpg`) — ۲ کارت در ردیف ADVERTISE + کاشی‌های ADS در گرید انرژی
- **جلد مجله:** `30-450x613.jpg` و متعاقب آن `photo_2024…` (اسلایدر؛ محتوای آن بین دو بار بارگذاری تغییر کرد — محتوای پویا)
- **favicon:** هیچ `<link rel="icon">` در DOM وجود ندارد (فقط preload فونت ts-icons) — favicon.ico پیش‌فرض مرورگر
- تصاویر همه از `wp-content/uploads/{2021..2026}/…` با اندازه‌های استاندارد وردپرس (150/200/300/450/768)

---

## 5) ساختار داده (WordPress)

منبع: `data/api-endpoints.json`، `data/homepage-snapshot.json`

- REST API عمومی: `wp-json/wp/v2/posts` → **159 پست**؛ آخرین پست‌ها `format=video`
- دسته‌های فعال فارسی: انرژی(5)، بین الملل(5)، گاز(5)، پالایش و پخش(3)، پتروشیمی(1) + magazine(5) + advertis(3)
- دسته‌های انگلیسی نمونه‌وار (Markets/Stocks/Funds/Investments…) از دیتای نمونه تم باقی مانده‌اند
- صفحه اصلی = **page 7322**، slug `homepage5`، template `page-templates/no-wrapper.php`
- فوتر = template **7373** (HFE)
- پلاگین‌ها (از namespaces + assets): Elementor 3.25.1، Elementor Pro، HFE، WP Rocket، RankMath،
  Content Views، featured-video-plus، post-featured-video، CF7، Smush، parsi-font، useanyfont، FontAwesome 6.6
- تیکر: `market.petrotimes.ir` — ساختار `.ticker-container > .ticker-slider > .ticker-item`
  (icon 20×20 + name + value + change) — ۱۵ کالا — poll به `fetch_prices.php` — مقادیر فعلی N/A
- منطق انتخاب اخبار هر ویجت سمت سرور است (تنظیمات Elementor) — در REST دیده نمی‌شود؛
  محتوای واقعی هر ویجت با عناوین/لینک/تاریخ/تصویر در `homepage-snapshot.json` ثبت شده است.

---

## 6) رفتارهای تعاملی (منبع: `data/interactive-states.json` + CSS واقعی)

| تعامل | Trigger | نتیجه ثبت‌شده |
|---|---|---|
| مودال جستجو | کلیک `.search-icon` | overlay تمام‌صفحه تیره؛ heading «Search...» بزرگ سفید؛ input با خط زیرین سفید؛ hint «Type above and press Enter to search. Press Esc to cancel»؛ Esc می‌بندد؛ فوکوس خودکار به input |
| منوی موبایل | کلیک همبرگر | `#off-canvas` از راست: `left:70px,right:0` در 390 (عرض 320)، backdrop opacity 1؛ آیتم‌ها: صفحه اصلی، نفت، گاز، پتروشیمی، پالایش و پخش، بین الملل، همه اخبار، Advertise، Magazine + ویجت‌های What's Hot و Subscribe |
| هدر sticky دسکتاپ | اسکرول به 900px | هدر مشکی 63px ثابت بالای صفحه؛ تیکر ثابت نمی‌ماند |
| hover تیتر hero | hover | `rgb(22,22,22) → rgb(0,0,0)` (زنده اندازه‌گیری شد) |
| hover منو | CSS | `nav-hov-a{--c-nav-hov:var(--c-main)}` → مشکی (#000) |
| hover search-icon | CSS | `.smart-head .search-icon:hover{color:var(--c-main)}` |
| hover post-title فوتر | CSS | `--c-a-hover:#FFFFFF` (ویجت 0740360) / `#000000` در اسکیم تاریک |
| کلیک پخش TV | کلیک | در محیط headless باز نشد — ثبت در LIMITATIONS |
| فرم خبرنامه | — | ساختار ثبت شد (CF7)؛ **ارسال نشد** |
| back-to-top | — | دکمه‌ای با کلاس `back-top/backtop` یافت نشد |

---

## 7) وضعیت اعتبارسنجی (خلاصه)

| معیار | وضعیت |
|---|---|
| ثبت تمام بخش‌های صفحه | VERIFIED (21 کامپوننت + عناصر جانبی) |
| اندازه‌های واقعی | VERIFIED (getBoundingClientRect + getComputedStyle در ۱۲ عرض) |
| شناسایی فونت‌ها | VERIFIED (Vazir/Barlow/PT Serif/ts-icons + 111 @font-face) |
| منابع تصویری | VERIFIED (139 فایل + manifest کامل با srcset) |
| استایل‌ها و breakpointها | VERIFIED (33 CSS + ترتیب cascade + فرکانس @media) |
| رفتار موبایل | VERIFIED (اسکرین‌شات + اندازه‌گیری ۵ عرض موبایل) |
| اسکرین‌شات‌های مرجع | VERIFIED (37 فایل) |
| Snapshot داده خبری | VERIFIED (تمام ۴۲ article با عنوان/لینک/تاریخ/تصویر) |
| وابستگی‌های خارجی | VERIFIED (market.petrotimes.ir + google-fonts cache) |
| محدودیت‌ها | مستند در `LIMITATIONS.md` |

## 8) فایل‌های تولیدشده و دستور اجرا

همه مسیرها در `extraction-manifest.json` و `README.md`؛ دستور اجرای ابزارها:

```bash
cd petrotimes-extraction
node scripts/extract.js && node scripts/capture-screenshots.js && \
node scripts/capture-mobile-interactions.js && node scripts/extract-market-iframe.js && \
node scripts/analyze-css.js && node scripts/build-design-system.js && node scripts/build-components.js
```
