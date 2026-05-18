/**
 * Shared parsing for viem / wallet / namespace-sdk errors. Previously this
 * logic was duplicated (with `err: any`) across MintForm and SingleSubname.
 */

interface MaybeViemError {
  details?: unknown;
  shortMessage?: unknown;
  message?: unknown;
  response?: { data?: { message?: unknown } };
}

const asRecord = (e: unknown): MaybeViemError =>
  typeof e === "object" && e !== null ? (e as MaybeViemError) : {};

const detailsOf = (e: unknown): string => {
  const r = asRecord(e);
  if (typeof r.details === "string") return r.details;
  if (typeof r.shortMessage === "string") return r.shortMessage;
  if (typeof r.message === "string") return r.message;
  return "";
};

export const isUserRejection = (e: unknown): boolean => {
  const d = detailsOf(e).toLowerCase();
  return (
    d.includes("user rejected") ||
    d.includes("user denied transaction signature")
  );
};

export const isInsufficientFunds = (e: unknown): boolean =>
  detailsOf(e).toLowerCase().includes("insufficient funds for gas");

const CONTRACT_ERRORS: Record<string, string> = {
  MINTER_NOT_TOKEN_OWNER: "You don't own the required token",
  SUBNAME_TAKEN: "Subname is already taken",
  MINTER_NOT_WHITELISTED: "You are not whitelisted",
  LISTING_EXPIRED: "Listing has expired",
  SUBNAME_RESERVED: "Subname is reserved",
  VERIFIED_MINTER_ADDRESS_REQUIRED: "Verification required",
};

const mapContractError = (haystack: string): string | undefined => {
  for (const [code, message] of Object.entries(CONTRACT_ERRORS)) {
    if (haystack.includes(code)) return message;
  }
  return undefined;
};

/**
 * Returns a user-facing error message, or `null` when the error should be
 * silently ignored (the user rejected the wallet prompt).
 */
export const getTxErrorMessage = (
  e: unknown,
  fallback = "Unexpected error happened :(",
): string | null => {
  if (isUserRejection(e)) return null;
  if (isInsufficientFunds(e)) return "Insufficient balance";

  const apiMessage = asRecord(e).response?.data?.message;
  if (typeof apiMessage === "string" && apiMessage.length > 0) {
    return apiMessage;
  }

  const details = detailsOf(e);
  if (details) {
    return mapContractError(details) ?? details;
  }

  const raw = e instanceof Error ? e.message : String(e);
  return mapContractError(raw) ?? fallback;
};
