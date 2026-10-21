import type { Template, TokenData, RenderOpts } from '../types';
import { rng, pick, statsOf, statText, fitFont, wrapText, drawLogo, shortLink, memo, lerp, clamp } from './util';
import { unit, watermark } from './common';
import { easeOutExpo, easeInOutQuint, p01, grain, blob, flare, lightLeak, tiltLogo, vignette } from './fx';

const CZ = (s: number, w = 700) => `${w} ${s}px Cinzel`;
const GOLD = ['#fff4d6', '#e9c77b', '#a8782f', '#f6dc9a'];
const OPEN = [['THIS FALL'], ['IN A WORLD', 'OF RUGS'], ['ONE CHAIN'], ['FROM THE', 'TESTNET'], ['THIS SEASON']];
const MID = [['ONE TOKEN', 'WILL RISE'], ['A LEGEND', 'IS MINTED'], ['NO ONE', 'SAW IT COMING'], ['THE HOLDERS', 'ARE READY']];
const CUTS = [0, 1.6, 3.6, 5, 7.4, 8.6, 9.6, 12.01];

const cache = memo<{ open: string[]; mid: string[]; dust: [number, number, number][] }>();
function prep(d: TokenData, o: RenderOpts) {
  return cache(String(o.seed), () => {
    const r = rng(o.seed + 777);
    return { open: pick(r, OPEN), mid: pick(r, MID), dust: Array.from({ length: 70 }, () => [r(), r(), r()] as [number, number, number]) };
  });
}

function goldGrad(ctx: CanvasRenderingContext2D, y: number, s: number) {
  const g = ctx.createLinearGradient(0, y - s * 0.7, 0, y + s * 0.2);
  g.addColorStop(0, GOLD[0]);
  g.addColorStop(0.45, GOLD[1]);
  g.addColorStop(0.62, GOLD[2]);
  g.addColorStop(1, GOLD[3]);
  return g;
}

/** tracked title text: letter-spaced, centered, alphabetic baseline at y */
function tracked(ctx: CanvasRenderingContext2D, txt: string, x: number, y: number, size: number, track: number, maxW: number, weight = 400, fill?: string | CanvasGradient) {
  let s = size;
  const width = (sz: number) => {
    ctx.font = CZ(sz, weight);
    return ctx.measureText(txt).width + (txt.length - 1) * track * sz;
  };
  while (width(s) > maxW && s > 10) s *= 0.95;
  const w = width(s);
  ctx.font = CZ(s, weight);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = fill ?? goldGrad(ctx, y, s);
  let cx = x - w / 2;
  for (const ch of txt) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + track * s;
  }
  return s;
}

