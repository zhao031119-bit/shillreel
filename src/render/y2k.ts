import type { Template, TokenData, RenderOpts } from '../types';
import { rng, pick, statsOf, statText, fitFont, wrapText, roundRect, drawLogo, shortLink, memo, beat, lerp, fitWrap } from './util';
import { unit, footer, watermark, confetti } from './common';
import { easeOutExpo, easeInOutQuint, spring, p01, grain, blob } from './fx';

const FR = (s: number, w = 700) => `${w} ${s}px Fredoka`;
const PALS = [
  { bg: ['#ffd6f0', '#e2ccff', '#c4f3ff'], ink: '#3a1360', candy: ['#ff4fa3', '#8a5cff', '#21c8f6', '#ffb321', '#3fd68a'] },
  { bg: ['#fff3b0', '#ffd0e4', '#c8f7d8'], ink: '#42205e', candy: ['#ff5c8a', '#ff9f1c', '#2ec4b6', '#7b61ff', '#ff4fd8'] },
  { bg: ['#cfe3ff', '#e5d4ff', '#ffe0f4'], ink: '#1f2160', candy: ['#5b6cff', '#ff4fa3', '#00c2d1', '#a259ff', '#ffb000'] },
];
const WORDS = ['NEW!', 'WOW', 'LFG', 'OMG', 'YAY!', 'HOT', '100%', 'GM!'];
type Stk = { kind: 'star' | 'heart' | 'burst' | 'pill' | 'spark'; x: number; y: number; s: number; rot: number; col: number; word: string; at: number };

const cache = memo<{ pal: (typeof PALS)[number]; stickers: Stk[]; cta: Stk[]; sparks: [number, number, number][] }>();
function prep(d: TokenData, o: RenderOpts) {
  return cache(o.seed + '|' + o.W + 'x' + o.H, () => {
    const r = rng(o.seed + 2000);
    const pal = PALS[Math.floor(r() * PALS.length)];
    const sq = o.W / o.H > 0.8;
    const kinds: Stk['kind'][] = ['burst', 'star', 'heart', 'pill', 'star', 'heart'];
    const words = [...WORDS].sort(() => r() - 0.5);
    // sticker slots around the logo (fractions of W/H)
    const slots = sq
      ? [[0.16, 0.2], [0.84, 0.18], [0.1, 0.84], [0.9, 0.82], [0.2, 0.45], [0.8, 0.43]]
      : [[0.18, 0.2], [0.82, 0.23], [0.13, 0.52], [0.87, 0.5], [0.2, 0.75], [0.8, 0.77]];
    const stickers = slots.map(([x, y], i) => ({ kind: kinds[i], x, y, s: 0.8 + r() * 0.5, rot: (r() - 0.5) * 0.6, col: i, word: words[i % words.length], at: 0.7 + i * 0.16 }));
    const cslots = sq ? [[0.14, 0.16], [0.86, 0.2], [0.12, 0.78], [0.88, 0.76]] : [[0.16, 0.14], [0.84, 0.17], [0.14, 0.82], [0.86, 0.8]];
    const cta = cslots.map(([x, y], i) => ({ kind: (['star', 'burst', 'heart', 'pill'] as Stk['kind'][])[i], x, y, s: 0.8 + r() * 0.4, rot: (r() - 0.5) * 0.6, col: i + 2, word: words[(i + 3) % words.length], at: 9.7 + i * 0.12 }));
    return { pal, stickers, cta, sparks: Array.from({ length: 26 }, () => [r(), r(), r()] as [number, number, number]) };
  });
}

