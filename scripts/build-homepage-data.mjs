/**
 * build-homepage-data.mjs
 * Transforms petrotimes-extraction/data/homepage-snapshot.json + full-specs.json
 * into src/data/homepage-data.json — the fixed content snapshot used by the app.
 * Every title/date/URL/image is copied verbatim from the live capture.
 * Image variant selection = the background-image variant actually applied by the
 * live site's lazyloader at capture time (extracted from full-specs HTML).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = '/home/z/my-project';
const EXT = path.join(ROOT, 'petrotimes-extraction');
const OUT = path.join(ROOT, 'src/data/homepage-data.json');

const snap = JSON.parse(fs.readFileSync(path.join(EXT, 'data/homepage-snapshot.json'), 'utf-8'));
const specs = JSON.parse(fs.readFileSync(path.join(EXT, 'components/full-specs.json'), 'utf-8'));

function spec(id) { return specs.find(s => s.componentId === id); }

function appliedBg(componentId) {
  const c = spec(componentId);
  if (!c) return [];
  const re = /style="background-image: url\(&quot;([^&]+)&quot;\)/g;
  const out = [];
  let m;
  while ((m = re.exec(c.html)) !== null) out.push(m[1]);
  return out;
}

/** map remote wp upload URL -> local /assets/images path (must exist) */
function toLocal(url) {
  if (!url) return null;
  const file = url.split('/').pop();
  const local = `/assets/images/${file}`;
  if (!fs.existsSync(path.join(ROOT, 'public', local))) {
    throw new Error(`MISSING LOCAL ASSET: ${file} (from ${url})`);
  }
  return local;
}

function article(a, appliedUrl) {
  return {
    title: a.title ?? '',
    url: a.url ?? '',
    dateText: a.dateText ?? '',
    category: a.category ?? null,
    categoryUrl: a.categoryUrl ?? null,
    excerpt: a.excerpt ?? null,
    image: toLocal(appliedUrl || a.image),
    imageFull: toLocal(a.image ? a.image.replace(/-\d+x\d+(\.\w+)$/, '$1') : null),
  };
}

const bgSecondary = appliedBg('top-news-secondary');
const bgTopList = appliedBg('top-news-list');
const bgPlaylist = appliedBg('tv-playlist');
const bgEnergyList = appliedBg('energy-list');
const bgFooter = appliedBg('footer');
const bgMagazine = appliedBg('magazine');
const bgAdv = appliedBg('advertise-row');

// hero_secondary_N widgets map to bgSecondary order (1 hero bg + 4 cards)
const hs = [1, 2, 3, 4].map(i => article(snap.widgets[`hero_secondary_${i}`].articles[0], bgSecondary[i]));

// topnews label widget + 3 items: bgTopList = [label-article, i2, i3, i4, magazine x5...]
const topNewsLabelArt = article(snap.widgets.topnews_label.articles[0], bgTopList[0]);
const topNewsItems = [2, 3, 4].map(i => article(snap.widgets[`topnews_${i}`].articles[0], bgTopList[i - 1]));

const playlist = snap.widgets.tv_playlist.articles.map((a, i) => article(a, bgPlaylist[i]));

const magazine = snap.widgets.magazine.articles.map((a, i) => article(a, bgMagazine[i]));

// feature items: rank icon pngs, no card image
const rankIcons = ['/assets/icons/number-one_2097.png', '/assets/icons/two_10093046.png', '/assets/icons/number-3_11822196.png'];
const featureItems = [1, 2, 3].map((i) => {
  const a = snap.widgets[`feature_${i}`].articles[0];
  return { ...article(a, null), rankIcon: rankIcons[i - 1] };
});

// energy: hero uses own bg (1024w), subs + grid from bgEnergyList order:
// [hero(1024), sub1(150), sub2(150), grid1(1024 ADS), grid2(sepahan), grid3(1024 ADS)]
const energyMain = article(snap.widgets.energy_main.articles[0], appliedBg('energy-featured')[0]);
const energySubs = [1, 2].map(i => article(snap.widgets[`energy_sub_${i}`].articles[0], bgEnergyList[i]));
const energyGrid = [1, 2, 3].map(i => article(snap.widgets[`energy_grid_${i}`].articles[0], bgEnergyList[2 + i]));

const advertise = [1, 2].map(i => article(snap.widgets[`advertise_${i}`].articles[0], bgAdv[i - 1]));

const footerPopular = snap.widgets.footer_popular.articles.map((a, i) => article(a, bgFooter[i]));
const footerLatest = snap.widgets.footer_latest.articles.map((a, i) => article(a, bgFooter[4 + i]));

