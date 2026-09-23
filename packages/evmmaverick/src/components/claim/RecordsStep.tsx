"use client";

import { SelectRecordsForm } from "@/components/ens/client";
import { EnsScope } from "@/components/ens/EnsScope";
import { PixelButton } from "@/components/ui/PixelButton";
import { PixelDialog } from "@/components/ui/PixelDialog";
import { countRecords, type FormRecords } from "@/lib/records";
import type { MintStep } from "@/hooks/useMint";

/**
 * Optional profile step, shown between picking a name and claiming it.
 *
 * Setting records at mint time is one transaction; setting them afterwards is
 * a second one, so it's worth offering here — but never worth blocking on:
 * with no records set, the primary action is simply "Claim name".
 *
 * `SelectRecordsForm` is fully controlled and does no transacting of its own,
 * so the records live here and travel into the mint call. Its `actionButtons`
 * slot takes our own buttons, which is what keeps the pixel styling intact
 * through the library's UI.
 */
export function RecordsStep({
  open,
  records,
  onRecordsChange,
  onBack,
  onContinue,
  step,
  error,
  fullName,
}: {
  open: boolean;
  records: FormRecords;
  onRecordsChange: (next: FormRecords) => void;
  onBack: () => void;
  onContinue: () => void;
  step: MintStep;
  /** The mint error. Shown here too, since the dialog covers the card's. */
  error: string | null;
  fullName: string;
}) {
  const count = countRecords(records);
  const busy = step === "signing" || step === "pending";

  return (
    <PixelDialog
      open={open}
      // Closing mid-transaction would strand the user away from the progress,
      // so the dialog is held open while a claim is in flight.
      onOpenChange={(next) => {
        if (!next && !busy) onBack();
      }}
      title={fullName}
      description="Optional. Records you add now go into the claim transaction, so you only pay gas once."
    >
      <div className="flex flex-col gap-5">
        <EnsScope>
          <SelectRecordsForm
            records={records}
            onRecordsUpdated={onRecordsChange}
            // Without this the editor silently degrades to URL-only entry —
            // the upload UI is gated on having an upload context. The SIWE
            // signature proves control of the wallet, not ownership of the
            // name, which is why this works before the name is minted (the
            // same way it does in the library's registration form).
            avatarUpload={{
              ensName: fullName,
              siweDomain:
                typeof window === "undefined"
                  ? undefined
                  : window.location.hostname,
            }}
          />
        </EnsScope>

        <div className="flex flex-col gap-3">
          <PixelButton onClick={onContinue} loading={busy} className="w-full">
            {step === "signing"
              ? "Confirm in wallet"
              : step === "pending"
                ? "Claiming…"
                : count > 0
                  ? `Claim with ${count} record${count === 1 ? "" : "s"}`
                  : "Claim name"}
          </PixelButton>

          {error && (
            <p role="alert" className="text-rose-400 text-xs leading-relaxed">
              {error}
            </p>
          )}

          {step === "pending" && (
            <p className="text-ink-400 text-center text-xs">
              Waiting for the transaction to confirm. This can take a minute.
            </p>
          )}

          <PixelButton variant="ghost" onClick={onBack} disabled={busy}>
            Back to name
          </PixelButton>
        </div>
      </div>
    </PixelDialog>
  );
}
