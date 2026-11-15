#!/usr/bin/env python3
"""
capture.py — Petro Times visual regression capture.

Captures the implementation homepage at the same widths used by the Phase-01
extraction (12 sampled widths), reproducing the reference capture conditions
exactly (see petrotimes-extraction/scripts/capture-screenshots.js):

  - Chromium launch flags: --no-sandbox --disable-dev-shm-usage
    --font-render-hinting=none  (hinting off = same glyph advance rounding,
    which decides RTL line-wrap points)
  - context locale fa-IR, same Chrome/157 Windows user agent
  - viewport 1920x1080 per width, device_scale_factor 1
  - fonts ready + all images decoded + lazy backgrounds applied before shot

Magazine carousel is frozen on slide 0 (window.__PT_FREEZE_SLIDERS__ in
init script) so every capture documents the same documented carousel state
as compare.py expects.

Usage:  python3 capture.py [--base http://localhost:3000] [--out ../actual]
"""
import argparse
import json
import pathlib

from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE.parent / "actual"

WIDTHS = [
    (1920, "desktop"), (1440, "desktop"), (1366, "desktop"),
    (1280, "desktop"), (1024, "desktop"),
    (834, "tablet"), (768, "tablet"),
    (430, "mobile"), (414, "mobile"), (390, "mobile"),
    (375, "mobile"), (360, "mobile"),
]

# identical conditions to the Phase-01 reference capture (capture-screenshots.js)
LAUNCH_ARGS = ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"]
USER_AGENT = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
              "(KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36")
LOCALE = "fa-IR"

FREEZE_INIT = "window.__PT_FREEZE_SLIDERS__ = true;"


def settle(page) -> None:
    """Same settling as the reference: fonts loaded, backgrounds applied."""
    page.wait_for_function("document.fonts.status === 'loaded'", timeout=30000)
    page.evaluate("""async () => {
        const bgs = [...document.querySelectorAll('[style*=background-image]')];
        await Promise.all(bgs.map(el => new Promise(res => {
            const url = getComputedStyle(el).backgroundImage.match(/url\\("?([^")]+)"?\\)/);
            if (!url) return res(null);
            const img = new Image();
            img.onload = img.onerror = res;
            img.src = url[1];
        })));
        await document.fonts.ready;
    }""")
    page.wait_for_timeout(250)


def capture(base: str, out: pathlib.Path) -> dict:
    out.mkdir(parents=True, exist_ok=True)
    report = {"captures": [], "base": base, "conditions": {
        "launchArgs": LAUNCH_ARGS, "userAgent": USER_AGENT, "locale": LOCALE,
        "dpr": 1, "sliders": "frozen on slide 0",
    }}
    with sync_playwright() as p:
        browser = p.chromium.launch(args=LAUNCH_ARGS)
        for width, group in WIDTHS:
            context = browser.new_context(
                viewport={"width": width, "height": 1080},
                device_scale_factor=1,
                user_agent=USER_AGENT,
                locale=LOCALE,
            )
            context.add_init_script(FREEZE_INIT)
            page = context.new_page()
            page.goto(base, wait_until="networkidle", timeout=60000)
            settle(page)
            path = out / f"full-page-{width}.png"
            page.screenshot(path=str(path), full_page=True)
            report["captures"].append({
                "width": width, "group": group, "file": path.name,
                "docHeight": page.evaluate("document.documentElement.scrollHeight"),
            })
            context.close()
        browser.close()
    (out / "capture-report.json").write_text(json.dumps(report, indent=2))
    return report


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://localhost:3000")
    ap.add_argument("--out", default=str(OUT))
    args = ap.parse_args()
    rep = capture(args.base, pathlib.Path(args.out))
    print(json.dumps(rep, indent=2))
