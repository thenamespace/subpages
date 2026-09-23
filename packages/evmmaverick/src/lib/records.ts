import type { ComponentProps } from "react";
import type { SelectRecordsForm } from "@thenamespace/ens-components";
import {
  ContenthashType,
  type EnsRecords as MintRecords,
} from "@namespacesdk/mint-manager";

/**
 * The record editor and the mint SDK describe records differently: the form
 * keys addresses by `coinType`, the SDK by `chain` (which accepts a coin type
 * number). This is the seam between them.
 *
 * The form's type is taken from its own props rather than re-declared, so it
 * can't drift out of sync with the library.
 */
export type FormRecords = ComponentProps<typeof SelectRecordsForm>["records"];

export const EMPTY_RECORDS: FormRecords = { texts: [], addresses: [] };

/** Blank values mean "not set" — sending them would write empty records. */
const filled = <T extends { value: string }>(r: T) => r.value.trim().length > 0;

/**
 * Contenthash protocol -> the mint SDK's enum.
 *
 * Mapped explicitly rather than cast, because the two enums disagree: the SDK
 * spells Skynet "syknet" (a typo on its side) where the form spells it
 * "skynet". A string cast would typecheck and then silently write a protocol
 * the resolver doesn't recognise.
 */
const CONTENTHASH_TYPES: Record<string, ContenthashType> = {
  ipfs: ContenthashType.Ipfs,
  onion3: ContenthashType.Onion,
  arweave: ContenthashType.Arweave,
  swarm: ContenthashType.Swarm,
  skynet: ContenthashType.Skynet,
};

export function toMintRecords(records: FormRecords): MintRecords {
  const raw = records.contenthash;
  const mapped = raw?.value?.trim() ? CONTENTHASH_TYPES[raw.protocol] : undefined;
  // An unknown protocol is dropped rather than guessed at.
  const contenthash =
    mapped && raw ? { type: mapped, value: raw.value.trim() } : undefined;

  return {
    texts: (records.texts ?? []).filter(filled).map((t) => ({
      key: t.key,
      value: t.value.trim(),
    })),
    addresses: (records.addresses ?? []).filter(filled).map((a) => ({
      chain: a.coinType,
      value: a.value.trim(),
    })),
    ...(contenthash ? { contenthash } : {}),
  };
}

/** How many records the user actually set — drives the "3 set" hint. */
export function countRecords(records: FormRecords): number {
  const texts = (records.texts ?? []).filter(filled).length;
  const addresses = (records.addresses ?? []).filter(filled).length;
  const content = records.contenthash?.value?.trim() ? 1 : 0;
  return texts + addresses + content;
}
