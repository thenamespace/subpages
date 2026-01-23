'use client';

import { useCallback } from 'react';
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from 'wagmi';
import { base } from 'wagmi/chains';
import { Address, Hash, namehash, encodeFunctionData } from 'viem';
import { L2_CHAIN_ID } from '@/constants';

// L2 Public Resolver on Base
const L2_PUBLIC_RESOLVER = '0x6533C94869D28fAA8dF77cc63f9e2b2D6Cf77eBA' as Address;

// L2 Name Wrapper on Base
const L2_NAME_WRAPPER = '0x0635513f179D50A207757E05759CbD106d7dFcE8' as Address;

// ABIs for the contracts
const RESOLVER_ABI = [
  {
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'key', type: 'string' },
      { name: 'value', type: 'string' },
    ],
    name: 'setText',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'coinType', type: 'uint256' },
      { name: 'value', type: 'bytes' },
    ],
    name: 'setAddr',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'data', type: 'bytes[]' },
    ],
    name: 'multicall',
    outputs: [{ name: '', type: 'bytes[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

const NAME_WRAPPER_ABI = [
  {
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'id', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
      { name: 'data', type: 'bytes' },
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'parentNode', type: 'bytes32' },
      { name: 'label', type: 'string' },
      { name: 'newOwner', type: 'address' },
    ],
    name: 'setSubnodeOwner',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

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
   * Update multiple text records for a name
   */
  const updateTextRecords = useCallback(
    async (fullName: string, records: TextRecord[]): Promise<Hash> => {
      if (!walletClient || !address) {
        throw new Error('Wallet not connected');
      }

      if (!isOnTargetChain) {
        await switchToTargetChain();
      }

      const node = namehash(fullName);

      // If single record, use direct call
      if (records.length === 1) {
        return await walletClient.writeContract({
          address: L2_PUBLIC_RESOLVER,
          abi: RESOLVER_ABI,
          functionName: 'setText',
          args: [node, records[0].key, records[0].value],
          chain: base,
        });
      }

      // For multiple records, use multicall
      const calls = records.map((record) =>
        encodeFunctionData({
          abi: RESOLVER_ABI,
          functionName: 'setText',
          args: [node, record.key, record.value],
        })
      );

      return await walletClient.writeContract({
        address: L2_PUBLIC_RESOLVER,
        abi: RESOLVER_ABI,
        functionName: 'multicall',
        args: [node, calls],
        chain: base,
      });
    },
    [walletClient, address, isOnTargetChain, switchToTargetChain]
  );

  /**
   * Transfer ownership of a name to a new address
   */
  const transferOwnership = useCallback(
    async (fullName: string, newOwner: Address): Promise<Hash> => {
      if (!walletClient || !address) {
        throw new Error('Wallet not connected');
      }

      if (!isOnTargetChain) {
        await switchToTargetChain();
      }

      const node = namehash(fullName);
      const tokenId = BigInt(node);

      return await walletClient.writeContract({
        address: L2_NAME_WRAPPER,
        abi: NAME_WRAPPER_ABI,
        functionName: 'safeTransferFrom',
        args: [address, newOwner, tokenId, BigInt(1), '0x'],
        chain: base,
      });
    },
    [walletClient, address, isOnTargetChain, switchToTargetChain]
  );

  /**
   * Wait for a transaction to be confirmed
   */
  const waitForTransaction = useCallback(
    async (hash: Hash, confirmations = 1) => {
      if (!publicClient) {
        throw new Error('Public client not available');
      }
      return await publicClient.waitForTransactionReceipt({
        hash,
        confirmations,
      });
    },
    [publicClient]
  );

  return {
    updateTextRecords,
    transferOwnership,
    switchToTargetChain,
    waitForTransaction,
    isOnTargetChain,
    targetChainId: L2_CHAIN_ID,
  };
}
