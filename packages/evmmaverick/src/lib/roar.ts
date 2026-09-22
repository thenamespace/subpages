/**
 * The roar — the page's only sound, played once when a claim confirms.
 *
 * Source is `/roar.mp3`: a real lion, trimmed to the louder of the two roars
 * in the original recording, normalised, mono.
 *
 *   Source: "Lion raring-sound1TamilNadu178.ogg" by தகவலுழவன், via Wikimedia
 *   Commons, released into the public domain worldwide by the copyright
 *   holder. No attribution is legally required; it is here because it should
 *   be obvious where a shipped asset came from.
 *
 * If the file can't be fetched or decoded, the claim is simply silent.
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

const ROAR_URL = "/roar.mp3";

/** Decoded once, reused. `null` once a load has failed, so we stop retrying. */
let sample: AudioBuffer | null | undefined;
let loading: Promise<void> | null = null;

/**
 * Fetch and decode the sample. Called during the claim click alongside the
 * context unlock, so the audio is already decoded by the time a transaction
 * confirms and there is no gap before the roar.
 */
export function preloadRoar() {
  if (sample !== undefined || loading || !ctx) return;
  const context = ctx;
  loading = (async () => {
    try {
      const res = await fetch(ROAR_URL);
      if (!res.ok) throw new Error(String(res.status));
      sample = await context.decodeAudioData(await res.arrayBuffer());
    } catch {
      // Stay silent rather than failing loudly into a success screen.
      sample = null;
    } finally {
      loading = null;
    }
  })();
}

export interface RoarOptions {
  /** 0–1. Kept well below 1 by default; this fires without being asked for. */
  volume?: number;
}

/**
 * Play the roar. Only called when a mint's receipt comes back successful.
 * Safe to call when audio is unavailable or was never unlocked — it returns
 * silently rather than throwing into a success screen.
 */
export async function playRoar({ volume = 0.5 }: RoarOptions = {}) {
  if (!ctx) return;
  const context = ctx;

  // A context can drop back to suspended while the transaction is pending
  // (backgrounded tab, OS audio change). The claim click already granted
  // permission, so resuming here is allowed.
  if (context.state === "suspended") {
    try {
      await context.resume();
    } catch {
      return;
    }
  }
  if (context.state !== "running") return;

  // The sample is normally decoded long before the receipt arrives; if the
  // transaction was very fast, wait for the decode to finish.
  preloadRoar();
  if (loading) await loading;
  if (!sample) return;

  try {
    const source = context.createBufferSource();
    source.buffer = sample;
    const gain = context.createGain();
    gain.gain.value = volume;
    source.connect(gain).connect(context.destination);
    source.start();
  } catch {
    // Nothing to recover; the claim itself succeeded.
  }
}

/** How long the success card holds its flash — the length of the roar. */
export const ROAR_DURATION_MS = 1950;
