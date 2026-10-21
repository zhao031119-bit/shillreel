import { Muxer, ArrayBufferTarget } from 'mp4-muxer';

export interface ExportJob {
  W: number;
  H: number;
  fps: number;
  duration: number;
  draw: (ctx: CanvasRenderingContext2D, t: number) => void;
  audio: AudioBuffer | null;
  onProgress?: (p: number) => void;
  /** use Opus audio when AAC encoding is unavailable (plays in browsers, but X expects AAC) */
  allowOpus?: boolean;
  signal?: { cancelled: boolean };
}
export interface ExportResult { blob: Blob; mime: string; ext: string; note?: string }

const AVC_CODECS = ['avc1.640033', 'avc1.640028', 'avc1.4d0033', 'avc1.4d0028', 'avc1.42003e', 'avc1.42002a'];

export async function canWebCodecs(W: number, H: number, fps: number): Promise<string | null> {
  if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') return null;
  for (const codec of AVC_CODECS) {
    try {
      const r = await VideoEncoder.isConfigSupported({ codec, width: W, height: H, bitrate: 8_000_000, framerate: fps });
      if (r.supported) return codec;
    } catch { /* try next */ }
  }
  return null;
}

async function audioSupported(codec: string, sr: number, ch: number) {
  if (typeof AudioEncoder === 'undefined') return false;
  try {
    const r = await AudioEncoder.isConfigSupported({ codec, sampleRate: sr, numberOfChannels: ch, bitrate: 128000 });
    return !!r.supported;
  } catch {
    return false;
  }
}

export async function exportVideo(job: ExportJob): Promise<ExportResult> {
  const codec = await canWebCodecs(job.W, job.H, job.fps);
  if (codec) return exportMp4(job, codec);
  return exportRecorder(job);
}

async function exportMp4(job: ExportJob, codec: string): Promise<ExportResult> {
  const { W, H, fps, duration } = job;
  let acodec: 'aac' | 'opus' | null = null;
  if (job.audio) {
    const { sampleRate: sr, numberOfChannels: ch } = job.audio;
    if (await audioSupported('mp4a.40.2', sr, ch)) acodec = 'aac';
    else if (job.allowOpus && (await audioSupported('opus', sr, ch))) acodec = 'opus';
  }
  const withAudio = !!acodec;
  let note: string | undefined;
  if (job.audio && !acodec) note = 'This browser can’t encode AAC audio (e.g. Chrome on Linux), so the MP4 is silent. Use Chrome/Edge on Windows/macOS or Safari for music.';
  if (acodec === 'opus') note = 'Music encoded as Opus (no AAC in this browser) — X may reject it.';
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: 'avc', width: W, height: H, frameRate: fps },
    audio: acodec ? { codec: acodec, numberOfChannels: job.audio!.numberOfChannels, sampleRate: job.audio!.sampleRate } : undefined,
    fastStart: 'in-memory',
    firstTimestampBehavior: 'offset',
  });
  let err: unknown = null;
  const venc = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => (err = e),
  });
  venc.configure({ codec, width: W, height: H, bitrate: 8_000_000, framerate: fps, avc: { format: 'avc' } });

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: false })!;

  const total = Math.round(duration * fps);
  for (let i = 0; i < total; i++) {
    if (job.signal?.cancelled) { venc.close(); throw new Error('cancelled'); }
    if (err) throw err;
    job.draw(ctx, i / fps);
    const frame = new VideoFrame(canvas, { timestamp: Math.round((i * 1e6) / fps), duration: Math.round(1e6 / fps) });
    venc.encode(frame, { keyFrame: i % (fps * 2) === 0 });
    frame.close();
    while (venc.encodeQueueSize > 6) await new Promise((r) => setTimeout(r, 2));
    if (i % 5 === 0) {
      job.onProgress?.((i / total) * 0.95);
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  await venc.flush();
  venc.close();

  if (withAudio && job.audio) {
    const ab = job.audio;
    const aenc = new AudioEncoder({ output: (chunk, meta) => muxer.addAudioChunk(chunk, meta), error: (e) => (err = e) });
    aenc.configure({ codec: acodec === 'aac' ? 'mp4a.40.2' : 'opus', sampleRate: ab.sampleRate, numberOfChannels: ab.numberOfChannels, bitrate: 128000 });
    const chunk = 1024 * 4;
    const chans = Array.from({ length: ab.numberOfChannels }, (_, c) => ab.getChannelData(c));
    for (let off = 0; off < ab.length; off += chunk) {
      const n = Math.min(chunk, ab.length - off);
      const data = new Float32Array(n * ab.numberOfChannels);
      chans.forEach((ch, c) => data.set(ch.subarray(off, off + n), c * n));
      const ad = new AudioData({ format: 'f32-planar', sampleRate: ab.sampleRate, numberOfFrames: n, numberOfChannels: ab.numberOfChannels, timestamp: Math.round((off / ab.sampleRate) * 1e6), data });
      aenc.encode(ad);
      ad.close();
    }
    await aenc.flush();
    aenc.close();
  }
  if (err) throw err;
  muxer.finalize();
  job.onProgress?.(1);
  return { blob: new Blob([target.buffer], { type: 'video/mp4' }), mime: 'video/mp4', ext: 'mp4', note };
}

/** Fallback: real-time capture with MediaRecorder (WebM, or MP4 where supported). */
async function exportRecorder(job: ExportJob): Promise<ExportResult> {
  const { W, H, fps, duration } = job;
  if (typeof MediaRecorder === 'undefined') throw new Error('This browser supports neither WebCodecs nor MediaRecorder.');
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  job.draw(ctx, 0);
  const stream = canvas.captureStream(fps);
  let actx: AudioContext | null = null;
  if (job.audio) {
    actx = new AudioContext({ sampleRate: job.audio.sampleRate });
    const dest = actx.createMediaStreamDestination();
    const src = actx.createBufferSource();
    src.buffer = job.audio;
    src.connect(dest);
    dest.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
    src.start();
  }
  const types = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  const mime = types.find((m) => MediaRecorder.isTypeSupported(m)) || '';
  const rec = new MediaRecorder(stream, { mimeType: mime || undefined, videoBitsPerSecond: 8_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<void>((r) => (rec.onstop = () => r()));
  rec.start(250);
  const t0 = performance.now();
  await new Promise<void>((resolve) => {
    const tick = () => {
      const t = (performance.now() - t0) / 1000;
      if (t >= duration || job.signal?.cancelled) return resolve();
      job.draw(ctx, t);
      job.onProgress?.(t / duration);
      requestAnimationFrame(tick);
    };
    tick();
  });
  rec.stop();
  await done;
  actx?.close();
  const type = (rec.mimeType || mime || 'video/webm').split(';')[0];
  const ext = type.includes('mp4') ? 'mp4' : 'webm';
  return {
    blob: new Blob(chunks, { type }),
    mime: type,
    ext,
    note: ext === 'webm' ? 'Your browser lacks WebCodecs H.264, so this is a WebM recording. For X, open in Chrome/Edge/Safari 16.4+ to get MP4.' : undefined,
  };
}
