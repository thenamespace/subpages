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
  isAddress,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';

// --- Constants ---

const L1_REVERSE_REGISTRAR = '0x283F227c4Bd38ecE252C4Ae7ECE650B0e913f1f9' as const;
const FUNCTION_SIGNATURE = '0x012a67bc' as const;
const ALLOWED_SUFFIX = '.shefi.eth';
const MIN_ETH_THRESHOLD = parseEther('0.0001');
const SIGNATURE_EXPIRY_MIN = 30; // seconds
const SIGNATURE_EXPIRY_MAX = 300; // 5 minutes (reduced from 1 hour)
const MAX_NAME_LENGTH = 100;

// Rate limiting (in-memory, best-effort for serverless)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // per IP per minute
const ADDRESS_LIMIT_MAP = new Map<string, { count: number; resetAt: number }>();
const ADDRESS_RATE_LIMIT_MAX = 3; // per address per minute

// Replay protection: track used signatures (in-memory, best-effort)
const usedSignatures = new Map<string, number>(); // signature hash -> expiry timestamp
const SIGNATURE_CLEANUP_INTERVAL = 60_000; // 1 minute

// Cleanup expired signatures periodically
setInterval(() => {
  const now = Math.floor(Date.now() / 1000);
  for (const [key, expiry] of usedSignatures) {
    if (expiry < now) {
      usedSignatures.delete(key);
    }
  }
}, SIGNATURE_CLEANUP_INTERVAL);

function checkRateLimit(key: string, limitMap: Map<string, { count: number; resetAt: number }>, maxRequests: number): boolean {
  const now = Date.now();
  const entry = limitMap.get(key);
  
  if (!entry || now > entry.resetAt) {
    limitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (entry.count >= maxRequests) {
    return false;
  }
  
  entry.count++;
  return true;
}

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

    // Rate limiting by IP
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIp, rateLimitMap, RATE_LIMIT_MAX_REQUESTS)) {
      res.status(429).json({ error: 'Too many requests. Please try again later.' });
      return;
    }

    // 1. Validate required fields
    if (!addr || !name || !expiryStr || !signature) {
      res.status(400).json({ error: 'Missing required fields: addr, name, signatureExpiry, signature' });
      return;
    }

    // 1.5. Validate address format
    if (!isAddress(addr)) {
      res.status(400).json({ error: 'Invalid address format' });
      return;
    }

    // Rate limiting by address
    if (!checkRateLimit(addr.toLowerCase(), ADDRESS_LIMIT_MAP, ADDRESS_RATE_LIMIT_MAX)) {
      res.status(429).json({ error: 'Too many requests for this address. Please try again later.' });
      return;
    }

    // 1.6. Validate signature format
    if (!/^0x[a-fA-F0-9]{130}$/.test(signature)) {
      res.status(400).json({ error: 'Invalid signature format' });
      return;
    }

    // 1.7. Validate name length and format
    if (typeof name !== 'string' || name.length > MAX_NAME_LENGTH) {
      res.status(400).json({ error: `Name too long (max ${MAX_NAME_LENGTH} chars)` });
      return;
    }

    const signatureExpiry = BigInt(expiryStr);

    // 2. Validate name ends with .shefi.eth
    const nameLower = name.toLowerCase();
    if (!nameLower.endsWith(ALLOWED_SUFFIX)) {
      res.status(400).json({ error: `Name must end with ${ALLOWED_SUFFIX}` });
      return;
    }

    // 2.5. Validate ENS name format
    try {
      normalize(nameLower);
    } catch {
      res.status(400).json({ error: 'Invalid ENS name format' });
      return;
    }

    // 3. Validate signature expiry window using bigint arithmetic
    const nowBigInt = BigInt(Math.floor(Date.now() / 1000));

    if (signatureExpiry <= nowBigInt) {
      res.status(400).json({ error: 'Signature has expired' });
      return;
    }

    const secondsUntilExpiry = signatureExpiry - nowBigInt;
    if (secondsUntilExpiry < BigInt(SIGNATURE_EXPIRY_MIN)) {
      res.status(400).json({ error: `Signature expiry must be at least ${SIGNATURE_EXPIRY_MIN}s in the future` });
      return;
    }
    if (secondsUntilExpiry > BigInt(SIGNATURE_EXPIRY_MAX)) {
      res.status(400).json({ error: `Signature expiry must be at most ${SIGNATURE_EXPIRY_MAX}s in the future` });
      return;
    }

    // 3.5. Replay protection - check if signature was already used
    const signatureKey = keccak256(signature as Hex);
    if (usedSignatures.has(signatureKey)) {
      res.status(400).json({ error: 'Signature has already been used' });
      return;
    }

    // 4. Verify signature
    const valid = await verifySignature(addr as Address, name, signatureExpiry, signature as Hex);
    if (!valid) {
      res.status(400).json({ error: 'Invalid signature' });
      return;
    }

    // Mark signature as used (store with expiry for cleanup)
    usedSignatures.set(signatureKey, Number(signatureExpiry));

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

    const { request } = await publicClient.simulateContract({
      address: L1_REVERSE_REGISTRAR,
      abi: reverseRegistrarAbi,
      functionName: 'setNameForAddrWithSignature',
      args,
      account: account,
    });

    const txHash = await walletClient.writeContract(request);

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
