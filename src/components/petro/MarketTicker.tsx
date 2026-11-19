'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TickerItem, MarketQuote } from '@/lib/content';

/**
 * Market data ticker — compact commodity cards after the client mobile
 * reference (359×474): white bar under the black header, market-menu glyph
 * pinned left (outside the moving region), dark two-row cards
 * [name | icon] / [price ▲ change (percent)].
 *
 * Motion (client request): the row is a SEAMLESS RIGHT-TO-LEFT marquee —
 * like the live site's original loop — and it is draggable: press and move
 * horizontally to scrub the cards in either direction; on release the
 * right-to-left loop resumes. Implementation:
 *  - the card set is rendered 3× (`.pt-ticker-set`); the loop period is the
 *    offset distance between the first two sets (width + gap, measured at
 *    runtime, breakpoint-independent);
 *  - a rAF loop advances `translate3d` by a time-based speed and wraps the
 *    offset into [-period, 0) — with 3 copies any viewport up to twice the
 *    set width (≈5300px) is always covered, so the wrap is invisible;
 *  - Pointer Events drive the scrubbing (mouse + touch; `touch-action:
 *    pan-y` keeps vertical page scrolling native), pointer capture keeps
 *    the gesture alive outside the bar, and the loop pauses only while a
 *    drag is active — on release the right-to-left motion resumes at once;
 *  - `prefers-reduced-motion: reduce` disables the auto-scroll (dragging
 *    still works) — the row becomes a manually browsable strip.
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
 * follows in data order and stays reachable through the loop/scrub.
 */

/* circular card icons (reference form); the data-driven item.icon remains
   the fallback for any product without a dedicated card icon */
const CARD_ICONS: Record<string, string> = {
  methanol: '/assets/icons/ticker/card-methanol.svg',
  polyethylene: '/assets/icons/ticker/card-polyethylene.svg',
  urea: '/assets/icons/ticker/card-urea.svg',
};

const PRIORITY = ['methanol', 'polyethylene', 'urea'];

/* copies of the card set for the seamless wrap — 3 covers viewports up to
   twice the set width (the dataset is the fixed 15-product contract, so one
   set is ≈1.7k/2.7k px wide at mobile/desktop breakpoints) */
const LOOP_COPIES = 3;

/* auto-scroll speed, px per second, right-to-left */
const SCROLL_SPEED = 30;

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

  /* ------------------------------------------------ loop machinery ------ */
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const posRef = useRef(0);
  const periodRef = useRef(0); /* one set width + gap, px */
  const draggingRef = useRef(false);
  const reducedRef = useRef(false);
  const dragStartX = useRef(0);
  const dragStartPos = useRef(0);
  const [dragging, setDragging] = useState(false);

  const applyPos = useCallback(() => {
    const track = trackRef.current;
    if (track) track.style.transform = `translate3d(${posRef.current}px, 0, 0)`;
  }, []);

  /* wrap the offset into [-period, 0) so any drag position lands on the
     equivalent seamless spot */
  const normalize = useCallback(() => {
    const period = periodRef.current;
    if (period <= 0) return;
    while (posRef.current <= -period) posRef.current += period;
    while (posRef.current > 0) posRef.current -= period;
    applyPos();
  }, [applyPos]);

  /* the loop period = distance between the first two set wrappers
     (set width + inter-set gap — works for every breakpoint) */
  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track || track.children.length < 2) return;
    const a = track.children[0] as HTMLElement;
    const b = track.children[1] as HTMLElement;
    const period = b.offsetLeft - a.offsetLeft;
    if (period > 0) periodRef.current = period;
    normalize();
  }, [normalize]);

  /* keep the period fresh: mount, viewport resize, and any layout change
     inside the row (quotes arriving, fonts loading) via ResizeObserver */
  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (trackRef.current) ro.observe(trackRef.current);
    if (viewportRef.current) ro.observe(viewportRef.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  /* auto-scroll: right-to-left, time-based (frame-rate independent),
     paused while dragging / mouse-hovering / reduced-motion */
  useEffect(() => {
    let raf = 0;
    let last: number | null = null;
    reducedRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tick = (ts: number) => {
      if (last === null) last = ts;
      const dt = Math.min(ts - last, 100); /* clamp tab-switch jumps */
      last = ts;
      const paused = draggingRef.current || reducedRef.current;
      if (!paused && periodRef.current > 0) {
        posRef.current -= (SCROLL_SPEED * dt) / 1000;
        normalize();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [normalize]);

  /* ------------------------------------------------ scrubbing ----------- */
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    draggingRef.current = true;
    dragStartX.current = e.clientX;
    dragStartPos.current = posRef.current;
    setDragging(true);
    viewportRef.current?.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    posRef.current = dragStartPos.current + (e.clientX - dragStartX.current);
    normalize();
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    const vp = viewportRef.current;
    if (vp && vp.hasPointerCapture(e.pointerId)) vp.releasePointerCapture(e.pointerId);
  };

  return (
    <div className="pt-ticker-widget" data-testid="market-ticker">
      <div className="pt-ticker-bar" dir="ltr">
        {/* market-menu glyph — the project has no market product-list
            capability, so it stays the inert visual element of the reference
            (aria-hidden), not a duplicate of the main menu */}
        <span className="pt-ticker-menu" aria-hidden="true">
          <span className="inner" />
        </span>
        <div
          className={`pt-ticker-viewport${dragging ? ' is-dragging' : ''}`}
          ref={viewportRef}
          data-testid="ticker-viewport"
          role="region"
          aria-label="Market prices — auto-scrolling loop, drag to browse"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="pt-ticker-track" ref={trackRef} data-testid="ticker-cards">
            {Array.from({ length: LOOP_COPIES }, (_, copy) => (
              <div
                className="pt-ticker-set"
                key={copy}
                aria-hidden={copy > 0 ? true : undefined}
              >
                {ordered.map((it) => (
                  <TickerCard key={it.key} item={it} quote={quotes?.[it.key]} />
                ))}
              </div>
            ))}
          </div>
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
          draggable={false}
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
