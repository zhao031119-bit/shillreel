import type { Template, TokenData, RenderOpts } from '../types';
import { seg, easeOutCubic, easeInOutCubic, easeOutBack, rng, pick, statsOf, fitFont, fitWrap, wrapText, roundRect, drawLogo, shortLink, lerp } from './util';
import { unit, footer, watermark, progressBar } from './common';
import { grain, blob as fxBlob, tiltLogo, spring, p01, kinetic, easeOutExpo } from './fx';

const INK = '#0f1222';
const ACC = '#6c4dff';
const ACC2 = '#00b8d9';
const UP = '#12b76a';

interface Cache { key: string; line: number[]; kicker: string; head: string[]; cta: string }
let cache: Cache | null = null;
const KICKERS = ['TOKEN SPOTLIGHT', 'NEW ON VIBE/VIBE', 'WATCHLIST ADD', 'ON OUR RADAR'];
const HEADS = [['Meet', 'the next', 'big vibe.'], ['Small cap.', 'Big', 'energy.'], ['Quietly', 'climbing.', 'Loudly vibing.'], ['Early is', 'a feeling.', 'This is it.']];
const CTAS = ['Trade', 'Discover', 'Check out', 'Find'];

function prep(d: TokenData, o: RenderOpts) {
  const key = o.seed + '|' + d.ticker;
  if (cache && cache.key === key) return cache;
  const r = rng(o.seed + 7);
  const line: number[] = [];
  let v = 30;
  for (let i = 0; i < 40; i++) {
    v += (r() - 0.35) * 8;
    v = Math.max(5, v);
    line.push(v);
  }
  cache = { key, line, kicker: pick(r, KICKERS), head: pick(r, HEADS), cta: pick(r, CTAS) };
  return cache;
}

function blob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, col: string) {
  fxBlob(ctx, x, y, r, col);
}

