import type { HomepageData } from './types';
import { getSnapshot } from './snapshot';
import { fetchLiveHomepage } from './wordpress';

export type { Article, FeatureArticle, HomepageData, MenuItem, SocialLink, TickerItem } from './types';

export type WpMode = 'snapshot' | 'live';

/**
 * Homepage data source selector.
 *  - WP_MODE=snapshot (default, test environment): the fixed content snapshot
 *    captured from the live site — deterministic, used by visual regression.
 *  - WP_MODE=live: WordPress REST API (requires WP_BASE_URL).
 */
export async function getHomepageData(): Promise<HomepageData> {
  const mode = (process.env.WP_MODE as WpMode | undefined) ?? 'snapshot';
  const baseUrl = process.env.WP_BASE_URL;
  if (mode === 'live' && baseUrl) {
    try {
      return await fetchLiveHomepage({ baseUrl });
    } catch (err) {
      console.error('[wp] live fetch failed, falling back to snapshot:', err);
      return getSnapshot();
    }
  }
  return getSnapshot();
}
