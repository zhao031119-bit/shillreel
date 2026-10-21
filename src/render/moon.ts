import type { Template, TokenData, RenderOpts } from '../types';
import { seg, easeOutCubic, easeInOutCubic, easeOutBack, easeInCubic, rng, pick, statsOf, statText, fitFont, roundRect, drawLogo, shortLink, memo, hash, lerp } from './util';
import { unit, footer, watermark, progressBar, flash } from './common';

const ORANGE = '#ff8a1f';
const CYAN = '#7fe7ff';

const cache = memo<{ stars: [number, number, number][]; path: number[]; crater: [number, number, number][]; tag: string }>();
function prep(d: TokenData, o: RenderOpts) {
  return cache(o.seed + '|' + d.ticker, () => {
    const r = rng(o.seed + 99);
    const stars = Array.from({ length: 160 }, () => [r(), r(), 0.3 + r() * 0.7] as [number, number, number]);
    const path: number[] = [];
    let v = 0;
    for (let i = 0; i <= 24; i++) {
      v += 0.6 + r() * 1.4 - (r() < 0.25 ? 1.2 : 0);
      path.push(v);
    }
    const crater = Array.from({ length: 9 }, () => [r() * 1.4 - 0.7, r() * 1.4 - 0.7, 0.06 + r() * 0.16] as [number, number, number]);
    return { stars, path, crater, tag: pick(r, ['TO THE MOON', 'NEXT STOP: MOON', 'MOON MISSION GO', 'WE MADE IT']) };
  });
}

function rocket(ctx: CanvasRenderingContext2D, d: TokenData, x: number, y: number, s: number, ang: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  // flame
  const fl = 1 + 0.25 * Math.sin(t * 40) + 0.15 * Math.sin(t * 27);
  const fg = ctx.createLinearGradient(0, s * 0.9, 0, s * (0.9 + 1.1 * fl));
  fg.addColorStop(0, '#fff6c0');
  fg.addColorStop(0.3, '#ffb02e');
  fg.addColorStop(1, 'rgba(255,60,20,0)');
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.moveTo(-s * 0.28, s * 0.85);
  ctx.quadraticCurveTo(0, s * (0.9 + 2.2 * fl), s * 0.28, s * 0.85);
  ctx.fill();
  // fins
  ctx.fillStyle = '#e8343f';
  ctx.beginPath();
  ctx.moveTo(-s * 0.32, s * 0.25);
  ctx.lineTo(-s * 0.62, s * 0.95);
  ctx.lineTo(-s * 0.3, s * 0.8);
  ctx.closePath();
  ctx.moveTo(s * 0.32, s * 0.25);
  ctx.lineTo(s * 0.62, s * 0.95);
  ctx.lineTo(s * 0.3, s * 0.8);
  ctx.closePath();
  ctx.fill();
  // body
  const bg = ctx.createLinearGradient(-s * 0.35, 0, s * 0.35, 0);
  bg.addColorStop(0, '#b9c2d6');
  bg.addColorStop(0.45, '#ffffff');
  bg.addColorStop(1, '#8f9ab3');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(0, -s * 1.2);
  ctx.bezierCurveTo(s * 0.5, -s * 0.7, s * 0.38, s * 0.5, s * 0.3, s * 0.9);
  ctx.lineTo(-s * 0.3, s * 0.9);
  ctx.bezierCurveTo(-s * 0.38, s * 0.5, -s * 0.5, -s * 0.7, 0, -s * 1.2);
  ctx.fill();
  ctx.fillStyle = '#e8343f';
  ctx.beginPath();
  ctx.moveTo(0, -s * 1.2);
  ctx.bezierCurveTo(s * 0.22, -s * 1.0, s * 0.33, -s * 0.8, s * 0.36, -s * 0.66);
  ctx.lineTo(-s * 0.36, -s * 0.66);
  ctx.bezierCurveTo(-s * 0.33, -s * 0.8, -s * 0.22, -s * 1.0, 0, -s * 1.2);
  ctx.fill();
  // window = logo
  ctx.rotate(-ang);
  drawLogo(ctx, d, Math.sin(ang) * s * 0.15 * 0, 0, s * 0.27, { ring: '#33405e', ringW: s * 0.06 });
  ctx.restore();
}

