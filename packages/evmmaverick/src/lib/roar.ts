/**
 * A lion roar, synthesised.
 *
 * No audio file: a roar sample would be someone else's recording with its own
 * licence, and this page ships a pixel lion with no other assets. The Web
 * Audio graph below costs nothing to download and is tuned by ear.
 *
 * The shape of a real roar, roughly:
 *   - a low fundamental that sags in pitch as the breath runs out
 *   - heavy harmonic distortion — the growl lives in the harmonics, not the
 *     fundamental
 *   - broadband noise for the rasp of air
 *   - a fast guttural flutter, the vocal folds slapping
 *
 * So: a detuned sawtooth pair gliding down, plus filtered noise, both through
 * a waveshaper, with a ~28Hz tremolo and a lowpass that opens on the attack
 * and closes as it dies.
 */

/** Browsers only allow audio after a user gesture, so the context is created
 *  on the click that starts a mint, not when the roar actually plays — which
 *  can be minutes later once the transaction confirms. */
let ctx: AudioContext | null = null;

type AudioContextCtor = typeof AudioContext;

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  // Safari only exposes the prefixed constructor.
  const w = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/**
 * Call this from inside a user gesture (the claim click). Creating and
 * resuming the context here is what buys us permission to make noise later,
 * after the await.
 */
export function unlockAudio() {
  const Ctor = getAudioContextCtor();
  if (!Ctor) return;
  try {
    ctx ??= new Ctor();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    // Audio is a garnish. If the context won't start, the mint still worked.
    ctx = null;
  }
}

/** Short burst of white noise, used for the breath/rasp layer. */
function noiseBuffer(context: AudioContext, seconds: number) {
  const length = Math.floor(context.sampleRate * seconds);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/**
 * Soft-clipping curve. Pushes energy into the upper harmonics without the
 * harsh fold-over of a hard clip — this is what turns a sawtooth into a growl
 * rather than a buzz.
 */
function growlCurve(amount = 24) {
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x));
  }
  return curve;
}

export interface RoarOptions {
  /** 0–1. Kept well below 1 by default; this fires without being asked for. */
  volume?: number;
}

/**
 * Play the roar. Safe to call when audio is unavailable or was never
 * unlocked — it returns silently rather than throwing into a success screen.
 */
export function playRoar({ volume = 0.22 }: RoarOptions = {}) {
  unlockAudio();
  if (!ctx) return;

  const t0 = ctx.currentTime;
  const duration = 1.5;

  // Master envelope: fast in, long ragged tail.
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, t0);
  master.gain.exponentialRampToValueAtTime(volume, t0 + 0.08);
  master.gain.setValueAtTime(volume, t0 + 0.55);
  master.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  master.connect(ctx.destination);

  // The growl.
  const shaper = ctx.createWaveShaper();
  shaper.curve = growlCurve();
  shaper.oversample = "2x";
  shaper.connect(master);

  // Lowpass opens on the attack, then shuts as the breath dies.
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(320, t0);
  lp.frequency.exponentialRampToValueAtTime(2400, t0 + 0.18);
  lp.frequency.exponentialRampToValueAtTime(420, t0 + duration);
  lp.Q.value = 1.4;
  lp.connect(shaper);

  // Guttural flutter — vocal folds. Subtle; at full depth it reads as a
  // broken speaker rather than an animal.
  const tremolo = ctx.createGain();
  tremolo.gain.value = 1;
  tremolo.connect(lp);

  const lfo = ctx.createOscillator();
  lfo.frequency.setValueAtTime(34, t0);
  lfo.frequency.linearRampToValueAtTime(19, t0 + duration);
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 0.34;
  lfo.connect(lfoDepth).connect(tremolo.gain);
  lfo.start(t0);
  lfo.stop(t0 + duration);

  // Two saws a little apart. The detune is what stops it sounding synthetic.
  for (const [detune, level] of [
    [0, 0.6],
    [-11, 0.4],
  ] as const) {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.detune.value = detune;
    // The sag: pitch climbs briefly on the push, then falls away.
    osc.frequency.setValueAtTime(128, t0);
    osc.frequency.exponentialRampToValueAtTime(164, t0 + 0.12);
    osc.frequency.exponentialRampToValueAtTime(68, t0 + duration);

    const g = ctx.createGain();
    g.gain.value = level;
    osc.connect(g).connect(tremolo);
    osc.start(t0);
    osc.stop(t0 + duration);
  }

  // Breath: bandpassed noise riding the same envelope.
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer(ctx, duration);

  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(900, t0);
  bp.frequency.exponentialRampToValueAtTime(420, t0 + duration);
  bp.Q.value = 0.8;

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.0001, t0);
  noiseGain.gain.exponentialRampToValueAtTime(0.5, t0 + 0.1);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration * 0.85);

  noise.connect(bp).connect(noiseGain).connect(tremolo);
  noise.start(t0);
  noise.stop(t0 + duration);
}

export const ROAR_DURATION_MS = 1500;
