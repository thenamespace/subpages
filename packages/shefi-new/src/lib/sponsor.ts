import { type Address, type Hex, encodePacked, keccak256 } from 'viem';
import { L1_REVERSE_REGISTRAR, FUNCTION_SIGNATURE } from '@/constants';

/**
 * Constructs the message hash that ENS expects for setNameForAddrWithSignature.
 * Uses encodePacked to match Solidity's abi.encodePacked:
 *   address(reverseRegistrar) | bytes4(functionSelector) | address(addr) | uint256(expiry) | string(name)
 */
export function constructMessageHash(
  addr: Address,
  name: string,
  signatureExpiry: bigint
): Hex {
  const encoded = encodePacked(
    ['address', 'bytes4', 'address', 'uint256', 'string'],
    [
      L1_REVERSE_REGISTRAR as Address,
      FUNCTION_SIGNATURE,
      addr,
      signatureExpiry,
      name,
    ]
  );

  return keccak256(encoded);
}

/**
 * Returns a signature expiry timestamp 5 minutes from now.
 */
export function getSignatureExpiry(): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + 300);
}

/**
 * Calls the server-side sponsored set-primary-name API route.
 */
export async function sponsorSetPrimaryName(params: {
  addr: Address;
  name: string;
  signatureExpiry: bigint;
  signature: Hex;
}): Promise<{ tx: string }> {
  const res = await fetch('/api/set-primary-name', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      addr: params.addr,
      name: params.name,
      signatureExpiry: params.signatureExpiry.toString(),
      signature: params.signature,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Failed to sponsor primary name');
  }

  return data;
}
