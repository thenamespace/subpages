"use client";

import { SelectRecordsForm } from "@/components/ens/client";
import { EnsScope } from "@/components/ens/EnsScope";
import { PixelButton } from "@/components/ui/PixelButton";
import { PixelDialog } from "@/components/ui/PixelDialog";
import { countRecords, type FormRecords } from "@/lib/records";

/**
 * Optional profile step, shown between picking a name and claiming it.
 *
 * Setting records at mint time is one transaction; setting them afterwards is
 * a second one, so it's worth offering here — but never worth blocking on,
 * hence the prominent skip.
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
  busy,
  fullName,
}: {
  open: boolean;
  records: FormRecords;
  onRecordsChange: (next: FormRecords) => void;
  onBack: () => void;
  onContinue: () => void;
  busy: boolean;
  fullName: string;
}) {
  const count = countRecords(records);

  return (
    <PixelDialog
      open={open}
      // Closing mid-transaction would strand the user away from the progress,
      // so the dialog is held open while a claim is in flight.
      onOpenChange={(next) => {
        if (!next && !busy) onBack();
      }}
      title={fullName}
      description="Optional, and free to skip — but adding records now costs one transaction instead of two."
    >
      <div className="flex flex-col gap-5">
        <EnsScope>
          <SelectRecordsForm
            records={records}
            onRecordsUpdated={onRecordsChange}
          />
        </EnsScope>

        <div className="flex flex-col gap-3">
          <PixelButton onClick={onContinue} loading={busy} className="w-full">
            {count > 0
              ? `Claim with ${count} record${count === 1 ? "" : "s"}`
              : "Claim name"}
          </PixelButton>
          <PixelButton variant="ghost" onClick={onBack} disabled={busy}>
            Back to name
          </PixelButton>
        </div>
      </div>
    </PixelDialog>
  );
}
