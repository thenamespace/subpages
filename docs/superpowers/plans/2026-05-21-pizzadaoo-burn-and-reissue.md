# Pizzadaoo Burn-and-Reissue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an airdrop recipient swap their `*.pizzaday.eth` subname (testing: `*.enscomponent.eth`) for one of their own choosing, gas-free, via a single signature.

**Architecture:** Frontend adds a "Rename" affordance inside the existing SingleSubname detail view for subnames under the configured parent. User signs an EIP-191 message (committing to owner, oldNode, oldFullName, newLabel, chainId, expiry). A new Next.js API route verifies the signature, checks indexer eligibility (must own a name under the parent; must not have used the sponsored swap yet), simulates burn+mint pre-flight, then broadcasts `burn` on the child registry and `mint` via `@namespacesdk/mint-manager` from the sponsor wallet. No new storage layer.

**Tech Stack:** Next.js Pages Router, viem, wagmi, `@namespacesdk/mint-manager`, RainbowKit (already wired). Base mainnet. Backend wallet is `privateKeyToAccount(WALLET_KEY)`.

**Reference:**
- Spec: `docs/superpowers/specs/2026-05-21-pizzadaoo-burn-and-reissue-design.md`
- Existing sponsored-mint pattern to mirror: `packages/shefi-new/src/pages/api/mint.ts` and `packages/shefi-new/src/lib/sponsor.ts`
- Burn ABI source: `contracts/l2/registries/EnsNameRegistry.sol::burn(bytes32 node)` modifier `registryTokenOwner`. Reverts `NodeNotControllable` if the registry was not deployed as Controllable.

**Testing convention:** The pizzadaoo package has no automated tests. Verification is manual (curl, cast, browser). Each task has an explicit verification step.

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `packages/pizzadaoo/.env.example` | modify | Add `NEXT_PUBLIC_PARENT_NAME` (already has the server-only vars) |
| `packages/pizzadaoo/src/components/Listing.tsx` | modify | Add `PIZZADAY_ETH` from env, include in `LISTED_NAMES` |
| `packages/pizzadaoo/src/components/MintForm.tsx` | modify | Add `pizzaday.eth` case to `getInstructionText` |
| `packages/pizzadaoo/src/utils/swap.ts` | create | Frontend helpers: build message hash, get expiry, POST to /api/swap |
| `packages/pizzadaoo/src/components/SwapModal.tsx` | create | Swap UI: label input + availability + records preview + sign button |
| `packages/pizzadaoo/src/components/SwapModal.scss` | create | Modal styling, matching the existing tech-form aesthetic |
| `packages/pizzadaoo/src/components/SingleSubname.tsx` | modify | Conditionally render "Rename" button when subname is under `PARENT_NAME` |
| `packages/pizzadaoo/src/pages/api/swap.ts` | create | Server route: validate, verify sig, check eligibility, simulate, burn, mint |

---

## Task 1: Wire up the parent name as a configurable listing

**Files:**
- Modify: `packages/pizzadaoo/.env.example`
- Modify: `packages/pizzadaoo/src/components/Listing.tsx`

- [ ] **Step 1: Add `NEXT_PUBLIC_PARENT_NAME` to .env.example**

Append at the end of `packages/pizzadaoo/.env.example`:

```bash

# Client-side mirror of PARENT_NAME (the parent used by the sponsored
# burn-and-reissue flow). Must match PARENT_NAME on the server side.
# enscomponent.eth for staging, pizzaday.eth for production.
NEXT_PUBLIC_PARENT_NAME=enscomponent.eth
```

- [ ] **Step 2: Extend `Listing.tsx` to include the swap parent**

Replace the contents of `packages/pizzadaoo/src/components/Listing.tsx`:

