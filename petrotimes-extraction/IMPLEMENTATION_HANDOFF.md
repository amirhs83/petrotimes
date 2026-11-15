# IMPLEMENTATION HANDOFF — بازسازی صفحه اصلی Petro Times (فاز ۲)

این سند همه اطلاعات لازم برای پیاده‌سازی Pixel-Perfect صفحه اصلی را بدون ارجاع مجدد به سایت
زنده جمع کرده است. هر مقدار «واقعی» است: از `getComputedStyle`، `getBoundingClientRect`، CSS
دانلود‌شده، و DOM رندرشده. فایل‌های مرجع در کنار هر بخش ذکر شده‌اند.

---

## 0) قواعد کلی پیاده‌سازی

- **زبان/جهت:** `<html dir="rtl" lang="fa-IR">` — کل لایه RTL است؛ از خصوصیات منطقی
  (`margin-inline-start`) یا مقادیر RTL-شده استفاده شود.
- **کانتینر:** عرض مؤثر `1200px` مرکز‌شده (`--main-width: 1200px`)؛ در RTL محتوای اصلی سمت راست.
- **بخش‌بندی DOM واقعی:** محتوای صفحه یک Elementor page است؛ برای بازسازی به پشته WordPress
  نیاز نیست، اما ساختار باکس‌ها دقیقاً مثل جدول بخش ۱ بازسازی شود.
- **دو اسکیم رنگ:** صفحه پایه روشن (`s-light`)، هدر + TV + فوتر تاریک (`s-dark`).
  توکن‌ها را به‌صورت CSS variables پیاده کنید (فهرست کامل: `design-system/colors.json`).
- **تصاویر خبری = background-image روی span با کلاس `bg-cover`** (object-fit معادل background-size: cover)،
  با ratio ثابت توسط کلاس `media-ratio` (aspect-ratio). در srcset از واریانت‌های 150/200/300/450/768/full استفاده شود.

## 1) نقشه کامپوننت‌ها (ترتیب دقیق DOM در 1920px)

فایل‌های کامل: `components/full-specs.json` (HTML واقعی + هندسه + درخت فرزندان برای هر ۲۱ کامپوننت)
و `components/<category>/<id>.html`.

| # | کامپوننت | سلکتور واقعی | ابعاد در 1920 | نوع داده |
|---|---|---|---|---|
| 1 | هدر اصلی | `#smart-head` | 1920×63 مشکی sticky | منو + لوگو + سرچ |
| 2 | تیکر بازار | `[data-id="1c95847"] iframe` | 1920×38 سفید | ۱۵ کالا، marquee |
| 3 | Hero خبر اصلی | `[data-id="cedc57a"]` | 384×462 | ۱ پست + تصویر 384×230 |
| 4 | ۴ کارت فرعی | `[data-id="8316c3e"]`… | 384×76 هرکدام | پست + thumb 110×76 |
| 5 | TV بخش | `[data-id="53fa308"]` | 788×652 تیره | overlay video |
| 6 | پلی‌لیست TV | `[data-id="c258178"]` | 788×501 تیره | ۵ آیتم 718×76 |
| 7 | لیبل TOP NEWS | `[data-id="a11540e"]` | 356×139 sidebar | label + ۱ پست |
| 8..10 | ۳ آیتم TOP NEWS | `[data-id="f46c34f|2b53655|ad71bc1"]` | 356×78 | پست + thumb 110×78 |
| 11 | MAGAZINE | `[data-id="c074dc7"]` | 356×569 | اسلایدر ۵ جلد، overlay |
| 12 | FEATURE TITLE | heading `d43218c` + `cdf7917|4a3c89f|de04eb4` | 143×63 + 3×(28+319) | آیکون رتبه 28×28 |
| 13 | WE ARE SOCIAL | `[data-id="2a4da1e"]` | 356×222 | ۶ دکمه رنگی |
| 14 | Newsletter | `[data-id="9609692"]` | 356×349 | input 284×44 + دکمه |
| 15 | ENERGY hero | `[data-id="2517f37"]` | 788×685 | پست + تصویر تمام‌عرض |
| 16..17 | ۲ خبر فرعی انرژی | `[data-id="ebc9ae9|4ed4320"]` | 788×76 | thumb 110px |
| 18 | گرید ۳ ستونه | `[data-id="1635d4c|5fabf63|4957a9a"]` | 249×195 | ۲ ADS + ۱ پست |
| 19 | ADVERTISE | `[data-id="41768b4"]` | flex 5×231 | ۲ کارت زرد |
| 20 | فوتر | `.elementor-7373` | 1920×502 مشکی | ۳ ستون 397/399/324 |
| 21 | کپی‌رایت | `[data-id="226a5f9"]` | 1920×41 | متن وسط |

