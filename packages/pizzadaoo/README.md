# PizzaDAO Subnames

A Next.js app that lets PizzaDAO members register and manage subnames under `pizzadao.eth`, `pizzamafia.eth`, `rarepizzas.eth`, and `pizzaday.eth`, plus a **sponsored burn-and-reissue flow** so an airdrop recipient can rename their `*.pizzaday.eth` subname (gas-free, one rename per wallet).

- Frontend: Next.js (Pages Router) + wagmi + RainbowKit + viem.
- Backend: a single Next.js API route (`/api/swap`) that signs and broadcasts the burn+mint on behalf of the user.
- Chain: Base mainnet (chainId 8453). Subname NFTs live in per-parent Namespace L2 registries.

## Quick start

```bash
# from the monorepo root
pnpm install
cp packages/pizzadaoo/.env.example packages/pizzadaoo/.env   # fill values, see below
pnpm --filter pizzadaoo dev                                   # http://localhost:3000
```

If running from inside the package:

```bash
cd packages/pizzadaoo
pnpm dev          # also: pnpm build && pnpm start, pnpm lint
```

## Environment variables

The swap parent is hardcoded to `enscomponent.eth` in `src/components/Listing.tsx`, `src/pages/api/swap.ts`, and `scripts/airdrop.mjs`. Flip those constants when the prod parent is finalized. `WALLET_KEY` is server-only — never expose it.

### Required to load the app

| Var | What | Notes |
|---|---|---|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect Cloud project id | Required. App fails to start without it. Get one at <https://cloud.walletconnect.com>. Don't reuse someone else's id in production. |
| `NEXT_PUBLIC_ALCHEMY_KEY` | Alchemy API key for Base + Ethereum RPCs | Optional. Without it the app falls back to viem's rate-limited public RPC, fine for light dev but flaky under load. |

### Required for `/api/swap` (rename route)

Skip if you're only using the package as a registration UI for the existing four parents.

| Var | What | Notes |
|---|---|---|
| `WALLET_KEY` | Private key of the sponsor wallet | Required. This wallet must (a) own the child-registry NFT for the swap parent (so it can call `burn`), and (b) be on the listing's mint whitelist (so it can call `mint`). Never commit. Never ship to the client. |
| `BASE_RPC_URL` | Full Base RPC URL | Optional. Falls back to `https://base-mainnet.g.alchemy.com/v2/$NEXT_PUBLIC_ALCHEMY_KEY` if set, else `https://mainnet.base.org`. |
| `PARENT_REGISTRY_ADDRESS` | Child-registry contract on Base for the swap parent | Required. This is the ERC-721 registry that exposes `burn()`. Look it up via list-manager: `GET https://list-manager.namespace.ninja/api/v1/listing/network/MAINNET/name/enscomponent.eth` → `l2Metadata.registryAddress`. |

A complete `.env`:

```bash
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<yours>
NEXT_PUBLIC_ALCHEMY_KEY=<yours>

WALLET_KEY=0x<sponsor wallet pk>
BASE_RPC_URL=
PARENT_REGISTRY_ADDRESS=<from list-manager l2Metadata.registryAddress>
```

## How the rename / "burn-and-reissue" flow works

The user owns an airdropped `*.pizzaday.eth` subname and wants a different label.

1. **Frontend** — on the My Subnames page, each owned card under the swap parent shows a **Rename (free)** button. Clicking it opens a popup. The user picks a new label; the modal checks availability against the L2 registry resolver. When they sign, the frontend POSTs `/api/swap` with `{ owner, oldNode, oldFullName, newLabel, expiry, signature }`.

