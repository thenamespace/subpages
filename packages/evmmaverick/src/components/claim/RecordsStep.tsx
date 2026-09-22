"use client";

import { SelectRecordsForm } from "@/components/ens/client";
import { EnsScope } from "@/components/ens/EnsScope";
import { PixelButton } from "@/components/ui/PixelButton";
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
  records,
  onRecordsChange,
  onBack,
  onContinue,
  busy,
  fullName,
}: {
  records: FormRecords;
  onRecordsChange: (next: FormRecords) => void;
  onBack: () => void;
  onContinue: () => void;
  busy: boolean;
  fullName: string;
}) {
  const count = countRecords(records);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-amber-300 text-xs uppercase">
          Set up your profile
        </h2>
        <p className="text-ink-300 max-w-[52ch] text-sm leading-relaxed">
          Optional, and free to skip — but adding it now costs one transaction
          instead of two.{" "}
          <span className="text-ink-400 break-all">{fullName}</span>
        </p>
      </div>

      <EnsScope className="-mx-1">
        <SelectRecordsForm
          records={records}
          onRecordsUpdated={onRecordsChange}
        />
      </EnsScope>

      <div className="flex flex-col gap-3">
        <PixelButton onClick={onContinue} loading={busy} className="w-full">
          {count > 0 ? `Claim with ${count} record${count === 1 ? "" : "s"}` : "Claim name"}
        </PixelButton>
        <PixelButton variant="ghost" onClick={onBack} disabled={busy}>
          Back to name
        </PixelButton>
      </div>
    </div>
  );
}
