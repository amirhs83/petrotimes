'use client';

import { useEffect, useRef, useState } from 'react';
import type { TickerItem } from '@/lib/content';

/**
 * Market data ticker — keeps the real embedded iframe (https://market.petrotimes.ir)
 * exactly as the live site. If the iframe cannot load within 6s or errors,
 * a native replica (same extracted geometry/CSS, N/A fallback feed) renders.
 */
export function MarketTicker({ iframeUrl, items }: { iframeUrl: string; items: TickerItem[] }) {
  const [iframeFailed, setIframeFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timer.current = setTimeout(() => setIframeFailed(true), 6000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const handleLoad = () => {
    if (timer.current) clearTimeout(timer.current);
  };

  return (
    <div className="pt-ticker-widget" data-testid="market-ticker">
      {!iframeFailed ? (
        <iframe
          src={iframeUrl}
          className="pt-ticker-iframe"
          title="Market Ticker"
          loading="eager"
          onLoad={handleLoad}
          onError={() => setIframeFailed(true)}
        />
      ) : (
        <TickerNative items={items} />
      )}
    </div>
  );
}

/** Native replica of market.petrotimes.ir (extracted CSS + commodity list). */
function TickerNative({ items }: { items: TickerItem[] }) {
  const doubled = [...items, ...items];
  return (
    <div className="pt-ticker-native" dir="ltr" data-testid="ticker-native">
      <div className="pt-ticker-slider">
        {doubled.map((it, i) => (
          <div className="pt-ticker-item" key={`${it.key}-${i}`} data-key={it.key}>
            { }
            <img src={it.icon} alt={`${it.name} logo`} width={20} height={20} />
            <div className="pt-market-name">{it.name}</div>
            <div className="pt-market-value">N/A</div>
            <div className="pt-market-change positive">N/A (N/A)</div>
          </div>
        ))}
      </div>
    </div>
  );
}
