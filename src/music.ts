// Tiny procedural beat generator (WebAudio OfflineAudioContext). No samples, no licenses needed.
export type MusicStyle = 'hype' | 'chill' | 'trap';

const SR = 48000;
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export async function renderMusic(style: MusicStyle, bpm: number, duration: number, seed = 1): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(2, Math.ceil(SR * duration), SR);
  const master = ctx.createGain();
  master.gain.value = 0.9;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  comp.attack.value = 0.003;
  comp.release.value = 0.15;
  master.connect(comp).connect(ctx.destination);
  // fades
  master.gain.setValueAtTime(0, 0);
  master.gain.linearRampToValueAtTime(0.9, 0.04);
  master.gain.setValueAtTime(0.9, Math.max(0.05, duration - 0.9));
  master.gain.linearRampToValueAtTime(0, duration);

  const noise = ctx.createBuffer(1, SR, SR);
  {
    const d = noise.getChannelData(0);
    let s = seed * 9301 + 49297;
    for (let i = 0; i < d.length; i++) {
      s = (s * 9301 + 49297) % 233280;
      d[i] = (s / 233280) * 2 - 1;
    }
  }

  const beat = 60 / bpm;
  const kick = (t: number, f0 = 150, f1 = 42, dec = 0.42, vol = 1) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + 0.11);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dec);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dec + 0.05);
  };
  const noiseHit = (t: number, type: BiquadFilterType, freq: number, dec: number, vol: number, q = 0.8) => {
    const s = ctx.createBufferSource();
    s.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dec);
    s.connect(f).connect(g).connect(master);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dec + 0.02);
  };
  const snare = (t: number, vol = 0.5) => {
    noiseHit(t, 'bandpass', 1900, 0.2, vol, 0.7);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
    g.gain.setValueAtTime(vol * 0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.15);
  };
  const hat = (t: number, vol = 0.12, open = false) => noiseHit(t, 'highpass', 8000, open ? 0.18 : 0.045, vol);
  const tone = (t: number, note: number, len: number, type: OscillatorType, vol: number, cutoff = 2400, detune = 0, attack = 0.005) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = midi(note);
    o.detune.value = detune;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(cutoff, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(200, cutoff * 0.3), t + len);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    o.connect(f).connect(g).connect(master);
    o.start(t);
    o.stop(t + len + 0.05);
  };
  const sub808 = (t: number, note: number, len: number, vol = 0.8, glideFrom?: number) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    if (glideFrom != null) {
      o.frequency.setValueAtTime(midi(glideFrom), t);
      o.frequency.exponentialRampToValueAtTime(midi(note), t + 0.08);
    } else o.frequency.value = midi(note);
    const sh = ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = (i / 1023) * 2 - 1;
      curve[i] = Math.tanh(x * 2.5);
    }
    sh.curve = curve;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    o.connect(sh).connect(g).connect(master);
    o.start(t);
    o.stop(t + len + 0.05);
  };

  const steps = Math.ceil(duration / (beat / 4));
  const s16 = beat / 4;

  if (style === 'hype') {
    // A minor: Am F C G
    const prog = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
    const roots = [45, 41, 48, 43];
    for (let i = 0; i < steps; i++) {
      const t = i * s16;
      const bar = Math.floor(i / 16) % 4;
      const st = i % 16;
      if (st % 4 === 0) kick(t);
      if (st === 4 || st === 12) snare(t, 0.35);
      if (st % 4 === 2) hat(t, 0.14, true);
      else hat(t, 0.06);
      // offbeat pumping bass
      if (st % 4 === 2) tone(t, roots[bar], s16 * 1.6, 'sawtooth', 0.22, 900);
      // stab chords
      if (st === 0 || st === 3 || st === 6 || st === 10) for (const n of prog[bar]) { tone(t, n + 12, s16 * 1.4, 'sawtooth', 0.05, 3500, -8); tone(t, n + 12, s16 * 1.4, 'sawtooth', 0.05, 3500, 8); }
      // arp
      const ar = prog[bar][st % 3] + 24;
      if (st % 2 === 1) tone(t, ar, s16 * 0.9, 'square', 0.025, 4000);
    }
  } else if (style === 'chill') {
    // Fmaj7 Em7 Dm7 Cmaj7
    const prog = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]];
    const bars = Math.ceil(steps / 16);
    for (let b = 0; b < bars; b++) {
      const t = b * 16 * s16;
      for (const n of prog[b % 4]) {
        tone(t, n, 16 * s16, 'sawtooth', 0.035, 1100, -6, 0.4);
        tone(t, n, 16 * s16, 'sawtooth', 0.035, 1100, 6, 0.4);
      }
      tone(t, prog[b % 4][0] - 12, 16 * s16 * 0.9, 'sine', 0.3, 600, 0, 0.02);
    }
    for (let i = 0; i < steps; i++) {
      const t = i * s16;
      const st = i % 16;
      const bar = Math.floor(i / 16) % 4;
      if (st === 0 || st === 10) kick(t, 120, 45, 0.35, 0.8);
      if (st === 4 || st === 12) noiseHit(t, 'bandpass', 2600, 0.08, 0.25, 2); // rim
      if (st % 2 === 0) hat(t, st % 4 === 2 ? 0.07 : 0.04);
      if (st % 3 === 0) tone(t, prog[bar][(st / 3) % 4] + 24, s16 * 2.5, 'triangle', 0.05, 5000);
    }
  } else {
    // trap, half-time, C minor: Cm Ab Eb Bb
    const roots = [36, 32, 39, 34];
    const bell = [[60, 63, 67], [56, 60, 63], [63, 67, 70], [58, 62, 65]];
    for (let i = 0; i < steps; i++) {
      const t = i * s16;
      const bar = Math.floor(i / 16) % 4;
      const st = i % 16;
      if (st === 0 || st === 7 || st === 10) { kick(t, 160, 40, 0.3, 0.7); sub808(t, roots[bar], st === 0 ? 0.9 : 0.45, 0.7, st === 10 ? roots[bar] + 12 : undefined); }
      if (st === 8) snare(t, 0.55);
      // hats with rolls
      if (st >= 12 && bar % 2 === 1) {
        hat(t, 0.09);
        hat(t + s16 / 2, 0.07);
      } else if (st % 2 === 0) hat(t, 0.1);
      if (st % 4 === 0) tone(t, bell[bar][(st / 4) % 3] + 12, s16 * 3, 'triangle', 0.07, 6000);
    }
  }
  return ctx.startRendering();
}
