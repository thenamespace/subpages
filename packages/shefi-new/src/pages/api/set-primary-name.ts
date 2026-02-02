import type { NextApiRequest, NextApiResponse } from 'next';
import {
  type Address,
  type Hash,
  type Hex,
  createPublicClient,
  createWalletClient,
  encodePacked,
  formatEther,
  hashMessage,
  http,
  keccak256,
  parseEther,
  recoverAddress,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet } from 'viem/chains';

// --- Constants ---

const L1_REVERSE_REGISTRAR = '0x283F227c4Bd38ecE252C4Ae7ECE650B0e913f1f9' as const;
const FUNCTION_SIGNATURE = '0x012a67bc' as const;
const ALLOWED_SUFFIX = '.shefi.eth';
const MIN_ETH_THRESHOLD = parseEther('0.0001');
const SIGNATURE_EXPIRY_MIN = 30; // seconds
const SIGNATURE_EXPIRY_MAX = 3600; // seconds

const reverseRegistrarAbi = [
  {
    name: 'setNameForAddrWithSignature',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'addr', type: 'address' },
      { name: 'signatureExpiry', type: 'uint256' },
      { name: 'name', type: 'string' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [],
  },
] as const;

// --- Server-side clients (Ethereum Mainnet) ---

const walletKey = process.env.WALLET_KEY as Hash;
const alchemyKey = process.env.ALCHEMY_KEY;
const mainnetRpc = `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`;

const account = privateKeyToAccount(walletKey);

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(mainnetRpc),
});

const walletClient = createWalletClient({
  chain: mainnet,
  transport: http(mainnetRpc),
  account,
});

// --- Helpers ---

function constructMessageHash(addr: Address, name: string, signatureExpiry: bigint): Hex {
  return keccak256(
    encodePacked(
      ['address', 'bytes4', 'address', 'uint256', 'string'],
      [L1_REVERSE_REGISTRAR, FUNCTION_SIGNATURE, addr, signatureExpiry, name]
    )
  );
}

async function verifySignature(
  addr: Address,
  name: string,
  signatureExpiry: bigint,
  signature: Hex
): Promise<boolean> {
  const messageHash = constructMessageHash(addr, name, signatureExpiry);
  const ethSignedHash = hashMessage({ raw: messageHash });
  const recovered = await recoverAddress({ hash: ethSignedHash, signature });
  return recovered.toLowerCase() === addr.toLowerCase();
}

// --- Handler ---

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { addr, name, signatureExpiry: expiryStr, signature } = req.body;

    // 1. Validate required fields
    if (!addr || !name || !expiryStr || !signature) {
      res.status(400).json({ error: 'Missing required fields: addr, name, signatureExpiry, signature' });
      return;
    }

    const signatureExpiry = BigInt(expiryStr);

    // 2. Validate name ends with .shefi.eth
    if (!name.toLowerCase().endsWith(ALLOWED_SUFFIX)) {
      res.status(400).json({ error: `Name must end with ${ALLOWED_SUFFIX}` });
      return;
    }

    // 3. Validate signature expiry window
    const now = Math.floor(Date.now() / 1000);

    if (signatureExpiry <= BigInt(now)) {
      res.status(400).json({ error: 'Signature has expired' });
      return;
    }

    const secondsUntilExpiry = Number(signatureExpiry) - now;
    if (secondsUntilExpiry < SIGNATURE_EXPIRY_MIN) {
      res.status(400).json({ error: `Signature expiry must be at least ${SIGNATURE_EXPIRY_MIN}s in the future` });
      return;
    }
    if (secondsUntilExpiry > SIGNATURE_EXPIRY_MAX) {
      res.status(400).json({ error: `Signature expiry must be at most ${SIGNATURE_EXPIRY_MAX}s in the future` });
      return;
    }

    // 4. Verify signature
    const valid = await verifySignature(addr as Address, name, signatureExpiry, signature as Hex);
    if (!valid) {
      res.status(400).json({ error: 'Invalid signature' });
      return;
    }

    // 5. Check sponsorship eligibility (user's mainnet ETH balance < threshold)
    const balance = await publicClient.getBalance({ address: addr as Address });
    if (balance >= MIN_ETH_THRESHOLD) {
      res.status(400).json({
        error: 'You have sufficient ETH to pay for gas. Please use a direct transaction.',
        balance: formatEther(balance),
      });
      return;
    }

    // 6. Submit setNameForAddrWithSignature on Ethereum Mainnet via relayer
    const args = [addr as Address, signatureExpiry, name, signature as Hex] as const;

    const txHash = await walletClient.writeContract({
      address: L1_REVERSE_REGISTRAR,
      abi: reverseRegistrarAbi,
      functionName: 'setNameForAddrWithSignature',
      args,
    });

    console.log('Sponsored setPrimaryName tx (mainnet):', { txHash, addr, name });

    res.status(200).json({ tx: txHash });
  } catch (err: unknown) {
    console.error('set-primary-name error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';

    if (message.includes('insufficient funds')) {
      res.status(503).json({ error: 'Service temporarily unavailable' });
      return;
    }

    res.status(500).json({ error: message });
  }
}
