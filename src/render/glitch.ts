import type { Template, TokenData, RenderOpts } from '../types';
import { seg, easeOutCubic, easeOutBack, rng, pick, statsOf, fitFont, wrapText, drawLogo, shortLink, beat, hash, lerp } from './util';
import { unit, footer, watermark, progressBar, flash } from './common';

const PAL = ['#ffe600', '#ff2e88', '#00e5ff', '#7cff00', '#a259ff', '#ff7a00'];
const MEMES: [string, string][] = [
  ['NOBODY:', '{T} HOLDERS AT 3AM:'],
  ['ME AFTER BUYING {T}', 'BEFORE IT WAS COOL'],
  ['THEY SAID IT\'S JUST A MEME', '{T}: HOLD MY CHART'],
  ['POV:', 'YOU FOUND {T} EARLY'],
  ['MOM CAN WE HAVE {T}?', 'WE HAVE {T} AT HOME'],
];
const ENDS = ['APE IN', 'SEND IT', 'LFG', 'WAGMI'];
const SG = [
  'XXXXXXXXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXXXXXXXX',
  '  XWWXXXXX  XWWXXXXX  ',
  '  XXWWXXXX  XXWWXXXX  ',
  '   XXXXXX    XXXXXX   ',
];

interface Cache { key: string; meme: [string, string]; end: string; pal: string[] }
let cache: Cache | null = null;
function prep(d: TokenData, o: RenderOpts) {
  const key = o.seed + '|' + d.ticker;
  if (cache && cache.key === key) return cache;
  const r = rng(o.seed + 13);
  cache = { key, meme: pick(r, MEMES), end: pick(r, ENDS), pal: [...PAL].sort(() => r() - 0.5) };
  return cache;
}

function memeText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, size: number, u: number, rgb = 0) {
  ctx.font = `${size}px Anton`;
  const lines = wrapText(ctx, text, maxW, 2);
  const lh = size * 1.08;
  lines.forEach((ln, i) => {
    const fs = fitFont(ctx, ln, maxW, size, (s) => `${s}px Anton`);
    ctx.font = `${fs}px Anton`;
    const yy = y + i * lh;
    if (rgb) {
      ctx.fillStyle = 'rgba(255,0,60,0.85)';
      ctx.fillText(ln, x - rgb, yy);
      ctx.fillStyle = 'rgba(0,240,255,0.85)';
      ctx.fillText(ln, x + rgb, yy);
    }
    ctx.lineWidth = Math.max(8, fs * 0.12);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000';
    ctx.strokeText(ln, x, yy);
    ctx.fillStyle = '#fff';
    ctx.fillText(ln, x, yy);
  });
  return lines.length * lh;
}

function glasses(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number) {
  const px = w / SG[0].length;
  SG.forEach((row, ry) => {
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === ' ') continue;
      ctx.fillStyle = ch === 'W' ? '#fff' : '#000';
      ctx.fillRect(cx - w / 2 + i * px, cy + ry * px, px + 0.5, px + 0.5);
    }
  });
}

