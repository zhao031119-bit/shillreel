import type { Template, TokenData, RenderOpts } from '../types';
import { rng, pick, statsOf, statText, fitFont, wrapText, roundRect, drawLogo, shortLink, memo, beat, hash, lerp, fitWrap } from './util';
import { unit, footer, watermark } from './common';
import { easeOutExpo, easeInOutQuint, spring, p01, grain, blob, tiltLogo } from './fx';

const AW = (s: number) => `${s}px Audiowide`;
const SCRIPT = (s: number) => `${s}px "Mr Dafoe"`;
const PINK = '#ff3ec8';
const CYAN = '#3ef3ff';
const INTROS = ['PRESENTING', 'NOW PLAYING', 'SIDE A', 'AESTHETIC MODE'];
const CTAS = ['BUY', 'GET', 'RIDE', 'HODL'];

const cache = memo<{ stars: [number, number, number][]; intro: string; cta: string }>();
function prep(d: TokenData, o: RenderOpts) {
  return cache(o.seed + '|' + d.ticker, () => {
    const r = rng(o.seed + 1984);
    return { stars: Array.from({ length: 90 }, () => [r(), r(), r()] as [number, number, number]), intro: pick(r, INTROS), cta: pick(r, CTAS) };
  });
}

function chromeText(ctx: CanvasRenderingContext2D, txt: string, x: number, y: number, size: number, t: number, u: number) {
  ctx.save();
  ctx.font = AW(size);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const top = y - size * 0.5, bot = y + size * 0.5;
  // deep shadow / extrusion
  for (let k = 8; k >= 1; k--) {
    ctx.fillStyle = k === 1 ? '#2a0a4a' : `rgba(40,0,70,${0.5})`;
    ctx.fillText(txt, x + k * 1.2 * u, y + k * 2 * u);
  }
  const g = ctx.createLinearGradient(0, top, 0, bot);
  g.addColorStop(0, '#d6f4ff');
  g.addColorStop(0.42, '#ffffff');
  g.addColorStop(0.5, '#1d1446');
  g.addColorStop(0.56, '#8a3d7a');
  g.addColorStop(0.8, '#ff9ad1');
  g.addColorStop(1, '#fff1fb');
  ctx.fillStyle = g;
  ctx.fillText(txt, x, y);
  ctx.lineWidth = Math.max(1, size * 0.02);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.strokeText(txt, x, y);
  // shine sweep
  const w = ctx.measureText(txt).width;
  const sx = x - w / 2 + ((t * 0.6) % 1.6) * w * 1.25 - w * 0.2;
  const sh = ctx.createLinearGradient(sx - size * 0.5, top, sx + size * 0.5, bot);
  sh.addColorStop(0, 'rgba(255,255,255,0)');
  sh.addColorStop(0.5, 'rgba(255,255,255,0.85)');
  sh.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = sh;
  ctx.fillText(txt, x, y);
  ctx.restore();
}

function neon(ctx: CanvasRenderingContext2D, txt: string, x: number, y: number, font: string, color: string, u: number, flicker = 1) {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = color;
  ctx.globalAlpha *= flicker;
  ctx.shadowBlur = 40 * u;
  ctx.fillStyle = color;
  ctx.fillText(txt, x, y);
  ctx.shadowBlur = 12 * u;
  ctx.fillStyle = '#fff3fd';
  ctx.fillText(txt, x, y);
  ctx.restore();
}

function palm(ctx: CanvasRenderingContext2D, x: number, base: number, h: number, lean: number, sway: number, u: number) {
  ctx.save();
  ctx.fillStyle = '#16002b';
  ctx.strokeStyle = '#16002b';
  const tx = x + lean * h, ty = base - h;
  ctx.lineWidth = 22 * u;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.quadraticCurveTo(x + lean * h * 0.2, base - h * 0.6, tx, ty);
  ctx.stroke();
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.5 + sway * 0.1;
    const len = h * (0.42 + 0.06 * Math.sin(i * 2.3));
    const ex = tx + Math.cos(a) * len * 1.2, ey = ty + Math.sin(a) * len * 0.55 + len * 0.45;
    const mx = tx + Math.cos(a) * len * 0.6, my = ty + Math.sin(a) * len * 0.6 - 20 * u;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(mx, my - 18 * u, ex, ey);
    ctx.quadraticCurveTo(mx, my + 18 * u, tx, ty);
    ctx.fill();
  }
  ctx.restore();
}

