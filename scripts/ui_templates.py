"""Screenshot the full template picker (all thumbnails) + preview into samples/ui-templates.png."""
import sys, pathlib
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:4173/'
ADDR = '0x9bad0394db1dc72df8a4f3b52b7c8feafdc468c9'
OUT = pathlib.Path(__file__).resolve().parent.parent / 'samples'
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', headless=True)
    pg = b.new_page(viewport={'width': 1360, 'height': 1400})
    pg.goto(URL + f'?t={ADDR}&tpl=vapor')
    pg.wait_for_selector('#fillStatus.ok, #fillStatus.err', timeout=45000)
    for k, v in {'mcap': '351K', 'price': '0.000351', 'change': '+38'}.items():
        pg.fill('#' + k, v)
    pg.wait_for_timeout(3500)
    pg.evaluate("document.querySelector('.a-style').scrollIntoView()")
    pg.wait_for_timeout(800)
    pg.screenshot(path=str(OUT / 'ui-templates.png'))
    b.close()
