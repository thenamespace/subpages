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
import { ChainName, type EnsRecords } from "@namespacesdk/mint-manager";
import { buildSponsoredMintTx } from "../../utils/sponsoredMint";

// ---------- env ----------
const wallet_key = process.env.WALLET_KEY as Hash | undefined;
const base_rpc =
  process.env.BASE_RPC_URL ||
  (process.env.NEXT_PUBLIC_ALCHEMY_KEY
    ? `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_KEY}`
    : "https://mainnet.base.org");
const PARENT_NAME = "enscomponent.eth";
const PARENT_REGISTRY_ADDRESS = process.env.PARENT_REGISTRY_ADDRESS as
  | Address
  | undefined;

const publicClient = createPublicClient({
  transport: http(base_rpc),
  chain: base,
});

const burnAbi = [
  {
    type: "function",
    name: "burn",
    stateMutability: "nonpayable",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [],
  },
] as const;

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

    // Indexer returns `namehash` (not `node`) and `mintSource` (not `mintedBy`).
    // We use mintSource = "pizzadaoo-swap" to detect names produced by THIS flow,
    // which is how we enforce "one swap per address ever" without storage.
    let items: Array<{
      name: string;
      namehash: string;
      mintSource?: string;
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
      (i) => i.namehash.toLowerCase() === body.oldNode.toLowerCase(),
    );
    if (!oldItem) {
      res.status(400).json({ error: "You don't own that subname" });
      return;
    }

    // "One swap per address ever" — block if any owned name was produced by
    // this flow (mintSource set in the mint params below).
    if (items.some((i) => i.mintSource === "pizzadaoo-swap")) {
      res
        .status(403)
        .json({ error: "You have already used your sponsored swap" });
      return;
    }

    // ----- build the new records (frontend-provided override beats inherited) -----
    const oldTexts = Object.entries(oldItem.texts || {}).map(([key, value]) => ({
      key,
      value,
    }));
    const oldAddresses = Object.entries(oldItem.addresses || {}).map(
      ([coinType, value]) => ({ coinType: Number(coinType), value }),
    );

    const userTexts = (body.records?.texts || []).filter(
      (t) => t.value?.length > 0,
    );
    const userAddresses = (body.records?.addresses || []).filter(
      (a) => a.value?.length > 0,
    );

    const finalTexts: EnsRecords["texts"] =
      userTexts.length > 0 ? userTexts : oldTexts;

    // mint-manager EnsRecords uses `chain: ChainName`, not coinType — map common ones.
    // Fall back to the user's address for eth/base if old subname had nothing.
    const coinToChain: Record<number, ChainName> = {
      60: ChainName.Ethereum,
      2147492101: ChainName.Base, // ENSIP-11 base coinType
    };
    const mappedAddresses: EnsRecords["addresses"] = (
      userAddresses.length > 0 ? userAddresses : oldAddresses
    )
      .map((a) => {
        const chain = coinToChain[a.coinType];
        if (!chain) return null;
        return { value: a.value, chain };
      })
      .filter((x): x is { value: string; chain: ChainName } => x !== null);

    if (mappedAddresses.length === 0) {
      mappedAddresses.push(
        { value: body.owner, chain: ChainName.Ethereum },
        { value: body.owner, chain: ChainName.Base },
      );
    }

    // ENSIP-19 default-address coinType (0x80000000): the fallback any EVM
    // chain falls through to when it has no explicit record. The remint mints
    // to body.owner, so point the default at the owner — mirrors what the
    // initial airdrop sets (scripts/airdrop.mjs) so renamed names resolve on
    // every EVM chain, not just eth/base.
    const ENSIP19_DEFAULT_COIN_TYPE = 2147483648;
    mappedAddresses.push({
      value: body.owner,
      chain: ENSIP19_DEFAULT_COIN_TYPE,
    });

    const records: EnsRecords = {
      texts: finalTexts,
      addresses: mappedAddresses,
    };

    // ----- mint params: mint directly to the user, no transfer step -----
    // buildSponsoredMintTx calls the mint-manager API with an explicit `owner`
    // so the NFT lands on the user from the mint event itself — the indexer
    // records the correct owner immediately and there's no transferFrom to
    // lag or fail.
    const sponsorAccount = privateKeyToAccount(wallet_key);
    const walletClient = createWalletClient({
      transport: http(base_rpc),
      chain: base,
      account: sponsorAccount,
    });

    let mintTxParams;
    try {
      mintTxParams = await buildSponsoredMintTx({
        label,
        parentName: PARENT_NAME,
        minterAddress: sponsorAccount.address,
        owner: body.owner,
        records,
        mintSource: "pizzadaoo-swap",
      });
    } catch (err) {
      console.error("buildSponsoredMintTx failed:", err);
      res.status(500).json({ error: "Could not build mint params" });
      return;
    }

    // ----- simulate BOTH txs against current state before sending either -----
    try {
      await publicClient.simulateContract({
        abi: burnAbi,
        address: PARENT_REGISTRY_ADDRESS!,
        functionName: "burn",
        args: [body.oldNode],
        account: sponsorAccount,
      });
    } catch (err) {
      console.error("Burn simulation failed:", err);
      res
        .status(500)
        .json({ error: "Burn simulation failed — aborting" });
      return;
    }

    try {
      await publicClient.simulateContract({
        abi: mintTxParams.abi,
        address: mintTxParams.address,
        functionName: mintTxParams.functionName,
        args: mintTxParams.args,
        value: mintTxParams.value,
        account: sponsorAccount,
      });
    } catch (err) {
      console.error("Mint simulation failed:", err);
      res
        .status(500)
        .json({ error: "Mint simulation failed — aborting" });
      return;
    }

    // ----- broadcast burn, wait, then mint -----
    // Pass an explicit nonce to each writeContract because viem's internal
    // nonce lookup can race the receipt propagation between Alchemy read
    // replicas, producing "replacement transaction underpriced" errors when
    // two consecutive txs end up requesting the same nonce.
    const burnNonce = await publicClient.getTransactionCount({
      address: sponsorAccount.address,
      blockTag: "pending",
    });
    const burnTx = await walletClient.writeContract({
      abi: burnAbi,
      address: PARENT_REGISTRY_ADDRESS!,
      functionName: "burn",
      args: [body.oldNode],
      nonce: burnNonce,
    });
    const burnReceipt = await publicClient.waitForTransactionReceipt({
      hash: burnTx,
      confirmations: 1,
    });
    if (burnReceipt.status !== "success") {
      res
        .status(500)
        .json({ error: "Burn tx reverted on-chain", burnTx });
      return;
    }

    // Pad the gas limit by 50%. The mint makes an internal resolver call per
    // record; under EIP-150's 63/64 rule a bare estimate can starve those
    // sub-calls and revert the whole mint with gasUsed just under the limit.
    const mintGasEstimate = await publicClient.estimateContractGas({
      abi: mintTxParams.abi,
      address: mintTxParams.address,
      functionName: mintTxParams.functionName,
      args: mintTxParams.args,
      value: mintTxParams.value,
      account: sponsorAccount,
    });
    const mintTx = await walletClient.writeContract({
      abi: mintTxParams.abi,
      address: mintTxParams.address,
      functionName: mintTxParams.functionName,
      args: mintTxParams.args,
      value: mintTxParams.value,
      nonce: burnNonce + 1,
      gas: (mintGasEstimate * BigInt(3)) / BigInt(2),
    });
    const mintReceipt = await publicClient.waitForTransactionReceipt({
      hash: mintTx,
      confirmations: 1,
    });
    if (mintReceipt.status !== "success") {
      // Burn already happened — user is left without a name. Log loudly so
      // we can recover manually.
      console.error("MINT REVERTED AFTER BURN", { burnTx, mintTx, body });
      res.status(500).json({
        error: "Mint reverted after burn — contact support",
        burnTx,
        mintTx,
      });
      return;
    }

    res.status(200).json({
      burnTx,
      mintTx,
      name: `${label}.${PARENT_NAME}`,
    });
  } catch (err: unknown) {
    console.error("Swap error:", err);
    const message =
      err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
}
