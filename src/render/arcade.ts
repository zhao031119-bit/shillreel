import type { Template, TokenData, RenderOpts } from '../types';
import { seg, easeOutCubic, easeOutBack, rng, pick, statsOf, statText, fitFont, drawLogo, shortLink, memo, beat, hash } from './util';
import { unit, footer, watermark } from './common';

const PF = (s: number) => `${s}px "Press Start 2P"`;
const SKY = '#1b1240';
const RAINBOW = ['#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#ff77a8'];

interface Low { cv: HTMLCanvasElement; ctx: CanvasRenderingContext2D; lw: number; lh: number; px: number }
const lows = memo<Low>(4);
const lowFor = (W: number, H: number, u: number): Low =>
  lows(W + 'x' + H, () => {
    const px = Math.max(1, Math.round(8 * u));
    const lw = Math.ceil(W / px), lh = Math.ceil(H / px);
    const cv = document.createElement('canvas');
    cv.width = lw;
    cv.height = lh;
    const ctx = cv.getContext('2d')!;
    return { cv, ctx, lw, lh, px };
  });

const cache = memo<{ stars: [number, number, number][]; blocks: number[]; lvl: number; end: string }>();
function prep(d: TokenData, o: RenderOpts) {
  return cache(o.seed + '|' + d.ticker, () => {
    const r = rng(o.seed + 5);
    const stars = Array.from({ length: 70 }, () => [r(), r() * 0.7, r()] as [number, number, number]);
    const blocks = Array.from({ length: 40 }, () => (r() < 0.3 ? 1 + Math.floor(r() * 2) : 0));
    return { stars, blocks, lvl: 1 + Math.floor(r() * 8), end: pick(r, ['CONTINUE?', 'PLAYER 2?', 'NEW GAME+', 'GAME ON']) };
  });
}

function shadowText(ctx: CanvasRenderingContext2D, txt: string, x: number, y: number, size: number, col: string, off: number) {
  ctx.font = PF(size);
  ctx.fillStyle = '#000';
  ctx.fillText(txt, x + off, y + off);
  ctx.fillStyle = col;
  ctx.fillText(txt, x, y);
}

