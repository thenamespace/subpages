"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useRouter } from "next/navigation";
import { PixelPanel } from "@/components/ui/PixelPanel";
import { PixelButton } from "@/components/ui/PixelButton";
import { gateNotice } from "./GateNotice";
import { LabelInput } from "./LabelInput";
import { QuotaPips } from "./QuotaPips";
import { SuccessCard } from "./SuccessCard";
import { useAvailability } from "@/hooks/useAvailability";
import { useListing } from "@/hooks/useListing";
import { useMint } from "@/hooks/useMint";
import { useQuota } from "@/hooks/useQuota";
import { GATE_TOKEN_NAME, PARENT_NAME } from "@/lib/config";
import { validateLabel } from "@/lib/normalize";
import { playRoar, preloadRoar, unlockAudio } from "@/lib/roar";
import { useSoundContext } from "@/components/SoundProvider";
import { RecordsStep } from "./RecordsStep";
import { EMPTY_RECORDS, toMintRecords, type FormRecords } from "@/lib/records";
import { __resetListingCache } from "@/lib/listing";
import type { PreviewState } from "@/lib/preview";

export function ClaimCard({ preview }: { preview: PreviewState | null }) {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const router = useRouter();

  const listing = useListing(preview);
  const { quota, refresh, registerLocalMint } = useQuota(preview);
  const { enabled: soundEnabled } = useSoundContext();
  // Read through a ref: the mint closure is captured at click time, and a
  // mute toggled while the transaction is pending should still be honoured.
  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // Runs only after the mint's receipt comes back with status "success" —
  // never on page load, a preview, a click or a record edit. This is the one
  // place the page makes a sound.
  const handleMinted = useCallback(() => {
    registerLocalMint();
    if (soundEnabledRef.current) void playRoar();
  }, [registerLocalMint]);

  const { state: mintState, mint, reset } = useMint(handleMinted);

  const [raw, setRaw] = useState("");
  // "name" -> pick a label, "records" -> optional profile before claiming.
  const [stage, setStage] = useState<"name" | "records">("name");
  const [records, setRecords] = useState<FormRecords>(EMPTY_RECORDS);

  // Validated on every keystroke; LabelInput decides when to show it, so
  // "too short" waits for a pause instead of scolding the first keystroke.
  const validated = useMemo(() => validateLabel(raw), [raw]);
  const label = validated.ok ? validated.label : null;
  const labelError =
    !validated.ok && validated.error !== "empty" ? validated.error : null;

  const availability = useAvailability(label);

  // Preview states drive the visible step directly so every screen is
  // reachable without a wallet.
  const step =
    preview === "success"
      ? "success"
      : preview === "minting"
        ? "pending"
        : mintState.step;

  const handleRetry = useCallback(() => {
    __resetListingCache();
    refresh();
  }, [refresh]);

  const handleClaimAnother = useCallback(() => {
    reset();
    setRaw("");
    setStage("name");
    setRecords(EMPTY_RECORDS);
  }, [reset]);

  // A node when something blocks claiming, null when the form should show.
  const blocked = gateNotice({
    listing,
    quota,
    connected: isConnected || Boolean(preview),
    preview: Boolean(preview),
    onRetry: handleRetry,
    onManage: () => router.push("/manage"),
  });

  // Browsers only grant audio permission during a user gesture, and the roar
  // plays minutes later when the transaction confirms. Creating the context
  // here, on the click, is what makes that legal.
  const startMint = useCallback(
    (value: string) => {
      unlockAudio();
      // Decode while the transaction is in flight so the roar is instant.
      preloadRoar();
      void mint(value, toMintRecords(records));
    },
    [mint, records],
  );

  const isBusy = step === "signing" || step === "pending";
  const canSubmit =
    Boolean(label) &&
    availability.status === "available" &&
    quota.status === "ready" &&
    !isBusy;

  return (
    <PixelPanel className="w-full max-w-lg p-6 sm:p-8">
      <AnimatePresence mode="wait" initial={false}>
        {step === "success" ? (
          <motion.div key="success" exit={{ opacity: 0 }}>
            <SuccessCard
              name={mintState.mintedName ?? `yourname.${PARENT_NAME}`}
              txHash={mintState.txHash}
              explorerUrl={mintState.explorerUrl}
              canClaimMore={quota.remaining > 0}
              onClaimAnother={handleClaimAnother}
              preview={Boolean(preview)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="claim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-6"
          >
            {blocked ?? (
              <>
                {!isConnected && !preview ? (
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                      <h2 className="font-display text-ink-100 text-xs uppercase">
                        Connect to claim
                      </h2>
                      <p className="text-ink-300 max-w-[52ch] text-sm leading-relaxed">
                        Use the wallet that holds your {GATE_TOKEN_NAME} NFT.
                      </p>
                    </div>
                    <PixelButton
                      onClick={() => openConnectModal?.()}
                      className="w-full"
                    >
                      Connect wallet
                    </PixelButton>
                  </div>
                ) : (
                  <>
                    {/* A real form, so Enter submits from the field natively. */}
                    <form
                      noValidate
                      className="flex flex-col gap-6"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (canSubmit) setStage("records");
                      }}
                    >
                      <LabelInput
                        value={raw}
                        onChange={setRaw}
                        availability={availability}
                        labelError={labelError}
                        fullName={label ? `${label}.${PARENT_NAME}` : null}
                        disabled={isBusy}
                        meta={<QuotaPips quota={quota} />}
                      />

                      <div className="flex flex-col gap-3">
                        <PixelButton
                          type="submit"
                          disabled={!canSubmit}
                          loading={isBusy}
                          className="w-full"
                        >
                          {step === "signing"
                            ? "Confirm in wallet"
                            : step === "pending"
                              ? "Claiming…"
                              : "Continue"}
                        </PixelButton>

                        {mintState.error && (
                          <p
                            role="alert"
                            className="text-rose-400 text-xs leading-relaxed"
                          >
                            {mintState.error}
                          </p>
                        )}

                        {step === "pending" && (
                          <p className="text-ink-400 text-center text-xs">
                            Waiting for the transaction to confirm. This can take
                            a minute.
                          </p>
                        )}

                        {address && step === "idle" && (
                          <p className="text-ink-400 text-center text-xs">
                            Claiming to {address.slice(0, 6)}…{address.slice(-4)}
                          </p>
                        )}
                      </div>
                    </form>

                    {/* Overlays the form rather than replacing it, so the
                        chosen name stays visible behind the editor. */}
                    <RecordsStep
                      open={stage === "records"}
                      records={records}
                      onRecordsChange={setRecords}
                      onBack={() => setStage("name")}
                      onContinue={() => label && startMint(label)}
                      step={step}
                      error={mintState.error}
                      fullName={`${label ?? "yourname"}.${PARENT_NAME}`}
                    />
                  </>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </PixelPanel>
  );
}