function moon(ctx: CanvasRenderingContext2D, x: number, y: number, R: number, cr: [number, number, number][]) {
  ctx.save();
  const glow = ctx.createRadialGradient(x, y, R * 0.9, x, y, R * 1.6);
  glow.addColorStop(0, 'rgba(255,240,200,0.25)');
  glow.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - R * 1.6, y - R * 1.6, R * 3.2, R * 3.2);
  const g = ctx.createRadialGradient(x - R * 0.35, y - R * 0.35, R * 0.1, x, y, R);
  g.addColorStop(0, '#fffbe8');
  g.addColorStop(1, '#c9c1a6');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.clip();
  for (const [cx, cy, cr2] of cr) {
    ctx.fillStyle = 'rgba(120,110,85,0.28)';
    ctx.beginPath();
    ctx.arc(x + cx * R, y + cy * R, cr2 * R, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export const moonMission: Template = {
  id: 'moon',
  name: 'Moon Mission',
  blurb: '3-2-1 countdown, rocket up the chart',
  bpm: 90,
  music: 'epic',
  swatch: ['#060818', ORANGE, CYAN],
  thumbT: 5.2,
  draw(ctx, t, d, o) {
    const { W, H } = o;
    const u = unit(W, H);
    const sq = W / H > 0.8;
    const c = prep(d, o);
    const T = (t * 12) / o.duration;
    const T_ = '$' + (d.ticker || 'TICKER').toUpperCase();
    const stats = statsOf(d);

    // camera altitude: 0 before launch, rising after
    const launch = 3.3;
    const alt = T < launch ? 0 : Math.pow(T - launch, 1.6) * 0.18;
    const shake = T >= launch - 0.2 && T < launch + 1.2 ? (1 - seg(T, launch, launch + 1.2)) * 14 * u : 0;
    const fr = Math.floor(t * 30);

    // sky gradient that gets darker with altitude
    const k = Math.min(1, alt * 1.2);
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, `rgb(${lerp(10, 4, k)},${lerp(16, 6, k)},${lerp(48, 20, k)})`);
    sky.addColorStop(1, `rgb(${lerp(70, 8, k)},${lerp(40, 10, k)},${lerp(90, 30, k)})`);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    // nebula
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const nb = ctx.createRadialGradient(W * 0.2, H * 0.3, 0, W * 0.2, H * 0.3, W * 0.8);
    nb.addColorStop(0, 'rgba(120,60,200,0.18)');
    nb.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = nb;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    // stars streaking with speed
    const speed = T < launch ? 0 : Math.min(1, (T - launch) / 2);
    for (const [sx, sy, z] of c.stars) {
      const y = ((sy * H + alt * H * 0.9 * z) % H + H) % H;
      const x = sx * W;
      ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.65 * z})`;
      const len = 2 * u + speed * z * 16 * u;
      ctx.fillRect(x, y - len, 2.4 * u * z + 1, len);
    }

    ctx.save();
    ctx.translate((hash(fr) - 0.5) * shake, (hash(fr + 7) - 0.5) * shake);

    // moon approaches
    const mp = easeInOutCubic(seg(T, 6.5, 10.5));
    const mR = lerp(70, sq ? 360 : 460, mp) * u;
    const mx = lerp(W * 0.8, W * 0.5, mp);
    const my = lerp(H * (sq ? 0.3 : 0.24), sq ? H * 1.1 : H * 1.05, mp);
    moon(ctx, mx, my, mR, c.crater);

    // ground + pad (pre-launch, falling away after)
    const groundY = H * 0.86 + alt * H * 1.5;
    if (groundY < H * 1.4) {
      ctx.fillStyle = '#141024';
      ctx.fillRect(0, groundY, W, H);
      ctx.fillStyle = '#2a2245';
      ctx.fillRect(W * 0.3, groundY - 20 * u, W * 0.4, 20 * u);
      // tower
      ctx.strokeStyle = '#4a3f72';
      ctx.lineWidth = 6 * u;
      const tx = W * 0.33;
      ctx.beginPath();
      for (let yy = groundY; yy > groundY - 520 * u; yy -= 52 * u) {
        ctx.moveTo(tx, yy);
        ctx.lineTo(tx + 50 * u, yy - 52 * u);
        ctx.moveTo(tx + 50 * u, yy);
        ctx.lineTo(tx, yy - 52 * u);
      }
      ctx.moveTo(tx, groundY);
      ctx.lineTo(tx, groundY - 520 * u);
      ctx.moveTo(tx + 50 * u, groundY);
      ctx.lineTo(tx + 50 * u, groundY - 520 * u);
      ctx.stroke();
    }

    // chart trail (after launch)
    const rs = (sq ? 120 : 150) * u;
    let rx = W / 2, ry = groundY - 20 * u - rs * 0.95, ang = 0;
    if (T >= launch) {
      const pp = easeInCubic(seg(T, launch, launch + 0.6)) * 0.15 + easeInOutCubic(seg(T, launch + 0.3, 6.6)) * 0.85;
      const n = c.path.length - 1;
      const mxv = c.path[n];
      const pts = c.path.map((v, i) => [W * 0.1 + (i / n) * W * 0.6, H * 0.82 - (v / mxv) * H * 0.55] as [number, number]);
      const upto = pp * n;
      ctx.save();
      ctx.strokeStyle = ORANGE;
      ctx.lineWidth = 8 * u;
      ctx.lineJoin = 'round';
      ctx.shadowColor = ORANGE;
      ctx.shadowBlur = 30 * u;
      ctx.globalAlpha = 1 - seg(T, 6.6, 7.2);
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      const ii = Math.floor(upto);
      for (let i = 1; i <= ii; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      const fpart = upto - ii;
      let tip = pts[ii];
      if (ii < n) tip = [lerp(pts[ii][0], pts[ii + 1][0], fpart), lerp(pts[ii][1], pts[ii + 1][1], fpart)];
      ctx.lineTo(tip[0], tip[1]);
      ctx.stroke();
      ctx.restore();
      const nxt = pts[Math.min(n, ii + 1)];
      ang = Math.atan2(nxt[0] - pts[ii][0], -(nxt[1] - pts[ii][1]));
      ang = Math.max(-0.2, Math.min(0.9, ang));
      const blend = seg(T, launch, launch + 0.7);
      rx = lerp(W / 2, tip[0], blend);
      ry = lerp(ry, tip[1] - rs * 0.4, blend);
      if (T >= 6.6) {
        // fly toward the moon
        const fp = easeInOutCubic(seg(T, 6.6, 9.6));
        rx = lerp(tip[0], mx, fp);
        ry = lerp(tip[1] - rs * 0.4, my - mR - rs * 0.9, fp);
        ang = lerp(ang, 0, fp);
      }
    }
    // smoke at launch
    if (T > launch - 0.4 && T < launch + 2.5) {
      for (let i = 0; i < 26; i++) {
        const a = hash(i * 3.3) * Math.PI;
        const life = seg(T, launch - 0.4 + hash(i) * 0.4, launch + 2.5);
        const sx = W / 2 + Math.cos(a) * (W * 0.45) * life * (hash(i + 9) + 0.3);
        const sy = H * 0.86 + alt * H * 1.5 - 20 * u - Math.sin(a) * 80 * u * life;
        ctx.fillStyle = `rgba(220,215,235,${0.35 * (1 - life)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, (40 + 120 * life) * u, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const landed = T >= 9.6;
    if (!landed || T < 9.9) rocket(ctx, d, rx, ry, rs, ang, t);

    // flag on the moon
    if (landed) {
      const fp = easeOutBack(seg(T, 9.7, 10.2));
      const fx = mx + mR * 0.25, fy = my - Math.sqrt(Math.max(0, mR * mR - (mR * 0.25) ** 2));
      ctx.save();
      ctx.translate(fx, fy);
      ctx.scale(fp, fp);
      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = 8 * u;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -260 * u);
      ctx.stroke();
      const wave = Math.sin(t * 5) * 8 * u;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(0, -260 * u);
      ctx.quadraticCurveTo(110 * u, -270 * u + wave, 220 * u, -255 * u);
      ctx.lineTo(220 * u, -135 * u);
      ctx.quadraticCurveTo(110 * u, -150 * u + wave, 0, -140 * u);
      ctx.fill();
      drawLogo(ctx, d, 110 * u, -200 * u + wave * 0.5, 46 * u, {});
      ctx.restore();
      // parked rocket next to flag
      rocket(ctx, d, mx - mR * 0.35, my - Math.sqrt(Math.max(0, mR * mR - (mR * 0.35) ** 2)) - rs * 0.75, rs * 0.75, -0.1, 0);
    }
    ctx.restore(); // shake

    // ---------- overlays ----------
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // countdown
    if (T < launch + 0.4) {
      const head = 'T-MINUS';
      ctx.font = `800 ${40 * u}px Inter`;
      ctx.fillStyle = CYAN;
      ctx.globalAlpha = seg(T, 0.05, 0.3) * (1 - seg(T, launch, launch + 0.4));
      ctx.fillText(head, W / 2, H * 0.17);
      const nm = (d.name || 'TOKEN').toUpperCase();
      fitFont(ctx, 'MISSION: ' + nm, W * 0.86, 44 * u, (s) => `800 ${s}px Inter`);
      ctx.fillStyle = '#fff';
      ctx.fillText('MISSION: ' + nm, W / 2, H * 0.12);
      ctx.globalAlpha = 1;
      const step = 0.8;
      for (let k = 0; k < 4; k++) {
        const st = 0.35 + k * step;
        const p = seg(T, st, st + step);
        if (p <= 0 || p >= 1 || (k === 3 && T > launch + 0.4)) continue;
        const label = k < 3 ? String(3 - k) : 'LIFTOFF';
        const s = lerp(1.4, 1, easeOutCubic(seg(p, 0, 0.3)));
        ctx.save();
        ctx.globalAlpha = 1 - seg(p, 0.75, 1);
        ctx.translate(W / 2, H * (sq ? 0.36 : 0.32));
        ctx.scale(s, s);
        // ring
        if (k < 3) {
          ctx.strokeStyle = 'rgba(127,231,255,0.25)';
          ctx.lineWidth = 14 * u;
          ctx.beginPath();
          ctx.arc(0, 0, 170 * u, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = CYAN;
          ctx.beginPath();
          ctx.arc(0, 0, 170 * u, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - p));
          ctx.stroke();
        }
        const fs = k < 3 ? 220 * u : fitFont(ctx, label, W * 0.86, 170 * u, (x) => `900 ${x}px Inter`);
        ctx.font = `900 ${fs}px Inter`;
        ctx.fillStyle = k < 3 ? '#fff' : ORANGE;
        ctx.shadowColor = k < 3 ? CYAN : ORANGE;
        ctx.shadowBlur = 40 * u;
        ctx.fillText(label, 0, 6 * u);
        ctx.restore();
      }
    }
    // HUD altitude during flight
    if (T >= launch && T < 9.6) {
      ctx.save();
      ctx.globalAlpha = seg(T, launch, launch + 0.3) * (1 - seg(T, 9.3, 9.6));
      const mc = stats.find((s) => s.label === 'MARKET CAP');
      const hp = easeOutCubic(seg(T, launch, 6.6));
      const val = mc ? statText(mc, hp) : Math.floor(384400 * hp).toLocaleString('en-US') + ' KM';
      const x = 50 * u, y = 110 * u;
      roundRect(ctx, x, y, 470 * u, 130 * u, 18 * u);
      ctx.fillStyle = 'rgba(5,10,30,0.6)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(127,231,255,0.6)';
      ctx.lineWidth = 3 * u;
      ctx.stroke();
      ctx.textAlign = 'left';
      ctx.font = `700 ${24 * u}px Inter`;
      ctx.fillStyle = CYAN;
      ctx.fillText(mc ? 'ALTITUDE · MARKET CAP' : 'ALTITUDE', x + 26 * u, y + 36 * u);
      fitFont(ctx, val, 420 * u, 56 * u, (s) => `900 ${s}px Inter`);
      ctx.fillStyle = '#fff';
      ctx.fillText(val, x + 26 * u, y + 88 * u);
      ctx.restore();
    }
    // telemetry panel 6.6-9.6
    if (T >= 6.4 && T < 9.6) {
      const rows = [['PAYLOAD', T_] as [string, string]];
      for (const s of stats) if (s.label !== 'MARKET CAP') rows.push([s.label === 'HOLDERS' ? 'CREW (HOLDERS)' : s.label === '24H' ? 'VELOCITY 24H' : s.label, statText(s, easeOutCubic(seg(T, 6.8, 8.2)))]);
      if (rows.length === 1) rows.push(['STATUS', 'NOMINAL'], ['DESTINATION', 'MOON']);
      const pw = sq ? W * 0.5 : W * 0.86;
      const px = sq ? W * 0.05 : W * 0.07;
      const rh = 82 * u;
      const py = sq ? H * 0.32 : H * 0.53;
      ctx.save();
      ctx.globalAlpha = seg(T, 6.4, 6.8) * (1 - seg(T, 9.3, 9.6));
      roundRect(ctx, px, py, pw, rows.length * rh + 30 * u, 22 * u);
      ctx.fillStyle = 'rgba(5,10,30,0.7)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(127,231,255,0.6)';
      ctx.lineWidth = 3 * u;
      ctx.stroke();
      rows.forEach(([l, v], i) => {
        const y = py + 15 * u + rh * (i + 0.5);
        const a = seg(T, 6.6 + i * 0.2, 6.8 + i * 0.2);
        ctx.globalAlpha = a * (1 - seg(T, 9.3, 9.6));
        ctx.textAlign = 'left';
        ctx.font = `700 ${(sq ? 22 : 28) * u}px Inter`;
        ctx.fillStyle = CYAN;
        ctx.fillText(l, px + 28 * u, y);
        ctx.textAlign = 'right';
        fitFont(ctx, v, pw * 0.48, (sq ? 34 : 46) * u, (s) => `900 ${s}px Inter`);
        ctx.fillStyle = l.startsWith('VELOCITY') ? '#3dff9a' : '#fff';
        ctx.fillText(v, px + pw - 28 * u, y);
      });
      ctx.restore();
    }
    // final title
    if (T >= 9.6) {
      const p = easeOutBack(seg(T, 9.7, 10.2));
      ctx.save();
      ctx.translate(W / 2, H * (sq ? 0.2 : 0.2));
      ctx.scale(p, p);
      fitFont(ctx, c.tag, W * 0.9, 120 * u, (s) => `900 ${s}px Inter`);
      ctx.fillStyle = '#fff';
      ctx.shadowColor = ORANGE;
      ctx.shadowBlur = 50 * u;
      ctx.fillText(c.tag, 0, 0);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = seg(T, 10.1, 10.4);
      fitFont(ctx, T_, W * 0.8, 120 * u, (s) => `900 ${s}px Inter`);
      ctx.fillStyle = ORANGE;
      ctx.fillText(T_, W / 2, H * (sq ? 0.33 : 0.29));
      const link = shortLink(d.link, d.address);
      fitFont(ctx, link, W * 0.86, 38 * u, (s) => `700 ${s}px Inter`);
      ctx.fillStyle = '#fff';
      ctx.fillText(link, W / 2, H * (sq ? 0.42 : 0.355));
      ctx.restore();
    }
    if (T >= launch && T < launch + 0.25) flash(ctx, W, H, 0.7 * (1 - seg(T, launch, launch + 0.25)), '#fff3d0');
    if (T >= 9.6 && T < 9.85) flash(ctx, W, H, 0.6 * (1 - seg(T, 9.6, 9.85)));

    progressBar(ctx, W, u, t / o.duration, ORANGE);
    watermark(ctx, W, H, u);
    footer(ctx, W, H, u);
  },
};
