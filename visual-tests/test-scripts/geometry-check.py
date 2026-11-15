#!/usr/bin/env python3
"""
geometry-check.py — asserts the key element geometry of the implementation
against the values measured on the live site (geometry-1920.json).
Tolerance: 1 CSS pixel (MP02 §16 engineering target).
"""
import json
import pathlib

from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
REPORTS = HERE.parent / "reports"

# selector → reference rect from petrotimes-extraction geometry-1920.json
EXPECTATIONS = {
    "#smart-head": (0, 0, 1920, 63),
    ".pt-ticker-widget": (0, 63, 1920, 45),
    ".pt-content-col": (772, 108, 788, None),
    ".pt-sidebar-col": (360, 108, 412, None),
    ".pt-hero-post": (1176, 108, 384, 381),
    ".pt-duo-secondary article:first-child": (772, 108, 384, 76),
    ".pt-tv-block": (772, 570, 788, 652),
    ".pt-tv-playlist": (772, 1222, 788, 501),
    ".pt-topnews-widget": (360, 108, 356, 139),
    ".pt-magazine": (360, 546, 356, 569),
    ".pt-feature-heading": (572, 1115, 144, 63),
    ".pt-feature-item": (360, 1198, 356, 48),
    ".pt-section-energy": (0, 1758, 1920, 1084),
    ".pt-energy-grid": (772, 2647, 788, 195),
    ".pt-advertise": (0, 2865, 1920, 318),
    ".pt-footer": (0, 3203, 1920, 543),
    ".pt-footer-copyright": (0, 3705, 1920, 41),
}


def main(base="http://localhost:3000"):
    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1920, "height": 1080}, device_scale_factor=1)
        page.goto(base, wait_until="networkidle", timeout=60000)
        page.wait_for_timeout(1500)
        for sel, (ex, ey, ew, eh) in EXPECTATIONS.items():
            el = page.locator(sel).first
            try:
                box = el.bounding_box()
            except Exception:
                box = None
            if box is None:
                results.append({"selector": sel, "status": "NOT FOUND"})
                continue
            y = box["y"] + page.evaluate("window.scrollY")
            row = {
                "selector": sel,
                "actual": [round(box["x"], 1), round(y, 1), round(box["width"], 1), round(box["height"], 1)],
                "expected": [ex, ey, ew, eh],
                "dx": round(abs(box["x"] - ex), 1),
                "dy": round(abs(y - ey), 1),
                "dw": round(abs(box["width"] - ew), 1) if ew else None,
                "dh": round(abs(box["height"] - eh), 1) if eh else None,
            }
            worst = max(v for v in [row["dx"], row["dy"], row["dw"] or 0, row["dh"] or 0])
            row["status"] = "PASS" if worst <= 1.0 else ("NEAR" if worst <= 3.0 else "FAIL")
            results.append(row)
        browser.close()
    passed = all(r.get("status") == "PASS" for r in results)
    report = {"tolerance": "1 CSS px", "passed": passed, "results": results}
    REPORTS.mkdir(exist_ok=True)
    (REPORTS / "geometry.json").write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