ستون‌بندی: بخش ۳ = content(824) + sidebar(412)؛ بخش ۴ = content(824) + sidebar(412)؛
gutter واقعی بین ستون‌ها: 824+412+gutter=1236 → **gutter=0px** (gap داخل container صفر است؛
فاصله‌ها با padding داخلی ویجت‌ها ایجاد می‌شود — هندسه دقیق در geometry-1920.json).

## 2) سیستم طراحی (کپی مستقیم به فایل تم)

### 2.1 متغیرهای CSS (SmartMag — از `design-system/css-variables.json`)

```css
:root, .s-light {
  --body-font: "Public Sans", system-ui, sans-serif;   /* فارسی: Vazir override */
  --text-size: 14px;  --text-lh: 1.714;
  --main-width: 1200px;  --grid-gutter: 36px;  --wrap-padding: 35px;
  --sidebar-width: 33.3333333333%;
  --title-size-xs: 14px; --title-size-s: 16px; --title-size-n: 18px;
  --title-size-m: 20px;  --title-size-l: 25px; --title-size-xl: 30px;
  --title-fw-semi: 600;  --title-fw-bold: 700;
  --excerpt-size: 15px;
  --c-main: #2ab391;            /* تم — اما CSS صفحه اصلی آن را override می‌کند: */
  --c-main: #000000;            /* ← مقدار فعال روی صفحه اصلی (post-7322.css) */
  --c-contrast-0:#fff; -10:#fbfbfb; -50:#f7f7f7; -75:#efefef; -100:#e8e8e8;
  -125:#e2e2e2; -150:#ddd; -200:#ccc; -300:#bbb; -400:#999; -450:#8a8a8a;
  -500:#777; -600:#666; -650:#505050; -700:#444; -800:#333; -850:#191919; -900:#161616;
  --c-contrast:#000;  --c-links:#161616;  --c-headings:#161616;
  --c-excerpts:#505050; --c-post-meta:#8a8a8a;
}
.s-dark {
  --c-contrast-0:#000; -10:#070707; -50:#111; -75:#151515; -100:#222; -125:#2b2b2b;
  -150:#333; -200:#444; -300:#555; -400:#777; -450:#999; -500:#bbb; -600:#c0c0c0;
  -650:#ccc; -700:#d1d1d1; -800:#ddd; -850:#ececec; -900:#f0f0f0;
  --c-contrast:#fff;  --c-a-hover:rgba(255,255,255,.7);
  --c-post-meta:rgba(255,255,255,.65);
}
```

### 2.2 تایپوگرافی

```css
@font-face { font-family:'Vazir'; src:url(fonts/Vazir.woff2) format('woff2'),
             url(fonts/Vazir.woff) format('woff'); font-weight:400; font-display:swap; }
@font-face { font-family:'Vazir'; src:url(fonts/Vazir-Bold.woff2) format('woff2'),
             url(fonts/Vazir-Bold.woff) format('woff'); font-weight:700; font-display:swap; }
/* Barlow (لاتین، برای لیبل‌های EN) و PT Serif (متن لاتین فوتر) — فایل‌ها در assets/fonts/ */
@font-face { font-family:'ts-icons'; src:url(fonts/ts-icons.woff2) format('woff2'); } /* آیکون‌ها */
```

نقش‌های اندازه‌گیری‌شده (`design-system/typography-roles.json` — ۳۲ نقش):

| نقش | مقدار دقیق computed |
|---|---|
| تیتر hero | 21px / 900 / lh≈1.36 / رنگ #161616 / hover→#000 |
| کارت فرعی | 15px / 600 / lh 1.43 / #161616 |
| لیست sidebar | 15px / 700 / #161616 |
| پلی‌لیست TV | 17px / 600 / #ececec |
| تاریخ | 11px / 400 / #8a8a8a (روشن) و rgba(255,255,255,.65) (تاریک) |
| excerpt hero | 15px / 400 / #505050 |
| منو | 15px / 600 / #f0f0f0 |

