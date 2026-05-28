import { namehash } from "viem";
import { base } from "viem/chains";

export interface Listing {
  fullName: string
  label: string
  network: string
  node: string
  listingType: string
  registryNetwork: string
}

export const RAREPIZZA_ETH: Listing = {
  fullName: "rarepizzas.eth",
  label: "rarepizzas",
  network: "mainnet",
  node: namehash("rarepizzas.eth"),
  listingType: "l2",
  registryNetwork: "base",
};

export const PIZZADAO_ETH: Listing = {
  fullName: "pizzadao.eth",
  label: "pizzadao",
  network: "mainnet",
  node: namehash("pizzadao.eth"),
  listingType: "l2",
  registryNetwork: "base",
};

export const PIZZAMAFIA_ETH: Listing = {
  fullName: "pizzamafia.eth",
  label: "pizzamafia",
  network: "mainnet",
  node: namehash("pizzamafia.eth"),
  listingType: "l2",
  registryNetwork: "base",
};

// The parent used by the sponsored burn-and-reissue flow.
// Driven by env so we can flip enscomponent.eth (testing) <-> pizzaday.eth (prod).
export const SWAP_PARENT_NAME =
  process.env.NEXT_PUBLIC_PARENT_NAME || "enscomponent.eth";

export const PIZZADAY_ETH: Listing = {
  fullName: SWAP_PARENT_NAME,
  label: SWAP_PARENT_NAME.split(".")[0],
  network: "mainnet",
  node: namehash(SWAP_PARENT_NAME),
  listingType: "l2",
  registryNetwork: "base",
};

export const LISTED_NAMES: Listing[] = [
  PIZZADAO_ETH,
  PIZZAMAFIA_ETH,
  RAREPIZZA_ETH,
  PIZZADAY_ETH,
];

export const LISTING_CHAIN_ID = base.id;
