import { roundRect, FOOTER } from './util';

export const unit = (W: number, H: number) => Math.min(W / 1080, H / 1350);

export function footer(ctx: CanvasRenderingContext2D, W: number, H: number, u: number, color = 'rgba(255,255,255,0.55)') {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `600 ${24 * u}px Inter`;
  ctx.fillStyle = color;
  ctx.fillText(FOOTER, W / 2, H - 46 * u);
  ctx.restore();
}

/** small brand watermark (play-badge + name) */
export function watermark(ctx: CanvasRenderingContext2D, W: number, _H: number, u: number, dark = false) {
  ctx.save();
  const x = W - 40 * u, y = 64 * u;
  ctx.font = `800 ${26 * u}px Inter`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const tw = ctx.measureText('shillreel').width;
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = dark ? '#111' : '#fff';
  ctx.fillText('shillreel', x, y);
  const bx = x - tw - 44 * u;
  roundRect(ctx, bx, y - 17 * u, 34 * u, 34 * u, 8 * u);
  const g = ctx.createLinearGradient(bx, y - 17 * u, bx + 34 * u, y + 17 * u);
  g.addColorStop(0, '#b6ff3b');
  g.addColorStop(1, '#19e3ff');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.fillStyle = '#0b0d14';
  ctx.beginPath();
  ctx.moveTo(bx + 12 * u, y - 9 * u);
  ctx.lineTo(bx + 25 * u, y);
  ctx.lineTo(bx + 12 * u, y + 9 * u);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function progressBar(ctx: CanvasRenderingContext2D, W: number, u: number, p: number, color: string, bg = 'rgba(255,255,255,0.18)') {
  ctx.save();
  const x = 40 * u, y = 22 * u, w = W - 80 * u, h = 8 * u;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = bg;
  ctx.fill();
  roundRect(ctx, x, y, Math.max(h, w * p), h, h / 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

/** confetti burst; deterministic for given seed */
export function confetti(ctx: CanvasRenderingContext2D, W: number, H: number, u: number, t: number, seed: number, colors: string[], ox = W / 2, oy = H * 0.45) {
  if (t < 0) return;
  ctx.save();
  for (let i = 0; i < 90; i++) {
    const r1 = Math.sin((i + 1) * 12.9898 + seed) * 43758.5453;
    const a = (r1 - Math.floor(r1)) * Math.PI * 2;
    const r2 = Math.sin((i + 1) * 78.233 + seed) * 12345.678;
    const sp = (0.4 + (r2 - Math.floor(r2)) * 0.9) * 1400 * u;
    const x = ox + Math.cos(a) * sp * t;
    const y = oy + Math.sin(a) * sp * t + 900 * u * t * t;
    const rot = t * 8 + i;
    ctx.globalAlpha = Math.max(0, 1 - t / 2.2);
    ctx.fillStyle = colors[i % colors.length];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillRect(-10 * u, -5 * u, 20 * u, 10 * u);
    ctx.restore();
  }
  ctx.restore();
}

export function flash(ctx: CanvasRenderingContext2D, W: number, H: number, alpha: number, color = '#fff') {
  if (alpha <= 0.002) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
