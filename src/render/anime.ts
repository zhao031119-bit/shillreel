import type { Template, TokenData, RenderOpts } from '../types';
import { rng, pick, statsOf, statText, fitFont, wrapText, drawLogo, shortLink, memo, beat, hash, clamp } from './util';
import { unit, footer, watermark } from './common';
import { easeOutExpo, easeInOutQuint, spring, p01, grain, kinetic } from './fx';

const PAPER = '#fbf6ea';
const INK = '#121212';
const RED = '#e8112d';
const YEL = '#ffd60a';
const BANG = (s: number) => `${s}px Bangers`;
const SFX = ['DOOON!!', 'BAM!!', 'ZOOOM!', 'KRAK!!', 'WHOOSH!'];
const CHALL = ['A NEW CHALLENGER APPEARS', 'THE CHOSEN TOKEN AWAKENS', 'EPISODE 1: THE LAUNCH', 'HIS POWER IS GROWING'];

const cache = memo<{ sfx: string; sfx2: string; chall: string }>();
function prep(d: TokenData, o: RenderOpts) {
  return cache(o.seed + '|' + d.ticker, () => {
    const r = rng(o.seed + 808);
    return { sfx: pick(r, SFX), sfx2: pick(r, SFX), chall: pick(r, CHALL) };
  });
}

function speedLines(ctx: CanvasRenderingContext2D, cx: number, cy: number, W: number, H: number, rIn: number, seed: number, color: string, n = 140) {
  const R = Math.hypot(W, H);
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (hash(seed * 7 + i) - 0.5) * 0.04;
    const w = (0.002 + hash(seed * 13 + i) * 0.012);
    const r0 = rIn * (0.85 + hash(seed * 3 + i) * 0.9);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a - w) * R, cy + Math.sin(a - w) * R);
    ctx.lineTo(cx + Math.cos(a + w) * R, cy + Math.sin(a + w) * R);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function hLines(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < 40; i++) {
    const yy = y + hash(seed + i * 3.1) * h;
    const len = w * (0.3 + hash(seed + i * 7.7) * 0.7);
    const xx = x + w - len + hash(seed + i) * w * 0.2;
    ctx.fillRect(xx, yy, len, 1.5 + hash(i * 9.1 + seed) * 5);
  }
  ctx.restore();
}

