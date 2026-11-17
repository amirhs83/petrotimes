import type { HomepageData } from './types';
import { getSnapshot } from './snapshot';
import { fetchRemoteHomepage } from './remote';

export type {
  Article,
  FeatureArticle,
  FooterData,
  HomepageData,
  MenuItem,
  NewsletterData,
  SocialLink,
  TickerItem,
} from './types';

export type ContentMode = 'snapshot' | 'remote';

/**
 * Homepage data source selector — backend-agnostic.
 *
 *  - CONTENT_API_MODE=snapshot (default): the fixed content snapshot captured
 *    from the reference site — deterministic, used by the visual regression
 *    suite. Works with zero configuration.
 *  - CONTENT_API_MODE=remote: fetches the assembled homepage JSON from the
 *    external content backend (any language) at CONTENT_API_BASE_URL.
 *    See docs/API-CONTRACT.md for the HTTP contract the backend must fulfill.
 *
 * If the remote backend is unreachable or returns an invalid payload, the app
 * falls back to the snapshot automatically (the page never renders empty).
 */
export async function getHomepageData(): Promise<HomepageData> {
  const mode = (process.env.CONTENT_API_MODE as ContentMode | undefined) ?? 'snapshot';
  const baseUrl = process.env.CONTENT_API_BASE_URL;
  if (mode === 'remote' && baseUrl) {
    try {
      return await fetchRemoteHomepage({
        baseUrl,
        token: process.env.CONTENT_API_TOKEN,
        timeoutMs: Number(process.env.CONTENT_API_TIMEOUT_MS ?? '') || 8000,
      });
    } catch (err) {
      console.error('[content] remote fetch failed, falling back to snapshot:', err);
      return getSnapshot();
    }
  }
  return getSnapshot();
}