let scan: { u: number; p: CanvasPattern } | null = null;
function scanPattern(ctx: CanvasRenderingContext2D, u: number) {
  if (scan && scan.u === u) return scan.p;
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = Math.max(2, Math.round(4 * u));
  const x = c.getContext('2d')!;
  x.fillStyle = 'rgba(0,0,0,0.12)';
  x.fillRect(0, 0, 4, Math.max(1, Math.round(1.5 * u)));
  scan = { u, p: ctx.createPattern(c, 'repeat')! };
  return scan.p;
}

export const vapor: Template = {
  id: 'vapor',
  name: 'Vaporwave Sunset',
  blurb: 'Neon sun, chrome text, palms, VHS',
  bpm: 100,
  music: 'vapor',
  swatch: ['#2a0050', PINK, '#ff9e3d'],
  thumbT: 4.4,
  draw(ctx, t, d, o) {
    const { W, H } = o;
    const u = unit(W, H);
    const sq = W / H > 0.8;
    const c = prep(d, o);
    const T = (t * 12) / o.duration;
    const { ph } = beat(t, o.bpm);
    const T_ = '$' + (d.ticker || 'TICKER').toUpperCase();
    const name = d.name || 'Your Token';
    const stats = statsOf(d).slice(0, sq ? 3 : 4);
    const cx = W / 2;

    const hz = lerp(H * 0.9, H * (sq ? 0.66 : 0.64), easeInOutQuint(p01(T, 0, 2.6)));
    // sky
    const sky = ctx.createLinearGradient(0, 0, 0, hz);
    sky.addColorStop(0, '#0d0024');
    sky.addColorStop(0.45, '#3a0a63');
    sky.addColorStop(0.8, '#b0247e');
    sky.addColorStop(1, '#ff7a59');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, hz + 2);
    for (const [sx, sy, z] of c.stars) {
      const y = sy * hz * 0.7;
      ctx.fillStyle = `rgba(255,230,255,${0.3 + 0.5 * z * (0.6 + 0.4 * Math.sin(t * 3 + sx * 40))})`;
      ctx.fillRect(sx * W, y, 2.5 * u * z + 1, 2.5 * u * z + 1);
    }
    // sun
    const sr = (sq ? 230 : 300) * u;
    const sy = hz - sr * 0.42 + (1 - easeOutExpo(p01(T, 0.3, 3.0))) * sr * 0.8;
    blob(ctx, cx, sy, sr * 2.2, 'rgba(255,60,170,0.45)');
    ctx.save();
    ctx.beginPath();
    // stripes cut into lower half
    let yy = sy - sr;
    const stripeStart = sy - sr * 0.5;
    ctx.rect(0, sy - sr - 2, W, stripeStart - (sy - sr - 2));
    let k = 0;
    yy = stripeStart;
    const scroll = (t * 14 * u) % (34 * u);
    while (yy < sy + sr) {
      const gap = (5 + k * 4) * u;
      const band = 34 * u - k * 2.4 * u;
      ctx.rect(0, yy + scroll * 0, W, Math.max(4 * u, band));
      yy += Math.max(4 * u, band) + gap;
      k++;
    }
    ctx.clip();
    const sg = ctx.createLinearGradient(0, sy - sr, 0, sy + sr);
    sg.addColorStop(0, '#fff27a');
    sg.addColorStop(0.45, '#ffb347');
    sg.addColorStop(0.75, '#ff4f9a');
    sg.addColorStop(1, '#c2189b');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(cx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // mountains (parallax)
    const mtn = (amp: number, seed: number, col: string, line: string, off: number) => {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, hz);
      const n = 14;
      for (let i = 0; i <= n; i++) {
        const x = (i / n) * W;
        const h = amp * (0.35 + 0.65 * Math.abs(Math.sin(i * 1.7 + seed))) * (i % 2 ? 0.55 : 1);
        ctx.lineTo(x + off, hz - h);
      }
      ctx.lineTo(W, hz);
      ctx.closePath();
      ctx.fillStyle = col;
      ctx.fill();
      ctx.strokeStyle = line;
      ctx.lineWidth = 2.5 * u;
      ctx.shadowColor = line;
      ctx.shadowBlur = 12 * u;
      ctx.stroke();
      ctx.restore();
    };
    mtn(150 * u, 1, '#24004a', 'rgba(255,62,200,0.7)', Math.sin(t * 0.2) * 10 * u);
    mtn(90 * u, 4, '#16002f', 'rgba(62,243,255,0.6)', Math.sin(t * 0.3) * 20 * u);
    // grid floor
    const fl = ctx.createLinearGradient(0, hz, 0, H);
    fl.addColorStop(0, '#2b0050');
    fl.addColorStop(1, '#07000f');
    ctx.fillStyle = fl;
    ctx.fillRect(0, hz, W, H - hz);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, hz, W, H - hz);
    ctx.clip();
    ctx.strokeStyle = 'rgba(255,62,200,0.85)';
    ctx.shadowColor = PINK;
    ctx.shadowBlur = 14 * u;
    ctx.lineWidth = 3 * u;
    ctx.beginPath();
    for (let i = -16; i <= 16; i++) {
      ctx.moveTo(cx + i * 30 * u, hz);
      ctx.lineTo(cx + i * 300 * u, H + 200 * u);
    }
    const spd = t * 0.9;
    for (let i = 0; i < 14; i++) {
      const z = ((i + (spd % 1)) / 14);
      if (z < 0.06) continue;
      const y = hz + (H - hz) * z * z * 1.1;
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.stroke();
    ctx.restore();
    blob(ctx, cx, hz, W * 0.9, 'rgba(255,90,170,0.35)');
    // palms
    const sway = Math.sin(t * 1.2);
    palm(ctx, -20 * u, hz + 60 * u, (sq ? 420 : 560) * u, 0.18, sway, u);
    palm(ctx, W + 30 * u, hz + 90 * u, (sq ? 360 : 480) * u, -0.22, -sway, u);

    // ---------- content ----------
    const topY = sq ? H * 0.22 : H * 0.24;
    if (T < 3.2) {
      const out = easeInOutQuint(p01(T, 2.8, 3.2));
      ctx.save();
      ctx.globalAlpha = 1 - out;
      const ip = easeOutExpo(p01(T, 0.3, 1.2));
      ctx.globalAlpha *= ip;
      ctx.font = AW(30 * u);
      ctx.fillStyle = CYAN;
      ctx.textAlign = 'center';
      ctx.shadowColor = CYAN;
      ctx.shadowBlur = 20 * u;
      ctx.fillText(c.intro.split('').join(String.fromCharCode(8202)), cx, topY - (sq ? 165 : 190) * u);
      ctx.restore();
      // script write-on
      ctx.save();
      ctx.globalAlpha = 1 - out;
      const wp = easeInOutQuint(p01(T, 0.7, 2.2));
      const fw = fitWrap(ctx, name, W * 0.84, 2, (sq ? 150 : 180) * u, 50 * u, SCRIPT);
      const lines = fw.lines;
      const fs = fw.size;
      ctx.beginPath();
      ctx.rect(0, 0, W * wp * 1.05, H);
      ctx.clip();
      lines.forEach((ln, i) => {
        const f = fs;
        neon(ctx, ln, cx, topY + (i - (lines.length - 1) / 2) * fs * 0.95, SCRIPT(f), PINK, u, 0.92 + 0.08 * Math.sin(t * 40));
      });
      ctx.restore();
    }
    if (T >= 3.0 && T < 6.5) {
      const out = easeInOutQuint(p01(T, 6.1, 6.5));
      const p = easeOutExpo(p01(T, 3.0, 3.6));
      ctx.save();
      ctx.globalAlpha = Math.min(1, p * 2) * (1 - out);
      ctx.translate(cx, topY);
      const sc = lerp(1.5, 1, p);
      ctx.scale(sc, sc);
      const fs = fitFont(ctx, T_, W * 0.86, (sq ? 170 : 200) * u, AW);
      chromeText(ctx, T_, 0, 0, fs, t, u);
      ctx.restore();
      // logo in front of sun
      const lp = spring(p01(T, 3.4, 4.3) * 1.3, 7, 4.5);
      const lr = sr * 0.62 * lp;
      if (lr > 1) {
        ctx.save();
        ctx.globalAlpha = 1 - out;
        tiltLogo(ctx, (r) => {
          const rg = ctx.createLinearGradient(0, -r, 0, r);
          rg.addColorStop(0, '#ffffff');
          rg.addColorStop(0.5, '#9aa0c8');
          rg.addColorStop(1, '#ffffff');
          ctx.beginPath();
          ctx.arc(0, 0, r * 1.1, 0, Math.PI * 2);
          ctx.fillStyle = rg;
          ctx.fill();
          drawLogo(ctx, d, 0, 0, r, {});
        }, cx, sy, lr, t, { glow: PINK, glowBlur: 50 * u, shadow: false });
        ctx.restore();
      }
      if (d.tagline) {
        ctx.save();
        ctx.globalAlpha = easeOutExpo(p01(T, 4.0, 4.6)) * (1 - out);
        ctx.font = `600 ${(sq ? 30 : 38) * u}px "Plus Jakarta Sans"`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffe9fb';
        ctx.shadowColor = PINK;
        ctx.shadowBlur = 16 * u;
        const tl = wrapText(ctx, d.tagline, W * 0.78, 2);
        tl.forEach((ln, i) => ctx.fillText(ln, cx, topY + (sq ? 120 : 160) * u + i * (sq ? 40 : 52) * u));
        ctx.restore();
      }
    }
    if (T >= 6.3 && T < 9.6) {
      const out = easeInOutQuint(p01(T, 9.2, 9.6));
      const rows: [string, string][] = stats.length
        ? stats.map((s, i) => [s.label === 'MARKET CAP' ? 'MCAP' : s.label, statText(s, easeOutExpo(p01(T, 6.6 + i * 0.2, 8.0 + i * 0.2)))])
        : [['MOOD', 'AESTHETIC'], ['ERA', '1986'], ['VIBES', '100%']];
      const bh = (sq ? 84 : 120) * u, gap = (sq ? 16 : 26) * u;
      const top = (sq ? 140 : 220) * u;
      const bw = W * 0.8;
      rows.forEach(([l, v], i) => {
        const p = easeOutExpo(p01(T, 6.4 + i * 0.18, 7.1 + i * 0.18));
        const y = top + i * (bh + gap);
        const x = cx - bw / 2 + (i % 2 ? 1 : -1) * (1 - p) * W;
        const col = i % 2 ? CYAN : PINK;
        ctx.save();
        ctx.globalAlpha = (1 - out) * Math.min(1, p * 2);
        roundRect(ctx, x, y, bw, bh, 18 * u);
        ctx.fillStyle = 'rgba(20,0,40,0.62)';
        ctx.fill();
        ctx.shadowColor = col;
        ctx.shadowBlur = 24 * u;
        ctx.lineWidth = 4 * u;
        ctx.strokeStyle = col;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.font = AW((sq ? 24 : 30) * u);
        ctx.fillStyle = col;
        ctx.fillText(l, x + 36 * u, y + bh / 2);
        ctx.textAlign = 'right';
        fitFont(ctx, v, bw * 0.6, (sq ? 50 : 64) * u, AW);
        ctx.fillStyle = '#fff';
        ctx.shadowColor = col;
        ctx.shadowBlur = 14 * u;
        ctx.fillText(v, x + bw - 36 * u, y + bh / 2 + 3 * u);
        ctx.restore();
      });
    }
    if (T >= 9.4) {
      const lp = spring(p01(T, 9.4, 10.2) * 1.3, 7, 4.5);
      const lr = sr * 0.62 * lp;
      if (lr > 1) {
        tiltLogo(ctx, (r) => {
          ctx.beginPath();
          ctx.arc(0, 0, r * 1.1, 0, Math.PI * 2);
          ctx.fillStyle = '#e8e9ff';
          ctx.fill();
          drawLogo(ctx, d, 0, 0, r, {});
        }, cx, sy, lr, t, { glow: PINK, glowBlur: 60 * u, shadow: false });
      }
      const p = easeOutExpo(p01(T, 9.6, 10.2));
      ctx.save();
      ctx.globalAlpha = Math.min(1, p * 2);
      ctx.translate(cx, topY - (sq ? 40 : 60) * u);
      ctx.scale(lerp(1.4, 1, p), lerp(1.4, 1, p));
      const word = c.cta + ' ' + T_;
      const fs = fitFont(ctx, word, W * 0.88, (sq ? 130 : 150) * u, AW);
      chromeText(ctx, word, 0, 0, fs, t, u);
      ctx.restore();
      const sp = easeInOutQuint(p01(T, 10.0, 10.9));
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W * sp * 1.05, H);
      ctx.clip();
      neon(ctx, 'on vibe/vibe', cx, topY + (sq ? 80 : 110) * u, SCRIPT((sq ? 90 : 110) * u), PINK, u);
      ctx.restore();
      const kp = easeOutExpo(p01(T, 10.6, 11.2));
      if (kp > 0) {
        const link = shortLink(d.link, d.address);
        ctx.save();
        ctx.globalAlpha = kp;
        const lf = fitFont(ctx, link, W * 0.74, 30 * u, (s) => `700 ${s}px "Plus Jakarta Sans"`);
        const bw = ctx.measureText(link).width + 70 * u, bh = lf + 46 * u;
        const by = topY + (sq ? 190 : 250) * u;
        roundRect(ctx, cx - bw / 2, by - bh / 2, bw, bh, bh / 2);
        ctx.fillStyle = 'rgba(10,0,30,0.7)';
        ctx.fill();
        ctx.shadowColor = CYAN;
        ctx.shadowBlur = 24 * u * (0.6 + 0.4 * Math.exp(-ph * 4));
        ctx.lineWidth = 4 * u;
        ctx.strokeStyle = CYAN;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#eaffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(link, cx, by + 2 * u);
        ctx.restore();
      }
    }

    // ---------- VHS ----------
    ctx.fillStyle = scanPattern(ctx, u);
    ctx.fillRect(0, 0, W, H);
    const band = ((t * 0.18) % 1.3) * H - 0.15 * H;
    const glitchOn = hash(Math.floor(t * 2) + 7) > 0.55;
    for (let i = 0; glitchOn && i < 6; i++) {
      const y = band + i * 14 * u;
      if (y < 0 || y > H - 10 * u) continue;
      const dx = (hash(Math.floor(t * 30) + i) - 0.5) * 30 * u;
      ctx.drawImage(ctx.canvas, 0, y, W, 10 * u, dx, y, W, 10 * u);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    ctx.fillRect(0, band, W, 80 * u);
    grain(ctx, W, H, t, 0.09);
    ctx.save();
    ctx.font = `700 ${30 * u}px "JetBrains Mono"`;
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(255,255,255,0.6)';
    ctx.shadowBlur = 8 * u;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('PLAY ▶', 44 * u, 64 * u);
    const sec = Math.floor(t);
    ctx.fillText(`SP 0:00:${String(sec).padStart(2, '0')}`, 44 * u, 104 * u);
    ctx.restore();
    watermark(ctx, W, H, u);
    footer(ctx, W, H, u, 'rgba(255,220,250,0.6)');
  },
};