function shapePath(ctx: CanvasRenderingContext2D, kind: Stk['kind'], R: number) {
  ctx.beginPath();
  if (kind === 'star' || kind === 'spark') {
    const n = kind === 'star' ? 5 : 4, inner = kind === 'star' ? 0.5 : 0.28;
    for (let i = 0; i < n * 2; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / n;
      const rr = i % 2 ? R * inner : R;
      i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
  } else if (kind === 'heart') {
    ctx.moveTo(0, R * 0.85);
    ctx.bezierCurveTo(-R * 1.3, -R * 0.1, -R * 0.6, -R * 1.1, 0, -R * 0.45);
    ctx.bezierCurveTo(R * 0.6, -R * 1.1, R * 1.3, -R * 0.1, 0, R * 0.85);
    ctx.closePath();
  } else if (kind === 'burst') {
    const n = 14;
    for (let i = 0; i < n * 2; i++) {
      const a = (i * Math.PI) / n;
      const rr = i % 2 ? R * 0.8 : R;
      i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
  } else {
    roundRect(ctx, -R * 1.2, -R * 0.5, R * 2.4, R, R * 0.5);
  }
}

function sticker(ctx: CanvasRenderingContext2D, k: Stk, W: number, H: number, u: number, T: number, t: number, pal: (typeof PALS)[number], base = 70) {
  const p = spring(p01(T, k.at, k.at + 0.6) * 1.25, 8, 4.5);
  if (p <= 0.01) return;
  const R = base * u * k.s;
  ctx.save();
  ctx.translate(k.x * W, k.y * H + Math.sin(t * 2 + k.col) * 8 * u);
  ctx.rotate(k.rot + Math.sin(t * 1.5 + k.col * 2) * 0.08 + (1 - Math.min(1, p)) * 0.8);
  ctx.scale(p, p);
  shapePath(ctx, k.kind, R);
  ctx.shadowColor = 'rgba(60,20,90,0.28)';
  ctx.shadowBlur = 18 * u;
  ctx.shadowOffsetY = 8 * u;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 16 * u;
  ctx.strokeStyle = '#fff';
  ctx.stroke();
  ctx.shadowColor = 'transparent';
  ctx.fill();
  const col = pal.candy[k.col % pal.candy.length];
  const g = ctx.createLinearGradient(0, -R, 0, R);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.18, col);
  g.addColorStop(1, col);
  ctx.fillStyle = g;
  ctx.fill();
  // gloss
  ctx.save();
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(-R * 0.25, -R * 0.45, R * 0.55, R * 0.22, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (k.kind !== 'spark') {
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const f = fitFont(ctx, k.word, R * (k.kind === 'pill' ? 2.0 : k.kind === 'star' ? 0.95 : 1.3), R * 0.5, (s) => FR(s));
    ctx.font = FR(f);
    ctx.lineWidth = 5 * u;
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.strokeText(k.word, 0, (k.kind === 'heart' ? -R * 0.05 : R * 0.04) + 2 * u);
    ctx.fillText(k.word, 0, k.kind === 'heart' ? -R * 0.05 : R * 0.04);
  }
  ctx.restore();
}

/** glossy bubble text with white sticker outline + extrusion, per-letter pop */
function bubble(ctx: CanvasRenderingContext2D, txt: string, cx: number, cy: number, size: number, cols: string[], ink: string, u: number, T: number, start: number, stagger: number, t: number, maxW: number) {
  ctx.save();
  let s = size;
  ctx.font = FR(s);
  const sp = 0.02;
  const measure = () => [...txt].reduce((a, ch) => a + ctx.measureText(ch).width, 0) * (1 + sp);
  while (measure() > maxW && s > 18) { s *= 0.94; ctx.font = FR(s); }
  const chars = [...txt];
  const widths = chars.map((ch) => ctx.measureText(ch).width * (1 + sp));
  let x = cx - widths.reduce((a, b) => a + b, 0) / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  const glyphs = chars.map((ch, i) => {
    const gx = x + widths[i] / 2;
    x += widths[i];
    const p = spring(p01(T, start + i * stagger, start + i * stagger + 0.5) * 1.25, 9, 4);
    const bob = Math.sin(t * 4 + i * 0.7) * s * 0.03;
    return { ch, gx, p, bob, col: cols[i % cols.length], i };
  });
  // pass 1: outlines (so letters merge into one sticker)
  for (const g of glyphs) {
    if (g.p <= 0.01) continue;
    ctx.save();
    ctx.translate(g.gx, cy + g.bob);
    ctx.scale(g.p * (1 + (1 - g.p) * 0.3), g.p);
    ctx.shadowColor = 'rgba(50,10,80,0.3)';
    ctx.shadowBlur = 20 * u;
    ctx.shadowOffsetY = 12 * u;
    ctx.lineWidth = s * 0.3;
    ctx.strokeStyle = '#fff';
    ctx.strokeText(g.ch, 0, 0);
    ctx.restore();
  }
  for (const g of glyphs) {
    if (g.p <= 0.01) continue;
    ctx.save();
    ctx.translate(g.gx, cy + g.bob);
    ctx.scale(g.p * (1 + (1 - g.p) * 0.3), g.p);
    ctx.rotate(Math.sin(g.i * 1.9) * 0.06);
    // extrusion
    ctx.fillStyle = ink;
    for (let k = 1; k <= 4; k++) ctx.fillText(g.ch, 0, k * s * 0.018);
    const gr = ctx.createLinearGradient(0, -s * 0.45, 0, s * 0.4);
    gr.addColorStop(0, '#ffffff');
    gr.addColorStop(0.22, g.col);
    gr.addColorStop(1, g.col);
    ctx.fillStyle = gr;
    ctx.fillText(g.ch, 0, 0);
    // gloss highlight
    const gl = ctx.createLinearGradient(0, -s * 0.4, 0, 0);
    gl.addColorStop(0, 'rgba(255,255,255,0.75)');
    gl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gl;
    ctx.fillText(g.ch, 0, -s * 0.02);
    ctx.restore();
  }
  ctx.restore();
  return s;
}

function logoSticker(ctx: CanvasRenderingContext2D, d: TokenData, cx: number, cy: number, r: number, sx: number, sy: number, rot: number, u: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.scale(sx, sy);
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.12, 0, Math.PI * 2);
  ctx.shadowColor = 'rgba(60,20,90,0.3)';
  ctx.shadowBlur = 30 * u;
  ctx.shadowOffsetY = 16 * u;
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  drawLogo(ctx, d, 0, 0, r, {});
  // glossy dome
  const g = ctx.createLinearGradient(0, -r, 0, r * 0.2);
  g.addColorStop(0, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.42, r * 0.72, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}

/** squash & stretch drop: returns y offset & scale */
function drop(T: number, a: number, b: number, H: number) {
  const p = p01(T, a, b);
  if (p <= 0) return { y: -H, sx: 1, sy: 1 };
  const fall = Math.min(1, p / 0.35);
  if (fall < 1) {
    const e = fall * fall;
    return { y: -(1 - e) * H * 0.8, sx: 0.85, sy: 1.2 };
  }
  const q = (p - 0.35) / 0.65;
  const w = Math.exp(-q * 5) * Math.cos(q * 18);
  return { y: -Math.max(0, Math.exp(-q * 4) * Math.sin(q * 9)) * H * 0.04, sx: 1 + w * 0.22, sy: 1 - w * 0.22 };
}

export const y2k: Template = {
  id: 'y2k',
  name: 'Y2K Sticker Pop',
  blurb: 'Bubbly 3D type, stickers, candy colors',
  bpm: 124,
  music: 'bubble',
  swatch: ['#ffd6f0', '#8a5cff', '#21c8f6'],
  thumbT: 4.4,
  draw(ctx, t, d, o) {
    const { W, H } = o;
    const u = unit(W, H);
    const sq = W / H > 0.8;
    const c = prep(d, o);
    const { pal } = c;
    const T = (t * 12) / o.duration;
    const { ph } = beat(t, o.bpm);
    const pulse = Math.exp(-ph * 5);
    const T_ = '$' + (d.ticker || 'TICKER').toUpperCase();
    const name = d.name || 'Your Token';
    const cx = W / 2;

    // background
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, pal.bg[0]);
    bg.addColorStop(0.55, pal.bg[1]);
    bg.addColorStop(1, pal.bg[2]);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    blob(ctx, W * (0.2 + 0.1 * Math.sin(t * 0.5)), H * 0.25, W * 0.6, 'rgba(255,255,255,0.55)');
    blob(ctx, W * (0.85 + 0.05 * Math.cos(t * 0.6)), H * 0.75, W * 0.55, pal.candy[1] + '55');
    // grid
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2 * u;
    const gs = 72 * u, off = (t * 20 * u) % gs;
    for (let x = -gs + off; x < W + gs; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = -gs + off; y < H + gs; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.restore();
    // twinkle sparks
    for (const [x, y, z] of c.sparks) {
      const tw = 0.5 + 0.5 * Math.sin(t * 3 + z * 20);
      ctx.save();
      ctx.translate(x * W, y * H);
      ctx.rotate(t * 0.5 + z * 6);
      ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * tw})`;
      shapePath(ctx, 'spark', (10 + 16 * z) * u * (0.6 + 0.4 * tw));
      ctx.fill();
      ctx.restore();
    }

    const ink = pal.ink;
    // ---------- A: logo drop + stickers + name ----------
    if (T < 3.2) {
      const out = easeInOutQuint(p01(T, 2.85, 3.2));
      const lr = (sq ? 170 : 210) * u;
      const ly = sq ? H * 0.42 : H * 0.42;
      const dr = drop(T, 0.15, 1.6, H);
      ctx.save();
      ctx.globalAlpha = 1 - out;
      for (const k of c.stickers) sticker(ctx, k, W, H, u, T, t, pal, sq ? 56 : 78);
      logoSticker(ctx, d, cx, ly + dr.y + lr * (1 - dr.sy), lr * (1 + pulse * 0.02), dr.sx, dr.sy, Math.sin(t * 1.4) * 0.05, u);
      const fw = fitWrap(ctx, name, W * 0.8, 2, (sq ? 92 : 110) * u, 40 * u, (x) => FR(x));
      const lines = fw.lines;
      const fs = fw.size;
      lines.forEach((ln, i) => bubble(ctx, ln, cx, ly + lr + (sq ? 110 : 150) * u + i * fs * 1.05, fs, pal.candy, ink, u, T, 1.1 + i * 0.3, 0.04, t, W * 0.88));
      ctx.restore();
    }
    // ---------- B: big ticker + tagline card ----------
    if (T >= 3.0 && T < 6.4) {
      const out = easeInOutQuint(p01(T, 6.05, 6.4));
      ctx.save();
      ctx.globalAlpha = 1 - out;
      const lr = (sq ? 95 : 140) * u;
      const ly = sq ? H * 0.18 : H * 0.25;
      const sp = spring(p01(T, 3.0, 3.7) * 1.25, 8, 4.5);
      if (sp > 0.01) logoSticker(ctx, d, cx, ly, lr * sp, 1, 1, Math.sin(t * 2) * 0.12, u);
      const ty = sq ? H * 0.45 : H * 0.47;
      bubble(ctx, T_, cx, ty, (sq ? 200 : 270) * u * (1 + pulse * 0.015), pal.candy, ink, u, T, 3.2, 0.07, t, W * 0.86);
      const tag = d.tagline || name;
      const cp = spring(p01(T, 3.9, 4.6) * 1.25, 8, 4.5);
      if (cp > 0.01) {
        ctx.font = FR((sq ? 34 : 46) * u, 500);
        const tl = wrapText(ctx, tag, W * 0.64, 3);
        const lh = (sq ? 44 : 62) * u;
        const bw = W * 0.78, bh = tl.length * lh + 70 * u;
        const by = ty + (sq ? 150 : 230) * u;
        ctx.save();
        ctx.translate(cx, by + bh / 2);
        ctx.rotate(-0.03);
        ctx.scale(cp, cp);
        roundRect(ctx, -bw / 2, -bh / 2, bw, bh, 40 * u);
        ctx.shadowColor = 'rgba(60,20,90,0.25)';
        ctx.shadowBlur = 24 * u;
        ctx.shadowOffsetY = 10 * u;
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.lineWidth = 5 * u;
        ctx.strokeStyle = pal.candy[1];
        ctx.setLineDash([16 * u, 12 * u]);
        roundRect(ctx, -bw / 2 + 14 * u, -bh / 2 + 14 * u, bw - 28 * u, bh - 28 * u, 28 * u);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = ink;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        tl.forEach((ln, i) => ctx.fillText(ln, 0, (i - (tl.length - 1) / 2) * lh));
        ctx.restore();
        sticker(ctx, { kind: 'burst', x: 0.83, y: (by - 10 * u) / H, s: 0.9, rot: 0.2, col: 0, word: 'NEW!', at: 4.4 }, W, H, u, T, t, pal, sq ? 56 : 66);
      }
      ctx.restore();
    }
    // ---------- C: stat sticker cards ----------
    if (T >= 6.2 && T < 9.6) {
      const out = easeInOutQuint(p01(T, 9.25, 9.6));
      const stats = statsOf(d).slice(0, sq ? 3 : 4);
      const rows: [string, string][] = stats.length
        ? stats.map((s, i) => [s.label === 'MARKET CAP' ? 'MCAP' : s.label, statText(s, easeOutExpo(p01(T, 6.6 + i * 0.2, 8.0 + i * 0.2)))])
        : [['VIBES', '100%'], ['MOOD', 'CUTE'], ['ERA', 'Y2K']];
      const bh = (sq ? 140 : 200) * u, gap = (sq ? 40 : 60) * u;
      const total = rows.length * bh + (rows.length - 1) * gap;
      const top = (H - total) / 2 - (sq ? 0 : 20 * u);
      ctx.save();
      ctx.globalAlpha = 1 - out;
      rows.forEach(([l, v], i) => {
        const p = spring(p01(T, 6.3 + i * 0.18, 6.9 + i * 0.18) * 1.25, 8, 4.5);
        if (p <= 0.01) return;
        const bw = W * (sq ? 0.7 : 0.8);
        const y = top + i * (bh + gap) + bh / 2;
        const col = pal.candy[i % pal.candy.length];
        ctx.save();
        ctx.translate(cx + (i % 2 ? 1 : -1) * 18 * u, y);
        ctx.rotate((i % 2 ? 1 : -1) * 0.035);
        ctx.scale(p, p);
        roundRect(ctx, -bw / 2, -bh / 2, bw, bh, 44 * u);
        ctx.shadowColor = 'rgba(60,20,90,0.25)';
        ctx.shadowBlur = 24 * u;
        ctx.shadowOffsetY = 12 * u;
        ctx.lineWidth = 16 * u;
        ctx.strokeStyle = '#fff';
        ctx.stroke();
        ctx.shadowColor = 'transparent';
        const g = ctx.createLinearGradient(0, -bh / 2, 0, bh / 2);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.2, col);
        g.addColorStop(1, col);
        ctx.fillStyle = g;
        ctx.fill();
        // label pill
        ctx.font = FR((sq ? 26 : 32) * u, 700);
        const lw = ctx.measureText(l).width + 40 * u, lh = (sq ? 44 : 54) * u;
        roundRect(ctx, -bw / 2 + 30 * u, -bh / 2 - lh / 2, lw, lh, lh / 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.fillStyle = col;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(l, -bw / 2 + 50 * u, -bh / 2 + 2 * u);
        // value
        ctx.textAlign = 'center';
        const f = fitFont(ctx, v, bw * 0.86, (sq ? 84 : 108) * u, (s) => FR(s));
        ctx.font = FR(f);
        ctx.fillStyle = ink;
        for (let k = 1; k <= 3; k++) ctx.fillText(v, 0, 10 * u + k * f * 0.02);
        ctx.fillStyle = '#fff';
        ctx.fillText(v, 0, 10 * u);
        ctx.restore();
      });
      ctx.restore();
    }
    // ---------- D: CTA ----------
    if (T >= 9.4) {
      for (const k of c.cta) sticker(ctx, k, W, H, u, T, t, pal, sq ? 52 : 74);
      const lr = (sq ? 130 : 200) * u;
      const ly = sq ? H * 0.3 : H * 0.36;
      const dr = drop(T, 9.4, 10.6, H);
      logoSticker(ctx, d, cx, ly + dr.y + lr * (1 - dr.sy), lr * (1 + pulse * 0.03), dr.sx, dr.sy, Math.sin(t * 1.4) * 0.06, u);
      const gy = ly + lr + (sq ? 110 : 150) * u;
      bubble(ctx, 'GET ' + T_, cx, gy, (sq ? 120 : 160) * u, pal.candy, ink, u, T, 9.9, 0.05, t, W * 0.86);
      const kp = spring(p01(T, 10.5, 11.1) * 1.25, 8, 4.5);
      if (kp > 0.01) {
        const link = shortLink(d.link, d.address);
        const f = fitFont(ctx, link, W * 0.72, (sq ? 30 : 40) * u, (s) => FR(s, 600));
        const bw = ctx.measureText(link).width + 80 * u, bh = f + 54 * u;
        const by = gy + (sq ? 120 : 190) * u;
        ctx.save();
        ctx.translate(cx, by);
        ctx.scale(kp * (1 + pulse * 0.03), kp * (1 + pulse * 0.03));
        roundRect(ctx, -bw / 2, -bh / 2, bw, bh, bh / 2);
        ctx.shadowColor = 'rgba(60,20,90,0.3)';
        ctx.shadowBlur = 24 * u;
        ctx.shadowOffsetY = 10 * u;
        ctx.lineWidth = 12 * u;
        ctx.strokeStyle = '#fff';
        ctx.stroke();
        ctx.shadowColor = 'transparent';
        const rb = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
        pal.candy.forEach((cc, i) => rb.addColorStop(i / (pal.candy.length - 1), cc));
        ctx.fillStyle = rb;
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        roundRect(ctx, -bw / 2 + 16 * u, -bh / 2 + 6 * u, bw - 32 * u, bh * 0.32, bh * 0.16);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(link, 0, 2 * u);
        ctx.restore();
      }
      confetti(ctx, W, H, u, (T - 9.9) * (o.duration / 12), o.seed, pal.candy, cx, ly);
    }
    grain(ctx, W, H, t, 0.05);
    watermark(ctx, W, H, u, true);
    footer(ctx, W, H, u, 'rgba(40,20,70,0.55)');
    void lerp;
  },
};
