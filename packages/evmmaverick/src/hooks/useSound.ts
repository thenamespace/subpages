"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "evmaverick:sound";
const EVENT = "evmaverick:sound-change";

/**
 * Sound on/off, remembered per browser.
 *
 * Defaults to on. The roar only fires on a deliberate, celebratory action the
 * user just paid gas for, which is about the only time unprompted audio is
 * welcome — and it's one click to silence, permanently.
 *
 * localStorage is browser state, not React state, so it's read through
 * `useSyncExternalStore` rather than synced into `useState` from an effect.
 * That gives a real server snapshot (no hydration mismatch) and keeps every
 * tab in agreement via the `storage` event.
 */

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  // Fires when another tab writes the key.
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    // Private mode or blocked storage — fall back to the default.
    return true;
  }
}

// The server can't know the preference; assume on so markup matches the
// common case, and let the client correct it on hydration.
const getServerSnapshot = () => true;

export function useSound() {
  const enabled = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const toggle = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, enabled ? "off" : "on");
    } catch {
      // The preference just won't survive a reload.
    }
    // `storage` doesn't fire in the tab that wrote it, so tell ourselves.
    window.dispatchEvent(new Event(EVENT));
  }, [enabled]);

  return { enabled, toggle };
}
