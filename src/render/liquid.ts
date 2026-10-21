import type { Template, TokenData, RenderOpts } from '../types';
import { rng, pick, statsOf, statText, fitFont, roundRect, drawLogo, shortLink, memo, beat, lerp } from './util';
import { unit, footer, watermark } from './common';
import { easeOutExpo, easeInOutQuint, spring, p01, grain, blurRegion, blob, kinetic, tiltLogo } from './fx';

const INK = '#0b1030';
const SANS = (s: number, w = 800) => `${w} ${s}px "Plus Jakarta Sans"`;
const PALS = [
  ['#635bff', '#00d4ff', '#ff80b5', '#ffcb57'],
  ['#7a5cff', '#ff6ec7', '#ffb86b', '#5ce1e6'],
  ['#3a7bff', '#8af5c8', '#c084fc', '#ff9a8b'],
];
const HEADS = ['Meet {NAME}.', 'Say hello to {NAME}.', 'This is {NAME}.', '{NAME} is here.'];
const CTAS = ['Get {T}', 'Trade {T}', 'Own {T}', 'Join {T}'];

const cache = memo<{ pal: string[]; head: string; cta: string; spark: number[] }>();
function prep(d: TokenData, o: RenderOpts) {
  return cache(o.seed + '|' + d.ticker, () => {
    const r = rng(o.seed + 311);
    const spark: number[] = [];
    let v = 0.4;
    for (let i = 0; i < 28; i++) { v = Math.max(0.05, Math.min(1, v + (r() - 0.4) * 0.16)); spark.push(v); }
    return { pal: pick(r, PALS), head: pick(r, HEADS), cta: pick(r, CTAS), spark };
  });
}

function glass(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, u: number, a = 1) {
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = a;
  // shadow
  ctx.save();
  ctx.shadowColor = 'rgba(30,20,80,0.22)';
  ctx.shadowBlur = 70 * u;
  ctx.shadowOffsetY = 30 * u;
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = 'rgba(255,255,255,0.01)';
  ctx.fill();
  ctx.restore();
  blurRegion(ctx, x, y, w, h, 18, () => roundRect(ctx, x, y, w, h, r));
  roundRect(ctx, x, y, w, h, r);
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0.28)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 2 * u;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.stroke();
  ctx.restore();
}

