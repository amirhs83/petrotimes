'use client';

import { useEffect, useRef, useState } from 'react';
import type { MenuItem, Article, NewsletterData } from '@/lib/wp';
import { Icon } from './Primitives';
import { SmallPostCard } from './PostCards';
import { NewsletterWidget } from './NewsletterWidget';

/**
 * Site chrome: desktop header (sticky-smart), mobile header (≤1024),
 * off-canvas menu (menu + What's Hot + newsletter) and fullscreen search
 * modal — all interactivity of the original SmartMag chrome reproduced.
 */
export function Chrome({
  menu,
  whatsHot,
  newsletter,
}: {
  menu: MenuItem[];
  whatsHot: Article[];
  newsletter: NewsletterData;
}) {
  const [offcanvasOpen, setOffcanvasOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sticky, setSticky] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);

  /* smart sticky: header fixes after scrolling past its own height */
  useEffect(() => {
    const onScroll = () => setSticky(window.scrollY > 63);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) searchInput.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setOffcanvasOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* lock page scroll while overlays are open (live behavior) */
  useEffect(() => {
    document.documentElement.classList.toggle('pt-modal-open', offcanvasOpen || searchOpen);
    return () => document.documentElement.classList.remove('pt-modal-open');
  }, [offcanvasOpen, searchOpen]);

  return (
    <>
      {/* desktop header */}
      <header className={`pt-smart-head ${sticky ? 'is-sticky' : ''}`} id="smart-head" data-sticky="auto">
        <div className="pt-head-row pt-dark">
          <div className="pt-wrap">
            <div className="pt-head-items-left">
              <button
                type="button"
                className="pt-offcanvas-toggle"
                aria-label="Menu"
                onClick={() => setOffcanvasOpen(true)}
              >
                <span className="pt-hamburger"><span className="inner" /></span>
              </button>
              <a href="/" title="Petro Times" rel="home" className="pt-logo-link">
                <span>
                  { }
                  <img
                    src="/assets/logos/logo-main-PAsset-3-1.png"
                    className="pt-logo-img"
                    alt="Petro Times"
                    width={529}
                    height={88}
                  />
                </span>
              </a>
              <nav className="pt-nav-wrap" aria-label="Main">
                <ul className="pt-navigation menu">
                  {menu.map((item) => (
                    <li key={item.label} className={item.current ? 'current-menu-item' : ''}>
                      <a href={item.href} aria-current={item.current ? 'page' : undefined}>
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
            <div className="pt-head-items-right">
              <a
                href="#"
                className="pt-search-icon"
                title="Search"
                onClick={(e) => {
                  e.preventDefault();
                  setSearchOpen(true);
                }}
              >
                <Icon name="search" />
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* mobile header (≤1024) */}
      <div className={`pt-mobile-head ${sticky ? 'is-sticky' : ''}`} id="smart-head-mobile">
        <div className="pt-mobile-head-row pt-dark">
          <div className="pt-wrap">
            <button
              type="button"
              className="pt-mobile-toggle"
              aria-label="Menu"
              onClick={() => setOffcanvasOpen(true)}
            >
              <span className="pt-hamburger"><span className="inner" /></span>
            </button>
            <a href="/" className="pt-mobile-logo" aria-label="Petro Times">
              { }
              <img src="/assets/logos/logo-main-PAsset-3-1.png" alt="Petro Times" width={265} height={44} />
            </a>
            <a
              href="#"
              className="pt-mobile-search"
              aria-label="Search"
              onClick={(e) => {
                e.preventDefault();
                setSearchOpen(true);
              }}
            >
              <Icon name="search" />
            </a>
          </div>
        </div>
      </div>

      {/* off-canvas menu */}
      <div
        className={`pt-offcanvas-backdrop ${offcanvasOpen ? 'is-open' : ''}`}
        onClick={() => setOffcanvasOpen(false)}
        aria-hidden="true"
      />
      <aside className={`pt-offcanvas pt-dark ${offcanvasOpen ? 'is-open' : ''}`} id="off-canvas" aria-hidden={!offcanvasOpen}>
        <div className="pt-offcanvas-head">
          <button type="button" className="pt-offcanvas-close" aria-label="Close Menu" onClick={() => setOffcanvasOpen(false)}>
            <Icon name="times" />
          </button>
          <a href="/" className="pt-offcanvas-logo" title="Petro Times" rel="home">
            <img src="/assets/logos/logo-main-PAsset-3-1.png" alt="Petro Times" width={265} height={44} />
          </a>
        </div>
        <div className="pt-offcanvas-content">
          <ul className="mobile-menu">
            {menu.map((item) => (
              <li key={item.label}>
                <a href={item.href} onClick={() => setOffcanvasOpen(false)}>{item.label}</a>
              </li>
            ))}
          </ul>
          <OffCanvasWidgets whatsHot={whatsHot} newsletter={newsletter} />
        </div>
      </aside>

      {/* search modal */}
      <div className={`pt-search-modal ${searchOpen ? 'is-open' : ''}`} role="dialog" aria-modal="true" aria-hidden={!searchOpen}>
        <button type="button" className="pt-search-close" aria-label="Close Search" onClick={() => setSearchOpen(false)}>
          <Icon name="times" />
        </button>
        <div className="pt-search-modal-box">
          <form
            method="get"
            className="search-form"
            action="https://petrotimes.ir/"
            onSubmit={() => setSearchOpen(false)}
          >
            <input
              ref={searchInput}
              type="search"
              className="pt-search-field"
              name="s"
              placeholder="Search..."
              required
              autoComplete="off"
            />
            <button type="submit" className="pt-visuallyhidden">Submit</button>
            <p className="pt-search-message">
              Type above and press <em>Enter</em> to search. Press <em>Esc</em> to cancel.
            </p>
          </form>
        </div>
      </div>
    </>
  );
}

/* off-canvas bottom widgets: What's Hot (3 posts, 32px separators) +
   subscribe block (6px frame) — reproduces the live off-canvas widgets
   column (756.3px total). */
function OffCanvasWidgets({ whatsHot, newsletter }: { whatsHot: Article[]; newsletter: NewsletterData }) {
  return (
    <div className="pt-offcanvas-widgets">
      <div className="pt-widget pt-whatshot">
        <div className="pt-block-head pt-block-head-b">
          <h5 className="heading">What&apos;s Hot</h5>
        </div>
        <div className="pt-loop">
          {whatsHot.map((a) => (
            <SmallPostCard key={a.url} article={a} variant="dark" />
          ))}
        </div>
      </div>
      <div className="pt-newsletter-frame">
        <NewsletterWidget data={newsletter} />
      </div>
    </div>
  );
}
