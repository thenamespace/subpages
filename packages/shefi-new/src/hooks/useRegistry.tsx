"use client";

import { useCallback } from "react";
import {
  useAccount,
  usePublicClient,
  useSwitchChain,
  useWalletClient,
} from "wagmi";
import { base } from "wagmi/chains";
import {
  Address,
  Hash,
  namehash,
  encodeFunctionData,
  parseAbi,
  PublicClient,
} from "viem";
import { L2_CHAIN_ID } from "@/constants";
import { convertRecordsDiffToResolverData } from "@/lib/resolver-utils";
import {
  getEnsRecordsDiff,
  type EnsRecords,
} from "@thenamespace/ens-components";
import { getL2NamespaceContracts } from "@thenamespace/addresses";
import ERC721_ABI from "./abis/ERC721.json";

// Get L2 contracts from the addresses package
const l2Contracts = getL2NamespaceContracts(L2_CHAIN_ID);

// L2 Public Resolver on Base
const L2_PUBLIC_RESOLVER = l2Contracts.resolver as Address;

// L2 Name Registry on Base
const L2_NAME_REGISTRY = l2Contracts.controller as Address;

const L2_REGISTRY_RESOLVER = l2Contracts.registryResolver;

// ABIs for the contracts
const RESOLVER_ABI = [
  {
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
      { name: "value", type: "string" },
    ],
    name: "setText",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "coinType", type: "uint256" },
      { name: "value", type: "bytes" },
    ],
    name: "setAddr",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "data", type: "bytes[]" }],
    name: "multicall",
    outputs: [{ name: "", type: "bytes[]" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const NAME_REGISTRY_ABI = [
  {
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "id", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "data", type: "bytes" },
    ],
    name: "safeTransferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const REGISTRY_RESOLVER_ABI = parseAbi([
  "function nodeRegistries(bytes32 node) external view returns(address)",
]);

export interface TextRecord {
  key: string;
  value: string;
}

export interface AddressRecord {
  coinType: number;
  value: string;
}

export function useRegistry() {
  const { address, chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { data: walletClient } = useWalletClient({ chainId: L2_CHAIN_ID });
  const publicClient = usePublicClient({ chainId: L2_CHAIN_ID });

  const isOnTargetChain = chain?.id === L2_CHAIN_ID;

  const switchToTargetChain = useCallback(async () => {
    if (!isOnTargetChain) {
      await switchChainAsync({ chainId: L2_CHAIN_ID });
    }
  }, [isOnTargetChain, switchChainAsync]);

  /**
   * Update records using EnsRecords diff (matching naming-services/webapp pattern)
   */
  const updateRecords = useCallback(
    async (
      fullName: string,
      oldRecords: EnsRecords,
      newRecords: EnsRecords,
    ): Promise<Hash> => {
      if (!walletClient || !address || !publicClient) {
        throw new Error("Wallet not connected");
      }

      if (!isOnTargetChain) {
        await switchToTargetChain();
      }

      const diff = getEnsRecordsDiff(oldRecords, newRecords);
      const resolverData = convertRecordsDiffToResolverData(fullName, diff);

      if (resolverData.length === 0) {
        throw new Error("No changes to update");
      }

      // Simulate first to catch errors early
      const { request } = await publicClient.simulateContract({
        address: L2_PUBLIC_RESOLVER,
        abi: RESOLVER_ABI,
        functionName: "multicall",
        args: [resolverData],
        account: address,
      });

      return await walletClient.writeContract(request);
    },
    [walletClient, address, publicClient, isOnTargetChain, switchToTargetChain],
  );

  /**
   * Update multiple text records for a name (legacy - kept for backwards compatibility)
   */
  const updateTextRecords = useCallback(
    async (fullName: string, records: TextRecord[]): Promise<Hash> => {
      if (!walletClient || !address || !publicClient) {
        throw new Error("Wallet not connected");
      }

      if (!isOnTargetChain) {
        await switchToTargetChain();
      }

      const node = namehash(fullName);

      // If single record, use direct call
      if (records.length === 1) {
        const { request } = await publicClient.simulateContract({
          address: L2_PUBLIC_RESOLVER,
          abi: RESOLVER_ABI,
          functionName: "setText",
          args: [node, records[0].key, records[0].value],
          chain: base,
          account: address,
        });
        return await walletClient.writeContract(request);
      }

      // For multiple records, use multicall
      const calls = records.map((record) =>
        encodeFunctionData({
          abi: RESOLVER_ABI,
          functionName: "setText",
          args: [node, record.key, record.value],
        }),
      );

      const { request } = await publicClient.simulateContract({
        address: L2_PUBLIC_RESOLVER,
        abi: RESOLVER_ABI,
        functionName: "multicall",
        args: [calls],
        chain: base,
        account: address,
      });
      return await walletClient.writeContract(request);
    },
    [walletClient, address, publicClient, isOnTargetChain, switchToTargetChain],
  );

  const getRegistryAddress = async (
    pc: PublicClient,
    fullName: string,
  ): Promise<Address> => {
    return pc.readContract({
      address: L2_REGISTRY_RESOLVER,
      abi: REGISTRY_RESOLVER_ABI,
      functionName: "nodeRegistries",
      args: [namehash(fullName)],
    });
  };

  /**
   * Transfer ownership of a name to a new address
   */
  const transferOwnership = async (
    fullName: string,
    newOwner: Address,
  ): Promise<Hash> => {
    if (!walletClient || !address || !publicClient) {
      throw new Error("Wallet not connected");
    }

    if (!isOnTargetChain) {
      await switchChainAsync({ chainId: L2_CHAIN_ID });
    }

    const node = namehash(fullName);
    const tokenId = BigInt(node);

    const registryAddress = await getRegistryAddress(publicClient, fullName)

    const { request } = await publicClient!.simulateContract({
      address: registryAddress,
      abi: ERC721_ABI,
      functionName: "safeTransferFrom",
      args: [address, newOwner, tokenId],
      chain: base,
      account: address,
    });

    return await walletClient.writeContract(request);
  };

  /**
   * Wait for a transaction to be confirmed
   */
  const waitForTransaction = useCallback(
    async (hash: Hash, confirmations = 1) => {
      if (!publicClient) {
        throw new Error("Public client not available");
      }
      return await publicClient.waitForTransactionReceipt({
        hash,
        confirmations,
      });
    },
    [publicClient],
  );

  return {
    updateRecords,
    updateTextRecords,
    transferOwnership,
    switchToTargetChain,
    waitForTransaction,
    isOnTargetChain,
    targetChainId: L2_CHAIN_ID,
  };
}
