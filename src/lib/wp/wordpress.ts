import type {
  Article,
  HomepageData,
  MenuItem,
} from './types';

/**
 * Live WordPress adapter.
 *
 * When WP_MODE=live and WP_BASE_URL are configured, the homepage data is
 * assembled from the public WordPress REST API (wp-json/wp/v2). The rendering
 * contract is identical to the snapshot source: the components never know
 * which source produced the data.
 *
 * Backend requirements (documented in LIMITATIONS.md):
 *  - REST API must be public: /wp-json/wp/v2/posts, /wp-json/wp/v2/categories,
 *    /wp-json/wp/v2/media.
 *  - Widget selection logic (which post appears in which homepage widget) is
 *    stored in Elementor page 7322 settings and is NOT exposed by the REST API.
 *    Until the client provides the template export, the live adapter uses
 *    transparent, documented selection rules (latest per section / category).
 */

export interface WpConfig {
  baseUrl: string;
}

export interface WpPost {
  id: number;
  link: string;
  date_gmt: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  categories: number[];
  jetpack_featured_media_url?: string;
  _links?: Record<string, unknown>;
}

interface WpCategory {
  id: number;
  name: string;
  link: string;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&#8230;/g, '…')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#8211;/g, '–')
    .trim();
}

/** Persian calendar formatting (no external deps): uses Intl with islamic + manual jalali */
const JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  const gy2 = gy <= 1600 ? gy - 621 : gy - 1600;
  let days =
    365 * gy2 + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) - 80 + gd + g_d_m[gm - 1];
  if (gm > 2 && ((gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0)) days += 1;
  jy += 6 * Math.floor(days / 146097);
  days %= 146097;
  if (days >= 146096) { days += 1; } else { jy += Math.floor(days / 1461) * 0; }
  jy += Math.floor(days / 36524);
  days = days % 36524;
  jy += Math.floor(days / 1461);
  days = days % 1461;
  if (days > 0) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
    if (days < 186) { return [jy, Math.floor(days / 31) + 1, (days % 31) + 1]; }
    return [jy, Math.floor((days - 186) / 30) + 7, ((days - 186) % 30) + 1];
  }
  return [jy, 1, 1];
}

function faDigits(s: string): string {
  return s.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
}

export function formatPersianDate(iso: string): string {
  const d = new Date(iso);
  const [jy, jm, jd] = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return faDigits(`${jd} ${JALALI_MONTHS[jm - 1]} ${jy} - ${hh}:${mm}`);
}

export function mapPost(post: WpPost, categories: WpCategory[]): Article {
  const cat = categories.find((c) => post.categories?.includes(c.id)) ?? null;
  return {
    title: stripHtml(post.title?.rendered ?? ''),
    url: post.link,
    dateText: formatPersianDate(post.date_gmt ? `${post.date_gmt}Z` : post.date_gmt),
    category: cat ? cat.name : null,
    categoryUrl: cat ? cat.link : null,
    excerpt: post.excerpt?.rendered ? stripHtml(post.excerpt.rendered) : null,
    image: post.jetpack_featured_media_url ?? null,
    imageFull: post.jetpack_featured_media_url ?? null,
  };
}

/**
 * Assemble the homepage from a live WordPress REST API.
 * Selection rules (documented, replaceable by the client's Elementor export):
 *  - heroMain / energyMain: latest post in بین الملل / انرژی
 *  - heroSecondary, topNews, playlist: latest posts excluding those used above
 *  - magazine: latest posts in category magazine
 */
