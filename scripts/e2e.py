"""Headless end-to-end check: auto-fill, render & download an MP4 per template, UI screenshots."""
import sys, time, pathlib
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:4173/'
ADDR = '0x9bad0394db1dc72df8a4f3b52b7c8feafdc468c9'  # Hedgehog Hustle ($HDGE) on vibe/vibe testnet
OUT = pathlib.Path(__file__).resolve().parent.parent / 'samples'
OUT.mkdir(exist_ok=True)

with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', headless=True, args=['--autoplay-policy=no-user-gesture-required'])
    ctx = b.new_context(viewport={'width': 1360, 'height': 1000}, accept_downloads=True, device_scale_factor=1)
    page = ctx.new_page()
    logs = []
    page.on('console', lambda m: logs.append(f'{m.type}: {m.text}'))
    page.goto(URL)
    page.wait_for_timeout(800)
    caps = page.evaluate('''async () => ({
      webcodecs: typeof VideoEncoder !== 'undefined',
      avc: typeof VideoEncoder !== 'undefined' && (await VideoEncoder.isConfigSupported({codec:'avc1.640028',width:1080,height:1920,bitrate:8e6,framerate:30})).supported,
      aac: typeof AudioEncoder !== 'undefined' && (await AudioEncoder.isConfigSupported({codec:'mp4a.40.2',sampleRate:48000,numberOfChannels:2,bitrate:128000})).supported,
    })''')
    print('caps', caps)
    page.fill('#src', f'https://testnet.vibevibe.fun/token/{ADDR}')
    page.click('#fill')
    page.wait_for_selector('#fillStatus.ok, #fillStatus.err', timeout=45000)
    print('autofill:', page.inner_text('#fillStatus'))
    page.wait_for_timeout(1500)
    for k, v in {'mcap': '351K', 'price': '0.000351', 'change': '+38'}.items():
        page.fill('#' + k, v)
    page.wait_for_timeout(2500)
    page.evaluate('window.scrollTo(0,0)')
    page.wait_for_timeout(300)
    page.screenshot(path=str(OUT / 'ui-desktop.png'))

    ids = page.evaluate('window.shillreel.TEMPLATES.map(t => t.id)')
    jobs = [(i, f, 12) for i in ids for f in ('9:16', '1:1')] + [('moon', '9:16', 10), ('terminal', '9:16', 15), ('arcade', '1:1', 15), ('lux', '1:1', 10),
        ('trailer', '9:16', 10), ('vapor', '1:1', 15), ('y2k', '9:16', 15), ('anime', '1:1', 10), ('liquid', '9:16', 15)]
    for tpl, fmt, dur in jobs:
        page.click(f'.tpl[data-id="{tpl}"]')
        page.click(f'#fmt button[data-v="{fmt}"]')
        page.click(f'#dur button[data-v="{dur}"]')
        page.click('#export')
        t = time.time()
        page.wait_for_selector('#exportStatus.ok, #exportStatus.err', timeout=300000)
        st = page.inner_text('#exportStatus')
        print(tpl, fmt, dur, f'{time.time()-t:.1f}s', st[:60])
        if 'failed' in st:
            continue
        with page.expect_download() as dl:
            page.click('#dl')
        name = f"sample-{tpl}-{fmt.replace(':','x')}.mp4" if dur == 12 else f"test-{tpl}-{fmt.replace(':','x')}-{dur}s.mp4"
        dl.value.save_as(str(OUT / name))
        page.evaluate("document.getElementById('exportStatus').className='hint center'")
    page.click('#fmt button[data-v="9:16"]')
    page.click('#dur button[data-v="12"]')
    page.click('.tpl[data-id="vapor"]')
    page.wait_for_timeout(1500)
    page.evaluate("document.querySelector('.a-style').scrollIntoView()")
    page.wait_for_timeout(400)
    page.screenshot(path=str(OUT / 'ui-templates.png'))
    page.evaluate("document.querySelector('.a-stage').scrollIntoView()")
    page.wait_for_timeout(500)
    page.screenshot(path=str(OUT / 'ui-desktop-result.png'))

    # audio path check: Linux Chrome has no AAC encoder, so force the Opus fallback to verify music + muxing
    page.goto(URL + f'?t={ADDR}&tpl=hype&audio=opus')
    page.wait_for_selector('#fillStatus.ok, #fillStatus.err', timeout=45000)
    page.click('#export')
    page.wait_for_selector('#exportStatus.ok, #exportStatus.err', timeout=300000)
    print('opus run:', page.inner_text('#exportStatus'))
    with page.expect_download() as dl:
        page.click('#dl')
    dl.value.save_as(str(OUT / 'test-audio-opus-hype.mp4'))

    m = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    mp = m.new_page()
    mp.goto(URL + f'?t={ADDR}&tpl=glitch')
    mp.wait_for_selector('#fillStatus.ok, #fillStatus.err', timeout=45000)
    mp.wait_for_timeout(2500)
    mp.screenshot(path=str(OUT / 'ui-mobile.png'), full_page=True)
    print('\n'.join(l for l in logs if 'error' in l.lower())[:3000])
    b.close()
