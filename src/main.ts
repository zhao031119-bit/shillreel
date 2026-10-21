import '@fontsource/anton/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import '@fontsource/inter/900.css';
import '@fontsource/press-start-2p/400.css';
import '@fontsource/playfair-display/400.css';
import '@fontsource/playfair-display/400-italic.css';
import '@fontsource/playfair-display/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
import '@fontsource/jetbrains-mono/800.css';
import './style.css';
import type { TokenData, RenderOpts, Template } from './types';
import { TEMPLATES } from './templates';
import { renderMusic } from './music';
import { exportVideo } from './encoder';
import { autoFill, extractAddress, VIBE } from './token';
import { makeCopy, xLength, llmHook } from './copy';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const data: TokenData = {
  name: '', ticker: '', tagline: '', logo: null, logoW: 0, logoH: 0,
  price: '', mcap: '', holders: '', change: '', link: '', address: '',
};
const state = {
  tpl: TEMPLATES[0] as Template,
  fmt: '9:16' as '9:16' | '1:1',
  duration: 12,
  music: true,
  seed: Math.floor(Math.random() * 1e6),
  copySeed: Math.floor(Math.random() * 1e6),
  playing: true,
  sound: false,
};

const dims = () => (state.fmt === '9:16' ? { W: 1080, H: 1920 } : { W: 1080, H: 1080 });
const opts = (scale = 1): RenderOpts => {
  const { W, H } = dims();
  return { W: Math.round(W * scale), H: Math.round(H * scale), duration: state.duration, seed: state.seed, bpm: state.tpl.bpm };
};

// ---------- form binding ----------
const fields = ['name', 'ticker', 'tagline', 'price', 'mcap', 'holders', 'change', 'link'] as const;
function readForm() {
  for (const f of fields) (data as any)[f] = ($<HTMLInputElement>(f).value || '').trim();
  data.ticker = data.ticker.replace(/^\$/, '').toUpperCase();
  data.address = extractAddress(data.link) || data.address;
  $('tagCount').textContent = `${data.tagline.length}/110`;
  thumbsDirty = true;
  refreshCopy();
}
for (const f of fields) $(f).addEventListener('input', readForm);

function setLogoFromBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    data.logo = img;
    data.logoW = img.naturalWidth || 512;
    data.logoH = img.naturalHeight || 512;
    $<HTMLImageElement>('logoPrev').src = url;
    thumbsDirty = true;
  };
  img.src = url;
}
$<HTMLInputElement>('logo').addEventListener('change', (e) => {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (f) setLogoFromBlob(f);
});
$('logoClear').addEventListener('click', () => {
  data.logo = null;
  $<HTMLImageElement>('logoPrev').removeAttribute('src');
  $<HTMLInputElement>('logo').value = '';
});

// ---------- auto-fill ----------
async function doFill() {
  const src = $<HTMLInputElement>('src').value.trim();
  const st = $('fillStatus');
  const btn = $<HTMLButtonElement>('fill');
  btn.disabled = true;
  st.className = 'hint';
  try {
    const r = await autoFill(src, (s) => (st.textContent = s));
    const set = (id: string, v?: string) => { if (v != null && v !== '') $<HTMLInputElement>(id).value = v; };
    set('name', r.name);
    set('ticker', r.symbol);
    if (r.holders != null) set('holders', String(r.holders));
    if (r.description) set('tagline', r.description.slice(0, 110));
    set('link', r.link);
    data.address = r.address;
    if (r.logo) setLogoFromBlob(r.logo);
    readForm();
    st.className = 'hint ok';
    st.textContent = `✓ Loaded ${r.name ?? ''} ($${r.symbol ?? ''})${r.logo ? ' with logo' : ''}. Price & market cap aren't public via API — add them manually if you want.` + (r.notes.length ? ' ' + r.notes.join(' ') : '');
  } catch (e: any) {
    st.className = 'hint err';
    st.textContent = e?.message || String(e);
  } finally {
    btn.disabled = false;
  }
}
$('fill').addEventListener('click', doFill);
$('src').addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter') doFill(); });

