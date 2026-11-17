/**
 * Shared data types for the Petro Times homepage data layer.
 *
 * These shapes describe BOTH data sources:
 *  - the fixed homepage snapshot (src/data/homepage-data.json), and
 *  - the WordPress REST adapter (wordpress.ts `fetchLiveHomepage`).
 */

/** One news article as rendered anywhere on the homepage. */
export interface Article {
  title: string;
  url: string;
  /** Pre-formatted Persian date line, e.g. "۲۹ مرداد ۱۴۰۵ - ۱۵:۲۳". */
  dateText: string;
  category: string | null;
  categoryUrl: string | null;
  excerpt: string | null;
  /** Thumbnail used in cards (wp size 150/200/300). */
  image: string | null;
  /** Large variant for hero/TV overlays. */
  imageFull: string | null;
}

/** FEATURE TITLE ranked item (rank icon PNG path + article fields). */
export interface FeatureArticle {
  title: string;
  url: string;
  dateText: string;
  category: string | null;
  categoryUrl: string | null;
  /** /assets/icons/number-*.png */
  rankIcon: string;
}

/** Header / off-canvas menu item. */
export interface MenuItem {
  label: string;
  href: string;
  /** Current page flag — reproduces the live current-menu-item state. */
  current?: boolean;
}

/** Social link row of the WE ARE SOCIAL widget. */
export interface SocialLink {
  network: string;
  label: string;
  href: string;
}

/** Market ticker item (native fallback marquee). */
export interface TickerItem {
  key: string;
  name: string;
  icon: string;
}

/** Newsletter subscribe block (sidebar + off-canvas). */
export interface NewsletterData {
  heading: string;
  text: string;
  placeholder: string;
  button: string;
  disclaimer: string;
  disclaimerLink: string;
}

/** Footer ABOUT US + post columns + copyright. */
export interface FooterData {
  about: {
    heading: string;
    text: string;
    emailHtml: { bold: string; rest: string };
  };
  popularHeading: string;
  latestHeading: string;
  popular: Article[];
  latest: Article[];
  copyright: string;
}

/** Complete homepage data contract. */
export interface HomepageData {
  header: { menu: MenuItem[] };
  ticker: { iframeUrl: string; items: TickerItem[] };
  sections: {
    heroMain: Article;
    heroSecondary: Article[];
    tvPlayer: Article;
    tvPlaylist: Article[];
    topNewsLabel: { label: string; article: Article };
    topNewsItems: Article[];
    magazine: { label: string; articles: Article[] };
    featureTitle: { label: string; items: FeatureArticle[] };
    energyMain: Article;
    energySubs: Article[];
    energyGrid: Article[];
    social: { label: string; links: SocialLink[] };
    newsletter: NewsletterData;
    advertise: { label: string; items: Article[] };
    footer: FooterData;
    offcanvas: {
      whatsHot: Article[];
    };
  };
}
