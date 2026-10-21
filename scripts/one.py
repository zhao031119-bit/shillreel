"""Render single full-res frames: one.py <id> <9:16|1:1> <T,...> [long]  -> /tmp/one/<id>-<fmt>-<T>.png (scaled to 540w)"""
import sys, base64, pathlib, subprocess
from playwright.sync_api import sync_playwright
tid, fmt, Ts = sys.argv[1], sys.argv[2], [float(x) for x in sys.argv[3].split(',')]
longv = len(sys.argv) > 4
out = pathlib.Path('/tmp/one'); out.mkdir(exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', headless=True)
    pg = b.new_page()
    pg.goto('http://localhost:4173/?t=0x9bad0394db1dc72df8a4f3b52b7c8feafdc468c9')
    pg.wait_for_selector('#fillStatus.ok, #fillStatus.err', timeout=45000)
    pg.fill('#mcap','351K'); pg.fill('#price','0.000351'); pg.fill('#change','+38')
    pg.wait_for_timeout(800)
    for T in Ts:
        d = pg.evaluate('''([id,fmt,T,longv]) => { const sr=window.shillreel; const tpl=sr.TEMPLATES.find(x=>x.id===id);
          const dd = Object.assign({}, sr.data);
          if (longv) Object.assign(dd, {name: 'The Extraordinarily Long Hedgehog Hustle Society', ticker: 'HEDGEHOGXXL', tagline: 'Small, spiky and always busy. A hedgehog with a side hustle for every season, every chain, every vibe.', mcap: '12345678', holders: '1234567', price: '0.00000012345', change: '-12.5'});
          const W=1080,H=fmt==='1:1'?1080:1920; const cv=document.createElement('canvas'); cv.width=W; cv.height=H;
          tpl.draw(cv.getContext('2d'), T, dd, {W,H,duration:12,seed:4242,bpm:tpl.bpm}); return cv.toDataURL().split(',')[1]; }''', [tid, fmt, T, longv])
        f = out / f"{tid}-{fmt.replace(':','x')}-{T}{'-long' if longv else ''}.png"
        f.write_bytes(base64.b64decode(d))
        subprocess.run(['ffmpeg','-v','error','-y','-i',str(f),'-vf','scale=540:-1','/tmp/one/_s.png']); pathlib.Path('/tmp/one/_s.png').replace(f)
    b.close()