export const trailer: Template = {
  id: 'trailer',
  name: 'Cinematic Trailer',
  blurb: 'Letterbox, title cards, lens flares',
  bpm: 90,
  music: 'trailer',
  swatch: ['#061218', '#e9c77b', '#ff8a3d'],
  thumbT: 10.6,
  draw(ctx, t, d, o) {
    const { W, H } = o;
    const u = unit(W, H);
    const sq = W / H > 0.8;
    const c = prep(d, o);
    const T = (t * 12) / o.duration;
    const T_ = '$' + (d.ticker || 'TICKER').toUpperCase();
    const name = (d.name || 'Your Token').toUpperCase();
    const cx = W / 2, cy = H / 2;
    let shot = 0;
    while (T >= CUTS[shot + 1]) shot++;
    const s0 = CUTS[shot], s1 = CUTS[shot + 1];
    const sp = clamp((T - s0) / (s1 - s0)); // progress within shot
    const fadeIn = easeOutExpo(p01(T, s0, s0 + 0.35));
    const bar = (sq ? 0.12 : 0.13) * H * easeInOutQuint(p01(T, 0, 0.6));

    // base grade
    ctx.fillStyle = '#04090c';
    ctx.fillRect(0, 0, W, H);
    const dust = (a: number) => {
      for (const [x, y, z] of c.dust) {
        const yy = ((y + t * 0.01 * (0.3 + z)) % 1) * H;
        const xx = ((x + Math.sin(t * 0.3 + z * 9) * 0.02 + 1) % 1) * W;
        ctx.fillStyle = `rgba(255,225,180,${a * (0.15 + 0.5 * z)})`;
        ctx.beginPath();
        ctx.arc(xx, yy, (1 + 2.5 * z) * u, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    const titleCard = (lines: string[], weight: number) => {
      const push = 1 + sp * 0.07;
      const a = fadeIn * (1 - easeInOutQuint(p01(sp, 0.82, 1)));
      blob(ctx, cx, cy, W * 0.7, 'rgba(30,60,70,0.35)');
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(cx, cy);
      ctx.scale(push, push);
      const size = (sq ? 96 : 104) * u;
      const lh = size * 1.35;
      lines.forEach((ln, i) => {
        const y = (i - (lines.length - 1) / 2) * lh + size * 0.35;
        tracked(ctx, ln, 0, y, size, 0.12 + sp * 0.08, W * 0.86, weight);
      });
      ctx.restore();
      dust(0.8);
    };
    const logoShot = (zoom: number, flareX: number) => {
      // teal environment + orange key
      const g = ctx.createRadialGradient(cx, cy * 0.9, 0, cx, cy, Math.max(W, H) * 0.75);
      g.addColorStop(0, '#173b44');
      g.addColorStop(0.55, '#0a1d23');
      g.addColorStop(1, '#030709');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      blob(ctx, W * 0.15, H * 0.3, W * 0.7, 'rgba(255,120,40,0.35)');
      blob(ctx, W * 0.9, H * 0.75, W * 0.6, 'rgba(40,160,190,0.25)');
      // god rays
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 6; i++) {
        const a = -0.9 + i * 0.12 + Math.sin(t * 0.4 + i) * 0.02;
        ctx.save();
        ctx.translate(W * 0.05, -H * 0.05);
        ctx.rotate(a + Math.PI / 2 - 0.4);
        const rg = ctx.createLinearGradient(0, 0, 0, H * 1.3);
        rg.addColorStop(0, 'rgba(255,170,90,0.18)');
        rg.addColorStop(1, 'rgba(255,170,90,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(-20 * u * (1 + i % 3), 0, 40 * u * (1 + i % 3), H * 1.3);
        ctx.restore();
      }
      ctx.restore();
      const r = (sq ? 200 : 240) * u * zoom;
      tiltLogo(ctx, (rr) => {
        ctx.beginPath();
        ctx.arc(0, 0, rr * 1.06, 0, Math.PI * 2);
        const rim = ctx.createLinearGradient(-rr, -rr, rr, rr);
        rim.addColorStop(0, GOLD[0]);
        rim.addColorStop(0.5, GOLD[2]);
        rim.addColorStop(1, GOLD[3]);
        ctx.fillStyle = rim;
        ctx.fill();
        drawLogo(ctx, d, 0, 0, rr, {});
      }, cx, cy - (sq ? 10 : 30) * u, r, t, { tilt: 0.12, glow: 'rgba(255,150,60,0.6)', glowBlur: 70 * u });
      flare(ctx, flareX, cy - r * 0.9, W, H, u * 1.1, 0.9);
      dust(1);
    };

    if (shot === 0) titleCard(c.open, 400);
    else if (shot === 1) {
      ctx.save();
      ctx.globalAlpha = fadeIn;
      logoShot(lerp(1.0, 1.12, easeInOutQuint(sp)), lerp(-W * 0.2, W * 1.2, sp));
      ctx.restore();
      const a = easeOutExpo(p01(sp, 0.25, 0.6)) * (1 - p01(sp, 0.88, 1));
      ctx.save();
      ctx.globalAlpha = a;
      tracked(ctx, name, cx, H - bar - (sq ? 70 : 110) * u, (sq ? 40 : 48) * u, 0.3, W * 0.84, 400, '#e8dcc4');
      ctx.restore();
    } else if (shot === 2) titleCard(c.mid, 700);
    else if (shot === 3) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#071a20');
      g.addColorStop(1, '#020506');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      lightLeak(ctx, W, H, t, 0.5, 'warm');
      const stats = statsOf(d);
      const half = sp < 0.5 ? 0 : 1;
      const st = stats[half % Math.max(1, stats.length)];
      const lp = half ? (sp - 0.5) * 2 : sp * 2;
      const a = easeOutExpo(p01(lp, 0, 0.25)) * (1 - easeInOutQuint(p01(lp, 0.85, 1)));
      ctx.save();
      ctx.globalAlpha = a;
      const push = 1 + lp * 0.05;
      ctx.translate(cx, cy);
      ctx.scale(push, push);
      if (st) {
        const v = statText(st, easeOutExpo(p01(lp, 0.05, 0.7)));
        const label = st.label === 'MARKET CAP' ? 'MARKET CAP' : st.label === '24H' ? 'IN 24 HOURS' : st.label;
        tracked(ctx, label, 0, -(sq ? 110 : 140) * u, (sq ? 34 : 40) * u, 0.5, W * 0.8, 400, '#cfc3ad');
        const fs = fitFont(ctx, v, W * 0.84, (sq ? 150 : 170) * u, (s) => CZ(s, 900));
        ctx.font = CZ(fs, 900);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.shadowColor = 'rgba(255,150,60,0.5)';
        ctx.shadowBlur = 40 * u;
        ctx.fillStyle = goldGrad(ctx, fs * 0.35, fs);
        ctx.fillText(v, 0, fs * 0.35);
        ctx.shadowBlur = 0;
        tracked(ctx, half ? 'AND RISING' : 'AND COUNTING', 0, (sq ? 120 : 160) * u, (sq ? 28 : 34) * u, 0.6, W * 0.8, 400, '#8fa7ab');
      } else {
        tracked(ctx, 'THE CHART', 0, -40 * u, 110 * u, 0.2, W * 0.84, 700);
        tracked(ctx, 'IS WAITING', 0, 100 * u, 110 * u, 0.2, W * 0.84, 700);
      }
      ctx.restore();
      dust(0.6);
    } else if (shot === 4) {
      blob(ctx, cx, cy, W * 0.8, 'rgba(25,55,62,0.5)');
      const q = d.tagline || 'Every holder has a story.';
      ctx.save();
      ctx.globalAlpha = fadeIn * (1 - easeInOutQuint(p01(sp, 0.85, 1)));
      ctx.translate(cx, cy);
      const push = 1 + sp * 0.05;
      ctx.scale(push, push);
      ctx.font = `italic 400 ${(sq ? 50 : 60) * u}px "Playfair Display"`;
      let fs = (sq ? 50 : 60) * u;
      let lines = wrapText(ctx, '“' + q + '”', W * 0.78, 4);
      while (lines.length > 3 && fs > 24 * u) { fs *= 0.9; ctx.font = `italic 400 ${fs}px "Playfair Display"`; lines = wrapText(ctx, '“' + q + '”', W * 0.78, 4); }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#efe6d2';
      lines.slice(0, 3).forEach((ln, i) => ctx.fillText(ln, 0, (i - (Math.min(3, lines.length) - 1) / 2) * fs * 1.3 - 20 * u));
      tracked(ctx, '— THE COMMUNITY', 0, (Math.min(3, lines.length) / 2) * fs * 1.3 + 50 * u, (sq ? 26 : 30) * u, 0.4, W * 0.7, 400, '#b49a6a');
      ctx.restore();
      dust(0.7);
    } else if (shot === 5) {
      // rapid montage: 3 micro-cuts
      const m = Math.min(2, Math.floor(sp * 3));
      if (m === 1) {
        ctx.fillStyle = '#020405';
        ctx.fillRect(0, 0, W, H);
        ctx.save();
        const k = 1 + (sp * 3 - 1) * 0.1;
        ctx.translate(cx, cy);
        ctx.scale(k, k);
        const fs = fitFont(ctx, T_, W * 0.9, (sq ? 220 : 240) * u, (s) => CZ(s, 900));
        ctx.font = CZ(fs, 900);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = goldGrad(ctx, fs * 0.2, fs);
        ctx.fillText(T_, 0, 0);
        ctx.restore();
        flare(ctx, lerp(W * 0.1, W * 0.9, (sp * 3) % 1), cy - 60 * u, W, H, u, 0.7);
      } else {
        logoShot(m === 0 ? 1.45 : 1.75, m === 0 ? W * 0.8 : W * 0.25);
      }
      // beat flash on each micro-cut
      const fl = Math.exp(-((sp * 3) % 1) * 9);
      ctx.fillStyle = `rgba(255,240,220,${0.5 * fl})`;
      ctx.fillRect(0, 0, W, H);
    } else {
      // final title
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.7);
      g.addColorStop(0, '#10262c');
      g.addColorStop(1, '#020405');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      const top = bar + (sq ? 80 : 270) * u;
      const lp = easeOutExpo(p01(T, 9.6, 10.6));
      const lr = (sq ? 72 : 110) * u;
      ctx.save();
      ctx.globalAlpha = lp;
      tiltLogo(ctx, (rr) => {
        ctx.beginPath();
        ctx.arc(0, 0, rr * 1.07, 0, Math.PI * 2);
        ctx.fillStyle = GOLD[1];
        ctx.fill();
        drawLogo(ctx, d, 0, 0, rr, {});
      }, cx, top + lr, lr, t, { tilt: 0.1, glow: 'rgba(255,170,80,0.5)', glowBlur: 50 * u, shadow: false });
      ctx.restore();
      // metallic name, wrapped
      const np = easeOutExpo(p01(T, 9.75, 10.9));
      ctx.save();
      ctx.globalAlpha = np;
      let fs = (sq ? 110 : 130) * u;
      ctx.font = CZ(fs, 900);
      let lines = wrapText(ctx, name, W * 0.86, 2);
      while (lines.some((l) => ctx.measureText(l).width > W * 0.86) && fs > 30 * u) { fs *= 0.94; ctx.font = CZ(fs, 900); lines = wrapText(ctx, name, W * 0.86, 2); }
      if (lines.length > 1) { fs = Math.min(fs, (sq ? 80 : 96) * u); ctx.font = CZ(fs, 900); lines = wrapText(ctx, name, W * 0.86, 2); while (lines.some((l) => ctx.measureText(l).width > W * 0.86) && fs > 30 * u) { fs *= 0.94; ctx.font = CZ(fs, 900); } }
      const ny = top + lr * 2 + (sq ? 50 : 80) * u;
      const scale = lerp(1.08, 1, np);
      ctx.translate(cx, ny);
      ctx.scale(scale, scale);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 20 * u;
      lines.forEach((ln, i) => {
        const y = i * fs * 1.08;
        const gg = ctx.createLinearGradient(0, y, 0, y + fs);
        gg.addColorStop(0, GOLD[0]);
        gg.addColorStop(0.5, GOLD[1]);
        gg.addColorStop(0.56, GOLD[2]);
        gg.addColorStop(1, GOLD[3]);
        ctx.fillStyle = gg;
        ctx.fillText(ln, 0, y);
      });
      ctx.restore();
      const nameH = lines.length * fs * 1.08;
      // flare sweep across title
      const fx = lerp(-W * 0.2, W * 1.2, easeInOutQuint(p01(T, 10.0, 11.4)));
      flare(ctx, fx, ny + fs * 0.45, W, H, u * 0.9, 0.8 * np);
      const sy = ny + nameH + (sq ? 40 : 60) * u;
      const ap = easeOutExpo(p01(T, 10.4, 11.0));
      ctx.save();
      ctx.globalAlpha = ap;
      tracked(ctx, T_ + '  ·  NOW TRADING', cx, sy + 30 * u, (sq ? 30 : 36) * u, 0.35, W * 0.84, 700, '#e8dcc4');
      tracked(ctx, shortLink(d.link, d.address).toUpperCase(), cx, sy + (sq ? 80 : 100) * u, (sq ? 20 : 24) * u, 0.12, W * 0.84, 400, '#9fb3b6');
      ctx.restore();
      // billing block
      const bp = easeOutExpo(p01(T, 10.7, 11.3));
      ctx.save();
      ctx.globalAlpha = bp * 0.75;
      const by = H - bar - (sq ? 70 : 120) * u;
      ctx.translate(cx, by);
      ctx.scale(0.62, 1);
      ctx.font = CZ((sq ? 26 : 30) * u, 400);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#b8b2a6';
      const bill1 = `A VIBE/VIBE PRODUCTION  ·  STARRING ${T_}  ·  ${d.holders ? d.holders + ' HOLDERS' : 'THE HOLDERS'}`;
      const bill2 = 'ROBINHOOD CHAIN TESTNET  ·  NOT FINANCIAL ADVICE  ·  DYOR';
      const mw = (W * 0.9) / 0.62;
      const f1 = fitFont(ctx, bill1, mw, (sq ? 26 : 30) * u, (s) => CZ(s, 400));
      ctx.font = CZ(f1, 400);
      ctx.fillText(bill1, 0, 0);
      const f2 = fitFont(ctx, bill2, mw, (sq ? 26 : 30) * u, (s) => CZ(s, 400));
      ctx.font = CZ(f2, 400);
      ctx.fillText(bill2, 0, 40 * u);
      ctx.restore();
      dust(0.7);
    }
    // cut-to-black blink at each cut (not into the montage)
    const blink = 1 - easeOutExpo(p01(sp * (s1 - s0), 0, 0.18));
    if (shot > 0 && shot !== 5 && blink > 0) {
      ctx.fillStyle = `rgba(0,0,0,${blink})`;
      ctx.fillRect(0, 0, W, H);
    }
    vignette(ctx, W, H, 0.6, 0.35);
    grain(ctx, W, H, t, 0.12);
    // flicker
    ctx.fillStyle = `rgba(0,0,0,${0.03 + 0.03 * Math.sin(t * 47)})`;
    ctx.fillRect(0, 0, W, H);
    // letterbox
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, bar);
    ctx.fillRect(0, H - bar, W, bar);
    watermark(ctx, W, H, u);
    if (bar > 10) {
      ctx.save();
      ctx.font = `500 ${18 * u}px Inter`;
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('TESTNET · NOT FINANCIAL ADVICE', cx, H - bar / 2);
      ctx.restore();
    }
  },
};