function halftone(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, u: number, color: string, dir: 'down' | 'up' = 'down') {
  ctx.save();
  ctx.fillStyle = color;
  const st = 22 * u;
  for (let yy = 0; yy < h; yy += st) {
    const k = dir === 'down' ? yy / h : 1 - yy / h;
    const r = k * st * 0.5;
    if (r < 0.6) continue;
    for (let xx = ((yy / st) % 2) * st * 0.5; xx < w; xx += st) {
      ctx.beginPath();
      ctx.arc(x + xx, y + yy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function sfxText(ctx: CanvasRenderingContext2D, txt: string, x: number, y: number, size: number, rot: number, sc: number, u: number, fill = YEL) {
  if (sc <= 0.01) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(sc, sc);
  ctx.font = BANG(size);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.2;
  ctx.strokeStyle = INK;
  ctx.strokeText(txt, 8 * u, 10 * u);
  ctx.fillStyle = INK;
  ctx.fillText(txt, 8 * u, 10 * u);
  ctx.lineWidth = size * 0.11;
  ctx.strokeStyle = '#fff';
  ctx.strokeText(txt, 0, 0);
  ctx.fillStyle = fill;
  ctx.fillText(txt, 0, 0);
  ctx.restore();
}

function panel(ctx: CanvasRenderingContext2D, poly: [number, number][], u: number, content: () => void) {
  ctx.save();
  ctx.beginPath();
  poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.save();
  ctx.clip();
  content();
  ctx.restore();
  ctx.lineWidth = 9 * u;
  ctx.lineJoin = 'miter';
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.restore();
}

export const anime: Template = {
  id: 'anime',
  name: 'Anime Speedlines',
  blurb: 'Manga panels, impact frames, SFX',
  bpm: 160,
  music: 'anime',
  swatch: [PAPER, RED, INK],
  thumbT: 4.2,
  draw(ctx, t, d, o) {
    const { W, H } = o;
    const u = unit(W, H);
    const sq = W / H > 0.8;
    const c = prep(d, o);
    const T = (t * 12) / o.duration;
    const { i: bi, ph } = beat(t, o.bpm);
    const fr = Math.floor(t * 15); // line jitter rate
    const T_ = '$' + (d.ticker || 'TICKER').toUpperCase();
    const name = (d.name || 'Token').toUpperCase();
    const stats = statsOf(d);
    const cx = W / 2;
    const hitTimes = [0.05, 2.6, 6.0, 9.4];
    const impact = hitTimes.some((h) => T >= h && T < h + 0.12);

    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, W, H);
    const shake = Math.exp(-ph * 8) * 6 * u;
    ctx.save();
    ctx.translate((hash(bi) - 0.5) * shake, (hash(bi + 3) - 0.5) * shake);

    // ---------- Scene A: dramatic zoom ----------
    if (T < 2.7) {
      const cy = H * (sq ? 0.47 : 0.45);
      const zp = easeOutExpo(p01(T, 0.1, 1.4));
      speedLines(ctx, cx, cy, W, H, (sq ? 330 : 380) * u * (1.4 - zp * 0.4), fr, INK, 150);
      halftone(ctx, 0, H * 0.72, W, H * 0.28, u, 'rgba(18,18,18,0.35)', 'down');
      const r = (sq ? 250 : 300) * u * (0.35 + 0.75 * zp) * (1 + 0.03 * Math.exp(-ph * 6));
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((1 - zp) * -0.25);
      ctx.beginPath();
      ctx.arc(0, 0, r + 26 * u, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.lineWidth = 10 * u;
      ctx.strokeStyle = INK;
      ctx.stroke();
      drawLogo(ctx, d, 0, 0, r, { ring: INK, ringW: 8 * u });
      ctx.restore();
      sfxText(ctx, c.sfx, W * 0.3, H * (sq ? 0.13 : 0.16), (sq ? 150 : 190) * u, -0.18, spring(p01(T, 0.5, 1.2) * 1.3, 10, 5), u);
      // narration box
      const bp = easeOutExpo(p01(T, 1.2, 1.8));
      if (bp > 0) {
        ctx.save();
        ctx.font = BANG(54 * u);
        const lines = wrapText(ctx, c.chall, W * 0.72, 2);
        const bw = W * 0.8, bh = lines.length * 62 * u + 50 * u;
        const by = H * (sq ? 0.82 : 0.8) - bh / 2;
        ctx.translate((1 - bp) * -W, 0);
        ctx.fillStyle = '#fff';
        ctx.fillRect(cx - bw / 2, by, bw, bh);
        ctx.lineWidth = 7 * u;
        ctx.strokeStyle = INK;
        ctx.strokeRect(cx - bw / 2, by, bw, bh);
        ctx.fillStyle = INK;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        lines.forEach((ln, i) => {
          fitFont(ctx, ln, bw - 60 * u, 54 * u, BANG);
          ctx.fillText(ln, cx, by + 25 * u + 62 * u * (i + 0.5));
        });
        ctx.restore();
      }
    }

    // ---------- Scene B: manga page ----------
    if (T >= 2.6 && T < 6.1) {
      const g = 22 * u;
      const top = 90 * u, bot = H - 100 * u;
      const h = bot - top;
      const y1 = top + h * 0.32, y2 = top + h * 0.64;
      const sl = 50 * u; // slant
      const L = 30 * u, R = W - 30 * u;
      const p1 = easeOutExpo(p01(T, 2.6, 3.2)), p2 = easeOutExpo(p01(T, 3.1, 3.7)), p3 = easeOutExpo(p01(T, 3.6, 4.2));
      // panel 1: ticker with horizontal speed lines
      ctx.save();
      ctx.translate((1 - p1) * -W, 0);
      panel(ctx, [[L, top], [R, top], [R, y1 - sl - g / 2], [L, y1 + sl - g / 2]], u, () => {
        ctx.fillStyle = INK;
        ctx.fillRect(0, 0, W, H);
        hLines(ctx, L, top, R - L, y1 - top, fr * 31, '#fff');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const fs = fitFont(ctx, T_, (R - L) * 0.86, (sq ? 190 : 230) * u, BANG);
        ctx.font = BANG(fs);
        ctx.fillStyle = RED;
        ctx.fillText(T_, cx + 10 * u, (top + y1) / 2 - 8 * u + 10 * u);
        ctx.fillStyle = '#fff';
        ctx.fillText(T_, cx, (top + y1) / 2 - 8 * u);
      });
      ctx.restore();
      // panel 2: extreme close-up of logo
      ctx.save();
      ctx.translate((1 - p2) * W, 0);
      panel(ctx, [[L, y1 + sl + g / 2], [R, y1 - sl + g / 2], [R, y2 + sl - g / 2], [L, y2 - sl - g / 2]], u, () => {
        ctx.fillStyle = YEL;
        ctx.fillRect(0, 0, W, H);
        const my = (y1 + y2) / 2;
        speedLines(ctx, W * 0.62, my, W, H, 120 * u, fr + 5, 'rgba(18,18,18,0.8)', 90);
        const z = 1 + 0.15 * easeOutExpo(p01(T, 3.1, 5.8));
        drawLogo(ctx, d, W * 0.62, my, (y2 - y1) * 0.62 * z, { ring: INK, ringW: 10 * u });
        // eye-catch frame lines
        halftone(ctx, L, y1, W * 0.4, y2 - y1, u, 'rgba(18,18,18,0.5)', 'up');
      });
      ctx.restore();
      sfxText(ctx, c.sfx2, W * 0.26, (y1 + y2) / 2, (sq ? 100 : 130) * u, -0.2, spring(p01(T, 3.6, 4.2) * 1.3, 10, 5), u, RED);
      // panel 3: name + tagline bubble
      ctx.save();
      ctx.translate(0, (1 - p3) * H * 0.5);
      panel(ctx, [[L, y2 + sl + g / 2], [R, y2 - sl + g / 2], [R, bot], [L, bot]], u, () => {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, W, H);
        halftone(ctx, L, y2, R - L, bot - y2, u, 'rgba(232,17,45,0.25)', 'down');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const ny = y2 + (bot - y2) * (d.tagline ? 0.3 : 0.5);
        const fs = fitFont(ctx, name, (R - L) * 0.86, (sq ? 70 : 96) * u, BANG);
        ctx.font = BANG(fs);
        ctx.fillStyle = INK;
        ctx.fillText(name, cx, ny);
        if (d.tagline) {
          // speech bubble
          ctx.font = `700 ${(sq ? 26 : 34) * u}px "Plus Jakarta Sans"`;
          const lines = wrapText(ctx, d.tagline, (R - L) * 0.72, 2);
          const bw = (R - L) * 0.82, bh = lines.length * (sq ? 34 : 44) * u + 40 * u;
          const by = ny + fs * 0.55 + 20 * u;
          ctx.beginPath();
          ctx.ellipse(cx, by + bh / 2, bw / 2, bh / 2 + 10 * u, 0, 0, Math.PI * 2);
          ctx.moveTo(cx - 40 * u, by + 4 * u);
          ctx.lineTo(cx - 70 * u, by - 34 * u);
          ctx.lineTo(cx + 10 * u, by + 2 * u);
          ctx.fillStyle = '#fff';
          ctx.fill();
          ctx.lineWidth = 5 * u;
          ctx.strokeStyle = INK;
          ctx.stroke();
          ctx.fillStyle = INK;
          const ta = easeOutExpo(p01(T, 4.2, 4.8));
          ctx.globalAlpha = ta;
          lines.forEach((ln, i) => ctx.fillText(ln, cx, by + 20 * u + (i + 0.5) * (sq ? 34 : 44) * u));
        }
      });
      ctx.restore();
    }

    // ---------- Scene C: power level ----------
    if (T >= 6.0 && T < 9.5) {
      const cy = H * (sq ? 0.42 : 0.4);
      ctx.fillStyle = YEL;
      ctx.fillRect(0, 0, W, H);
      speedLines(ctx, cx, cy, W, H, (sq ? 300 : 360) * u, fr + 11, 'rgba(18,18,18,0.85)', 130);
      halftone(ctx, 0, 0, W, H * 0.25, u, 'rgba(232,17,45,0.35)', 'up');
      const main = stats.find((s) => s.label === 'HOLDERS') ?? stats.find((s) => s.label === 'MARKET CAP') ?? null;
      const pv = easeOutExpo(p01(T, 6.3, 8.0));
      const label = main ? (main.label === 'HOLDERS' ? 'POWER LEVEL (HOLDERS)' : 'POWER LEVEL (MCAP)') : 'POWER LEVEL';
      const valTxt = main ? statText(main, pv) : String(Math.floor(9001 * pv));
      // label box
      const lp = easeOutExpo(p01(T, 6.0, 6.4));
      ctx.save();
      ctx.translate(0, (1 - lp) * -200 * u);
      ctx.fillStyle = INK;
      ctx.font = BANG(56 * u);
      const lw = Math.min(W * 0.86, ctx.measureText(label).width + 70 * u);
      ctx.fillRect(cx - lw / 2, cy - 250 * u, lw, 90 * u);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      fitFont(ctx, label, lw - 40 * u, 56 * u, BANG);
      ctx.fillText(label, cx, cy - 203 * u);
      ctx.restore();
      // big number
      const ns = spring(p01(T, 6.2, 6.9) * 1.3, 9, 5);
      ctx.save();
      ctx.translate(cx, cy + 20 * u);
      ctx.scale(ns, ns);
      const fs = fitFont(ctx, valTxt, W * 0.86, (sq ? 200 : 240) * u, BANG);
      ctx.font = BANG(fs);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = fs * 0.14;
      ctx.strokeStyle = '#fff';
      ctx.strokeText(valTxt, 0, 0);
      ctx.fillStyle = RED;
      ctx.fillText(valTxt, 0, 0);
      ctx.restore();
      // power bar
      const bw = W * 0.76, bh = 40 * u, by = cy + (sq ? 150 : 190) * u;
      ctx.fillStyle = INK;
      ctx.fillRect(cx - bw / 2 - 8 * u, by - 8 * u, bw + 16 * u, bh + 16 * u);
      ctx.fillStyle = '#fff';
      ctx.fillRect(cx - bw / 2, by, bw, bh);
      const gr = ctx.createLinearGradient(cx - bw / 2, 0, cx + bw / 2, 0);
      gr.addColorStop(0, YEL);
      gr.addColorStop(1, RED);
      ctx.fillStyle = gr;
      ctx.fillRect(cx - bw / 2, by, bw * pv, bh);
      // other stats as small tags
      const others = stats.filter((s) => s !== main).slice(0, 3);
      others.forEach((s, i) => {
        const p = spring(p01(T, 7.2 + i * 0.25, 7.8 + i * 0.25) * 1.3, 10, 5);
        const txt = `${s.label === 'MARKET CAP' ? 'MCAP' : s.label}: ${statText(s)}`;
        ctx.save();
        ctx.translate(cx + (i - (others.length - 1) / 2) * (sq ? 0 : 0), by + (sq ? 110 : 140) * u + i * (sq ? 76 : 100) * u);
        ctx.rotate((i % 2 ? 1 : -1) * 0.03);
        ctx.scale(p, p);
        ctx.font = BANG((sq ? 46 : 56) * u);
        const tw = Math.min(W * 0.8, ctx.measureText(txt).width + 50 * u);
        ctx.fillStyle = '#fff';
        ctx.fillRect(-tw / 2, -32 * u * (sq ? 0.85 : 1), tw, 64 * u * (sq ? 0.85 : 1));
        ctx.lineWidth = 5 * u;
        ctx.strokeStyle = INK;
        ctx.strokeRect(-tw / 2, -32 * u * (sq ? 0.85 : 1), tw, 64 * u * (sq ? 0.85 : 1));
        ctx.fillStyle = INK;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        fitFont(ctx, txt, tw - 30 * u, (sq ? 46 : 56) * u, BANG);
        ctx.fillText(txt, 0, 3 * u);
        ctx.restore();
      });
      if (main && main.value > 9000) sfxText(ctx, "IT'S OVER 9000!!", cx, cy - (sq ? 330 : 400) * u, (sq ? 84 : 110) * u, -0.06, spring(p01(T, 8.1, 8.6) * 1.3, 10, 5), u, RED);
    }

    // ---------- Scene D: CTA ----------
    if (T >= 9.4) {
      const cy = H * (sq ? 0.33 : 0.34);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, W, H);
      speedLines(ctx, cx, cy, W, H, (sq ? 260 : 300) * u, fr + 21, INK, 160);
      halftone(ctx, 0, H * 0.75, W, H * 0.25, u, 'rgba(232,17,45,0.45)', 'down');
      const lp = spring(p01(T, 9.4, 10.0) * 1.3, 9, 5);
      const r = (sq ? 170 : 220) * u * lp;
      if (r > 1) {
        ctx.save();
        ctx.shadowColor = YEL;
        ctx.shadowBlur = 80 * u;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 24 * u, 0, Math.PI * 2);
        ctx.fillStyle = YEL;
        ctx.fill();
        ctx.restore();
        ctx.lineWidth = 10 * u;
        ctx.strokeStyle = INK;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 24 * u, 0, Math.PI * 2);
        ctx.stroke();
        drawLogo(ctx, d, cx, cy, r, { ring: INK, ringW: 8 * u });
      }
      const word = 'BUY ' + T_ + '!!';
      ctx.font = BANG(200 * u);
      const fs = fitFont(ctx, word, W * 0.88, (sq ? 170 : 210) * u, BANG);
      sfxText(ctx, word, cx, cy + r + (sq ? 130 : 170) * u, fs, -0.05, spring(p01(T, 9.8, 10.4) * 1.3, 9, 5), u, RED);
      const kp = easeOutExpo(p01(T, 10.4, 10.9));
      if (kp > 0) {
        const link = shortLink(d.link, d.address);
        ctx.save();
        ctx.globalAlpha = kp;
        ctx.font = `800 ${34 * u}px "Plus Jakarta Sans"`;
        const lf = fitFont(ctx, link, W * 0.76, 34 * u, (s) => `800 ${s}px "Plus Jakarta Sans"`);
        const bw = ctx.measureText(link).width + 70 * u, bh = lf + 50 * u;
        const by = cy + r + (sq ? 270 : 340) * u;
        ctx.fillStyle = INK;
        ctx.fillRect(cx - bw / 2 + 10 * u, by - bh / 2 + 10 * u, bw, bh);
        ctx.fillStyle = '#fff';
        ctx.fillRect(cx - bw / 2, by - bh / 2, bw, bh);
        ctx.lineWidth = 6 * u;
        ctx.strokeStyle = INK;
        ctx.strokeRect(cx - bw / 2, by - bh / 2, bw, bh);
        ctx.fillStyle = INK;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(link, cx, by + 2 * u);
        ctx.restore();
      }
    }
    ctx.restore(); // shake

    // impact frame: invert everything for a couple of frames
    if (impact) {
      ctx.save();
      ctx.globalCompositeOperation = 'difference';
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    grain(ctx, W, H, t, 0.08, 'multiply');
    // ink progress
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, W * (t / o.duration), 10 * u);
    watermark(ctx, W, H, u, true);
    footer(ctx, W, H, u, 'rgba(18,18,18,0.6)');
    void clamp; void easeInOutQuint; void kinetic;
  },
};