export const liquid: Template = {
  id: 'liquid',
  name: 'Liquid Gradient',
  blurb: 'Mesh gradient, frosted glass, clean type',
  bpm: 110,
  music: 'liquid',
  swatch: ['#635bff', '#00d4ff', '#ff80b5'],
  thumbT: 4.6,
  draw(ctx, t, d, o) {
    const { W, H } = o;
    const u = unit(W, H);
    const sq = W / H > 0.8;
    const c = prep(d, o);
    const T = (t * 12) / o.duration;
    const { ph } = beat(t, o.bpm);
    const pulse = Math.exp(-ph * 4);
    const T_ = '$' + (d.ticker || 'TICKER').toUpperCase();
    const name = d.name || 'Your Token';
    const stats = statsOf(d).slice(0, 3);

    // ---- mesh gradient ----
    const base = ctx.createLinearGradient(0, 0, W, H);
    base.addColorStop(0, c.pal[0]);
    base.addColorStop(0.5, c.pal[2]);
    base.addColorStop(1, c.pal[3]);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, H);
    const M = Math.max(W, H);
    const pts = [
      [0.15 + 0.12 * Math.sin(t * 0.5), 0.2 + 0.1 * Math.cos(t * 0.4)],
      [0.85 + 0.1 * Math.cos(t * 0.45), 0.3 + 0.12 * Math.sin(t * 0.55)],
      [0.3 + 0.15 * Math.cos(t * 0.35), 0.75 + 0.1 * Math.sin(t * 0.5)],
      [0.8 + 0.12 * Math.sin(t * 0.3), 0.85 + 0.08 * Math.cos(t * 0.6)],
    ];
    pts.forEach(([px, py], i) => blob(ctx, px * W, py * H, M * (0.5 + 0.03 * pulse), c.pal[i], 0.9));
    // soft white highlight sweep
    blob(ctx, W * (0.5 + 0.3 * Math.sin(t * 0.3)), H * 0.45, M * 0.35, 'rgba(255,255,255,0.55)');

    // floating glass orbs (parallax depth)
    for (let i = 0; i < 4; i++) {
      const z = 0.5 + i * 0.25;
      const ox = W * ((0.15 + i * 0.27 + Math.sin(t * 0.2 * z + i) * 0.05) % 1);
      const oy = H * (((0.85 - i * 0.21 - t * 0.012 * z) % 1 + 1) % 1);
      const orr = (60 + i * 45) * u;
      const g = ctx.createRadialGradient(ox - orr * 0.35, oy - orr * 0.4, orr * 0.05, ox, oy, orr);
      g.addColorStop(0, 'rgba(255,255,255,0.75)');
      g.addColorStop(0.35, 'rgba(255,255,255,0.18)');
      g.addColorStop(0.9, 'rgba(255,255,255,0.08)');
      g.addColorStop(1, 'rgba(255,255,255,0.35)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(ox, oy, orr, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.textBaseline = 'alphabetic';
    const cx = W / 2;

    // ---- Act 1: kinetic headline ----
    if (T < 3.0) {
      const out = easeInOutQuint(p01(T, 2.55, 3.0));
      ctx.save();
      ctx.globalAlpha = 1 - out;
      ctx.translate(0, -out * 80 * u);
      // eyebrow pill
      const ep = easeOutExpo(p01(T, 0.1, 0.8));
      ctx.font = SANS(28 * u, 700);
      const ew = ctx.measureText('NEW ON VIBE/VIBE').width + 56 * u;
      const ey = H * (sq ? 0.27 : 0.33);
      glass(ctx, cx - ew / 2, ey - 34 * u + (1 - ep) * 30 * u, ew, 68 * u, 34 * u, u, ep * (1 - out));
      ctx.globalAlpha = ep * (1 - out);
      ctx.fillStyle = c.pal[0];
      ctx.textAlign = 'center';
      ctx.fillText('NEW ON VIBE/VIBE', cx, ey + 10 * u + (1 - ep) * 30 * u);
      ctx.globalAlpha = 1 - out;
      kinetic(ctx, c.head.replace('{NAME}', name), cx, H * (sq ? 0.52 : 0.5), T, {
        font: (s) => SANS(s, 800), size: 150 * u, maxW: W * 0.84, maxLines: 3, start: 0.35, stagger: 0.12, dur: 0.7,
        fill: INK, lineH: 1.04,
      });
      ctx.restore();
    }

    // ---- Act 2: glass hero card ----
    if (T >= 2.6 && T < 6.4) {
      const pin = p01(T, 2.6, 3.4);
      const out = easeInOutQuint(p01(T, 5.9, 6.4));
      const sp = spring(pin * 1.3, 8, 5);
      const cw = W * 0.8, ch = sq ? H * 0.74 : H * 0.56;
      const x = cx - cw / 2, y = (H - ch) / 2 + (1 - sp) * H * 0.3 - out * H * 0.15;
      glass(ctx, x, y, cw, ch, 64 * u, u, Math.min(1, pin * 3) * (1 - out));
      ctx.save();
      ctx.globalAlpha = Math.min(1, pin * 3) * (1 - out);
      const lr = (sq ? 130 : 170) * u;
      const ly = y + (sq ? 70 : 110) * u + lr;
      const lp = spring(p01(T, 2.9, 3.8) * 1.2, 7, 4.5);
      tiltLogo(ctx, (r) => drawLogo(ctx, d, 0, 0, r, { ring: 'rgba(255,255,255,0.9)', ringW: 8 * u }), cx, ly, lr * Math.max(0.01, lp), t, { glow: c.pal[0] + 'aa', glowBlur: 60 * u });
      ctx.textAlign = 'center';
      kinetic(ctx, T_, cx, ly + lr + (sq ? 85 : 110) * u, T, {
        font: (s) => SANS(s, 800), size: (sq ? 110 : 140) * u, maxW: cw - 100 * u, maxLines: 1, start: 3.3, stagger: 0.035, dur: 0.6, letters: true, fill: INK,
      });
      ctx.font = SANS(36 * u, 600);
      ctx.fillStyle = 'rgba(11,16,48,0.6)';
      ctx.globalAlpha *= easeOutExpo(p01(T, 3.6, 4.2));
      fitFont(ctx, name, cw - 120 * u, 40 * u, (s) => SANS(s, 600));
      ctx.fillText(name, cx, ly + lr + (sq ? 175 : 225) * u);
      ctx.restore();
      if (d.tagline) {
        ctx.save();
        ctx.globalAlpha = 1 - out;
        kinetic(ctx, d.tagline, cx, y + ch - (sq ? 110 : 150) * u, T, {
          font: (s) => SANS(s, 600), size: (sq ? 34 : 42) * u, maxW: cw - 120 * u, maxLines: sq ? 2 : 3, start: 4.0, stagger: 0.05, dur: 0.6, style: 'blur', fill: 'rgba(11,16,48,0.78)', lineH: 1.3,
        });
        ctx.restore();
      }
    }

    // ---- Act 3: stat chips ----
    if (T >= 6.0 && T < 9.7) {
      const out = easeInOutQuint(p01(T, 9.2, 9.7));
      const rows = stats.length ? stats : null;
      const n = rows ? rows.length : 3;
      const cw = W * 0.82;
      const chh = Math.min((sq ? 200 : 230) * u, (H * (sq ? 0.66 : 0.56)) / n - 30 * u);
      const top = H * 0.5 - (n * (chh + 30 * u)) / 2 + 15 * u - (sq ? 30 : 60) * u;
      ctx.save();
      ctx.textAlign = 'left';
      ctx.font = SANS(30 * u, 700);
      ctx.fillStyle = INK;
      ctx.globalAlpha = easeOutExpo(p01(T, 6.0, 6.6)) * (1 - out);
      ctx.fillText(T_ + '  ·  live stats', W * 0.09, top - 40 * u);
      ctx.restore();
      for (let i = 0; i < n; i++) {
        const p = p01(T, 6.2 + i * 0.18, 7.0 + i * 0.18);
        const sp = spring(p * 1.3, 8, 5);
        const y = top + i * (chh + 30 * u) + (1 - sp) * 120 * u - out * 60 * u;
        const x = (W - cw) / 2;
        const a = Math.min(1, p * 3) * (1 - out);
        glass(ctx, x, y, cw, chh, 44 * u, u, a);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.textAlign = 'left';
        const label = rows ? rows[i].label : ['VIBE', 'STAGE', 'NETWORK'][i];
        const val = rows ? statText(rows[i], easeOutExpo(p01(T, 6.4 + i * 0.18, 7.8 + i * 0.18))) : ['Immaculate', 'Early', 'Robinhood'][i];
        ctx.font = SANS(26 * u, 700);
        ctx.fillStyle = 'rgba(11,16,48,0.55)';
        ctx.fillText(label, x + 48 * u, y + chh * 0.36);
        const vf = fitFont(ctx, val, cw * 0.62, Math.min(84 * u, chh * 0.42), (s) => SANS(s, 800));
        ctx.fillStyle = rows && rows[i].label === '24H' ? (rows[i].value >= 0 ? '#0f9d58' : '#e5484d') : INK;
        ctx.fillText(val, x + 48 * u, y + chh * 0.36 + vf * 1.05);
        // sparkline on the right
        const sx = x + cw * 0.7, sw = cw * 0.24, sy = y + chh * 0.28, sh = chh * 0.44;
        const pp = easeInOutQuint(p01(T, 6.5 + i * 0.18, 7.7 + i * 0.18));
        const g = ctx.createLinearGradient(sx, 0, sx + sw, 0);
        g.addColorStop(0, c.pal[(i + 1) % 4]);
        g.addColorStop(1, c.pal[i % 4]);
        ctx.strokeStyle = g;
        ctx.lineWidth = 6 * u;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        const N = Math.max(2, Math.floor(c.spark.length * pp));
        for (let k = 0; k < N; k++) {
          const v = c.spark[(k + i * 5) % c.spark.length];
          const px = sx + (k / (c.spark.length - 1)) * sw, py = sy + sh - v * sh;
          k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.stroke();
        ctx.restore();
      }
    }

    // ---- Act 4: CTA ----
    if (T >= 9.4) {
      const lp = spring(p01(T, 9.4, 10.3) * 1.2, 7, 4.5);
      const ly = H * (sq ? 0.24 : 0.33);
      const lr = (sq ? 120 : 170) * u * Math.max(0.01, lp);
      tiltLogo(ctx, (r) => drawLogo(ctx, d, 0, 0, r, { ring: 'rgba(255,255,255,0.95)', ringW: 8 * u }), cx, ly, lr, t, { glow: c.pal[1] + 'cc', glowBlur: 70 * u });
      ctx.textAlign = 'center';
      kinetic(ctx, c.cta.replace('{T}', T_), cx, ly + (sq ? 240 : 320) * u, T, {
        font: (s) => SANS(s, 800), size: 130 * u, maxW: W * 0.86, maxLines: 1, start: 9.7, stagger: 0.1, dur: 0.7, fill: INK,
      });
      const bp = easeOutExpo(p01(T, 10.3, 11.0));
      const link = shortLink(d.link, d.address);
      ctx.font = SANS(34 * u, 700);
      const fs = fitFont(ctx, link, W * 0.72, 34 * u, (s) => SANS(s, 700));
      const bw = ctx.measureText(link).width + 90 * u, bh = fs + 64 * u;
      const by = ly + (sq ? 400 : 540) * u + (1 - bp) * 40 * u;
      ctx.save();
      ctx.globalAlpha = bp;
      ctx.shadowColor = c.pal[0] + '88';
      ctx.shadowBlur = (40 + 30 * pulse) * u;
      ctx.shadowOffsetY = 14 * u;
      roundRect(ctx, cx - bw / 2, by - bh / 2, bw, bh, bh / 2);
      const g = ctx.createLinearGradient(cx - bw / 2, 0, cx + bw / 2, 0);
      const sh = (t * 0.4) % 1;
      g.addColorStop(0, c.pal[0]);
      g.addColorStop(lerp(0.3, 0.7, sh), c.pal[1]);
      g.addColorStop(1, c.pal[2]);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = '#fff';
      ctx.font = SANS(fs, 700);
      ctx.fillText(link, cx, by + fs * 0.36);
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = 'rgba(11,16,48,0.6)';
      ctx.font = SANS(28 * u, 600);
      ctx.fillText('Live on vibe/vibe  ·  Robinhood Chain testnet', cx, by + bh / 2 + 60 * u);
      ctx.restore();
    }

    grain(ctx, W, H, t, 0.07);
    // minimal progress
    ctx.fillStyle = 'rgba(11,16,48,0.12)';
    ctx.fillRect(40 * u, 24 * u, W - 80 * u, 4 * u);
    ctx.fillStyle = INK;
    ctx.fillRect(40 * u, 24 * u, (W - 80 * u) * (t / o.duration), 4 * u);
    watermark(ctx, W, H, u, true);
    footer(ctx, W, H, u, 'rgba(11,16,48,0.45)');
  },
};
