// Âm thanh tổng hợp bằng Web Audio API — không cần file.
let ctx: AudioContext | null = null;
let enabled = true;
let heartTimer: number | null = null;

export function setSound(on: boolean): void {
  enabled = on;
  if (!on) stopHeartbeat();
}

function ac(): AudioContext | null {
  if (!enabled) return null;
  try {
    if (!ctx) {
      const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Gọi trong sự kiện chạm đầu tiên để mở khóa âm thanh trên iOS. */
export function unlockAudio(): void {
  ac();
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.2, endFreq?: number, delay = 0): void {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, gain = 0.3, filterFreq = 1800, delay = 0): void {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + delay;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = filterFreq;
  f.Q.value = 0.7;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(c.destination);
  src.start(t);
}

export const sfx = {
  tick: () => tone(1400, 0.035, 'square', 0.06),
  knock: () => {
    tone(320, 0.08, 'triangle', 0.25, 140);
    noise(0.05, 0.15, 900);
  },
  crunch: () => {
    noise(0.22, 0.6, 1400);
    noise(0.12, 0.5, 3200, 0.04);
    tone(120, 0.25, 'sawtooth', 0.3, 50);
  },
  ting: () => {
    tone(1568, 0.6, 'sine', 0.18);
    tone(2093, 0.8, 'sine', 0.14, undefined, 0.09);
    tone(2637, 0.9, 'sine', 0.1, undefined, 0.18);
  },
  buzz: () => tone(110, 0.45, 'sawtooth', 0.22, 70),
  burp: () => {
    tone(140, 0.35, 'sawtooth', 0.18, 70);
    noise(0.3, 0.12, 300);
  },
  pick: () => {
    tone(660, 0.1, 'triangle', 0.15);
    tone(990, 0.18, 'triangle', 0.15, undefined, 0.08);
  },
  timerBeep: () => tone(880, 0.07, 'square', 0.08),
};

function beat(): void {
  tone(62, 0.16, 'sine', 0.5, 45);
  tone(58, 0.14, 'sine', 0.35, 42, 0.2);
}

export function startHeartbeat(): void {
  if (heartTimer !== null || !enabled) return;
  beat();
  heartTimer = window.setInterval(beat, 1100);
}

export function stopHeartbeat(): void {
  if (heartTimer !== null) clearInterval(heartTimer);
  heartTimer = null;
}

export function vibrate(ms: number | number[]): void {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* bỏ qua */
  }
}
