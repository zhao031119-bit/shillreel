import type { Template, TokenData, RenderOpts } from '../types';
import { seg, easeOutCubic, easeInOutCubic, easeOutBack, rng, pick, statsOf, statText, fitFont, wrapText, roundRect, drawLogo, shortLink, memo, lerp, clamp } from './util';
import { unit, footer, watermark, progressBar, flash } from './common';

const RED = '#d80f1f';
const NAVY = '#0a1a3f';
const BLUE = '#1446a0';
const GOLD = '#ffcc00';

const HEADS = [
  '{NAME} LAUNCHES ON VIBE/VIBE',
  'TRADERS RUSH TO {T}',
  '{T} SPOTTED ON ROBINHOOD CHAIN',
  'EXPERTS STUNNED BY {T}',
  'LOCAL DEGEN FINDS {T} EARLY',
];
const FALLBACK: [string, string][] = [['STATUS', 'LIVE'], ['SENTIMENT', 'BULLISH'], ['CHAIN', 'ROBINHOOD'], ['VENUE', 'VIBE/VIBE']];
const cache = memo<{ head: string; quote: string; bars: number[] }>();

function prep(d: TokenData, o: RenderOpts) {
  return cache(o.seed + '|' + d.ticker + '|' + d.name, () => {
    const r = rng(o.seed + 21);
    const bars = Array.from({ length: 7 }, (_, i) => 0.25 + (i / 6) * 0.6 + r() * 0.15);
    return { head: pick(r, HEADS), quote: pick(r, ['"WE ARE SO EARLY"', '"NUMBER GO UP"', '"THIS IS THE ONE"', '"FEW UNDERSTAND"']), bars };
  });
}

