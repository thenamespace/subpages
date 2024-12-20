import { Listing } from "namespace-sdk";
import { namehash } from "viem";
import { baseSepolia } from "viem/chains";

export const LISTED_NAME: Listing = {
  fullName: "pizzada0.eth",
  label: "pizzada0",
  network: "sepolia",
  node: namehash("pizzada0.eth"),
  listingType: "l2",
  registryNetwork: "baseSepolia",
};

export const LISTING_CHAIN_ID = baseSepolia.id;