export const arcade: Template = {
  id: 'arcade',
  name: 'Retro Arcade',
  blurb: '8-bit pixels, CRT, high score',
  bpm: 150,
  music: 'chip',
  swatch: [SKY, '#ffec27', '#ff004d'],
  thumbT: 4.5,
  draw(ctx, t, d, o) {
    const { W, H } = o;
    const u = unit(W, H);
    const sq = W / H > 0.8;
    const c = prep(d, o);
    const T = (t * 12) / o.duration;
    const { i: bi } = beat(t, o.bpm);
    const T_ = '$' + (d.ticker || 'TICKER').toUpperCase();
    const stats = statsOf(d);
    const L = lowFor(W, H, u);
    const g = L.ctx;
    const { lw, lh } = L;
    const groundY = Math.floor(lh * (sq ? 0.8 : 0.79));

    // ---- low-res world ----
    g.imageSmoothingEnabled = false;
    g.fillStyle = SKY;
    g.fillRect(0, 0, lw, lh);
    // sky bands
    const bands = ['#241a5c', '#2f2172', '#3b2a87', '#4a349c'];
    bands.forEach((col, i) => {
      g.fillStyle = col;
      g.fillRect(0, Math.floor(groundY - (bands.length - i) * lh * 0.06), lw, Math.ceil(lh * 0.06));
    });
    for (const [sx, sy, sp] of c.stars) {
      const tw = Math.sin(t * 4 + sp * 20) > 0.3 ? '#fff' : '#8a7fd6';
      g.fillStyle = tw;
      g.fillRect(Math.floor(((sx * lw - t * sp * 4) % lw + lw) % lw), Math.floor(sy * groundY), 1, 1);
    }
    // moon
    g.fillStyle = '#ffec27';
    g.beginPath();
    g.arc(Math.floor(lw * 0.8), Math.floor(lh * 0.16), Math.floor(lw * 0.06), 0, Math.PI * 2);
    g.fill();
    // clouds
    for (let k = 0; k < 4; k++) {
      const cx = Math.floor(((k * 47 + 13 - t * (2 + k)) % (lw + 40) + lw + 40) % (lw + 40)) - 20;
      const cy = Math.floor(lh * (0.25 + k * 0.09));
      g.fillStyle = '#5d4fb8';
      g.fillRect(cx, cy, 18, 4);
      g.fillRect(cx + 3, cy - 3, 9, 3);
      g.fillRect(cx + 9, cy - 5, 6, 3);
      g.fillStyle = '#7b6cd6';
      g.fillRect(cx + 1, cy - 1, 15, 2);
    }
    // mountains
    g.fillStyle = '#5b3fb0';
    for (let x = 0; x < lw; x++) {
      const h = Math.floor(lh * 0.08 + Math.abs(((x + t * 3) % 40) - 20) * 0.9);
      g.fillRect(x, groundY - h, 1, h);
    }
    // ground scroll
    const scroll = T >= 2.4 && T < 6.2 ? (T - 2.4) * 22 : T >= 6.2 ? 3.8 * 22 : 0;
    const tile = 8;
    for (let x = -tile; x < lw + tile; x += tile) {
      const wx = Math.floor(x - (scroll % tile));
      g.fillStyle = '#00a83a';
      g.fillRect(wx, groundY, tile, 2);
      g.fillStyle = '#b5532f';
      g.fillRect(wx, groundY + 2, tile, lh - groundY);
      g.fillStyle = '#7a3420';
      g.fillRect(wx, groundY + 5, tile, 1);
      g.fillRect(wx + ((Math.floor((x + scroll) / tile) % 2) ? 0 : 4), groundY + 2, 1, 3);
    }
    // blocks + coins in the air
    const bs = 8;
    for (let k = 0; k < c.blocks.length; k++) {
      if (!c.blocks[k]) continue;
      const bx = Math.floor(k * 14 + 30 - scroll);
      if (bx < -bs || bx > lw) continue;
      const by = groundY - 26 - (c.blocks[k] === 2 ? 10 : 0);
      g.fillStyle = '#ffa300';
      g.fillRect(bx, by, bs, bs);
      g.fillStyle = '#ffec27';
      g.fillRect(bx + 1, by + 1, bs - 3, 1);
      g.fillStyle = '#000';
      g.fillRect(bx + 3, by + 2, 2, 1);
      g.fillRect(bx + 4, by + 3, 1, 2);
      g.fillRect(bx + 4, by + 6, 1, 1);
      // spinning coin above
      const cw = Math.max(1, Math.round(3 * Math.abs(Math.cos(t * 6 + k))));
      g.fillStyle = '#ffec27';
      g.fillRect(bx + 4 - cw, by - 8, cw * 2, 5);
    }
    // hero: the token as a coin character
    let heroX = Math.floor(lw * 0.3), heroY = groundY;
    const hr = Math.floor(lw * (sq ? 0.08 : 0.13));
    if (T >= 2.4 && T < 6.2) {
      const jph = ((T - 2.4) * 1.6) % 1;
      heroY = groundY - Math.floor(Math.sin(jph * Math.PI) * lh * 0.12);
    } else if (T < 2.4) {
      heroX = Math.floor(lw * 0.5);
    } else heroX = Math.floor(lw * 0.5);
    const showHero = !(T >= 6.2 && T < 9.4);
    if (showHero && T > 1.2) {
      const pp = easeOutBack(seg(T, 1.2, 1.6));
      const r = Math.max(1, Math.floor(hr * pp));
      drawLogo(g, d, heroX, heroY - r - 1, r, { ring: '#000', ringW: 1.5 });
      // feet
      const step = Math.floor(t * 8) % 2;
      g.fillStyle = '#000';
      g.fillRect(heroX - Math.floor(r * 0.5) - (step ? 1 : 0), heroY - 2, 3, 2);
      g.fillRect(heroX + Math.floor(r * 0.5) - 2 + (step ? 1 : 0), heroY - 2, 3, 2);
      // +1 pops
      if (T >= 2.4 && T < 6.2 && ((T - 2.4) * 1.6) % 1 < 0.5) {
        g.fillStyle = '#ffec27';
        const yy = heroY - r * 2 - 8 - Math.floor((((T - 2.4) * 1.6) % 1) * 20);
        g.fillRect(heroX - 1, yy, 3, 1);
        g.fillRect(heroX, yy - 1, 1, 3);
      }
    }
    // blit pixel world
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(L.cv, 0, 0, lw * L.px, lh * L.px);
    ctx.restore();

    // ---- crisp HUD + text ----
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    const hs = 30 * u;
    const hudY = 110 * u;
    const scoreTarget = stats.find((s) => s.label === 'HOLDERS')?.value ?? stats[0]?.value ?? 133700;
    const sp = easeOutCubic(seg(T, 2.4, 6.0));
    const score = String(Math.floor(Math.min(scoreTarget, 99999999) * sp)).padStart(8, '0');
    shadowText(ctx, '1UP', 50 * u, hudY, hs, '#ff004d', 4 * u);
    shadowText(ctx, score, 50 * u, hudY + 46 * u, hs, '#fff', 4 * u);
    ctx.textAlign = 'right';
    shadowText(ctx, 'LEVEL', W - 50 * u, hudY, hs, '#29adff', 4 * u);
    const lvl = T >= 6.2 ? c.lvl + 1 : c.lvl;
    shadowText(ctx, String(lvl).padStart(2, '0'), W - 50 * u, hudY + 46 * u, hs, '#fff', 4 * u);
    ctx.textAlign = 'center';
    shadowText(ctx, T_.length > 9 ? T_.slice(0, 9) : T_, W / 2, hudY, hs, '#ffec27', 4 * u);
    shadowText(ctx, 'x' + String(Math.floor(sp * 99)).padStart(2, '0'), W / 2, hudY + 46 * u, hs, '#fff', 4 * u);

    ctx.textBaseline = 'middle';
    const midY = sq ? H * 0.38 : H * 0.34;
    if (T < 2.4) {
      const blink = Math.floor(t * 3) % 2 === 0;
      if (T < 1.0) {
        if (blink) shadowText(ctx, 'INSERT COIN', W / 2, midY, 56 * u, '#fff', 6 * u);
      } else {
        const title = (d.name || 'TOKEN').toUpperCase();
        const fs = fitFont(ctx, title, W * 0.88, 64 * u, PF);
        shadowText(ctx, title, W / 2, midY - 70 * u, fs, RAINBOW[bi % RAINBOW.length], 6 * u);
        if (blink) shadowText(ctx, 'PRESS START', W / 2, midY + 50 * u, 40 * u, '#fff', 5 * u);
      }
    } else if (T < 6.2) {
      const p = easeOutBack(seg(T, 2.4, 2.8));
      ctx.save();
      ctx.translate(W / 2, midY);
      ctx.scale(p, p);
      const txt = 'PLAYER 1: ' + T_;
      const fs = fitFont(ctx, txt, W * 0.88, 50 * u, PF);
      shadowText(ctx, txt, 0, -40 * u, fs, '#ffec27', 5 * u);
      if (d.tagline) {
        ctx.font = PF(24 * u);
        const words = d.tagline.toUpperCase();
        const shown = words.slice(0, Math.floor(words.length * seg(T, 2.9, 5.0)));
        // two-line pixel dialog box
        const bw = W * 0.86, bh = 150 * u;
        ctx.fillStyle = '#000';
        ctx.fillRect(-bw / 2, 20 * u, bw, bh);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 6 * u;
        ctx.strokeRect(-bw / 2 + 6 * u, 26 * u, bw - 12 * u, bh - 12 * u);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#fff';
        const per = Math.floor((bw - 80 * u) / ctx.measureText('M').width);
        const l1 = shown.slice(0, per), l2 = shown.slice(per, per * 2 - 1) + (shown.length > per * 2 - 1 ? '…' : '');
        ctx.fillText(l1, -bw / 2 + 40 * u, 20 * u + bh * 0.36);
        ctx.fillText(l2, -bw / 2 + 40 * u, 20 * u + bh * 0.68);
        ctx.textAlign = 'center';
      }
      ctx.restore();
    } else if (T < 9.4) {
      // LEVEL UP + high-score table
      const lp = easeOutBack(seg(T, 6.2, 6.6));
      ctx.save();
      ctx.translate(W / 2, (sq ? 0.27 : 0.27) * H);
      ctx.scale(lp, lp);
      const word = 'LEVEL UP!';
      ctx.font = PF(84 * u);
      fitFont(ctx, word, W * 0.9, 84 * u, PF);
      const ww = ctx.measureText(word).width;
      let x = -ww / 2;
      ctx.textAlign = 'left';
      for (let k = 0; k < word.length; k++) {
        const ch = word[k];
        const yy = Math.sin(t * 10 + k * 0.6) * 14 * u;
        ctx.fillStyle = '#000';
        ctx.fillText(ch, x + 7 * u, yy + 7 * u);
        ctx.fillStyle = RAINBOW[(k + bi) % RAINBOW.length];
        ctx.fillText(ch, x, yy);
        x += ctx.measureText(ch).width;
      }
      ctx.restore();
      const rows = stats.length ? stats.slice(0, 4).map((s) => [s.label === 'MARKET CAP' ? 'MCAP' : s.label, s] as const) : ([['VIBES', 'MAX'], ['RISK', '???'], ['FUN', '100%']] as const);
      const top = H * (sq ? 0.4 : 0.38);
      const rh = Math.min(110 * u, (groundY * L.px - top - 40 * u) / rows.length);
      const tw = W * 0.84;
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(W * 0.08, top - 30 * u, tw, rh * rows.length + 60 * u);
      rows.forEach((r, k) => {
        const p = seg(T, 6.6 + k * 0.3, 6.7 + k * 0.3);
        if (p <= 0) return;
        const y = top + rh * (k + 0.5);
        const rank = ['1ST', '2ND', '3RD', '4TH'][k];
        const val = typeof r[1] === 'string' ? r[1] : statText(r[1], easeOutCubic(seg(T, 6.7 + k * 0.3, 7.6 + k * 0.3)));
        const col = RAINBOW[(k * 2 + Math.floor(t * 4)) % RAINBOW.length];
        ctx.textAlign = 'left';
        const fs = Math.min(30 * u, rh * 0.4);
        shadowText(ctx, rank, W * 0.12, y, fs, col, 3 * u);
        shadowText(ctx, r[0], W * 0.12 + 140 * u * (fs / (30 * u)), y, fs, '#fff', 3 * u);
        ctx.textAlign = 'right';
        const vf = fitFont(ctx, val, W * 0.4, fs, PF);
        shadowText(ctx, val, W * 0.88, y, vf, '#ffec27', 3 * u);
      });
      ctx.textAlign = 'center';
    } else {
      const p = easeOutBack(seg(T, 9.4, 9.8));
      ctx.save();
      ctx.translate(W / 2, H * (sq ? 0.27 : 0.26));
      ctx.scale(p, p);
      shadowText(ctx, c.end, 0, 0, 64 * u, '#fff', 6 * u);
      const n = Math.max(0, 9 - Math.floor((T - 9.4) * 3));
      shadowText(ctx, String(n), 0, 120 * u, 90 * u, '#ff004d', 7 * u);
      ctx.restore();
      const bp = seg(T, 10.0, 10.1);
      if (bp > 0) {
        const txt = '> BUY ' + T_ + ' <';
        const fs = fitFont(ctx, txt, W * 0.86, 52 * u, PF);
        const blink = Math.floor(t * 4) % 2 === 0;
        shadowText(ctx, txt, W / 2, H * (sq ? 0.5 : 0.45), fs, blink ? '#ffec27' : '#fff', 5 * u);
        const link = shortLink(d.link, d.address).toUpperCase();
        const lf = fitFont(ctx, link, W * 0.9, 22 * u, PF);
        shadowText(ctx, link, W / 2, H * (sq ? 0.59 : 0.52), lf, '#29adff', 3 * u);
      }
    }

    // ---- CRT ----
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    for (let y = 0; y < H; y += 4 * u) ctx.fillRect(0, y, W, 2 * u);
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.6);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
    if (hash(Math.floor(t * 30)) > 0.93) {
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(0, 0, W, H);
    }
    // pixel progress bar
    const pw = W - 80 * u;
    ctx.fillStyle = '#000';
    ctx.fillRect(40 * u, 22 * u, pw, 14 * u);
    ctx.fillStyle = '#ffec27';
    ctx.fillRect(40 * u, 22 * u, Math.floor((pw * (t / o.duration)) / (14 * u)) * 14 * u, 14 * u);
    watermark(ctx, W, H, u);
    footer(ctx, W, H, u, 'rgba(255,255,255,0.7)');
  },
};
