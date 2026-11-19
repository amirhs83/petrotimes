'use client';

import { useEffect, useRef, useState } from 'react';
import type { TickerItem, MarketQuote } from '@/lib/content';

/**
 * Market data ticker — compact commodity cards after the client mobile
 * reference (359×474): white bar under the black header, market-menu glyph
 * pinned left (outside the scroll region), dark two-row cards
 * [name | icon] / [price ▲ change (percent)].
 *
 * Data integrity (master prompt §07):
 *  - product names/icons come from the content layer (ticker.items);
 *  - prices/changes come from the project's REAL market source
 *    (market.petrotimes.ir/fetch_prices.php) via the server route /api/market;
 *  - nothing is hardcoded: when the upstream publishes no value (it currently
 *    answers "N/A" for every product) the card shows an N/A unavailable state;
 *  - no fabricated feed, no demo values.
 *
 * Display order: the three petrochemical cards of the reference (methanol,
 * polyethylene, urea) lead the row; every other product of the dataset
 * follows in data order and stays reachable through the horizontal scroll.
 */

/* circular card icons (reference form); the data-driven item.icon remains
   the fallback for any product without a dedicated card icon */
const CARD_ICONS: Record<string, string> = {
  methanol: '/assets/icons/ticker/card-methanol.svg',
  polyethylene: '/assets/icons/ticker/card-polyethylene.svg',
  urea: '/assets/icons/ticker/card-urea.svg',
};

const PRIORITY = ['methanol', 'polyethylene', 'urea'];

export function MarketTicker({ items }: { items: TickerItem[] }) {
  const [quotes, setQuotes] = useState<Record<string, MarketQuote> | null>(null);
  const [failed, setFailed] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    const load = async () => {
      try {
        const res = await fetch('/api/market', { cache: 'no-store' });
        if (!res.ok) throw new Error(`market ${res.status}`);
        const json = (await res.json()) as { items?: MarketQuote[] };
        const map: Record<string, MarketQuote> = {};
        for (const q of json.items ?? []) map[q.key] = q;
        if (!alive.current) return;
        setQuotes(map);
        setFailed(false);
      } catch {
        if (alive.current) setFailed(true);
      }
    };
    load();
    const timer = setInterval(load, 30000);
    return () => {
      alive.current = false;
      clearInterval(timer);
    };
  }, []);

  /* reference order (methanol → polyethylene → urea) first, remaining
     products in data order after them (stable sort) */
  const rank = (key: string) => {
    const i = PRIORITY.indexOf(key);
    return i === -1 ? PRIORITY.length : i;
  };
  const ordered = [...items].sort((a, b) => rank(a.key) - rank(b.key));

  return (
    <div className="pt-ticker-widget" data-testid="market-ticker">
      <div className="pt-ticker-bar" dir="ltr">
        {/* market-menu glyph — the project has no market product-list
            capability, so it stays the inert visual element of the reference
            (aria-hidden), not a duplicate of the main menu */}
        <span className="pt-ticker-menu" aria-hidden="true">
          <span className="inner" />
        </span>
        <div className="pt-ticker-cards" data-testid="ticker-cards">
          {ordered.map((it) => (
            <TickerCard key={it.key} item={it} quote={quotes?.[it.key]} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** parse a raw upstream value ("49.00", "+49.00", "-1.2", "N/A") to a number */
function parseNum(v: string | null | undefined): number | null {
  if (v == null) return null;
  const m = /-?\d+(?:\.\d+)?/.exec(String(v).replace(/,/g, ''));
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function TickerCard({ item, quote }: { item: TickerItem; quote?: MarketQuote }) {
  const price = quote?.price ?? null;
  const change = quote?.change ?? null;
  const percent = quote?.percent ?? null;

  const priceNum = parseNum(price);
  const changeNum = parseNum(change);
  const unavailable =
    quote === undefined /* still loading */ ||
    priceNum === null ||
    changeNum === null;

  const direction = unavailable || changeNum === 0 ? 'flat' : changeNum > 0 ? 'up' : 'down';

  return (
    <div className="pt-ticker-card" data-key={item.key}>
      <div className="pt-ticker-card-top">
        <span className="pt-ticker-name">{item.name}</span>
        <img
          className="pt-ticker-icon"
          src={CARD_ICONS[item.key] ?? item.icon}
          alt=""
          width={14}
          height={14}
          loading="lazy"
        />
      </div>
      <div className="pt-ticker-row">
        {unavailable ? (
          <span className="pt-ticker-na" data-testid="ticker-na">
            {quote === undefined ? '…' : 'N/A'}
          </span>
        ) : (
          <>
            <span className="pt-ticker-price">{price}</span>
            <span className={`pt-ticker-change ${direction}`}>
              {direction === 'up' ? '▲' : direction === 'down' ? '▼' : '•'} {change} ({percent})
            </span>
          </>
        )}
      </div>
    </div>
  );
}