export const glitch: Template = {
  id: 'glitch',
  name: 'Meme Shake / Glitch',
  blurb: 'Impact captions, RGB split, chaos',
  bpm: 140,
  music: 'trap',
  swatch: ['#ffe600', '#ff2e88', '#00e5ff'],
  draw(ctx, t, d, o) {
    const { W, H } = o;
    const u = unit(W, H);
    const c = prep(d, o);
    const T = (t * 12) / o.duration;
    const { i: bi, ph } = beat(t, o.bpm);
    const T_ = (d.ticker || 'TICKER').toUpperCase();
    const ticker = '$' + T_;
    const sub = (s: string) => s.replace(/\{T\}/g, ticker);
    const frame = Math.floor(t * 30);
    const hit = Math.exp(-ph * 6);

    // background: beat-switching color + rays
    const scene = T < 3.2 ? 0 : T < 6.2 ? 1 : T < 9.3 ? 2 : 3;
    const bg = c.pal[(scene * 2 + (scene === 2 ? 0 : Math.floor(bi / 2))) % c.pal.length];
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2, H * 0.47);
    ctx.rotate(t * (scene % 2 ? -0.5 : 0.5));
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    const R = Math.hypot(W, H);
    for (let k = 0; k < 14; k++) {
      ctx.rotate((Math.PI * 2) / 14);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(R, -R * 0.12);
      ctx.lineTo(R, R * 0.12);
      ctx.fill();
    }
    ctx.restore();
    // halftone
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    const step = 28 * u;
    for (let y = 0; y < H; y += step) {
      for (let x = (Math.floor(y / step) % 2) * step / 2; x < W; x += step) {
        const rr = (y / H) * 6 * u + 1 * u;
        ctx.beginPath();
        ctx.arc(x, y, rr, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // shake
    const amp = (6 + 26 * hit) * u * (scene === 1 && T < 4.6 ? 0.3 : 1);
    ctx.save();
    ctx.translate((hash(frame) - 0.5) * amp, (hash(frame + 99) - 0.5) * amp);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const rgb = (4 + 14 * hit) * u;

    if (scene === 0) {
      const zp = easeOutBack(seg(T, 0.6, 1.0));
      const z = 1 + 0.08 * hit;
      const r = 300 * u * zp * z;
      ctx.save();
      ctx.translate(W / 2, H * 0.5);
      ctx.rotate(Math.sin(t * 9) * 0.06);
      if (r > 1) drawLogo(ctx, d, 0, 0, r, { ring: '#000', ringW: 14 * u });
      ctx.restore();
      const tp = seg(T, 0.1, 0.25);
      if (tp > 0) memeText(ctx, sub(c.meme[0]), W / 2, H * 0.16, W * 0.9, 120 * u, u, rgb);
      if (T > 1.4) {
        const bp = easeOutBack(seg(T, 1.4, 1.65));
        ctx.save();
        ctx.translate(W / 2, H * 0.8);
        ctx.scale(bp, bp);
        memeText(ctx, sub(c.meme[1]), 0, 0, W * 0.9, 120 * u, u, rgb);
        ctx.restore();
      }
    } else if (scene === 1) {
      const r = 300 * u * (1 + 0.04 * hit);
      const cy = H * 0.5;
      drawLogo(ctx, d, W / 2, cy, r, { ring: '#000', ringW: 14 * u });
      // glasses drop
      const gp = easeOutCubic(seg(T, 3.4, 4.6));
      const gy = lerp(-200 * u, cy - r * 0.32, gp);
      glasses(ctx, W / 2, gy, r * 1.9);
      ctx.font = `${100 * u}px Anton`;
      const nm = (d.name || 'TOKEN').toUpperCase();
      memeText(ctx, nm, W / 2, H * 0.16, W * 0.9, 120 * u, u, rgb);
      if (T > 4.6) {
        const sp = easeOutBack(seg(T, 4.6, 4.9));
        ctx.save();
        ctx.translate(W / 2, H * 0.82);
        ctx.scale(sp, sp);
        ctx.rotate(-0.05);
        memeText(ctx, 'DEAL WITH IT', 0, 0, W * 0.9, 150 * u, u, rgb);
        ctx.restore();
      }
    } else if (scene === 2) {
      const stats = statsOf(d).slice(0, 3);
      const lines: string[] = [];
      const target: string[] = [];
      if (stats.length) {
        for (const s of stats) target.push(`${s.label}: ${(s.prefix ?? '') + s.fmt(s.value) + (s.suffix ?? '')}`);
      } else {
        target.push('NUMBER', 'GO', 'UP');
      }
      target.forEach((tx, i) => {
        const st = 6.4 + i * 0.5;
        if (T < st) return;
        const settle = seg(T, st + 0.15, st + 0.75);
        // scramble digits/letters until settled
        let out = '';
        for (let k = 0; k < tx.length; k++) {
          const ch = tx[k];
          const keep = settle >= 1 || k / tx.length < settle || /[\s:$.,%]/.test(ch);
          out += keep ? ch : (/\d/.test(ch) ? String(Math.floor(hash(frame * 31 + k) * 10)) : String.fromCharCode(65 + Math.floor(hash(frame * 17 + k) * 26)));
        }
        lines.push(out);
      });
      // top label
      memeText(ctx, ticker + ' STATS', W / 2, H * 0.14, W * 0.9, 110 * u, u, rgb);
      const lh = Math.min(230 * u, (H * 0.55) / Math.max(3, target.length));
      lines.forEach((ln, i) => {
        const y = H * 0.36 + i * lh;
        const p = easeOutBack(seg(T, 6.4 + i * 0.5, 6.7 + i * 0.5));
        ctx.save();
        ctx.translate(W / 2, y);
        ctx.scale(p, p);
        ctx.rotate((i % 2 ? 1 : -1) * 0.04);
        // sticker box
        ctx.font = `${120 * u}px Anton`;
        const fs = fitFont(ctx, target[i], W * 0.8, (stats.length ? 105 : 190) * u, (s) => `${s}px Anton`);
        const w = ctx.measureText(target[i]).width + 70 * u;
        ctx.fillStyle = '#000';
        ctx.fillRect(-w / 2 + 12 * u, -fs * 0.7 + 12 * u, w, fs * 1.4);
        ctx.fillStyle = '#fff';
        ctx.fillRect(-w / 2, -fs * 0.7, w, fs * 1.4);
        ctx.fillStyle = 'rgba(255,0,60,0.8)';
        ctx.fillText(ln, -rgb * 0.6, 4 * u);
        ctx.fillStyle = 'rgba(0,200,255,0.8)';
        ctx.fillText(ln, rgb * 0.6, 4 * u);
        ctx.fillStyle = '#000';
        ctx.fillText(ln, 0, 4 * u);
        ctx.restore();
      });
      if (d.tagline && T > 8.0) {
        ctx.save();
        ctx.globalAlpha = seg(T, 8.0, 8.2);
        ctx.font = `800 ${44 * u}px Inter`;
        const tl = wrapText(ctx, d.tagline, W * 0.84, 2);
        tl.forEach((ln, i) => {
          ctx.lineWidth = 8 * u;
          ctx.strokeStyle = '#000';
          ctx.strokeText(ln, W / 2, H * 0.84 + i * 58 * u);
          ctx.fillStyle = '#fff';
          ctx.fillText(ln, W / 2, H * 0.84 + i * 58 * u);
        });
        ctx.restore();
      }
    } else {
      // tunnel
      ctx.save();
      for (let k = 0; k < 10; k++) {
        const p = ((k + (t * 1.6) % 1) / 10);
        const s = p * p * Math.max(W, H) * 1.2;
        ctx.strokeStyle = k % 2 ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.45)';
        ctx.lineWidth = 18 * u * p;
        ctx.strokeRect(W / 2 - s / 2, H * 0.45 - s / 2, s, s);
      }
      ctx.restore();
      const p = easeOutBack(seg(T, 9.3, 9.7));
      const sq = W / H > 0.8;
      const ly = H * (sq ? 0.25 : 0.3);
      const r = (sq ? 150 : 220) * u * p * (1 + 0.06 * hit);
      ctx.save();
      ctx.translate(W / 2, ly);
      ctx.rotate((T - 9.3) * 3);
      if (r > 1) drawLogo(ctx, d, 0, 0, r, { ring: '#000', ringW: 12 * u });
      ctx.restore();
      if (r > 1) glasses(ctx, W / 2, ly - r * 0.3, r * 1.9);
      const ep = easeOutBack(seg(T, 9.6, 9.9));
      ctx.save();
      ctx.translate(W / 2, H * (sq ? 0.55 : 0.57));
      ctx.scale(ep * (1 + 0.05 * hit), ep * (1 + 0.05 * hit));
      ctx.rotate(-0.06);
      memeText(ctx, c.end, 0, 0, W * 0.9, (sq ? 170 : 210) * u, u, rgb * 1.5);
      ctx.restore();
      const tp = easeOutBack(seg(T, 9.9, 10.2));
      ctx.save();
      ctx.translate(W / 2, H * (sq ? 0.7 : 0.68));
      ctx.scale(tp, tp);
      memeText(ctx, ticker, 0, 0, W * 0.9, 150 * u, u, rgb);
      ctx.restore();
      const lp = seg(T, 10.3, 10.5);
      if (lp > 0) {
        ctx.save();
        ctx.globalAlpha = lp;
        const link = shortLink(d.link, d.address);
        const fs = fitFont(ctx, link, W * 0.84, 42 * u, (s) => `800 ${s}px Inter`);
        const w = ctx.measureText(link).width + 60 * u;
        ctx.fillStyle = '#000';
        ctx.fillRect(W / 2 - w / 2, H * (sq ? 0.84 : 0.79) - fs, w, fs * 2);
        ctx.fillStyle = '#fff';
        ctx.fillText(link, W / 2, H * (sq ? 0.84 : 0.79) + 2 * u);
        ctx.restore();
      }
    }
    ctx.restore(); // shake

    // glitch slices on beats / cuts
    const cut = [3.2, 6.2, 9.3].some((s) => T >= s && T < s + 0.2);
    if ((ph < 0.12 && hash(bi) > 0.35) || cut) {
      const n = 3 + Math.floor(hash(frame + 5) * 5);
      for (let k = 0; k < n; k++) {
        const sh = (20 + hash(frame * 3 + k) * 120) * u;
        const sy = hash(frame * 7 + k) * (H - sh);
        const dx = (hash(frame * 11 + k) - 0.5) * 160 * u;
        ctx.drawImage(ctx.canvas, 0, sy, W, sh, dx, sy, W, sh);
      }
    }
    // scanlines
    ctx.fillStyle = 'rgba(0,0,0,0.07)';
    for (let y = 0; y < H; y += 6 * u) ctx.fillRect(0, y, W, 2 * u);
    for (const s of [3.2, 6.2, 9.3]) {
      const dt = T - s;
      if (dt >= 0 && dt < 0.18) flash(ctx, W, H, 0.85 * (1 - dt / 0.18));
    }

    progressBar(ctx, W, u, t / o.duration, '#000', 'rgba(0,0,0,0.15)');
    watermark(ctx, W, H, u, true);
    footer(ctx, W, H, u, 'rgba(0,0,0,0.6)');
  },
};