// ---------- template / option pickers ----------
const tplWrap = $('templates');
for (const t of TEMPLATES) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'tpl' + (t === state.tpl ? ' on' : '');
  b.dataset.id = t.id;
  b.innerHTML = `<canvas class="thumb" width="108" height="192" style="background:linear-gradient(135deg,${t.swatch.join(',')})"></canvas><div><b>${t.name}</b><small>${t.blurb}</small></div>`;
  b.onclick = () => {
    state.tpl = t;
    tplWrap.querySelectorAll('.tpl').forEach((x) => x.classList.toggle('on', x === b));
    restartAudio();
  };
  tplWrap.appendChild(b);
}
// live thumbnails rendered with the current token data
let thumbsDirty = true;
let lastThumb = 0;
function drawThumbs(now: number) {
  if (!thumbsDirty || now - lastThumb < 700) return;
  thumbsDirty = false;
  lastThumb = now;
  tplWrap.querySelectorAll<HTMLButtonElement>('.tpl').forEach((b) => {
    const tpl = TEMPLATES.find((x) => x.id === b.dataset.id)!;
    const cv = b.querySelector('canvas')!;
    const o: RenderOpts = { W: 108, H: 192, duration: 12, seed: state.seed, bpm: tpl.bpm };
    try {
      tpl.draw(cv.getContext('2d')!, tpl.thumbT ?? 7, data, o);
    } catch (e) {
      console.error(e);
    }
  });
}

function segCtl(id: string, onPick: (v: string) => void) {
  const el = $(id);
  el.querySelectorAll('button').forEach((b) =>
    b.addEventListener('click', () => {
      el.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      onPick(b.dataset.v!);
    })
  );
}
segCtl('fmt', (v) => { state.fmt = v as any; sizePreview(); });
segCtl('dur', (v) => { state.duration = +v; t0 = performance.now(); restartAudio(); });
$<HTMLInputElement>('music').addEventListener('change', (e) => { state.music = (e.target as HTMLInputElement).checked; restartAudio(); });
$('shuffle').addEventListener('click', () => { state.seed = Math.floor(Math.random() * 1e6); thumbsDirty = true; t0 = performance.now(); restartAudio(); });

// ---------- preview loop ----------
const pv = $<HTMLCanvasElement>('preview');
const pctx = pv.getContext('2d')!;
const PREVIEW_SCALE = 0.5;
function sizePreview() {
  const o = opts(PREVIEW_SCALE);
  pv.width = o.W;
  pv.height = o.H;
  pv.classList.toggle('sq', state.fmt === '1:1');
}
let t0 = performance.now();
let pausedAt = 0;
function frame() {
  const o = opts(PREVIEW_SCALE);
  const t = state.playing ? ((performance.now() - t0) / 1000) % o.duration : pausedAt;
  if (state.playing) pausedAt = t;
  drawThumbs(performance.now());
  try {
    state.tpl.draw(pctx, t, data, o);
  } catch (e) {
    console.error(e);
  }
  requestAnimationFrame(frame);
}
$('play').addEventListener('click', () => {
  state.playing = !state.playing;
  if (state.playing) t0 = performance.now() - pausedAt * 1000;
  $('play').textContent = state.playing ? '⏸ Pause' : '▶ Play';
  restartAudio();
});
$('sound').addEventListener('click', () => {
  state.sound = !state.sound;
  $('sound').textContent = state.sound ? '🔊 Sound on' : '🔇 Sound off';
  restartAudio();
});

// ---------- audio ----------
const musicCache = new Map<string, Promise<AudioBuffer>>();
function getMusic(): Promise<AudioBuffer> {
  const k = `${state.tpl.music}|${state.tpl.bpm}|${state.duration}`;
  if (!musicCache.has(k)) musicCache.set(k, renderMusic(state.tpl.music, state.tpl.bpm, state.duration));
  return musicCache.get(k)!;
}
let actx: AudioContext | null = null;
let src: AudioBufferSourceNode | null = null;
async function restartAudio() {
  try { src?.stop(); } catch { /* */ }
  src = null;
  if (!state.sound || !state.music || !state.playing) return;
  actx ??= new AudioContext();
  await actx.resume();
  const buf = await getMusic();
  if (!state.sound || !state.playing) return;
  const now = performance.now();
  const off = (((now - t0) / 1000) % state.duration);
  src = actx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.connect(actx.destination);
  src.start(0, off);
}