```typescript
import { namehash } from "viem";
import { base } from "viem/chains";

export interface Listing {
  fullName: string
  label: string
  network: string
  node: string
  listingType: string
  registryNetwork: string
}

export const RAREPIZZA_ETH: Listing = {
  fullName: "rarepizzas.eth",
  label: "rarepizzas",
  network: "mainnet",
  node: namehash("rarepizzas.eth"),
  listingType: "l2",
  registryNetwork: "base",
};

export const PIZZADAO_ETH: Listing = {
  fullName: "pizzadao.eth",
  label: "pizzadao",
  network: "mainnet",
  node: namehash("pizzadao.eth"),
  listingType: "l2",
  registryNetwork: "base",
};

export const PIZZAMAFIA_ETH: Listing = {
  fullName: "pizzamafia.eth",
  label: "pizzamafia",
  network: "mainnet",
  node: namehash("pizzamafia.eth"),
  listingType: "l2",
  registryNetwork: "base",
};

// The parent used by the sponsored burn-and-reissue flow.
// Driven by env so we can flip enscomponent.eth (testing) <-> pizzaday.eth (prod).
export const SWAP_PARENT_NAME =
  process.env.NEXT_PUBLIC_PARENT_NAME || "pizzaday.eth";

export const PIZZADAY_ETH: Listing = {
  fullName: SWAP_PARENT_NAME,
  label: SWAP_PARENT_NAME.split(".")[0],
  network: "mainnet",
  node: namehash(SWAP_PARENT_NAME),
  listingType: "l2",
  registryNetwork: "base",
};

export const LISTED_NAMES: Listing[] = [
  PIZZADAO_ETH,
  PIZZAMAFIA_ETH,
  RAREPIZZA_ETH,
  PIZZADAY_ETH,
];

export const LISTING_CHAIN_ID = base.id;
```

- [ ] **Step 3: Update MintForm instruction text**

In `packages/pizzadaoo/src/components/MintForm.tsx`, find `getInstructionText` and add a case so the new listing has copy. Replace this function:

```typescript
  const getInstructionText = (domainName: string) => {
    switch (domainName) {
      case "pizzadao.eth":
        return "Ask a Capo or DPR to mint your crew number for you.";
      case "pizzamafia.eth":
        return "Anyone with a Rare Pizza Box NFT can mint a pizza mafia name.";
      case "rarepizzas.eth":
        return "Ask a Capo or DPR to mint your topping for you.";
      default:
        return "";
    }
  };
```

with:

```typescript
  const getInstructionText = (domainName: string) => {
    switch (domainName) {
      case "pizzadao.eth":
        return "Ask a Capo or DPR to mint your crew number for you.";
      case "pizzamafia.eth":
        return "Anyone with a Rare Pizza Box NFT can mint a pizza mafia name.";
      case "rarepizzas.eth":
        return "Ask a Capo or DPR to mint your topping for you.";
      case SWAP_PARENT_NAME:
        return "Already have one? Visit My Subnames to rename it for free.";
      default:
        return "";
    }
  };
```

Add `SWAP_PARENT_NAME` to the existing import from `./Listing` at the top of the file:

```typescript
import { LISTED_NAMES, Listing, LISTING_CHAIN_ID, SWAP_PARENT_NAME } from "./Listing";
```

- [ ] **Step 4: Run typecheck**

Run from `packages/pizzadaoo`:

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Visual smoke check**

Start the dev server (`pnpm dev` from `packages/pizzadaoo`), open `/`, confirm a fourth badge for `enscomponent.eth` appears next to the existing three, and clicking it shows the new instruction text.

- [ ] **Step 6: Commit**

```bash
git add packages/pizzadaoo/.env.example \
        packages/pizzadaoo/src/components/Listing.tsx \
        packages/pizzadaoo/src/components/MintForm.tsx
git commit -m "feat(pizzadaoo): add swap-parent listing driven by NEXT_PUBLIC_PARENT_NAME"
```

---

## Task 2: Frontend swap helpers

**Files:**
- Create: `packages/pizzadaoo/src/utils/swap.ts`

- [ ] **Step 1: Write the helper module**

Create `packages/pizzadaoo/src/utils/swap.ts`:

