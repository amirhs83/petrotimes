#!/usr/bin/env python3
"""
capture-live.py — recapture CLEAN reference baselines from the live site.

The Phase-01 reference full-page captures (petrotimes-extraction/screenshots)
carry a documented artifact (LIMITATIONS.md §6, compare.py header note): the
SmartMag sticky header was mid-animation when the shot was taken, which
shifted the whole page content below y≈140 by ~55px at 1440/1366/1280 and hid
the ticker strip on some widths. This script recaptures the same 12 widths
from https://petrotimes.ir/ with a settle sequence that provably returns the
page to its resting state before the shot:

  1. networkidle load (same launch args / UA / locale / DPR as capture.py)
  2. full scroll pass → lazy backgrounds + footer content-visibility rendered
  3. back to top, long settle, then assert: scrollY == 0, desktop header
     height == 63 (mobile 48), ticker box at docY == 63 (mobile 48),
     document height stable across two samples 1s apart
  4. full-page screenshot

All operations are READ-ONLY against the target site.

Usage:  python3 capture-live.py [--out ../baselines] [--widths 1920,1440,...]
"""
import argparse
import json
import pathlib
import sys
import time

from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE.parent / "baselines"

WIDTHS = [
    (1920, "desktop"), (1440, "desktop"), (1366, "desktop"),
    (1280, "desktop"), (1024, "desktop"),
    (834, "tablet"), (768, "tablet"),
    (430, "mobile"), (414, "mobile"), (390, "mobile"),
    (375, "mobile"), (360, "mobile"),
]

LAUNCH_ARGS = ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"]
USER_AGENT = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
              "(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36")
LOCALE = "fa-IR"
SITE = "https://petrotimes.ir/"

STATE_JS = """() => {
  const head = document.querySelector('#smart-head .smart-head-row');
  const mhead = document.querySelector('#smart-head-mobile .smart-head-row');
  const ticker = document.querySelector('[data-id="1c95847"]');
  const hr = head ? head.getBoundingClientRect() : null;
  const mr = mhead ? mhead.getBoundingClientRect() : null;
  const tr = ticker ? ticker.getBoundingClientRect() : null;
  return {
    scrollY: window.scrollY,
    headH: hr ? Math.round(hr.height * 10) / 10 : null,
    headTop: hr ? Math.round((hr.top + window.scrollY) * 10) / 10 : null,
    mobileH: mr ? Math.round(mr.height * 10) / 10 : null,
    tickerY: tr ? Math.round((tr.top + window.scrollY) * 10) / 10 : null,
    tickerH: tr ? Math.round(tr.height * 10) / 10 : null,
    docH: document.documentElement.scrollHeight,
    stickyClones: document.querySelectorAll('.smart-head-sticky').length,
  };
}"""