const data = {
  capturedAt: snap.capturedAt,
  source: 'https://petrotimes.ir/ (live capture 2026-11-15, Chromium 157, viewport 1920)',
  header: {
    menu: [
      { label: 'صفحه اصلی', href: '/', current: true },
      { label: 'نفت', href: 'https://petrotimes.ir/naft/' },
      { label: 'گاز', href: 'https://petrotimes.ir/gas/' },
      { label: 'پتروشیمی', href: 'https://petrotimes.ir/petroshimi/' },
      { label: 'پالایش و پخش', href: 'https://petrotimes.ir/palayesh-va-pakhsh/' },
      { label: 'بین الملل', href: 'https://petrotimes.ir/bein-al-melal/' },
      { label: 'همه اخبار', href: 'https://petrotimes.ir/all-post/' },
      { label: 'Advertise', href: '#' },
      { label: 'Magazine', href: 'https://petrotimes.ir/magazine/' },
    ],
  },
  ticker: {
    iframeUrl: 'https://market.petrotimes.ir',
    items: [
      ['crude-oil', 'Crude oil', 'oil.svg'],
      ['brent-crude-oil', 'Brent crude oil', 'oil.svg'],
      ['heating-oil', 'Heating oil', 'heating-oil.svg'],
      ['bitumen', 'Bitumen', 'oil.svg'],
      ['natural-gas', 'Natural gas', 'gas.svg'],
      ['eu-natural-gas', 'Eu natural gas', 'gas.svg'],
      ['gasoline', 'Gasoline', 'gasoline.svg'],
      ['naphtha', 'Naphtha', 'naphta.svg'],
      ['coal', 'Coal', 'coal.svg'],
      ['copper', 'Copper', 'copper.svg'],
      ['methanol', 'Methanol', 'methanol.svg'],
      ['urea', 'Urea', 'urea.svg'],
      ['polyethylene', 'Polyethylene', 'polyethylene.svg'],
      ['polyvinyl', 'Polyvinyl', 'vinyl.svg'],
      ['polypropylene', 'Polypropylene', 'oil.svg'],
    ].map(([key, name, icon]) => ({ key, name, icon: `/assets/icons/ticker/${icon}` })),
  },
  sections: {
    heroMain: article(snap.widgets.hero_main.articles[0], appliedBg('top-news-hero')[0]),
    heroSecondary: hs,
    tvPlayer: article(snap.widgets.tv_player.articles[0], appliedBg('tv-section')[0]),
    tvPlaylist: playlist,
    topNewsLabel: { label: 'top news', article: topNewsLabelArt },
    topNewsItems,
    magazine: { label: 'magazine', articles: magazine },
    featureTitle: { label: 'feature title', items: featureItems },
    energyMain: article(snap.widgets.energy_main.articles[0], appliedBg('energy-featured')[0]),
    energySubs,
    energyGrid,
    advertise: { label: 'advertise', items: advertise },
    social: {
      label: 'We Are Social',
      links: [
        { network: 'facebook', label: 'Facebook', href: 'https://www.facebook.com/share/15Yx3THCSY/?mibextid=LQQJ4d' },
        { network: 'twitter', label: 'Twitter', href: 'https://x.com/Petrotimes_ir' },
        { network: 'youtube', label: 'YouTube', href: 'https://youtube.com/@petrotimes_ir?si=LtuI-OvoSXzeA1FB' },
        { network: 'telegram', label: 'Telegram', href: 'https://t.me/petrotimes_ir' },
        { network: 'instagram', label: 'Instagram', href: 'https://Instagram.com/Petrotimes.ir' },
        { network: 'linkedin', label: 'LinkedIn', href: '' },
      ],
    },
    newsletter: {
      heading: 'Subscribe to Updates',
      text: 'Get the latest creative news from FooBar about art, design and business.',
      placeholder: 'Your email address..',
      button: 'Subscribe',
      disclaimer: 'By signing up, you agree to the our terms and our',
      disclaimerLink: 'Privacy Policy',
    },
    footer: {
      about: {
        heading: 'ABOUT US',
        text: 'A comprehensive view of price fluctuations in the oil, gas, and petrochemical markets, with a focus on data analysis, is available on the petrotimes.ir',
        emailHtml: { bold: 'Email Us:', rest: 'info@petrotimes.ir' },
      },
      popularHeading: 'بیشترین بازدید روز',
      latestHeading: 'اخرین اخبار',
      popular: footerPopular,
      latest: footerLatest,
      copyright: 'حق نشر © 2026 Petro Times',
    },
  },
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(data, null, 2));
console.log('WROTE', OUT);
console.log('sections ok:',
  !!data.sections.heroMain.title, data.sections.heroSecondary.length,
  data.sections.tvPlaylist.length, data.sections.magazine.articles.length,
  data.sections.energyGrid.length, data.sections.footer.popular.length);
