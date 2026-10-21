"""Render contact strips of every template (both formats, normal + long-name data) for visual QA."""
import sys, base64, pathlib
from playwright.sync_api import sync_playwright

URL = 'http://localhost:4173/'
ADDR = '0x9bad0394db1dc72df8a4f3b52b7c8feafdc468c9'
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/frames')
OUT.mkdir(parents=True, exist_ok=True)
only = sys.argv[2].split(',') if len(sys.argv) > 2 else None
TIMES = [0.9, 2.6, 4.6, 7.4, 9.0, 11.2]

JS = '''async ([id, fmt, times, longv]) => {
  const sr = window.shillreel;
  const tpl = sr.TEMPLATES.find(x => x.id === id);
  const d = Object.assign({}, sr.data);
  if (longv) Object.assign(d, {name: 'The Extraordinarily Long Hedgehog Hustle Society', ticker: 'HEDGEHOGXXL', tagline: 'Small, spiky and always busy. A hedgehog with a side hustle for every season, every chain, every vibe.', mcap: '12345678', holders: '1234567', price: '0.00000012345', change: '-12.5'});
  const W = 1080, H = fmt === '1:1' ? 1080 : 1920;
  const s = 0.36;
  const strip = document.createElement('canvas');
  strip.width = Math.round(W * s) * times.length; strip.height = Math.round(H * s);
  const sc = strip.getContext('2d');
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  for (let i = 0; i < times.length; i++) {
    tpl.draw(ctx, times[i], d, {W, H, duration: 12, seed: 4242, bpm: tpl.bpm});
    sc.drawImage(cv, i * Math.round(W * s), 0, Math.round(W * s), Math.round(H * s));
  }
  return strip.toDataURL('image/png').split(',')[1];
}'''

with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', headless=True)
    pg = b.new_page(viewport={'width': 1300, 'height': 900})
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: m.type == 'error' and 'CORS' not in m.text and 'ERR_FAILED' not in m.text and errs.append(m.text))
    pg.goto(URL + f'?t={ADDR}')
    pg.wait_for_selector('#fillStatus.ok, #fillStatus.err', timeout=45000)
    for k, v in {'mcap': '351K', 'price': '0.000351', 'change': '+38'}.items():
        pg.fill('#' + k, v)
    pg.wait_for_timeout(1500)
    ids = pg.evaluate('window.shillreel.TEMPLATES.map(t => t.id)')
    for tid in ids:
        if only and tid not in only:
            continue
        for fmt in ['9:16', '1:1']:
            for longv in [False, True]:
                data = pg.evaluate(JS, [tid, fmt, TIMES, longv])
                f = OUT / f"{tid}-{fmt.replace(':','x')}{'-long' if longv else ''}.png"
                f.write_bytes(base64.b64decode(data))
    print('errors:', errs[:10])
    b.close()
