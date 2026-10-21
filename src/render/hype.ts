import type { Template, TokenData, RenderOpts } from '../types';
import {
  seg, easeOutCubic, easeOutBack, easeInCubic, rng, pick, statsOf, fitFont, wrapText, roundRect, drawLogo, shortLink, beat, lerp, clamp,
} from './util';
import { unit, footer, watermark, progressBar, confetti, flash } from './common';
import { grain, blob, bokeh, vignette, tiltLogo, kinetic, blurRegion } from './fx';

const GREEN = '#39ff88';
const PINK = '#ff2fd0';

interface Cache { key: string; candles: { o: number; c: number; h: number; l: number }[]; hook: string; cta: string; fun: [string, string][] }
let cache: Cache | null = null;

const HOOKS = ['NEW GEM ALERT', 'JUST LAUNCHED', 'FRESH ON VIBE/VIBE', 'DEGENS, LOOK', 'YOU ARE EARLY', 'WAKE UP, ANON'];
const CTAS = ['BUY', 'APE', 'GRAB', 'GET'];
const FUN: [string, string][] = [['VIBES', 'IMMACULATE'], ['CHART', 'ONLY UP*'], ['COMMUNITY', 'COOKING'], ['STAGE', 'EARLY'], ['MEMES', 'ELITE'], ['JEETS', 'NONE']];

function prep(d: TokenData, o: RenderOpts) {
  const key = o.seed + '|' + d.ticker;
  if (cache && cache.key === key) return cache;
  const r = rng(o.seed);
  const candles = [];
  let p = 100;
  for (let i = 0; i < 80; i++) {
    const op = p;
    const ch = (r() - 0.32) * 9;
    p = Math.max(20, p + ch);
    candles.push({ o: op, c: p, h: Math.max(op, p) + r() * 4, l: Math.min(op, p) - r() * 4 });
  }
  const fun = [...FUN].sort(() => r() - 0.5).slice(0, 3);
  cache = { key, candles, hook: pick(r, HOOKS), cta: pick(r, CTAS), fun };
  return cache;
}