function globe(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, t: number, u: number) {
  ctx.save();
  const g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R);
  g.addColorStop(0, 'rgba(60,140,255,0.35)');
  g.addColorStop(1, 'rgba(20,60,160,0.05)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,180,255,0.25)';
  ctx.lineWidth = 2 * u;
  ctx.stroke();
  for (let k = 0; k < 12; k++) {
    const a = ((k / 12) * Math.PI + t * 0.3) % Math.PI;
    const rx = Math.abs(Math.cos(a)) * R;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, R, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let k = -3; k <= 3; k++) {
    const y = cy + (k / 4) * R;
    const w = Math.sqrt(Math.max(0, R * R - (y - cy) * (y - cy)));
    ctx.beginPath();
    ctx.ellipse(cx, y, w, w * 0.12, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

export const news: Template = {
  id: 'news',
  name: 'Breaking News',
  blurb: 'TV broadcast, lower-thirds, crawl',
  bpm: 120,
  music: 'news',
  swatch: [NAVY, RED, '#ffffff'],
  thumbT: 4,
  draw(ctx, t, d, o) {
    const { W, H } = o;
    const u = unit(W, H);
    const sq = W / H > 0.8;
    const c = prep(d, o);
    const T = (t * 12) / o.duration;
    const T_ = '$' + (d.ticker || 'TICKER').toUpperCase();
    const NAME = (d.name || 'Token').toUpperCase();
    const head = c.head.replace('{T}', T_).replace('{NAME}', NAME);
    const stats = statsOf(d).slice(0, 4);

    // studio background
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#071230');
    bg.addColorStop(0.6, '#0d2a6b');
    bg.addColorStop(1, '#050b1c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    // light streaks
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 5; k++) {
      const x = ((t * 120 * u + k * W * 0.37) % (W * 1.6)) - W * 0.3;
      const gr = ctx.createLinearGradient(x - 120 * u, 0, x + 120 * u, 0);
      gr.addColorStop(0, 'rgba(80,140,255,0)');
      gr.addColorStop(0.5, 'rgba(80,140,255,0.10)');
      gr.addColorStop(1, 'rgba(80,140,255,0)');
      ctx.fillStyle = gr;
      ctx.save();
      ctx.translate(x, 0);
      ctx.transform(1, 0, -0.35, 1, 0, 0);
      ctx.fillRect(-120 * u, 0, 240 * u, H);
      ctx.restore();
    }
    ctx.restore();
    globe(ctx, W * 0.5, H * (sq ? 0.42 : 0.36), Math.min(W, H) * 0.42, t, u);

    // channel bug + LIVE
    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    roundRect(ctx, 40 * u, 52 * u, 150 * u, 54 * u, 8 * u);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.font = `900 ${34 * u}px Inter`;
    ctx.fillStyle = NAVY;
    ctx.fillText('VNN', 56 * u, 80 * u);
    ctx.fillStyle = RED;
    ctx.fillRect(140 * u, 62 * u, 40 * u, 34 * u);
    ctx.fillStyle = '#fff';
    ctx.font = `900 ${16 * u}px Inter`;
    ctx.fillText('HD', 147 * u, 80 * u);
    roundRect(ctx, 204 * u, 58 * u, 116 * u, 42 * u, 6 * u);
    ctx.fillStyle = RED;
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.5 + 0.5 * (Math.sin(t * 6) > 0 ? 1 : 0);
    ctx.beginPath();
    ctx.arc(226 * u, 79 * u, 8 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.font = `900 ${24 * u}px Inter`;
    ctx.fillText('LIVE', 242 * u, 80 * u);
    ctx.restore();

    const crawlY = H - 130 * u;
    const ltY = crawlY - (sq ? 230 : 300) * u; // lower-third top

    // --- stinger 0-1.7
    if (T < 1.9) {
      const a = easeInOutCubic(seg(T, 0, 0.45));
      const out = easeInOutCubic(seg(T, 1.5, 1.9));
      ctx.save();
      ctx.translate(W / 2, H * 0.45);
      ctx.rotate(-0.12);
      const bw = W * 1.6;
      const bh = 300 * u;
      const x = lerp(-bw * 1.2, -bw / 2, a) + out * bw * 1.3;
      ctx.fillStyle = '#fff';
      ctx.fillRect(x - 30 * u, -bh / 2 - 22 * u, bw, bh + 44 * u);
      ctx.fillStyle = RED;
      ctx.fillRect(x, -bh / 2, bw, bh);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const p = easeOutBack(seg(T, 0.35, 0.7));
      ctx.save();
      ctx.translate(out * bw * 1.3, 0);
      ctx.scale(p, p);
      fitFont(ctx, 'BREAKING NEWS', W * 0.86, 150 * u, (s) => `italic 900 ${s}px Inter`);
      ctx.fillText('BREAKING NEWS', 0, -10 * u);
      ctx.restore();
      ctx.restore();
      if (T > 0.33 && T < 0.55) flash(ctx, W, H, 0.6 * (1 - seg(T, 0.33, 0.55)));
    }

    // --- field report window 1.7-5.6
    if (T >= 1.6 && T < 5.9) {
      const p = easeOutCubic(seg(T, 1.6, 2.1));
      const out = easeInOutCubic(seg(T, 5.5, 5.9));
      const ww = W * 0.84;
      const wx = (W - ww) / 2 - out * W, wy = sq ? 140 * u : H * 0.12;
      const wh = ltY - wy - 50 * u;
      ctx.save();
      ctx.globalAlpha = p;
      ctx.translate(0, (1 - p) * 60 * u);
      roundRect(ctx, wx, wy, ww, wh, 18 * u);
      const vg = ctx.createLinearGradient(wx, wy, wx + ww, wy + wh);
      vg.addColorStop(0, '#13285a');
      vg.addColorStop(1, '#0a1533');
      ctx.fillStyle = vg;
      ctx.fill();
      ctx.lineWidth = 6 * u;
      ctx.strokeStyle = '#fff';
      ctx.stroke();
      ctx.save();
      ctx.clip();
      // slow push-in on logo
      const zoom = 1 + 0.08 * seg(T, 1.6, 5.6);
      drawLogo(ctx, d, wx + ww / 2, wy + wh / 2, Math.min(ww, wh) * 0.36 * zoom, { ring: '#fff', ringW: 8 * u });
      ctx.restore();
      // tag
      ctx.fillStyle = RED;
      ctx.fillRect(wx + 24 * u, wy + 24 * u, 230 * u, 46 * u);
      ctx.fillStyle = '#fff';
      ctx.font = `800 ${24 * u}px Inter`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText('FIELD REPORT', wx + 40 * u, wy + 48 * u);
      ctx.restore();
    }

    // --- anchor desk stats 5.6-9.4
    if (T >= 5.6 && T < 9.6) {
      const out = easeInOutCubic(seg(T, 9.2, 9.6));
      const rows = stats.length ? stats.map((s) => ({ l: s.label, s })) : FALLBACK.map((f) => ({ l: f[0], v: f[1] }));
      const n = rows.length;
      const cols = 2;
      const gap = 22 * u;
      const top = sq ? 140 * u : H * 0.12;
      const avail = ltY - top - 40 * u;
      const pw = (W * 0.86 - gap) / cols;
      const ph = Math.min(sq ? 210 * u : 300 * u, (avail - gap) / Math.ceil(n / cols));
      rows.forEach((r: any, i) => {
        const col = i % cols, row = Math.floor(i / cols);
        const x = W * 0.07 + col * (pw + gap);
        const y = top + row * (ph + gap);
        const p = easeOutBack(seg(T, 5.7 + i * 0.15, 6.15 + i * 0.15));
        ctx.save();
        ctx.globalAlpha = clamp(p) * (1 - out);
        ctx.translate(x + pw / 2, y + ph / 2);
        ctx.scale(1, clamp(p, 0, 1.2));
        ctx.translate(-pw / 2, -ph / 2);
        roundRect(ctx, 0, 0, pw, ph, 14 * u);
        const g = ctx.createLinearGradient(0, 0, 0, ph);
        g.addColorStop(0, 'rgba(255,255,255,0.96)');
        g.addColorStop(1, 'rgba(220,230,250,0.96)');
        ctx.fillStyle = g;
        ctx.fill();
        ctx.save();
        ctx.clip();
        ctx.fillStyle = BLUE;
        ctx.fillRect(0, 0, pw, 62 * u);
        ctx.restore();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = `800 ${26 * u}px Inter`;
        ctx.fillText(r.l, 24 * u, 32 * u);
        let txt = r.v as string;
        let col2 = NAVY;
        if (r.s) {
          txt = statText(r.s, easeOutCubic(seg(T, 6.0 + i * 0.15, 7.4 + i * 0.15)));
          if (r.s.label === '24H') col2 = r.s.value >= 0 ? '#0a8f3c' : RED;
        }
        fitFont(ctx, txt, pw - 48 * u, Math.min(78 * u, (ph - 62 * u) * 0.55), (s) => `900 ${s}px Inter`);
        ctx.fillStyle = col2;
        ctx.fillText(txt, 24 * u, 62 * u + (ph - 62 * u) / 2);
        ctx.restore();
      });
      // mini bar chart under panels (9:16 only, if space)
      const by = top + Math.ceil(n / cols) * (ph + gap) + 10 * u;
      const bh = ltY - by - 40 * u;
      if (bh > 120 * u) {
        ctx.save();
        ctx.globalAlpha = 1 - out;
        const bw = (W * 0.86) / c.bars.length;
        c.bars.forEach((b, i) => {
          const p = easeOutCubic(seg(T, 6.6 + i * 0.08, 7.3 + i * 0.08));
          const h = bh * b * p;
          ctx.fillStyle = i === c.bars.length - 1 ? GOLD : 'rgba(120,170,255,0.75)';
          ctx.fillRect(W * 0.07 + i * bw + bw * 0.15, by + bh - h, bw * 0.7, h);
        });
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(W * 0.07, by + bh, W * 0.86, 3 * u);
        ctx.restore();
      }
    }

    // --- CTA 9.4-12
    if (T >= 9.4) {
      const p = easeOutBack(seg(T, 9.5, 10.0));
      const r = (sq ? 150 : 210) * u * p;
      const cy = sq ? H * 0.3 : H * 0.3;
      if (r > 1) {
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 40 * u;
        drawLogo(ctx, d, W / 2, cy, r, { ring: '#fff', ringW: 10 * u });
        ctx.restore();
      }
      ctx.save();
      ctx.globalAlpha = seg(T, 9.8, 10.1);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      fitFont(ctx, 'TRADE ' + T_ + ' NOW', W * 0.86, 110 * u, (s) => `italic 900 ${s}px Inter`);
      ctx.fillText('TRADE ' + T_ + ' NOW', W / 2, cy + r + (sq ? 80 : 120) * u);
      ctx.restore();
    }

    // --- lower third (persistent after stinger)
    if (T >= 1.7) {
      const p = easeOutCubic(seg(T, 1.7, 2.2));
      const isCta = T >= 9.4;
      const tag = isCta ? 'DEVELOPING' : 'BREAKING';
      const headline = isCta ? 'AVAILABLE NOW ON VIBE/VIBE' : head;
      const sub = isCta ? shortLink(d.link, d.address) : T < 5.6 ? (d.tagline || NAME + ' (' + T_ + ')') : `${NAME} · ${T_} · ROBINHOOD CHAIN TESTNET`;
      const x0 = W * 0.04;
      const w = W * 0.92;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0, ltY - 10 * u, w * p, 400 * u);
      ctx.clip();
      // tag box
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.font = `italic 900 ${40 * u}px Inter`;
      const tw = ctx.measureText(tag).width + 40 * u;
      ctx.fillStyle = RED;
      ctx.fillRect(x0, ltY, tw, 64 * u);
      ctx.fillStyle = '#fff';
      ctx.fillText(tag, x0 + 20 * u, ltY + 34 * u);
      // headline bar
      const hy = ltY + 64 * u;
      ctx.fillStyle = '#fff';
      ctx.fillRect(x0, hy, w, sq ? 96 * u : 120 * u);
      ctx.fillStyle = NAVY;
      ctx.font = `900 ${64 * u}px Inter`;
      const lines = wrapText(ctx, headline, w - 50 * u, 2);
      const hh = sq ? 96 * u : 120 * u;
      if (lines.length === 1) {
        fitFont(ctx, lines[0], w - 50 * u, sq ? 60 * u : 70 * u, (s) => `900 ${s}px Inter`);
        ctx.fillText(lines[0], x0 + 25 * u, hy + hh / 2 + 2 * u);
      } else {
        lines.forEach((ln, i) => {
          fitFont(ctx, ln, w - 50 * u, (sq ? 38 : 48) * u, (s) => `900 ${s}px Inter`);
          ctx.fillText(ln, x0 + 25 * u, hy + hh * (i === 0 ? 0.3 : 0.72));
        });
      }
      // subline
      const sy = hy + hh;
      ctx.fillStyle = NAVY;
      ctx.fillRect(x0, sy, w, 58 * u);
      ctx.fillStyle = GOLD;
      fitFont(ctx, sub, w - 50 * u, 30 * u, (s) => `700 ${s}px Inter`);
      ctx.fillText(sub, x0 + 25 * u, sy + 30 * u);
      ctx.restore();
    }

    // --- ticker crawl
    ctx.save();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, crawlY, W, 58 * u);
    ctx.fillStyle = GOLD;
    ctx.fillRect(0, crawlY, 150 * u, 58 * u);
    ctx.fillStyle = '#000';
    ctx.font = `900 ${26 * u}px Inter`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText('MARKETS', 18 * u, crawlY + 30 * u);
    const items = [T_ + ' ' + (stats.find((s) => s.label === '24H') ? statText(stats.find((s) => s.label === '24H')!) : 'LIVE'), ...stats.filter((s) => s.label !== '24H').map((s) => `${s.label} ${statText(s)}`), c.quote, 'ONLY ON VIBE/VIBE', NAME];
    const crawl = items.join('   ◆   ') + '   ◆   ';
    ctx.beginPath();
    ctx.rect(150 * u, crawlY, W, 58 * u);
    ctx.clip();
    ctx.font = `700 ${28 * u}px Inter`;
    const cw = ctx.measureText(crawl).width;
    const off = (t * 220 * u) % cw;
    ctx.fillStyle = '#fff';
    for (let x = 160 * u - off; x < W; x += cw) ctx.fillText(crawl, x, crawlY + 30 * u);
    ctx.restore();

    progressBar(ctx, W, u, t / o.duration, RED);
    watermark(ctx, W, H, u);
    footer(ctx, W, H, u);
  },
};
