# Shillreel

**Turn any vibe/vibe token into a scroll-stopping promo clip for X — free, in your browser.**

Paste a vibe/vibe token link (or contract address), pick a template, and get a 9:16 or 1:1
MP4 (H.264, 30 fps, 10–15 s) with an animated logo, big ticker, number count-ups, captions,
beat-synced flashes, an optional synthesized beat, and a CTA with the token link. It also writes
the X post copy for you.

No backend, no API keys, no accounts, no uploads: everything renders on a `<canvas>` and is
encoded locally with WebCodecs.

## Features

- **13 templates** (each with its own procedural beat):
  | id | Template | Look | Beat |
  |---|---|---|---|
  | `hype` | Pump Hype | neon chart, sunburst, bokeh, kinetic hook, glass stat cards, 3D-tilt coin-flip CTA | 128 BPM house |
  | `clean` | Clean Stats Card | glass card, self-drawing chart, count-up grid, floating 3D logo tile, tap-the-link CTA | 100 BPM lo-fi |
  | `glitch` | Meme Shake / Glitch | meme captions, deal-with-it glasses, RGB split, slice glitches | 140 BPM trap |
  | `news` | Breaking News | "BREAKING NEWS" stinger, red/white lower-third, anchor-desk stat panels, ticker crawl | 120 BPM broadcast theme |
  | `arcade` | Retro Arcade | real pixel-art world (low-res canvas), token as the player coin, HUD score count-up, LEVEL UP high-score table, CRT | 150 BPM chiptune |
  | `moon` | Moon Mission | T-minus 3-2-1, launch shake, rocket (logo in the window) rides the chart, telemetry, flag on the moon | 90 BPM cinematic |
  | `lux` | Luxury Gold | black & gold, art-deco frame, serif mask reveals, shimmering gold logo, "The Figures" | 76 BPM lounge |
  | `terminal` | Terminal / Hacker | typed scan report, ASCII-art logo generated from the real logo, progress bar, matrix rain, ACCESS GRANTED | 132 BPM acid techno |
  | `liquid` | Liquid Gradient | flowing mesh gradient, frosted-glass cards & orbs, kinetic type, sparkline stat chips | 110 BPM future-pop |
  | `anime` | Anime Speedlines | manga panels, speed lines, halftone, SFX lettering, impact frames, "POWER LEVEL" count-up | 160 BPM J-rock |
  | `vapor` | Vaporwave Sunset | striped neon sun, perspective grid, palms, chrome type, neon script, VHS tracking & OSD | 100 BPM synthwave |
  | `y2k` | Y2K Sticker Pop | candy grid, die-cut stickers, glossy bubble letters, squash-and-stretch logo, rainbow CTA, confetti | 124 BPM bubblegum pop |
  | `trailer` | Cinematic Trailer | letterbox, gold Cinzel title cards with push-ins, god rays & lens flares, stat captions, billing block | trailer BRAAMs on every cut + riser |
