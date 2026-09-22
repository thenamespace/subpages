import { normalise } from "@ensdomains/ensjs/utils";
import { LABEL_MAX_LENGTH, LABEL_MIN_LENGTH } from "./config";

export type LabelError =
  | "empty"
  | "too-short"
  | "too-long"
  | "has-dot"
  | "invalid";

const MESSAGES: Record<LabelError, string> = {
  empty: "Pick a name.",
  "too-short": `At least ${LABEL_MIN_LENGTH} characters.`,
  "too-long": `At most ${LABEL_MAX_LENGTH} characters.`,
  "has-dot": "No dots — you're only choosing the part before the name.",
  invalid: "That character isn't allowed in an ENS name.",
};

export function labelErrorMessage(error: LabelError) {
  return MESSAGES[error];
}

/**
 * Validate a user-typed label against ENS normalisation rules.
 *
 * ENSIP-15 normalisation is the same thing the registry applies, so anything
 * rejected here would have been rejected on-chain — we just do it before the
 * user spends gas finding out. Returns the normalised form on success, since
 * normalisation can change the string (case folding, confusable mapping).
 */
export function validateLabel(
  raw: string,
): { ok: true; label: string } | { ok: false; error: LabelError } {
  const trimmed = raw.trim();

  if (trimmed.length === 0) return { ok: false, error: "empty" };
  if (trimmed.includes(".")) return { ok: false, error: "has-dot" };

  let normalised: string;
  try {
    normalised = normalise(trimmed.toLowerCase());
  } catch {
    return { ok: false, error: "invalid" };
  }

  // Length is checked against the normalised form: normalisation can shorten
  // or lengthen the string, and the registry sees the normalised version.
  if (normalised.length < LABEL_MIN_LENGTH) {
    return { ok: false, error: "too-short" };
  }
  if (normalised.length > LABEL_MAX_LENGTH) {
    return { ok: false, error: "too-long" };
  }

  return { ok: true, label: normalised };
}
