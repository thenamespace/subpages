# Pizzadaoo — Sponsored Burn-and-Reissue Flow

**Status:** Draft, pending user review
**Owner:** Harpreet (HAPPYS1NGH)
**Branch:** `feat/pizzadaoo-burn-and-reissue`
**Test parent:** `enscomponent.eth` (singular — that's the listing that exists)
**Prod parent:** `pizzaday.eth` (to be added later via env flip)

## 1. Goals

Let an airdrop recipient swap the `*.pizzaday.eth` subname they were given for one of their own choosing, with zero gas, signing once.

- **In scope**
  - Add `pizzaday.eth` as a 4th parent in `LISTED_NAMES`, controlled by a single env var (`PARENT_NAME`) so we can point at `enscomponent.eth` for testing without code changes.
  - On the **My Subnames** page, every owned `*.pizzaday.eth` card gets a **"Rename"** action.
  - The Rename action opens a swap modal: user picks a new label, the modal pre-fills the existing records (avatar / texts / addresses) and lets the user edit them, then the user signs one message.
  - Backend verifies the signature, then sequentially `burn(oldNode)` on the child registry and `mint(newLabel, ...)` via `@namespacesdk/mint-manager`. Pre-flight simulation of both txs before broadcasting either.
  - One sponsored swap per address ever, enforced by indexer lookup at request time (no new storage layer).

- **Out of scope**
  - No KV / DB / new contracts.
  - Existing free-mint UX for `pizzadao.eth` / `pizzamafia.eth` / `rarepizzas.eth` stays untouched.
  - No cross-parent swaps. Only `*.pizzaday.eth` → `*.pizzaday.eth`.
  - No EIP-712 typed-data signing in this iteration (deferred — see §10).

## 2. Architecture overview

```
┌─────────────────────────────────────────────┐         ┌──────────────────────────────────────┐
│ Browser (Next.js page /subnames)            │         │ Next.js API route /api/swap          │
│                                             │         │                                      │
│ MySubnames                                  │         │ 1. validate body                     │
│  └─ SwapModal (new)                         │         │ 2. verify EIP-191 signature           │
│      ├─ label input + availability check    │  POST   │ 3. confirm owner currently holds     │
│      ├─ records form (pre-filled, editable) │ ──────▶ │    oldNode (RPC ownerOf)              │
│      └─ Sign button                         │         │ 4. confirm "one swap ever" via       │
│         signs EIP-191(oldNode || ...)       │         │    indexer (mintedBy != sponsor)     │
└─────────────────────────────────────────────┘         │ 5. simulate burn + mint              │
                                                        │ 6. send burn → wait receipt          │
                                                        │ 7. send mint → wait receipt          │
                                                        │ 8. return { burnTx, mintTx, name }   │
                                                        └──────────────────────────────────────┘
                                                                       │ viem walletClient
                                                                       ▼
                                       ┌────────────────────────────────────────────────┐
                                       │ Base mainnet (chain 8453)                       │
                                       │  • PARENT_REGISTRY_ADDRESS .burn(oldNode)       │
                                       │  • controller .mint(newLabel, ...) via SDK       │
                                       └────────────────────────────────────────────────┘
```

All on-chain calls are signed by the **sponsor wallet** (`WALLET_KEY`). The sponsor wallet must:

1. Own the child-registry NFT for `PARENT_NAME` (= passes the `registryTokenOwner` modifier on `burn`).
2. Be on the listing's mint whitelist (= passes the controller's mint whitelist check).

For the `enscomponent.eth` test environment, both conditions are met by `0x507E27d7191c556e0Fd40799cdF4AbcC9c7F0706` after the registry-NFT transfer that completed on 2026-05-21.

## 3. Eligibility — "one swap ever" without storage

The indexer at `https://indexer.namespace.ninja/api/v1/nodes?owner=<addr>&parentName=<parent>` is the source of truth.

- **Eligible to swap** ⇔ the user currently owns ≥ 1 subname under `PARENT_NAME`.
- **Has already used the sponsored swap** ⇔ at least one of those subnames was minted by the sponsor wallet.

Concretely, the backend will:

1. Call the indexer for `owner=<requestor>&parentName=<PARENT_NAME>`. If `items.length === 0` → 403, "you don't have a name to swap."
2. Verify the requested `oldNode` is in that result set. If not → 400, "you don't own that name."
3. Check whether any item's `mintedBy` (or equivalent — see §9, open question) equals the sponsor wallet. If yes → 403, "you've already used your one swap."

