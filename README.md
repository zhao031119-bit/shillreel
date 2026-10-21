# Shillreel

**Turn any vibe/vibe token into a scroll-stopping promo clip for X — free, in your browser.**

Paste a vibe/vibe token link (or contract address), pick a template, and get a 9:16 or 1:1
MP4 (H.264, 30 fps, 10–15 s) with an animated logo, big ticker, number count-ups, captions,
beat-synced flashes, an optional synthesized beat, and a CTA with the token link. It also writes
the X post copy for you.

No backend, no API keys, no accounts, no uploads: everything renders on a `<canvas>` and is
encoded locally with WebCodecs.

## Features

- **3 templates**: *Pump Hype* (neon chart, sunburst, beat punches, stat cards, coin-flip CTA),
  *Clean Stats Card* (glass card, self-drawing chart, count-up grid, tap-the-link CTA),
  *Meme Shake / Glitch* (Impact-style meme captions, deal-with-it glasses, RGB split, slice glitches).
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
`python3 scripts/e2e.py http://localhost:4173/` renders and downloads an MP4 for each template into `samples/`.

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
src/render/*.ts      templates (hype, clean, glitch) + shared drawing helpers
src/encoder.ts       WebCodecs → mp4-muxer, MediaRecorder fallback
src/music.ts         procedural beats (OfflineAudioContext)
src/token.ts         auto-fill (explorer API, JSON-RPC, IPFS)
src/copy.ts          X post copy generator (+ optional LLM hook, off)
public/              favicon / logo (SVG)
scripts/e2e.py       headless render test
```

Fonts: Anton and Inter (SIL Open Font License) via `@fontsource`, bundled locally.

## Disclaimer

Shillreel is an independent tool, not affiliated with vibe/vibe or Robinhood. Testnet tokens have
no monetary value. Nothing produced by this tool is financial advice.
