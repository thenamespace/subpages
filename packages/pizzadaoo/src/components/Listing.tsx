import { Listing } from "namespace-sdk";
import { namehash } from "viem";
import { base } from "viem/chains";

export const LISTED_NAME: Listing = {
  fullName: "rarepizzas.eth",
  label: "rarepizzas",
  network: "mainnet",
  node: namehash("rarepizzas.eth"),
  listingType: "l2",
  registryNetwork: "base",
};

export const LISTING_CHAIN_ID = base.id;