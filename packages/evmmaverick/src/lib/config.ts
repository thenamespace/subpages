import { mainnet } from "viem/chains";

/**
 * Single source of truth for everything name- and gate-related.
 *
 * The parent name is deliberately a constant rather than an env var: it shows
 * up in copy, page titles and OG tags, so it needs to be readable at build
 * time. Three spellings are in circulation — `evmaverick.eth` (what we were
 * told to build against), `evmmaverick.eth` and `evmavericks.eth` (the name
 * the EVMavericks collection actually resolves) — so changing it is one edit
 * here and nothing else.
 */
export const PARENT_NAME = "evmaverick.eth";

/** Chain the parent name lives on. L1 listing, so mainnet. */
export const PARENT_CHAIN = mainnet;

/**
 * EVMavericks, ERC-721 on Ethereum mainnet. Verified on-chain:
 *   name()                          -> "EVMavericks"
 *   symbol()                        -> "EVM"
 *   supportsInterface(0x80ac58cd)   -> true   (ERC-721)
 *   supportsInterface(0x780e9d63)   -> false  (NOT Enumerable)
 *
 * The missing Enumerable interface is why quota is counted by `balanceOf`
 * rather than per token id — there is no on-chain way to list a wallet's
 * token ids, and `totalSupply()` reverts.
 */
export const GATE_CONTRACT = "0x7ddaa898d33d7ab252ea5f89f96717c47b2fee6e" as const;

export const GATE_TOKEN_NAME = "EVMavericks";

/** Where a holder goes if they don't have one yet. */
export const GATE_TOKEN_URL = "https://opensea.io/collection/evmavericks";

/** Years of registration requested per mint. */
export const EXPIRY_IN_YEARS = 1;

/** Tagged on mints so Namespace can attribute them to this site. */
export const MINT_SOURCE = "evmaverick";

/** Label rules enforced before we ever hit the network. */
export const LABEL_MIN_LENGTH = 3;
export const LABEL_MAX_LENGTH = 24;