def settle(page, width: int) -> dict:
    """Full scroll pass + return-to-top + verified resting state."""
    page.wait_for_function("document.fonts.status === 'loaded'", timeout=45000)

    # WP Rocket "Delay JS Execution": theme JS (incl. vanilla-lazyload) only
    # initializes after the first user interaction — wake it with the same
    # synthetic interaction burst the Phase-01 capture script used
    # (capture-screenshots.js activatePage).
    page.evaluate(
        """() => {
          ['mousemove', 'mousedown', 'mouseup', 'keydown', 'scroll',
           'touchstart', 'wheel', 'pointermove'].forEach(t => {
            try {
              window.dispatchEvent(new Event(t));
              document.dispatchEvent(new Event(t));
            } catch (e) {}
          });
        }"""
    )
    page.mouse.move(700, 400)
    page.mouse.wheel(0, 600)
    page.wait_for_timeout(500)

    # Wait until every VISIBLE lazy background ([data-bgsrc]) has its image
    # applied. Hidden/dynamic containers (off-canvas thumbs) never receive
    # one — they are excluded via getClientRects().
    bg_ok_js = """() => [...document.querySelectorAll('[data-bgsrc]')]
        .filter(e => e.getClientRects().length > 0 &&
                     getComputedStyle(e).visibility !== 'hidden')
        .every(e => getComputedStyle(e).backgroundImage !== 'none')"""

    def scroll_pass(dwell):
        steps = 14
        for i in range(1, steps + 1):
            page.evaluate(
                f"window.scrollTo(0, document.documentElement.scrollHeight * {i / steps})")
            page.wait_for_timeout(dwell)
        page.evaluate("window.scrollTo(0, 0)")

    scroll_pass(300)
    try:
        page.wait_for_function(bg_ok_js, timeout=45000)
    except Exception:
        # one more slow pass, then give up with a warning
        scroll_pass(400)
        try:
            page.wait_for_function(bg_ok_js, timeout=30000)
        except Exception:
            missing = page.evaluate(
                """() => [...document.querySelectorAll('[data-bgsrc]')]
                    .filter(e => e.getClientRects().length > 0 &&
                                 getComputedStyle(e).backgroundImage === 'none')
                    .length"""
            )
            print(f"WARN: {missing} visible lazy backgrounds still unset", flush=True)

    # back to top, let the sticky header animation finish
    page.evaluate("window.scrollTo(0, 0)")
    page.wait_for_timeout(2500)

    # Chromium's full-page capture re-evaluates content-visibility:auto and
    # skips far-below-viewport subtrees (footer → blank). The real page shows
    # them once scrolled; force-render any content-visibility:auto subtree
    # before the shot (capture-side accommodation, documented in the report).
    page.evaluate(
        """() => {
          let n = 0;
          for (const el of document.querySelectorAll('*')) {
            if (getComputedStyle(el).contentVisibility === 'auto') {
              el.style.contentVisibility = 'visible';
              n++;
            }
          }
          return n;
        }"""
    )
    page.wait_for_timeout(600)

    state = page.evaluate(STATE_JS)
    # doc height must be stable (no late reflow)
    h1 = state["docH"]
    page.wait_for_timeout(1200)
    state2 = page.evaluate(STATE_JS)
    state["docHStable"] = state2["docH"] == h1
    state["docH2"] = state2["docH"]

    mobile = width <= 1024 and width < 1025 and width <= 1024
    expect_head_h = 48.0 if width <= 1024 and width < 1025 else 63.0
    # real breakpoints: mobile header ≤1024 only for ≤767?? — live: desktop
    # header shows at 1024 (measurements-1024: desktopHeader true). mobile
    # header appears ≤767?? — verified: 834/768 measurements say mobileHeader
    # true, desktopHeader false; 1024 desktopHeader true.
    if width <= 768:
        expect_head_h = 48.0
        ok_head = state["mobileH"] == expect_head_h and (state["headH"] in (None, 0))
    else:
        expect_head_h = 63.0
        ok_head = state["headH"] == expect_head_h and (state["mobileH"] in (None, 0))
    expect_ticker_y = 48.0 if width <= 768 else 63.0
    ok_ticker = state["tickerY"] == expect_ticker_y and state["tickerH"] == 45.0
    state["ok"] = (
        state["scrollY"] == 0
        and ok_head
        and ok_ticker
        and state["docHStable"]
    )
    return state


def capture(widths, out: pathlib.Path) -> dict:
    out.mkdir(parents=True, exist_ok=True)
    report = {"captures": [], "conditions": {
        "launchArgs": LAUNCH_ARGS, "userAgent": USER_AGENT, "locale": LOCALE,
        "dpr": 1, "settle": "scroll pass + verified resting state",
    }}
    with sync_playwright() as p:
        browser = p.chromium.launch(args=LAUNCH_ARGS)
        for width, group in widths:
            context = browser.new_context(
                viewport={"width": width, "height": 1080},
                device_scale_factor=1,
                user_agent=USER_AGENT,
                locale=LOCALE,
            )
            page = context.new_page()
            page.goto(SITE, wait_until="networkidle", timeout=90000)
            try:
                state = settle(page, width)
            except Exception as e:  # noqa: BLE001 — record and continue
                state = {"error": str(e)[:200], "ok": False}
            path = out / group / f"full-page-{width}.png"
            path.parent.mkdir(parents=True, exist_ok=True)
            page.screenshot(path=str(path), full_page=True)
            state["width"] = width
            state["file"] = str(path.relative_to(HERE.parent.parent))
            report["captures"].append(state)
            print(f"{width:>5}  ok={state.get('ok')}  headH={state.get('headH')} "
                  f"mobileH={state.get('mobileH')} tickerY={state.get('tickerY')} "
                  f"docH={state.get('docH')}/{state.get('docH2')}", flush=True)
            context.close()
        browser.close()
    (out / "capture-live-report.json").write_text(json.dumps(report, indent=2))
    return report


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(OUT))
    ap.add_argument("--widths", default=None, help="comma list, e.g. 1440,1366,1280")
    args = ap.parse_args()
    widths = WIDTHS
    if args.widths:
        want = {int(w) for w in args.widths.split(",")}
        widths = [(w, g) for w, g in WIDTHS if w in want]
    rep = capture(widths, pathlib.Path(args.out))
    bad = [c["width"] for c in rep["captures"] if not c.get("ok")]
    if bad:
        print("SETTLE CHECK FAILED for widths:", bad, file=sys.stderr)
        sys.exit(1)
    print("all widths captured with verified resting state")
