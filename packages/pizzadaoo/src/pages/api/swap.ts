import type { NextApiRequest, NextApiResponse } from "next";
import {
  Address,
  Hash,
  Hex,
  createPublicClient,
  createWalletClient,
  encodePacked,
  hashMessage,
  http,
  isAddress,
  keccak256,
  recoverAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { normalize } from "viem/ens";
import axios from "axios";

// ---------- env ----------
const wallet_key = process.env.WALLET_KEY as Hash | undefined;
const base_rpc =
  process.env.BASE_RPC_URL ||
  (process.env.NEXT_PUBLIC_ALCHEMY_KEY
    ? `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_KEY}`
    : "https://mainnet.base.org");
const PARENT_NAME = process.env.PARENT_NAME || "pizzaday.eth";
const PARENT_REGISTRY_ADDRESS = process.env.PARENT_REGISTRY_ADDRESS as
  | Address
  | undefined;

// ---------- constants ----------
const MIN_LABEL_LENGTH = 3;
const MAX_LABEL_LENGTH = 63;
const SIGNATURE_EXPIRY_MAX = 300; // 5 min

// ---------- rate limit (in-memory, best-effort) ----------
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const ADDRESS_RATE_LIMIT_MAX = 3;
const ipMap = new Map<string, { count: number; resetAt: number }>();
const addrMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(
  key: string,
  store: Map<string, { count: number; resetAt: number }>,
  max: number,
): boolean {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

// ---------- signature ----------
function constructSwapMessageHash(
  owner: Address,
  oldNode: Hex,
  oldFullName: string,
  newLabel: string,
  expiry: bigint,
): Hex {
  return keccak256(
    encodePacked(
      ["address", "bytes32", "string", "string", "uint256", "uint256"],
      [owner, oldNode, oldFullName, newLabel, BigInt(base.id), expiry],
    ),
  );
}

interface SwapRequestBody {
  owner: Address;
  oldNode: Hex;
  oldFullName: string;
  newLabel: string;
  expiry: string;
  signature: Hex;
  records?: {
    texts?: { key: string; value: string }[];
    addresses?: { coinType: number; value: string }[];
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // ----- env sanity -----
  if (!wallet_key || !PARENT_REGISTRY_ADDRESS) {
    res.status(500).json({ error: "Server not configured for swap" });
    return;
  }

  try {
    const body = req.body as SwapRequestBody;

    // ----- ip rate limit -----
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
      req.socket.remoteAddress ||
      "unknown";
    if (!checkRateLimit(ip, ipMap, RATE_LIMIT_MAX_REQUESTS)) {
      res.status(429).json({ error: "Too many requests" });
      return;
    }

    // ----- shape -----
    if (
      !body.owner ||
      !body.oldNode ||
      !body.oldFullName ||
      !body.newLabel ||
      !body.signature ||
      !body.expiry
    ) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }
    if (!isAddress(body.owner)) {
      res.status(400).json({ error: "Invalid owner address" });
      return;
    }
    if (!checkRateLimit(body.owner.toLowerCase(), addrMap, ADDRESS_RATE_LIMIT_MAX)) {
      res.status(429).json({ error: "Too many requests for this address" });
      return;
    }
    if (!/^0x[a-fA-F0-9]{64}$/.test(body.oldNode)) {
      res.status(400).json({ error: "Invalid oldNode" });
      return;
    }
    if (!/^0x[a-fA-F0-9]{130}$/.test(body.signature)) {
      res.status(400).json({ error: "Invalid signature format" });
      return;
    }
    if (!body.oldFullName.endsWith(`.${PARENT_NAME}`)) {
      res.status(400).json({ error: "oldFullName parent mismatch" });
      return;
    }

    // ----- label -----
    const label = body.newLabel.toLowerCase();
    if (label.includes(".")) {
      res.status(400).json({ error: "Label cannot contain dots" });
      return;
    }
    if (label.length < MIN_LABEL_LENGTH || label.length > MAX_LABEL_LENGTH) {
      res.status(400).json({
        error: `Label must be ${MIN_LABEL_LENGTH}-${MAX_LABEL_LENGTH} chars`,
      });
      return;
    }
    try {
      normalize(label);
    } catch {
      res.status(400).json({ error: "Invalid ENS label" });
      return;
    }

    // ----- expiry -----
    const expiry = BigInt(body.expiry);
    const now = BigInt(Math.floor(Date.now() / 1000));
    if (expiry <= now) {
      res.status(400).json({ error: "Signature expired" });
      return;
    }
    if (Number(expiry - now) > SIGNATURE_EXPIRY_MAX) {
      res
        .status(400)
        .json({ error: `Expiry max ${SIGNATURE_EXPIRY_MAX}s in future` });
      return;
    }

    // ----- signature -----
    const hash = constructSwapMessageHash(
      body.owner,
      body.oldNode,
      body.oldFullName,
      label,
      expiry,
    );
    const recovered = await recoverAddress({
      hash: hashMessage({ raw: hash }),
      signature: body.signature,
    });
    if (recovered.toLowerCase() !== body.owner.toLowerCase()) {
      res.status(400).json({ error: "Invalid signature" });
      return;
    }

    // ----- eligibility via indexer -----
    const indexerUrl = "https://indexer.namespace.ninja/api/v1/nodes";
    const sponsorAddress = privateKeyToAccount(wallet_key).address;

    let items: Array<{
      name: string;
      node: string;
      mintedBy?: string;
      texts?: Record<string, string>;
      addresses?: Record<string, string>;
    }> = [];
    try {
      const idx = await axios.get(indexerUrl, {
        params: { owner: body.owner, parentName: PARENT_NAME },
        timeout: 10_000,
      });
      items = idx.data?.items || [];
    } catch (err) {
      console.error("Indexer error:", err);
      res
        .status(503)
        .json({ error: "Indexer unavailable, try again later" });
      return;
    }

    if (items.length === 0) {
      res
        .status(403)
        .json({ error: `No ${PARENT_NAME} subname to swap` });
      return;
    }

    const oldItem = items.find(
      (i) => i.node.toLowerCase() === body.oldNode.toLowerCase(),
    );
    if (!oldItem) {
      res.status(400).json({ error: "You don't own that subname" });
      return;
    }

    if (
      items.some(
        (i) =>
          i.mintedBy?.toLowerCase() === sponsorAddress.toLowerCase(),
      )
    ) {
      res
        .status(403)
        .json({ error: "You have already used your sponsored swap" });
      return;
    }

    // Burn + mint are added in the next task. For now respond with a preview
    // so we can inspect the inherited records during dev.
    res.status(501).json({
      error: "Not implemented yet",
      preview: {
        sponsor: sponsorAddress,
        oldName: oldItem.name,
        oldRecords: { texts: oldItem.texts, addresses: oldItem.addresses },
        newName: `${label}.${PARENT_NAME}`,
      },
    });
  } catch (err: unknown) {
    console.error("Swap error:", err);
    const message =
      err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
}
