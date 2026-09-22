"use client";

import { createContext, useContext } from "react";
import { useSound } from "@/hooks/useSound";

interface SoundContextValue {
  enabled: boolean;
  toggle: () => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);

/**
 * The toggle lives in the header and the roar fires from the success card, so
 * the preference has to be shared. One small context beats threading a bool
 * through the page and the claim card.
 */
export function SoundProvider({ children }: { children: React.ReactNode }) {
  const sound = useSound();
  return (
    <SoundContext.Provider value={sound}>{children}</SoundContext.Provider>
  );
}

export function useSoundContext() {
  const ctx = useContext(SoundContext);
  if (!ctx) {
    throw new Error("useSoundContext must be used inside <SoundProvider>");
  }
  return ctx;
}
