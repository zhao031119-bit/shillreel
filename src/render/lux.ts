import type { Template, TokenData, RenderOpts } from '../types';
import { seg, easeOutCubic, easeInOutCubic, rng, pick, statsOf, statText, fitFont, fitWrap, wrapText, drawLogo, shortLink, memo, lerp } from './util';
import { unit, footer, watermark } from './common';

const SERIF = (s: number, w = 400, it = false) => `${it ? 'italic ' : ''}${w} ${s}px "Playfair Display"`;
const cache = memo<{ dust: [number, number, number, number][]; intro: string; cta: string }>();
function prep(d: TokenData, o: RenderOpts) {
  return cache(o.seed + '|' + d.ticker, () => {
    const r = rng(o.seed + 3);
    return {
      dust: Array.from({ length: 70 }, () => [r(), r(), r(), r()] as [number, number, number, number]),
      intro: pick(r, ['INTRODUCING', 'PRESENTING', 'THE COLLECTION', 'BY INVITATION']),
      cta: pick(r, ['Now available on vibe/vibe', 'Reserved for the early', 'Exclusively on vibe/vibe', 'Acquire on vibe/vibe']),
    };
  });
}

function gold(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, t: number) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  const sh = (t * 0.25) % 1;
  const stops: [number, string][] = [[0, '#7a5a1c'], [0.25, '#d9b45a'], [0.45, '#fff0c2'], [0.6, '#c99a3a'], [0.85, '#f3d37c'], [1, '#8a6420']];
  for (const [o, c] of stops) g.addColorStop((o + sh) % 1, c);
  // ensure ends defined
  g.addColorStop(0, '#9c7628');
  g.addColorStop(1, '#9c7628');
  return g;
}

function spacedText(ctx: CanvasRenderingContext2D, txt: string, x: number, y: number, spacing: number) {
  const chars = [...txt];
  const w = chars.reduce((a, ch) => a + ctx.measureText(ch).width, 0) + spacing * (chars.length - 1);
  let cx = x - w / 2;
  const al = ctx.textAlign;
  ctx.textAlign = 'left';
  for (const ch of chars) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
  ctx.textAlign = al;
  return w;
}

function corner(ctx: CanvasRenderingContext2D, x: number, y: number, sx: number, sy: number, L: number, u: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + sy * L);
  ctx.lineTo(x, y);
  ctx.lineTo(x + sx * L, y);
  ctx.moveTo(x + sx * 14 * u, y + sy * 14 * u);
  ctx.lineTo(x + sx * 14 * u, y + sy * L * 0.6);
  ctx.moveTo(x + sx * 14 * u, y + sy * 14 * u);
  ctx.lineTo(x + sx * L * 0.6, y + sy * 14 * u);
  ctx.stroke();
}

