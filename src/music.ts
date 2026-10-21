// Tiny procedural beat generator (WebAudio OfflineAudioContext). No samples, no licenses needed.
export type MusicStyle = 'hype' | 'chill' | 'trap' | 'news' | 'chip' | 'epic' | 'lux' | 'cyber';

const SR = 48000;
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export async function renderMusic(style: MusicStyle, bpm: number, duration: number, seed = 1): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(2, Math.ceil(SR * duration), SR);
  const master = ctx.createGain();
  const mg = style === 'chip' ? 1.9 : style === 'lux' ? 1.4 : 0.9;
  master.gain.value = mg;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  comp.attack.value = 0.003;
  comp.release.value = 0.15;
  master.connect(comp).connect(ctx.destination);
  // fades
  master.gain.setValueAtTime(0, 0);
  master.gain.linearRampToValueAtTime(mg, 0.04);
  master.gain.setValueAtTime(mg, Math.max(0.05, duration - 0.9));
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
  const tone = (t: number, note: number, len: number, type: OscillatorType, vol: number, cutoff = 2400, detune = 0, attack = 0.005, q = 0.7) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = midi(note);
    o.detune.value = detune;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = q;
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

  const tom = (t: number, f0: number, vol = 0.6) => kick(t, f0, f0 * 0.55, 0.35, vol);
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
  } else if (style === 'news') {
    // urgent broadcast theme, D minor: Dm Bb F C
    const prog = [[62, 65, 69], [58, 62, 65], [57, 60, 65], [55, 60, 64]];
    const roots = [38, 34, 41, 36];
    for (let i = 0; i < steps; i++) {
      const t = i * s16;
      const bar = Math.floor(i / 16) % 4;
      const st = i % 16;
      hat(t, st % 4 === 0 ? 0.1 : 0.05);
      if (st % 4 === 0) kick(t, 130, 45, 0.3, 0.75);
      if (st === 0 || st === 8) { tom(t, 180, 0.45); tom(t + s16, 140, 0.35); }
      if (st === 4 || st === 12) snare(t, 0.3);
      if (st % 2 === 0) tone(t, roots[bar], s16 * 1.8, 'sawtooth', 0.16, 700);
      if (st === 0 || st === 6 || st === 12) for (const n of prog[bar]) { tone(t, n, s16 * 2.6, 'sawtooth', 0.045, 2600, -10, 0.01); tone(t, n + 12, s16 * 2.6, 'sawtooth', 0.03, 2600, 10, 0.01); }
      if (st === 14 && bar === 3) tone(t, 81, s16 * 2, 'square', 0.04, 5000);
    }
  } else if (style === 'chip') {
    // 8-bit: C G Am F, square lead + triangle bass + noise drums
    const prog = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]];
    const mel = [0, 2, 1, 2, 0, 1, 2, 1];
    for (let i = 0; i < steps; i++) {
      const t = i * s16;
      const bar = Math.floor(i / 16) % 4;
      const st = i % 16;
      if (st % 8 === 0) noiseHit(t, 'lowpass', 400, 0.12, 0.7);
      if (st % 8 === 4) noiseHit(t, 'bandpass', 3000, 0.1, 0.35);
      if (st % 2 === 0) tone(t, prog[bar][0] - 24 + (st % 4 === 2 ? 12 : 0), s16 * 1.5, 'triangle', 0.3, 3000);
      const n = prog[bar][mel[(st + bar) % 8]] + 12 + (st % 8 === 6 ? 12 : 0);
      if (st % 2 === 0 || st % 8 === 7) tone(t, n, s16 * 1.2, 'square', 0.06, 6000);
      tone(t, prog[bar][st % 3] + 24, s16 * 0.6, 'square', 0.018, 7000);
    }
  } else if (style === 'epic') {
    // slow launch: Em C G D, big drums, opening pad
    const prog = [[52, 55, 59], [48, 52, 55], [55, 59, 62], [50, 54, 57]];
    const bars = Math.ceil(steps / 16);
    for (let b = 0; b < bars; b++) {
      const t = b * 16 * s16;
      const open = 600 + 3000 * (b / Math.max(1, bars - 1));
      for (const n of prog[b % 4]) { tone(t, n, 16 * s16, 'sawtooth', 0.04, open, -7, 0.6); tone(t, n + 12, 16 * s16, 'sawtooth', 0.03, open, 7, 0.6); }
      sub808(t, prog[b % 4][0] - 24, 16 * s16 * 0.8, 0.5);
    }
    for (let i = 0; i < steps; i++) {
      const t = i * s16;
      const st = i % 16;
      if (st === 0) kick(t, 110, 35, 0.8, 1);
      if (st === 8) { snare(t, 0.45); tom(t, 120, 0.4); }
      if (st === 14) tom(t, 160, 0.35);
      if (st === 15) tom(t, 120, 0.35);
      if (st % 4 === 2) hat(t, 0.06, true);
    }
    // countdown beeps
    for (let k = 0; k < 3; k++) tone(0.35 + k * 0.8 * (duration / 12), 84, 0.18, 'sine', 0.12, 8000);
    tone(0.35 + 3 * 0.8 * (duration / 12), 91, 0.5, 'sine', 0.14, 8000);
  } else if (style === 'lux') {
    // velvet lounge: Ebmaj7 Cm7 Abmaj7 Bb6, e-piano + soft groove
    const prog = [[51, 55, 58, 62], [48, 51, 55, 58], [44, 48, 51, 55], [46, 50, 53, 55]];
    for (let i = 0; i < steps; i++) {
      const t = i * s16;
      const bar = Math.floor(i / 16) % 4;
      const st = i % 16;
      if (st === 0 || st === 6) for (const n of prog[bar]) { tone(t, n + 12, s16 * 7, 'sine', 0.06, 3000, 0, 0.004); tone(t, n + 24, s16 * 3, 'sine', 0.015, 4000, 0, 0.004); }
      if (st === 0 || st === 10) kick(t, 90, 40, 0.4, 0.55);
      if (st === 8) noiseHit(t, 'bandpass', 2200, 0.09, 0.18, 2);
      if (st % 2 === 1) hat(t, 0.025);
      if (st % 4 === 0) tone(t, prog[bar][0] - 12, s16 * 3.5, 'sine', 0.22, 800, 0, 0.01);
    }
  } else if (style === 'cyber') {
    // dark techno: four-on-floor + resonant acid bass
    const line = [0, 0, 12, 0, 3, 0, 15, 0, 0, 7, 0, 12, 5, 0, 10, 3];
    const roots = [33, 33, 36, 31];
    for (let i = 0; i < steps; i++) {
      const t = i * s16;
      const bar = Math.floor(i / 16) % 4;
      const st = i % 16;
      if (st % 4 === 0) kick(t, 140, 42, 0.32, 0.95);
      if (st % 4 === 2) hat(t, 0.12, true);
      else hat(t, 0.035);
      if (st === 4 || st === 12) noiseHit(t, 'bandpass', 1500, 0.12, 0.25, 1.5);
      const cut = 500 + 2500 * (0.5 + 0.5 * Math.sin((i / 64) * Math.PI * 2));
      tone(t, roots[bar] + line[st] + 12, s16 * 0.9, 'sawtooth', 0.14, cut, 0, 0.003, 9);
      if (st === 15 && bar % 2) tone(t, 96, s16, 'square', 0.03, 9000);
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
