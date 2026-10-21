// Shared "premium" effects: grain, cheap blur (Safari-safe, no ctx.filter), kinetic type, flares.
import { clamp, memo, wrapText, fitFont } from './util';

export const easeOutExpo = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
export const easeInOutQuint = (x: number) => (x < 0.5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2);
export const easeInExpo = (x: number) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10));
export const easeOutQuint = (x: number) => 1 - Math.pow(1 - x, 5);
/** damped spring 0->1 with overshoot */
export const spring = (x: number, k = 7, damp = 4.5) => (x <= 0 ? 0 : 1 - Math.exp(-damp * x) * Math.cos(k * x));
export const p01 = (t: number, a: number, b: number) => clamp((t - a) / (b - a));

// ---------- grain ----------
const noiseCache = memo<HTMLCanvasElement>(2);
function noiseTile(mono = true) {
  return noiseCache('n' + mono, () => {
    const c = document.createElement('canvas');
    c.width = c.height = 192;
    const g = c.getContext('2d')!;
    const id = g.createImageData(192, 192);
    let s = 12345;
    for (let i = 0; i < id.data.length; i += 4) {
      s = (s * 16807) % 2147483647;
      const v = s % 256;
      id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
      id.data[i + 3] = 255;
    }
    g.putImageData(id, 0, 0);
    return c;
  });
}
export function grain(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, alpha = 0.06, mode: GlobalCompositeOperation = 'overlay') {
  const tile = noiseTile();
  const f = Math.floor(t * 24);
  const ox = (f * 73) % 192, oy = (f * 131) % 192;
  const pat = ctx.createPattern(tile, 'repeat')!;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = mode;
  ctx.translate(-ox, -oy);
  ctx.fillStyle = pat;
  const sc = Math.max(1, W / 1080);
  ctx.scale(sc, sc);
  ctx.fillRect(0, 0, (W + 192 * sc) / sc, (H + 192 * sc) / sc);
  ctx.restore();
}

// ---------- blur via down/up-sampling ----------
const bufs = memo<{ a: HTMLCanvasElement; b: HTMLCanvasElement }>(3);
export function blurRegion(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, factor = 12, clip?: () => void) {
  x = Math.max(0, Math.floor(x));
  y = Math.max(0, Math.floor(y));
  w = Math.min(ctx.canvas.width - x, Math.ceil(w));
  h = Math.min(ctx.canvas.height - y, Math.ceil(h));
  if (w < 4 || h < 4) return;
  const sw = Math.max(2, Math.round(w / factor)), sh = Math.max(2, Math.round(h / factor));
  const B = bufs(sw + 'x' + sh, () => {
    const a = document.createElement('canvas');
    const b = document.createElement('canvas');
    return { a, b };
  });
  B.a.width = sw * 2; B.a.height = sh * 2;
  B.b.width = sw; B.b.height = sh;
  const ga = B.a.getContext('2d')!, gb = B.b.getContext('2d')!;
  ga.imageSmoothingQuality = 'high';
  gb.imageSmoothingQuality = 'high';
  ga.drawImage(ctx.canvas, x, y, w, h, 0, 0, sw * 2, sh * 2);
  gb.drawImage(B.a, 0, 0, sw * 2, sh * 2, 0, 0, sw, sh);
  ga.clearRect(0, 0, sw * 2, sh * 2);
  ga.drawImage(B.b, 0, 0, sw, sh, 0, 0, sw * 2, sh * 2);
  ctx.save();
  if (clip) { clip(); ctx.clip(); }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(B.a, 0, 0, sw * 2, sh * 2, x, y, w, h);
  ctx.restore();
}