export const clean: Template = {
  id: 'clean',
  name: 'Clean Stats Card',
  blurb: 'Calm glass card, chart & numbers',
  bpm: 100,
  music: 'chill',
  swatch: ['#f4f2ff', ACC, ACC2],
  draw(ctx, t, d, o) {
    const { W, H } = o;
    const u = unit(W, H);
    const c = prep(d, o);
    const T = (t * 12) / o.duration;
    const ticker = '$' + (d.ticker || 'TICKER').toUpperCase();
    const sq = W / H > 0.8;

    // background
    ctx.fillStyle = '#f5f4fb';
    ctx.fillRect(0, 0, W, H);
    blob(ctx, W * (0.2 + 0.1 * Math.sin(t * 0.6)), H * (0.2 + 0.05 * Math.cos(t * 0.5)), W * 0.8, 'rgba(108,77,255,0.35)');
    blob(ctx, W * (0.85 + 0.08 * Math.cos(t * 0.4)), H * (0.55 + 0.06 * Math.sin(t * 0.7)), W * 0.75, 'rgba(0,184,217,0.30)');
    blob(ctx, W * (0.3 + 0.1 * Math.cos(t * 0.5)), H * (0.92), W * 0.7, 'rgba(255,120,180,0.25)');
    // dotted grid
    ctx.fillStyle = 'rgba(15,18,34,0.07)';
    for (let y = 40 * u; y < H; y += 48 * u) for (let x = 40 * u; x < W; x += 48 * u) ctx.fillRect(x, y, 3 * u, 3 * u);

    ctx.textBaseline = 'middle';

    // headline phase (0 - 2.6)
    if (T < 2.9) {
      const out = easeInOutCubic(seg(T, 2.4, 2.9));
      ctx.save();
      ctx.globalAlpha = 1 - out;
      ctx.translate(0, -out * 120 * u);
      ctx.textAlign = 'left';
      const kp = easeOutCubic(seg(T, 0.1, 0.5));
      ctx.font = `800 ${34 * u}px Inter`;
      ctx.fillStyle = ACC;
      ctx.globalAlpha *= kp;
      ctx.fillText(c.kicker, W * 0.09, H * 0.33);
      ctx.globalAlpha = 1 - out;
      c.head.forEach((ln, i) => {
        const p = easeOutCubic(seg(T, 0.35 + i * 0.25, 0.85 + i * 0.25));
        ctx.save();
        ctx.beginPath();
        const ly = H * 0.33 + (i + 1) * 150 * u;
        ctx.rect(0, ly - 80 * u, W, 160 * u);
        ctx.clip();
        ctx.font = `900 ${132 * u}px Inter`;
        ctx.fillStyle = i === 2 ? ACC : INK;
        fitFont(ctx, ln, W * 0.84, 132 * u, (x) => `900 ${x}px Inter`);
        ctx.fillText(ln, W * 0.09, ly + (1 - p) * 150 * u);
        ctx.restore();
      });
      ctx.restore();
      if (!sq) {
        const fp = spring(p01(T, 0.9, 1.9) * 1.25, 7, 4.5) * (1 - out);
        if (fp > 0.01) {
          ctx.save();
          ctx.globalAlpha = Math.min(1, fp);
          tiltLogo(ctx, (rr) => drawLogo(ctx, d, 0, 0, rr, { square: true }), W * 0.68, H * 0.8 - out * 200 * u, 130 * u * fp, t, { tilt: 0.25, glow: 'rgba(108,77,255,0.45)', glowBlur: 60 * u });
          ctx.restore();
          ctx.save();
          ctx.globalAlpha = Math.min(1, fp) * 0.9;
          ctx.font = `800 ${30 * u}px Inter`;
          ctx.textAlign = 'right';
          ctx.fillStyle = INK;
          ctx.fillText(ticker, W * 0.68 - 170 * u, H * 0.8 - 20 * u - out * 200 * u);
          ctx.font = `600 ${24 * u}px Inter`;
          ctx.fillStyle = UP;
          ctx.fillText('● live on vibe/vibe', W * 0.68 - 170 * u, H * 0.8 + 22 * u - out * 200 * u);
          ctx.restore();
        }
      }
    }

    // card phase
    const cin = easeOutBack(seg(T, 2.6, 3.3));
    const cout = easeInOutCubic(seg(T, 9.2, 9.8));
    if (T >= 2.6 && T < 9.8) {
      const cw = W * 0.86;
      const chh = sq ? H * 0.86 : H * 0.7;
      const cx = (W - cw) / 2;
      const cy = (H - chh) / 2 + (1 - cin) * H * 0.6 - cout * H;
      ctx.save();
      ctx.shadowColor = 'rgba(40,30,120,0.25)';
      ctx.shadowBlur = 80 * u;
      ctx.shadowOffsetY = 30 * u;
      roundRect(ctx, cx, cy, cw, chh, 56 * u);
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.fill();
      ctx.restore();
      ctx.save();
      roundRect(ctx, cx, cy, cw, chh, 56 * u);
      ctx.strokeStyle = 'rgba(255,255,255,1)';
      ctx.lineWidth = 3 * u;
      ctx.stroke();
      ctx.clip();

      const pad = 56 * u;
      // header row
      const lr = 84 * u;
      const hy = cy + pad + lr;
      const hp = easeOutCubic(seg(T, 3.0, 3.5));
      ctx.globalAlpha = hp;
      drawLogo(ctx, d, cx + pad + lr, hy, lr, { square: true });
      ctx.textAlign = 'left';
      const tx = cx + pad + lr * 2 + 36 * u;
      const nmW = cw - (tx - cx) - pad - 60 * u;
      let nw = fitWrap(ctx, d.name || 'Token Name', nmW, 1, 58 * u, 40 * u, (x) => `800 ${x}px Inter`);
      if (ctx.measureText(nw.lines[0] ?? '').width > nmW || (nw.lines[0] ?? '').endsWith('…')) nw = fitWrap(ctx, d.name, nmW, 2, 40 * u, 24 * u, (x) => `800 ${x}px Inter`);
      ctx.font = `800 ${nw.size}px Inter`;
      ctx.fillStyle = INK;
      const two = nw.lines.length > 1;
      if (!two) ctx.fillText(nw.lines[0], tx, hy - 30 * u);
      else nw.lines.forEach((ln, i) => ctx.fillText(ln, tx, hy - 62 * u + i * nw.size * 1.1));
      fitFont(ctx, ticker, nmW + 40 * u, (two ? 36 : 44) * u, (x) => `700 ${x}px Inter`);
      ctx.fillStyle = ACC;
      ctx.fillText(ticker, tx, hy + (two ? 44 : 34) * u);
      // live dot
      const blink = 0.5 + 0.5 * Math.sin(t * 6);
      ctx.fillStyle = `rgba(18,183,106,${0.4 + 0.6 * blink})`;
      ctx.beginPath();
      ctx.arc(cx + cw - pad - 10 * u, cy + pad + 14 * u, 10 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = `700 ${24 * u}px Inter`;
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(15,18,34,0.55)';
      ctx.fillText('LIVE', cx + cw - pad - 30 * u, cy + pad + 15 * u);
      ctx.globalAlpha = 1;

      // chart
      const gy = hy + lr + 40 * u;
      const gh = sq ? chh * 0.22 : chh * 0.24;
      const gx = cx + pad, gw = cw - pad * 2;
      const dp = easeInOutCubic(seg(T, 3.3, 5.3));
      const mn = Math.min(...c.line), mx = Math.max(...c.line);
      const pts = c.line.map((v, i) => [gx + (i / (c.line.length - 1)) * gw, gy + gh - ((v - mn) / (mx - mn)) * gh * 0.9] as const);
      const npts = Math.max(2, Math.floor(pts.length * dp));
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < npts; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      const lastPt = pts[npts - 1];
      const grd = ctx.createLinearGradient(0, gy, 0, gy + gh);
      grd.addColorStop(0, 'rgba(108,77,255,0.28)');
      grd.addColorStop(1, 'rgba(108,77,255,0)');
      ctx.lineTo(lastPt[0], gy + gh);
      ctx.lineTo(pts[0][0], gy + gh);
      ctx.closePath();
      ctx.fillStyle = grd;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < npts; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      const lg = ctx.createLinearGradient(gx, 0, gx + gw, 0);
      lg.addColorStop(0, ACC2);
      lg.addColorStop(1, ACC);
      ctx.strokeStyle = lg;
      ctx.lineWidth = 7 * u;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.fillStyle = ACC;
      ctx.beginPath();
      ctx.arc(lastPt[0], lastPt[1], 14 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(108,77,255,0.25)';
      ctx.beginPath();
      ctx.arc(lastPt[0], lastPt[1], (14 + 16 * ((t * 1.5) % 1)) * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // stats grid / tagline
      const stats = statsOf(d).slice(0, 4);
      let sy = gy + gh + 50 * u;
      const cols = 2;
      const cellW = (gw - 24 * u) / cols;
      const cellH = 150 * u;
      stats.forEach((s, i) => {
        const col = i % cols, row = Math.floor(i / cols);
        const x = gx + col * (cellW + 24 * u);
        const y = sy + row * (cellH + 24 * u);
        const p = easeOutCubic(seg(T, 4.0 + i * 0.18, 4.5 + i * 0.18));
        ctx.save();
        ctx.globalAlpha = p;
        ctx.translate(0, (1 - p) * 40 * u);
        roundRect(ctx, x, y, cellW, cellH, 28 * u);
        ctx.fillStyle = '#f3f1fe';
        ctx.fill();
        ctx.textAlign = 'left';
        ctx.font = `700 ${26 * u}px Inter`;
        ctx.fillStyle = 'rgba(15,18,34,0.55)';
        ctx.fillText(s.label, x + 30 * u, y + 44 * u);
        const cp = easeOutCubic(seg(T, 4.2 + i * 0.18, 6.0 + i * 0.18));
        const txt = (s.prefix ?? '') + s.fmt(s.value * cp) + (s.suffix ?? '');
        fitFont(ctx, txt, cellW - 60 * u, 60 * u, (x) => `800 ${x}px Inter`);
        ctx.fillStyle = s.label === '24H' ? (s.value >= 0 ? UP : '#e5484d') : INK;
        ctx.fillText(txt, x + 30 * u, y + 100 * u);
        ctx.restore();
      });
      if (stats.length) sy += Math.ceil(stats.length / cols) * (cellH + 24 * u) + 16 * u;

      if (d.tagline) {
        const tp = easeOutCubic(seg(T, 6.0, 6.6));
        ctx.save();
        ctx.globalAlpha = tp;
        ctx.textAlign = 'left';
        ctx.font = `600 ${42 * u}px Inter`;
        const room = cy + chh - pad - sy;
        const maxLines = Math.max(1, Math.min(4, Math.floor((room - 20 * u) / (58 * u))));
        const lines = wrapText(ctx, '“' + d.tagline + '”', gw - 40 * u, maxLines);
        ctx.fillStyle = ACC;
        ctx.fillRect(gx, sy + 10 * u, 6 * u, lines.length * 58 * u);
        ctx.fillStyle = INK;
        lines.forEach((ln, i) => ctx.fillText(ln, gx + 34 * u, sy + 10 * u + 58 * u * (i + 0.5)));
        ctx.restore();
      }
      ctx.restore();
    }

    // CTA
    if (T >= 9.4) {
      const p = easeOutBack(seg(T, 9.5, 10.1));
      ctx.save();
      ctx.textAlign = 'center';
      const lr = 150 * u * p;
      if (lr > 1) {
        tiltLogo(ctx, (rr) => drawLogo(ctx, d, 0, 0, rr, { square: true }), W / 2, H * 0.3, lr, t, { tilt: 0.2, glow: 'rgba(108,77,255,0.4)', glowBlur: 60 * u });
      }
      const line1 = c.cta + ' ' + ticker;
      kinetic(ctx, line1, W / 2, H * 0.3 + 250 * u, T, { font: (x) => `900 ${x}px Inter`, size: 120 * u, maxW: W * 0.84, maxLines: 1, start: 9.7, stagger: 0.1, dur: 0.6, style: 'rise', fill: (i) => (i ? ACC : INK) });
      ctx.globalAlpha = easeOutExpo(seg(T, 9.9, 10.3));
      ctx.font = `600 ${46 * u}px Inter`;
      ctx.fillStyle = 'rgba(15,18,34,0.6)';
      ctx.fillText('on vibe/vibe', W / 2, H * 0.3 + 350 * u);
      // link pill + tap
      const bp = easeOutBack(seg(T, 10.0, 10.4));
      const link = shortLink(d.link, d.address);
      const fs = fitFont(ctx, link, W * 0.72, 40 * u, (x) => `700 ${x}px Inter`);
      const bw = ctx.measureText(link).width + 100 * u, bh = fs + 60 * u;
      const by = H * 0.3 + 480 * u;
      const tap = seg(T, 10.8, 11.0) - seg(T, 11.0, 11.3);
      ctx.save();
      ctx.translate(W / 2, by);
      ctx.scale(bp * (1 - 0.05 * tap), bp * (1 - 0.05 * tap));
      const g = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
      g.addColorStop(0, ACC);
      g.addColorStop(1, ACC2);
      ctx.shadowColor = 'rgba(108,77,255,0.45)';
      ctx.shadowBlur = 40 * u;
      roundRect(ctx, -bw / 2, -bh / 2, bw, bh, bh / 2);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.save();
      ctx.clip();
      const shx = -bw / 2 + ((t * 0.6) % 1.6) * bw - bw * 0.1;
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.beginPath();
      ctx.moveTo(shx, -bh / 2); ctx.lineTo(shx + 50 * u, -bh / 2); ctx.lineTo(shx, bh / 2); ctx.lineTo(shx - 50 * u, bh / 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#fff';
      ctx.fillText(link, 0, 2 * u);
      ctx.restore();
      // pointer hand (simple cursor)
      const hp = easeInOutCubic(seg(T, 10.3, 10.85));
      if (hp > 0) {
        const hx = lerp(W * 0.85, W / 2 + bw * 0.25, hp), hy = lerp(H * 0.95, by + 20 * u, hp);
        ctx.save();
        ctx.translate(hx, hy);
        ctx.rotate(-0.4);
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 5 * u;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 80 * u);
        ctx.lineTo(20 * u, 62 * u);
        ctx.lineTo(34 * u, 92 * u);
        ctx.lineTo(48 * u, 86 * u);
        ctx.lineTo(34 * u, 56 * u);
        ctx.lineTo(60 * u, 56 * u);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        if (tap > 0) {
          ctx.strokeStyle = `rgba(108,77,255,${tap})`;
          ctx.lineWidth = 4 * u;
          ctx.beginPath();
          ctx.arc(W / 2 + bw * 0.25, by + 20 * u, 60 * u * (1.5 - tap), 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    grain(ctx, W, H, t, 0.045);
    progressBar(ctx, W, u, t / o.duration, ACC, 'rgba(15,18,34,0.1)');
    watermark(ctx, W, H, u, true);
    footer(ctx, W, H, u, 'rgba(15,18,34,0.45)');
  },
};
