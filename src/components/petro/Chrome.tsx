'use client';

import { useEffect, useRef, useState } from 'react';
import type { MenuItem } from '@/lib/wp';
import { Icon } from './Primitives';
import { SmallPostCard } from './PostCards';
import type { Article } from '@/lib/wp';

/**
 * Site chrome: desktop header (sticky-smart), mobile header (≤1024),
 * off-canvas menu and fullscreen search modal — all interactivity of the
 * original SmartMag chrome reproduced.
 */
export function Chrome({ menu }: { menu: MenuItem[] }) {
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
          { }
          <img src="/assets/logos/logo-main-PAsset-3-1.png" alt="Petro Times" width={265} height={44} />
        </div>
        <div className="pt-offcanvas-content">
          <ul className="mobile-menu">
            {menu.map((item) => (
              <li key={item.label}>
                <a href={item.href} onClick={() => setOffcanvasOpen(false)}>{item.label}</a>
              </li>
            ))}
          </ul>
          <OffCanvasWidgets />
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

/* off-canvas bottom widgets: What's Hot (2 posts) + subscribe block,
   matching the extracted off-canvas DOM (snapshot content) */
function OffCanvasWidgets() {
  const hot: Article[] = [
    {
      title: '۲۸ مرداد؛ روایتی کهنه از طمعی تازه',
      url: 'https://petrotimes.ir/%db%b2%db%b8-%d9%85%d8%b1%d8%af%d8%a7%d8%af%d8%9b-%d8%b1%d9%88%d8%a7%db%8c%d8%aa%db%8c-%da%a9%d9%87%d9%86%d9%87-%d8%a7%d8%b2-%d8%b7%d9%85%d8%b9%db%8c-%d8%aa%d8%a7%d8%b2%d9%87/',
      dateText: '۲۹ مرداد ۱۴۰۵ - ۱۵:۲۳',
      category: null,
      categoryUrl: null,
      excerpt: null,
      image: '/assets/images/44-150x94.jpg',
      imageFull: '/assets/images/44.jpg',
    },
    {
      title: 'پارس جنوبی، نه‌فقط برای امروز، فشارافزایی-تصمیمی برای ماندن',
      url: 'https://petrotimes.ir/%d9%be%d8%a7%d8%b1%d8%b3-%d8%ac%d9%86%d9%88%d8%a8%db%8c%d8%8c-%d9%86%d9%87%d9%81%d9%82%d8%b7-%d8%a8%d8%b1%d8%a7%db%8c-%d8%a7%d9%85%d8%b1%d9%88%d8%b2%d8%8c-%d9%81%d8%b4%d8%a7%d8%b1%d8%a7%d9%81/',
      dateText: '۲۹ مرداد ۱۴۰۵ - ۱۲:۳۰',
      category: null,
      categoryUrl: null,
      excerpt: null,
      image: '/assets/images/41-150x84.jpg',
      imageFull: '/assets/images/41.jpg',
    },
  ];
  return (
    <div className="pt-offcanvas-widgets">
      <div className="pt-widget pt-whatshot">
        <div className="pt-block-head pt-block-head-b">
          <h5 className="heading">What&apos;s Hot</h5>
        </div>
        <div className="pt-loop">
          {hot.map((a) => (
            <SmallPostCard key={a.url} article={a} variant="dark" />
          ))}
        </div>
      </div>
    </div>
  );
}