export const hype: Template = {
  id: 'hype',
  name: 'Pump Hype',
  blurb: 'Neon chart, beat flashes, count-ups',
  bpm: 128,
  music: 'hype',
  swatch: ['#07080d', GREEN, PINK],
  draw(ctx, t, d, o) {
    const { W, H } = o;
    const u = unit(W, H);
    const c = prep(d, o);
    const T = (t * 12) / o.duration; // normalized timeline (12s)
    const { ph } = beat(t, o.bpm);
    const ticker = '$' + (d.ticker || 'TICKER').toUpperCase();

    // ---------- background ----------
    ctx.fillStyle = '#06070c';
    ctx.fillRect(0, 0, W, H);
    const rg = ctx.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, H * 0.7);
    rg.addColorStop(0, `rgba(57,255,136,${0.22 + 0.1 * Math.exp(-ph * 5)})`);
    rg.addColorStop(0.5, 'rgba(120,40,255,0.10)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);
    blob(ctx, W * (0.15 + 0.08 * Math.sin(t * 0.4)), H * 0.2, W * 0.75, 'rgba(120,40,255,0.32)');
    blob(ctx, W * (0.9 + 0.06 * Math.cos(t * 0.5)), H * 0.6, W * 0.7, 'rgba(255,47,208,0.22)');
    for (let i = 0; i < 14; i++) {
      const z = ((i * 0.618) % 1);
      const bx = (((i * 0.37 + t * 0.02 * (0.5 + z)) % 1.2) - 0.1) * W;
      const by = ((i * 0.53 + 0.1 * Math.sin(t * 0.6 + i)) % 1) * H;
      bokeh(ctx, bx, by, (30 + 60 * z) * u, i % 3 ? '57,255,136' : '255,47,208', 0.08 + 0.08 * z);
    }

    // sunburst
    ctx.save();
    ctx.translate(W / 2, H * 0.42);
    ctx.rotate(t * 0.25);
    ctx.fillStyle = 'rgba(57,255,136,0.05)';
    const R = Math.hypot(W, H);
    for (let i = 0; i < 18; i++) {
      ctx.rotate((Math.PI * 2) / 18);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(R, -R * 0.09);
      ctx.lineTo(R, R * 0.09);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // scrolling candles
    ctx.save();
    ctx.globalAlpha = 0.28;
    const cw = 34 * u;
    const top = H * 0.12, bot = H * 0.78;
    const off = (t * 70 * u) % (cw * 1.6);
    let mn = Infinity, mx = -Infinity;
    for (const k of c.candles) { mn = Math.min(mn, k.l); mx = Math.max(mx, k.h); }
    const yOf = (v: number) => bot - ((v - mn) / (mx - mn)) * (bot - top);
    const n = Math.ceil(W / (cw * 1.6)) + 2;
    const startIdx = Math.floor((t * 70 * u) / (cw * 1.6)) % (c.candles.length - n);
    for (let i = 0; i < n; i++) {
      const k = c.candles[(startIdx + i) % c.candles.length];
      const x = i * cw * 1.6 - off;
      const up = k.c >= k.o;
      ctx.strokeStyle = ctx.fillStyle = up ? GREEN : '#ff3d5a';
      ctx.lineWidth = 3 * u;
      ctx.beginPath();
      ctx.moveTo(x + cw / 2, yOf(k.h));
      ctx.lineTo(x + cw / 2, yOf(k.l));
      ctx.stroke();
      const y1 = yOf(Math.max(k.o, k.c)), y2 = yOf(Math.min(k.o, k.c));
      ctx.fillRect(x, y1, cw, Math.max(3 * u, y2 - y1));
    }
    ctx.restore();

    // synthwave floor
    ctx.save();
    const hz = H * 0.8;
    const fg = ctx.createLinearGradient(0, hz, 0, H);
    fg.addColorStop(0, 'rgba(255,47,208,0.0)');
    fg.addColorStop(1, 'rgba(255,47,208,0.35)');
    ctx.fillStyle = fg;
    ctx.fillRect(0, hz, W, H - hz);
    ctx.strokeStyle = 'rgba(255,47,208,0.45)';
    ctx.lineWidth = 2 * u;
    for (let i = -12; i <= 12; i++) {
      ctx.beginPath();
      ctx.moveTo(W / 2 + i * 40 * u, hz);
      ctx.lineTo(W / 2 + i * 260 * u, H);
      ctx.stroke();
    }
    for (let i = 0; i < 8; i++) {
      const p = ((i + (t * 1.2) % 1) / 8);
      const y = hz + (H - hz) * p * p;
      ctx.globalAlpha = p;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.restore();

    // ---------- foreground with beat punch ----------
    ctx.save();
    const punch = 1 + 0.022 * Math.exp(-ph * 7) * (T > 0.4 ? 1 : 0);
    ctx.translate(W / 2, H / 2);
    ctx.scale(punch, punch);
    ctx.translate(-W / 2, -H / 2);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Scene A: hook + logo pop
    if (T < 2.4) {
      const pin = seg(T, 0.05, 0.35);
      const pout = seg(T, 2.1, 2.4);
      ctx.save();
      ctx.globalAlpha = 1 - pout;
      kinetic(ctx, c.hook, W / 2, H * 0.2, T, {
        font: (x) => `${x}px Anton`, size: 150 * u, maxW: W * 0.86, maxLines: 2, start: 0.05, stagger: 0.09, dur: 0.45, style: 'pop',
        fill: (i) => (i % 2 ? GREEN : '#fff'), stroke: { color: '#000', w: 14 * u }, shadow: { color: 'rgba(57,255,136,0.6)', blur: 30 * u },
      });
      ctx.restore();
      void pin;

      const lp = seg(T, 0.45, 1.05);
      if (lp > 0) {
        const r = 270 * u * easeOutBack(lp) * (1 - easeInCubic(pout));
        // glow ring
        ctx.save();
        ctx.translate(W / 2, H * 0.48);
        ctx.rotate(t * 1.4);
        ctx.setLineDash([26 * u, 18 * u]);
        ctx.lineWidth = 10 * u;
        ctx.strokeStyle = GREEN;
        ctx.shadowColor = GREEN;
        ctx.shadowBlur = 40 * u;
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(0, r + 34 * u), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        if (r > 1) tiltLogo(ctx, (rr) => drawLogo(ctx, d, 0, 0, rr, { ring: '#fff', ringW: 10 * u }), W / 2, H * 0.48, r, t, { glow: 'rgba(57,255,136,0.7)', glowBlur: 50 * u });
        // "?" tease text
        const qp = seg(T, 1.1, 1.4);
        ctx.save();
        ctx.globalAlpha = qp * (1 - pout);
        ctx.font = `800 ${54 * u}px Inter`;
        ctx.fillStyle = GREEN;
        ctx.fillText('ever heard of ' + ticker + '?', W / 2, H * 0.48 + 360 * u);
        ctx.restore();
      }
    }

    // Scene B: ticker reveal
    if (T >= 2.3 && T < 5.8) {
      const pin = seg(T, 2.3, 2.8);
      const pout = seg(T, 5.5, 5.8);
      const ly = lerp(H * 0.48, H * 0.27, easeOutCubic(pin));
      const lr = lerp(250, 190, easeOutCubic(pin)) * u;
      ctx.save();
      ctx.globalAlpha = 1 - pout;
      tiltLogo(ctx, (rr) => drawLogo(ctx, d, 0, 0, rr, { ring: '#fff', ringW: 9 * u }), W / 2, ly, lr, t, { glow: 'rgba(57,255,136,0.8)', glowBlur: 60 * u * (0.6 + 0.4 * Math.exp(-ph * 4)) });

      // ticker per-letter
      const fs = fitFont(ctx, ticker, W * 0.9, 270 * u, (x) => `${x}px Anton`);
      ctx.font = `${fs}px Anton`;
      const tw = ctx.measureText(ticker).width;
      let x = W / 2 - tw / 2;
      ctx.textAlign = 'left';
      for (let i = 0; i < ticker.length; i++) {
        const ch = ticker[i];
        const w = ctx.measureText(ch).width;
        const p = easeOutBack(seg(T, 2.55 + i * 0.06, 2.95 + i * 0.06));
        const y = H * 0.53 + (1 - p) * 220 * u;
        ctx.save();
        ctx.globalAlpha = clamp(p) * (1 - pout);
        ctx.fillStyle = 'rgba(255,47,208,0.85)';
        ctx.fillText(ch, x + 7 * u, y + 7 * u);
        ctx.lineWidth = 16 * u;
        ctx.strokeStyle = '#000';
        ctx.strokeText(ch, x, y);
        const tg = ctx.createLinearGradient(0, y - fs * 0.5, 0, y + fs * 0.5);
        tg.addColorStop(0, '#ffffff');
        tg.addColorStop(1, i === 0 ? GREEN : '#c9ffe0');
        ctx.fillStyle = i === 0 ? GREEN : tg;
        ctx.fillText(ch, x, y);
        ctx.restore();
        x += w;
      }
      ctx.textAlign = 'center';

      // name
      const np = seg(T, 3.2, 3.6);
      ctx.globalAlpha = np * (1 - pout);
      const nfs = fitFont(ctx, d.name || 'Token Name', W * 0.85, 66 * u, (x) => `800 ${x}px Inter`);
      ctx.font = `800 ${nfs}px Inter`;
      ctx.fillStyle = GREEN;
      ctx.fillText((d.name || 'Token Name').toUpperCase(), W / 2, H * 0.53 + 175 * u);

      // tagline typewriter
      if (d.tagline) {
        const tp = seg(T, 3.6, 5.0);
        const full = d.tagline;
        const shown = full.slice(0, Math.ceil(full.length * tp));
        ctx.font = `600 ${46 * u}px Inter`;
        const lines = wrapText(ctx, full, W * 0.78, 3);
        const lh = 62 * u;
        const bh = lines.length * lh + 50 * u;
        const by = H * 0.53 + 250 * u;
        ctx.globalAlpha = seg(T, 3.5, 3.7) * (1 - pout);
        roundRect(ctx, W * 0.07, by, W * 0.86, bh, 34 * u);
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(57,255,136,0.6)';
        ctx.lineWidth = 3 * u;
        ctx.stroke();
        ctx.fillStyle = '#fff';
        let left = shown.length;
        lines.forEach((ln, i) => {
          const part = ln.slice(0, Math.max(0, left));
          left -= ln.length + 1;
          ctx.fillText(part, W / 2, by + 25 * u + lh * (i + 0.5));
        });
      }
      ctx.restore();
    }

    // Scene C: stats
    if (T >= 5.6 && T < 9.6) {
      const pout = seg(T, 9.3, 9.6);
      const stats = statsOf(d);
      ctx.save();
      ctx.globalAlpha = 1 - pout;
      // header
      const hp = easeOutCubic(seg(T, 5.6, 6.0));
      const hy = H * 0.17 - (1 - hp) * 100 * u;
      ctx.font = `${120 * u}px Anton`;
      const tw = Math.min(ctx.measureText(ticker).width, W * 0.62);
      const hr = 70 * u;
      const total = hr * 2 + 30 * u + tw;
      drawLogo(ctx, d, W / 2 - total / 2 + hr, hy, hr, { ring: GREEN, ringW: 6 * u });
      ctx.textAlign = 'left';
      fitFont(ctx, ticker, W * 0.62, 120 * u, (x) => `${x}px Anton`);
      ctx.fillStyle = '#fff';
      ctx.fillText(ticker, W / 2 - total / 2 + hr * 2 + 30 * u, hy + 6 * u);

      const rows: { label: string; text: string; sub?: string }[] = [];
      if (stats.length) {
        for (const s of stats.slice(0, 4)) rows.push({ label: s.label, text: '' });
      } else {
        for (const f of c.fun) rows.push({ label: f[0], text: f[1] });
      }
      const n = rows.length;
      const ch = Math.min(210 * u, (H * 0.6) / n - 24 * u);
      const gap = 26 * u;
      const y0 = H * 0.29;
      rows.forEach((row, i) => {
        const p = easeOutBack(seg(T, 5.9 + i * 0.22, 6.35 + i * 0.22));
        const x = W * 0.07 - (1 - p) * W;
        const y = y0 + i * (ch + gap);
        const w = W * 0.86;
        ctx.save();
        if (p > 0.3) blurRegion(ctx, x, y, w, ch, 10, () => roundRect(ctx, x, y, w, ch, 30 * u));
        roundRect(ctx, x, y, w, ch, 30 * u);
        const g = ctx.createLinearGradient(x, y, x + w, y + ch);
        g.addColorStop(0, 'rgba(57,255,136,0.18)');
        g.addColorStop(1, 'rgba(255,47,208,0.12)');
        ctx.fillStyle = g;
        ctx.fill();
        const sg = ctx.createLinearGradient(x, y, x + w, y);
        sg.addColorStop(0, 'rgba(57,255,136,0.9)');
        sg.addColorStop(1, 'rgba(255,47,208,0.7)');
        ctx.strokeStyle = sg;
        ctx.lineWidth = 3 * u;
        ctx.stroke();
        const compact = ch < 190 * u;
        let txt = row.text;
        let col = GREEN;
        if (stats.length) {
          const s = stats[i];
          const cp = easeOutCubic(seg(T, 6.2 + i * 0.22, 7.6 + i * 0.22));
          txt = (s.prefix ?? '') + s.fmt(s.value * cp) + (s.suffix ?? '');
          if (s.label === '24H' && s.value < 0) col = '#ff3d5a';
        }
        ctx.textAlign = 'left';
        ctx.font = `800 ${(compact ? 32 : 36) * u}px Inter`;
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillText(row.label, x + 44 * u, compact ? y + ch / 2 : y + ch * 0.3);
        if (compact) {
          ctx.textAlign = 'right';
          fitFont(ctx, txt, w * 0.55, Math.min(ch * 0.62, 90 * u), (x) => `${x}px Anton`);
          ctx.fillStyle = col;
          ctx.fillText(txt, x + w - 44 * u, y + ch / 2 + 2 * u);
          ctx.restore();
          return;
        }
        const vfs = Math.min(ch * 0.5, 96 * u);
        fitFont(ctx, txt, w - 220 * u, vfs, (x) => `${x}px Anton`);
        ctx.fillStyle = col;
        ctx.fillText(txt, x + 44 * u, y + ch * 0.66);
        // arrow badge
        const ap = seg(T, 7.4 + i * 0.22, 7.7 + i * 0.22);
        if (ap > 0) {
          const bx = x + w - 120 * u, by = y + ch / 2;
          ctx.globalAlpha *= ap;
          ctx.translate(bx, by);
          ctx.scale(easeOutBack(ap), easeOutBack(ap));
          ctx.beginPath();
          ctx.arc(0, 0, 54 * u, 0, Math.PI * 2);
          ctx.fillStyle = col;
          ctx.fill();
          ctx.fillStyle = '#06070c';
          ctx.beginPath();
          const up = col === GREEN;
          const sgn = up ? 1 : -1;
          ctx.moveTo(0, -24 * u * sgn);
          ctx.lineTo(24 * u, 8 * u * sgn);
          ctx.lineTo(-24 * u, 8 * u * sgn);
          ctx.closePath();
          ctx.fill();
          ctx.fillRect(-9 * u, (up ? 6 : -26) * u, 18 * u, 20 * u);
        }
        ctx.restore();
      });
      ctx.restore();
    }

    // Scene D: CTA
    if (T >= 9.4) {
      const pin = easeOutBack(seg(T, 9.4, 9.9));
      const cy = H * 0.31;
      const r = 230 * u * pin;
      // coin flip
      const sx = Math.cos((T - 9.4) * 5);
      ctx.save();
      ctx.translate(W / 2, cy);
      ctx.scale(Math.max(0.06, Math.abs(sx)), 1);
      if (r > 1) tiltLogo(ctx, (rr) => drawLogo(ctx, d, 0, 0, rr, { ring: '#ffd84a', ringW: 16 * u }), 0, 0, r, t, { glow: 'rgba(57,255,136,0.8)', glowBlur: 70 * u, shadow: false });
      ctx.restore();

      const bp = easeOutBack(seg(T, 9.7, 10.1));
      const pulse = 1 + 0.05 * Math.exp(-ph * 5);
      const label = c.cta + ' ' + ticker;
      ctx.save();
      ctx.translate(W / 2, H * 0.6);
      ctx.scale(bp * pulse, bp * pulse);
      const fs = fitFont(ctx, label, W * 0.7, 130 * u, (x) => `${x}px Anton`);
      ctx.font = `${fs}px Anton`;
      const bw = ctx.measureText(label).width + 120 * u, bh = fs * 1.5;
      ctx.shadowColor = GREEN;
      ctx.shadowBlur = 50 * u;
      roundRect(ctx, -bw / 2, -bh / 2, bw, bh, bh / 2);
      const btn = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
      btn.addColorStop(0, GREEN);
      btn.addColorStop(1, '#19e3ff');
      ctx.fillStyle = btn;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.save();
      ctx.clip();
      const sh = ctx.createLinearGradient(0, -bh / 2, 0, 0);
      sh.addColorStop(0, 'rgba(255,255,255,0.45)');
      sh.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sh;
      ctx.fillRect(-bw / 2, -bh / 2, bw, bh / 2);
      const sx2 = -bw / 2 + ((t * 0.7) % 1.5) * bw * 1.2 - bw * 0.2;
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.moveTo(sx2, -bh / 2); ctx.lineTo(sx2 + 40 * u, -bh / 2); ctx.lineTo(sx2 - 10 * u, bh / 2); ctx.lineTo(sx2 - 50 * u, bh / 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#06070c';
      ctx.fillText(label, 0, fs * 0.05);
      ctx.restore();

      const lp = seg(T, 10.1, 10.4);
      ctx.save();
      ctx.globalAlpha = lp;
      ctx.font = `700 ${44 * u}px Inter`;
      ctx.fillStyle = '#fff';
      ctx.fillText('live now on vibe/vibe', W / 2, H * 0.6 + 150 * u);
      const link = shortLink(d.link, d.address);
      fitFont(ctx, link, W * 0.86, 40 * u, (x) => `600 ${x}px Inter`);
      ctx.fillStyle = GREEN;
      ctx.fillText(link, W / 2, H * 0.6 + 215 * u);
      ctx.restore();
    }
    ctx.restore(); // punch

    if (T >= 9.4) confetti(ctx, W, H, u, T - 9.45, o.seed, [GREEN, PINK, '#ffd84a', '#19e3ff', '#fff'], W / 2, H * 0.31);

    // scene-cut flashes
    for (const sc of [0.45, 2.35, 5.65, 9.45]) {
      const dt = T - sc;
      if (dt >= 0 && dt < 0.25) flash(ctx, W, H, 0.7 * (1 - dt / 0.25));
    }
    flash(ctx, W, H, T > 2.3 ? 0.05 * Math.exp(-ph * 9) : 0);

    vignette(ctx, W, H, 0.5, 0.4);
    grain(ctx, W, H, t, 0.07);
    progressBar(ctx, W, u, t / o.duration, GREEN);
    watermark(ctx, W, H, u);
    footer(ctx, W, H, u);
  },
};