If the indexer doesn't expose the original minter, we fall back to a public-RPC scan of `NodeMinted` events from `PARENT_REGISTRY_ADDRESS` filtered by `to == <requestor>` and `from == <sponsor wallet>`. Either way, no app-side storage.

## 4. Swap flow — step by step

### 4.1 Frontend (browser)

1. User opens `/subnames` and sees their owned names. Each `*.pizzaday.eth` card now has a **"Rename"** button (cards under the other three parents do not).
2. Click "Rename" → `SwapModal` opens, pre-filled with:
   - `oldFullName` (read-only, shown for confirmation)
   - new label `<input>` with availability check (re-uses the existing `MintForm.checkAvailable` logic)
   - records form pre-filled by reading the old subname's records from the indexer (avatar text + addresses + other texts). Editable. Falls back to MintForm's defaults if the indexer read errors.
3. User clicks **"Sign and swap"**.
4. Frontend builds the message hash:
   ```ts
   keccak256(encodePacked(
     ['address', 'bytes32', 'string', 'string', 'uint256', 'uint256'],
     [owner, oldNode, oldFullName, newLabel, BigInt(8453), expiry]
   ))
   ```
   Records are not in the signed payload (we don't want to make the signature dependent on every edit). They're sent alongside in the JSON body.
5. User signs the hash via `personal_sign` (mirror of shefi-new).
6. Frontend POSTs `/api/swap` with `{ owner, oldNode, oldFullName, newLabel, expiry, signature, records }`.
7. UI enters a pending state while the API runs both txs (it can take 4–10s on Base). Show a single combined spinner; we do not surface burnTx vs mintTx separately. On success, show the standard success screen with the new name.

### 4.2 Backend (`/api/swap` — new Next.js API route)

Pseudocode:

```ts
// 1. validate
assertMethodPost(); assertBodyShape();
assertSignatureFormat(); assertExpiryFresh(); // 5-min window like shefi-new
assertLabelOK(newLabel);                       // length, normalize, no dots

// 2. signature
const hash = constructMessageHash(...);
const recovered = await recoverAddress({ hash: hashMessage({ raw: hash }), signature });
if (recovered.toLowerCase() !== owner.toLowerCase()) throw 400;

// 3. rate-limit (per-IP, per-address) — copy from shefi-new

// 4. eligibility
const indexed = await indexer.list({ owner, parentName: PARENT_NAME });
if (indexed.length === 0) throw 403 "nothing to swap";
const oldItem = indexed.find(i => i.node === oldNode);
if (!oldItem) throw 400 "you don't own that name";
if (indexed.some(i => i.mintedBy?.toLowerCase() === sponsor.toLowerCase()))
  throw 403 "already swapped";

// 5. inherit records from the old subname unless overridden
const records = body.records ?? mapIndexerRecordsToMintManager(oldItem);

// 6. simulate both txs against current block
await publicClient.simulateContract({ ...burnCall });
const mintParams = await mintClient.getMintTransactionParameters({ ... });
await publicClient.simulateContract({ ...mintCall(mintParams) });

// 7. broadcast burn, wait, then mint
const burnTx = await walletClient.writeContract(burnCall);
await publicClient.waitForTransactionReceipt({ hash: burnTx, confirmations: 1 });
const mintTx = await walletClient.writeContract(mintCall);
await publicClient.waitForTransactionReceipt({ hash: mintTx, confirmations: 1 });

return { burnTx, mintTx, name: `${newLabel}.${PARENT_NAME}` };
```

The burn call uses a minimal hand-written ABI fragment (`function burn(bytes32 node)`) against `PARENT_REGISTRY_ADDRESS`. The mint call uses `createMintClient().getMintTransactionParameters(...)` exactly as shefi-new does.

### 4.3 Failure mode (chose plan A in brainstorm)

Burn succeeds, mint fails → user is left with no name. Mitigated by:

- Pre-flight simulation of mint against state *before* the burn (using `stateOverride` if needed — viem supports it). If simulation fails, we never broadcast burn.
- A retry endpoint is **not** in this iteration. If the rare failure happens, we recover manually by re-issuing the user a new airdrop from the sponsor wallet (off-app).

## 5. Frontend changes

- `src/components/Listing.tsx`
  - Add `PIZZADAY_ETH: Listing` with all fields driven by `process.env.NEXT_PUBLIC_PARENT_NAME` (default `pizzaday.eth`, overridden to `enscomponent.eth` for staging).
  - Add to `LISTED_NAMES`.
- `src/components/MintForm.tsx`
  - Add a fourth instruction case for the new parent (copy TBD with user).
- `src/components/MySubnames.tsx` / `SingleSubname.tsx`
  - On cards whose `parentName === PARENT_NAME`, render a **Rename** button next to the existing actions. Opens `SwapModal`.
- `src/components/SwapModal.tsx` *(new)*
  - Composes label input + availability check + a simple editable records form (texts.avatar, addresses, optionally other texts pre-filled from indexer). No need for the full shefi-new `SelectRecordsForm` — keep it minimal: just the records that exist on the old name.
- `src/utils/swap.ts` *(new)*
  - `constructSwapMessageHash`, `getSignatureExpiry`, `submitSwap` (POST helper). Mirror of `src/lib/sponsor.ts` in shefi-new.

## 6. Backend changes

- `src/pages/api/swap.ts` *(new)*
  - Implements §4.2.
  - Pulls `WALLET_KEY`, `BASE_RPC_URL`, `PARENT_NAME`, `PARENT_REGISTRY_ADDRESS` from env.
  - Copies the rate-limit, signature-validation, and label-validation patterns from `packages/shefi-new/src/pages/api/mint.ts`.

No other API routes change.

## 7. Config & env

Added to `packages/pizzadaoo/.env.example` (already committed in working copy):

| Key | Where used | Required for |
|---|---|---|
| `WALLET_KEY` | server-only | swap |
| `BASE_RPC_URL` | server-only | swap (falls back to alchemy public key) |
| `PARENT_NAME` | server | swap |
| `PARENT_REGISTRY_ADDRESS` | server | swap |
| `NEXT_PUBLIC_PARENT_NAME` *(to add)* | client | shows correct parent in UI |

The two `*_NAME` vars must agree. Single source of truth would be nicer; punted for the first iteration to keep the env-shape obvious.

## 8. Testing plan

- **Manual happy path on `enscomponent.eth`**: airdrop a subname to a test wallet, connect with that wallet, swap to a new label, confirm new ownership + records.
- **Manual already-swapped path**: try a second swap from the same address; expect 403.
- **Manual not-owner path**: connect with a wallet that owns no subname under the parent; expect "Rename" buttons not to appear and the API to 403 if hit directly.
- **Burn-failure simulation**: temporarily point `PARENT_REGISTRY_ADDRESS` at a contract whose `burn` reverts; confirm we never broadcast mint.
- **Mint-failure simulation**: temporarily blank the mint whitelist for the sponsor wallet; confirm pre-flight catches it and we never broadcast burn.

No automated tests in this iteration — the existing pizzadaoo package has none, and the failure modes are hard to mock without standing up viem-mock infrastructure. Adding tests is tracked in §10.

## 9. Open questions to resolve during implementation

- **Indexer minter field.** Does `indexer.namespace.ninja/api/v1/nodes` include the original minter address on each item? If not, the eligibility check falls back to RPC-scanning `NodeMinted` events on `PARENT_REGISTRY_ADDRESS`.
- **Records read.** Does the indexer return all text records for a subname in the same `/nodes` payload, or do we need a second call (e.g. `/nodes/<node>`)? If the latter, the SwapModal opens with a tiny loader for ~1 round-trip.
- **Copy.** Instruction text for `pizzaday.eth` under `MintForm.getInstructionText`. Placeholder until product copy is provided.
- **WAGMI chain config.** The current pizzadaoo app already targets Base for mints. Confirm no provider/config tweak is needed for server-side `walletClient` (it isn't — server uses its own viem clients).

## 10. Future work (deferred — do NOT implement now)

- **EIP-712 typed-data signing.** User explicitly asked to be reminded to migrate the swap signing payload from EIP-191 (`personal_sign` over a keccak hash) to EIP-712 typed-data for clearer wallet previews. Open a follow-up issue once the EIP-191 flow ships.
- Automated tests for the API route + swap modal.
- Audit log of swaps (date, old/new, txs) — would need storage, so out of scope unless a real product need emerges.
- A small dashboard for the team to invalidate a swap (e.g. for support cases where mint failed after burn).

## 11. Implementation plan (next step)

After user approves this spec, I'll invoke the `writing-plans` skill to produce a step-by-step implementation plan in `docs/superpowers/plans/`. Do **not** start coding until both the spec and plan are approved.