// ---------- soft blob / bokeh ----------
/** same colour with alpha 0 (avoids grey fringes when fading to transparent) */
export function clear(color: string): string {
  if (color.startsWith('#')) {
    const h = color.length === 4 ? color.slice(1).split('').map((c) => c + c).join('') : color.slice(1, 7);
    return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},0)`;
  }
  const m = color.match(/rgba?\(([^,]+),([^,]+),([^,)]+)/);
  return m ? `rgba(${m[1]},${m[2]},${m[3]},0)` : 'rgba(0,0,0,0)';
}
export function blob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, clear(color));
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  ctx.restore();
}
export function bokeh(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, a: number) {
  const g = ctx.createRadialGradient(x, y, r * 0.55, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a * 0.55})`);
  g.addColorStop(0.85, `rgba(${rgb},${a})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

// ---------- light leak & flare ----------
export function lightLeak(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, strength = 1, hue = 'warm') {
  const cols = hue === 'warm' ? ['255,140,40', '255,60,90', '255,210,120'] : ['80,160,255', '160,90,255', '120,240,255'];
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 3; i++) {
    const x = W * (0.5 + 0.6 * Math.sin(t * 0.35 + i * 2.1));
    const y = H * (0.5 + 0.55 * Math.cos(t * 0.27 + i * 1.7));
    blob(ctx, x, y, Math.max(W, H) * (0.45 + 0.1 * i), `rgba(${cols[i]},${0.35 * strength})`);
  }
  ctx.restore();
}
export function flare(ctx: CanvasRenderingContext2D, x: number, y: number, W: number, H: number, s: number, a = 1) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  blob(ctx, x, y, 260 * s, `rgba(255,230,200,${0.9 * a})`);
  blob(ctx, x, y, 60 * s, `rgba(255,255,255,${a})`);
  // anamorphic streak
  const g = ctx.createLinearGradient(x - W, y, x + W, y);
  g.addColorStop(0, 'rgba(90,160,255,0)');
  g.addColorStop(0.5, `rgba(150,200,255,${0.75 * a})`);
  g.addColorStop(1, 'rgba(90,160,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - W, y - 3 * s, 2 * W, 6 * s);
  // ghosts along the axis to center
  const cx = W / 2, cy = H / 2;
  [0.4, 0.75, 1.3, 1.7].forEach((k, i) => {
    const gx = x + (cx - x) * k * 2, gy = y + (cy - y) * k * 2;
    blob(ctx, gx, gy, (30 + i * 22) * s, `rgba(${i % 2 ? '120,255,200' : '255,150,120'},${0.18 * a})`);
  });
  ctx.restore();
}

// ---------- kinetic type ----------
export interface KineticOpts {
  font: (s: number) => string;
  size: number;
  maxW: number;
  maxLines?: number;
  minSize?: number;
  lineH?: number; // multiple of size
  align?: 'center' | 'left';
  start: number; // time of first word
  stagger: number; // per word (or per letter if letters)
  dur: number;
  letters?: boolean;
  style?: 'rise' | 'pop' | 'blur' | 'slide';
  fill: string | CanvasGradient | ((i: number) => string | CanvasGradient);
  stroke?: { color: string; w: number };
  shadow?: { color: string; blur: number; y?: number };
  out?: [number, number]; // fade/rise-out window
}
/** Lays out text into lines (auto-shrinking), then reveals word-by-word (or letter-by-letter). Returns block height. */
export function kinetic(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, T: number, o: KineticOpts) {
  const maxLines = o.maxLines ?? 3;
  let s = o.size;
  let lines: string[] = [];
  for (; s > (o.minSize ?? o.size * 0.35); s *= 0.93) {
    ctx.font = o.font(s);
    lines = wrapText(ctx, text, o.maxW, maxLines + 1);
    if (lines.length <= maxLines && lines.every((l) => ctx.measureText(l).width <= o.maxW)) break;
  }
  ctx.font = o.font(s);
  if (lines.length > maxLines) lines = wrapText(ctx, text, o.maxW, maxLines);
  if (lines.length === 1 && ctx.measureText(lines[0]).width > o.maxW) s = fitFont(ctx, lines[0], o.maxW, s, o.font);
  const lh = s * (o.lineH ?? 1.08);
  const total = lh * lines.length;
  let idx = 0;
  const outP = o.out ? easeInOutQuint(p01(T, o.out[0], o.out[1])) : 0;
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  lines.forEach((ln, li) => {
    const lw = ctx.measureText(ln).width;
    let cx = o.align === 'left' ? x : x - lw / 2;
    const by = y - total / 2 + lh * (li + 0.8);
    const units = o.letters ? [...ln] : ln.split(/(\s+)/);
    for (const unit of units) {
      const uw = ctx.measureText(unit).width;
      if (!unit.trim()) { cx += uw; continue; }
      const p = p01(T, o.start + idx * o.stagger, o.start + idx * o.stagger + o.dur);
      idx++;
      if (p <= 0) { cx += uw; continue; }
      const e = easeOutExpo(p);
      ctx.save();
      let dy = 0, sc = 1, a = clamp(p * 2.2);
      const st = o.style ?? 'rise';
      if (st === 'rise') {
        // masked rise from below the baseline
        ctx.beginPath();
        ctx.rect(cx - s, by - s * 1.1, uw + 2 * s, s * 1.45);
        ctx.clip();
        dy = (1 - e) * s * 1.1;
        a = 1;
      } else if (st === 'pop') {
        sc = spring(p * 1.4, 9, 5);
      } else if (st === 'slide') {
        ctx.translate((1 - e) * s * 0.8, 0);
      } else if (st === 'blur') {
        dy = (1 - e) * s * 0.25;
        a = e;
      }
      dy -= outP * s * 0.6;
      ctx.globalAlpha *= a * (1 - outP);
      ctx.translate(cx + uw / 2, by + dy - s * 0.35);
      ctx.scale(sc, sc);
      ctx.translate(-uw / 2, s * 0.35);
      if (o.shadow) {
        ctx.shadowColor = o.shadow.color;
        ctx.shadowBlur = o.shadow.blur;
        ctx.shadowOffsetY = o.shadow.y ?? 0;
      }
      if (o.stroke) {
        ctx.lineJoin = 'round';
        ctx.lineWidth = o.stroke.w;
        ctx.strokeStyle = o.stroke.color;
        ctx.strokeText(unit, 0, 0);
        ctx.shadowColor = 'transparent';
      }
      ctx.fillStyle = typeof o.fill === 'function' ? o.fill(idx - 1) : o.fill;
      ctx.fillText(unit, 0, 0);
      ctx.restore();
      cx += uw;
    }
  });
  ctx.restore();
  return total;
}

/** logo with fake 3D tilt (perspective-ish skew), glow and moving specular highlight */
export function tiltLogo(
  ctx: CanvasRenderingContext2D,
  draw: (r: number) => void,
  cx: number, cy: number, r: number, t: number,
  o: { tilt?: number; glow?: string; glowBlur?: number; spec?: boolean; shadow?: boolean } = {}
) {
  const tx = Math.sin(t * 1.1) * (o.tilt ?? 0.18);
  const ty = Math.cos(t * 0.9) * (o.tilt ?? 0.18) * 0.6;
  ctx.save();
  if (o.shadow !== false) {
    // soft contact shadow
    const g = ctx.createRadialGradient(cx, cy + r * 1.15, 0, cx, cy + r * 1.15, r * 1.1);
    g.addColorStop(0, 'rgba(0,0,0,0.35)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.save();
    ctx.translate(cx, cy + r * 1.15);
    ctx.scale(1, 0.22);
    ctx.translate(-cx, -(cy + r * 1.15));
    ctx.fillRect(cx - r * 1.2, cy, r * 2.4, r * 2.4);
    ctx.restore();
  }
  ctx.translate(cx, cy);
  ctx.transform(1 - Math.abs(tx) * 0.35, ty * 0.25, tx * 0.25, 1 - Math.abs(ty) * 0.3, 0, 0);
  if (o.glow) {
    ctx.shadowColor = o.glow;
    ctx.shadowBlur = o.glowBlur ?? r * 0.5;
  }
  draw(r);
  ctx.shadowBlur = 0;
  if (o.spec !== false) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.clip();
    const sx = Math.sin(t * 0.8) * r * 1.6;
    const g = ctx.createLinearGradient(sx - r * 0.5, -r, sx + r * 0.5, r);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.32)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = g;
    ctx.fillRect(-r, -r, 2 * r, 2 * r);
    // rim light
    const rim = ctx.createRadialGradient(-r * 0.35, -r * 0.45, r * 0.2, 0, 0, r);
    rim.addColorStop(0, 'rgba(255,255,255,0.18)');
    rim.addColorStop(0.7, 'rgba(255,255,255,0)');
    rim.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = rim;
    ctx.fillRect(-r, -r, 2 * r, 2 * r);
    ctx.restore();
  }
  ctx.restore();
}

export function vignette(ctx: CanvasRenderingContext2D, W: number, H: number, a = 0.55, inner = 0.45) {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * inner, W / 2, H / 2, Math.hypot(W, H) * 0.6);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${a})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}
