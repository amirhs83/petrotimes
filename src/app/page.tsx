import { getHomepageData } from '@/lib/wp';
import { Chrome } from '@/components/petro/Chrome';
import { MarketTicker } from '@/components/petro/MarketTicker';
import { HighlightsHero, SmallPostCard } from '@/components/petro/PostCards';
import { TvSection } from '@/components/petro/TvSection';
import { MagazineSlider } from '@/components/petro/MagazineSlider';
import { FeatureTitle } from '@/components/petro/FeatureTitle';
import { SocialWidget } from '@/components/petro/SocialWidget';
import { NewsletterWidget } from '@/components/petro/NewsletterWidget';
import { EnergySection } from '@/components/petro/EnergySection';
import { AdvertiseRow } from '@/components/petro/AdvertiseRow';
import { SiteFooter } from '@/components/petro/SiteFooter';

/**
 * Petro Times homepage — assembled from the WordPress data layer.
 * Section order and geometry reproduce the live capture (geometry-1920.json):
 * header 63 → ticker 45 → TOP NEWS (content 788 / sidebar 356) → ENERGY →
 * ADVERTISE (-52px offset) → footer 502 → copyright 41.
 */
export default async function Home() {
  const data = await getHomepageData();
  const s = data.sections;

  return (
    <>
      <Chrome menu={data.header.menu} whatsHot={s.offcanvas.whatsHot} newsletter={s.newsletter} />

      <div className="pt-ticker-section">
        <MarketTicker iframeUrl={data.ticker.iframeUrl} items={data.ticker.items} />
      </div>

      <main className="main-wrap">
        {/* ============================ SECTION A — TOP NEWS ============================ */}
        <div className="pt-section pt-section-topnews">
          <div className="pt-container">
            <div className="pt-columns">
              <div className="pt-content-col">
                {/* hero (384, right) + 4 secondary cards (384, left) */}
                <div className="pt-duo">
                  <div className="pt-duo-hero">
                    <HighlightsHero article={s.heroMain} weight="900" />
                  </div>
                  <div className="pt-duo-secondary">
                    {s.heroSecondary.map((a) => (
                      <SmallPostCard key={a.url} article={a} size="s" clamp={false} />
                    ))}
                  </div>
                </div>
                <TvSection player={s.tvPlayer} playlist={s.tvPlaylist} />
              </div>
              <aside className="pt-sidebar-col">
                <div className="pt-widget pt-topnews-widget">
                  <div className="pt-block-head pt-block-head-d is-left">
                    <h4 className="heading">{s.topNewsLabel.label}</h4>
                  </div>
                  <SmallPostCard article={s.topNewsLabel.article} />
                </div>
                <div className="pt-widget pt-topnews-items">
                  {s.topNewsItems.map((a) => (
                    <SmallPostCard key={a.url} article={a} />
                  ))}
                </div>
                <MagazineSlider label={s.magazine.label} articles={s.magazine.articles} />
                <FeatureTitle items={s.featureTitle.items} />
              </aside>
            </div>
          </div>
        </div>

        {/* ============================ SECTION B — ENERGY ============================== */}
        <div className="pt-section pt-section-energy">
          <div className="pt-container">
            <div className="pt-columns">
              <div className="pt-content-col">
                <EnergySection main={s.energyMain} subs={s.energySubs} grid={s.energyGrid} />
              </div>
              <aside className="pt-sidebar-col">
                <SocialWidget label={s.social.label} links={s.social.links} />
                <NewsletterWidget data={s.newsletter} />
              </aside>
            </div>
          </div>
        </div>

        {/* ============================== ADVERTISE ===================================== */}
        <AdvertiseRow label={s.advertise.label} items={s.advertise.items} />
      </main>

      <SiteFooter footer={s.footer} />
    </>
  );
}