export async function fetchLiveHomepage(cfg: WpConfig): Promise<HomepageData> {
  const base = cfg.baseUrl.replace(/\/$/, '');
  const [postsRes, catsRes] = await Promise.all([
    fetch(`${base}/wp-json/wp/v2/posts?per_page=40&_fields=id,link,date_gmt,title,excerpt,categories,jetpack_featured_media_url`, { cache: 'no-store' }),
    fetch(`${base}/wp-json/wp/v2/categories?per_page=100&_fields=id,name,link`, { cache: 'no-store' }),
  ]);
  if (!postsRes.ok || !catsRes.ok) throw new Error('WordPress REST API unavailable');
  const posts = (await postsRes.json()) as WpPost[];
  const categories = (await catsRes.json()) as WpCategory[];
  const articles = posts.map((p) => mapPost(p, categories));
  const used = new Set<number>();

  const pick = (pred: (p: WpPost) => boolean, count: number): Article[] => {
    const out: Article[] = [];
    for (const p of posts) {
      if (out.length >= count) break;
      if (used.has(p.id) || !pred(p)) continue;
      used.add(p.id);
      out.push(articles[posts.indexOf(p)]);
    }
    return out;
  };

  const catId = (slugish: string) => (p: WpPost) => {
    const c = categories.find((cc) => postHasCat(p, cc));
    return !!c && (c.name === slugish || c.link.includes(slugish));
  };
  const postHasCat = (p: WpPost, c: WpCategory) => p.categories?.includes(c.id);

  const fallbackPick = (count: number): Article[] => pick(() => true, count);

  const heroMain = articles[posts.findIndex((p) => catId('بین الملل')(p))] ?? fallbackPick(1)[0];
  const heroSecondary = fallbackPick(4);
  const tvPlayer = fallbackPick(1)[0];
  const tvPlaylist = fallbackPick(5);
  const topNewsLabel = fallbackPick(1)[0];
  const topNewsItems = fallbackPick(3);
  const energyMain = articles[posts.findIndex((p) => catId('انرژی')(p))] ?? fallbackPick(1)[0];
  const energySubs = fallbackPick(2);
  const energyGrid = fallbackPick(3);
  const advertise = fallbackPick(2);
  const popular = fallbackPick(4);
  const latest = fallbackPick(4);
  const magazineCats = categories.filter((c) => /magazine/i.test(c.name));
  const magazinePosts = posts.filter((p) => magazineCats.some((c) => postHasCat(p, c)));
  const magazine = magazinePosts.slice(0, 5).map((p) => articles[posts.indexOf(p)]);

  return {
    capturedAt: new Date().toISOString(),
    source: base,
    header: {
      menu: [
        { label: 'صفحه اصلی', href: '/', current: true },
        { label: 'نفت', href: `${base}/naft/` },
        { label: 'گاز', href: `${base}/gas/` },
        { label: 'پتروشیمی', href: `${base}/petroshimi/` },
        { label: 'پالایش و پخش', href: `${base}/palayesh-va-pakhsh/` },
        { label: 'بین الملل', href: `${base}/bein-al-melal/` },
        { label: 'همه اخبار', href: `${base}/all-post/` },
        { label: 'Advertise', href: '#' },
        { label: 'Magazine', href: `${base}/magazine/` },
      ],
    },
    ticker: getSnapshotTicker(),
    sections: {
      heroMain,
      heroSecondary,
      tvPlayer,
      tvPlaylist,
      topNewsLabel: { label: 'top news', article: topNewsLabel },
      topNewsItems,
      magazine: { label: 'magazine', articles: magazine },
      featureTitle: { label: 'feature title', items: [] as never },
      energyMain,
      energySubs,
      energyGrid,
      advertise: { label: 'advertise', items: advertise },
      social: getSnapshotSocial(),
      newsletter: getSnapshotNewsletter(),
      footer: {
        about: getSnapshotAbout(),
        popularHeading: 'بیشترین بازدید روز',
        latestHeading: 'اخرین اخبار',
        popular,
        latest,
        copyright: 'حق نشر © ' + new Date().getFullYear() + ' Petro Times',
      },
    },
  };
}

/* static chrome data reused from the snapshot in live mode */
import snapshotData from '@/data/homepage-data.json';
const snap = snapshotData as unknown as HomepageData;
const getSnapshotTicker = () => snap.ticker;
const getSnapshotSocial = () => snap.sections.social;
const getSnapshotNewsletter = () => snap.sections.newsletter;
const getSnapshotAbout = () => snap.sections.footer.about;
