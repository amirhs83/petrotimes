import type { HomepageData } from './types';

/**
 * Remote content adapter — BACKEND-AGNOSTIC.
 *
 * Expects a single REST endpoint that returns the exact `HomepageData` JSON
 * documented in docs/API-CONTRACT.md. The backend may be implemented in any
 * language/framework; only this HTTP contract matters:
 *
 *   GET {CONTENT_API_BASE_URL}/homepage
 *   → 200 OK, application/json, body = HomepageData
 *
 * Optional authentication: when CONTENT_API_TOKEN is set, a static
 * `Authorization: Bearer <token>` header is sent with every request.
 *
 * Dates arrive pre-formatted (`dateText`) — the backend owns calendar
 * formatting. Media URLs arrive absolute (or app-relative for bundled assets).
 * Rendering components never know which source produced the data.
 */

export interface RemoteConfig {
  baseUrl: string;
  token?: string;
  timeoutMs?: number;
}

/** Lightweight structural guard — not full validation, just fail-fast shape check. */
export function isHomepageData(value: unknown): value is HomepageData {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<HomepageData>;
  return (
    Array.isArray(v.header?.menu) &&
    typeof v.ticker?.iframeUrl === 'string' &&
    Array.isArray(v.ticker?.items) &&
    typeof v.sections === 'object' &&
    v.sections !== null &&
    typeof v.sections.heroMain?.title === 'string' &&
    Array.isArray(v.sections.heroSecondary) &&
    Array.isArray(v.sections.tvPlaylist) &&
    Array.isArray(v.sections.advertise?.items) &&
    typeof v.sections.footer?.copyright === 'string'
  );
}

export async function fetchRemoteHomepage(cfg: RemoteConfig): Promise<HomepageData> {
  const base = cfg.baseUrl.replace(/\/+$/, '');
  const url = `${base}/homepage`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs ?? 8000);
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        ...(cfg.token ? { Authorization: `Bearer ${cfg.token}` } : {}),
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Content API ${url} responded ${res.status}`);
    }
    const json: unknown = await res.json();
    if (!isHomepageData(json)) {
      throw new Error('Content API payload does not match the homepage contract (docs/API-CONTRACT.md)');
    }
    return json;
  } finally {
    clearTimeout(timer);
  }
}