نکته RTL: ترتیب «تاریخ - ساعت»: `۲۹ مرداد ۱۴۰۵ - ۰۹:۰۴`، تاریخ با اعداد فارسی.

### 2.3 ساختار هدر (63px)

```
.smart-head-row (bg #000, h 63)
└─ .inner.wrap (w 1200, مرکز)
   ├─ .items.items-left (1181px)  ← در RTL از راست شروع می‌شود:
   │   ├─ .offcanvas-toggle (26×45, همبرگر 3 خط 20×3px, gap 4)
   │   ├─ .logo-link (258×63) → img PAsset-3-1.png (529×88 طبیعی)
   │   └─ .nav-wrap > nav.navigation-main.nav-hov-a > ul.menu (832px)
   │       liها (RTL از راست): صفحه اصلی(107, نامرئی) | نفت(66) | گاز(57) |
   │       پتروشیمی(110) | پالایش و پخش(118) | بین الملل(89) | همه اخبار(89) |
   │       Advertise(97) | Magazine(95)  — h هرکدام 63
   └─ .items.items-right (19px) → a.search-icon (icon 15×16)
```

- آیتم جاری منو (`menu-item-home`) **مشکی روی مشکی است** — این رفتار واقعی سایت است؛
  برای بازسازی وفادار، همان رنگ #000 را اعمال کنید (یا با تأیید کارفرما اصلاح شود).
- sticky: هنگام اسکرول، هدر 63px ثابت می‌ماند (تیکر نه).

### 2.4 تیکر بازار (iframe یا بازسازی داخلی)

- ظرف: 1920×38، سفید، سایه `0 4px 8px rgba(0,0,0,.1)`، overflow hidden
- اسلایدر: `inline-flex` با عرض 3942px، انیمیشن marquee (CSS transition + JS drag: `cursor:grab`)
- آیتم: `padding:10px 20px`، `border-right:1px solid #ddd`، min-width:200px
- آیکون کالا: 20×20 دایره‌ای (`border-radius:50%`, `border:1px solid #e3e3e3`)
- name: bold — value: normal — change: bold، `positive→green` / `negative→red`
- داده: poll به `fetch_prices.php`؛ **در وضعیت فعلی همه N/A هستند** — همان fallback را بسازید
- لیست ۱۵ کالا: Crude oil، Brent crude oil، Heating oil، Bitumen، Natural gas، Eu natural gas،
  Gasoline، Naphtha، Coal، Copper، Methanol، Urea، Polyethylene، Polyvinyl، Polypropylene
- منبع کامل: `data/market-iframe.json` + `source/market-iframe-dom.html`

### 2.5 کارت خبری استاندارد (posts-small)

```html
<article class="l-post small-post small-a-post m-pos-left">
  <div class="media"><a class="image-link media-ratio">
    <span class="img bg-cover wp-post-image" style="background-image:url(...300x188.jpg)"></span>
  </a></div>
  <div class="content">
    <div class="post-meta post-meta-a has-below">
      <h4 class="is-title post-title"><a>عنوان</a></h4>
      <div class="post-meta-items meta-below"><span class="meta-item date">۲۸ مرداد ۱۴۰۵ - ۱۸:۵۳</span></div>
    </div>
  </div>
</article>
```

هندسه واقعی کارت 384px: thumb 110×76 (سمت راست در RTL)، متن 256px، فاصله بین thumb و متن ~18px
(مقادیر دقیق: `measurements/desktop/geometry-1920.json` — `[data-id="8316c3e"]`).

### 2.6 بخش TV (اسکیم تاریک)

- container 788px، سر‌برگ: برچسب «TV» سفید-روی-مشکی + «PETRO TIMES» (Barlow)
- overlay ویدیو: تصویر 788×~475 + گرادیان تیره پایین + دکمه پخش دایره‌ای (tsi-play 9.5×18.6 icon)
- تیتر overlay روی تصویر (سفید، Vazir Bold)
- پلی‌لیست: ۵ ردیف 718×76، آیتم فعال/آخر با پس‌زمینه متفاوت، thumb سمت چپ (RTL)،
  تاریخ rgba(255,255,255,.65)

### 2.7 فوتر (Elementor 7373)

