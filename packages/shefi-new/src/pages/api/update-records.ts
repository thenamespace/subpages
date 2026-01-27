import type { NextApiRequest, NextApiResponse } from "next";
import {
  Address,
  ContractFunctionExecutionError,
  createWalletClient,
  Hash,
  http,
  createPublicClient,
  namehash,
  encodeFunctionData,
  encodeAbiParameters,
  parseAbiParameters,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { AxiosError } from "axios";
import { getL2NamespaceContracts } from "@thenamespace/addresses";
import { getEnsRecordsDiff, type EnsRecords } from "@thenamespace/ens-components";
import { convertRecordsDiffToResolverData } from "@/lib/resolver-utils";

const ENS_NAME = "shefi.eth";
const L2_CHAIN_ID = 8453; // Base mainnet

const wallet_key = process.env.WALLET_KEY as Hash;
const alchemy_key = process.env.ALCHEMY_KEY;
const base_rpc = `https://base-mainnet.g.alchemy.com/v2/${alchemy_key}`;

const wallet = privateKeyToAccount(wallet_key);

const walletClient = createWalletClient({
  transport: http(base_rpc),
  chain: base,
  account: wallet,
});

const publicClient = createPublicClient({
  transport: http(base_rpc),
  chain: base,
});

// Get L2 contracts
const l2Contracts = getL2NamespaceContracts(L2_CHAIN_ID);
const L2_PUBLIC_RESOLVER = l2Contracts.resolver as Address;
const L2_NAME_REGISTRY = l2Contracts.controller as Address;

// Resolver ABI for multicall
const RESOLVER_ABI = [
  {
    inputs: [{ name: "data", type: "bytes[]" }],
    name: "multicall",
    outputs: [{ name: "", type: "bytes[]" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// Name Registry ABI for ownership check
const NAME_REGISTRY_ABI = [
  {
    inputs: [
      { name: "account", type: "address" },
      { name: "id", type: "uint256" },
    ],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

interface UpdateRecordsRequestBody {
  owner: Address;
  label: string;
  oldRecords: EnsRecords;
  newRecords: EnsRecords;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const body = req.body as UpdateRecordsRequestBody;
    const fullName = `${body.label}.${ENS_NAME}`;
    const node = namehash(fullName);
    const tokenId = BigInt(node);

    // Verify ownership
    try {
      const balance = await publicClient.readContract({
        address: L2_NAME_REGISTRY,
        abi: NAME_REGISTRY_ABI,
        functionName: "balanceOf",
        args: [body.owner, tokenId],
      });

      if (balance === BigInt(0)) {
        res.status(403).json({ error: "You do not own this name" });
        return;
      }
    } catch (err) {
      console.error("Ownership verification error:", err);
      res.status(500).json({ error: "Failed to verify name ownership" });
      return;
    }

    console.log("Updating records for:", fullName);

    // Get the diff between old and new records
    const diff = getEnsRecordsDiff(body.oldRecords, body.newRecords);
    const resolverData = convertRecordsDiffToResolverData(fullName, diff);

    if (resolverData.length === 0) {
      res.status(400).json({ error: "No changes to update" });
      return;
    }

    console.log("Resolver data calls:", resolverData.length);

    // Execute multicall on resolver
    const tx = await walletClient.writeContract({
      address: L2_PUBLIC_RESOLVER,
      abi: RESOLVER_ABI,
      functionName: "multicall",
      args: [resolverData],
    });

    res.status(200).json({ tx: tx });
  } catch (err: any) {
    console.error("Update records error:", err);
    if (err instanceof AxiosError) {
      const axiosErr = err as AxiosError;
      res.status(500).json({ error: axiosErr.message });
    } else if (err instanceof ContractFunctionExecutionError) {
      const contractErr = err as ContractFunctionExecutionError;
      res.status(500).json({
        error: JSON.stringify(contractErr.cause || contractErr.details),
      });
    } else {
      res.status(500).json({ error: err?.message || "Unknown error" });
    }
  }
}
