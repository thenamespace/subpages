# PizzaDAO Handoff

We host the rename app. You don't deploy anything or hold keys. The only thing on your side is topping up the sponsor wallet with Base ETH when it runs low.

Two on-chain things make the swap flow work:

1. The sponsor wallet is on `pizzaday.eth`'s mint whitelist, so it can mint new subnames.
2. The sponsor wallet owns the parent NFT on the L2 registry, so it can burn old subnames.

Both were set up via the Namespace onchain UI for `pizzaday.eth` (activate on Base, whitelist the sponsor, deploy registry, point the mainnet resolver at it), then a registry-ownership change to hand the parent NFT to the sponsor.

Without #1 the mint half of every rename reverts with `MINTER_NOT_WHITELISTED`. Without #2 the burn half reverts because the registry only lets the parent's owner burn children.

## Sponsor wallet gas

It's pre-funded with enough Base ETH for the first airdrop and a reasonable run of renames. Each swap costs roughly 0.0001 ETH. If it drops low, top it up — when it hits zero, renames stop. We'll share the address and a balance threshold separately.

## Airdropping initial names

If you want to run the initial drop yourself, the script is at `packages/pizzadaoo/scripts/airdrop.mjs`. Sample usage:

```bash
cd packages/pizzadaoo
node scripts/airdrop.mjs <label> <recipient-address>
```

It mints `<label>.pizzaday.eth` straight to the recipient on Base and sets:

- `name` text record = the full subname
- Address record for Ethereum, Base, and the ENSIP-19 default coinType, all pointing at the recipient

To attach more text records on every airdrop (avatar, description, url, twitter, github), edit the `texts` array near the top of the script before running. Needs `WALLET_KEY` in `.env`, which we'd share if you want to operate it.

Re-running with a label that already exists is a safe no-op — the mint reverts on `AlreadyRegistered`.