- کل فوتر مشکی (#000-ish — بخش اصلی؛ مقادیر دقیق در geometry-1920.json `[data-id="774363e"]`)
- ۳ ستون RTL: راست=ABOUT US (324px: heading EN + لوگو 324×38 + متن PT Serif + Email + ۵ آیکون اجتماعی)
  وسط=بیشترین بازدید روز (399px: heading فارسی + ۴ پست) چپ=اخرین اخبار (397px: heading + ۴ پست)
  *(ترتیب بصری از اسکرین‌شات: راست ABOUT US، وسط «بیشترین بازدید روز»، چپ «اخرین اخبار»)*
- تیتر فوتر hover → `--c-a-hover:#FFFFFF` (روشن) — از post-7373.css
- کپی‌رایت: h=41، متن وسط 1200px: «حق نشر © 2026 Petro Times»

### 2.8 سرتیتر بخش‌ها (اندازه‌گیری زنده computed)

| نوع | فونت | اندازه/وزن | پس‌زمینه | رنگ | padding/radius |
|---|---|---|---|---|---|
| سرتیتر بخش (magazine/energy/We Are Social/What's Hot) | Vazir | 20px/700، uppercase | شفاف | #161616 (تاریک‌اسکیم: #f0f0f0) | 0 / 0 |
| چیپ لیبل (top news) | Vazir | 14px/600، uppercase | **rgb(22,22,22)** | سفید | 9px 14px / 2px |
| چیپ لیبل TV | Vazir | 14px/600، uppercase | **rgb(0,0,0)** | سفید | 9px 14px / 2px |

متن‌های واقعی لیبل‌ها در DOM با حروف کوچک ذخیره شده‌اند و با `text-transform: uppercase`
به شکل نمایشی «TOP NEWS» تبدیل می‌شوند — در بازسازی همان uppercase اعمال شود.

### 2.9 دکمه‌های اجتماعی و خبرنامه (اندازه‌گیری زنده)

دکمه‌های social: هرکدام **173×36px**، radius 2px، متن 12px، رنگ متن #f8f8f8 (گرید ۲ ستونه در sidebar 356px):

| شبکه | پس‌زمینه دقیق | لینک واقعی |
|---|---|---|
| Facebook | rgb(26,109,212) | facebook.com/share/15Yx3THCSY/ |
| Twitter (X) | rgb(85,172,239) | x.com/Petrotimes_ir |
| YouTube | rgb(255,0,0) | youtube.com/@petrotimes_ir |
| Telegram | rgb(0,136,204) | t.me/petrotimes_ir |
| Instagram | rgb(193,53,132) | instagram.com/Petrotimes.ir |
| LinkedIn | rgb(2,102,154) | → petrotimes.ir (صفحه خود سایت!) |

خبرنامه: کارت بدون bg شفاف؛ heading «Subscribe to Updates»؛ توضیح «Get the latest creative news from FooBar about art, design and business.»؛
input سفید 284×44، border 1px #ddd، placeholder «Your email address..»؛ دکمه «Subscribe» 284×40 با bg **rgb(27,97,200)** و متن سفید؛
زیر آن: «By signing up, you agree to our terms and...» + Privacy Policy. فرم به CF7 می‌رود (ارسال نشد).

## 3) رفتار ریسپانسیو (قواعد پیاده‌سازی)

| محدوده | قاعده |
|---|---|
| ≥1201px | کانتینر 1200؛ چیدمان 2-ستونه 824/412؛ hero 21px |
| 941–1200 | کانتینر به عرض viewport−wrap-padding؛ در 1024 ستون‌ها پشت هم (تک‌ستونه)؛ منو 14px |
| ≤1024 | هدر دسکتاپ مخفی → هدر موبایل 48px (لوگو وسط، سرچ چپ، همبرگر راست) |
| ≤767 | تک‌ستون کامل؛ همه sidebar widgets زیر محتوا؛ MAGAZINE اسلایدر با ۲ اسلاید قابل مشاهده در 768 |
| ≤540 | تیتر hero 20px، کارت 14px؛ گرید انرژی/ADS تک‌ستون؛ social دکمه‌ها 2×3 |
| ≤350 | میکرو-breakpoint (فونت/فاصله‌های فشرده‌تر — قوانین در CSS واقعی موجود) |

فاصله ایمن موبایل: محتوا از هر طرف ~15px (حاصل 360−324=36 تقسیم دو طرف).

## 4) تعاملات (spec دقیق)

1. **مودال جستجو:** overlay تیره تمام‌صفحه؛ «Search...» بزرگ؛ input خط‌زیرین؛ hint دو جمله‌ای؛
   باز با کلیک آیکون، بستن با Esc/X؛ فورس‌فوکوس input. (اسکرین‌شات مرجع: `screenshots/interactions/desktop-search-open.png`)
2. **منوی off-canvas:** از راست، 370px (در 390: 320px)، backdrop مشکی opacity 1؛
   transition روی transform؛ آیتم‌ها با جداکننده؛ شامل What's Hot (۲ پست با thumb) و Subscribe.
   (مرجع: `screenshots/interactions/mobile-offcanvas-open.png`)
3. **hover تیترها:** روشن→`#000`؛ تاریک→`rgba(255,255,255,.7)`؛ فوتر→`#fff`
4. **hover منو:** `--c-nav-hov = --c-main = #000` (روی هدر مشکی عملاً تیره‌تر می‌شود)
5. **lazyload:** تصاویر با placeholder data-URI SVG شروع می‌شوند؛ در بازسازی Next.js
   می‌توان مستقیم `next/image` با fill+sizes استفاده کرد (رفتار بصری معادل bg-cover).

## 5) داده‌های محتوایی برای توسعه

- همه ۴۲ article صفحه با عنوان/لینک/تاریخ/تصویر/دسته: `data/homepage-snapshot.json`
- تصاویر واقعی با همه واریانت‌های srcset: `data/asset-manifest.json` (فایل‌ها در `assets/images/`)
- نقشه API وردپرس (برای نسخه متصل به CMS): `data/api-endpoints.json`
  - posts: `/wp-json/wp/v2/posts` (159 پست، format=video برای آخرین‌ها)
  - دسته‌های فعال: انرژی، بین الملل، گاز، پالایش و پخش، پتروشیمی، magazine، advertis

## 6) دام‌ها و نکات (از تجربه استخراج)

1. **WP Rocket JS-delay:** در نسخه WordPress رندر اولیه بدون تعامل، تصاویر خبری بارگذاری نمی‌شوند —
   در بازسازی Next.js این رفتار را بازسازی نکنید مگر اینکه کارفرما بخواهد؛ در `LIMITATIONS.md` بخش ۱ توضیح داده شد.
2. **آیتم منوی نامرئی:** «صفحه اصلی» با رنگ #000 روی #000 — تصمیم بصری وفادار یا اصلاح، نیاز به تأیید کارفرما.
3. **تیکر N/A:** مقدار واقعی فید الان N/A است؛ هر دو حالت (داده/N/A) باید پیاده شود.
4. **دو CSS فونت معیوب:** IRANSans/IRANYekan در CSS اعلام شده‌اند اما 404 هستند — وارد نکنید.
5. **ترتیب ستون‌های فوتر در RTL** را از اسکرین‌شات `screenshots/components/footer.png` چک کنید.
6. **جلد مجله پویاست** (بین دو بارگذاری عوض شد) — در بازسازی، اسلایدر با N جلد از دسته magazine.

## 7) چک‌لیست برابری بصری (برای QA فاز ۲)

- [ ] عرض کانتینر 1200 در 1920 (فاصله 360 از هر طرف)
- [ ] هدر 63px مشکی با ترتیب آیتم‌های بخش 2.3
- [ ] تیکر 38px زیر هدر با آیتم‌های بخش 2.4
- [ ] ستون‌بندی 824/412 در بخش ۳ و ۴
- [ ] کارت‌های 384×76 با thumb 110×76
- [ ] TV تیره 788×652 + پلی‌لیست ۵ آیتم
- [ ] مقیاس تیترها: hero 21 / کارت 15 / TV 17 / تاریخ 11
- [ ] رنگ‌های بخش 2.1/2.2 عیناً
- [ ] فوتر مشکی ۳ ستونه + کپی‌رایت 41px
- [ ] ریسپانسیو: تعویض هدر در ≤1024، تک‌ستون در ≤767، فونت‌های 20/14 در ≤540
- [ ] مودال سرچ و off-canvas مطابق بخش 4
