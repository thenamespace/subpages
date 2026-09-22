"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
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
import { PARENT_NAME } from "@/lib/config";
import { labelErrorMessage, validateLabel } from "@/lib/normalize";
import { preloadRoar, unlockAudio } from "@/lib/roar";
import { RecordsStep } from "./RecordsStep";
import { EMPTY_RECORDS, toMintRecords, type FormRecords } from "@/lib/records";
import { __resetListingCache } from "@/lib/listing";
import type { PreviewState } from "@/lib/preview";

export function ClaimCard({ preview }: { preview: PreviewState | null }) {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  const listing = useListing(preview);
  const { quota, refresh, registerLocalMint } = useQuota(preview);
  const { state: mintState, mint, reset } = useMint(registerLocalMint);

  const [raw, setRaw] = useState("");
  // "name" -> pick a label, "records" -> optional profile before claiming.
  const [stage, setStage] = useState<"name" | "records">("name");
  const [records, setRecords] = useState<FormRecords>(EMPTY_RECORDS);

  // Validate on every keystroke but only surface the message once the user has
  // typed enough to have meant something — flagging "too short" at one
  // character is scolding them for typing.
  const validated = useMemo(() => validateLabel(raw), [raw]);
  const label = validated.ok ? validated.label : null;
  const validationError =
    !validated.ok && raw.trim().length >= 2
      ? labelErrorMessage(validated.error)
      : null;

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
    onRetry: handleRetry,
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
              name={mintState.mintedName ?? `yourname.evmaverick.eth`}
              txHash={mintState.txHash}
              canClaimMore={quota.remaining > 0}
              onClaimAnother={handleClaimAnother}
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
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <h2 className="font-display text-amber-300 text-xs uppercase">
                        Connect to claim
                      </h2>
                      <p className="text-ink-300 max-w-[52ch] text-sm leading-relaxed">
                        We check your wallet for an EVMavericks NFT. One name
                        per NFT — hold three, claim three.
                      </p>
                    </div>
                    <PixelButton onClick={() => openConnectModal?.()}>
                      Connect wallet
                    </PixelButton>
                  </div>
                ) : (
                  <>
                    <QuotaPips quota={quota} />

                    <LabelInput
                      value={raw}
                      onChange={setRaw}
                      onSubmit={() => canSubmit && setStage("records")}
                      availability={availability}
                      validationError={validationError}
                      disabled={isBusy}
                    />

                    <div className="flex flex-col gap-3">
                      <PixelButton
                        onClick={() => setStage("records")}
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
                          Waiting for the transaction to confirm. Safe to leave
                          this tab open.
                        </p>
                      )}

                      {address && step === "idle" && (
                        <p className="text-ink-500 text-center text-xs">
                          Claiming to {address.slice(0, 6)}…{address.slice(-4)}
                        </p>
                      )}
                    </div>

                    {/* Overlays the form rather than replacing it, so the
                        chosen name stays visible behind the editor. */}
                    <RecordsStep
                      open={stage === "records"}
                      records={records}
                      onRecordsChange={setRecords}
                      onBack={() => setStage("name")}
                      onContinue={() => label && startMint(label)}
                      busy={isBusy}
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