export const lux: Template = {
  id: 'lux',
  name: 'Luxury Gold',
  blurb: 'Black & gold, serif, slow reveals',
  bpm: 76,
  music: 'lux',
  swatch: ['#000000', '#d9b45a', '#fff0c2'],
  thumbT: 5,
  draw(ctx, t, d, o) {
    const { W, H } = o;
    const u = unit(W, H);
    const sq = W / H > 0.8;
    const c = prep(d, o);
    const T = (t * 12) / o.duration;
    const T_ = '$' + (d.ticker || 'TICKER').toUpperCase();
    const name = d.name || 'Token';
    const stats = statsOf(d).slice(0, sq ? 3 : 4);

    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, W, H);
    const vg = ctx.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, Math.max(W, H) * 0.7);
    vg.addColorStop(0, 'rgba(95,70,22,0.6)');
    vg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
    // art-deco rays
    ctx.save();
    ctx.translate(W / 2, H * (sq ? 0.36 : 0.36));
    ctx.rotate(t * 0.04);
    ctx.strokeStyle = 'rgba(217,180,90,0.07)';
    ctx.lineWidth = 2 * u;
    for (let k = 0; k < 48; k++) {
      ctx.rotate((Math.PI * 2) / 48);
      ctx.beginPath();
      ctx.moveTo(0, 180 * u);
      ctx.lineTo(0, Math.max(W, H));
      ctx.stroke();
    }
    ctx.restore();
    // gold dust
    for (const [x, y, z, ph] of c.dust) {
      const yy = ((y * H - t * 25 * u * (0.3 + z)) % H + H) % H;
      const xx = x * W + Math.sin(t * 0.6 + ph * 6) * 20 * u;
      const a = (0.25 + 0.6 * z) * (0.5 + 0.5 * Math.sin(t * 2 + ph * 9));
      ctx.fillStyle = `rgba(240,205,120,${a})`;
      ctx.beginPath();
      ctx.arc(xx, yy, (1 + 2.5 * z) * u, 0, Math.PI * 2);
      ctx.fill();
    }
    // frame draws itself
    const fp = easeInOutCubic(seg(T, 0, 1.4));
    const m = 46 * u;
    ctx.save();
    ctx.strokeStyle = gold(ctx, 0, 0, W, H, t);
    ctx.lineWidth = 2.5 * u;
    ctx.globalAlpha = 0.9;
    const L = 120 * u * fp;
    if (L > 1) {
      corner(ctx, m, m + 50 * u, 1, 1, L, u);
      corner(ctx, W - m, m + 50 * u, -1, 1, L, u);
      corner(ctx, m, H - m - 50 * u, 1, -1, L, u);
      corner(ctx, W - m, H - m - 50 * u, -1, -1, L, u);
    }
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Act 1: intro + name (0 - 3.4)
    if (T < 3.6) {
      const out = easeInOutCubic(seg(T, 3.0, 3.6));
      ctx.save();
      ctx.globalAlpha = 1 - out;
      ctx.font = `600 ${28 * u}px Inter`;
      ctx.fillStyle = '#d9b45a';
      ctx.globalAlpha *= seg(T, 0.4, 1.2);
      const sp = lerp(30, 14, easeOutCubic(seg(T, 0.4, 2.5))) * u;
      spacedText(ctx, c.intro, W / 2, H * 0.4, sp);
      ctx.globalAlpha = 1 - out;
      // name reveal by mask wipe
      const np = easeInOutCubic(seg(T, 1.0, 2.2));
      const fw = fitWrap(ctx, name, W * 0.8, sq ? 2 : 3, 130 * u, 44 * u, (s) => SERIF(s, 400, true));
      const lines = fw.lines;
      const fs = fw.size;
      ctx.font = SERIF(fs, 400, true);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W * np, H);
      ctx.clip();
      ctx.fillStyle = gold(ctx, W * 0.1, 0, W * 0.9, 0, t);
      lines.forEach((ln, i) => {
        ctx.fillText(ln, W / 2, H * 0.5 + (i - (lines.length - 1) / 2) * fs * 1.15);
      });
      ctx.restore();
      // hairline
      const hp = easeInOutCubic(seg(T, 1.8, 2.8));
      ctx.fillStyle = '#d9b45a';
      ctx.fillRect(W / 2 - 160 * u * hp, H * 0.5 + (lines.length * fs * 1.15) / 2 + 40 * u, 320 * u * hp, 2 * u);
      ctx.restore();
    }

    // Act 2: logo + ticker + tagline (3.2 - 6.8)
    const logoY = sq ? H * 0.34 : H * 0.33;
    if (T >= 3.2 && T < 7.0) {
      const p = easeOutCubic(seg(T, 3.2, 4.4));
      const out = easeInOutCubic(seg(T, 6.4, 7.0));
      const r = (sq ? 170 : 230) * u;
      ctx.save();
      ctx.globalAlpha = p * (1 - out);
      ctx.translate(0, (1 - p) * 40 * u);
      // gold ring
      ctx.lineWidth = 12 * u;
      ctx.strokeStyle = gold(ctx, W / 2 - r, logoY - r, W / 2 + r, logoY + r, t);
      ctx.beginPath();
      ctx.arc(W / 2, logoY, r + 18 * u, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 2 * u;
      ctx.beginPath();
      ctx.arc(W / 2, logoY, r + 38 * u, 0, Math.PI * 2);
      ctx.stroke();
      drawLogo(ctx, d, W / 2, logoY, r, {});
      // gold tint + shimmer sweep
      ctx.save();
      ctx.beginPath();
      ctx.arc(W / 2, logoY, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.globalCompositeOperation = 'color';
      ctx.fillStyle = 'rgba(200,160,70,0.55)';
      ctx.fillRect(W / 2 - r, logoY - r, 2 * r, 2 * r);
      ctx.globalCompositeOperation = 'lighter';
      const sx = lerp(-r * 2, r * 2, ((T - 3.2) / 1.6) % 1.6);
      const sg = ctx.createLinearGradient(W / 2 + sx - r * 0.4, 0, W / 2 + sx + r * 0.4, 0);
      sg.addColorStop(0, 'rgba(255,240,200,0)');
      sg.addColorStop(0.5, 'rgba(255,240,200,0.45)');
      sg.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(W / 2 - r, logoY - r, 2 * r, 2 * r);
      ctx.restore();
      const ty = logoY + r + (sq ? 110 : 150) * u;
      fitFont(ctx, T_, W * 0.8, (sq ? 100 : 130) * u, (s) => SERIF(s, 700));
      ctx.fillStyle = gold(ctx, W * 0.2, 0, W * 0.8, 0, t);
      ctx.fillText(T_, W / 2, ty);
      if (d.tagline) {
        const tp = seg(T, 4.2, 5.2);
        ctx.globalAlpha = tp * (1 - out);
        ctx.font = SERIF((sq ? 36 : 44) * u, 400, true);
        const tl = wrapText(ctx, d.tagline, W * 0.76, sq ? 2 : 3);
        ctx.fillStyle = '#e9dcc0';
        tl.forEach((ln, i) => ctx.fillText(ln, W / 2, ty + (sq ? 90 : 120) * u + i * (sq ? 50 : 62) * u));
      }
      ctx.restore();
    }

    // Act 3: figures (6.6 - 9.6)
    if (T >= 6.6 && T < 9.8) {
      const out = easeInOutCubic(seg(T, 9.3, 9.8));
      const rows: [string, string][] = stats.length ? stats.map((s, i) => [s.label === '24H' ? '24 HOURS' : s.label, statText(s, easeOutCubic(seg(T, 7.0 + i * 0.25, 8.4 + i * 0.25)))]) : [['EDITION', 'Genesis'], ['NETWORK', 'Robinhood Chain'], ['VENUE', 'vibe/vibe']];
      ctx.save();
      ctx.globalAlpha = 1 - out;
      ctx.font = `600 ${26 * u}px Inter`;
      ctx.fillStyle = '#d9b45a';
      ctx.globalAlpha *= seg(T, 6.6, 7.0);
      spacedText(ctx, 'THE FIGURES', W / 2, sq ? H * 0.17 : H * 0.2, 12 * u);
      ctx.globalAlpha = 1 - out;
      const top = sq ? H * 0.26 : H * 0.28;
      const rh = Math.min(sq ? 190 * u : 250 * u, (H * 0.58) / rows.length);
      rows.forEach(([l, v], i) => {
        const p = easeOutCubic(seg(T, 6.8 + i * 0.25, 7.6 + i * 0.25));
        const y = top + rh * i;
        ctx.save();
        ctx.globalAlpha = p * (1 - out);
        ctx.translate(0, (1 - p) * 30 * u);
        ctx.font = `600 ${22 * u}px Inter`;
        ctx.fillStyle = '#b8a27a';
        spacedText(ctx, l, W / 2, y + rh * 0.24, 8 * u);
        fitFont(ctx, v, W * 0.8, Math.min(92 * u, rh * 0.42), (s) => SERIF(s, 400));
        ctx.fillStyle = gold(ctx, W * 0.2, 0, W * 0.8, 0, t);
        ctx.fillText(v, W / 2, y + rh * 0.58);
        if (i < rows.length - 1) {
          ctx.fillStyle = 'rgba(217,180,90,0.5)';
          ctx.fillRect(W / 2 - 120 * u * p, y + rh * 0.92, 240 * u * p, 1.5 * u);
        }
        ctx.restore();
      });
      ctx.restore();
    }

    // Act 4: CTA
    if (T >= 9.6) {
      const p = easeOutCubic(seg(T, 9.6, 10.6));
      ctx.save();
      ctx.globalAlpha = p;
      const r = (sq ? 110 : 150) * u;
      const cy = sq ? H * 0.28 : H * 0.32;
      ctx.lineWidth = 6 * u;
      ctx.strokeStyle = gold(ctx, W / 2 - r, cy - r, W / 2 + r, cy + r, t);
      ctx.beginPath();
      ctx.arc(W / 2, cy, r + 12 * u, 0, Math.PI * 2);
      ctx.stroke();
      drawLogo(ctx, d, W / 2, cy, r, {});
      const nw = fitWrap(ctx, name, W * 0.8, 2, 90 * u, 40 * u, (s) => SERIF(s, 400, true));
      ctx.fillStyle = gold(ctx, W * 0.2, 0, W * 0.8, 0, t);
      const extra = (nw.lines.length - 1) * nw.size * 1.1;
      nw.lines.forEach((ln, i) => ctx.fillText(ln, W / 2, cy + r + 100 * u + i * nw.size * 1.1));
      ctx.font = `600 ${26 * u}px Inter`;
      ctx.fillStyle = '#d9b45a';
      ctx.globalAlpha = seg(T, 10.0, 10.8);
      spacedText(ctx, c.cta.toUpperCase(), W / 2, cy + r + 210 * u + extra, 6 * u);
      const link = shortLink(d.link, d.address);
      fitFont(ctx, link, W * 0.8, 34 * u, (s) => SERIF(s, 400));
      ctx.fillStyle = '#f3e6c8';
      ctx.fillText(link, W / 2, cy + r + 280 * u + extra);
      ctx.restore();
    }

    // thin gold progress
    ctx.fillStyle = 'rgba(217,180,90,0.25)';
    ctx.fillRect(m, 22 * u, W - 2 * m, 2 * u);
    ctx.fillStyle = '#d9b45a';
    ctx.fillRect(m, 22 * u, (W - 2 * m) * (t / o.duration), 2 * u);
    watermark(ctx, W, H, u);
    footer(ctx, W, H, u, 'rgba(217,180,90,0.55)');
  },
};
