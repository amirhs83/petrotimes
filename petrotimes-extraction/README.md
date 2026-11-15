# Petro Times — Homepage Reverse Engineering (Phase 01: Extraction & Documentation)

استخراج و مستندسازی کامل صفحه اصلی `https://petrotimes.ir/` برای بازسازی Pixel-Perfect.

**این مخزن فقط داده استخراج‌شده واقعی را نگه می‌دارد — هیچ حدس یا فایل ساختگی‌ای وجود ندارد.**
هر موردی که قابل استخراج نبود در `LIMITATIONS.md` صریحاً ثبت شده است.

## مرور سریع

| مورد | نتیجه |
|---|---|
| پلتفرم | WordPress (PHP 7.4.33) — قالب SmartMag + Elementor 3.25 + WP Rocket |
| صفحه اصلی | Elementor page **7322** (slug `homepage5`, template `page-templates/no-wrapper.php`) |
| فوتر | Elementor template **7373** (Header Footer Elementor) |
| تیکر بازار | iframe `https://market.petrotimes.ir/` (1920×38px، اپ PHP جدا) |
| زبان/جهت | fa-IR / RTL |
| کانتینر اصلی | `--main-width: 1200px` (مرکز)، gutter 36px، sidebar 33.333% |
| فونت‌ها | Vazir 400/700 (فارسی)، Barlow (لاتین display)، PT Serif (فوتر لاتین)، ts-icons (آیکون‌ها) |
| تصاویر خبری | `background-image` روی `<span data-bgsrc data-bgset>` (lazySizes) — نه `<img>` |
| Breakpoint واقعی | 1201 / 1025 / 941 / 768 / 540 / 480 / 350 (از CSS واقعی استخراج شد) |

## ساختار پوشه‌ها

```
petrotimes-extraction/
├── README.md                       ← همین فایل
├── EXTRACTION_REPORT.md            ← گزارش جامع استخراج (فاز ۱ تا ۱۳)
├── IMPLEMENTATION_HANDOFF.md       ← همه اطلاعات لازم برای شروع پیاده‌سازی (فاز ۲)
├── LIMITATIONS.md                  ← موارد غیرقابل استخراج / محدودیت‌ها
├── extraction-manifest.json        ← manifest کامل + وضعیت VERIFIED/PARTIAL هر فاز
├── source/
│   ├── original-response.html      ← HTML خام سرور (199KB)
│   ├── rendered-dom.html           ← DOM نهایی رندرشده در مرورگر (247KB)
│   ├── market-iframe-dom.html      ← DOM تیکر بازار
│   ├── stylesheets/                ← ۳۳ فایل CSS واقعی سایت
│   └── public-scripts/             ← ۲۴ اسکریپت عمومی
├── assets/
│   ├── images/ (139)               ← تصاویر خبری، بنرهای تبلیغاتی، آیکون رتبه
│   ├── fonts/ (30+)                ← Vazir، Barlow، PT Serif، ts-icons
│   ├── logos/                      ← لوگوهای دسکتاپ/موبایل/فوتر
│   └── icons/
├── screenshots/
│   ├── desktop/  1920-1440-1366-1280-1024 (full-page)
│   ├── tablet/   834-768
│   ├── mobile/   430-414-390-375-360
│   ├── components/ (19)            ← اسکرین‌شات مستقل هر کامپوننت
│   └── interactions/ (6)           ← سرچ باز، منوی موبایل باز، هدر sticky و…
├── design-system/
│   ├── colors.json                 ← نقشه معنایی رنگ + پالت CSS واقعی
│   ├── typography.json             ← نقش‌های تایپوگرافی + @font-faceها
│   ├── breakpoints.json            ← همه شرط‌های @media واقعی + فرکانس
│   ├── spacing.json                ← margin/padding/gap اندازه‌گیری‌شده
│   ├── visual-effects.json         ← hover/focus/keyframes/transitions واقعی CSS
│   └── css-variables.json          ← ۴۱۲ متغیر CSS
├── components/
│   ├── component-index.json        ← فهرست ۲۱ کامپوننت + سلکتور + وضعیت
│   ├── full-specs.json             ← مشخصات کامل (HTML + هندسه + درخت فرزندان)
│   └── <category>/<id>.html + <id>-spec.json
├── data/
│   ├── page-meta.json              ← متا، performance، شمارش عناصر
│   ├── dom-tree.json               ← درخت ساختاری صفحه
│   ├── homepage-snapshot.json      ← محتوای واقعی همه ۳۹+ خبر (عنوان/لینک/تاریخ/تصویر)
│   ├── api-endpoints.json          ← REST API وردپرس (عمومی)
│   ├── network-manifest.json       ← کل درخواست‌های شبکه
│   ├── market-iframe.json          ← ساختار تیکر (۱۵ کالا، fetch_prices.php)
│   ├── responsive-summary.json     ← رفتار در ۱۲ عرض
│   ├── interactive-states.json     ← وضعیت تعاملات ثبت‌شده
│   └── …
├── measurements/
│   ├── desktop/  1920-1440-1366-1280-1024
│   ├── tablet/   834-768
│   └── mobile/   430-414-390-375-360
└── scripts/                        ← ۷ اسکریپت تکرارپذیر استخراج (Node + Playwright)
```

## تکرارپذیری

```bash
node scripts/extract.js                      # استخراج کامل داده + دانلود assets (~۴ دقیقه)
node scripts/capture-screenshots.js          # اسکرین‌شات‌ها + تعاملات (~۴ دقیقه)
node scripts/capture-mobile-interactions.js  # منوی موبایل + sticky موبایل
node scripts/extract-market-iframe.js        # تیکر بازار
node scripts/analyze-css.js                  # breakpointها، hoverها، keyframes
node scripts/build-design-system.js          # تجمیع colors.json + typography.json
node scripts/build-components.js             # spec هر کامپوننت
```

پیش‌نیاز: Node ≥ 20 و Playwright با Chromium. تمام عملیات **read-only** است؛ هیچ فرم ارسال
نمی‌شود، هیچ تغییری روی سایت هدف ایجاد نمی‌شود.

## نقطه شروع برای فاز ۲

فایل `IMPLEMENTATION_HANDOFF.md` را بخوانید — نقشه کامپوننت‌ها، سیستم طراحی، رفتار ریسپانسیو
و همه داده‌های لازم برای بازسازی بدون حدس در آن جمع شده است.