```typescript
import {
  Address,
  Hex,
  encodePacked,
  keccak256,
} from "viem";

export interface SwapRecords {
  texts?: { key: string; value: string }[];
  addresses?: { coinType: number; value: string }[];
}

export interface SwapRequest {
  owner: Address;
  oldNode: Hex;          // namehash(oldFullName)
  oldFullName: string;   // e.g. "alice.enscomponent.eth"
  newLabel: string;      // e.g. "bob"
  expiry: string;        // bigint as decimal string
  signature: Hex;
  records?: SwapRecords;
}

export interface SwapResponse {
  burnTx: Hex;
  mintTx: Hex;
  name: string;
}

const SWAP_CHAIN_ID = 8453; // Base mainnet

/**
 * Builds the message hash the user signs. Mirrors shefi-new's constructMintMessageHash
 * but covers the burn+mint pair so a leaked signature can't be repurposed for a
 * different name or chain.
 */
export function constructSwapMessageHash(
  owner: Address,
  oldNode: Hex,
  oldFullName: string,
  newLabel: string,
  expiry: bigint,
): Hex {
  return keccak256(
    encodePacked(
      ["address", "bytes32", "string", "string", "uint256", "uint256"],
      [owner, oldNode, oldFullName, newLabel, BigInt(SWAP_CHAIN_ID), expiry],
    ),
  );
}

/** 5-minute expiry, same window as the existing sponsored flows. */
export function getSwapExpiry(): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + 300);
}

export async function submitSwap(body: SwapRequest): Promise<SwapResponse> {
  const res = await fetch("/api/swap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Swap failed");
  }
  return data as SwapResponse;
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/pizzadaoo/src/utils/swap.ts
git commit -m "feat(pizzadaoo): swap message-hash + submit helpers"
```

---

## Task 3: API route — scaffold + signature verification

**Files:**
- Create: `packages/pizzadaoo/src/pages/api/swap.ts`

- [ ] **Step 1: Create the route with validation + signature verification only**

Create `packages/pizzadaoo/src/pages/api/swap.ts`:

```typescript
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

    // Eligibility, simulation, and broadcast are added in subsequent tasks.
    res.status(501).json({ error: "Not implemented yet" });
  } catch (err: unknown) {
    console.error("Swap error:", err);
    const message =
      err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manual verification — bad payload**

Start the dev server (`pnpm dev`). In another terminal:

```bash
curl -s -X POST http://localhost:3000/api/swap \
  -H 'Content-Type: application/json' \
  -d '{}'
```

Expected: `{"error":"Missing required fields"}` with HTTP 400.

- [ ] **Step 4: Manual verification — bad signature**

```bash
curl -s -X POST http://localhost:3000/api/swap \
  -H 'Content-Type: application/json' \
  -d '{
    "owner":"0x0000000000000000000000000000000000000001",
    "oldNode":"0x0000000000000000000000000000000000000000000000000000000000000000",
    "oldFullName":"foo.enscomponent.eth",
    "newLabel":"bar",
    "expiry":"9999999999",
    "signature":"0x'"$(printf '0%.0s' {1..130})"'"
  }'
```

Expected: `{"error":"Invalid signature"}` with HTTP 400.

- [ ] **Step 5: Commit**

```bash
git add packages/pizzadaoo/src/pages/api/swap.ts
git commit -m "feat(pizzadaoo): /api/swap scaffold with sig validation"
```

---

## Task 4: API route — indexer eligibility check

**Files:**
- Modify: `packages/pizzadaoo/src/pages/api/swap.ts`

- [ ] **Step 1: Add the eligibility check**

Replace the placeholder line `res.status(501).json({ error: "Not implemented yet" });` at the end of the handler with the block below, and add the `axios` import at the top of the file:

```typescript
import axios from "axios";
```

```typescript
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

    // Burn + mint are added in the next task. For now respond with the
    // parameters we'd act on, so we can inspect them during dev.
    res.status(501).json({
      error: "Not implemented yet",
      preview: {
        sponsor: sponsorAddress,
        oldName: oldItem.name,
        oldRecords: { texts: oldItem.texts, addresses: oldItem.addresses },
        newName: `${label}.${PARENT_NAME}`,
      },
    });
