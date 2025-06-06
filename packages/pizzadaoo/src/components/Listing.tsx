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

export const LISTED_NAMES: Listing[] = [PIZZADAO_ETH, PIZZAMAFIA_ETH, RAREPIZZA_ETH]

export const LISTING_CHAIN_ID = base.id;