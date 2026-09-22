/**
 * Turns viem / wallet / Namespace-SDK errors into one short sentence a person
 * can act on. Adapted from the pizzadaoo package, with the copy rewritten to
 * say what to do rather than what broke, and with raw error text truncated —
 * an un-capped viem error dumps a multi-line RPC payload into the UI.
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
    d.includes("user denied") ||
    d.includes("rejected the request")
  );
};

export const isInsufficientFunds = (e: unknown): boolean =>
  detailsOf(e).toLowerCase().includes("insufficient funds");

/**
 * The SDK's `MintingValidationErrorType` values, plus the raw contract
 * revert strings they correspond to. Both spellings show up depending on
 * whether the failure came back from `getMintDetails` or from a simulation.
 */
const CONTRACT_ERRORS: Record<string, string> = {
  MINTER_NOT_TOKEN_OWNER: `This wallet doesn't hold an EVMavericks NFT.`,
  MINTER_NOT_WHITELISTED: "This wallet isn't on the allowlist.",
  SUBNAME_TAKEN: "Someone just took that name. Try another.",
  SUBNAME_RESERVED: "That name is reserved.",
  LISTING_EXPIRED: "Minting has closed for this name.",
  VERIFIED_MINTER_ADDRESS_REQUIRED: "This wallet needs to be verified first.",
  AlreadyRegistered: "Someone just took that name. Try another.",
};

const mapContractError = (haystack: string): string | undefined => {
  for (const [code, message] of Object.entries(CONTRACT_ERRORS)) {
    if (haystack.includes(code)) return message;
  }
  return undefined;
};

/** Long RPC payloads are useless in a toast — keep the first line, cap it. */
const condense = (raw: string): string => {
  const firstLine = raw.split("\n")[0].trim();
  return firstLine.length > 140 ? `${firstLine.slice(0, 137)}…` : firstLine;
};

/**
 * Returns a user-facing message, or `null` when the error should be swallowed
 * because the user deliberately dismissed the wallet prompt — cancelling is
 * not an error and showing a red toast for it is obnoxious.
 */
export const getTxErrorMessage = (
  e: unknown,
  fallback = "That didn't go through. Try again.",
): string | null => {
  if (isUserRejection(e)) return null;
  if (isInsufficientFunds(e)) {
    return "Not enough ETH in this wallet to cover gas.";
  }

  const apiMessage = asRecord(e).response?.data?.message;
  if (typeof apiMessage === "string" && apiMessage.length > 0) {
    return mapContractError(apiMessage) ?? condense(apiMessage);
  }

  const details = detailsOf(e);
  if (details) {
    return mapContractError(details) ?? condense(details);
  }

  const raw = e instanceof Error ? e.message : String(e);
  return mapContractError(raw) ?? fallback;
};
