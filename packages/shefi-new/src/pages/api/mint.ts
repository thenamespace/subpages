import type { NextApiRequest, NextApiResponse } from "next";
import {
  Address,
  ContractFunctionExecutionError,
  createPublicClient,
  createWalletClient,
  Hash,
  Hex,
  http,
  isAddress,
  recoverAddress,
  hashMessage,
  keccak256,
  encodePacked,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { AxiosError } from "axios";
import { getWhitelist } from "@/api/api";
import { ChainName, createMintClient, type EnsRecords } from "@thenamespace/mint-manager";
import { normalize } from "viem/ens";

const ENS_NAME = "shefi.eth";

const SHEFI_AVATAR =
  "https://ipfs.io/ipfs/bafkreiac2vzw6ky2mk4e27rkvb7n26xfsvhljgo3mxcbutkcamn2s3qene";
const SHEFI_HEADER =
  "https://ipfs.io/ipfs/bafybeihmqdto646pne6g4eusn45q2q7u4nt3cq4h6f4z5g26ua3k5l3pry";

const wallet_key = process.env.WALLET_KEY as Hash;
const alchemy_key = process.env.ALCHEMY_KEY;
const base_rpc = `https://base-mainnet.g.alchemy.com/v2/${alchemy_key}`;

// Security constants
const MIN_LABEL_LENGTH = 3;
const MAX_LABEL_LENGTH = 63;
const MAX_TEXT_RECORDS = 5;
const MAX_ADDRESS_RECORDS = 5;
const MAX_TEXT_KEY_LENGTH = 32;
const MAX_TEXT_VALUE_LENGTH = 512;
const SIGNATURE_EXPIRY_MAX = 300; // 5 minutes

// Rate limiting (in-memory, best-effort for serverless)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5; // per IP per minute
const ADDRESS_LIMIT_MAP = new Map<string, { count: number; resetAt: number }>();
const ADDRESS_RATE_LIMIT_MAX = 3; // per address per minute

const wallet = privateKeyToAccount(wallet_key);

const namespaceClient = createMintClient({
  mintSource: "shefi",
  cursomRpcUrls: {
    [base.id]: base_rpc,
  },
});

const publicClient = createPublicClient({
  transport: http(base_rpc),
  chain: base,
});

const walletClient = createWalletClient({
  transport: http(base_rpc),
  chain: base,
  account: wallet,
});

interface MintRequestBody {
  owner: Address;
  label: string;
  signature: Hex;
  signatureExpiry: string;
  records?: {
    texts?: Array<{ key: string; value: string }>;
    addresses?: Array<{ coinType: number; value: string }>;
  };
}

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

function constructMintMessageHash(owner: Address, label: string, expiry: bigint): Hex {
  return keccak256(
    encodePacked(
      ['address', 'string', 'uint256', 'uint256'],
      [owner, label, BigInt(base.id), expiry]
    )
  );
}

async function verifyMintSignature(
  owner: Address,
  label: string,
  expiry: bigint,
  signature: Hex
): Promise<boolean> {
  const messageHash = constructMintMessageHash(owner, label, expiry);
  const ethSignedHash = hashMessage({ raw: messageHash });
  const recovered = await recoverAddress({ hash: ethSignedHash, signature });
  return recovered.toLowerCase() === owner.toLowerCase();
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Method check
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = req.body as MintRequestBody;

    // Rate limiting by IP
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIp, rateLimitMap, RATE_LIMIT_MAX_REQUESTS)) {
      res.status(429).json({ error: 'Too many requests. Please try again later.' });
      return;
    }

    // Validate required fields
    if (!body.owner || !body.label || !body.signature || !body.signatureExpiry) {
      res.status(400).json({ error: 'Missing required fields: owner, label, signature, signatureExpiry' });
      return;
    }

    // Validate owner is a valid address
    if (!isAddress(body.owner)) {
      res.status(400).json({ error: 'Invalid owner address' });
      return;
    }

    // Rate limiting by address
    if (!checkRateLimit(body.owner.toLowerCase(), ADDRESS_LIMIT_MAP, ADDRESS_RATE_LIMIT_MAX)) {
      res.status(429).json({ error: 'Too many mint requests for this address. Please try again later.' });
      return;
    }

    // Validate label
    const label = body.label.toLowerCase();
    if (label.includes('.')) {
      res.status(400).json({ error: 'Label cannot contain dots' });
      return;
    }
    if (label.length < MIN_LABEL_LENGTH || label.length > MAX_LABEL_LENGTH) {
      res.status(400).json({ error: `Label must be between ${MIN_LABEL_LENGTH} and ${MAX_LABEL_LENGTH} characters` });
      return;
    }

    // Normalize ENS label
    try {
      normalize(label);
    } catch {
      res.status(400).json({ error: 'Invalid ENS label format' });
      return;
    }

    // Validate signature format
    if (!/^0x[a-fA-F0-9]{130}$/.test(body.signature)) {
      res.status(400).json({ error: 'Invalid signature format' });
      return;
    }

    // Validate and check signature expiry
    const signatureExpiry = BigInt(body.signatureExpiry);
    const now = BigInt(Math.floor(Date.now() / 1000));

    if (signatureExpiry <= now) {
      res.status(400).json({ error: 'Signature has expired' });
      return;
    }

    const secondsUntilExpiry = Number(signatureExpiry - now);
    if (secondsUntilExpiry > SIGNATURE_EXPIRY_MAX) {
      res.status(400).json({ error: `Signature expiry must be at most ${SIGNATURE_EXPIRY_MAX}s in the future` });
      return;
    }

    // Verify signature proves ownership
    const validSignature = await verifyMintSignature(body.owner, label, signatureExpiry, body.signature);
    if (!validSignature) {
      res.status(400).json({ error: 'Invalid signature' });
      return;
    }

    // Validate records limits
    if (body.records?.texts && body.records.texts.length > MAX_TEXT_RECORDS) {
      res.status(400).json({ error: `Maximum ${MAX_TEXT_RECORDS} text records allowed` });
      return;
    }
    if (body.records?.addresses && body.records.addresses.length > MAX_ADDRESS_RECORDS) {
      res.status(400).json({ error: `Maximum ${MAX_ADDRESS_RECORDS} address records allowed` });
      return;
    }

    // Validate individual record sizes
    if (body.records?.texts) {
      for (const text of body.records.texts) {
        if (text.key.length > MAX_TEXT_KEY_LENGTH) {
          res.status(400).json({ error: `Text record key too long (max ${MAX_TEXT_KEY_LENGTH} chars)` });
          return;
        }
        if (text.value.length > MAX_TEXT_VALUE_LENGTH) {
          res.status(400).json({ error: `Text record value too long (max ${MAX_TEXT_VALUE_LENGTH} chars)` });
          return;
        }
      }
    }

    // Whitelist check - fail closed if enabled
    try {
      const whitelist = await getWhitelist();
      if (whitelist?.whitelist && whitelist.whitelist.type !== 0) {
        const minter = body.owner;
        const wallets = whitelist.whitelist.wallets || [];
        const isWhitelisted = wallets.find(
          (i) => i.toLocaleLowerCase() === minter.toLocaleLowerCase()
        );

        if (!isWhitelisted) {
          res.status(403).json({ error: "Not whitelisted" });
          return;
        }
      }
    } catch (err) {
      console.error("Whitelist check error:", err);
      // Fail closed - if whitelist service is down, block minting
      res.status(503).json({ error: 'Whitelist service unavailable. Please try again later.' });
      return;
    }

    // Build records - use provided records or default
    const records: EnsRecords = {
      addresses: [
        {
          value: body.owner,
          chain: ChainName.Ethereum,
        },
        {
          value: body.owner,
          chain: ChainName.Base,
        },
      ],
      texts: [
        {
          key: "avatar",
          value: SHEFI_AVATAR,
        },
        {
          key: "header",
          value: SHEFI_HEADER,
        },
      ],
    };

    // Merge in user-provided text records
    if (body.records?.texts && body.records.texts.length > 0) {
      body.records.texts.forEach((text) => {
        if (text.value && text.value.length > 0) {
          // Check if this key already exists (like avatar)
          const existingIndex = records.texts?.findIndex((t) => t.key === text.key) ?? -1;
          if (existingIndex >= 0 && records.texts) {
            records.texts[existingIndex].value = text.value;
          } else if (records.texts) {
            records.texts.push(text);
          }
        }
      });
    }

    console.log("Minting:", { owner: body.owner, label, recordCount: (records.texts?.length || 0) + (records.addresses?.length || 0) });

    const parameters = await namespaceClient.getMintTransactionParameters({
      minterAddress: wallet.address,
      label: body.label,
      parentName: ENS_NAME,
      owner: body.owner,
      records: records,
    });

    const { request } = await publicClient.simulateContract({
      abi: parameters.abi,
      address: parameters.contractAddress,
      functionName: parameters.functionName,
      args: parameters.args,
      value: parameters.value,
      account: wallet,
    });

    const tx = await walletClient.writeContract(request);

    res.status(200).json({ tx: tx });
  } catch (err: any) {
    console.error("Mint error:", err);
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
