import type { Template, TokenData, RenderOpts } from '../types';
import { seg, easeOutBack, rng, pick, statsOf, statText, fitFont, roundRect, shortLink, memo, hash } from './util';
import { unit, footer, watermark } from './common';

const G = '#33ff66';
const DIM = '#1d8f3c';
const MONO = (s: number, w = 400) => `${w} ${s}px "JetBrains Mono"`;
const GLYPHS = '0123456789ABCDEF$#@%&*<>/\\|=+';

const asciiCache = memo<string[]>(8);
function asciiLogo(d: TokenData, cols: number, rows: number): string[] {
  const key = (d.logo ? (d.logo as any).src || 'img' : 'none:' + d.ticker) + cols + 'x' + rows;
  return asciiCache(key, () => {
    const cv = document.createElement('canvas');
    cv.width = cols;
    cv.height = rows;
    const g = cv.getContext('2d', { willReadFrequently: true })!;
    g.fillStyle = '#000';
    g.fillRect(0, 0, cols, rows);
    const r = Math.min(cols / 2, rows);
    g.save();
    g.scale(1, 0.5); // chars are ~2x taller than wide
    g.beginPath();
    g.arc(cols / 2, rows, r * 0.98, 0, Math.PI * 2);
    g.clip();
    if (d.logo && d.logoW) {
      const s = Math.max((2 * r) / d.logoW, (2 * r) / d.logoH);
      g.drawImage(d.logo, cols / 2 - (d.logoW * s) / 2, rows - (d.logoH * s) / 2, d.logoW * s, d.logoH * s);
    } else {
      g.fillStyle = '#888';
      g.fillRect(0, 0, cols, rows * 2);
      g.fillStyle = '#fff';
      g.font = `bold ${r * 0.9}px sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText((d.ticker || '?').slice(0, 2), cols / 2, rows);
    }
    g.restore();
    let px: Uint8ClampedArray;
    try {
      px = g.getImageData(0, 0, cols, rows).data;
    } catch {
      return [];
    }
    const ramp = ' .:-=+*#%@';
    const out: string[] = [];
    for (let y = 0; y < rows; y++) {
      let line = '';
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        const l = (0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2]) / 255;
        line += ramp[Math.min(ramp.length - 1, Math.floor(l * ramp.length))];
      }
      out.push(line);
    }
    return out;
  });
}

const cache = memo<{ host: string; verdict: string; cols: number[] }>();
function prep(d: TokenData, o: RenderOpts) {
  return cache(o.seed + '|' + d.ticker, () => {
    const r = rng(o.seed + 77);
    return {
      host: pick(r, ['anon@vibe', 'root@moonbase', 'degen@rhchain', 'ser@mainframe']),
      verdict: pick(r, ['BULLISH', 'SEND IT', 'BASED', 'WAGMI']),
      cols: Array.from({ length: 40 }, () => r()),
    };
  });
}

interface Line { at: number; text: string; type: 'cmd' | 'out' | 'ok' | 'hl' | 'ascii' | 'bar'; dur?: number }

export const terminal: Template = {
  id: 'terminal',
  name: 'Terminal / Hacker',
  blurb: 'Green scan report, ASCII logo, rain',
  bpm: 132,
  music: 'cyber',
  swatch: ['#000000', G, '#0b3d1a'],
  thumbT: 7,
  draw(ctx, t, d, o) {
    const { W, H } = o;
    const u = unit(W, H);
    const sq = W / H > 0.8;
    const c = prep(d, o);
    const T = (t * 12) / o.duration;
    const T_ = '$' + (d.ticker || 'TICKER').toUpperCase();
    const stats = statsOf(d);
    const fr = Math.floor(t * 30);

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    // matrix rain
    const fs = 30 * u;
    ctx.font = MONO(fs, 700);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const ncol = Math.floor(W / (fs * 0.9));
    for (let k = 0; k < ncol; k++) {
      const sp = 0.5 + c.cols[k % c.cols.length] * 1.2;
      const head = ((t * sp * 10 + c.cols[(k * 7) % c.cols.length] * 60) % (H / fs + 20)) - 10;
      for (let j = 0; j < 14; j++) {
        const y = (Math.floor(head) - j) * fs;
        if (y < 0 || y > H) continue;
        const ch = GLYPHS[Math.floor(hash(k * 131 + Math.floor(head) - j + Math.floor(t * 8) * (j === 0 ? 1 : 0)) * GLYPHS.length)];
        ctx.fillStyle = j === 0 ? 'rgba(200,255,210,0.5)' : `rgba(51,255,102,${0.22 * (1 - j / 14)})`;
        ctx.fillText(ch, k * fs * 0.9 + fs / 2, y);
      }
    }

    // terminal window
    const wx = 36 * u, wy = 100 * u, ww = W - 72 * u, wh = H - wy - 110 * u;
    const showTerm = T < 9.3;
    const fsz = (sq ? 26 : 34) * u;
    const lh = fsz * 1.45;
    if (showTerm) {
      ctx.save();
      roundRect(ctx, wx, wy, ww, wh, 16 * u);
      ctx.fillStyle = 'rgba(2,10,4,0.9)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(51,255,102,0.55)';
      ctx.lineWidth = 2.5 * u;
      ctx.stroke();
      ctx.fillStyle = 'rgba(51,255,102,0.12)';
      ctx.fillRect(wx, wy, ww, 54 * u);
      ['#ff5f57', '#febc2e', '#28c840'].forEach((col, i) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(wx + 34 * u + i * 34 * u, wy + 27 * u, 9 * u, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.font = MONO(22 * u, 700);
      ctx.fillStyle = DIM;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${c.host}: ~/scan`, wx + ww / 2, wy + 28 * u);

      // build script
      const addr = d.address ? d.address.slice(0, 8) + '…' + d.address.slice(-4) : T_.toLowerCase();
      const L: Line[] = [];
      let at = 0.3;
      const cmd = (text: string) => { L.push({ at, text, type: 'cmd', dur: text.length * 0.028 }); at += text.length * 0.028 + 0.2; };
      const out = (text: string, type: Line['type'] = 'out', gap = 0.16) => { L.push({ at, text, type }); at += gap; };
      cmd(`./scan --chain 46630 ${addr}`);
      out('[ok] rpc.testnet.chain.robinhood.com', 'ok');
      out('[ok] contract found · ERC-20', 'ok');
      out('');
      const pad = (k: string) => (k + ' ').padEnd(sq ? 10 : 11, '.') + ' ';
      out(pad('NAME') + (d.name || 'Token'), 'hl', 0.22);
      out(pad('TICKER') + T_, 'hl', 0.22);
      for (const s of stats) out(pad(s.label === 'MARKET CAP' ? 'MCAP' : s.label) + statText(s), 'hl', 0.22);
      at += 0.15;
      cmd('render --ascii logo');
      const art = asciiLogo(d, sq ? 34 : 36, sq ? 12 : 17);
      at = Math.max(at, 0);
      for (const a of art) out(a, 'ascii', 0.035);
      at += 0.1;
      cmd('analyze --vibes');
      L.push({ at, text: '', type: 'bar', dur: 0.9 });
      at += 1.0;
      out(`VERDICT: ${c.verdict}`, 'hl');
      // normalize so script ends by ~8.9
      const scale = 8.6 / at;

      const maxLines = Math.floor((wh - 90 * u) / lh);
      const visible: { l: Line; shown: string }[] = [];
      for (const l of L) {
        const st = l.at * scale;
        if (T < st) break;
        let shown = l.text;
        if (l.type === 'cmd') shown = l.text.slice(0, Math.floor(((T - st) / ((l.dur ?? 0.3) * scale)) * l.text.length));
        visible.push({ l, shown });
      }
      const startIdx = Math.max(0, visible.length - maxLines);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const x0 = wx + 30 * u;
      const maxW = ww - 60 * u;
      visible.slice(startIdx).forEach(({ l, shown }, i) => {
        const y = wy + 90 * u + i * lh;
        if (l.type === 'cmd') {
          ctx.font = MONO(fsz, 700);
          ctx.fillStyle = '#7dffa0';
          ctx.fillText('$', x0, y);
          ctx.fillStyle = '#e8ffe8';
          fitFont(ctx, l.text, maxW - fsz * 1.4, fsz, (s) => MONO(s, 700));
          ctx.fillText(shown, x0 + fsz * 1.2, y);
        } else if (l.type === 'ascii') {
          ctx.font = MONO(fsz * 0.95, 700);
          ctx.fillStyle = G;
          ctx.fillText(shown, x0 + 20 * u, y);
        } else if (l.type === 'bar') {
          const st = l.at * scale;
          const p = Math.min(1, (T - st) / ((l.dur ?? 1) * scale));
          const n = 20;
          const filled = Math.floor(p * n);
          ctx.font = MONO(fsz, 700);
          ctx.fillStyle = G;
          ctx.fillText('[' + '█'.repeat(filled) + '░'.repeat(n - filled) + '] ' + Math.floor(p * 100) + '%', x0, y);
        } else {
          ctx.fillStyle = l.type === 'ok' ? DIM : l.type === 'hl' ? G : '#9fdcae';
          fitFont(ctx, shown, maxW, fsz, (s) => MONO(s, l.type === 'hl' ? 800 : 400));
          ctx.fillText(shown, x0, y);
        }
      });
      // cursor
      const last = visible.length - startIdx;
      if (Math.floor(t * 2.5) % 2 === 0) {
        ctx.fillStyle = G;
        const cl = visible[visible.length - 1];
        let cx = x0;
        let cy = wy + 90 * u + Math.max(0, last - 1) * lh;
        if (cl && cl.l.type === 'cmd' && cl.shown.length < cl.l.text.length) {
          ctx.font = MONO(fsz, 700);
          cx = x0 + fsz * 1.2 + ctx.measureText(cl.shown).width;
        } else {
          cy += lh;
        }
        ctx.fillRect(cx, cy - fsz * 0.55, fsz * 0.6, fsz * 1.1);
      }
      ctx.restore();
    }

    // finale: ACCESS GRANTED -> ticker + link
    if (T >= 9.2) {
      const p = easeOutBack(seg(T, 9.15, 9.45));
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const bw = W * 0.84, bh = 140 * u;
      ctx.translate(W / 2, H * (sq ? 0.25 : 0.3));
      ctx.scale(p, p);
      ctx.fillStyle = G;
      ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
      ctx.fillStyle = '#000';
      fitFont(ctx, 'ACCESS GRANTED', bw - 60 * u, 80 * u, (s) => MONO(s, 800));
      ctx.fillText('ACCESS GRANTED', 0, 4 * u);
      ctx.restore();
      const tp = seg(T, 9.8, 10.1);
      if (tp > 0) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const y = H * (sq ? 0.5 : 0.48);
        const gl = (hash(fr) < 0.3 ? 1 : 0) * 12 * u;
        const s = fitFont(ctx, T_, W * 0.86, 190 * u, (x) => MONO(x, 800));
        ctx.font = MONO(s, 800);
        ctx.fillStyle = 'rgba(255,0,80,0.7)';
        ctx.fillText(T_, W / 2 - gl, y);
        ctx.fillStyle = 'rgba(0,200,255,0.7)';
        ctx.fillText(T_, W / 2 + gl, y);
        ctx.fillStyle = G;
        ctx.shadowColor = G;
        ctx.shadowBlur = 30 * u;
        ctx.fillText(T_, W / 2, y);
        ctx.shadowBlur = 0;
        const cmdTxt = '$ open ' + shortLink(d.link, d.address);
        const shown = cmdTxt.slice(0, Math.floor(seg(T, 10.2, 11.0) * cmdTxt.length));
        fitFont(ctx, cmdTxt, W * 0.88, 34 * u, (x) => MONO(x, 700));
        ctx.fillStyle = '#e8ffe8';
        ctx.fillText(shown.padEnd(cmdTxt.length, ' '), W / 2, y + (sq ? 150 : 190) * u);
        ctx.restore();
      }
    }

    // scanlines + glow vignette
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let y = 0; y < H; y += 5 * u) ctx.fillRect(0, y, W, 2 * u);
    // progress as text bar
    ctx.font = MONO(18 * u, 700);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = DIM;
    const n = 30;
    const f = Math.floor((t / o.duration) * n);
    ctx.fillText('[' + '#'.repeat(f) + '-'.repeat(n - f) + ']', 40 * u, 40 * u);
    watermark(ctx, W, H, u);
    footer(ctx, W, H, u, 'rgba(51,255,102,0.55)');
  },
};
