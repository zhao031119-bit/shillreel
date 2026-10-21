export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** progress of t inside [a,b] -> 0..1 */
export const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
export const easeInCubic = (x: number) => x * x * x;
export const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const easeOutBack = (x: number) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
export const easeOutElastic = (x: number) => {
  if (x === 0 || x === 1) return x;
  return Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
};

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const pick = <T,>(r: () => number, arr: T[]): T => arr[Math.floor(r() * arr.length) % arr.length];
/** deterministic hash noise for frame-based jitter */
export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** "1.2M" / "$12,345" / "0.0004" -> number | null */
export function parseNum(s: string): number | null {
  if (!s) return null;
  const m = s.replace(/[$,\s]/g, '').match(/^([+-]?\d*\.?\d+(?:e[+-]?\d+)?)([kmbt])?/i);
  if (!m) return null;
  let v = parseFloat(m[1]);
  if (!isFinite(v)) return null;
  const mult: Record<string, number> = { k: 1e3, m: 1e6, b: 1e9, t: 1e12 };
  if (m[2]) v *= mult[m[2].toLowerCase()];
  return v;
}

export function fmtCompact(v: number, decimals = 2): string {
  const a = Math.abs(v);
  if (a >= 1e12) return (v / 1e12).toFixed(decimals) + 'T';
  if (a >= 1e9) return (v / 1e9).toFixed(decimals) + 'B';
  if (a >= 1e6) return (v / 1e6).toFixed(decimals) + 'M';
  if (a >= 1e4) return (v / 1e3).toFixed(1) + 'K';
  return Math.round(v).toLocaleString('en-US');
}
export function fmtInt(v: number) {
  return Math.round(v).toLocaleString('en-US');
}
export function fmtPrice(v: number): string {
  if (v === 0) return '0';
  const a = Math.abs(v);
  if (a >= 1000) return fmtCompact(v);
  if (a >= 1) return v.toFixed(2);
  // keep 4 significant digits
  const d = Math.min(12, Math.ceil(-Math.log10(a)) + 3);
  return v.toFixed(d);
}

export interface Stat { label: string; value: number; fmt: (v: number) => string; prefix?: string; suffix?: string }

/** turns user-provided stats into a list of animatable stats */
export function statsOf(d: { price: string; mcap: string; holders: string; change: string }): Stat[] {
  const out: Stat[] = [];
  const mc = parseNum(d.mcap);
  if (mc != null) out.push({ label: 'MARKET CAP', value: mc, fmt: fmtCompact, prefix: '$' });
  const h = parseNum(d.holders);
  if (h != null) out.push({ label: 'HOLDERS', value: h, fmt: fmtInt });
  const p = parseNum(d.price);
  if (p != null) out.push({ label: 'PRICE', value: p, fmt: fmtPrice, prefix: '$' });
  const c = parseNum(d.change);
  if (c != null) out.push({ label: '24H', value: c, fmt: (v) => (v >= 0 ? '+' : '') + v.toFixed(Math.abs(c) < 10 ? 1 : 0), suffix: '%' });
  return out;
}

export function fitFont(ctx: CanvasRenderingContext2D, text: string, maxW: number, size: number, font: (s: number) => string, min = 10) {
  let s = size;
  ctx.font = font(s);
  while (s > min && ctx.measureText(text).width > maxW) {
    s *= 0.92;
    ctx.font = font(s);
  }
  return s;
}

export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines = 3): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur);
      cur = w;
      if (lines.length === maxLines) break;
    } else cur = test;
  }
  if (lines.length < maxLines && cur) lines.push(cur);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    let last = lines[maxLines - 1];
    while (ctx.measureText(last + '…').width > maxW && last.length) last = last.slice(0, -1);
    lines[maxLines - 1] = last.replace(/\s+$/, '') + '…';
  }
  return lines;
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const palette = ['#ff3d7f', '#7c5cff', '#00c2ff', '#2bd97c', '#ffb020', '#ff6b3d'];
export function drawLogo(
  ctx: CanvasRenderingContext2D,
  d: { logo: CanvasImageSource | null; logoW: number; logoH: number; ticker: string },
  cx: number, cy: number, r: number, opts: { ring?: string; ringW?: number; square?: boolean } = {}
) {
  ctx.save();
  ctx.beginPath();
  if (opts.square) roundRect(ctx, cx - r, cy - r, 2 * r, 2 * r, r * 0.28);
  else ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.save();
  ctx.clip();
  if (d.logo && d.logoW > 0) {
    // cover-fit
    const s = Math.max((2 * r) / d.logoW, (2 * r) / d.logoH);
    const w = d.logoW * s, h = d.logoH * s;
    ctx.fillStyle = '#fff';
    ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    ctx.drawImage(d.logo, cx - w / 2, cy - h / 2, w, h);
  } else {
    const t = d.ticker || '?';
    let hsh = 0;
    for (const ch of t) hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0;
    const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    g.addColorStop(0, palette[hsh % palette.length]);
    g.addColorStop(1, palette[(hsh + 2) % palette.length]);
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const txt = t.slice(0, 3).toUpperCase();
    ctx.font = `${r * (txt.length > 2 ? 0.62 : 0.8)}px Anton`;
    ctx.fillText(txt, cx, cy + r * 0.04);
  }
  ctx.restore();
  if (opts.ring) {
    ctx.lineWidth = opts.ringW ?? r * 0.08;
    ctx.strokeStyle = opts.ring;
    ctx.stroke();
  }
  ctx.restore();
}

/** short display form of a link */
export function shortLink(link: string, address: string): string {
  if (!link) return 'testnet.vibevibe.fun';
  let s = link.replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (address) s = s.replace(address, address.slice(0, 6) + '…' + address.slice(-4));
  else s = s.replace(/0x[a-fA-F0-9]{40}/, (m) => m.slice(0, 6) + '…' + m.slice(-4));
  return s;
}

/** beat helper: returns phase in [0,1) since last beat and beat index */
export function beat(t: number, bpm: number) {
  const b = (t * bpm) / 60;
  return { i: Math.floor(b), ph: b - Math.floor(b) };
}

export const FOOTER = 'TESTNET · NOT FINANCIAL ADVICE';

export const statText = (s: Stat, p = 1) => (s.prefix ?? '') + s.fmt(s.value * p) + (s.suffix ?? '');

/** small LRU-ish cache keyed by string */
export function memo<T>(max = 6) {
  const m = new Map<string, T>();
  return (key: string, make: () => T): T => {
    let v = m.get(key);
    if (v === undefined) {
      v = make();
      m.set(key, v);
      if (m.size > max) m.delete(m.keys().next().value as string);
    }
    return v;
  };
}

/** draws text left-aligned, shrinking to fit maxW; returns used font size */
export function fitText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, size: number, font: (s: number) => string) {
  const s = fitFont(ctx, text, maxW, size, font);
  ctx.fillText(text, x, y);
  return s;
}

/** finds the largest font size (<= size) at which text wraps into <= maxLines lines without truncation */
export function fitWrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number, size: number, minSize: number, font: (s: number) => string) {
  let s = size;
  for (; s > minSize; s *= 0.92) {
    ctx.font = font(s);
    const lines = wrapText(ctx, text, maxW, maxLines + 1);
    if (lines.length <= maxLines && lines.every((l) => ctx.measureText(l).width <= maxW)) return { lines, size: s };
  }
  ctx.font = font(minSize);
  return { lines: wrapText(ctx, text, maxW, maxLines), size: minSize };
}
