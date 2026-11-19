import { NextResponse } from 'next/server';
import { getHomepageData } from '@/lib/content';
import type { MarketQuote } from '@/lib/content';

/**
 * /api/market — live commodity quotes for the market ticker.
 *
 * Server-side bridge to the project's REAL market data source: the market
 * widget host (ticker.iframeUrl, https://market.petrotimes.ir) publishes
 * fetch_prices.php — the exact endpoint the live widget polls. This route
 * fetches it server-side, maps the raw { key: { first, sec, third } } payload
 * onto the ticker items of the content layer and serves normalized JSON.
 *
 *  - first  -> price      (e.g. "3594.00", or "N/A" when unpublished)
 *  - sec    -> change     (signed amount)
 *  - third  -> percent    (signed percentage)
 *
 * Caching: 30s in-memory TTL (the upstream itself publishes on its own
 * schedule; the live widget polls every 5s — 30s keeps this bridge polite).
 * On upstream failure the route answers ok:false with null fields — the
 * client renders the N/A unavailable state. Prices are NEVER fabricated.
 */
export const dynamic = 'force-dynamic';

const TTL_MS = 30_000;
let cache: { at: number; payload: MarketQuotesPayload } | null = null;

interface MarketQuotesPayload {
  ok: boolean;
  updatedAt: string;
  items: MarketQuote[];
}

export async function GET() {
  if (cache && Date.now() - cache.at < TTL_MS) {
    return NextResponse.json(cache.payload);
  }
  const payload = await loadQuotes();
  cache = { at: Date.now(), payload };
  return NextResponse.json(payload);
}

async function loadQuotes(): Promise<MarketQuotesPayload> {
  const data = await getHomepageData();
  const items = data.ticker.items;
  const updatedAt = new Date().toISOString();

  try {
    const base = new URL(data.ticker.iframeUrl).origin;
    const res = await fetch(`${base}/fetch_prices.php`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
      headers: { accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const raw = (await res.json()) as Record<string, { first?: string; sec?: string; third?: string }>;

    const quotes: MarketQuote[] = items.map((it) => ({
      key: it.key,
      price: raw[it.key]?.first ?? null,
      change: raw[it.key]?.sec ?? null,
      percent: raw[it.key]?.third ?? null,
    }));
    return { ok: true, updatedAt, items: quotes };
  } catch {
    // upstream unreachable — report unavailable, never fabricate
    return {
      ok: false,
      updatedAt,
      items: items.map((it) => ({ key: it.key, price: null, change: null, percent: null })),
    };
  }
}