// ---------- export ----------
let lastUrl = '';
$('export').addEventListener('click', async () => {
  readForm();
  const btn = $<HTMLButtonElement>('export');
  const prog = $('progress');
  const bar = prog.firstElementChild as HTMLElement;
  const st = $('exportStatus');
  btn.disabled = true;
  prog.hidden = false;
  st.className = 'hint center';
  st.textContent = 'Rendering frames…';
  const started = performance.now();
  try {
    await document.fonts.ready;
    const o = opts(1);
    const audio = state.music ? await getMusic() : null;
    const tpl = state.tpl;
    const res = await exportVideo({
      W: o.W, H: o.H, fps: 30, duration: o.duration, audio,
      draw: (ctx, t) => tpl.draw(ctx, t, data, o),
      allowOpus: new URLSearchParams(location.search).get('audio') === 'opus',
      onProgress: (p) => (bar.style.width = (p * 100).toFixed(1) + '%'),
    });
    if (lastUrl) URL.revokeObjectURL(lastUrl);
    lastUrl = URL.createObjectURL(res.blob);
    const v = $<HTMLVideoElement>('out');
    v.src = lastUrl;
    const fname = `${(data.ticker || 'token').toLowerCase()}-${tpl.id}-${state.fmt === '9:16' ? '9x16' : '1x1'}.${res.ext}`;
    const a = $<HTMLAnchorElement>('dl');
    a.href = lastUrl;
    a.download = fname;
    a.textContent = `⬇ Download ${res.ext.toUpperCase()}`;
    const file = new File([res.blob], fname, { type: res.mime });
    const sh = $('share');
    sh.hidden = !(navigator.canShare && navigator.canShare({ files: [file] }));
    sh.onclick = () => navigator.share({ files: [file], text: $<HTMLTextAreaElement>('copy').value }).catch(() => {});
    $('result').hidden = false;
    const secs = ((performance.now() - started) / 1000).toFixed(1);
    st.className = 'hint center ok';
    st.textContent = `✓ ${res.ext.toUpperCase()} ready (${(res.blob.size / 1e6).toFixed(1)} MB, rendered in ${secs}s).` + (res.note ? ' ' + res.note : '');
  } catch (e: any) {
    console.error(e);
    st.className = 'hint center err';
    st.textContent = 'Export failed: ' + (e?.message || e);
  } finally {
    btn.disabled = false;
    setTimeout(() => (prog.hidden = true), 600);
  }
});

// ---------- post copy ----------
let llmText: string | undefined;
function refreshCopy() {
  const txt = makeCopy(data, state.copySeed, llmText);
  const ta = $<HTMLTextAreaElement>('copy');
  ta.value = txt;
  updateCopyMeta();
}
function updateCopyMeta() {
  const txt = $<HTMLTextAreaElement>('copy').value;
  const n = xLength(txt);
  $('copyLen').textContent = `${n}/280`;
  $('copyLen').className = 'hint' + (n > 280 ? ' err' : '');
  $<HTMLAnchorElement>('toX').href = 'https://x.com/intent/post?text=' + encodeURIComponent(txt);
}
$('copy').addEventListener('input', updateCopyMeta);
$('regen').addEventListener('click', async () => {
  state.copySeed = Math.floor(Math.random() * 1e6);
  llmText = await llmHook(data); // no-op unless LLM_ENDPOINT is configured
  refreshCopy();
});
$('copyBtn').addEventListener('click', async () => {
  await navigator.clipboard?.writeText($<HTMLTextAreaElement>('copy').value).catch(() => {});
  $('copyBtn').textContent = 'Copied ✓';
  setTimeout(() => ($('copyBtn').textContent = 'Copy'), 1200);
});

// ---------- boot ----------
async function boot() {
  sizePreview();
  readForm();
  await Promise.all(
    ['400 40px Anton', '600 20px Inter', '700 20px Inter', '800 20px Inter', '900 20px Inter', 'italic 900 20px Inter', '400 20px "Press Start 2P"', '400 20px "Playfair Display"', 'italic 400 20px "Playfair Display"', '700 20px "Playfair Display"', '400 20px "JetBrains Mono"', '700 20px "JetBrains Mono"', '800 20px "JetBrains Mono"'].map((f) => document.fonts.load(f).catch(() => []))
  );
  thumbsDirty = true;
  requestAnimationFrame(frame);
  const q = new URLSearchParams(location.search);
  const tok = q.get('t') || q.get('token');
  if (tok) {
    $<HTMLInputElement>('src').value = tok.startsWith('0x') ? `${VIBE}/token/${tok}` : tok;
    doFill();
  }
  const tp = q.get('tpl');
  if (tp) (tplWrap.querySelector(`[data-id="${tp}"]`) as HTMLButtonElement | null)?.click();
}
boot();
(window as any).shillreel = { renderMusic, state, data, TEMPLATES };
