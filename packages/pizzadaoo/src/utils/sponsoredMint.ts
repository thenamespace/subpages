import axios from "axios";
import { Address, Hex, toHex } from "viem";
import type { EnsRecords } from "@namespacesdk/mint-manager";
// The SDK doesn't export this from its package root — only the dist file.
// It encodes ENS records (texts/addresses/contenthash) into the resolverData
// the mint controller expects. Importing the dist path keeps the encoding
// byte-identical to what the SDK produces for a normal mint.
import { convertEnsRecordsToResolverData } from "@namespacesdk/mint-manager/dist/utils";

const MINT_MANAGER_API =
  "https://mint-manager.namespace.ninja/api/v1/minting-parameters";

// Namespace L2 mint controller on Base.
const L2_MINT_CONTROLLER: Address =
  "0xa8e61891626f86ae6397217823701183de947c7d";

// Just the `mint` entry of the controller ABI — the only function we call.
const mintAbi = [
  {
    type: "function",
    name: "mint",
    stateMutability: "payable",
    inputs: [
      {
        name: "context",
        type: "tuple",
        components: [
          { name: "owner", type: "address" },
          { name: "label", type: "string" },
          { name: "parentNode", type: "bytes32" },
          { name: "price", type: "uint256" },
          { name: "fee", type: "uint256" },
          { name: "paymentReceiver", type: "address" },
          { name: "expiry", type: "uint256" },
          { name: "signatureExpiry", type: "uint256" },
          { name: "verifiedMinter", type: "address" },
        ],
      },
      { name: "signature", type: "bytes" },
      { name: "resolverData", type: "bytes[]" },
      { name: "extraData", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

interface MintContent {
  label: string;
  owner: Address;
  fee: string;
  price: string;
  parentNode: Hex;
  paymentReceiver: Address;
  verifiedMinter: Address;
  signatureExpiry: number;
  expiry: number;
  fuses?: number;
}

export interface SponsoredMintTx {
  // Loosely typed on purpose: these flow straight into viem's
  // writeContract/simulateContract, mirroring how the SDK's
  // MintTransactionResponse (abi: any, args: any[]) was consumed before.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abi: any;
  address: Address;
  functionName: "mint";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any[];
  value: bigint;
}

/**
 * Builds a mint transaction that lands the subname NFT *directly* on `owner`.
 *
 * The `@namespacesdk/mint-manager` SDK hardcodes the on-chain owner to the
 * minter, which forced a separate `transferFrom` afterwards — and the indexer
 * lags that transfer, so freshly airdropped/renamed names didn't show up.
 * The mint-manager HTTP API itself accepts a distinct `owner`, signs the
 * content with it, and the controller mints straight to that address. This
 * helper calls the API directly so we skip the transfer entirely.
 */
export async function buildSponsoredMintTx(params: {
  label: string;
  parentName: string;
  /** Sponsor wallet — the verified minter / tx sender. */
  minterAddress: Address;
  /** Recipient — the NFT is minted directly to this address. */
  owner: Address;
  records: EnsRecords;
  mintSource: string;
}): Promise<SponsoredMintTx> {
  const { data } = await axios.post<{
    content: MintContent;
    signature: Hex;
  }>(MINT_MANAGER_API, {
    label: params.label,
    parentName: params.parentName,
    minterAddress: params.minterAddress,
    owner: params.owner,
    expiryInYears: 1,
  });

  const fullName = `${params.label}.${params.parentName}`;
  const resolverData = convertEnsRecordsToResolverData(
    fullName,
    params.records,
  ) as Hex[];

  return {
    abi: mintAbi,
    address: L2_MINT_CONTROLLER,
    functionName: "mint",
    args: [
      data.content,
      data.signature,
      resolverData,
      toHex(params.mintSource),
    ],
    value: BigInt(data.content.fee) + BigInt(data.content.price),
  } satisfies SponsoredMintTx;
}