2. **`/api/swap`** does the following, in order, all on Base:
   1. Validates the body, rate-limits per-IP and per-address, recovers the EIP-191 signature.
   2. Checks eligibility via the Namespace indexer:
      - the user must currently own at least one subname under the swap parent;
      - none of those subnames may have `mintSource === "pizzadaoo-swap"` (the marker we set when minting the swap result — used to enforce one rename per wallet, ever, without any storage layer).
   3. Builds records for the new name by inheriting from the old subname's records, with sensible fallbacks if the indexer doesn't expose any.
   4. Calls the Namespace mint-manager API directly with an explicit `owner = body.owner` (the SDK hard-codes `owner = minterAddress`, which would force a separate `transferFrom` after the mint — and the indexer lags that Transfer event by seconds-to-minutes). Mint-manager returns signed mint params.
   5. Simulates both txs against current state to surface any revert reason before broadcasting either.
   6. Broadcasts **`burn(oldNode)`** on `PARENT_REGISTRY_ADDRESS`, waits 1 confirmation.
   7. Broadcasts **`mint(...)`** on the L2 controller with a 50% gas pad (to clear EIP-150's 63/64 rule for internal resolver calls), waits 1 confirmation.
   8. Responds with `{ burnTx, mintTx, name }`.

3. **Frontend** — closes the now-burned name's detail panel, polls the indexer up to 8× at 2s intervals until the new name appears in the owner's list, then updates the page.

Why no transferFrom: because we pass `owner` to mint-manager, the mint event itself records the recipient. The indexer picks it up immediately and there's no second tx to race.

The rename is **not atomic**: if step 7 reverts after step 6, the old name is burned but the new one isn't minted. The route logs `MINT REVERTED AFTER BURN` with both tx hashes; recovery is a manual re-airdrop of the original label (it's been burned — therefore re-mintable; see below).

## Airdropping a name to a wallet

`scripts/airdrop.mjs` mints a subname directly to a recipient — useful for seeding test wallets or initial PizzaDAO distribution.

```bash
cd packages/pizzadaoo
node scripts/airdrop.mjs <label> [owner]
# defaults: label=happy, owner=0xd5Ba400e732b3d769aA75fc67649Ef4849774bb1
```

It reads `WALLET_KEY`, `BASE_RPC_URL` / `NEXT_PUBLIC_ALCHEMY_KEY` from `.env` (parent is hardcoded in the script) and submits a single `mint()` tx with `owner = <recipient>` — no transfer step, no indexer lag.

Re-minting burned names works: the registry's `_register` only blocks if a name has a current owner, and `burn()` zeros it out — so a previously-burned name is fully available again.

## Sponsor wallet setup (one-time)

The sponsor wallet needs **two** authorities on the child registry:

1. **Mint whitelist** — added to the listing's `whitelist.wallets` array via list-manager. Without this, the mint controller rejects the tx.
2. **Registry NFT owner** — owns the parent-name NFT on the child registry. This is the only address whose `burn()` call passes the `registryTokenOwner` modifier. To make a wallet the registry owner, the current owner calls `transferFrom` of the parent-name NFT to the new wallet (the token id is `uint256(namehash(<parent>))`).

## Project layout

```
src/
  pages/
    index.tsx                 # registration form (MintForm)
    subnames/index.tsx        # My Subnames list + detail
    api/
      swap.ts                 # POST /api/swap — burn + mint pipeline
  components/
    MintForm.tsx              # primary registration UI
    MySubnames.tsx            # owned subnames + Rename trigger
    SingleSubname.tsx         # subname detail (records + rename action)
    SwapModal.tsx             # rename popup
    Listing.tsx               # the four parents + SWAP_PARENT_NAME env hook
  utils/
    sponsoredMint.ts          # calls mint-manager with owner=recipient
    swap.ts                   # frontend swap helpers (sig hash, POST)
scripts/
  airdrop.mjs                 # one-shot mint-to-recipient
```

## Reference

- Namespace indexer: `https://indexer.namespace.ninja/api/v1/nodes`
- Namespace list-manager: `https://list-manager.namespace.ninja/api/v1/listing/network/MAINNET/name/<name>`
- Namespace mint-manager: `https://mint-manager.namespace.ninja/api/v1/minting-parameters`
- L2 mint controller (Base): `0xa8e61891626f86ae6397217823701183de947c7d`