- Template picker shows **live thumbnails** rendered with the current token.
- **Formats**: 9:16 (1080×1920) and 1:1 (1080×1080); 10 / 12 / 15 s.
- **Remix**: one click re-rolls captions, hooks, chart shapes and colours (seeded, so preview = export).
- **Auto-fill** from Robinhood Chain testnet (chain id 46630) — see below.
- **Music**: a procedural beat per template generated with WebAudio (no samples → no licensing).
- **Export**: MP4 via WebCodecs + [`mp4-muxer`](https://github.com/Vanilagy/mp4-muxer) (bundled);
  falls back to `MediaRecorder` (WebM/MP4) when WebCodecs H.264 is unavailable.
- **X post copy** from randomized templates with a 280-char counter (links counted as 23),
  *Copy*, *Post on X* (web intent) and native *Share…* (shares the video file on mobile).
- Optional LLM hook in `src/copy.ts` (`LLM_ENDPOINT`), **off by default**.
- Deep links: `/?t=0xTOKEN&tpl=glitch` pre-fills and auto-loads a token.

## Auto-fill: what it does / doesn't do

| Field | Source (all public, CORS-enabled) |
|---|---|
| name, ticker, holders | Robinhood testnet Blockscout API `explorer.testnet.chain.robinhood.com/api/v2/tokens/{addr}` (fallback: `name()`/`symbol()` via `eth_call` on `rpc.testnet.chain.robinhood.com`) |
| logo, description | the token's creation tx (explorer) → its receipt logs contain the vibe/vibe `ipfs://` metadata URI → metadata JSON + image from public IPFS gateways (Pinata, ipfs.io, dweb.link, w3s.link) |
| link | `https://testnet.vibevibe.fun/token/{addr}` |
| price, market cap, 24h change | **not auto-filled** — the vibe/vibe app API (`/api/v1/chains/46630/...`) rejects requests from other origins (`403 Origin not allowed`). Enter them manually (optional). |

Holder counts come from the explorer and can differ from the number vibe/vibe shows.

## Run locally

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # static site in dist/
npm run preview      # serve dist/ on http://localhost:4173
```

End-to-end check (needs Python Playwright + Google Chrome):
`python3 scripts/e2e.py http://localhost:4173/` renders and downloads an MP4 for every template in 9:16 and 1:1 (plus 10 s / 15 s checks) into `samples/`.
`scripts/strips.sh` rebuilds `samples/frames/*-strip.png` from the sample MP4s; `python3 scripts/ui_templates.py` re-shoots the picker screenshot.
`python3 scripts/frames.py /tmp/frames [id,id]` renders contact strips (incl. a very long name/ticker) for eyeballing layouts; `python3 scripts/one.py <id> <9:16|1:1> <T,...> [long]` renders single full-res frames.
To add a template: create `src/render/<id>.ts` exporting a `Template`, register it in `src/templates.ts`, and (optionally) add a beat style in `src/music.ts`.

## Deploy (free static hosting)

The build output is a plain static folder: **`dist/`** (relative asset paths, works from any sub-path).

**Vercel** — import the repo → Framework preset *Vite* → Build command `npm run build` →
Output directory `dist`. Or CLI: `npx vercel --prod`.

**Cloudflare Pages** — Create project → connect repo → Framework preset *Vite* (or *None*) →
Build command `npm run build` → Build output directory `dist`. Or CLI:
`npx wrangler pages deploy dist --project-name shillreel`.

No environment variables are needed.

## Browser support

- MP4 (H.264) export: Chrome / Edge 94+, Safari 16.4+ (incl. iOS), Firefox 130+.
- Music in the MP4 needs an AAC encoder: available in Chrome/Edge on Windows & macOS and in Safari.
  Chrome on Linux has none, so the MP4 is exported silent there (add `?audio=opus` to force an
  Opus track, which plays in browsers but may be rejected by X).
- Without WebCodecs, the app records in real time with `MediaRecorder` (usually WebM).

## Project layout

```
src/main.ts          UI wiring, preview loop, export flow
src/render/*.ts      13 templates + shared helpers (util.ts, common.ts, fx.ts = grain, glass blur,
                     kinetic type, springs, 3D-tilt logo, light leaks, lens flares)
src/encoder.ts       WebCodecs → mp4-muxer, MediaRecorder fallback
src/music.ts         procedural beats (OfflineAudioContext)
src/token.ts         auto-fill (explorer API, JSON-RPC, IPFS)
src/copy.ts          X post copy generator (+ optional LLM hook, off)
public/              favicon / logo (SVG)
scripts/e2e.py       headless test: auto-fill + MP4 export of every template/format
scripts/frames.py    contact strips of every template (normal + long-name data) for visual QA
```

Fonts: Anton, Inter, Press Start 2P, Playfair Display, JetBrains Mono, Plus Jakarta Sans, Bangers, Audiowide, Mr Dafoe, Fredoka and Cinzel (all SIL Open Font License) via `@fontsource`, bundled locally.

## Disclaimer

Shillreel is an independent tool, not affiliated with vibe/vibe or Robinhood. Testnet tokens have
no monetary value. Nothing produced by this tool is financial advice.