```

- [ ] **Step 2: Typecheck**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manual verification — indexer call with real wallet**

Pick a wallet that owns at least one `*.enscomponent.eth` subname (or mint one to a test wallet first by calling the controller mint from the sponsor wallet). Sign a real message with that wallet using the helper you wrote in Task 2 (use a small REPL or temporarily wire it via the SwapModal once Task 6 lands). For now, just hit the indexer manually:

```bash
curl -s 'https://indexer.namespace.ninja/api/v1/nodes?owner=0xYOUR_WALLET&parentName=enscomponent.eth' | python3 -m json.tool | head -40
```

Expected: a non-empty `items` array. Inspect whether each item includes a `mintedBy` field. If absent, note in the spec's §9 that the fallback (RPC event scan) is needed — handle this in Task 5 if necessary.

- [ ] **Step 4: Commit**

```bash
git add packages/pizzadaoo/src/pages/api/swap.ts
git commit -m "feat(pizzadaoo): /api/swap indexer eligibility check"
```

---

## Task 5: API route — simulate, burn, mint

**Files:**
- Modify: `packages/pizzadaoo/src/pages/api/swap.ts`

- [ ] **Step 1: Replace the placeholder response with the real burn+mint pipeline**

Add imports at the top of the file:

```typescript
import {
  ChainName,
  createMintClient,
  type EnsRecords,
} from "@namespacesdk/mint-manager";
```

Add the SDK singleton + clients near the other module-scope constants:

```typescript
const mintClient = createMintClient({
  mintSource: "pizzadaoo-swap",
  cursomRpcUrls: { [base.id]: base_rpc },
});
const publicClient = createPublicClient({
  transport: http(base_rpc),
  chain: base,
});
```

Add the burn ABI fragment:

```typescript
const burnAbi = [
  {
    type: "function",
    name: "burn",
    stateMutability: "nonpayable",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [],
  },
] as const;
```

Replace the placeholder `res.status(501).json({ error: "Not implemented yet", preview: ... })` block from Task 4 with:

```typescript
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

    const records: EnsRecords = {
      texts: finalTexts,
      addresses: mappedAddresses,
    };

    // ----- mint params (used for simulation + broadcast) -----
    const sponsorAccount = privateKeyToAccount(wallet_key);
    const walletClient = createWalletClient({
      transport: http(base_rpc),
      chain: base,
      account: sponsorAccount,
    });

    let mintParams;
    try {
      mintParams = await mintClient.getMintTransactionParameters({
        minterAddress: sponsorAccount.address,
        label,
        parentName: PARENT_NAME,
        owner: body.owner,
        records,
      });
    } catch (err) {
      console.error("getMintTransactionParameters failed:", err);
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
        abi: mintParams.abi,
        address: mintParams.contractAddress,
        functionName: mintParams.functionName,
        args: mintParams.args,
        value: mintParams.value,
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
    const burnTx = await walletClient.writeContract({
      abi: burnAbi,
      address: PARENT_REGISTRY_ADDRESS!,
      functionName: "burn",
      args: [body.oldNode],
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

    const mintTx = await walletClient.writeContract({
      abi: mintParams.abi,
      address: mintParams.contractAddress,
      functionName: mintParams.functionName,
      args: mintParams.args,
      value: mintParams.value,
    });
    const mintReceipt = await publicClient.waitForTransactionReceipt({
      hash: mintTx,
      confirmations: 1,
    });
    if (mintReceipt.status !== "success") {
      // Burn already happened — user is left without a name. Log loudly so
      // we can recover manually (see spec §4.3).
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
```

- [ ] **Step 2: Typecheck**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Pre-flight verification — sponsor wallet is correctly configured**

Before running the full route, confirm the sponsor wallet meets both auth requirements:

```bash
# (a) sponsor is registry NFT owner — burn permission
cast call 0xBE4959D119CbDBFa9825C89Be482e486788B3C95 \
  "ownerOf(uint256)(address)" \
  81511424177167576696569827764199425437438188996995838008072920576825926423110 \
  --rpc-url https://mainnet.base.org
# Expected: 0x507E27d7191c556e0Fd40799cdF4AbcC9c7F0706

# (b) sponsor is on the mint whitelist (already confirmed in list-manager listing)
curl -s 'https://list-manager.namespace.ninja/api/v1/listing/network/MAINNET/name/enscomponent.eth' \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['whitelist'])"
# Expected wallets array contains 0x507E27d7191c556e0Fd40799cdF4AbcC9c7F0706
```

- [ ] **Step 4: Commit**

```bash
git add packages/pizzadaoo/src/pages/api/swap.ts
git commit -m "feat(pizzadaoo): /api/swap simulate + burn + mint pipeline"
```

---

## Task 6: SwapModal component

**Files:**
- Create: `packages/pizzadaoo/src/components/SwapModal.tsx`
- Create: `packages/pizzadaoo/src/components/SwapModal.scss`

- [ ] **Step 1: Write the modal component**

Create `packages/pizzadaoo/src/components/SwapModal.tsx`:

```typescript
import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useSignMessage, useSwitchChain } from "wagmi";
import { normalise } from "@ensdomains/ensjs/utils";
import { Hex } from "viem";
import { toast } from "react-toastify";
import { PlainBtn } from "./TechBtn";
import { Spinner } from "./Spinner";
import { LISTING_CHAIN_ID, SWAP_PARENT_NAME } from "./Listing";
import { Subname } from "./Models";
import {
  constructSwapMessageHash,
  getSwapExpiry,
  submitSwap,
  type SwapRecords,
} from "../utils/swap";
import { createMintClient } from "@namespacesdk/mint-manager";
import { debounce } from "../utils/debounce";
import { getTxErrorMessage, isUserRejection } from "../utils/txError";
import "./SwapModal.scss";

let mintClientSingleton: ReturnType<typeof createMintClient> | undefined;
const getMintClient = () =>
  (mintClientSingleton ??= createMintClient({ mintSource: "pizzadaoo-swap" }));

type Availability = "idle" | "checking" | "available" | "unavailable" | "error";

interface Props {
  oldSubname: Subname;
  onClose: () => void;
  onSuccess: (newName: string) => void;
}

export const SwapModal = ({ oldSubname, onClose, onSuccess }: Props) => {
  const { address, chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { signMessageAsync } = useSignMessage();
  const [label, setLabel] = useState("");
  const [availability, setAvailability] = useState<Availability>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const checkAvailable = async (value: string) => {
    try {
      const isAvail = await getMintClient().isL2SubnameAvailable(
        `${value}.${SWAP_PARENT_NAME}`,
        LISTING_CHAIN_ID,
      );
      if (!mountedRef.current) return;
      setAvailability(isAvail ? "available" : "unavailable");
    } catch {
      if (!mountedRef.current) return;
      setAvailability("error");
    }
  };

  const debouncedCheck = useMemo(
    () => debounce((v: string) => void checkAvailable(v), 300),
    [],
  );
  useEffect(() => () => debouncedCheck.cancel(), [debouncedCheck]);

  const handleLabelChange = (raw: string) => {
    const v = raw.toLowerCase();
    if (v.includes(".")) return;
    try { normalise(v); } catch { return; }
    setLabel(v);
    setError(null);
    if (v.length === 0) {
      setAvailability("idle");
      return;
    }
    setAvailability("checking");
    debouncedCheck(v);
  };

  const handleSwap = async () => {
    if (!address) return;
    setError(null);

    if (chain?.id !== LISTING_CHAIN_ID) {
      try { await switchChainAsync({ chainId: LISTING_CHAIN_ID }); }
      catch (err) {
        if (!isUserRejection(err)) {
          toast("Please switch to Base.", { className: "tech-toasty", type: "error" });
        }
        return;
      }
    }

    const expiry = getSwapExpiry();
    const hash = constructSwapMessageHash(
      address,
      oldSubname.node as Hex,
      oldSubname.name,
      label,
      expiry,
    );

    let signature: Hex;
    try {
      signature = await signMessageAsync({ message: { raw: hash } });
    } catch (err) {
      if (!isUserRejection(err)) {
        setError(getTxErrorMessage(err) || "Signing failed");
      }
      return;
    }

    setSubmitting(true);
    try {
      // Inherit by sending no records override — backend uses old subname records.
      const records: SwapRecords | undefined = undefined;
      const res = await submitSwap({
        owner: address,
        oldNode: oldSubname.node as Hex,
        oldFullName: oldSubname.name,
        newLabel: label,
        expiry: expiry.toString(),
        signature,
        records,
      });
      onSuccess(res.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Swap failed");
    } finally {
      if (mountedRef.current) setSubmitting(false);
    }
  };

  const disabled =
    label.length === 0 || availability !== "available" || submitting;

  return (
    <div className="swap-modal">
      <h2 className="swap-modal__title">Rename subname</h2>
      <p className="swap-modal__current">
        Current: <strong>{oldSubname.name}</strong>
      </p>
      <p className="swap-modal__note">
        Burns your current name and mints the new one. Free, one swap per
        wallet ever.
      </p>

      <p className="swap-modal__preview">
        <span>{label || "{name}"}</span>.{SWAP_PARENT_NAME}
      </p>

      <div className="tech-input-container">
        <input
          className="tech-input"
          value={label}
          onChange={(e) => handleLabelChange(e.target.value)}
          placeholder="new name…"
          disabled={submitting}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        <div className="loader-cont">
          {availability === "checking" && <Spinner />}
        </div>
      </div>

      {availability === "unavailable" && (
        <p className="swap-modal__hint swap-modal__hint--bad">Name taken</p>
      )}
      {availability === "available" && (
        <p className="swap-modal__hint swap-modal__hint--good">Name available</p>
      )}
      {availability === "error" && (
        <p className="swap-modal__hint swap-modal__hint--bad">
          Couldn&apos;t check availability
        </p>
      )}

      <div className="swap-modal__actions">
        <PlainBtn onClick={onClose} disabled={submitting}>Cancel</PlainBtn>
        <PlainBtn onClick={handleSwap} disabled={disabled} loading={submitting}>
          {submitting ? "Swapping…" : "Sign & swap"}
        </PlainBtn>
      </div>

      {error && (
        <p className="swap-modal__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Add the modal styles**

Create `packages/pizzadaoo/src/components/SwapModal.scss`:

```scss
.swap-modal {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  max-width: 480px;

  &__title { margin: 0; font-size: 1.25rem; }
  &__current { margin: 0; opacity: 0.8; }
  &__note { margin: 0; font-size: 0.85rem; opacity: 0.7; }

  &__preview {
    margin: 8px 0;
    text-align: center;
    font-family: monospace;
    font-size: 1.1rem;

    span { color: #5C61FF; }
  }

  &__hint {
    margin: 4px 0 0;
    font-size: 0.85rem;
    &--good { color: #2bb673; }
    &--bad { color: #d05050; }
  }

  &__actions {
    display: flex;
    gap: 8px;
    margin-top: 12px;
    justify-content: flex-end;
  }

  &__error {
    margin-top: 8px;
    color: #d05050;
    font-size: 0.9rem;
  }
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/pizzadaoo/src/components/SwapModal.tsx \
        packages/pizzadaoo/src/components/SwapModal.scss
git commit -m "feat(pizzadaoo): SwapModal for sponsored rename"
```

---

## Task 7: Wire the Rename button into SingleSubname

**Files:**
- Modify: `packages/pizzadaoo/src/components/SingleSubname.tsx`

- [ ] **Step 1: Add Rename action gated by parent name**

At the top of `SingleSubname.tsx` add imports:

```typescript
import { SWAP_PARENT_NAME } from "./Listing";
import { SwapModal } from "./SwapModal";
```

Inside the `SingleSubname` component, add state:

```typescript
  const [swapping, setSwapping] = useState(false);
  const [swapSuccessName, setSwapSuccessName] = useState<string | null>(null);

  const canSwap =
    subname.name.endsWith(`.${SWAP_PARENT_NAME}`) && !swapSuccessName;
```

In the render section, add the Rename button near the existing action buttons (look for the existing `PlainBtn` cluster — adjust placement to match the existing layout):

```typescript
      {canSwap && (
        <PlainBtn onClick={() => setSwapping(true)} className="rename-btn">
          Rename (free)
        </PlainBtn>
      )}

      {swapping && (
        <SwapModal
          oldSubname={subname}
          onClose={() => setSwapping(false)}
          onSuccess={(name) => {
            setSwapping(false);
            setSwapSuccessName(name);
            toast(`Renamed to ${name}`, {
              className: "tech-toasty",
              type: "success",
            });
            onUpdate();
          }}
        />
      )}

      {swapSuccessName && (
        <p className="swap-success-banner">
          You&apos;re now <strong>{swapSuccessName}</strong>. The page will
          refresh shortly.
        </p>
      )}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Visual smoke check**

Start the dev server, connect a wallet that owns a `*.enscomponent.eth` name, navigate to `/subnames`, click the card to open the side modal, confirm the "Rename (free)" button appears for that name and does **not** appear for any `*.pizzadao.eth` / `*.pizzamafia.eth` / `*.rarepizzas.eth` cards.

- [ ] **Step 4: Commit**

```bash
git add packages/pizzadaoo/src/components/SingleSubname.tsx
git commit -m "feat(pizzadaoo): Rename action on swap-parent subnames"
```

---

## Task 8: End-to-end manual verification

**Files:** (none modified)

- [ ] **Step 1: Confirm env is populated**

In `packages/pizzadaoo/.env`:

```bash
NEXT_PUBLIC_PARENT_NAME=enscomponent.eth
PARENT_NAME=enscomponent.eth
PARENT_REGISTRY_ADDRESS=0xBE4959D119CbDBFa9825C89Be482e486788B3C95
WALLET_KEY=0x...          # private key of 0x507E27d7191c556e0Fd40799cdF4AbcC9c7F0706
BASE_RPC_URL=             # optional; defaults to mainnet.base.org
```

Restart the dev server after editing `.env`.

- [ ] **Step 2: Pre-flight — make sure a test wallet owns an enscomponent.eth subname**

Pick a test wallet (NOT the sponsor wallet). If it doesn't already own one, mint one to it from the sponsor wallet using the controller's normal mint flow (out of scope of this plan — easiest path is to use the existing MintForm on `/` since the sponsor wallet is whitelisted and the mint flow already works for user-paid mints).

Confirm with the indexer:

```bash
curl -s 'https://indexer.namespace.ninja/api/v1/nodes?owner=0xTEST_WALLET&parentName=enscomponent.eth' \
  | python3 -m json.tool | head -30
```

Expected: at least one item.

- [ ] **Step 3: Happy path — sign & swap**

In the browser, connect the test wallet. Open `/subnames`. Open the owned subname's detail. Click **Rename (free)**. Pick a new label that the availability check marks as available. Click **Sign & swap**. Approve the signature.

Expected within ~10s: the swap-success banner appears with the new name. Browser console shows no errors.

- [ ] **Step 4: Verify on-chain state**

```bash
# old subname is burned -> ownerOf should revert or return zero
cast call 0xBE4959D119CbDBFa9825C89Be482e486788B3C95 \
  "ownerOf(uint256)(address)" \
  <decimal of namehash(oldFullName)> \
  --rpc-url https://mainnet.base.org
# Expected: revert (ERC721NonexistentToken) or 0x0…

# new subname is minted to the test wallet
cast call 0xBE4959D119CbDBFa9825C89Be482e486788B3C95 \
  "ownerOf(uint256)(address)" \
  <decimal of namehash(newFullName)> \
  --rpc-url https://mainnet.base.org
# Expected: the test wallet address
```

- [ ] **Step 5: Already-swapped path**

Click Rename again from the same wallet. After signing, the API should reject with `"You have already used your sponsored swap"`.

- [ ] **Step 6: Not-owner path**

Connect a fresh wallet with no `*.enscomponent.eth` subnames. The Rename button should not appear. Hit the API directly:

```bash
curl -s -X POST http://localhost:3000/api/swap \
  -H 'Content-Type: application/json' \
  -d '{ "owner":"0xFRESH_WALLET", "oldNode":"0x...", "oldFullName":"foo.enscomponent.eth", "newLabel":"bar", "expiry":"...", "signature":"0x...(valid sig from fresh wallet)" }'
```

Expected: 403 `"No enscomponent.eth subname to swap"`.

- [ ] **Step 7: Final commit (if there are any tweaks)**

If you found bugs during verification, fix them and commit per task. Otherwise no commit needed.

---

## Plan self-review

- **Spec coverage**
  - §1 goals: covered by Tasks 1, 6, 7 (UI), Tasks 3-5 (API).
  - §3 indexer eligibility: Task 4 (with explicit fallback flag for missing `mintedBy`).
  - §4 swap flow: Tasks 3-5 (backend), Tasks 2/6/7 (frontend).
  - §5 frontend changes: Tasks 1, 6, 7.
  - §6 backend changes: Tasks 3-5.
  - §7 env: Task 1 (NEXT_PUBLIC_PARENT_NAME); server vars are already in `.env.example` from the spec commit.
  - §8 testing plan: Task 8.
  - §10 future-work EIP-712: deferred, not part of this plan.
- **Placeholder scan:** none. Every code block is complete.
- **Type consistency:** `SwapRequest` in `utils/swap.ts` matches `SwapRequestBody` in `api/swap.ts` 1:1 (owner, oldNode, oldFullName, newLabel, expiry as string, signature, records). `SWAP_PARENT_NAME` import is consistent across `Listing.tsx`, `MintForm.tsx`, `SwapModal.tsx`, `SingleSubname.tsx`.

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-21-pizzadaoo-burn-and-reissue.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks.
2. **Inline Execution** — execute tasks in this session with checkpoints.

Which approach?
